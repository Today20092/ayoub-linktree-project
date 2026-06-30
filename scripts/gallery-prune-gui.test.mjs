import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  createOperationLock,
  discoverGalleries,
  validateSelection,
} from './gallery-prune-gui.mjs'

test('discovers event galleries and exposes only safe photo fields', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gallery-prune-gui-'))
  await mkdir(folder, { recursive: true })
  await writeFile(
    join(folder, 'event.mdx'),
    `---
title: Test Event
eventGallery: true
gallery:
  - src: https://photos.example.test/events/test/photo.jpg
    filename: photo.jpg
    alt: Test photo
    secret: hidden
---
`,
  )
  await writeFile(
    join(folder, 'regular.mdx'),
    `---
title: Regular
gallery: []
---
`,
  )

  assert.deepEqual(await discoverGalleries(folder), [
    {
      slug: 'event',
      title: 'Test Event',
      photos: [
        {
          filename: 'photo.jpg',
          src: 'https://photos.example.test/events/test/photo.jpg',
          alt: 'Test photo',
          width: null,
          height: null,
        },
      ],
    },
  ])
})

test('rejects invalid selections and confirmation text', () => {
  const galleries = [
    {
      slug: 'event',
      photos: [{ filename: 'one.jpg' }, { filename: 'two.jpg' }],
    },
  ]
  assert.throws(
    () =>
      validateSelection(galleries, 'event', ['missing.jpg'], 'PRUNE 1 PHOTOS'),
    /no longer valid/,
  )
  assert.throws(
    () => validateSelection(galleries, 'event', ['one.jpg'], 'yes'),
    /PRUNE 1 PHOTOS/,
  )
  assert.equal(
    validateSelection(galleries, 'event', ['one.jpg'], 'PRUNE 1 PHOTOS'),
    galleries[0],
  )
})

test('operation lock rejects concurrent work', () => {
  const lock = createOperationLock()
  assert.equal(lock.acquire(), true)
  assert.equal(lock.acquire(), false)
  lock.release()
  assert.equal(lock.acquire(), true)
})
