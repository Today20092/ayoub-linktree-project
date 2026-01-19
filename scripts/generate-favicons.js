import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'))

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

async function generateFavicons() {
  console.log('Generating favicon PNGs...')

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name))
    console.log(`  Created ${name}`)
  }

  // Create favicon.ico with multiple sizes (16, 32, 48)
  // ICO format requires special handling - we'll create individual PNGs
  // and note that modern browsers prefer PNG anyway

  console.log('\nGenerating web manifest...')
  const manifest = {
    name: 'Ayoub Abedrabbo',
    short_name: 'Ayoub',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    theme_color: '#12140e',
    background_color: '#12140e',
    display: 'standalone'
  }

  writeFileSync(
    join(publicDir, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  )
  console.log('  Created site.webmanifest')

  console.log('\nDone! All favicons generated.')
}

generateFavicons().catch(console.error)
