import { Effect, Layer } from 'effect'
import {
  authorizeCompanion,
  GalleryDatabase,
} from './gallery-companion-workflow'
import { galleryStatus } from './gallery-data'
import { gallerySlug } from './gallery-upload'
import {
  database,
  galleryFailure,
  galleryJson,
  runGalleryHttp,
  validation,
  type GalleryFailure,
} from './gallery-effect'
export function createCompanionGallery(
  request: Request,
  databaseBinding: D1Database,
  exists: (
    slug: string,
  ) => Promise<boolean> | Effect.Effect<boolean, GalleryFailure>,
) {
  return runGalleryHttp(
    Effect.gen(function* () {
      if (!(yield* authorizeCompanion(request, true)))
        return yield* Effect.fail(
          galleryFailure(
            403,
            'Create a pairing key with gallery management enabled, then reconnect in Settings.',
          ),
        )
      const body = yield* validation(
        () => request.text(),
        'Invalid gallery details.',
      )
      if (body.length > 16_384)
        return yield* Effect.fail(
          galleryFailure(413, 'Gallery details are too long.'),
        )
      const input: Record<string, unknown> = yield* validation(async () => {
        const value = JSON.parse(body)
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error()
        return value
      }, 'Invalid gallery details.')
      const text = (key: string) =>
        typeof input[key] === 'string' ? input[key].trim() : ''
      const title = text('title')
      const summary = text('summary')
      const category = text('category') || 'Event Photography'
      const status =
        input.visibilityStatus === undefined
          ? 'hidden'
          : galleryStatus(input.visibilityStatus)
      if (
        !title ||
        title.length > 200 ||
        !summary ||
        summary.length > 5000 ||
        category.length > 120 ||
        !status
      )
        return yield* Effect.fail(
          galleryFailure(
            400,
            'Enter a name (up to 200 characters), about information (up to 5,000), and a valid visibility.',
          ),
        )
      const slug =
        text('slug') ||
        `${gallerySlug(title).slice(0, 65)}-${crypto.randomUUID().slice(0, 8)}`
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80)
        return yield* Effect.fail(
          galleryFailure(
            400,
            'Use up to 80 lowercase letters, numbers, and hyphens for the gallery link.',
          ),
        )
      const conflict = () =>
        Effect.fail(
          galleryFailure(
            409,
            'That gallery link is already in use. Choose another.',
          ),
        )
      if (
        yield* Effect.suspend(() => {
          const check = exists(slug)
          return Effect.isEffect(check) ? check : database(() => check)
        })
      )
        return yield* conflict()
      const result = yield* Effect.uninterruptible(
        database(() =>
          databaseBinding
            .prepare(
              `INSERT OR IGNORE INTO event_galleries
      (event_slug, title, summary, category, coming_soon, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
            )
            .bind(
              slug,
              title,
              summary,
              category,
              status === 'coming_soon' ? 1 : 0,
              status,
            )
            .run(),
        ),
      )
      if (!result.meta.changes) return yield* conflict()
      return galleryJson(
        { gallery: { id: slug, title, category, status } },
        201,
      )
    }).pipe(Effect.provide(Layer.succeed(GalleryDatabase, databaseBinding))),
    request.signal,
  )
}
