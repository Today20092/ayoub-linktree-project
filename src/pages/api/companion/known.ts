import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import {
  companionAuthorized,
  companionJson,
  knownCompanionHashes,
} from '@/lib/gallery-companion'

export const prerender = false
export const POST: APIRoute = async ({ request }) => {
  if (!(await companionAuthorized(request, env.GALLERY_DB)))
    return companionJson({ error: 'Pair this device again.' }, 401)
  const reader = request.body?.getReader()
  if (!reader) return companionJson({ error: 'Missing checksums.' }, 400)
  let size = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 40_000) {
      await reader.cancel()
      return companionJson({ error: 'Too many checksums.' }, 413)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  let input: { gallery?: unknown; hashes?: unknown }
  try {
    input = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return companionJson({ error: 'Invalid request.' }, 400)
  }
  if (
    !input ||
    typeof input.gallery !== 'string' ||
    !Array.isArray(input.hashes) ||
    input.hashes.length > 500 ||
    input.hashes.some(
      (hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    return companionJson({ error: 'Invalid checksums.' }, 400)
  return companionJson({
    known: await knownCompanionHashes(
      env.GALLERY_DB,
      input.gallery,
      input.hashes,
    ),
  })
}
