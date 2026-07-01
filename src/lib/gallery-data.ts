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

export function pendingGuestKey(eventSlug: string, id: string) {
  return `pending/${eventSlug}/${id}.jpg`
}

export function publishedGuestKey(eventSlug: string, id: string) {
  return `events/${eventSlug}/guest/${id}.jpg`
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

export async function getGallerySettings(
  database: D1Database,
  eventSlug: string,
) {
  return database
    .prepare('SELECT * FROM gallery_settings WHERE event_slug = ?')
    .bind(eventSlug)
    .first<GallerySettings>()
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
