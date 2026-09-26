export const GALLERY_MEDIA_PATH = '/api/gallery-media'
const LEGACY_ORIGIN = 'https://photos.ayoubabed.xyz'

export function galleryObjectUrl(key: string) {
  return `${GALLERY_MEDIA_PATH}/${key}`
}

export function galleryMediaKey(path: string) {
  const key = path.startsWith(`${GALLERY_MEDIA_PATH}/`)
    ? path.slice(GALLERY_MEDIA_PATH.length + 1).replace(/\/$/, '')
    : ''
  return /^events\/[a-z0-9-]+\/(?:(?:photos|guest)\/[a-zA-Z0-9-]+\.jpg|flyer\.jpg)$/.test(
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

export async function readGalleryMedia(bucket: R2Bucket, path: string) {
  const key = galleryMediaKey(path)
  if (!key) return new Response('Not found', { status: 404 })
  const object = await bucket.get(key)
  if (!object) return new Response('Not found', { status: 404 })
  const headers = new Headers({
    'content-type': 'image/jpeg',
    'cache-control': 'public, max-age=300',
    'x-content-type-options': 'nosniff',
    etag: object.httpEtag,
    'content-length': String(object.size),
  })
  return new Response(object.body, { headers })
}

export async function transformGalleryMedia(
  bucket: R2Bucket,
  images: ImagesBinding,
  url: URL,
) {
  const params = url.searchParams
  const source = await readGalleryMedia(bucket, params.get('href') ?? '')
  if (!source.ok || !source.body) return source
  const dimension = (key: string) => {
    const value = Number(params.get(key))
    return Number.isInteger(value) && value > 0
      ? Math.min(value, 2400)
      : undefined
  }
  const response = (
    await images
      .input(source.body)
      .transform({
        width: dimension('w'),
        height: dimension('h'),
        fit: params.get('fit') === 'contain' ? 'contain' : 'cover',
      })
      .output({
        format: 'image/webp',
        quality: Math.min(100, Math.max(1, Number(params.get('q')) || 85)),
      })
  ).response()
  const headers = new Headers(response.headers)
  headers.set('cache-control', 'public, max-age=300')
  return new Response(response.body, { status: response.status, headers })
}
