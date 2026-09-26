import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { readGalleryMedia } from '@/lib/gallery-media'

export const prerender = false
export const GET: APIRoute = ({ url }) =>
  readGalleryMedia(env.GALLERY_PUBLIC, url.pathname)
