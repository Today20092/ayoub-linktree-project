import { createReadStream, createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { ZipFile } from 'yazl'
import { parse, stringify } from 'yaml'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/
const FIXED_ZIP_DATE = new Date('2000-01-01T00:00:00.000Z')

export function parseGalleryMdx(text) {
  const match = text.match(FRONTMATTER)
  if (!match) throw new Error('MDX file has no YAML frontmatter.')

  const data = parse(match[1])
  if (!Array.isArray(data?.gallery)) {
    throw new Error('MDX frontmatter has no gallery array.')
  }

  return {
    data,
    prefixLength: match[0].length,
    body: text.slice(match[0].length),
  }
}

export function resolvePhotoSelectors(gallery, selectors) {
  if (selectors.length === 0) throw new Error('Provide at least one photo ID.')

  const selectedIndexes = []
  const seen = new Set()
  const alreadyMissing = []
  const filenames = gallery.map((photo) => photo.filename)

  const selectIndex = (index, selector) => {
    if (index < 0 || index >= gallery.length) {
      throw new Error(
        `Photo position "${selector}" is outside 1-${gallery.length}.`,
      )
    }
    if (seen.has(index)) {
      throw new Error(`Photo selector "${selector}" selects a duplicate photo.`)
    }
    seen.add(index)
    selectedIndexes.push(index)
  }

  for (const selector of selectors) {
    if (/^\d+$/.test(selector)) {
      selectIndex(Number(selector) - 1, selector)
      continue
    }

    const range = selector.match(/^(\d+)-(\d+)$/)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      if (start > end)
        throw new Error(`Invalid descending range "${selector}".`)
      for (let position = start; position <= end; position += 1) {
        selectIndex(position - 1, selector)
      }
      continue
    }

    const index = filenames.findIndex(
      (filename) => filename.toLowerCase() === selector.toLowerCase(),
    )
    if (index >= 0) {
      selectIndex(index, selector)
      continue
    }

    if (/\.(avif|jpe?g|png|webp)$/i.test(selector)) {
      alreadyMissing.push(selector)
      continue
    }

    throw new Error(`Unknown photo selector "${selector}".`)
  }

  selectedIndexes.sort((a, b) => a - b)
  return {
    selectedIndexes,
    selected: selectedIndexes.map((index) => ({
      index,
      position: index + 1,
      photo: gallery[index],
    })),
    alreadyMissing,
  }
}

export function pruneGalleryMdx(text, selectedIndexes) {
  const parsed = parseGalleryMdx(text)
  const oldCount = parsed.data.gallery.length
  const selected = new Set(selectedIndexes)
  parsed.data.gallery = parsed.data.gallery.filter(
    (_photo, index) => !selected.has(index),
  )

  if (typeof parsed.data.galleryDescription === 'string') {
    const oldCountPattern = new RegExp(`\\b${oldCount}\\b`)
    if (oldCountPattern.test(parsed.data.galleryDescription)) {
      parsed.data.galleryDescription = parsed.data.galleryDescription.replace(
        oldCountPattern,
        String(parsed.data.gallery.length),
      )
    }
  }

  return `---\n${stringify(parsed.data, { lineWidth: 0 }).trimEnd()}\n---\n${parsed.body}`
}

export async function createDeterministicZip(files, outputPath) {
  const zip = new ZipFile()
  const sorted = [...files].sort((a, b) =>
    basename(a).localeCompare(basename(b), undefined, { numeric: true }),
  )

  for (const file of sorted) {
    zip.addReadStream(createReadStream(file), basename(file), {
      mtime: FIXED_ZIP_DATE,
      mode: 0o100644,
      compress: true,
    })
  }

  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    output.on('close', resolve)
    output.on('error', reject)
    zip.outputStream.on('error', reject)
    zip.outputStream.pipe(output)
    zip.end()
  })
}

export async function listZipEntries(zipPath) {
  const buffer = await readFile(zipPath)
  const entries = []

  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue
    const filenameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const start = offset + 46
    entries.push(
      buffer.subarray(start, start + filenameLength).toString('utf8'),
    )
    offset = start + filenameLength + extraLength + commentLength - 1
  }

  if (entries.length === 0) throw new Error('Generated ZIP has no entries.')
  return entries
}

export function objectKeyFromUrl(url) {
  const parsed = new URL(url)
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
}
