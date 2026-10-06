import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryReaderEffects } from '@/lib/gallery-read'
import { guestSessionRequest } from '@/lib/gallery-guest-session'
export const prerender = false
export const POST: APIRoute = ({ params, request }) =>
  guestSessionRequest(request, params.slug, {
    reader: galleryReaderEffects(env.GALLERY_DB),
    sessionSecret: env.GALLERY_SESSION_SECRET,
    now: () => Math.floor(Date.now() / 1000),
    limit: (input) => env.GALLERY_PASSWORD_RATE_LIMITER.limit(input),
  })
