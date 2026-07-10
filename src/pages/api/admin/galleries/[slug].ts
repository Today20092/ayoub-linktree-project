import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import {
  createGalleryAdminCommandDependencies,
  executeGalleryAdminCommand,
  GalleryAdminCommandError,
  type GalleryAdminEventContext,
} from '@/lib/gallery-admin-commands'
import {
  getEventGallery,
  getGallerySettings,
  getGuestPhoto,
  listGalleryInvites,
  listGalleryPhotos,
  listGuestPhotos,
  listHiddenPhotos,
  publicEventCover,
  publicEventFlyer,
} from '@/lib/gallery-data'

export const prerender = false

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })

async function eventGallery(eventSlug: string | undefined) {
  if (!eventSlug) return
  const event = await getEntry('portfolio', eventSlug)
  if (event?.data.eventGallery) return { id: event.id, staticEvent: event }
  const dynamicEvent = await getEventGallery(env.GALLERY_DB, eventSlug)
  return dynamicEvent
    ? { id: dynamicEvent.event_slug, dynamicEvent }
    : undefined
}

function commandEvent(
  event: NonNullable<Awaited<ReturnType<typeof eventGallery>>>,
): GalleryAdminEventContext {
  const staticPhotos =
    event.staticEvent?.data.gallery
      .filter(
        (
          image,
        ): image is Extract<
          (typeof event.staticEvent.data.gallery)[number],
          { filename: string }
        > => 'filename' in image,
      )
      .map(({ src, filename }) => ({ src, filename })) ?? []
  const flyer = event.dynamicEvent
    ? publicEventFlyer(event.dynamicEvent)
    : undefined
  const cover = event.dynamicEvent
    ? publicEventCover(event.dynamicEvent)
    : undefined

  return {
    id: event.id,
    title: event.dynamicEvent?.title ?? event.staticEvent?.data.title ?? '',
    summary:
      event.dynamicEvent?.summary ??
      event.staticEvent?.data.galleryDescription ??
      event.staticEvent?.data.summary ??
      '',
    category:
      event.dynamicEvent?.category ??
      event.staticEvent?.data.category ??
      'Event Photography',
    eventDate:
      event.dynamicEvent?.event_date ??
      event.staticEvent?.data.eventDate?.toISOString().slice(0, 10) ??
      null,
    eventTime:
      event.dynamicEvent?.event_time ??
      event.staticEvent?.data.eventTime ??
      null,
    eventVenue:
      event.dynamicEvent?.event_venue ??
      event.staticEvent?.data.eventVenue ??
      null,
    comingSoon: Boolean(event.dynamicEvent?.coming_soon),
    status: event.dynamicEvent?.status ?? 'published',
    flyerSrc: flyer?.src,
    coverSrc: cover?.src,
    staticPhotos,
  }
}

export const GET: APIRoute = async ({ params, request }) => {
  if (
    !(await galleryAdminAuthorized(
      request,
      env.GALLERY_ADMIN_EMAIL,
      env.GALLERY_ACCESS_TEAM_DOMAIN,
      env.GALLERY_ACCESS_AUDS,
    ))
  ) {
    return json({ error: 'Forbidden.' }, 403)
  }
  const event = await eventGallery(params.slug)
  if (!event) return json({ error: 'Gallery not found.' }, 404)

  const photoId = new URL(request.url).searchParams.get('photo')
  if (photoId) {
    const photo = await getGuestPhoto(env.GALLERY_DB, photoId)
    if (!photo || photo.event_slug !== event.id) {
      return json({ error: 'Photo not found.' }, 404)
    }
    const bucket =
      photo.status === 'pending' ? env.GALLERY_PENDING : env.GALLERY_PUBLIC
    const object = await bucket.get(photo.object_key)
    if (!object) return json({ error: 'Photo not found.' }, 404)
    return new Response(object.body, {
      headers: {
        'content-type': 'image/jpeg',
        'cache-control': 'private, no-store',
        'content-length': String(object.size),
      },
    })
  }

  const [settings, guests, hidden] = await Promise.all([
    getGallerySettings(env.GALLERY_DB, event.id),
    listGuestPhotos(env.GALLERY_DB, event.id),
    listHiddenPhotos(env.GALLERY_DB, event.id),
  ])
  const [photos, invites] = await Promise.all([
    listGalleryPhotos(env.GALLERY_DB, event.id),
    listGalleryInvites(env.GALLERY_DB, event.id),
  ])
  return json({ settings, guests, hidden, photos, invites })
}

export const POST: APIRoute = async ({ params, request }) => {
  if (
    !(await galleryAdminAuthorized(
      request,
      env.GALLERY_ADMIN_EMAIL,
      env.GALLERY_ACCESS_TEAM_DOMAIN,
      env.GALLERY_ACCESS_AUDS,
    ))
  ) {
    return json({ error: 'Forbidden.' }, 403)
  }
  const event = await eventGallery(params.slug)
  if (!event) return json({ error: 'Gallery not found.' }, 404)

  let command: unknown
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return json({ error: 'Invalid form submission.' }, 400)
    }
    const action = formData.get('action')
    command = {
      action,
      file:
        action === 'uploadAdminPhoto'
          ? formData.get('photo')
          : formData.get('flyer'),
      alt: formData.get('alt'),
    }
  } else {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 4096) {
      return json({ error: 'Request is too large.' }, 413)
    }
    try {
      const text = await request.text()
      if (new TextEncoder().encode(text).byteLength > 4096) {
        return json({ error: 'Request is too large.' }, 413)
      }
      command = JSON.parse(text)
    } catch {
      return json({ error: 'Invalid JSON.' }, 400)
    }
  }

  try {
    const result = await executeGalleryAdminCommand(
      { event: commandEvent(event), requestUrl: request.url },
      command,
      createGalleryAdminCommandDependencies({
        database: env.GALLERY_DB,
        pendingBucket: env.GALLERY_PENDING,
        publicBucket: env.GALLERY_PUBLIC,
        images: env.IMAGES,
      }),
    )
    return json(result.body, result.status)
  } catch (error) {
    if (error instanceof GalleryAdminCommandError) {
      return json({ error: error.message }, error.status)
    }
    throw error
  }
}
