import {
  insertGalleryPhoto,
  insertPendingGuestPhoto,
  markGalleryInviteUsed,
} from './gallery-data'
import { optimizedGalleryImage } from './gallery-upload'
import { Context, Effect, Layer } from 'effect'
import {
  adminPhotoKey,
  pendingGuestKey,
  type GalleryPhoto,
} from './gallery-data'
import {
  database,
  storage,
  imageProcessing,
  quietCleanup,
  galleryJson,
} from './gallery-effect'
import { safeGalleryFilename } from './gallery-upload'

export type GuestUploadServices = {
  createId(): string
  optimize(
    file: File,
  ): Promise<{ buffer: ArrayBuffer; width: number; height: number }>
  put(
    isPublic: boolean,
    key: string,
    body: ArrayBuffer,
    metadata: R2HTTPMetadata,
  ): Promise<unknown>
  delete(isPublic: boolean, key: string): Promise<unknown>
  insertPublic(photo: Omit<GalleryPhoto, 'created_at'>): Promise<unknown>
  insertPending(photo: {
    id: string
    event_slug: string
    object_key: string
    original_filename: string
    width: number
    height: number
    alt: string
  }): Promise<unknown>
  findPublic(id: string): Promise<boolean>
  findPending(id: string): Promise<boolean>
  markInviteUsed(token: string): Promise<unknown>
  log(entry: Record<string, unknown>): void
}
export const GuestUpload = Context.Service<GuestUploadServices>(
  'gallery/GuestUpload',
)
export const guestUploadLayer = (services: GuestUploadServices) =>
  Layer.succeed(GuestUpload, services)
export function guestUploadWorkflow(input: {
  eventSlug: string
  eventTitle: string
  file: File
  invite?: { token: string; guest_name: string }
}) {
  return Effect.gen(function* () {
    const services = yield* GuestUpload
    const image = yield* imageProcessing(() => services.optimize(input.file))
    const id = services.createId()
    const isPublic = Boolean(input.invite)
    const key = isPublic
      ? adminPhotoKey(input.eventSlug, id)
      : pendingGuestKey(input.eventSlug, id)
    return yield* Effect.uninterruptible(
      Effect.gen(function* () {
        const photo = {
          id,
          event_slug: input.eventSlug,
          object_key: key,
          original_filename: safeGalleryFilename(input.file.name),
          width: image.width,
          height: image.height,
          alt: input.invite
            ? `Photo from ${input.eventTitle} by ${input.invite.guest_name}`
            : `Guest photo from ${input.eventTitle}`,
        }
        const publish = Effect.gen(function* () {
          yield* storage(() =>
            services.put(isPublic, key, image.buffer, {
              contentType: 'image/jpeg',
              cacheControl: isPublic
                ? 'public, max-age=300'
                : 'private, no-store',
            }),
          )
          if (input.invite)
            yield* database(() =>
              services.insertPublic({
                ...photo,
                uploader_name: input.invite!.guest_name,
                source: 'guest',
              }),
            )
          else yield* database(() => services.insertPending(photo))
        })
        yield* Effect.catch(publish, (failure) =>
          Effect.gen(function* () {
            const committed = yield* database(() =>
              isPublic ? services.findPublic(id) : services.findPending(id),
            )
            if (!committed) {
              yield* quietCleanup(
                storage(() => services.delete(isPublic, key)),
                services.log,
              )
              return yield* Effect.fail(failure)
            }
          }),
        )
        // Bookkeeping cannot invalidate a published photo or trigger compensation.
        if (input.invite)
          yield* quietCleanup(
            database(() => services.markInviteUsed(input.invite!.token)),
            services.log,
          )
        services.log({
          message: 'guest photo uploaded',
          eventSlug: input.eventSlug,
          photoId: id,
        })
        return galleryJson(
          { id, status: isPublic ? 'published' : 'pending' },
          201,
        )
      }),
    )
  })
}

export function createGuestUploadServices(bindings: {
  GALLERY_DB: D1Database
  GALLERY_PUBLIC: R2Bucket
  GALLERY_PENDING: R2Bucket
  IMAGES: ImagesBinding
}): GuestUploadServices {
  return {
    createId: () => crypto.randomUUID(),
    optimize: (file) => optimizedGalleryImage(file, bindings.IMAGES),
    put: (isPublic, key, body, metadata) =>
      (isPublic ? bindings.GALLERY_PUBLIC : bindings.GALLERY_PENDING).put(
        key,
        body,
        {
          httpMetadata: metadata,
        },
      ),
    delete: (isPublic, key) =>
      (isPublic ? bindings.GALLERY_PUBLIC : bindings.GALLERY_PENDING).delete(
        key,
      ),
    insertPublic: (photo) => insertGalleryPhoto(bindings.GALLERY_DB, photo),
    insertPending: (photo) =>
      insertPendingGuestPhoto(bindings.GALLERY_DB, photo),
    findPublic: async (id) =>
      Boolean(
        await bindings.GALLERY_DB.prepare(
          'SELECT id FROM gallery_photos WHERE id = ?',
        )
          .bind(id)
          .first(),
      ),
    findPending: async (id) =>
      Boolean(
        await bindings.GALLERY_DB.prepare(
          'SELECT id FROM guest_photos WHERE id = ?',
        )
          .bind(id)
          .first(),
      ),
    markInviteUsed: (token) =>
      markGalleryInviteUsed(bindings.GALLERY_DB, token),
    log: (entry) => console.log(JSON.stringify(entry)),
  }
}
