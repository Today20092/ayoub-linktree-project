import assert from 'node:assert/strict'
import test from 'node:test'
import {
  alignedSfaceTensor,
  decodeYunet,
  SFACE_LANDMARKS,
  similarityTransform,
  yunetInput,
} from './sface-core'

test('recovers scaled and rotated alignment without changing landmark order', () => {
  const source = SFACE_LANDMARKS.map(
    ([x, y]) =>
      [1.2 * x - 0.2 * y + 5, 0.2 * x + 1.2 * y - 3] as [number, number],
  )
  const [a, b, x, c, d, y] = similarityTransform(source)
  source.forEach(([sx, sy], i) => {
    assert.ok(Math.abs(a * sx + b * sy + x - SFACE_LANDMARKS[i][0]) < 1e-8)
    assert.ok(Math.abs(c * sx + d * sy + y - SFACE_LANDMARKS[i][1]) < 1e-8)
  })
  assert.throws(() => similarityTransform(Array(5).fill([1, 1])), /degenerate/)
})

test('uses raw RGB planes for SFace and BGR planes for YuNet', () => {
  const data = new Uint8Array(112 * 112 * 4)
  for (let i = 0; i < data.length; i += 4) data.set([17, 93, 201, 255], i)
  const image = { width: 112, height: 112, data }
  const input = alignedSfaceTensor(image, SFACE_LANDMARKS)
  assert.equal(input[0], 17)
  assert.equal(input[112 * 112], 93)
  assert.equal(input[2 * 112 * 112], 201)
  assert.deepEqual(
    Array.from(yunetInput({ width: 1, height: 1, data: data.slice(0, 4) })),
    [201, 93, 17],
  )
})

test('decodes YuNet confidence, landmarks and suppresses overlapping boxes', () => {
  const outputs: Record<string, Float32Array> = {}
  for (const stride of [8, 16, 32]) {
    const count = (32 / stride) ** 2
    outputs[`cls_${stride}`] = new Float32Array(count)
    outputs[`obj_${stride}`] = new Float32Array(count)
    outputs[`bbox_${stride}`] = new Float32Array(count * 4)
    outputs[`kps_${stride}`] = new Float32Array(count * 10)
  }
  outputs.cls_8[0] = outputs.obj_8[0] = 0.9
  outputs.cls_16[0] = outputs.obj_16[0] = 0.8
  outputs.bbox_8.set([1, 1, Math.log(2), Math.log(2)])
  outputs.bbox_16.set([0.5, 0.5, 0, 0])
  const faces = decodeYunet(outputs, 32)
  assert.equal(faces.length, 1)
  assert.ok(Math.abs(faces[0].score - 0.9) < 1e-6)
  assert.ok(
    faces[0].box.every(
      (value, i) => Math.abs(value - [0, 0, 16, 16][i]) < 1e-5,
    ),
  )
  assert.equal(faces[0].landmarks.length, 5)
  assert.throws(() => decodeYunet({}, 32), /Unexpected/)
})
