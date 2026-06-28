import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildPublishedData } from './face-index-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const eventSlug = option('--event')
const reviewOption = option('--review')
const publicBaseUrl =
  option('--public-base-url') ??
  `https://photos.ayoubabed.xyz/events/${eventSlug}/images`
const upload = !args.includes('--no-upload')

if (!eventSlug || !/^[a-z0-9-]+$/.test(eventSlug)) {
  console.error(
    'Usage: npm run faces:publish -- --event <slug> [--review <review.json>] [--no-upload]',
  )
  process.exit(1)
}

const reviewPath = resolve(
  reviewOption ?? resolve(root, '.face-index', eventSlug, 'review.json'),
)
const review = JSON.parse(await readFile(reviewPath, 'utf8'))
if (review.eventSlug !== eventSlug) {
  throw new Error('Review event does not match --event')
}

const { manifest, vectors } = buildPublishedData(review, publicBaseUrl)
const workDirectory = resolve(root, '.face-index', eventSlug)
const vectorsPath = resolve(workDirectory, `${manifest.version}.ndjson`)
const manifestDirectory = resolve(root, 'src/data/face-galleries')
const manifestPath = resolve(manifestDirectory, `${eventSlug}.json`)
await mkdir(manifestDirectory, { recursive: true })
await mkdir(workDirectory, { recursive: true })
await writeFile(
  vectorsPath,
  `${vectors.map((vector) => JSON.stringify(vector)).join('\n')}\n`,
)

if (upload) {
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['wrangler', 'vectorize', 'insert', 'face-search', '--file', vectorsPath],
    { cwd: root, stdio: 'inherit' },
  )
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(
  `${upload ? 'Uploaded' : 'Prepared'} ${vectors.length} vectors and wrote ${manifestPath}`,
)
