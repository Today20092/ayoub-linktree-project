import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import {
  companionAuthorized,
  companionJson,
  contentHash,
  receiveCompanionPhoto,
} from '@/lib/gallery-companion'
import { galleryReader } from '@/lib/gallery-read'
import { MAX_GALLERY_UPLOAD_BYTES } from '@/lib/gallery-upload'

export const prerender = false
export const POST: APIRoute = async ({ request }) => {
  if (!(await companionAuthorized(request, env.GALLERY_DB)))
    return companionJson({ error: 'Pair this device again.' }, 401)
  const url = new URL(request.url)
  const slug = url.searchParams.get('gallery') ?? ''
  const hash = request.headers.get('x-content-sha256') ?? ''
  if (!/^[a-f0-9]{64}$/.test(hash))
    return companionJson({ error: 'Invalid photo checksum.' }, 400)
  const event = await galleryReader(env.GALLERY_DB).getAdmin(slug)
  if (!event) return companionJson({ error: 'Gallery not found.' }, 404)
  if (request.headers.get('content-type') !== 'image/jpeg')
    return companionJson({ error: 'Only JPEG photos are supported.' }, 415)
  const length = Number(request.headers.get('content-length'))
  if (length > MAX_GALLERY_UPLOAD_BYTES)
    return companionJson({ error: 'Photo exceeds 20 MB.' }, 413)
  // Read with a bound even when Content-Length is absent or incorrect.
  const reader = request.body?.getReader()
  if (!reader) return companionJson({ error: 'Missing photo.' }, 400)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_GALLERY_UPLOAD_BYTES) {
      await reader.cancel()
      return companionJson({ error: 'Photo exceeds 20 MB.' }, 413)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  if (
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    (await contentHash(bytes.buffer)) !== hash
  )
    return companionJson(
      { error: 'Photo changed or is not a JPEG. Scan again.' },
      400,
    )
  const file = new File(
    [bytes],
    url.searchParams.get('filename') || 'photo.jpg',
    { type: 'image/jpeg' },
  )
  return receiveCompanionPhoto(
    env,
    { id: slug, title: event.title },
    file,
    hash,
  )
}
