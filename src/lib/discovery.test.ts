import assert from 'node:assert/strict'
import test from 'node:test'

import { cacheControlForPage, escapeXml } from './public-delivery'

test('allowlist caches only public page paths', () => {
  assert.match(cacheControlForPage('/'), /public/)
  assert.match(cacheControlForPage('/portfolio/portraits/'), /s-maxage=300/)
  assert.equal(cacheControlForPage('/galleries/private-event/'), undefined)
  assert.equal(cacheControlForPage('/admin/galleries/'), undefined)
  assert.equal(cacheControlForPage('/api/faces/search'), undefined)
})

test('cache guard preserves personalized and existing responses', () => {
  assert.equal(cacheControlForPage('/?preview=1'), undefined)
  assert.equal(
    cacheControlForPage(
      '/',
      new Request('https://ayoubabed.xyz/', {
        headers: { cookie: 'session=private' },
      }),
    ),
    undefined,
  )
  assert.equal(
    cacheControlForPage(
      '/',
      new Request('https://ayoubabed.xyz/', {
        headers: { authorization: 'Bearer token' },
      }),
    ),
    undefined,
  )
  assert.equal(
    cacheControlForPage('/', undefined, new Headers({ 'set-cookie': 'id=1' })),
    undefined,
  )
  assert.equal(
    cacheControlForPage(
      '/',
      undefined,
      new Headers({ 'cache-control': 'private' }),
    ),
    undefined,
  )
})

test('escapes sitemap XML values', () => {
  assert.equal(escapeXml(`a&<b>"c'`), 'a&amp;&lt;b&gt;&quot;c&apos;')
})
