export const GALLERY_MEDIA_PATH = '/api/gallery-media'
const LEGACY_ORIGIN = 'https://photos.ayoubabed.xyz'

export function galleryObjectUrl(key: string) {
  return `${GALLERY_MEDIA_PATH}/${key}/`
}

export function galleryMediaKey(path: string) {
  const key = path.startsWith(`${GALLERY_MEDIA_PATH}/`)
    ? path.slice(GALLERY_MEDIA_PATH.length + 1).replace(/\/$/, '')
    : ''
  return /^events\/[a-z0-9-]+\/(?:(?:photos|guest)\/[a-zA-Z0-9-]+\.jpg|flyer(?:-[a-zA-Z0-9-]+)?\.jpg)$/.test(
    key,
  )
    ? key
    : undefined
}

// Stored covers from older releases used the production CDN, even in preview.
// Static manifest photos keep their original CDN URLs.
export function galleryMediaUrl(src: string, site?: string) {
  if (site) {
    try {
      const url = new URL(src, site)
      const key = galleryMediaKey(url.pathname)
      if (url.origin === new URL(site).origin && key)
        return galleryObjectUrl(key)
    } catch {
      return src
    }
  }
  if (!src.startsWith(`${LEGACY_ORIGIN}/`)) return src
  const path = galleryObjectUrl(src.slice(LEGACY_ORIGIN.length + 1))
  return galleryMediaKey(path) ? path : src
}
