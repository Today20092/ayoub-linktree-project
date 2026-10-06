import { Effect } from 'effect'
import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import {
  readGalleryAdminEffect,
  writeGalleryAdminEffect,
} from '@/lib/gallery-admin-route'
import {
  galleryFailure,
  runGalleryHttp,
  validation,
} from '@/lib/gallery-effect'
export const prerender = false
function authenticated(handler: typeof readGalleryAdminEffect): APIRoute {
  return ({ request, params }) =>
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
        return yield* handler(request, params.slug)
      }),
      request.signal,
    )
}
export const GET = authenticated(readGalleryAdminEffect)
export const POST = authenticated(writeGalleryAdminEffect)
