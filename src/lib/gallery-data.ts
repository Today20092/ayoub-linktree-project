export const GALLERY_PUBLIC_ORIGIN = 'https://photos.ayoubabed.xyz'

export type GallerySettings = {
  event_slug: string
  uploads_enabled: number
  password_salt: string | null
  password_hash: string | null
  updated_at: number
}

export type GuestPhoto = {
  id: string
  event_slug: string
  object_key: string
  original_filename: string
  width: number
  height: number
  alt: string
  status: 'pending' | 'published'
  created_at: number
  published_at: number | null
}

export type PendingGuestPhoto = Pick<
  GuestPhoto,
  | 'id'
  | 'event_slug'
  | 'object_key'
  | 'original_filename'
  | 'width'
  | 'height'
  | 'alt'
>

export type EventGallery = {
  event_slug: string
  title: string
  event_date: string | null
  event_time: string | null
  event_venue: string | null
  summary: string
  category: string
  flyer_object_key: string | null
  flyer_width: number | null
  flyer_height: number | null
  flyer_alt: string | null
  cover_src: string | null
  cover_width: number | null
  cover_height: number | null
  cover_alt: string | null
  coming_soon: number
  status: GalleryStatus
  created_at: number
  updated_at: number
}

export type GalleryStatus = 'published' | 'coming_soon' | 'hidden'

export function galleryStatus(value: unknown): GalleryStatus | undefined {
  return value === 'published' || value === 'coming_soon' || value === 'hidden'
    ? value
    : undefined
}

export type GalleryPhoto = {
  id: string
  event_slug: string
  object_key: string
  original_filename: string
  width: number
  height: number
  alt: string
  uploader_name: string | null
  source: 'admin' | 'guest'
  created_at: number
}

export type GalleryInvite = {
  token: string
  event_slug: string
  guest_name: string
  created_at: number
  last_used_at: number | null
}

export type SaveEventGalleryInput = {
  event_slug: string
  title: string
  event_date?: string | null
  event_time?: string | null
  event_venue?: string | null
  summary: string
  category?: string
  coming_soon: boolean
  status?: GalleryStatus
  flyer?: {
    object_key: string
    width: number
    height: number
    alt: string
  }
  cover?: {
    src: string
    width: number
    height: number
    alt: string
  }
}

export function pendingGuestKey(eventSlug: string, id: string) {
  return `pending/${eventSlug}/${id}.jpg`
}

export function publishedGuestKey(eventSlug: string, id: string) {
  return `events/${eventSlug}/guest/${id}.jpg`
}

export function adminPhotoKey(eventSlug: string, id: string) {
  return `events/${eventSlug}/photos/${id}.jpg`
}

export function flyerKey(eventSlug: string) {
  return `events/${eventSlug}/flyer.jpg`
}

export function publicGuestPhoto(photo: GuestPhoto) {
  return {
    id: photo.id,
    src: `${GALLERY_PUBLIC_ORIGIN}/${photo.object_key}`,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    filename: `${photo.id}.jpg`,
  }
}

export function publicGalleryPhoto(photo: GalleryPhoto) {
  return {
    id: photo.id,
    src: `${GALLERY_PUBLIC_ORIGIN}/${photo.object_key}`,
    width: photo.width,
    height: photo.height,
    alt: photo.alt,
    filename: `${photo.id}.jpg`,
    uploaderName: photo.uploader_name,
    source: photo.source,
  }
}

export function publicEventFlyer(gallery: EventGallery) {
  if (
    !gallery.flyer_object_key ||
    !gallery.flyer_width ||
    !gallery.flyer_height
  ) {
    return
  }
  return {
    src: `${GALLERY_PUBLIC_ORIGIN}/${gallery.flyer_object_key}`,
    width: gallery.flyer_width,
    height: gallery.flyer_height,
    alt: gallery.flyer_alt || `${gallery.title} flyer`,
    filename: gallery.flyer_object_key.split('/').at(-1) || 'flyer.jpg',
  }
}

export function publicEventCover(gallery: EventGallery) {
  if (!gallery.cover_src || !gallery.cover_width || !gallery.cover_height) {
    return
  }
  return {
    src: gallery.cover_src,
    width: gallery.cover_width,
    height: gallery.cover_height,
    alt: gallery.cover_alt || `${gallery.title} cover photo`,
    filename: gallery.cover_src.split('/').at(-1) || 'cover.jpg',
  }
}

export async function getGallerySettings(
  database: D1Database,
  eventSlug: string,
) {
  return database
    .prepare('SELECT * FROM gallery_settings WHERE event_slug = ?')
    .bind(eventSlug)
    .first<GallerySettings>()
}

