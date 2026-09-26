import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { companionAuthorized, companionJson } from '@/lib/gallery-companion'
import { galleryReader } from '@/lib/gallery-read'
import { createCompanionGallery } from '@/lib/gallery-create'

export const prerender = false
export const POST: APIRoute = ({ request }) =>
  createCompanionGallery(request, env.GALLERY_DB, async (slug) =>
    Boolean(await galleryReader(env.GALLERY_DB).getAdmin(slug)),
  )
export const GET: APIRoute = async ({ request }) => {
  if (!(await companionAuthorized(request, env.GALLERY_DB)))
    return companionJson({ error: 'Pair this device again.' }, 401)
  const galleries = await galleryReader(env.GALLERY_DB).listAdmin()
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
}
