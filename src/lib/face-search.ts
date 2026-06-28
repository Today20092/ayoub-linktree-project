import type { FaceManifest } from './face-manifests'

export const FACE_EMBEDDING_DIMENSIONS = 1024
export const MAX_FACE_SEARCH_BODY_BYTES = 24_000

export async function readFaceSearchBody(request: Request) {
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_FACE_SEARCH_BODY_BYTES) {
    return { error: 'too-large' as const }
  }

  try {
    return { value: JSON.parse(text) as unknown }
  } catch {
    return { error: 'invalid-json' as const }
  }
}

export function parseFaceSearchRequest(
  value: unknown,
  manifests: Record<string, FaceManifest>,
) {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (
    typeof input.eventSlug !== 'string' ||
    typeof input.indexVersion !== 'string' ||
    !Array.isArray(input.embedding) ||
    input.embedding.length !== FACE_EMBEDDING_DIMENSIONS ||
    !input.embedding.every(
      (number) => typeof number === 'number' && Number.isFinite(number),
    )
  ) {
    return null
  }

  const manifest = manifests[input.eventSlug]
  if (!manifest || manifest.version !== input.indexVersion) return null

  return {
    embedding: input.embedding as number[],
    manifest,
  }
}

export function photoMatches(
  matches: Array<{ score?: number; metadata?: Record<string, unknown> }>,
  threshold: number,
) {
  const scores = new Map<string, number>()
  for (const match of matches) {
    const filename = match.metadata?.filename
    const score = match.score ?? -1
    if (
      typeof filename === 'string' &&
      score >= threshold &&
      score > (scores.get(filename) ?? -1)
    ) {
      scores.set(filename, score)
    }
  }

  return [...scores]
    .map(([filename, score]) => ({ filename, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 50)
}