export async function getEventGallery(database: D1Database, eventSlug: string) {
  return database
    .prepare('SELECT * FROM event_galleries WHERE event_slug = ?')
    .bind(eventSlug)
    .first<EventGallery>()
}

export async function listEventGalleries(database: D1Database) {
  const result = await database
    .prepare(
      `SELECT * FROM event_galleries
       ORDER BY COALESCE(event_date, ''), created_at DESC`,
    )
    .all<EventGallery>()
  return result.results
}

export async function listPublicEventGalleries(database: D1Database) {
  const result = await database
    .prepare(
      `SELECT * FROM event_galleries
       WHERE status != 'hidden'
       ORDER BY COALESCE(event_date, ''), created_at DESC`,
    )
    .all<EventGallery>()
  return result.results
}

export async function saveEventGallery(
  database: D1Database,
  gallery: SaveEventGalleryInput,
) {
  const status =
    gallery.status ?? (gallery.coming_soon ? 'coming_soon' : 'published')
  await database
    .prepare(
      `INSERT INTO event_galleries
       (event_slug, title, event_date, event_time, event_venue, summary,
        category, flyer_object_key, flyer_width, flyer_height, flyer_alt,
        cover_src, cover_width, cover_height, cover_alt,
        coming_soon, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(event_slug) DO UPDATE SET
         title = excluded.title,
         event_date = excluded.event_date,
         event_time = excluded.event_time,
         event_venue = excluded.event_venue,
         summary = excluded.summary,
         category = excluded.category,
         flyer_object_key = COALESCE(excluded.flyer_object_key, flyer_object_key),
         flyer_width = COALESCE(excluded.flyer_width, flyer_width),
         flyer_height = COALESCE(excluded.flyer_height, flyer_height),
         flyer_alt = COALESCE(excluded.flyer_alt, flyer_alt),
         cover_src = COALESCE(excluded.cover_src, cover_src),
         cover_width = COALESCE(excluded.cover_width, cover_width),
         cover_height = COALESCE(excluded.cover_height, cover_height),
         cover_alt = COALESCE(excluded.cover_alt, cover_alt),
         coming_soon = excluded.coming_soon,
         status = excluded.status,
         updated_at = unixepoch()`,
    )
    .bind(
      gallery.event_slug,
      gallery.title,
      gallery.event_date || null,
      gallery.event_time || null,
      gallery.event_venue || null,
      gallery.summary,
      gallery.category || 'Event Photography',
      gallery.flyer?.object_key ?? null,
      gallery.flyer?.width ?? null,
      gallery.flyer?.height ?? null,
      gallery.flyer?.alt ?? null,
      gallery.cover?.src ?? null,
      gallery.cover?.width ?? null,
      gallery.cover?.height ?? null,
      gallery.cover?.alt ?? null,
      status === 'coming_soon' ? 1 : 0,
      status,
    )
    .run()
}

export async function getHiddenFilenames(
  database: D1Database,
  eventSlug: string,
) {
  const result = await database
    .prepare('SELECT filename FROM hidden_photos WHERE event_slug = ?')
    .bind(eventSlug)
    .all<{ filename: string }>()
  return new Set(result.results.map(({ filename }) => filename))
}

export async function listPublishedGuestPhotos(
  database: D1Database,
  eventSlug: string,
) {
  const result = await database
    .prepare(
      `SELECT * FROM guest_photos
       WHERE event_slug = ? AND status = 'published'
       ORDER BY published_at, created_at`,
    )
    .bind(eventSlug)
    .all<GuestPhoto>()
  return result.results
}

export async function listGuestPhotos(database: D1Database, eventSlug: string) {
  const result = await database
    .prepare(
      `SELECT * FROM guest_photos
       WHERE event_slug = ?
       ORDER BY status, created_at`,
    )
    .bind(eventSlug)
    .all<GuestPhoto>()
  return result.results
}

export async function listGalleryPhotos(
  database: D1Database,
  eventSlug: string,
) {
  const result = await database
    .prepare(
      `SELECT * FROM gallery_photos
       WHERE event_slug = ?
       ORDER BY created_at`,
    )
    .bind(eventSlug)
    .all<GalleryPhoto>()
  return result.results
}

