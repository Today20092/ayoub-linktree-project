import type { MiddlewareHandler } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryMediaKey } from './lib/gallery-media'
import { transformGalleryMedia } from './lib/gallery-media-server'

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Astro's default optimizer reads relative URLs from ASSETS, but uploads live in R2.
  if (
    context.request.method === 'GET' &&
    context.url.pathname.replace(/\/$/, '') === '/_image' &&
    galleryMediaKey(context.url.searchParams.get('href') ?? '')
  ) {
    const cache = await caches.open('gallery-upload-images')
    const cached = await cache.match(context.request)
    if (cached) return cached
    const response = await transformGalleryMedia(
      env.GALLERY_PUBLIC,
      env.IMAGES,
      context.url,
    )
    if (response.ok)
      context.locals.cfContext?.waitUntil(
        cache.put(context.request, response.clone()),
      )
    return response
  }
  if (context.url.hostname !== 'payments.ayoubabed.xyz') return next()

  const response =
    context.url.pathname === '/'
      ? await context.rewrite('/payments/')
      : await next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
