import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

import { faceManifests } from '@/lib/face-manifests'
import {
  MAX_FACE_SEARCH_BODY_BYTES,
  parseFaceSearchRequest,
  photoMatches,
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

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_FACE_SEARCH_BODY_BYTES) {
    return json({ error: 'Request is too large.' }, 413)
  }

  const rateLimit = await env.FACE_SEARCH_RATE_LIMITER.limit({
    key: clientAddress,
  })
  if (!rateLimit.success) {
    return json({ error: 'Too many searches. Try again in a minute.' }, 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }

  const input = parseFaceSearchRequest(body, faceManifests)
  if (!input) {
    return json({ error: 'Invalid or unavailable face-search index.' }, 400)
  }

  const result = await env.VECTORIZE.query(input.embedding, {
    topK: 100,
    namespace: input.manifest.namespace,
    returnMetadata: 'all',
  })

  return json({
    matches: photoMatches(result.matches, input.manifest.threshold),
  })
}
