import assert from 'node:assert/strict'
import test from 'node:test'

import type { FaceManifest } from './face-manifests'
import { candidateClusters, parseFaceSearchRequest } from './face-search'

const manifest: FaceManifest = {
  eventSlug: 'event',
  version: 'version-1',
  namespace: 'event:version-1',
  model: '@vladmandic/human:faceres',
  dimensions: 1024,
  threshold: 0.7,
  vectorIds: [],
  clusters: [],
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

test('deduplicates medoids, applies threshold, and limits candidates', () => {
  assert.deepEqual(
    candidateClusters(
      [
        { score: 0.8, metadata: { clusterId: 'a' } },
        { score: 0.9, metadata: { clusterId: 'a' } },
        { score: 0.85, metadata: { clusterId: 'b' } },
        { score: 0.69, metadata: { clusterId: 'c' } },
        { score: 0.82, metadata: { clusterId: 'd' } },
        { score: 0.81, metadata: { clusterId: 'e' } },
      ],
      0.7,
    ),
    [
      { clusterId: 'a', score: 0.9 },
      { clusterId: 'b', score: 0.85 },
      { clusterId: 'd', score: 0.82 },
    ],
  )
})
