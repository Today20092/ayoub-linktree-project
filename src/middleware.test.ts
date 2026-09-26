import assert from 'node:assert/strict'
import test from 'node:test'
import type { APIContext } from 'astro'
import { onRequest } from './middleware'

test('only the payments host root rewrites; assets and main site pass through', async () => {
  for (const [url, expectedPath, noindex] of [
    ['https://payments.ayoubabed.xyz/', '/payments/', true],
    ['https://payments.ayoubabed.xyz/payments/', undefined, true],
    ['https://payments.ayoubabed.xyz/_astro/app.js', undefined, true],
    ['https://ayoubabed.xyz/', undefined, false],
    ['http://localhost:4321/payments/', undefined, false],
  ] as const) {
    let called = false
    const respond = async (path?: string | URL | Request) => {
      called = true
      assert.equal(path, expectedPath, url)
      return new Response('page')
    }
    const response = await onRequest(
      { url: new URL(url), rewrite: respond } as APIContext,
      () => respond(),
    )
    assert.ok(called, url)
    assert.ok(response instanceof Response)
    assert.equal(
      response.headers.get('X-Robots-Tag'),
      noindex ? 'noindex, nofollow' : null,
      url,
    )
  }
})
