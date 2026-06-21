import { readdir, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'
import { stringify } from 'yaml'

const args = process.argv.slice(2)
const positional = args.filter((argument) => !argument.startsWith('--'))
const optionValue = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const [sourceDirectory, publicBaseUrl] = positional

if (!sourceDirectory || !publicBaseUrl) {
  console.error(
    'Usage: npm run gallery:manifest -- <folder> <public-base-url> [--output <file>] [--featured <name1,name2>] [--alt-prefix <text>]',
  )
  process.exit(1)
}

let baseUrl
try {
  baseUrl = new URL(
    publicBaseUrl.endsWith('/') ? publicBaseUrl : `${publicBaseUrl}/`,
  )
} catch {
  console.error(`Invalid public base URL: ${publicBaseUrl}`)
  process.exit(1)
}

const sourcePath = resolve(sourceDirectory)
const outputPath = optionValue('--output')
const altPrefix = optionValue('--alt-prefix') ?? 'Event photograph'
const featured = new Set(
  (optionValue('--featured') ?? '')
    .split(',')
    .map((filename) => filename.trim().toLowerCase())
    .filter(Boolean),
)
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

const filenames = (await readdir(sourcePath))
  .filter((filename) =>
    supportedExtensions.has(extname(filename).toLowerCase()),
  )
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

if (filenames.length === 0) {
  console.error(`No supported images found in ${sourcePath}`)
  process.exit(1)
}

const gallery = await Promise.all(
  filenames.map(async (filename, index) => {
    const metadata = await sharp(join(sourcePath, filename)).metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read dimensions for ${filename}`)
    }

    return {
      src: new URL(encodeURIComponent(filename), baseUrl).toString(),
      width: metadata.width,
      height: metadata.height,
      alt: `${altPrefix} ${index + 1}`,
      filename,
      featured: featured.has(filename.toLowerCase()),
    }
  }),
)

const yaml = stringify({ gallery }, { lineWidth: 0 })

if (outputPath) {
  await writeFile(resolve(outputPath), yaml, 'utf8')
  console.log(`Created ${resolve(outputPath)} with ${gallery.length} images.`)
} else {
  process.stdout.write(yaml)
}
