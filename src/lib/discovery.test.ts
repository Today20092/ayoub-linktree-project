import assert from 'node:assert/strict'
import test from 'node:test'

import { homepageMarkdown, llmsText } from './discovery'
import { cacheControlForPage, escapeXml } from './public-delivery'
import { inquiryEmail } from './service-offer'

test('allowlist caches only public page paths', () => {
  const homepage = cacheControlForPage('/')
  const portfolio = cacheControlForPage('/portfolio/portraits/')
  assert.ok(homepage)
  assert.ok(portfolio)
  assert.match(homepage, /public/)
  assert.match(portfolio, /s-maxage=300/)
  assert.equal(cacheControlForPage('/galleries/private-event/'), undefined)
  assert.equal(cacheControlForPage('/admin/galleries/'), undefined)
  assert.equal(cacheControlForPage('/api/faces/search'), undefined)
  assert.match(
    cacheControlForPage('/services/event-portraits/') ?? '',
    /public/,
  )
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

// Agent-readable outputs are generated from the offer data, not copied by hand.
const site = { siteName: 'Ayoub Abedrabbo', pageDescription: 'Tampa media.' }

for (const [name, render] of [
  ['/index.md', homepageMarkdown],
  ['/llms.txt', llmsText],
] as const) {
  test(`${name} lists every service offer with the inquiry email and no private details`, () => {
    const text = render('https://example.test', site)
    assert.match(text, /## Event photography/)
    assert.match(text, /## Mobile podcast production/)
    assert.ok(text.includes('https://example.test/services/event-portraits/'))
    assert.ok(
      text.includes('https://example.test/services/podcast-production/'),
    )
    assert.ok(text.includes('$400 for 1 hour'))
    assert.ok(text.includes('$450 for Record & Polish'))
    assert.ok(text.includes(inquiryEmail))
    assert.equal(/ayoub@ayoubabed/i.test(text), false)
    assert.doesNotMatch(text, /- Phone:|(?:tel|sms):|streetAddress/)
    // Delivery URLs stay on production while navigation follows the origin.
    assert.ok(
      text.includes(
        'https://ayoubabed.xyz/galleries/angels-birthday-party-2026/',
      ),
    )
  })
}
