import assert from 'node:assert/strict'
import test from 'node:test'

import type { FaceManifest } from './face-manifests'
import { parseFaceSearchRequest, photoMatches } from './face-search'

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
