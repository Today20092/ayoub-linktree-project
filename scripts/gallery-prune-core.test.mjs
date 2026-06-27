import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  createDeterministicZip,
  listZipEntries,
  objectKeyFromUrl,
  parseGalleryMdx,
  pruneGalleryMdx,
  resolvePhotoSelectors,
} from './gallery-prune-core.mjs'

const fixture = `---
galleryDescription: Browse all 4 approved photographs.
eventGallery: true
downloadAllUrl: https://photos.example/events/demo/downloads/demo.zip
gallery:
  - src: https://photos.example/events/demo/images/A1.jpg
    width: 2400
    height: 1600
    alt: One
    filename: A1.jpg
    featured: true
  - src: https://photos.example/events/demo/images/A2.jpg
    width: 1600
    height: 2400
    alt: Two
    filename: A2.jpg
    featured: false
  - src: https://photos.example/events/demo/images/A3.jpg
    width: 2400
    height: 1600
    alt: Three
    filename: A3.jpg
    featured: false
  - src: https://photos.example/events/demo/images/A4.jpg
    width: 2400
    height: 1600
    alt: Four
    filename: A4.jpg
    featured: false
---

Body remains.
`

const gallery = parseGalleryMdx(fixture).data.gallery

test('resolves mixed filename, position, and range selectors', () => {
  const result = resolvePhotoSelectors(gallery, ['A1.jpg', '2', '3-4'])
  assert.deepEqual(
    result.selected.map(({ photo }) => photo.filename),
    ['A1.jpg', 'A2.jpg', 'A3.jpg', 'A4.jpg'],
  )
})

test('rejects duplicate and invalid selectors', () => {
  assert.throws(
    () => resolvePhotoSelectors(gallery, ['1', 'A1.jpg']),
    /duplicate photo/,
  )
  assert.throws(() => resolvePhotoSelectors(gallery, ['5']), /outside 1-4/)
  assert.throws(() => resolvePhotoSelectors(gallery, ['4-2']), /descending/)
  assert.throws(() => resolvePhotoSelectors(gallery, ['nope']), /Unknown/)
})

test('treats missing filenames as idempotent selections', () => {
  const result = resolvePhotoSelectors(gallery, ['REMOVED.jpg'])
  assert.deepEqual(result.selected, [])
  assert.deepEqual(result.alreadyMissing, ['REMOVED.jpg'])
})

test('prunes YAML while retaining metadata and updating matching count', () => {
  const output = pruneGalleryMdx(fixture, [0, 2])
  const parsed = parseGalleryMdx(output)
  assert.equal(
    parsed.data.galleryDescription,
    'Browse all 2 approved photographs.',
  )
  assert.deepEqual(
    parsed.data.gallery.map(({ filename }) => filename),
    ['A2.jpg', 'A4.jpg'],
  )
  assert.equal(parsed.data.gallery[0].alt, 'Two')
  assert.match(output, /Body remains\./)
})

test('dry-run planning is pure and leaves input unchanged', () => {
  const original = fixture
  resolvePhotoSelectors(parseGalleryMdx(original).data.gallery, ['2'])
  assert.equal(fixture, original)
})

test('creates ZIP with deterministic sorted entries', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gallery-prune-test-'))
  try {
    const second = join(folder, 'P2.jpg')
    const tenth = join(folder, 'P10.jpg')
    const zipA = join(folder, 'a.zip')
    const zipB = join(folder, 'b.zip')
    await writeFile(second, 'second')
    await writeFile(tenth, 'tenth')
    await createDeterministicZip([tenth, second], zipA)
    await createDeterministicZip([second, tenth], zipB)
    assert.deepEqual(await listZipEntries(zipA), ['P2.jpg', 'P10.jpg'])
    assert.deepEqual(await readFile(zipA), await readFile(zipB))
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
})

test('extracts decoded R2 object key from public URL', () => {
  assert.equal(
    objectKeyFromUrl(
      'https://photos.example/events/demo/images/My%20Photo.jpg',
    ),
    'events/demo/images/My Photo.jpg',
  )
})
