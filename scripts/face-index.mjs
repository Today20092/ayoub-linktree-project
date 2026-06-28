import { createServer } from 'node:http'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import sharp from 'sharp'

import { calibrateThreshold, DEFAULT_THRESHOLD } from './face-index-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const eventSlug = option('--event')
const photosDirectory = option('--photos')
const labelsPath = option('--labels')

if (!eventSlug || !photosDirectory || !/^[a-z0-9-]+$/.test(eventSlug)) {
  console.error(
    'Usage: npm run faces:index -- --event <slug> --photos <folder> [--labels <pairs.json>]',
  )
  process.exit(1)
}

const sourceDirectory = resolve(photosDirectory)
const workspace = resolve(root, '.face-index', eventSlug)
const indexPath = resolve(workspace, 'faces.json')
await mkdir(workspace, { recursive: true })
const modelDirectory = resolve(root, 'node_modules/@vladmandic/human/models')
const modelFiles = new Set([
  'blazeface.json',
  'blazeface.bin',
  'facemesh.json',
  'facemesh.bin',
  'faceres.json',
  'faceres.bin',
])
const modelServer = createServer(async (request, response) => {
  const filename = basename(request.url ?? '')
  if (!modelFiles.has(filename)) {
    response.statusCode = 404
    response.end('Not found')
    return
  }
  response.setHeader(
    'content-type',
    filename.endsWith('.json')
      ? 'application/json'
      : 'application/octet-stream',
  )
  response.end(await readFile(resolve(modelDirectory, filename)))
})
await new Promise((ready) => modelServer.listen(0, '127.0.0.1', ready))
const modelAddress = modelServer.address()
if (!modelAddress || typeof modelAddress === 'string') {
  throw new Error('Could not start the local model server')
}
const Human = await import(
  pathToFileURL(
    resolve(root, 'node_modules/@vladmandic/human/dist/human.node-wasm.js'),
  ).href
)
const human = new Human.default.Human({
  backend: 'wasm',
  modelBasePath: `http://127.0.0.1:${modelAddress.port}/models/`,
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: {
      enabled: true,
      maxDetected: 100,
      rotation: true,
      minConfidence: 0.35,
    },
    mesh: { enabled: true },
    description: { enabled: true },
    emotion: { enabled: false },
    iris: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
})

await sharp({
  create: { width: 1, height: 1, channels: 3, background: '#000' },
})
  .jpeg()
  .toFile(resolve(workspace, '.ready.jpg'))
await human.tf.ready()
await human.load()

const filenames = (await readdir(sourceDirectory))
  .filter((filename) =>
    ['.jpg', '.jpeg', '.png', '.webp'].includes(
      extname(filename).toLowerCase(),
    ),
  )
  .sort()
const detections = []

for (const [photoIndex, filename] of filenames.entries()) {
  const inputPath = resolve(sourceDirectory, filename)
  const resized = await sharp(inputPath)
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer()
  const { data, info } = await sharp(resized)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tensor = human.tf.tensor(
    new Uint8Array(data),
    [1, info.height, info.width, info.channels],
    'int32',
  )
  const result = await human.detect(tensor)
  human.tf.dispose(tensor)

  for (const [faceIndex, face] of result.face.entries()) {
    if (!face.embedding || face.embedding.length !== 1024) continue
    const id = `${basename(filename, extname(filename))}-${faceIndex + 1}`

    detections.push({
      id,
      filename,
      embedding: [...face.embedding],
    })
  }

  console.log(
    `[${photoIndex + 1}/${filenames.length}] ${filename}: ${result.face.length} face(s)`,
  )
}

let threshold = DEFAULT_THRESHOLD
if (labelsPath) {
  const labels = JSON.parse(await readFile(resolve(labelsPath), 'utf8'))
  const byId = new Map(detections.map((detection) => [detection.id, detection]))
  const pairs = labels.map((pair) => {
    if (typeof pair.similarity === 'number') return pair
    const left = byId.get(pair.leftId)
    const right = byId.get(pair.rightId)
    if (!left || !right) {
      throw new Error(
        `Unknown calibration pair: ${pair.leftId}, ${pair.rightId}`,
      )
    }
    let dot = 0
    let leftMagnitude = 0
    let rightMagnitude = 0
    left.embedding.forEach((value, index) => {
      dot += value * right.embedding[index]
      leftMagnitude += value ** 2
      rightMagnitude += right.embedding[index] ** 2
    })
    return {
      similarity: dot / Math.sqrt(leftMagnitude * rightMagnitude),
      samePerson: pair.samePerson,
    }
  })
  threshold = calibrateThreshold(pairs)
  console.log(`Calibrated threshold: ${threshold.toFixed(4)}`)
} else {
  console.warn(
    `Using default threshold ${DEFAULT_THRESHOLD}. Add --labels for pilot calibration.`,
  )
}

const index = {
  eventSlug,
  sourceDirectory,
  threshold,
  detections,
}
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`)

modelServer.close()
console.log(`Indexed ${detections.length} faces at ${indexPath}`)
