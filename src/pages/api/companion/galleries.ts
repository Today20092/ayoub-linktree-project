import { Effect } from 'effect'
import {
  authorizeCompanion,
  companionLayer,
} from '@/lib/gallery-companion-workflow'
import { runGalleryHttp } from '@/lib/gallery-effect'
import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { companionJson } from '@/lib/gallery-companion'
import { galleryReaderEffects } from '@/lib/gallery-read'
import { createCompanionGallery } from '@/lib/gallery-create'

export const prerender = false
export const POST: APIRoute = ({ request }) =>
  createCompanionGallery(request, env.GALLERY_DB, (slug) =>
    galleryReaderEffects(env.GALLERY_DB)
      .getAdmin(slug)
      .pipe(Effect.map(Boolean)),
  )
export const GET: APIRoute = ({ request }) =>
  runGalleryHttp(
    Effect.gen(function* () {
      if (!(yield* authorizeCompanion(request)))
        return companionJson({ error: 'Pair this device again.' }, 401)
      const galleries = yield* galleryReaderEffects(env.GALLERY_DB).listAdmin()
      return companionJson({
        galleries: galleries.map(
          ({ event, title, category, visibilityStatus }) => ({
            id: event.id,
            title,
            category,
            status: visibilityStatus,
          }),
        ),
      })
    }).pipe(Effect.provide(companionLayer(env))),
    request.signal,
  )
