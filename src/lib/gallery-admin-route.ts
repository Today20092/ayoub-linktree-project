import { Effect } from 'effect'
import {
  galleryJson,
  runGalleryHttp,
  database,
  storage,
  validation,
  galleryFailure,
} from './gallery-effect'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import {
  createGalleryAdminCommandDependencies,
  galleryAdminCommand,
  galleryAdminLayer,
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

const json = galleryJson
function eventGallery(eventSlug: string | undefined) {
  return Effect.gen(function* () {
    if (!eventSlug) return
    const [event, dynamicEvent] = yield* Effect.all([
      Effect.promise(() => getEntry('portfolio', eventSlug)),
      database(() => getEventGallery(env.GALLERY_DB, eventSlug)),
    ])
    return event?.data.eventGallery || dynamicEvent
      ? {
          id: eventSlug,
          staticEvent: event?.data.eventGallery ? event : undefined,
          dynamicEvent,
        }
      : undefined
  })
}

function commandEvent(
  event: NonNullable<Effect.Success<ReturnType<typeof eventGallery>>>,
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
    isPortfolio: Boolean(event.staticEvent),
    staticPhotos,
  }
}

// Call only after the route has authenticated its web or device credentials.
export function readGalleryAdminEffect(
  request: Request,
  slug: string | undefined,
) {
  return Effect.gen(function* () {
    const event = yield* eventGallery(slug)
    if (!event)
      return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
    const photoId = new URL(request.url).searchParams.get('photo')
    if (photoId) {
      const photo = yield* database(() =>
        getGuestPhoto(env.GALLERY_DB, photoId),
      )
      if (!photo || photo.event_slug !== event.id)
        return yield* Effect.fail(galleryFailure(404, 'Photo not found.'))
      const bucket =
        photo.status === 'pending' ? env.GALLERY_PENDING : env.GALLERY_PUBLIC
      const object = yield* storage(() => bucket.get(photo.object_key))
      if (!object)
        return yield* Effect.fail(galleryFailure(404, 'Photo not found.'))
      return new Response(object.body, {
        headers: {
          'content-type': 'image/jpeg',
          'cache-control': 'private, no-store',
          'content-length': String(object.size),
        },
      })
    }
    const [settings, guests, hidden, photos, invites] = yield* Effect.all([
      database(() => getGallerySettings(env.GALLERY_DB, event.id)),
      database(() => listGuestPhotos(env.GALLERY_DB, event.id)),
      database(() => listHiddenPhotos(env.GALLERY_DB, event.id)),
      database(() => listGalleryPhotos(env.GALLERY_DB, event.id)),
      database(() => listGalleryInvites(env.GALLERY_DB, event.id)),
    ])
    return json({ settings, guests, hidden, photos, invites })
  })
}
export function readGalleryAdmin(request: Request, slug: string | undefined) {
  return runGalleryHttp(readGalleryAdminEffect(request, slug), request.signal)
}
export function writeGalleryAdminEffect(
  request: Request,
  slug: string | undefined,
) {
  return Effect.gen(function* () {
    const event = yield* eventGallery(slug)
    if (!event)
      return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
    let command: unknown
    if (
      (request.headers.get('content-type') ?? '').includes(
        'multipart/form-data',
      )
    ) {
      const form = yield* validation(
        () => request.formData(),
        'Invalid form submission.',
      )
      const action = form.get('action')
      command = {
        action,
        file: form.get(action === 'uploadAdminPhoto' ? 'photo' : 'flyer'),
        alt: form.get('alt'),
      }
    } else {
      if (Number(request.headers.get('content-length') ?? 0) > 4096)
        return yield* Effect.fail(galleryFailure(413, 'Request is too large.'))
      const text = yield* validation(() => request.text(), 'Invalid JSON.')
      if (new TextEncoder().encode(text).byteLength > 4096)
        return yield* Effect.fail(galleryFailure(413, 'Request is too large.'))
      command = yield* validation(async () => JSON.parse(text), 'Invalid JSON.')
    }
    const result = yield* Effect.uninterruptible(
      galleryAdminCommand(
        { event: commandEvent(event), requestUrl: request.url },
        command,
      ),
    )
    return json(result.body, result.status)
  }).pipe(
    Effect.provide(
      galleryAdminLayer(
        createGalleryAdminCommandDependencies({
          database: env.GALLERY_DB,
          pendingBucket: env.GALLERY_PENDING,
          publicBucket: env.GALLERY_PUBLIC,
          images: env.IMAGES,
        }),
      ),
    ),
  )
}
export function writeGalleryAdmin(request: Request, slug: string | undefined) {
  return runGalleryHttp(writeGalleryAdminEffect(request, slug), request.signal)
}
