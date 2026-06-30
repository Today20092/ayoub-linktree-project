import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodeFaceImage,
  FaceTimeoutError,
  firstSuccessful,
  withTimeout,
} from './face-client'

test('tries analysis backends in order until one works', async () => {
  const attempted: string[] = []
  const result = await firstSuccessful([
    async () => {
      attempted.push('webgl')
      throw new Error('WebGL unavailable')
    },
    async () => {
      attempted.push('wasm')
      return 'wasm'
    },
    async () => {
      attempted.push('cpu')
      return 'cpu'
    },
  ])

  assert.equal(result, 'wasm')
  assert.deepEqual(attempted, ['webgl', 'wasm'])
})

test('times out a stalled face operation', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 1, 'Face analysis took too long.'),
    (error) =>
      error instanceof FaceTimeoutError &&
      error.message === 'Face analysis took too long.',
  )
})

test('falls back to browser image decoding', async () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap
  const originalImage = globalThis.Image
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  let revoked = false

  class MockImage {
    decoding = ''
    src = ''
    width = 100
    height = 100
    async decode() {}
  }

  globalThis.createImageBitmap = async () => {
    throw new Error('ImageBitmap unsupported')
  }
  globalThis.Image = MockImage as unknown as typeof Image
  URL.createObjectURL = () => 'blob:test'
  URL.revokeObjectURL = () => {
    revoked = true
  }

  try {
    const image = await decodeFaceImage(new File(['photo'], 'photo.jpg'))
    assert.equal('src' in image ? image.src : undefined, 'blob:test')
    assert.equal(revoked, true)
  } finally {
    globalThis.createImageBitmap = originalCreateImageBitmap
    globalThis.Image = originalImage
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  }
})
