import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'

const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8788'
const slug = process.env.GALLERY_IMAGE_SLUG ?? 'angels-birthday-party-2026'

test('managed gallery previews deliver distinct resized images and preserve originals', async () => {
  const paths = ['/galleries/', `/galleries/${slug}/`]
  if (process.env.GALLERY_IMAGE_FIXTURES === '1')
    paths.push('/admin/galleries/', '/galleries/image-test-coming-soon/')
  for (const path of paths) {
    const response = await fetch(new URL(path, origin))
    assert.equal(response.status, 200)
    const html = await response.text()
    const tags = (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) =>
      /api(?:%2F|\/)gallery-media/.test(tag),
    )
    assert.ok(tags.length > 0, `${path} renders managed images`)
    for (const tag of tags) {
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1].replaceAll('&amp;', '&')
      assert.ok(src?.startsWith('/_image/'), `${path}: ${src}`)
      const candidates = tag.match(/\bsrcset="([^"]+)"/)?.[1]
      assert.ok(candidates)
      const entries = candidates
        .replaceAll('&amp;', '&')
        .split(',')
        .map((part) => part.trim().split(/\s+/))
      assert.equal(new Set(entries.map(([url]) => url)).size, entries.length)
      for (const [candidate, descriptor] of entries) {
        const url = new URL(candidate, origin)
        assert.equal(
          Number(url.searchParams.get('w')),
          Number.parseInt(descriptor),
        )
      }
    }
    const tag = tags[0]
    for (const candidate of [
      tag.match(/\bsrc="([^"]+)"/)[1],
      ...tag
        .match(/\bsrcset="([^"]+)"/)[1]
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0]),
    ]) {
      const url = new URL(candidate.replaceAll('&amp;', '&'), origin)
      const image = await fetch(url)
      assert.equal(image.status, 200)
      assert.match(image.headers.get('content-type'), /^image\/webp/)
      const bytes = Buffer.from(await image.arrayBuffer())
      assert.ok(bytes.length <= 200 * 1024)
      const metadata = await sharp(bytes).metadata()
      assert.equal(metadata.width, Number(url.searchParams.get('w')))
      assert.equal(metadata.height, Number(url.searchParams.get('h')))
    }
    if (path === `/galleries/${slug}/`)
      assert.match(html, /href="\/api\/gallery-media\/events\//)
  }
})
