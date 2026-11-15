import type { APIRoute } from 'astro'
import {
  readGalleryAdminEffect,
  writeGalleryAdminEffect,
} from '@/lib/gallery-admin-route'
import { runGalleryHttp } from '@/lib/gallery-effect'
export const prerender = false
// Authorization is enforced for all /api/admin/** requests in src/middleware.ts.
function admin(handler: typeof readGalleryAdminEffect): APIRoute {
  return ({ request, params }) =>
    runGalleryHttp(handler(request, params.slug), request.signal)
}
export const GET = admin(readGalleryAdminEffect)
export const POST = admin(writeGalleryAdminEffect)
