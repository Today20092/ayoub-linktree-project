export type SfacePixels = {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
}
export type Landmark = [number, number]
export type YunetFace = {
  box: [number, number, number, number]
  landmarks: Landmark[]
  score: number
}

export const SFACE_LANDMARKS: Landmark[] = [
  [Math.fround(38.2946), Math.fround(51.6963)],
  [Math.fround(73.5318), Math.fround(51.5014)],
  [Math.fround(56.0252), Math.fround(71.7366)],
  [Math.fround(41.5493), Math.fround(92.3655)],
  [Math.fround(70.7299), Math.fround(92.2041)],
]

export function similarityTransform(
  source: Landmark[],
  target = SFACE_LANDMARKS,
) {
  if (source.length !== 5 || !source.flat().every(Number.isFinite))
    throw new Error('Invalid face landmarks')
  const mean = (points: Landmark[], axis: number) =>
    points.reduce((sum, p) => sum + p[axis], 0) / points.length
  const sx = mean(source, 0),
    sy = mean(source, 1),
    tx = mean(target, 0),
    ty = mean(target, 1)
  let real = 0,
    imaginary = 0,
    energy = 0
  source.forEach(([x, y], i) => {
    const dx = x - sx,
      dy = y - sy
    real += dx * (target[i][0] - tx) + dy * (target[i][1] - ty)
    imaginary += dx * (target[i][1] - ty) - dy * (target[i][0] - tx)
    energy += dx * dx + dy * dy
  })
  if (energy < 1e-8) throw new Error('Face landmarks are degenerate')
  const a = real / energy,
    b = imaginary / energy
  if (a * a + b * b < 1e-12) throw new Error('Face alignment failed')
  return [a, -b, tx - a * sx + b * sy, b, a, ty - b * sx - a * sy]
}

export function alignedSfaceTensor(image: SfacePixels, landmarks: Landmark[]) {
  const [a, minusB, tx, b, , ty] = similarityTransform(landmarks)
  const denominator = a * a + b * b
  const plane = 112 * 112
  const tensor = new Float32Array(plane * 3)
  const pixel = (x: number, y: number, channel: number) =>
    x < 0 || y < 0 || x >= image.width || y >= image.height
      ? 0
      : image.data[(y * image.width + x) * 4 + channel]
  for (let y = 0; y < 112; y++)
    for (let x = 0; x < 112; x++) {
      // Match OpenCV's 10-bit affine rasterization and 1/32-pixel interpolation.
      const sx =
        Math.floor(
          (Math.round((a / denominator) * x * 1024) +
            Math.round(
              ((b / denominator) * y + (-a * tx - b * ty) / denominator) * 1024,
            ) +
            16) /
            32,
        ) / 32
      const sy =
        Math.floor(
          (Math.round((minusB / denominator) * x * 1024) +
            Math.round(
              ((a / denominator) * y + (b * tx - a * ty) / denominator) * 1024,
            ) +
            16) /
            32,
        ) / 32
      const left = Math.floor(sx),
        top = Math.floor(sy),
        fx = sx - left,
        fy = sy - top
      for (let channel = 0; channel < 3; channel++) {
        tensor[channel * plane + y * 112 + x] = Math.round(
          pixel(left, top, channel) * (1 - fx) * (1 - fy) +
            pixel(left + 1, top, channel) * fx * (1 - fy) +
            pixel(left, top + 1, channel) * (1 - fx) * fy +
            pixel(left + 1, top + 1, channel) * fx * fy,
        )
      }
    }
  return tensor
}

export function yunetInput(image: SfacePixels) {
  const plane = image.width * image.height
  const tensor = new Float32Array(plane * 3)
  for (let i = 0; i < plane; i++)
    for (let channel = 0; channel < 3; channel++) {
      tensor[channel * plane + i] = image.data[i * 4 + 2 - channel]
    }
  return tensor
}

function overlap(a: YunetFace, b: YunetFace) {
  const [x, y, w, h] = a.box.map(Math.trunc),
    [bx, by, bw, bh] = b.box.map(Math.trunc)
  const intersection =
    Math.max(0, Math.min(x + w, bx + bw) - Math.max(x, bx)) *
    Math.max(0, Math.min(y + h, by + bh) - Math.max(y, by))
  return intersection / Math.max(1, w * h + bw * bh - intersection)
}

export function decodeYunet(outputs: Record<string, Float32Array>, size = 640) {
  const faces: YunetFace[] = []
  for (const stride of [8, 16, 32]) {
    const cls = outputs[`cls_${stride}`],
      obj = outputs[`obj_${stride}`],
      bbox = outputs[`bbox_${stride}`],
      kps = outputs[`kps_${stride}`]
    const columns = size / stride
    if (!cls || !obj || !bbox || !kps || cls.length !== columns * columns)
      throw new Error('Unexpected detector output')
    for (let i = 0; i < cls.length; i++) {
      const score = Math.sqrt(
        Math.max(0, Math.min(1, cls[i])) * Math.max(0, Math.min(1, obj[i])),
      )
      if (score < 0.6) continue
      const column = i % columns,
        row = Math.floor(i / columns)
      const width = Math.exp(bbox[i * 4 + 2]) * stride,
        height = Math.exp(bbox[i * 4 + 3]) * stride
      const x = (column + bbox[i * 4]) * stride - width / 2,
        y = (row + bbox[i * 4 + 1]) * stride - height / 2
      const landmarks: Landmark[] = Array.from({ length: 5 }, (_, n) => [
        (kps[i * 10 + n * 2] + column) * stride,
        (kps[i * 10 + n * 2 + 1] + row) * stride,
      ])
      if (![x, y, width, height, ...landmarks.flat()].every(Number.isFinite))
        continue
      faces.push({ box: [x, y, width, height], landmarks, score })
    }
  }
  const selected: YunetFace[] = []
  for (const candidate of faces
    .sort((a, b) => b.score - a.score)
    .slice(0, 5000)) {
    if (selected.every((face) => overlap(face, candidate) <= 0.3))
      selected.push(candidate)
    if (selected.length === 10) break
  }
  return selected
}
