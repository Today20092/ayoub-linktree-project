import { execFileSync } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildPublishedData,
  carryForwardVectorIds,
} from './face-index-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const eventSlug = option('--event')
const indexOption = option('--index')
const thresholdOption = option('--threshold')
const upload = !args.includes('--no-upload')

if (!eventSlug || !/^[a-z0-9-]+$/.test(eventSlug)) {
  console.error(
    'Usage: npm run faces:publish -- --event <slug> [--index <faces.json>] [--threshold <0-1>] [--no-upload]',
  )
  process.exit(1)
}

let indexPath = resolve(
  indexOption ?? resolve(root, '.face-index', eventSlug, 'faces.json'),
)
if (!indexOption) {
  try {
    await access(indexPath)
  } catch {
    indexPath = resolve(root, '.face-index', eventSlug, 'review.json')
  }
}
const faceIndex = JSON.parse(await readFile(indexPath, 'utf8'))
if (faceIndex.eventSlug !== eventSlug) {
  throw new Error('Face index event does not match --event')
}
if (thresholdOption !== undefined) {
  const threshold = Number(thresholdOption)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('--threshold must be a number from 0 to 1')
  }
  faceIndex.threshold = threshold
}

const published = buildPublishedData(faceIndex)
const vectors = published.vectors
const workDirectory = resolve(root, '.face-index', eventSlug)
const manifestDirectory = resolve(root, 'src/data/face-galleries')
const manifestPath = resolve(manifestDirectory, `${eventSlug}.json`)
let previousManifest
try {
  previousManifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const manifest = carryForwardVectorIds(published.manifest, previousManifest)
const vectorsPath = resolve(workDirectory, `${manifest.version}.ndjson`)
await mkdir(manifestDirectory, { recursive: true })
await mkdir(workDirectory, { recursive: true })
await writeFile(
  vectorsPath,
  `${vectors.map((vector) => JSON.stringify(vector)).join('\n')}\n`,
)

if (upload) {
  execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
      'vectorize',
      'insert',
      'face-search',
      '--file',
      vectorsPath,
    ],
    { cwd: root, stdio: 'inherit' },
  )
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `${upload ? 'Uploaded' : 'Prepared'} ${vectors.length} vectors and wrote ${manifestPath}`,
)
