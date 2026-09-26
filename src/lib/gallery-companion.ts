import { adminPhotoKey } from './gallery-data'
import { optimizedGalleryImage, safeGalleryFilename } from './gallery-upload'

export const companionJson = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export async function contentHash(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function companionAuthorized(
  request: Request,
  db: D1Database,
  management = false,
) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token || !/^ayoub_[a-f0-9]{64}$/.test(token)) return false
  return Boolean(
    await db
      .prepare(
        `SELECT id FROM gallery_devices WHERE token_hash = ? AND expires_at > unixepoch()${management ? ' AND can_manage = 1' : ''}`,
      )
      .bind(await contentHash(new TextEncoder().encode(token).buffer))
      .first(),
  )
}

export async function createDevice(
  db: D1Database,
  name: string,
  canManage = false,
) {
  const token = `ayoub_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`
  const id = crypto.randomUUID()
  await db
    .prepare(
      'INSERT INTO gallery_devices (id, name, token_hash, expires_at, can_manage) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(
      id,
      name.slice(0, 80),
      await contentHash(new TextEncoder().encode(token).buffer),
      Math.floor(Date.now() / 1000) + 90 * 86400,
      canManage ? 1 : 0,
    )
    .run()
  return { id, token }
}

export type CompanionBindings = {
  GALLERY_DB: D1Database
  GALLERY_PUBLIC: R2Bucket
  IMAGES: ImagesBinding
}

export async function knownCompanionHashes(
  db: D1Database,
  gallery: string,
  hashes: string[],
) {
  if (!hashes.length) return []
  // Stay below D1's bound-parameter limit, including the gallery parameter.
  const known: string[] = []
  for (let offset = 0; offset < hashes.length; offset += 80) {
    const chunk = hashes.slice(offset, offset + 80)
    const result = await db
      .prepare(
        `SELECT sha256 FROM gallery_upload_receipts WHERE event_slug = ? AND state = 'complete' AND sha256 IN (${chunk.map(() => '?').join(',')})`,
      )
      .bind(gallery, ...chunk)
      .all<{ sha256: string }>()
    known.push(...result.results.map((row) => row.sha256))
  }
  return known
}

// A lease prevents two requests from publishing the same bytes. Each attempt has
// its own object key so an expired attempt cannot overwrite a later upload.
export async function receiveCompanionPhoto(
  bindings: CompanionBindings,
  event: { id: string; title: string },
  file: File,
  hash: string,
  optimize = optimizedGalleryImage,
) {
  const db = bindings.GALLERY_DB
  const owner = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const claim = await db
    .prepare(
      `INSERT INTO gallery_upload_receipts
    (event_slug, sha256, owner, state, lease_until) VALUES (?, ?, ?, 'uploading', ?)
    ON CONFLICT(event_slug, sha256) DO UPDATE SET owner = excluded.owner, lease_until = excluded.lease_until
    WHERE gallery_upload_receipts.state = 'uploading' AND gallery_upload_receipts.lease_until < ?
    RETURNING owner`,
    )
    .bind(event.id, hash, owner, now + 300, now)
    .first()
  if (!claim) {
    const receipt = await db
      .prepare(
        'SELECT state FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ?',
      )
      .bind(event.id, hash)
      .first<{ state: string }>()
    return receipt?.state === 'complete'
      ? companionJson({ status: 'skipped' })
      : companionJson(
          { error: 'This photo is already uploading. Retry shortly.' },
          409,
        )
  }
  const key = adminPhotoKey(event.id, owner)
  try {
    const image = await optimize(file, bindings.IMAGES)
    await bindings.GALLERY_PUBLIC.put(key, image.buffer, {
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=300',
      },
    })
    // D1 batch is transactional. The owner guard also handles an expired lease.
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO gallery_photos
        (id, event_slug, object_key, original_filename, width, height, alt, source)
        SELECT ?, ?, ?, ?, ?, ?, ?, 'admin' FROM gallery_upload_receipts
        WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'`,
        )
        .bind(
          owner,
          event.id,
          key,
          safeGalleryFilename(file.name),
          image.width,
          image.height,
          `Photo from ${event.title}`,
          event.id,
          hash,
          owner,
        ),
      db
        .prepare(
          `UPDATE gallery_upload_receipts SET state = 'complete', photo_id = ?
        WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'`,
        )
        .bind(owner, event.id, hash, owner),
    ])
    if (!results[0].meta.changes) {
      await bindings.GALLERY_PUBLIC.delete(key)
      return companionJson(
        { error: 'Upload lease expired. Retry this photo.' },
        409,
      )
    }
    return companionJson({ status: 'uploaded', id: owner }, 201)
  } catch (error) {
    // If D1 committed but its response was lost, never remove the published object.
    const receipt = await db
      .prepare(
        'SELECT state FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ? AND owner = ?',
      )
      .bind(event.id, hash, owner)
      .first<{ state: string }>()
    if (receipt?.state === 'complete')
      return companionJson({ status: 'skipped' })
    await bindings.GALLERY_PUBLIC.delete(key)
    await db
      .prepare(
        "DELETE FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'",
      )
      .bind(event.id, hash, owner)
      .run()
    throw error
  }
}
