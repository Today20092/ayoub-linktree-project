import { execFileSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const eventSlug = process.argv[process.argv.indexOf('--event') + 1]

if (!eventSlug || !/^[a-z0-9-]+$/.test(eventSlug)) {
  console.error('Usage: npm run faces:delete -- --event <slug>')
  process.exit(1)
}

const manifestPath = resolve(
  root,
  'src/data/face-galleries',
  `${eventSlug}.json`,
)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

for (let index = 0; index < manifest.vectorIds.length; index += 100) {
  execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
      'vectorize',
      'delete-vectors',
      'face-search',
      '--ids',
      ...manifest.vectorIds.slice(index, index + 100),
    ],
    { cwd: root, stdio: 'inherit' },
  )
}

await rm(manifestPath)
console.log(`Deleted ${manifest.vectorIds.length} vectors and ${manifestPath}`)
