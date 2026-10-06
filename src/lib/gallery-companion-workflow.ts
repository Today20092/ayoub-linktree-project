import { Context, Effect, Layer } from 'effect'
import { adminPhotoKey } from './gallery-data'
import { optimizedGalleryImage, safeGalleryFilename } from './gallery-upload'
import {
  database,
  storage,
  imageProcessing,
  galleryJson,
  quietCleanup,
  runGalleryUseCase,
  safeGalleryLog,
} from './gallery-effect'
import { contentHash } from './gallery-checksum'

export type CompanionBindings = {
  GALLERY_DB: D1Database
  GALLERY_PUBLIC: R2Bucket
  IMAGES: ImagesBinding
}
export type CompanionServices = CompanionBindings & {
  now(): number
  createId(): string
  optimize: typeof optimizedGalleryImage
  log(entry: Record<string, unknown>): void
}
export const GalleryDatabase = Context.Service<D1Database>('gallery/Database')
export const Companion = Context.Service<CompanionServices>('gallery/Companion')
export const companionLayer = (
  bindings: CompanionBindings,
  overrides: Partial<
    Pick<CompanionServices, 'now' | 'createId' | 'optimize' | 'log'>
  > = {},
) =>
  Layer.merge(
    Layer.succeed(GalleryDatabase, bindings.GALLERY_DB),
    Layer.succeed(Companion, {
      ...bindings,
      now: () => Math.floor(Date.now() / 1000),
      createId: () => crypto.randomUUID(),
      optimize: optimizedGalleryImage,
      log: safeGalleryLog,
      ...overrides,
    }),
  )

export function authorizeCompanion(request: Request, management = false) {
  return Effect.gen(function* () {
    const db = yield* GalleryDatabase
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
    if (!token || !/^ayoub_[a-f0-9]{64}$/.test(token)) return false
    const hash = yield* Effect.promise(() =>
      contentHash(new TextEncoder().encode(token).buffer),
    )
    return Boolean(
      yield* database(() =>
        db
          .prepare(
            `SELECT id FROM gallery_devices WHERE token_hash = ? AND expires_at > unixepoch()${management ? ' AND can_manage = 1' : ''}`,
          )
          .bind(hash)
          .first(),
      ),
    )
  })
}

export function knownHashes(gallery: string, hashes: string[]) {
  return Effect.gen(function* () {
    const db = yield* GalleryDatabase
    const known: string[] = []
    for (let offset = 0; offset < hashes.length; offset += 80) {
      const chunk = hashes.slice(offset, offset + 80)
      const result = yield* database(() =>
        db
          .prepare(
            `SELECT sha256 FROM gallery_upload_receipts WHERE event_slug = ? AND state = 'complete' AND sha256 IN (${chunk.map(() => '?').join(',')})`,
          )
          .bind(gallery, ...chunk)
          .all<{ sha256: string }>(),
      )
      known.push(...result.results.map((row) => row.sha256))
    }
    return known
  })
}

export function receivePhoto(
  event: { id: string; title: string },
  file: File,
  hash: string,
) {
  return Effect.gen(function* () {
    const services = yield* Companion
    const db = services.GALLERY_DB
    const owner = services.createId()
    const now = services.now()
    const key = adminPhotoKey(event.id, owner)
    // Once the claim starts, finish/reconcile external writes despite interruption.
    // Promise cancellation cannot establish whether D1 or R2 committed.
    return yield* Effect.uninterruptible(
      Effect.gen(function* () {
        const claim = yield* database(() =>
          db
            .prepare(
              `INSERT INTO gallery_upload_receipts
        (event_slug, sha256, owner, state, lease_until) VALUES (?, ?, ?, 'uploading', ?)
        ON CONFLICT(event_slug, sha256) DO UPDATE SET owner = excluded.owner, lease_until = excluded.lease_until
        WHERE gallery_upload_receipts.state = 'uploading' AND gallery_upload_receipts.lease_until < ? RETURNING owner`,
            )
            .bind(event.id, hash, owner, now + 300, now)
            .first(),
        )
        if (!claim) {
          const receipt = yield* database(() =>
            db
              .prepare(
                'SELECT state FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ?',
              )
              .bind(event.id, hash)
              .first<{ state: string }>(),
          )
          return receipt?.state === 'complete'
            ? galleryJson({ status: 'skipped' })
            : galleryJson(
                { error: 'This photo is already uploading. Retry shortly.' },
                409,
              )
        }
        const publish = Effect.gen(function* () {
          const image = yield* imageProcessing(() =>
            services.optimize(file, services.IMAGES),
          )
          yield* storage(() =>
            services.GALLERY_PUBLIC.put(key, image.buffer, {
              httpMetadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=300',
              },
            }),
          )
          const results = yield* database(() =>
            db.batch([
              db
                .prepare(
                  `INSERT INTO gallery_photos (id, event_slug, object_key, original_filename, width, height, alt, source)
            SELECT ?, ?, ?, ?, ?, ?, ?, 'admin' FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'`,
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
                  `UPDATE gallery_upload_receipts SET state = 'complete', photo_id = ? WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'`,
                )
                .bind(owner, event.id, hash, owner),
            ]),
          )
          if (!results[0].meta.changes) {
            yield* quietCleanup(
              storage(() => services.GALLERY_PUBLIC.delete(key)),
              services.log,
            )
            return galleryJson(
              { error: 'Upload lease expired. Retry this photo.' },
              409,
            )
          }
          return galleryJson({ status: 'uploaded', id: owner }, 201)
        })
        return yield* Effect.catch(publish, (failure) =>
          Effect.gen(function* () {
            // If reconciliation fails, retain bytes and lease: never guess a commit outcome.
            const receipt = yield* database(() =>
              db
                .prepare(
                  'SELECT state FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ? AND owner = ?',
                )
                .bind(event.id, hash, owner)
                .first<{ state: string }>(),
            )
            if (receipt?.state === 'complete')
              return galleryJson({ status: 'skipped' })
            yield* quietCleanup(
              storage(() => services.GALLERY_PUBLIC.delete(key)),
              services.log,
            )
            yield* quietCleanup(
              database(() =>
                db
                  .prepare(
                    "DELETE FROM gallery_upload_receipts WHERE event_slug = ? AND sha256 = ? AND owner = ? AND state = 'uploading'",
                  )
                  .bind(event.id, hash, owner)
                  .run(),
              ),
              services.log,
            )
            return yield* Effect.fail(failure)
          }),
        )
      }),
    )
  })
}

export function receiveCompanionPhoto(
  bindings: CompanionBindings,
  event: { id: string; title: string },
  file: File,
  hash: string,
  optimize = optimizedGalleryImage,
  overrides: Partial<Pick<CompanionServices, 'now' | 'createId' | 'log'>> = {},
) {
  return runGalleryUseCase(
    receivePhoto(event, file, hash).pipe(
      Effect.provide(companionLayer(bindings, { optimize, ...overrides })),
    ),
  )
}
