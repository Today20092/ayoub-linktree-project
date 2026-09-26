import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryMediaKey, readGalleryMedia } from '@/lib/gallery-media'

export const prerender = false

const PHOTO_HOST = 'photos.ayoubabed.xyz'

const safeFilename = (value: string) =>
  value.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'download'

const attachmentName = (filename: string) => {
  const fallback = safeFilename(filename).replace(/[^\x20-\x7E]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(
    safeFilename(filename),
  )}`
}

export const GET: APIRoute = async ({ url }) => {
  const source = url.searchParams.get('url')
  if (!source) return new Response('Missing download URL', { status: 400 })

  let sourceUrl: URL
  try {
    sourceUrl = new URL(source, url)
  } catch {
    return new Response('Invalid download URL', { status: 400 })
  }
  const local =
    sourceUrl.origin === url.origin && galleryMediaKey(sourceUrl.pathname)
  if (
    !local &&
    (sourceUrl.protocol !== 'https:' ||
      sourceUrl.hostname !== PHOTO_HOST ||
      !sourceUrl.pathname.startsWith('/events/'))
  ) {
    return new Response('Download URL is not allowed', { status: 400 })
  }

  const response = local
    ? await readGalleryMedia(env.GALLERY_PUBLIC, sourceUrl.pathname)
    : await fetch(sourceUrl)
  if (!response.ok || !response.body) {
    return new Response('Download unavailable', { status: response.status })
  }

  const filename =
    url.searchParams.get('filename') ??
    sourceUrl.pathname.split('/').pop() ??
    'download'
  const headers = new Headers({
    'content-disposition': attachmentName(filename),
    'content-type':
      response.headers.get('content-type') ?? 'application/octet-stream',
    'cache-control': 'private, max-age=0, must-revalidate',
  })
  const length = response.headers.get('content-length')
  if (length) headers.set('content-length', length)

  return new Response(response.body, { headers })
}
