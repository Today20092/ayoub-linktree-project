import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import { readGalleryAdmin, writeGalleryAdmin } from '@/lib/gallery-admin-route'

export const prerender = false
function authenticated(handler: typeof readGalleryAdmin): APIRoute {
  return async ({ request, params }) => {
    if (
      !(await galleryAdminAuthorized(
        request,
        env.GALLERY_ADMIN_EMAIL,
        env.GALLERY_ACCESS_TEAM_DOMAIN,
        env.GALLERY_ACCESS_AUDS,
      ))
    ) {
      return Response.json(
        { error: 'Forbidden.' },
        { status: 403, headers: { 'cache-control': 'no-store' } },
      )
    }
    return handler(request, params.slug)
  }
}
export const GET = authenticated(readGalleryAdmin)
export const POST = authenticated(writeGalleryAdmin)
