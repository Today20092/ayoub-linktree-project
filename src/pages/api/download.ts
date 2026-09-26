import type { APIRoute } from 'astro'

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
    sourceUrl = new URL(source)
  } catch {
    return new Response('Invalid download URL', { status: 400 })
  }
  if (
    sourceUrl.protocol !== 'https:' ||
    sourceUrl.hostname !== PHOTO_HOST ||
    !sourceUrl.pathname.startsWith('/events/')
  ) {
    return new Response('Download URL is not allowed', { status: 400 })
  }

  const response = await fetch(sourceUrl)
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
