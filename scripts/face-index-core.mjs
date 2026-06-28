import { createHash } from 'node:crypto'

export const EMBEDDING_DIMENSIONS = 1024
export const DEFAULT_THRESHOLD = 0.62
export const MAX_VECTOR_DIMENSIONS = 5_000_000
export const MEDOIDS_PER_CLUSTER = 3

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

function centroid(detections) {
  const values = Array(EMBEDDING_DIMENSIONS).fill(0)
  for (const detection of detections) {
    detection.embedding.forEach((value, index) => {
      values[index] += value
    })
  }
  return values.map((value) => value / detections.length)
}

export function clusterDetections(detections, threshold = DEFAULT_THRESHOLD) {
  const clusters = []

  for (const detection of [...detections].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    let bestCluster
    let bestScore = -1

    for (const cluster of clusters) {
      const scores = cluster.detections.map((candidate) =>
        cosineSimilarity(detection.embedding, candidate.embedding),
      )
      const minimumScore = Math.min(...scores)
      const averageScore =
        scores.reduce((total, score) => total + score, 0) / scores.length
      if (minimumScore >= threshold && averageScore > bestScore) {
        bestCluster = cluster
        bestScore = averageScore
      }
    }

    if (!bestCluster) {
      clusters.push({
        id: `person-${String(clusters.length + 1).padStart(4, '0')}`,
        hidden: false,
        detections: [detection],
        centroid: [...detection.embedding],
        representativeId: detection.id,
      })
      continue
    }

    bestCluster.detections.push(detection)
    bestCluster.centroid = centroid(bestCluster.detections)
  }

  return clusters
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

export function selectMedoids(cluster, limit = MEDOIDS_PER_CLUSTER) {
  const center = centroid(cluster.detections)
  return [...cluster.detections]
    .sort(
      (left, right) =>
        cosineSimilarity(right.embedding, center) -
          cosineSimilarity(left.embedding, center) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, limit)
}

export function mergeClusters(clusters, sourceId, targetId) {
  if (sourceId === targetId) return clusters
  const source = clusters.find((cluster) => cluster.id === sourceId)
  const target = clusters.find((cluster) => cluster.id === targetId)
  if (!source || !target) throw new Error('Unknown cluster')

  target.detections = [...target.detections, ...source.detections].sort(
    (left, right) => left.id.localeCompare(right.id),
  )
  target.centroid = centroid(target.detections)
  return clusters.filter((cluster) => cluster.id !== sourceId)
}

export function removeDetection(clusters, clusterId, detectionId) {
  const cluster = clusters.find((candidate) => candidate.id === clusterId)
  if (!cluster) throw new Error('Unknown cluster')
  cluster.detections = cluster.detections.filter(
    (detection) => detection.id !== detectionId,
  )
  if (cluster.detections.length > 0) {
    cluster.centroid = centroid(cluster.detections)
    if (cluster.representativeId === detectionId) {
      cluster.representativeId = cluster.detections[0].id
    }
  }
  return clusters.filter((candidate) => candidate.detections.length > 0)
}

export function createVersion(eventSlug, clusters) {
  const fingerprint = JSON.stringify(
    clusters.map((cluster) => [
      cluster.id,
      cluster.hidden,
      cluster.representativeId,
      cluster.detections.map((detection) => detection.id),
    ]),
  )
  return createHash('sha256')
    .update(`${eventSlug}:${fingerprint}`)
    .digest('hex')
    .slice(0, 12)
}

export function buildPublishedData(review, publicBaseUrl) {
  const clusters = review.clusters.filter(
    (cluster) => !cluster.hidden && cluster.detections.length > 0,
  )
  const version = createVersion(review.eventSlug, clusters)
  const namespace = `${review.eventSlug}:${version}`
  const vectors = []

  const publishedClusters = clusters.map((cluster) => {
    const representative =
      cluster.detections.find(
        (detection) => detection.id === cluster.representativeId,
      ) ?? cluster.detections[0]
    const medoids = selectMedoids(cluster)

    medoids.forEach((detection, index) => {
      const id = `${namespace}:${cluster.id}:${index + 1}`
      vectors.push({
        id,
        values: detection.embedding,
        namespace,
        metadata: { clusterId: cluster.id },
      })
    })

    return {
      id: cluster.id,
      representative: {
        src: `${publicBaseUrl.replace(/\/$/, '')}/${representative.filename}`,
        filename: representative.filename,
        bbox: representative.bbox,
      },
      filenames: [
        ...new Set(cluster.detections.map((detection) => detection.filename)),
      ].sort(),
    }
  })

  if (vectors.length * EMBEDDING_DIMENSIONS > MAX_VECTOR_DIMENSIONS) {
    throw new Error(
      `Publishing ${vectors.length} vectors exceeds the Vectorize free storage allowance.`,
    )
  }

  return {
    manifest: {
      eventSlug: review.eventSlug,
      version,
      namespace,
      model: '@vladmandic/human:faceres',
      dimensions: EMBEDDING_DIMENSIONS,
      threshold: review.threshold,
      vectorIds: vectors.map((vector) => vector.id),
      clusters: publishedClusters,
    },
    vectors,
  }
}
