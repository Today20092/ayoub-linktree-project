export const GALLERY_MEDIA_PATH = '/api/gallery-media'
const LEGACY_ORIGIN = 'https://photos.ayoubabed.xyz'

export function galleryObjectUrl(key: string) {
  return `${GALLERY_MEDIA_PATH}/${key}/`
}

export function galleryImageUrl(
  src: string,
  width?: number,
  height?: number,
  quality?: number | string,
  fit?: string,
) {
  if (!galleryMediaKey(src)) return
  const params = new URLSearchParams({ href: src })
  if (width) params.set('w', String(width))
  if (height) params.set('h', String(height))
  if (quality) params.set('q', String(quality))
  if (fit) params.set('fit', fit)
  return `/_image/?${params}`
}

export function galleryThumbnailSrcset(
  src: string,
  width: number,
  height: number,
) {
  if (!galleryMediaKey(src)) return
  return [80, 160, 240, 480, 960]
    .map(
      (size) =>
        `${galleryImageUrl(src, size, Math.max(1, Math.round((height * size) / width)), 75)} ${size}w`,
    )
    .join(', ')
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
