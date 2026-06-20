import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectDir = join(__dirname, '..')
const publicDir = join(projectDir, 'public')
const sourceImage = join(projectDir, 'src', 'image', 'AyoubBayaan.jpg')

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

function pngToIco(images) {
  const headerSize = 6
  const directorySize = images.length * 16
  const header = Buffer.alloc(headerSize + directorySize)

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = headerSize + directorySize

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = headerSize + index * 16

    header.writeUInt8(size >= 256 ? 0 : size, entryOffset)
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1)
    header.writeUInt8(0, entryOffset + 2)
    header.writeUInt8(0, entryOffset + 3)
    header.writeUInt16LE(1, entryOffset + 4)
    header.writeUInt16LE(32, entryOffset + 6)
    header.writeUInt32LE(buffer.length, entryOffset + 8)
    header.writeUInt32LE(offset, entryOffset + 12)

    offset += buffer.length
  })

  return Buffer.concat([header, ...images.map(({ buffer }) => buffer)])
}

async function createCircularPortrait(size) {
  const metadata = await sharp(sourceImage).metadata()
  const cropSize = Math.round(Math.min(metadata.width, metadata.height) * 0.48)
  const left = Math.floor((metadata.width - cropSize) / 2)
  const top = Math.floor(metadata.height * 0.13)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
    </svg>`,
  )

  return sharp(sourceImage)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(size, size, {
      fit: 'cover',
      position: 'north',
      kernel: sharp.kernel.lanczos3,
    })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function generateFavicons() {
  console.log('Generating Ko-fi-style portrait favicons...')

  for (const { name, size } of sizes) {
    const icon = await createCircularPortrait(size)
    writeFileSync(join(publicDir, name), icon)
    console.log(`  Created ${name}`)
  }

  const icoImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      buffer: await createCircularPortrait(size),
    })),
  )

  writeFileSync(join(publicDir, 'favicon.ico'), pngToIco(icoImages))
  console.log('  Created favicon.ico')

  console.log('\nGenerating web manifest...')
  const manifest = {
    name: 'Ayoub Abedrabbo',
    short_name: 'Ayoub',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#12140e',
    background_color: '#12140e',
    display: 'standalone',
  }

  writeFileSync(
    join(publicDir, 'site.webmanifest'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log('  Created site.webmanifest')

  console.log('\nDone! All favicons generated.')
}

generateFavicons().catch((error) => {
  console.error(error)
  process.exit(1)
})
