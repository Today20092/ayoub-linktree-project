import type { FaceManifest } from './face-manifests'

export const FACE_EMBEDDING_DIMENSIONS = 1024
export const MAX_FACE_SEARCH_BODY_BYTES = 24_000

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
    eventSlug: input.eventSlug,
    embedding: input.embedding as number[],
    manifest,
  }
}

export function candidateClusters(
  matches: Array<{ score?: number; metadata?: Record<string, unknown> }>,
  threshold: number,
) {
  const scores = new Map<string, number>()
  for (const match of matches) {
    const clusterId = match.metadata?.clusterId
    const score = match.score ?? -1
    if (
      typeof clusterId === 'string' &&
      score >= threshold &&
      score > (scores.get(clusterId) ?? -1)
    ) {
      scores.set(clusterId, score)
    }
  }

  return [...scores]
    .map(([clusterId, score]) => ({ clusterId, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
}
