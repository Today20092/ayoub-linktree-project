import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  buildPublishedData,
  calibrateThreshold,
  carryForwardVectorIds,
  cosineSimilarity,
} from './face-index-core.mjs'

const vector = (first, second = 0) => [first, second, ...Array(1022).fill(0)]
const detection = (id, embedding, filename = `${id}.jpg`) => ({
  id,
  filename,
  embedding,
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
  assert.equal(cosineSimilarity(vector(1), vector(1)), 1)
})

test('publishes every detected face without identity clusters', () => {
  const { manifest, vectors } = buildPublishedData({
    eventSlug: 'event',
    threshold: 0.62,
    detections: [
      detection('one-1', vector(1), 'one.jpg'),
      detection('two-1', vector(0, 1), 'two.jpg'),
    ],
  })

  assert.equal(vectors.length, 2)
  assert.deepEqual(vectors[0].metadata, { filename: 'one.jpg', faceOrder: 0 })
  assert.deepEqual(vectors[1].metadata, { filename: 'two.jpg', faceOrder: 1 })
  assert.equal(manifest.searchMode, 'range-v1')
  const legacyVersion = createHash('sha256')
    .update(
      'event:0.62:' +
        JSON.stringify([
          ['one-1', 'one.jpg'],
          ['two-1', 'two.jpg'],
        ]),
    )
    .digest('hex')
    .slice(0, 12)
  assert.notEqual(manifest.version, legacyVersion)
  assert.equal(manifest.faceCount, 2)
  assert.equal(manifest.photoCount, 2)
  assert.equal(JSON.stringify(manifest).includes('embedding'), false)
  assert.equal(JSON.stringify(manifest).includes('cluster'), false)
})

test('accepts the previous review file for one-time migration', () => {
  const { vectors } = buildPublishedData({
    eventSlug: 'event',
    threshold: 0.62,
    clusters: [
      {
        detections: [detection('one-1', vector(1), 'one.jpg')],
      },
    ],
  })

  assert.equal(vectors.length, 1)
})

test('retains old vector ids so event deletion remains complete', () => {
  assert.deepEqual(
    carryForwardVectorIds(
      { vectorIds: ['current'] },
      { vectorIds: ['previous'], staleVectorIds: ['older', 'previous'] },
    ),
    {
      vectorIds: ['current'],
      staleVectorIds: ['older', 'previous'],
    },
  )
})
