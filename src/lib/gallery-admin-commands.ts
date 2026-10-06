import { Context, Effect, Layer } from 'effect'
import {
  database,
  storage,
  imageProcessing,
  GalleryFailure,
  galleryFailure,
  quietCleanup,
  runGalleryUseCase,
} from './gallery-effect'
import {
  createGallerySharingToken,
  gallerySharingPath,
  gallerySubmissionPath,
} from './gallery-sharing'
import { galleryMediaUrl, galleryObjectUrl } from './gallery-media'
import {
  adminPhotoKey,
  createGalleryInvite,
  deleteGuestPhoto,
  galleryStatus,
  getGallerySettings,
  getGuestPhoto,
  getEventGallery,
  hideProfessionalPhoto,
  insertGalleryPhoto,
  listGalleryPhotos,
  listGuestPhotos,
  pendingGuestKey,
  publishGuestPhoto,
  publishedGuestKey,
  restoreProfessionalPhoto,
  saveEventGallery,
  saveGallerySettings,
  saveGallerySharing,
  saveGalleryUploadLink,
  type GalleryInvite,
  type GalleryPhoto,
  type GallerySettings,
  type GalleryStatus,
  type GuestPhoto,
  type EventGallery,
  type SaveEventGalleryInput,
} from './gallery-data'
import {
  acceptedGalleryImage,
  optimizedGalleryImage,
  safeGalleryFilename,
} from './gallery-upload'
type GalleryAdminObjectBody = Parameters<R2Bucket['put']>[1]
type GalleryAdminPassword = {
  salt: string
  hash: string
}
type GuestModerationAction =
  | {
      action: 'approveGuest'
      photoId: string
      alt?: string
    }
  | {
      action: 'rejectGuest' | 'removeGuest'
      photoId: string
    }
