import { hashGalleryPassword, validGalleryPassword } from './gallery-auth'
import {
  GALLERY_PUBLIC_ORIGIN,
  adminPhotoKey,
  createGalleryInvite,
  deleteGuestPhoto,
  galleryStatus,
  getGallerySettings,
  getGuestPhoto,
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
  type GalleryInvite,
  type GalleryPhoto,
  type GallerySettings,
  type GalleryStatus,
  type GuestPhoto,
  type SaveEventGalleryInput,
} from './gallery-data'
import {
  acceptedGalleryImage,
  optimizedGalleryImage,
  safeGalleryFilename,
} from './gallery-upload'

type GalleryAdminObjectBody = Parameters<R2Bucket['put']>[1]

type GalleryAdminPassword = { salt: string; hash: string }

type GuestModerationAction =
  | { action: 'approveGuest'; photoId: string; alt?: string }
  | { action: 'rejectGuest' | 'removeGuest'; photoId: string }

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
    getPending(
      key: string,
    ): Promise<
      { body: GalleryAdminObjectBody; metadata?: R2HTTPMetadata } | undefined
    >
    getPublic(
      key: string,
    ): Promise<
      { body: GalleryAdminObjectBody; metadata?: R2HTTPMetadata } | undefined
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

export class GalleryAdminCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
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
      valid: validGalleryPassword,
      hash: hashGalleryPassword,
    },
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

