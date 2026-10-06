import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryReaderEffects } from '@/lib/gallery-read'
import { companionUpload } from '@/lib/gallery-companion-request'
export const prerender = false
export const POST: APIRoute = ({ request }) =>
  companionUpload(request, env, galleryReaderEffects(env.GALLERY_DB))
