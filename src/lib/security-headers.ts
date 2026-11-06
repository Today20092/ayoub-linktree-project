// Keep in sync with the `/*` block in public/_headers, which Cloudflare applies only to static assets.
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), payment=(), usb=()',
}

export function withSecurityHeaders(response: Response): Response {
  const missing = Object.entries(securityHeaders).filter(
    ([name]) => !response.headers.has(name),
  )
  if (
    response.status >= 400 ||
    response.headers.get('X-Robots-Tag')?.includes('noindex')
  ) {
    const cacheControl = response.headers.get('Cache-Control')
    // Prevent edge analytics injection on unlisted, upload, admin, and error pages.
    if (
      !cacheControl?.split(',').some((value) => value.trim() === 'no-transform')
    )
      missing.push([
        'Cache-Control',
        cacheControl ? `${cacheControl}, no-transform` : 'no-transform',
      ])
  }
  if (!missing.length) return response
  try {
    for (const [name, value] of missing) response.headers.set(name, value)
    return response
  } catch {
    // Responses passed through from fetch() have immutable headers.
    const copy = new Response(response.body, response)
    for (const [name, value] of missing) copy.headers.set(name, value)
    return copy
  }
}
