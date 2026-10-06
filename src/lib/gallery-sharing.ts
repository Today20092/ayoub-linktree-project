export function createGallerySharingToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
export function validSharingToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}
export function matchesSharingToken(provided: unknown, expected: unknown) {
  if (!validSharingToken(provided) || !validSharingToken(expected)) return false
  let difference = 0
  for (let index = 0; index < expected.length; index++)
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index)
  return difference === 0
}
export function gallerySharingPath(slug: string, token?: string | null) {
  return (
    '/galleries/' +
    encodeURIComponent(slug) +
    '/' +
    (token ? '?share=' + encodeURIComponent(token) : '')
  )
}
export function gallerySubmissionPath(slug: string, token: string) {
  return (
    '/galleries/' +
    encodeURIComponent(slug) +
    '/upload/?upload=' +
    encodeURIComponent(token)
  )
}
