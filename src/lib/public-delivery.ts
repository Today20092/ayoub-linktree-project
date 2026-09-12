export const PUBLIC_PAGE_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=60'

export function cacheControlForPage(
  location: string | URL,
  request?: Request,
  responseHeaders?: Headers,
) {
  const url =
    typeof location === 'string'
      ? new URL(location, 'https://localhost')
      : location

  if (
    url.search ||
    request?.headers.has('cookie') ||
    request?.headers.has('authorization') ||
    responseHeaders?.has('cache-control') ||
    responseHeaders?.has('set-cookie')
  ) {
    return undefined
  }

  const { pathname } = url
  if (
    pathname === '/' ||
    ['/about/', '/contact/', '/privacy/'].includes(pathname) ||
    pathname.startsWith('/portfolio/')
  ) {
    return PUBLIC_PAGE_CACHE_CONTROL
  }
  return undefined
}

export function escapeXml(value: string) {
  return value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[character] ?? character,
  )
}