async function moderateGuestPhoto(
  context: GalleryAdminCommandContext,
  action: GuestModerationAction,
  dependencies: GalleryAdminCommandDependencies,
): Promise<GalleryAdminCommandResult> {
  const photo = await dependencies.data.getGuestPhoto(action.photoId)
  if (!photo || photo.event_slug !== context.event.id) {
    throw new GalleryAdminCommandError('Photo not found.', 404)
  }

  if (action.action !== 'approveGuest') {
    if (action.action === 'rejectGuest' && photo.status !== 'pending') {
      throw new GalleryAdminCommandError(
        'Published photos must be removed instead.',
        409,
      )
    }
    const storedObject =
      photo.status === 'pending'
        ? await dependencies.objects.getPending(photo.object_key)
        : await dependencies.objects.getPublic(photo.object_key)
    if (photo.status === 'pending') {
      await dependencies.objects.deletePending(photo.object_key)
    } else {
      await dependencies.objects.deletePublic(photo.object_key)
    }
    try {
      await dependencies.data.deleteGuestPhoto(photo.id)
    } catch (error) {
      if (storedObject) {
        if (photo.status === 'pending') {
          await dependencies.objects.putPending(
            photo.object_key,
            storedObject.body,
            storedObject.metadata,
          )
        } else {
          await dependencies.objects.putPublic(
            photo.object_key,
            storedObject.body,
            storedObject.metadata,
          )
        }
      }
      throw error
    }
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
    try {
      await dependencies.objects.deletePending(stalePendingKey)
    } catch (error) {
      dependencies.log({
        message: 'gallery guest cleanup failed',
        eventSlug: context.event.id,
        action: action.action,
        photoId: photo.id,
        objectKey: stalePendingKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return ok()
  }

  const publicKey = publishedGuestKey(context.event.id, photo.id)
  const pending = await dependencies.objects.getPending(photo.object_key)
  let copied = false
  if (pending) {
    await dependencies.objects.putPublic(
      publicKey,
      pending.body,
      pending.metadata ?? {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=300',
      },
    )
    copied = true
  } else if (!(await dependencies.objects.publicExists(publicKey))) {
    throw new GalleryAdminCommandError('Pending image is missing.', 409)
  }

  const alt = action.alt?.trim().slice(0, 240) || photo.alt
  try {
    await dependencies.data.publishGuestPhoto(photo.id, publicKey, alt)
  } catch (error) {
    if (copied) await dependencies.objects.deletePublic(publicKey)
    throw error
  }
  try {
    await dependencies.objects.deletePending(photo.object_key)
  } catch (error) {
    dependencies.log({
      message: 'gallery guest cleanup failed',
      eventSlug: context.event.id,
      action: action.action,
      photoId: photo.id,
      objectKey: photo.object_key,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
  dependencies.log({
    message: 'gallery guest moderation completed',
    eventSlug: context.event.id,
    action: action.action,
    photoId: photo.id,
  })
  return ok()
}

export async function executeGalleryAdminCommand(
  context: GalleryAdminCommandContext,
  value: unknown,
  dependencies: GalleryAdminCommandDependencies,
): Promise<GalleryAdminCommandResult> {
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  if (input.action === 'updateEvent') {
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    const summary =
      typeof input.summary === 'string' ? input.summary.trim() : ''
    if (!title || !summary) {
      throw new GalleryAdminCommandError(
        'Name and about information are required.',
        400,
      )
    }
    await dependencies.data.saveEventGallery({
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
    })
    return ok()
  }

  if (input.action === 'createInvite') {
    const guestName =
      typeof input.guestName === 'string' ? input.guestName.trim() : ''
    if (!guestName) {
      throw new GalleryAdminCommandError('Guest name is required.', 400)
    }
    const token = dependencies.createId()
    await dependencies.data.createInvite({
      token,
      event_slug: context.event.id,
      guest_name: guestName.slice(0, 120),
    })
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
    const src = typeof input.src === 'string' ? input.src.trim() : ''
    const alt = typeof input.alt === 'string' ? input.alt.trim() : ''
    const width = typeof input.width === 'number' ? input.width : 0
    const height = typeof input.height === 'number' ? input.height : 0
    if (!src || !alt || width <= 0 || height <= 0) {
      throw new GalleryAdminCommandError('Cover photo is invalid.', 400)
    }

    const [photos, guests] = await Promise.all([
      dependencies.data.listGalleryPhotos(context.event.id),
      dependencies.data.listGuestPhotos(context.event.id),
    ])
    const allowed = new Set([
      ...photos.map((photo) => `${GALLERY_PUBLIC_ORIGIN}/${photo.object_key}`),
      ...guests
        .filter(({ status }) => status === 'published')
        .map((photo) => `${GALLERY_PUBLIC_ORIGIN}/${photo.object_key}`),
      ...context.event.staticPhotos.map(({ src: photoSrc }) => photoSrc),
      ...(context.event.flyerSrc ? [context.event.flyerSrc] : []),
      ...(context.event.coverSrc ? [context.event.coverSrc] : []),
    ])
    if (!allowed.has(src)) {
      throw new GalleryAdminCommandError('Cover photo is not available.', 404)
    }
    if (!context.event.title || !context.event.summary) {
      throw new GalleryAdminCommandError(
        'Save event details before setting a cover.',
        409,
      )
    }
    await dependencies.data.saveEventGallery({
      ...currentEventInput(context.event),
      cover: { src, width, height, alt: alt.slice(0, 240) },
    })
    return ok()
  }

  if (input.action === 'uploadAdminPhoto') {
    const { file } = input
    if (!(file instanceof File) || !acceptedGalleryImage(file)) {
      throw new GalleryAdminCommandError(
        'Choose a JPEG, PNG, WebP, or HEIC photo under 20 MB.',
        415,
      )
    }
    const optimized = await dependencies.images.optimize(file)
    const id = dependencies.createId()
    const objectKey = adminPhotoKey(context.event.id, id)
    await dependencies.objects.putPublic(objectKey, optimized.buffer, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=300',
    })
    try {
      await dependencies.data.insertGalleryPhoto({
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
      })
    } catch (error) {
      await dependencies.objects.deletePublic(objectKey)
      throw error
    }
    return { status: 201, body: { ok: true, id } }
  }

  if (input.action === 'updateFlyer') {
    const { file } = input
    if (!(file instanceof File) || !acceptedGalleryImage(file)) {
      throw new GalleryAdminCommandError(
        'Choose a JPEG, PNG, WebP, or HEIC image under 20 MB.',
        415,
      )
    }
    if (!context.event.title || !context.event.summary) {
      throw new GalleryAdminCommandError(
        'Save event details before replacing the flyer.',
        409,
      )
    }
    const optimized = await dependencies.images.optimize(file)
    const objectKey = `events/${context.event.id}/flyer-${dependencies.createId()}.jpg`
    await dependencies.objects.putPublic(objectKey, optimized.buffer, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=300',
    })
    const flyer = {
      object_key: objectKey,
      width: optimized.width,
      height: optimized.height,
      alt: `${context.event.title} flyer`,
    }
    try {
      await dependencies.data.saveEventGallery({
        ...currentEventInput(context.event),
        flyer,
        cover: {
          src: `${GALLERY_PUBLIC_ORIGIN}/${objectKey}`,
          width: optimized.width,
          height: optimized.height,
          alt: flyer.alt,
        },
      })
    } catch (error) {
      await dependencies.objects.deletePublic(objectKey)
      throw error
    }
    return { status: 201, body: { ok: true, flyer } }
  }

  if (input.action === 'settings') {
    if (
      typeof input.uploadsEnabled !== 'boolean' ||
      (input.password !== undefined && typeof input.password !== 'string')
    ) {
      throw new GalleryAdminCommandError('Invalid action.', 400)
    }
    const existing = await dependencies.data.getSettings(context.event.id)
    const newPassword =
      typeof input.password === 'string' ? input.password.trim() : undefined
    if (newPassword && !dependencies.passwords.valid(newPassword)) {
      throw new GalleryAdminCommandError(
        'Password must be 8 to 128 characters.',
        400,
      )
    }
    if (
      input.uploadsEnabled &&
      !newPassword &&
      (!existing?.password_hash || !existing.password_salt)
    ) {
      throw new GalleryAdminCommandError(
        'Set a password before enabling uploads.',
        400,
      )
    }
    const password = newPassword
      ? await dependencies.passwords.hash(newPassword)
      : undefined
    await dependencies.data.saveSettings(
      context.event.id,
      input.uploadsEnabled,
      password,
    )
    return ok()
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
      throw new GalleryAdminCommandError('Professional photo not found.', 404)
    }
    if (input.action === 'hideProfessional') {
      await dependencies.data.hideProfessionalPhoto(
        context.event.id,
        input.filename,
      )
    } else {
      await dependencies.data.restoreProfessionalPhoto(
        context.event.id,
        input.filename,
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
    throw new GalleryAdminCommandError('Invalid action.', 400)
  }
  return moderateGuestPhoto(context, guestAction, dependencies)
}
