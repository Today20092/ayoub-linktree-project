import { Effect } from 'effect'
import { GalleryAdmin } from './gallery-admin-commands'
import { galleryStatus, type SaveEventGalleryInput } from './gallery-data'
import { gallerySlug, acceptedGalleryImage } from './gallery-upload'
import { galleryObjectUrl } from './gallery-media'
import {
  database,
  storage,
  imageProcessing,
  quietCleanup,
  galleryFailure,
  galleryJson,
} from './gallery-effect'
// Authorization and form decoding belong to the HTTP boundary.
export function createWebGallery(form: FormData) {
  return Effect.gen(function* () {
    const dependencies = yield* GalleryAdmin
    const text = (key: string) => {
      const value = form.get(key)
      return typeof value === 'string' ? value.trim() : ''
    }
    const title = text('title')
    const summary = text('summary')
    if (!title || !summary)
      return yield* Effect.fail(
        galleryFailure(400, 'Name and about information are required.'),
      )
    const eventSlug = gallerySlug(text('slug') || title)
    const input: SaveEventGalleryInput = {
      event_slug: eventSlug,
      title,
      summary,
      category: text('category') || 'Event Photography',
      event_date: text('eventDate') || null,
      event_time: text('eventTime') || null,
      event_venue: text('eventVenue') || null,
      coming_soon: text('comingSoon') !== 'false',
      status:
        galleryStatus(text('visibilityStatus')) ??
        (text('comingSoon') === 'false' ? 'published' : 'coming_soon'),
    }
    const flyer = form.get('flyer')
    let optimized:
      Awaited<ReturnType<typeof dependencies.images.optimize>> | undefined
    if (flyer instanceof File && flyer.size > 0) {
      if (!acceptedGalleryImage(flyer))
        return yield* Effect.fail(
          galleryFailure(415, 'Flyer must be a web image under 20 MB.'),
        )
      optimized = yield* imageProcessing(() =>
        dependencies.images.optimize(flyer),
      )
    }
    const objectKey = optimized
      ? `events/${eventSlug}/flyer-${dependencies.createId()}.jpg`
      : undefined
    if (objectKey && optimized) {
      input.flyer = {
        object_key: objectKey,
        width: optimized.width,
        height: optimized.height,
        alt: `${title} flyer`,
      }
      input.cover = {
        src: galleryObjectUrl(objectKey),
        width: optimized.width,
        height: optimized.height,
        alt: input.flyer.alt,
      }
    }
    return yield* Effect.uninterruptible(
      Effect.gen(function* () {
        const publish = Effect.gen(function* () {
          if (objectKey && optimized)
            yield* storage(() =>
              dependencies.objects.putPublic(objectKey, optimized!.buffer, {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=300',
              }),
            )
          yield* database(() => dependencies.data.saveEventGallery(input))
        })
        yield* Effect.catch(publish, (failure) =>
          Effect.gen(function* () {
            if (!objectKey) return yield* Effect.fail(failure)
            const current = yield* database(() =>
              dependencies.data.getEvent(eventSlug),
            )
            if (current?.flyer_object_key === objectKey) return
            yield* quietCleanup(
              storage(() => dependencies.objects.deletePublic(objectKey)),
              dependencies.log,
            )
            return yield* Effect.fail(failure)
          }),
        )
        return galleryJson({ ok: true, eventSlug }, 201)
      }),
    )
  })
}
