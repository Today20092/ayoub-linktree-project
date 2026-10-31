import assert from 'node:assert/strict'
import { test } from 'node:test'

// Seed only the isolated local Worker with scripts/audit/pagination-fixtures.sql.
const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8788'
const token = 'a'.repeat(64)
const path = '/galleries/pagination-test-unlisted/'
const fixtures = process.env.GALLERY_PAGINATION_FIXTURES === '1'

test(
  'unlisted paging gates every URL and keeps credentials out of discovery',
  { skip: !fixtures },
  async () => {
    for (const query of ['', '?page=2', '?photo=41', 'photo/41/']) {
      for (const value of ['', 'wrong', 'c'.repeat(64)]) {
        const url = new URL(path + query, origin)
        if (value) url.searchParams.set('share', value)
        assert.equal((await fetch(url)).status, 404)
      }
      const url = new URL(path + query, origin)
      url.searchParams.set('share', token)
      const response = await fetch(url)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.match(response.headers.get('x-robots-tag'), /noindex/)
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
      const html = await response.text()
      assert.doesNotMatch(html, /cloudflareinsights|application\/ld\+json/)
      for (const metadata of html.match(/<(?:link|meta)\b[^>]+>/g) ?? [])
        assert.ok(!metadata.includes(token))
      assert.match(html, /(?:share=|share%3D)aaaaaaaa/)
    }
    const first = await (
      await fetch(new URL(`${path}?share=${token}`, origin))
    ).text()
    const second = await (
      await fetch(new URL(`${path}?page=2&share=${token}`, origin))
    ).text()
    assert.equal((first.match(/data-gallery-filename=/g) ?? []).length, 40)
    assert.equal((second.match(/data-gallery-filename=/g) ?? []).length, 3)
    assert.match(first, /Photos shared by guests/)
    assert.match(second, /Photos shared by guests/)
    assert.match(second, /data-gallery-open="40"/)
    const sitemap = await (await fetch(new URL('/sitemap.xml', origin))).text()
    assert.doesNotMatch(
      sitemap,
      /pagination-test-unlisted|pagination-test-hidden|aaaaaaaa/,
    )
    for (const page of ['', '?page=2', '?page=2&share=' + 'b'.repeat(64)])
      assert.equal(
        (
          await fetch(
            new URL('/galleries/pagination-test-hidden/' + page, origin),
          )
        ).status,
        404,
      )
  },
)

test(
  'empty and exact-page galleries have no phantom later page',
  { skip: !fixtures },
  async () => {
    for (const [slug, count] of [
      ['pagination-test-empty', 0],
      ['pagination-test-exact', 40],
    ]) {
      const path = `/galleries/${slug}/`
      const response = await fetch(new URL(path, origin))
      assert.equal(response.status, 200)
      const html = await response.text()
      assert.equal((html.match(/data-gallery-filename=/g) ?? []).length, count)
      assert.doesNotMatch(html, /rel="next"/)
      assert.equal((await fetch(new URL(path + '?page=2', origin))).status, 404)
    }
  },
)
