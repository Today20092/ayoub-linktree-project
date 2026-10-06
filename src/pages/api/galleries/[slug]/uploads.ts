import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryReaderEffects } from '@/lib/gallery-read'
import { guestUploadRequest } from '@/lib/gallery-guest-request'
import { createGuestUploadServices } from '@/lib/gallery-guest-workflow'
export const prerender = false
export const POST: APIRoute = ({ params, request }) =>
  guestUploadRequest(request, params.slug, {
    reader: galleryReaderEffects(env.GALLERY_DB),
    sessionSecret: env.GALLERY_SESSION_SECRET,
    now: () => Math.floor(Date.now() / 1000),
    limit: (input) => env.GALLERY_UPLOAD_RATE_LIMITER.limit(input),
    services: createGuestUploadServices(env),
  })
