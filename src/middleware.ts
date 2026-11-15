import type { MiddlewareHandler } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminGate } from './lib/gallery-admin'
import { galleryJson } from './lib/gallery-effect'
import { galleryMediaKey } from './lib/gallery-media'
import { transformGalleryMedia } from './lib/gallery-media-server'
import { withSecurityHeaders } from './lib/security-headers'

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Every /admin/** and /api/admin/** request is gated here; handlers must not re-check.
  const gate = await galleryAdminGate(context.request, env)
  if (gate === 'not-found')
    return withSecurityHeaders(new Response(null, { status: 404 }))
  if (gate === 'forbidden-api')
    return withSecurityHeaders(galleryJson({ error: 'Forbidden.' }, 403))
  if (gate === 'forbidden')
    return withSecurityHeaders(new Response('Forbidden', { status: 403 }))
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
  if (context.url.hostname !== 'payments.ayoubabed.xyz')
    return withSecurityHeaders(await next())

  const response =
    context.url.pathname === '/'
      ? await context.rewrite('/payments/')
      : await next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return withSecurityHeaders(response)
}
