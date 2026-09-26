import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acceptedGalleryImage,
  fittedGalleryDimensions,
  MAX_GALLERY_UPLOAD_BYTES,
  safeGalleryFilename,
} from './gallery-upload'

test('validates guest image type and size', () => {
  assert.equal(
    acceptedGalleryImage(
      new File(['image'], 'photo.heic', { type: 'image/heic' }),
    ),
    true,
  )
  assert.equal(acceptedGalleryImage(new File(['image'], 'photo.HEIC')), true)
  assert.equal(
    acceptedGalleryImage(
      new File(['image'], 'photo.txt', { type: 'text/plain' }),
    ),
    false,
  )
  assert.equal(
    acceptedGalleryImage(
      new File(
        [new Uint8Array(MAX_GALLERY_UPLOAD_BYTES + 1)],
        'too-large.jpg',
        { type: 'image/jpeg' },
      ),
    ),
    false,
  )
})

test('fits images inside 2400 pixels without upscaling', () => {
  assert.deepEqual(fittedGalleryDimensions(6000, 4000), {
    width: 2400,
    height: 1600,
  })
  assert.deepEqual(fittedGalleryDimensions(1200, 800), {
    width: 1200,
    height: 800,
  })
})

test('removes paths from submitted filenames', () => {
  assert.equal(safeGalleryFilename('C:\\fakepath\\photo.jpg'), 'photo.jpg')
  assert.equal(safeGalleryFilename('../../photo.jpg'), 'photo.jpg')
})