export type GalleryAdminEventContext = {
  id: string
  title: string
  summary: string
  category: string
  eventDate: string | null
  eventTime: string | null
  eventVenue: string | null
  comingSoon: boolean
  status: GalleryStatus
  flyerSrc?: string
  coverSrc?: string
  isPortfolio?: boolean
  staticPhotos: Array<{
    src: unknown
    width?: number
    height?: number
    alt?: string
    filename: string
  }>
}
export type GalleryAdminCommandDependencies = {
  data: {
    saveSharing?(
      eventSlug: string,
      unlisted: boolean,
      token: string,
    ): Promise<unknown>
    saveUploadLink?(
      eventSlug: string,
      enabled: boolean,
      token: string,
    ): Promise<unknown>
    getEvent(eventSlug: string): Promise<EventGallery | undefined>
    getSettings(eventSlug: string): Promise<GallerySettings | null | undefined>
    saveSettings(
      eventSlug: string,
      uploadsEnabled: boolean,
      password?: GalleryAdminPassword,
    ): Promise<unknown>
    getGuestPhoto(photoId: string): Promise<GuestPhoto | null | undefined>
    publishGuestPhoto(
      photoId: string,
      objectKey: string,
      alt: string,
    ): Promise<unknown>
    deleteGuestPhoto(photoId: string): Promise<unknown>
    hideProfessionalPhoto(eventSlug: string, filename: string): Promise<unknown>
    restoreProfessionalPhoto(
      eventSlug: string,
      filename: string,
    ): Promise<unknown>
    listGalleryPhotos(eventSlug: string): Promise<GalleryPhoto[]>
    listGuestPhotos(eventSlug: string): Promise<GuestPhoto[]>
    saveEventGallery(input: SaveEventGalleryInput): Promise<unknown>
    createInvite(
      invite: Pick<GalleryInvite, 'token' | 'event_slug' | 'guest_name'>,
    ): Promise<unknown>
    insertGalleryPhoto(
      photo: Omit<GalleryPhoto, 'created_at'>,
    ): Promise<unknown>
  }
  objects: {
    getPending(key: string): Promise<
      | {
          body: GalleryAdminObjectBody
          metadata?: R2HTTPMetadata
        }
      | undefined
    >
    getPublic(key: string): Promise<
      | {
          body: GalleryAdminObjectBody
          metadata?: R2HTTPMetadata
        }
      | undefined
    >
    publicExists(key: string): Promise<boolean>
    putPublic(
      key: string,
      body: GalleryAdminObjectBody,
      metadata?: R2HTTPMetadata,
    ): Promise<unknown>
    deletePending(key: string): Promise<unknown>
    putPending(
      key: string,
      body: GalleryAdminObjectBody,
      metadata?: R2HTTPMetadata,
    ): Promise<unknown>
    deletePublic(key: string): Promise<unknown>
  }
  images: {
    optimize(file: File): Promise<{
      buffer: GalleryAdminObjectBody
      width: number
      height: number
    }>
  }
  passwords: {
    valid(password: string): boolean
    hash(password: string): Promise<GalleryAdminPassword>
  }
  createSharingToken?(): string
  createId(): string
  log(entry: Record<string, unknown>): void
}
export type GalleryAdminCommandContext = {
  event: GalleryAdminEventContext
  requestUrl: string
}
export type GalleryAdminCommandResult = {
  status: number
  body: Record<string, unknown>
}
export class GalleryAdminCommandError extends GalleryFailure {
  constructor(message: string, status: number) {
    super(galleryFailure(status, message).kind, message, status)
  }
}
export function createGalleryAdminCommandDependencies(bindings: {
  database: D1Database
  pendingBucket: R2Bucket
  publicBucket: R2Bucket
  images: ImagesBinding
}): GalleryAdminCommandDependencies {
  return {
    data: {
      saveSharing: (slug, unlisted, token) =>
        saveGallerySharing(bindings.database, slug, unlisted, token),
      saveUploadLink: (slug, enabled, token) =>
        saveGalleryUploadLink(bindings.database, slug, enabled, token),
      getEvent: (eventSlug) => getEventGallery(bindings.database, eventSlug),
      getSettings: (eventSlug) =>
        getGallerySettings(bindings.database, eventSlug),
      saveSettings: (eventSlug, uploadsEnabled, password) =>
        saveGallerySettings(
          bindings.database,
          eventSlug,
          uploadsEnabled,
          password,
        ),
      getGuestPhoto: (photoId) => getGuestPhoto(bindings.database, photoId),
      publishGuestPhoto: (photoId, objectKey, alt) =>
        publishGuestPhoto(bindings.database, photoId, objectKey, alt),
      deleteGuestPhoto: (photoId) =>
        deleteGuestPhoto(bindings.database, photoId),
      hideProfessionalPhoto: (eventSlug, filename) =>
        hideProfessionalPhoto(bindings.database, eventSlug, filename),
      restoreProfessionalPhoto: (eventSlug, filename) =>
        restoreProfessionalPhoto(bindings.database, eventSlug, filename),
      listGalleryPhotos: (eventSlug) =>
        listGalleryPhotos(bindings.database, eventSlug),
      listGuestPhotos: (eventSlug) =>
        listGuestPhotos(bindings.database, eventSlug),
      saveEventGallery: (input) => saveEventGallery(bindings.database, input),
      createInvite: (invite) => createGalleryInvite(bindings.database, invite),
      insertGalleryPhoto: (photo) =>
        insertGalleryPhoto(bindings.database, photo),
    },
    objects: {
      getPending: async (key) => {
        const object = await bindings.pendingBucket.get(key)
        return object
          ? { body: object.body, metadata: object.httpMetadata }
          : undefined
      },
      getPublic: async (key) => {
        const object = await bindings.publicBucket.get(key)
        return object
          ? { body: object.body, metadata: object.httpMetadata }
          : undefined
      },
      publicExists: async (key) =>
        Boolean(await bindings.publicBucket.head(key)),
      putPublic: (key, body, metadata) =>
        bindings.publicBucket.put(key, body, {
          httpMetadata: metadata,
        }),
      deletePending: (key) => bindings.pendingBucket.delete(key),
      putPending: (key, body, metadata) =>
        bindings.pendingBucket.put(key, body, { httpMetadata: metadata }),
      deletePublic: (key) => bindings.publicBucket.delete(key),
    },
    images: {
      optimize: (file) => optimizedGalleryImage(file, bindings.images),
    },
    passwords: {
      valid: () => false,
      hash: async () => {
        throw new Error('Password uploads retired')
      },
    },
    createSharingToken: createGallerySharingToken,
    createId: () => crypto.randomUUID(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }
}
const ok = (body: Record<string, unknown> = { ok: true }) => ({
  status: 200,
  body,
})
function currentEventInput(
  event: GalleryAdminEventContext,
): SaveEventGalleryInput {
  return {
    event_slug: event.id,
    title: event.title,
    summary: event.summary,
    category: event.category,
    event_date: event.eventDate,
    event_time: event.eventTime,
    event_venue: event.eventVenue,
    coming_soon: event.comingSoon,
    status: event.status,
  }
}
function moderateGuestPhoto(
  context: GalleryAdminCommandContext,
  action: GuestModerationAction,
  dependencies: GalleryAdminCommandDependencies,
) {
  return Effect.gen(function* () {
    const photo = yield* database(() =>
      dependencies.data.getGuestPhoto(action.photoId),
    )
    if (!photo || photo.event_slug !== context.event.id) {
      return yield* Effect.fail(
        new GalleryAdminCommandError('Photo not found.', 404),
      )
    }
    if (action.action !== 'approveGuest') {
      if (action.action === 'rejectGuest' && photo.status !== 'pending') {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Published photos must be removed instead.',
            409,
          ),
        )
      }
      const storedObject =
        photo.status === 'pending'
          ? yield* storage(() =>
              dependencies.objects.getPending(photo.object_key),
            )
          : yield* storage(() =>
              dependencies.objects.getPublic(photo.object_key),
            )
      if (photo.status === 'pending') {
        yield* storage(() =>
          dependencies.objects.deletePending(photo.object_key),
        )
      } else {
        yield* storage(() =>
          dependencies.objects.deletePublic(photo.object_key),
        )
      }
      yield* Effect.catch(
        Effect.gen(function* () {
          yield* database(() => dependencies.data.deleteGuestPhoto(photo.id))
        }),
        (error) =>
          Effect.gen(function* () {
            if (storedObject) {
              if (photo.status === 'pending') {
                yield* quietCleanup(
                  storage(() =>
                    dependencies.objects.putPending(
                      photo.object_key,
                      storedObject.body,
                      storedObject.metadata,
                    ),
                  ),
                  dependencies.log,
                )
              } else {
                yield* quietCleanup(
                  storage(() =>
                    dependencies.objects.putPublic(
                      photo.object_key,
                      storedObject.body,
                      storedObject.metadata,
                    ),
                  ),
                  dependencies.log,
                )
              }
            }
            return yield* Effect.fail(error)
          }),
      )
      dependencies.log({
        message: 'gallery guest moderation completed',
        eventSlug: context.event.id,
        action: action.action,
        photoId: photo.id,
      })
      return ok()
    }
    if (photo.status === 'published') {
      const stalePendingKey = pendingGuestKey(context.event.id, photo.id)
      yield* Effect.catch(
        Effect.gen(function* () {
          yield* storage(() =>
            dependencies.objects.deletePending(stalePendingKey),
          )
        }),
        () =>
          Effect.gen(function* () {
            dependencies.log({
              message: 'gallery guest cleanup failed',
              eventSlug: context.event.id,
              action: action.action,
              photoId: photo.id,
              objectKey: stalePendingKey,
              kind: 'Storage',
            })
          }),
      )
      return ok()
    }
    const publicKey = publishedGuestKey(context.event.id, photo.id)
    const pending = yield* storage(() =>
      dependencies.objects.getPending(photo.object_key),
    )
    let copied = false
    if (
      !pending &&
      !(yield* storage(() => dependencies.objects.publicExists(publicKey)))
    ) {
      return yield* Effect.fail(
        new GalleryAdminCommandError('Pending image is missing.', 409),
      )
    }
    const alt = action.alt?.trim().slice(0, 240) || photo.alt
    yield* Effect.catch(
      Effect.gen(function* () {
        if (pending) {
          // A rejected R2 response can follow a persisted write.
          copied = true
          yield* storage(() =>
            dependencies.objects.putPublic(
              publicKey,
              pending.body,
              pending.metadata ?? {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=300',
              },
            ),
          )
        }
        yield* database(() =>
          dependencies.data.publishGuestPhoto(photo.id, publicKey, alt),
        )
      }),
      (error) =>
        Effect.gen(function* () {
          const current = yield* database(() =>
            dependencies.data.getGuestPhoto(photo.id),
          )
          if (current?.status === 'published') return ok()
          if (copied)
            yield* quietCleanup(
              storage(() => dependencies.objects.deletePublic(publicKey)),
              dependencies.log,
            )
          return yield* Effect.fail(error)
        }),
    )
    yield* Effect.catch(
      Effect.gen(function* () {
        yield* storage(() =>
          dependencies.objects.deletePending(photo.object_key),
        )
      }),
      () =>
        Effect.gen(function* () {
          dependencies.log({
            message: 'gallery guest cleanup failed',
            eventSlug: context.event.id,
            action: action.action,
            photoId: photo.id,
            objectKey: photo.object_key,
            kind: 'Storage',
          })
        }),
    )
    dependencies.log({
      message: 'gallery guest moderation completed',
      eventSlug: context.event.id,
      action: action.action,
      photoId: photo.id,
    })
    return ok()
  })
}
export function galleryAdminCommand(
  context: GalleryAdminCommandContext,
  value: unknown,
) {
  return Effect.gen(function* () {
    const dependencies = yield* GalleryAdmin
    const input =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {}
    if (input.action === 'updateEvent') {
      const title = typeof input.title === 'string' ? input.title.trim() : ''
      const summary =
        typeof input.summary === 'string' ? input.summary.trim() : ''
      if (!title || !summary) {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Name and about information are required.',
            400,
          ),
        )
      }
      yield* database(() =>
        dependencies.data.saveEventGallery({
          event_slug: context.event.id,
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
        }),
      )
      return ok()
    }
    if (input.action === 'createInvite') {
      const guestName =
        typeof input.guestName === 'string' ? input.guestName.trim() : ''
      if (!guestName) {
        return yield* Effect.fail(
          new GalleryAdminCommandError('Guest name is required.', 400),
        )
      }
      const token = dependencies.createId()
      yield* database(() =>
        dependencies.data.createInvite({
          token,
          event_slug: context.event.id,
          guest_name: guestName.slice(0, 120),
        }),
      )
      return ok({
        ok: true,
        token,
        url: new URL(
          `/galleries/${context.event.id}/upload/${token}/`,
          context.requestUrl,
        ).toString(),
      })
    }
    if (input.action === 'setCover') {
      const src =
        typeof input.src === 'string'
          ? galleryMediaUrl(input.src.trim(), context.requestUrl)
          : ''
      const alt = typeof input.alt === 'string' ? input.alt.trim() : ''
      const width = typeof input.width === 'number' ? input.width : 0
      const height = typeof input.height === 'number' ? input.height : 0
      if (!src || !alt || width <= 0 || height <= 0) {
        return yield* Effect.fail(
          new GalleryAdminCommandError('Cover photo is invalid.', 400),
        )
      }
      const [photos, guests] = yield* Effect.all(
        [
          database(() => dependencies.data.listGalleryPhotos(context.event.id)),
          database(() => dependencies.data.listGuestPhotos(context.event.id)),
        ],
        { concurrency: 'unbounded' },
      )
      const allowed = new Set([
        ...photos.map((photo) => galleryObjectUrl(photo.object_key)),
        ...guests
          .filter(({ status }) => status === 'published')
          .map((photo) => galleryObjectUrl(photo.object_key)),
        ...context.event.staticPhotos.map(({ src: photoSrc }) => photoSrc),
        ...(context.event.flyerSrc ? [context.event.flyerSrc] : []),
        ...(context.event.coverSrc ? [context.event.coverSrc] : []),
      ])
      if (!allowed.has(src)) {
        return yield* Effect.fail(
          new GalleryAdminCommandError('Cover photo is not available.', 404),
        )
      }
      if (!context.event.title || !context.event.summary) {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Save event details before setting a cover.',
            409,
          ),
        )
      }
      yield* database(() =>
        dependencies.data.saveEventGallery({
          ...currentEventInput(context.event),
          cover: { src, width, height, alt: alt.slice(0, 240) },
        }),
      )
      return ok()
    }
    if (input.action === 'uploadAdminPhoto') {
      const { file } = input
      if (!(file instanceof File) || !acceptedGalleryImage(file)) {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Choose a JPEG, PNG, WebP, or HEIC photo under 20 MB.',
            415,
          ),
        )
      }
      const optimized = yield* imageProcessing(() =>
        dependencies.images.optimize(file),
      )
      const id = dependencies.createId()
      const objectKey = adminPhotoKey(context.event.id, id)
      yield* Effect.catch(
        Effect.gen(function* () {
          yield* storage(() =>
            dependencies.objects.putPublic(objectKey, optimized.buffer, {
              contentType: 'image/jpeg',
              cacheControl: 'public, max-age=300',
            }),
          )
          yield* database(() =>
            dependencies.data.insertGalleryPhoto({
              id,
              event_slug: context.event.id,
              object_key: objectKey,
              original_filename: safeGalleryFilename(file.name),
              width: optimized.width,
              height: optimized.height,
              alt:
                (typeof input.alt === 'string'
                  ? input.alt.trim().slice(0, 240)
                  : '') || `Photo from ${context.event.title}`,
              uploader_name: null,
              source: 'admin',
            }),
          )
        }),
        (error) =>
          Effect.gen(function* () {
            const photos = yield* database(() =>
              dependencies.data.listGalleryPhotos(context.event.id),
            )
            if (
              photos.some(
                (photo) => photo.id === id && photo.object_key === objectKey,
              )
            )
              return
            yield* quietCleanup(
              storage(() => dependencies.objects.deletePublic(objectKey)),
              dependencies.log,
            )
            return yield* Effect.fail(error)
          }),
      )
      return { status: 201, body: { ok: true, id } }
    }
    if (input.action === 'updateFlyer') {
      const { file } = input
      if (!(file instanceof File) || !acceptedGalleryImage(file)) {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Choose a JPEG, PNG, WebP, or HEIC image under 20 MB.',
            415,
          ),
        )
      }
      if (!context.event.title || !context.event.summary) {
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Save event details before replacing the flyer.',
            409,
          ),
        )
      }
      const optimized = yield* imageProcessing(() =>
        dependencies.images.optimize(file),
      )
      const objectKey = `events/${context.event.id}/flyer-${dependencies.createId()}.jpg`
      const flyer = {
        object_key: objectKey,
        width: optimized.width,
        height: optimized.height,
        alt: `${context.event.title} flyer`,
      }
      yield* Effect.catch(
        Effect.gen(function* () {
          yield* storage(() =>
            dependencies.objects.putPublic(objectKey, optimized.buffer, {
              contentType: 'image/jpeg',
              cacheControl: 'public, max-age=300',
            }),
          )
          yield* database(() =>
            dependencies.data.saveEventGallery({
              ...currentEventInput(context.event),
              flyer,
              cover: {
                src: galleryObjectUrl(objectKey),
                width: optimized.width,
                height: optimized.height,
                alt: flyer.alt,
              },
            }),
          )
        }),
        (error) =>
          Effect.gen(function* () {
            const event = yield* database(() =>
              dependencies.data.getEvent(context.event.id),
            )
            if (event?.flyer_object_key === objectKey) return
            yield* quietCleanup(
              storage(() => dependencies.objects.deletePublic(objectKey)),
              dependencies.log,
            )
            return yield* Effect.fail(error)
          }),
      )
      return { status: 201, body: { ok: true, flyer } }
    }
    if (input.action === 'settings') {
      if (
        typeof input.uploadsEnabled !== 'boolean' ||
        (input.password !== undefined && typeof input.password !== 'string')
      ) {
        return yield* Effect.fail(
          new GalleryAdminCommandError('Invalid action.', 400),
        )
      }
      if (typeof input.password === 'string' && input.password.trim())
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Guest passwords have been replaced by links. Use the web dashboard to manage submission links.',
            400,
          ),
        )
      const existing = yield* database(() =>
        dependencies.data.getSettings(context.event.id),
      )
      if (!dependencies.data.saveUploadLink)
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Submission links are unavailable.',
            503,
          ),
        )
      const token =
        input.rotateLink === true || !existing?.upload_token
          ? (dependencies.createSharingToken ?? createGallerySharingToken)()
          : existing.upload_token
      yield* database(() =>
        dependencies.data.saveUploadLink!(
          context.event.id,
          input.uploadsEnabled as boolean,
          token,
        ),
      )
      return ok({
        ok: true,
        url: new URL(
          gallerySubmissionPath(context.event.id, token),
          context.requestUrl,
        ).toString(),
      })
    }
    if (input.action === 'sharing' && typeof input.unlisted === 'boolean') {
      if (!dependencies.data.saveSharing)
        return yield* Effect.fail(
          new GalleryAdminCommandError('Sharing links are unavailable.', 503),
        )
      const event = yield* database(() =>
        dependencies.data.getEvent(context.event.id),
      )
      if (!event || context.event.isPortfolio)
        return yield* Effect.fail(
          new GalleryAdminCommandError(
            'Curated portfolio galleries remain public. Manage unlisted sharing on a standalone event gallery.',
            409,
          ),
        )
      const token =
        input.rotateLink === true || !event.share_token
          ? (dependencies.createSharingToken ?? createGallerySharingToken)()
          : event.share_token
      yield* database(() =>
        dependencies.data.saveSharing!(
          context.event.id,
          input.unlisted as boolean,
          token,
        ),
      )
      return ok({
        ok: true,
        url: new URL(
          gallerySharingPath(
            context.event.id,
            input.unlisted ? token : undefined,
          ),
          context.requestUrl,
        ).toString(),
      })
    }
    if (
      (input.action === 'hideProfessional' ||
        input.action === 'restoreProfessional') &&
      typeof input.filename === 'string'
    ) {
      const available = new Set(
        context.event.staticPhotos.map(({ filename }) => filename),
      )
      if (!available.has(input.filename)) {
        return yield* Effect.fail(
          new GalleryAdminCommandError('Professional photo not found.', 404),
        )
      }
      if (input.action === 'hideProfessional') {
        yield* database(() =>
          dependencies.data.hideProfessionalPhoto(
            context.event.id,
            input.filename as string,
          ),
        )
      } else {
        yield* database(() =>
          dependencies.data.restoreProfessionalPhoto(
            context.event.id,
            input.filename as string,
          ),
        )
      }
      return ok()
    }
    let guestAction: GuestModerationAction
    if (
      input.action === 'approveGuest' &&
      typeof input.photoId === 'string' &&
      (input.alt === undefined || typeof input.alt === 'string')
    ) {
      guestAction = {
        action: input.action,
        photoId: input.photoId,
        alt: typeof input.alt === 'string' ? input.alt : undefined,
      }
    } else if (
      (input.action === 'rejectGuest' || input.action === 'removeGuest') &&
      typeof input.photoId === 'string'
    ) {
      guestAction = { action: input.action, photoId: input.photoId }
    } else {
      return yield* Effect.fail(
        new GalleryAdminCommandError('Invalid action.', 400),
      )
    }
    return yield* moderateGuestPhoto(context, guestAction, dependencies)
  })
}

export const GalleryAdmin =
  Context.Service<GalleryAdminCommandDependencies>('gallery/Admin')
export const galleryAdminLayer = (
  dependencies: GalleryAdminCommandDependencies,
) => Layer.succeed(GalleryAdmin, dependencies)
export function executeGalleryAdminCommand(
  context: GalleryAdminCommandContext,
  value: unknown,
  dependencies: GalleryAdminCommandDependencies,
) {
  return runGalleryUseCase(
    Effect.uninterruptible(galleryAdminCommand(context, value)).pipe(
      Effect.provide(galleryAdminLayer(dependencies)),
    ),
  )
}
