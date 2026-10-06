import { Effect, Layer } from 'effect'
import {
  authorizeCompanion,
  GalleryDatabase,
  knownHashes,
} from './gallery-companion-workflow'
import { galleryJson, runGalleryUseCase } from './gallery-effect'
export {
  receiveCompanionPhoto,
  type CompanionBindings,
} from './gallery-companion-workflow'
export const companionJson = galleryJson
export { contentHash } from './gallery-checksum'
import { contentHash } from './gallery-checksum'
const databaseLayer = (db: D1Database) => Layer.succeed(GalleryDatabase, db)
export function companionAuthorized(
  request: Request,
  db: D1Database,
  management = false,
) {
  return runGalleryUseCase(
    authorizeCompanion(request, management).pipe(
      Effect.provide(databaseLayer(db)),
    ),
  )
}
export function knownCompanionHashes(
  db: D1Database,
  gallery: string,
  hashes: string[],
) {
  return runGalleryUseCase(
    knownHashes(gallery, hashes).pipe(Effect.provide(databaseLayer(db))),
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
