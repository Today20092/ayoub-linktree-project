import type { MiddlewareHandler } from 'astro'

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (context.url.hostname !== 'payments.ayoubabed.xyz') return next()

  const response =
    context.url.pathname === '/'
      ? await context.rewrite('/payments/')
      : await next()
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
