// Headers for pages reached through secret links or admin sessions: never cached,
// indexed, or leaked through Referer.
export const PRIVATE_PAGE_ROBOTS = 'noindex,nofollow'

export function applyPrivatePageHeaders(headers: Headers) {
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  headers.set('Referrer-Policy', 'no-referrer')
}
