import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

import { faceManifests } from '@/lib/face-manifests'
import { getHiddenFilenames } from '@/lib/gallery-data'
import {
  MAX_FACE_SEARCH_BODY_BYTES,
  parseFaceSearchRequest,
  photoMatches,
  readFaceSearchBody,
} from '@/lib/face-search'

export const prerender = false

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })

export const POST: APIRoute = async ({ request }) => {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_FACE_SEARCH_BODY_BYTES) {
    return json({ error: 'Request is too large.' }, 413)
  }

  const clientAddress =
    request.headers.get('cf-connecting-ip') ?? 'local-development'
  const rateLimit = await env.FACE_SEARCH_RATE_LIMITER.limit({
    key: clientAddress,
  })
  if (!rateLimit.success) {
    return json({ error: 'Too many searches. Try again in a minute.' }, 429)
  }

  const parsedBody = await readFaceSearchBody(request)
  if ('error' in parsedBody) {
    return parsedBody.error === 'too-large'
      ? json({ error: 'Request is too large.' }, 413)
      : json({ error: 'Invalid JSON.' }, 400)
  }

  const input = parseFaceSearchRequest(parsedBody.value, faceManifests)
  if (!input) {
    return json({ error: 'Invalid or unavailable face-search index.' }, 400)
  }

  const result = await env.VECTORIZE.query(input.embedding, {
    topK: 50,
    namespace: input.manifest.namespace,
    returnMetadata: 'all',
  })
  const hiddenFilenames = await getHiddenFilenames(
    env.GALLERY_DB,
    input.manifest.eventSlug,
  )

  return json({
    matches: photoMatches(result.matches, input.manifest.threshold).filter(
      ({ filename }) => !hiddenFilenames.has(filename),
    ),
  })
}
