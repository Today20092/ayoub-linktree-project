import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import {
  galleryAdminAuthorized,
  parseGalleryAdminAction,
} from '@/lib/gallery-admin'
import { hashGalleryPassword, validGalleryPassword } from '@/lib/gallery-auth'
import {
  adminPhotoKey,
  createGalleryInvite,
  deleteGuestPhoto,
  getEventGallery,
  getGallerySettings,
  getGuestPhoto,
  galleryStatus,
  hideProfessionalPhoto,
  insertGalleryPhoto,
  listGalleryInvites,
  listGalleryPhotos,
  listGuestPhotos,
  listHiddenPhotos,
  publicEventCover,
  publicEventFlyer,
  publishGuestPhoto,
  publishedGuestKey,
  restoreProfessionalPhoto,
  saveEventGallery,
  saveGallerySettings,
} from '@/lib/gallery-data'
import {
  acceptedGalleryImage,
  optimizedGalleryImage,
  safeGalleryFilename,
} from '@/lib/gallery-upload'

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

function eventSnapshot(event: Awaited<ReturnType<typeof eventGallery>>) {
  if (!event) return
  return {
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

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return json({ error: 'Invalid form submission.' }, 400)
    }
    const action = formData.get('action')

    if (action === 'uploadAdminPhoto') {
      const file = formData.get('photo')
      if (!(file instanceof File) || !acceptedGalleryImage(file)) {
        return json(
          { error: 'Choose a JPEG, PNG, WebP, or HEIC photo under 20 MB.' },
          415,
        )
      }
      const optimized = await optimizedGalleryImage(file, env.IMAGES)
      const id = crypto.randomUUID()
      const objectKey = adminPhotoKey(event.id, id)
      await env.GALLERY_PUBLIC.put(objectKey, optimized.buffer, {
        httpMetadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=300',
        },
      })
      try {
        await insertGalleryPhoto(env.GALLERY_DB, {
          id,
          event_slug: event.id,
          object_key: objectKey,
          original_filename: safeGalleryFilename(file.name),
          width: optimized.width,
          height: optimized.height,
          alt:
            (typeof formData.get('alt') === 'string'
              ? formData.get('alt')?.toString().trim().slice(0, 240)
              : '') ||
            `Photo from ${event.dynamicEvent?.title ?? event.staticEvent?.data.title}`,
          uploader_name: null,
          source: 'admin',
        })
      } catch (error) {
        await env.GALLERY_PUBLIC.delete(objectKey)
        throw error
      }
      return json({ ok: true, id }, 201)
    }

    if (action === 'updateFlyer') {
      const file = formData.get('flyer')
      if (!(file instanceof File) || !acceptedGalleryImage(file)) {
        return json(
          { error: 'Choose a JPEG, PNG, WebP, or HEIC image under 20 MB.' },
          415,
        )
      }
      const details = eventSnapshot(event)
      if (!details.title || !details.summary) {
        return json(
          { error: 'Save event details before replacing the flyer.' },
          409,
        )
      }
      const optimized = await optimizedGalleryImage(file, env.IMAGES)
      const objectKey = `events/${event.id}/flyer-${crypto.randomUUID()}.jpg`
      await env.GALLERY_PUBLIC.put(objectKey, optimized.buffer, {
        httpMetadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=300',
        },
      })
      const flyer = {
        object_key: objectKey,
        width: optimized.width,
        height: optimized.height,
        alt: `${details.title} flyer`,
      }
      await saveEventGallery(env.GALLERY_DB, {
        event_slug: event.id,
        title: details.title,
        summary: details.summary,
        category: details.category,
        event_date: details.eventDate,
        event_time: details.eventTime,
        event_venue: details.eventVenue,
        coming_soon: details.comingSoon,
        status: details.status,
        flyer,
        cover: {
          src: `https://photos.ayoubabed.xyz/${objectKey}`,
          width: optimized.width,
          height: optimized.height,
          alt: flyer.alt,
        },
      })
      return json({ ok: true, flyer }, 201)
    }

    return json({ error: 'Invalid action.' }, 400)
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 4096) {
    return json({ error: 'Request is too large.' }, 413)
  }
  let value: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 4096) {
      return json({ error: 'Request is too large.' }, 413)
    }
    value = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const action = parseGalleryAdminAction(value)
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  if (
    !action &&
    input.action !== 'updateEvent' &&
    input.action !== 'createInvite' &&
    input.action !== 'setCover'
  ) {
    return json({ error: 'Invalid action.' }, 400)
  }

  if (input.action === 'updateEvent') {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    const summary =
      typeof input.summary === 'string' ? input.summary.trim() : ''
    if (!title || !summary) {
      return json({ error: 'Name and about information are required.' }, 400)
    }
    await saveEventGallery(env.GALLERY_DB, {
      event_slug: event.id,
      title,
      event_date:
        typeof input.eventDate === 'string' && input.eventDate
          ? input.eventDate
          : null,
      event_time:
        typeof input.eventTime === 'string' && input.eventTime
          ? input.eventTime
          : null,
      event_venue:
        typeof input.eventVenue === 'string' && input.eventVenue
          ? input.eventVenue
          : null,
      summary,
      category:
        typeof input.category === 'string' && input.category.trim()
          ? input.category.trim()
          : 'Event Photography',
      coming_soon: Boolean(input.comingSoon),
      status:
        galleryStatus(input.visibilityStatus) ??
        (input.comingSoon ? 'coming_soon' : 'published'),
    })
    return json({ ok: true })
  }

  if (input.action === 'createInvite') {
    const guestName =
      typeof input.guestName === 'string' ? input.guestName.trim() : ''
    if (!guestName) return json({ error: 'Guest name is required.' }, 400)
    const token = crypto.randomUUID()
    await createGalleryInvite(env.GALLERY_DB, {
      token,
      event_slug: event.id,
      guest_name: guestName.slice(0, 120),
    })
    return json({
      ok: true,
      token,
      url: new URL(
        `/galleries/${event.id}/upload/${token}/`,
        request.url,
      ).toString(),
    })
  }

  if (input.action === 'setCover') {
    const src = typeof input.src === 'string' ? input.src.trim() : ''
    const alt = typeof input.alt === 'string' ? input.alt.trim() : ''
    const width = typeof input.width === 'number' ? input.width : 0
    const height = typeof input.height === 'number' ? input.height : 0
    if (!src || !alt || width <= 0 || height <= 0) {
      return json({ error: 'Cover photo is invalid.' }, 400)
    }

    const [photos, guests] = await Promise.all([
      listGalleryPhotos(env.GALLERY_DB, event.id),
      listGuestPhotos(env.GALLERY_DB, event.id),
    ])
    const staticImages =
      event.staticEvent?.data.gallery.filter(
        (
          image,
        ): image is Extract<
          (typeof event.staticEvent.data.gallery)[number],
          { filename: string }
        > => 'filename' in image,
      ) ?? []
    const flyer = event.dynamicEvent
      ? publicEventFlyer(event.dynamicEvent)
      : undefined
    const currentCover = event.dynamicEvent
      ? publicEventCover(event.dynamicEvent)
      : undefined
    const allowed = new Set([
      ...photos.map(
        (photo) => `https://photos.ayoubabed.xyz/${photo.object_key}`,
      ),
      ...guests
        .filter(({ status }) => status === 'published')
        .map((photo) => `https://photos.ayoubabed.xyz/${photo.object_key}`),
      ...staticImages.map(({ src }) => src),
      ...(flyer ? [flyer.src] : []),
      ...(currentCover ? [currentCover.src] : []),
    ])
    if (!allowed.has(src))
      return json({ error: 'Cover photo is not available.' }, 404)

    const details = eventSnapshot(event)
    if (!details.title || !details.summary) {
      return json({ error: 'Save event details before setting a cover.' }, 409)
    }
    const cover = { src, width, height, alt: alt.slice(0, 240) }
    await saveEventGallery(env.GALLERY_DB, {
      event_slug: event.id,
      title: details.title,
      summary: details.summary,
      category: details.category,
      event_date: details.eventDate,
      event_time: details.eventTime,
      event_venue: details.eventVenue,
      coming_soon: details.comingSoon,
      status: details.status,
      cover,
    })
    return json({ ok: true })
  }

  if (action?.action === 'settings') {
    const existing = await getGallerySettings(env.GALLERY_DB, event.id)
    const newPassword = action.password?.trim()
    if (newPassword && !validGalleryPassword(newPassword)) {
      return json({ error: 'Password must be 8 to 128 characters.' }, 400)
    }
    if (
      action.uploadsEnabled &&
      !newPassword &&
      (!existing?.password_hash || !existing.password_salt)
    ) {
      return json({ error: 'Set a password before enabling uploads.' }, 400)
    }
    const password = newPassword
      ? await hashGalleryPassword(newPassword)
      : undefined
    await saveGallerySettings(
      env.GALLERY_DB,
      event.id,
      action.uploadsEnabled,
      password,
    )
    return json({ ok: true })
  }

  if (!action) return json({ error: 'Invalid action.' }, 400)

  if (
    action.action === 'approveGuest' ||
    action.action === 'rejectGuest' ||
    action.action === 'removeGuest'
  ) {
    const photo = await getGuestPhoto(env.GALLERY_DB, action.photoId)
    if (!photo || photo.event_slug !== event.id) {
      return json({ error: 'Photo not found.' }, 404)
    }

    if (action.action === 'approveGuest') {
      if (photo.status === 'published') return json({ ok: true })
      const publicKey = publishedGuestKey(event.id, photo.id)
      const pending = await env.GALLERY_PENDING.get(photo.object_key)
      if (pending) {
        await env.GALLERY_PUBLIC.put(publicKey, pending.body, {
          httpMetadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=300',
          },
        })
      } else if (!(await env.GALLERY_PUBLIC.head(publicKey))) {
        return json({ error: 'Pending image is missing.' }, 409)
      }
      const alt = action.alt?.trim().slice(0, 240) || photo.alt
      await publishGuestPhoto(env.GALLERY_DB, photo.id, publicKey, alt)
      await env.GALLERY_PENDING.delete(photo.object_key)
    } else {
      if (action.action === 'rejectGuest' && photo.status !== 'pending') {
        return json({ error: 'Published photos must be removed instead.' }, 409)
      }
      const bucket =
        photo.status === 'pending' ? env.GALLERY_PENDING : env.GALLERY_PUBLIC
      await bucket.delete(photo.object_key)
      await deleteGuestPhoto(env.GALLERY_DB, photo.id)
    }

    console.log(
      JSON.stringify({
        message: 'gallery guest moderation completed',
        eventSlug: event.id,
        action: action.action,
        photoId: photo.id,
      }),
    )
    return json({ ok: true })
  }

  if (
    action.action !== 'hideProfessional' &&
    action.action !== 'restoreProfessional'
  ) {
    return json({ error: 'Invalid action.' }, 400)
  }

  if (!event.staticEvent) {
    return json({ error: 'Professional photo not found.' }, 404)
  }

  const inlineImages = event.staticEvent.data.gallery.filter(
    (
      image,
    ): image is Extract<
      (typeof event.staticEvent.data.gallery)[number],
      { filename: string }
    > => 'filename' in image,
  )
  const available = new Set(inlineImages.map(({ filename }) => filename))
  if (!available.has(action.filename)) {
    return json({ error: 'Professional photo not found.' }, 404)
  }

  if (action.action === 'hideProfessional') {
    await hideProfessionalPhoto(env.GALLERY_DB, event.id, action.filename)
  } else {
    await restoreProfessionalPhoto(env.GALLERY_DB, event.id, action.filename)
  }
  return json({ ok: true })
}
