import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createFaceAnalyzer,
  decodeFaceImage,
  FaceTimeoutError,
  firstSuccessful,
  withTimeout,
} from './face-client'

function detector(
  detect: () => Promise<{
    face: Array<{ embedding?: number[]; box: number[] }>
  }>,
) {
  return {
    load: async () => {},
    detect,
  }
}

test('falls back to WASM when WebGL cannot prepare', async () => {
  const attempted: string[] = []
  const analyzer = createFaceAnalyzer({
    decode: async () => ({ width: 10, height: 10, close() {} }) as ImageBitmap,
    backends: [
      {
        name: 'webgl',
        create: async () => {
          attempted.push('webgl')
          return {
            ...detector(async () => ({ face: [] })),
            load: async () => {
              throw new Error('WebGL unavailable')
            },
          }
        },
      },
      {
        name: 'wasm',
        create: async () => {
          attempted.push('wasm')
          return detector(async () => ({ face: [] }))
        },
      },
    ],
  })

  await analyzer.prepare()

  assert.deepEqual(attempted, ['webgl', 'wasm'])
})

test('retries detection with the fallback backend', async () => {
  const image = { width: 10, height: 10, close() {} } as ImageBitmap
  const analyzer = createFaceAnalyzer({
    decode: async () => image,
    backends: [
      {
        name: 'webgl',
        create: async () =>
          detector(async () => {
            throw new Error('WebGL detection failed')
          }),
      },
      {
        name: 'wasm',
        create: async () =>
          detector(async () => ({
            face: [{ embedding: Array(1024).fill(0.5), box: [1, 2, 3, 4] }],
          })),
      },
    ],
  })

  const result = await analyzer.analyze(new File(['photo'], 'photo.jpg'))

  assert.deepEqual(result?.faces[0].box, [1, 2, 3, 4])
  assert.equal(result?.image, image)
})

test('releases decoded images from stale analysis attempts', async () => {
  let finishFirstDecode: ((image: ImageBitmap) => void) | undefined
  let closed = 0
  const firstImage = {
    width: 10,
    height: 10,
    close: () => closed++,
  } as ImageBitmap
  const secondImage = { width: 10, height: 10, close() {} } as ImageBitmap
  let decodeCount = 0
  const analyzer = createFaceAnalyzer({
    decode: async () => {
      decodeCount++
      if (decodeCount === 1) {
        return new Promise<ImageBitmap>((resolve) => {
          finishFirstDecode = resolve
        })
      }
      return secondImage
    },
    backends: [
      {
        name: 'webgl',
        create: async () => detector(async () => ({ face: [] })),
      },
    ],
  })

  const stale = analyzer.analyze(new File(['first'], 'first.jpg'))
  const current = analyzer.analyze(new File(['second'], 'second.jpg'))
  finishFirstDecode?.(firstImage)

  assert.equal(await stale, undefined)
  assert.equal((await current)?.image, secondImage)
  assert.equal(closed, 1)
})

test('cancel releases the selected image and suppresses pending results', async () => {
  let closed = 0
  const image = {
    width: 10,
    height: 10,
    close: () => closed++,
  } as ImageBitmap
  const analyzer = createFaceAnalyzer({
    decode: async () => image,
    backends: [
      {
        name: 'webgl',
        create: async () => detector(async () => ({ face: [] })),
      },
    ],
  })

  const result = await analyzer.analyze(new File(['photo'], 'photo.jpg'))
  analyzer.cancel(result)

  assert.equal(closed, 1)
})

test('releases an image that finishes decoding after timeout', async () => {
  let finishDecode: ((image: ImageBitmap) => void) | undefined
  let closed = 0
  const analyzer = createFaceAnalyzer({
    analysisTimeout: 1,
    decode: async () =>
      new Promise<ImageBitmap>((resolve) => {
        finishDecode = resolve
      }),
    backends: [],
  })

  await assert.rejects(
    analyzer.analyze(new File(['photo'], 'photo.jpg')),
    FaceTimeoutError,
  )
  finishDecode?.({
    width: 10,
    height: 10,
    close: () => closed++,
  } as ImageBitmap)
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(closed, 1)
})

test('a retry resets the backend chain after both detectors fail', async () => {
  const attempts: string[] = []
  let retry = false
  const analyzer = createFaceAnalyzer({
    decode: async () => ({ width: 10, height: 10, close() {} }) as ImageBitmap,
    backends: ['webgl', 'wasm'].map((name) => ({
      name,
      create: async () => {
        attempts.push(name)
        return detector(async () => {
          if (!retry) throw new Error(`${name} detection failed`)
          return { face: [] }
        })
      },
    })),
  })

  await assert.rejects(analyzer.analyze(new File(['first'], 'first.jpg')))
  retry = true
  await analyzer.analyze(new File(['second'], 'second.jpg'))

  assert.deepEqual(attempts, ['webgl', 'wasm', 'webgl'])
})

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
