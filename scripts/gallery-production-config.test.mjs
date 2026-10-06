import assert from 'node:assert/strict'
import test from 'node:test'
import { productionGalleryConfig } from './gallery-production-config.mjs'

test('production release replaces generated preview bindings without changing source config', () => {
  const source = {
    name: 'preview',
    d1_databases: [
      {
        binding: 'GALLERY_DB',
        database_name: 'ayoub-gallery-data-preview',
        database_id: '78b0eec4-1c28-497b-b6dd-699aedd8a8fc',
      },
    ],
    r2_buckets: [
      {
        binding: 'GALLERY_PUBLIC',
        bucket_name: 'alphabravomedia-galleries-preview',
      },
      {
        binding: 'GALLERY_PENDING',
        bucket_name: 'alphabravomedia-gallery-uploads-preview',
      },
    ],
    assets: { directory: './client' },
    env: { preview: {} },
    previews: {},
  }
  const config = productionGalleryConfig(source)
  assert.equal(config.name, 'ayoub-linktree-project')
  assert.equal(
    config.d1_databases[0].database_id,
    '30b7489f-2cf5-441a-9c62-a479df0822fe',
  )
  assert.deepEqual(
    config.r2_buckets.map((bucket) => bucket.bucket_name),
    ['alphabravomedia-galleries', 'alphabravomedia-gallery-uploads'],
  )
  assert.equal(config.env, undefined)
  assert.equal(config.previews, undefined)
  assert.deepEqual(config.assets, source.assets)
  assert.equal(
    source.d1_databases[0].database_name,
    'ayoub-gallery-data-preview',
  )
})
test('unexpected binding topology stops production deployment', () => {
  assert.throws(
    () => productionGalleryConfig({}),
    /Unexpected gallery bindings/,
  )
  assert.throws(
    () =>
      productionGalleryConfig({
        d1_databases: [{ binding: 'OTHER' }],
        r2_buckets: [],
      }),
    /Unexpected gallery bindings/,
  )
})
