import { createHash } from 'node:crypto'

export const EMBEDDING_DIMENSIONS = 1024
export const DEFAULT_THRESHOLD = 0.62
export const MAX_VECTOR_DIMENSIONS = 5_000_000

export function cosineSimilarity(left, right) {
  if (left.length !== right.length || left.length === 0) return -1

  let dot = 0
  let leftMagnitude = 0
  let rightMagnitude = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftMagnitude += left[index] ** 2
    rightMagnitude += right[index] ** 2
  }

  const denominator = Math.sqrt(leftMagnitude * rightMagnitude)
  return denominator === 0 ? -1 : dot / denominator
}

export function calibrateThreshold(pairs) {
  if (pairs.length === 0) return DEFAULT_THRESHOLD

  const candidates = [...new Set(pairs.map((pair) => pair.similarity))].sort(
    (left, right) => left - right,
  )
  let best = { threshold: DEFAULT_THRESHOLD, f1: -1 }

  for (const threshold of candidates) {
    let truePositive = 0
    let falsePositive = 0
    let falseNegative = 0

    for (const pair of pairs) {
      const predicted = pair.similarity >= threshold
      if (predicted && pair.samePerson) truePositive += 1
      if (predicted && !pair.samePerson) falsePositive += 1
      if (!predicted && pair.samePerson) falseNegative += 1
    }

    const precision = truePositive / Math.max(1, truePositive + falsePositive)
    const recall = truePositive / Math.max(1, truePositive + falseNegative)
    const f1 =
      (2 * precision * recall) / Math.max(Number.EPSILON, precision + recall)

    if (f1 > best.f1 || (f1 === best.f1 && threshold > best.threshold)) {
      best = { threshold, f1 }
    }
  }

  return best.threshold
}

function indexedDetections(index) {
  const detections =
    index.detections ??
    index.clusters?.flatMap((cluster) => cluster.detections) ??
    []
  return [
    ...new Map(
      detections.map((detection) => [detection.id, detection]),
    ).values(),
  ]
}

export function buildPublishedData(index) {
  const detections = indexedDetections(index)
  if (detections.length === 0) throw new Error('No detected faces to publish.')

  for (const detection of detections) {
    if (
      detection.embedding?.length !== EMBEDDING_DIMENSIONS ||
      !detection.embedding.every(Number.isFinite)
    ) {
      throw new Error(`Invalid embedding for ${detection.id}`)
    }
  }

  const fingerprint = JSON.stringify(
    detections.map(({ id, filename }) => [id, filename]),
  )
  const version = createHash('sha256')
    .update(`${index.eventSlug}:${index.threshold}:${fingerprint}`)
    .digest('hex')
    .slice(0, 12)
  const namespace = `${index.eventSlug}:${version}`
  const vectors = detections.map((detection) => ({
    id: `${namespace}:${detection.id}`,
    values: detection.embedding,
    namespace,
    metadata: { filename: detection.filename },
  }))

  if (vectors.length * EMBEDDING_DIMENSIONS > MAX_VECTOR_DIMENSIONS) {
    throw new Error(
      `Publishing ${vectors.length} faces exceeds the Vectorize free storage allowance.`,
    )
  }

  return {
    manifest: {
      eventSlug: index.eventSlug,
      version,
      namespace,
      model: '@vladmandic/human:faceres',
      dimensions: EMBEDDING_DIMENSIONS,
      threshold: index.threshold,
      vectorIds: vectors.map((vector) => vector.id),
      faceCount: vectors.length,
      photoCount: new Set(detections.map(({ filename }) => filename)).size,
    },
    vectors,
  }
}

export function carryForwardVectorIds(manifest, previousManifest) {
  const currentIds = new Set(manifest.vectorIds)
  const staleVectorIds = [
    ...(previousManifest?.staleVectorIds ?? []),
    ...(previousManifest?.vectorIds ?? []),
  ].filter((id, index, ids) => !currentIds.has(id) && ids.indexOf(id) === index)

  return staleVectorIds.length === 0
    ? manifest
    : { ...manifest, staleVectorIds }
}
