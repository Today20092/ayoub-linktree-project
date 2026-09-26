import assert from 'node:assert/strict'
import test from 'node:test'
import {
  publicGalleryPhoto,
  publicEventCover,
  type GalleryPhoto,
  type EventGallery,
} from './gallery-data'
import {
  galleryMediaKey,
  galleryMediaUrl,
  readGalleryMedia,
  transformGalleryMedia,
} from './gallery-media'

test('uploaded thumbnails transform R2 bytes without looking in static assets', async () => {
  let options: unknown
  const bucket = {
    get: async () => ({
      body: new Blob(['jpeg']).stream(),
      size: 4,
      httpEtag: '"test"',
    }),
  } as unknown as R2Bucket
  const images = {
    input: (stream: ReadableStream) => {
      assert.ok(stream)
      return {
        transform: (value: unknown) => {
          options = value
          return {
            output: async () => ({
              response: () =>
                new Response('webp', {
                  headers: { 'content-type': 'image/webp' },
                }),
            }),
          }
        },
      }
    },
  } as unknown as ImagesBinding
  const response = await transformGalleryMedia(
    bucket,
    images,
    new URL(
      'https://preview.example/_image/?href=/api/gallery-media/events/test/photos/photo.jpg&w=960&h=640&fit=cover',
    ),
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  assert.deepEqual(options, { width: 960, height: 640, fit: 'cover' })
})

test('uploaded photos and saved covers resolve against their own environment', async () => {
  const key =
    'events/test-uploads/photos/23c92763-382f-42af-88c2-e816824f30c2.jpg'
  const photo = publicGalleryPhoto({
    id: 'photo',
    object_key: key,
  } as GalleryPhoto)
  assert.equal(photo.src, `/api/gallery-media/${key}`)
  const cover = publicEventCover({
    cover_src: `https://photos.ayoubabed.xyz/${key}`,
    cover_width: 1200,
    cover_height: 800,
  } as EventGallery)
  assert.equal(cover?.src, photo.src)
  const requested: string[] = []
  const bucket = {
    get: async (objectKey: string) => {
      requested.push(objectKey)
      return {
        body: new Uint8Array([255, 216, 255]),
        size: 3,
        httpEtag: '"test"',
      }
    },
  } as unknown as R2Bucket
  const response = await readGalleryMedia(bucket, photo.src)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([255, 216, 255]),
  )
  assert.deepEqual(requested, [key])
  assert.equal(
    galleryMediaUrl('https://photos.ayoubabed.xyz/events/legacy/web/photo.jpg'),
    'https://photos.ayoubabed.xyz/events/legacy/web/photo.jpg',
  )
})

test('public media never reads pending files or arbitrary object keys', async () => {
  const bucket = {
    get: async () => {
      throw new Error('Must not access storage')
    },
  } as unknown as R2Bucket
  for (const path of [
    '/api/gallery-media/pending/event/photo.jpg',
    '/api/gallery-media/events/test/../secret',
    '/api/gallery-media/events/test/photos/photo.svg',
  ]) {
    assert.equal(galleryMediaKey(path), undefined)
    assert.equal((await readGalleryMedia(bucket, path)).status, 404)
  }
  assert.equal(
    (
      await readGalleryMedia(
        { get: async () => null } as unknown as R2Bucket,
        '/api/gallery-media/events/test/photos/missing.jpg',
      )
    ).status,
    404,
  )
})
