import type { FaceManifest } from './face-manifests'

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
    !input.embedding.every(
      (number) => typeof number === 'number' && Number.isFinite(number),
    )
  ) {
    return null
  }

  const manifest = manifests[input.eventSlug]
  if (
    !manifest ||
    manifest.version !== input.indexVersion ||
    input.embedding.length !== manifest.dimensions
  )
    return null
  if (
    (manifest.model === 'opencv/sface-2021dec-int8') !==
    (manifest.dimensions === 128)
  )
    return null

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
}

export async function queryFaceMatches(
  index: Pick<VectorizeIndex, 'query'>,
  manifest: FaceManifest,
  embedding: number[],
) {
  const querySize = 50
  if (manifest.searchMode !== 'range-v1') {
    const result = await index.query(embedding, {
      namespace: manifest.namespace,
      topK: querySize,
      returnMetadata: 'all',
    })
    return photoMatches(result.matches, manifest.threshold)
  }

  const pending = [{ start: 0, end: manifest.faceCount }]
  const matches: VectorizeMatches['matches'] = []
  while (pending.length > 0) {
    const ranges = pending.splice(0, 4)
    const results = await Promise.all(
      ranges.map(({ start, end }) =>
        index.query(embedding, {
          namespace: manifest.namespace,
          topK: querySize,
          returnMetadata: 'all',
          filter: { faceOrder: { $gte: start, $lt: end } },
        }),
      ),
    )
    for (const [i, result] of results.entries()) {
      matches.push(...result.matches)
      const { start, end } = ranges[i]
      // A full page of likely matches may hide more; smaller ranges expose them.
      if (
        end - start > querySize &&
        result.matches.length === querySize &&
        result.matches.every(({ score }) => score >= manifest.threshold)
      ) {
        const middle = Math.floor((start + end) / 2)
        pending.push({ start, end: middle }, { start: middle, end })
      }
    }
  }
  return photoMatches(matches, manifest.threshold)
}
