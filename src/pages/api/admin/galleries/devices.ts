import { Effect } from 'effect'
import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import { createDevice } from '@/lib/gallery-companion'
import {
  database,
  galleryFailure,
  galleryJson,
  runGalleryHttp,
  validation,
} from '@/lib/gallery-effect'
export const prerender = false
export const POST: APIRoute = ({ request }) =>
  runGalleryHttp(
    Effect.gen(function* () {
      if (
        !(yield* validation(
          () =>
            galleryAdminAuthorized(
              request,
              env.GALLERY_ADMIN_EMAIL,
              env.GALLERY_ACCESS_TEAM_DOMAIN,
              env.GALLERY_ACCESS_AUDS,
            ),
          'Forbidden.',
          403,
        ))
      )
        return yield* Effect.fail(galleryFailure(403, 'Forbidden.'))
      if (request.headers.get('origin') !== new URL(request.url).origin)
        return yield* Effect.fail(galleryFailure(403, 'Invalid origin.'))
      if (Number(request.headers.get('content-length')) > 1024)
        return yield* Effect.fail(galleryFailure(413, 'Request too large.'))
      const data: { name?: string; revoke?: string; canManage?: boolean } =
        yield* validation(() => request.json(), 'Invalid request.')
      if (typeof data?.revoke === 'string') {
        yield* Effect.uninterruptible(
          database(() =>
            env.GALLERY_DB.prepare('DELETE FROM gallery_devices WHERE id = ?')
              .bind(data.revoke!)
              .run(),
          ),
        )
        return galleryJson({ ok: true })
      }
      if (typeof data?.name !== 'string' || !data.name.trim())
        return yield* Effect.fail(galleryFailure(400, 'Enter a device name.'))
      const name = data.name.trim()
      return galleryJson(
        yield* Effect.uninterruptible(
          database(() =>
            createDevice(env.GALLERY_DB, name, data.canManage === true),
          ),
        ),
        201,
      )
    }),
    request.signal,
  )