export async function insertGalleryPhoto(
  database: D1Database,
  photo: Omit<GalleryPhoto, 'created_at'>,
) {
  await database
    .prepare(
      `INSERT INTO gallery_photos
       (id, event_slug, object_key, original_filename, width, height, alt,
        uploader_name, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      photo.id,
      photo.event_slug,
      photo.object_key,
      photo.original_filename,
      photo.width,
      photo.height,
      photo.alt,
      photo.uploader_name,
      photo.source,
    )
    .run()
}

export async function createGalleryInvite(
  database: D1Database,
  invite: Pick<GalleryInvite, 'token' | 'event_slug' | 'guest_name'>,
) {
  await database
    .prepare(
      `INSERT INTO gallery_invites (token, event_slug, guest_name)
       VALUES (?, ?, ?)`,
    )
    .bind(invite.token, invite.event_slug, invite.guest_name)
    .run()
}

export async function listGalleryInvites(
  database: D1Database,
  eventSlug: string,
) {
  const result = await database
    .prepare(
      `SELECT * FROM gallery_invites
       WHERE event_slug = ?
       ORDER BY created_at DESC`,
    )
    .bind(eventSlug)
    .all<GalleryInvite>()
  return result.results
}

export async function getGalleryInvite(database: D1Database, token: string) {
  return database
    .prepare('SELECT * FROM gallery_invites WHERE token = ?')
    .bind(token)
    .first<GalleryInvite>()
}

export async function markGalleryInviteUsed(
  database: D1Database,
  token: string,
) {
  await database
    .prepare(
      'UPDATE gallery_invites SET last_used_at = unixepoch() WHERE token = ?',
    )
    .bind(token)
    .run()
}

export async function getGuestPhoto(database: D1Database, photoId: string) {
  return database
    .prepare('SELECT * FROM guest_photos WHERE id = ?')
    .bind(photoId)
    .first<GuestPhoto>()
}

export async function listHiddenPhotos(
  database: D1Database,
  eventSlug: string,
) {
  const result = await database
    .prepare(
      `SELECT event_slug, filename, hidden_at
       FROM hidden_photos
       WHERE event_slug = ?
       ORDER BY hidden_at DESC`,
    )
    .bind(eventSlug)
    .all<{ event_slug: string; filename: string; hidden_at: number }>()
  return result.results
}

export async function insertPendingGuestPhoto(
  database: D1Database,
  photo: PendingGuestPhoto,
) {
  await database
    .prepare(
      `INSERT INTO guest_photos
       (id, event_slug, object_key, original_filename, width, height, alt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      photo.id,
      photo.event_slug,
      photo.object_key,
      photo.original_filename,
      photo.width,
      photo.height,
      photo.alt,
    )
    .run()
}

export async function saveGallerySettings(
  database: D1Database,
  eventSlug: string,
  uploadsEnabled: boolean,
  password?: { salt: string; hash: string },
) {
  await database
    .prepare(
      `INSERT INTO gallery_settings
       (event_slug, uploads_enabled, password_salt, password_hash, updated_at)
       VALUES (?, ?, ?, ?, unixepoch())
       ON CONFLICT(event_slug) DO UPDATE SET
         uploads_enabled = excluded.uploads_enabled,
         password_salt = COALESCE(excluded.password_salt, password_salt),
         password_hash = COALESCE(excluded.password_hash, password_hash),
         updated_at = unixepoch()`,
    )
    .bind(
      eventSlug,
      uploadsEnabled ? 1 : 0,
      password?.salt ?? null,
      password?.hash ?? null,
    )
    .run()
}

export async function publishGuestPhoto(
  database: D1Database,
  photoId: string,
  objectKey: string,
  alt: string,
) {
  await database
    .prepare(
      `UPDATE guest_photos
       SET object_key = ?, alt = ?, status = 'published',
           published_at = COALESCE(published_at, unixepoch())
       WHERE id = ?`,
    )
    .bind(objectKey, alt, photoId)
    .run()
}

export async function deleteGuestPhoto(database: D1Database, photoId: string) {
  await database
    .prepare('DELETE FROM guest_photos WHERE id = ?')
    .bind(photoId)
    .run()
}

export async function hideProfessionalPhoto(
  database: D1Database,
  eventSlug: string,
  filename: string,
) {
  await database
    .prepare(
      `INSERT INTO hidden_photos (event_slug, filename)
       VALUES (?, ?)
       ON CONFLICT(event_slug, filename) DO NOTHING`,
    )
    .bind(eventSlug, filename)
    .run()
}

export async function restoreProfessionalPhoto(
  database: D1Database,
  eventSlug: string,
  filename: string,
) {
  await database
    .prepare('DELETE FROM hidden_photos WHERE event_slug = ? AND filename = ?')
    .bind(eventSlug, filename)
    .run()
}
