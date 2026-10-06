import { Effect } from 'effect'
import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import { createWebGallery } from '@/lib/gallery-create-web'
import {
  createGalleryAdminCommandDependencies,
  galleryAdminLayer,
} from '@/lib/gallery-admin-commands'
import {
  galleryFailure,
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
      const form = yield* validation(
        () => request.formData(),
        'Invalid form submission.',
      )
      return yield* Effect.uninterruptible(createWebGallery(form))
    }).pipe(
      Effect.provide(
        galleryAdminLayer(
          createGalleryAdminCommandDependencies({
            database: env.GALLERY_DB,
            pendingBucket: env.GALLERY_PENDING,
            publicBucket: env.GALLERY_PUBLIC,
            images: env.IMAGES,
          }),
        ),
      ),
    ),
    request.signal,
  )
