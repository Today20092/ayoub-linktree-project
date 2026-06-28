import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPublishedData,
  calibrateThreshold,
  clusterDetections,
  cosineSimilarity,
  mergeClusters,
  removeDetection,
} from './face-index-core.mjs'
import { createFaceReviewPage } from './face-review-page.mjs'

const vector = (first, second = 0) => [first, second, ...Array(1022).fill(0)]
const detection = (id, embedding, filename = `${id}.jpg`) => ({
  id,
  filename,
  embedding,
  bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  cropUrl: `/crops/${id}.jpg`,
})

test('clusters deterministically and supports review corrections', () => {
  let clusters = clusterDetections(
    [
      detection('b', vector(0.99, 0.01)),
      detection('a', vector(1)),
      detection('c', vector(0, 1)),
    ],
    0.9,
  )
  assert.equal(clusters.length, 2)
  assert.deepEqual(
    clusters[0].detections.map(({ id }) => id),
    ['a', 'b'],
  )

  removeDetection(clusters, clusters[0].id, 'b')
  assert.equal(clusters[0].detections.length, 1)
  clusters = mergeClusters(clusters, clusters[1].id, clusters[0].id)
  assert.equal(clusters.length, 1)
})

test('does not merge people through a chain of partial similarities', () => {
  const angledVector = (degrees) => {
    const radians = (degrees * Math.PI) / 180
    return vector(Math.cos(radians), Math.sin(radians))
  }
  const clusters = clusterDetections(
    [
      detection('a', angledVector(0)),
      detection('b', angledVector(50)),
      detection('c', angledVector(100)),
    ],
    0.5,
  )

  assert.equal(clusters.length, 2)
  assert.deepEqual(
    clusters[0].detections.map(({ id }) => id),
    ['a', 'b'],
  )
  assert.deepEqual(
    clusters[1].detections.map(({ id }) => id),
    ['c'],
  )
})

test('calibrates the balanced threshold by F1 score', () => {
  assert.equal(
    calibrateThreshold([
      { similarity: 0.9, samePerson: true },
      { similarity: 0.8, samePerson: true },
      { similarity: 0.7, samePerson: false },
    ]),
    0.8,
  )
})

test('builds a static manifest without embeddings', () => {
  const clusters = clusterDetections(
    [detection('a', vector(1), 'one.jpg')],
    0.5,
  )
  const { manifest, vectors } = buildPublishedData(
    { eventSlug: 'event', threshold: 0.5, clusters },
    'https://photos.example/events/event/images',
  )

  assert.equal(vectors[0].values.length, 1024)
  assert.equal(manifest.clusters[0].filenames[0], 'one.jpg')
  assert.equal(JSON.stringify(manifest).includes('embedding'), false)
  assert.equal(cosineSimilarity(vector(1), vector(1)), 1)
})

test('review page explains every correction action', () => {
  const page = createFaceReviewPage()
  assert.match(page, /Could these be the same person/)
  assert.match(page, /Different people/)
  assert.match(page, /Same person/)
  assert.match(page, /review\.rejectedPairs/)
  assert.doesNotMatch(page, /draggable=/)
})
