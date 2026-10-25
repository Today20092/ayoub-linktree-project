import assert from 'node:assert/strict'
import test from 'node:test'

import type { FaceManifest } from './face-manifests'
import {
  MAX_FACE_SEARCH_BODY_BYTES,
  parseFaceSearchRequest,
  photoMatches,
  queryFaceMatches,
  readFaceSearchBody,
} from './face-search'

const manifest: FaceManifest = {
  eventSlug: 'event',
  version: 'version-1',
  namespace: 'event:version-1',
  model: '@vladmandic/human:faceres',
  dimensions: 1024,
  threshold: 0.62,
  vectorIds: [],
  faceCount: 2,
  photoCount: 2,
}
const manifests = { event: manifest }

test('requires the descriptor dimensions of the selected model', () => {
  const sface: FaceManifest = {
    ...manifest,
    model: 'opencv/sface-2021dec-int8',
    dimensions: 128,
  }
  const input = {
    eventSlug: 'event',
    indexVersion: manifest.version,
    embedding: Array(128).fill(0.1),
  }
  assert.equal(parseFaceSearchRequest(input, { event: sface })?.manifest, sface)
  assert.equal(parseFaceSearchRequest(input, manifests), null)
  assert.equal(
    parseFaceSearchRequest(
      { ...input, embedding: Array(1024).fill(0.1) },
      { event: sface },
    ),
    null,
  )
  assert.equal(
    parseFaceSearchRequest(
      { ...input, embedding: [Infinity, ...Array(127).fill(0)] },
      { event: sface },
    ),
    null,
  )
})

test('rejects malformed embeddings and unavailable versions', () => {
  assert.equal(parseFaceSearchRequest({}, manifests), null)
  assert.equal(
    parseFaceSearchRequest(
      {
        eventSlug: 'event',
        indexVersion: 'old',
        embedding: Array(1024).fill(0),
      },
      manifests,
    ),
    null,
  )
  assert.equal(
    parseFaceSearchRequest(
      {
        eventSlug: 'event',
        indexVersion: 'version-1',
        embedding: [Number.NaN, ...Array(1023).fill(0)],
      },
      manifests,
    ),
    null,
  )
})

test('accepts a finite 1024-value embedding', () => {
  const result = parseFaceSearchRequest(
    {
      eventSlug: 'event',
      indexVersion: 'version-1',
      embedding: Array(1024).fill(0.1),
    },
    manifests,
  )
  assert.equal(result?.manifest, manifest)
})

test('deduplicates photos, applies threshold, and ranks by score', () => {
  assert.deepEqual(
    photoMatches(
      [
        { score: 0.8, metadata: { filename: 'one.jpg' } },
        { score: 0.9, metadata: { filename: 'one.jpg' } },
        { score: 0.85, metadata: { filename: 'two.jpg' } },
        { score: 0.61, metadata: { filename: 'three.jpg' } },
      ],
      0.62,
    ),
    [
      { filename: 'one.jpg', score: 0.9 },
      { filename: 'two.jpg', score: 0.85 },
    ],
  )
})

test('bounds the actual request body even without content-length', async () => {
  const oversized = new Request('https://example.test', {
    method: 'POST',
    body: 'x'.repeat(MAX_FACE_SEARCH_BODY_BYTES + 1),
  })
  oversized.headers.delete('content-length')
  assert.deepEqual(await readFaceSearchBody(oversized), { error: 'too-large' })

  assert.deepEqual(
    await readFaceSearchBody(
      new Request('https://example.test', { method: 'POST', body: '{' }),
    ),
    { error: 'invalid-json' },
  )
})

test('retrieves more than 50 photos despite duplicate face hits and bounds concurrency', async () => {
  const faces = Array.from({ length: 360 }, (_, i) => ({
    id: String(i),
    score: 0.99 - Math.floor(i / 3) * 0.001,
    metadata: { filename: `photo-${Math.floor(i / 3)}.jpg`, faceOrder: i },
  }))
  let active = 0
  let maximumActive = 0
  let queries = 0
  const index: Pick<VectorizeIndex, 'query'> = {
    async query(_embedding, options) {
      assert.equal(options?.namespace, manifest.namespace)
      assert.equal(options?.topK, 50)
      const range = options?.filter?.faceOrder
      assert(
        range && typeof range === 'object' && '$gte' in range && '$lt' in range,
      )
      assert.equal(typeof range.$gte, 'number')
      assert.equal(typeof range.$lt, 'number')
      const start = Number(range.$gte)
      const end = Number(range.$lt)
      active++
      queries++
      maximumActive = Math.max(maximumActive, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active--
      const matches = faces
        .filter(
          (face) =>
            face.metadata.faceOrder >= start && face.metadata.faceOrder < end,
        )
        .slice(0, options.topK)
      return { count: matches.length, matches }
    },
  }
  const result = await queryFaceMatches(
    index,
    { ...manifest, faceCount: 360, searchMode: 'range-v1' },
    Array(1024).fill(0.1),
  )
  assert.equal(result.length, 120)
  assert.deepEqual(
    result.map(({ filename }) => filename),
    Array.from({ length: 120 }, (_, i) => `photo-${i}.jpg`),
  )
  assert(maximumActive <= 4)
  assert(queries > 1 && queries <= 15)
})

test('stops subdividing when the returned scores fall below threshold', async () => {
  let queries = 0
  const result = await queryFaceMatches(
    {
      async query() {
        queries++
        const matches = Array.from({ length: 50 }, (_, i) => ({
          id: String(i),
          score: i === 0 ? 0.9 : 0.4,
          metadata: { filename: `${i}.jpg` },
        }))
        return { count: 50, matches }
      },
    },
    { ...manifest, faceCount: 2000, searchMode: 'range-v1' },
    Array(1024).fill(0.1),
  )
  assert.equal(queries, 1)
  assert.deepEqual(result, [{ filename: '0.jpg', score: 0.9 }])
})

test('keeps existing manifests searchable and fails instead of returning incomplete results', async () => {
  const index: Pick<VectorizeIndex, 'query'> = {
    async query(_embedding, options) {
      assert.equal(options?.filter, undefined)
      return {
        count: 1,
        matches: [{ id: 'one', score: 0.9, metadata: { filename: 'one.jpg' } }],
      }
    },
  }
  assert.deepEqual(
    await queryFaceMatches(index, manifest, Array(1024).fill(0.1)),
    [{ filename: 'one.jpg', score: 0.9 }],
  )
  await assert.rejects(
    queryFaceMatches(
      {
        async query() {
          throw new Error('Vectorize unavailable')
        },
      },
      { ...manifest, searchMode: 'range-v1' },
      Array(1024).fill(0.1),
    ),
    /Vectorize unavailable/,
  )
})
