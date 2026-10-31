import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  eventPortraitDescription,
  eventPortraitMarkdownSection,
  eventPortraitPackages,
  eventPortraitStructuredData,
  eventPortraitTitle,
} from './event-portrait-offer'

test('the public offer names the Tampa starting prices', () => {
  assert.equal(
    eventPortraitTitle,
    'Event photography in Tampa | Ayoub Abedrabbo.',
  )
  assert.match(eventPortraitDescription, /host pays/)
  assert.match(eventPortraitDescription, /no charge/)
  assert.match(eventPortraitDescription, /\$400/)
  assert.deepEqual(
    eventPortraitPackages.map((option) => option.price),
    ['$400', '$550', '$700', '$850'],
  )
})

test('agent-readable copies share the offer and omit a street address', async () => {
  const section = eventPortraitMarkdownSection()
  const llms = await readFile(
    new URL('../data/llms.txt', import.meta.url),
    'utf8',
  )
  assert.equal(
    llms
      .slice(llms.indexOf('## Event photography'))
      .replaceAll('\r\n', '\n')
      .trim(),
    section.trim(),
  )
  for (const copy of [section, llms]) {
    assert.match(copy, /\$400/)
    assert.match(copy, /\$850/)
    assert.match(copy, /\$150/)
    assert.match(copy, /Tampa/)
    assert.match(copy, /Ayoub@AyoubAbed\.xyz/)
    assert.equal(copy.includes('streetAddress'), false)
    assert.equal(copy.includes('$300'), false)
  }
  assert.match(section, /Guests do not pay/)
  assert.match(section, /Portrait sessions are included/)
  assert.match(section, /within minutes/)
})

test('structured data describes the visible service and each starting offer without a hidden FAQ', () => {
  const url = 'https://ayoubabed.xyz/services/event-portraits/'
  const data = eventPortraitStructuredData(url)
  assert.deepEqual(
    data['@graph'].map((node) => node['@type']),
    ['ProfessionalService', 'Service'],
  )
  const business = data['@graph'][0]
  assert.equal(business.email, 'Ayoub@AyoubAbed.xyz')
  assert.equal(business.telephone, '+1-813-424-0606')
  assert.equal(JSON.stringify(data).includes('streetAddress'), false)
  const service = data['@graph'][1]
  assert.equal(service.name, 'Event photography')
  assert.equal(
    service.serviceType,
    'Event photography with portrait sessions and a live gallery',
  )
  assert.deepEqual(service.provider, { '@id': `${url}#business` })
  assert.equal(service.areaServed, 'Tampa, Florida')
  assert.deepEqual(service.offers, [
    ...[
      ['1 hour', 400],
      ['2 hours', 550],
      ['3 hours', 700],
      ['4 hours', 850],
    ].map(([name, price]) => ({
      '@type': 'Offer',
      name,
      price,
      priceCurrency: 'USD',
      description: 'Starting price',
      url,
    })),
    {
      '@type': 'Offer',
      name: 'Extra hour',
      price: 150,
      priceCurrency: 'USD',
      description: 'Starting price for each extra hour',
      url,
    },
  ])
})

test(
  'rendered offer keeps pricing, contact and email-draft semantics',
  { skip: !process.env.EVENT_PORTRAIT_TEST_ORIGIN },
  async () => {
    const origin = process.env.EVENT_PORTRAIT_TEST_ORIGIN!
    const status = await fetch(`${origin}/_astro/status`)
    assert.deepEqual(await status.json(), { ok: true })
    const response = await fetch(`${origin}/services/event-portraits/`)
    assert.equal(response.status, 200)
    const html = await response.text()
    const copy = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    assert.match(copy, /Your event\. A gallery within minutes\./)
    assert.match(copy, /The host pays/)
    assert.match(copy, /Guests receive photos at no charge/)
    for (const [hours, price] of [
      ['1 hour', '400'],
      ['2 hours', '550'],
      ['3 hours', '700'],
      ['4 hours', '850'],
    ]) {
      assert.ok(copy.includes(`${hours}, starting at $${price}`))
    }
    assert.match(copy, /Extra hour \+\$150/)
    assert.match(copy, /Opens an email draft to Ayoub/)
    assert.match(copy, /does not reserve the date/)
    assert.match(html, /mailto:Ayoub@AyoubAbed\.xyz/)
    assert.match(html, /tel:\+18134240606/)
    assert.doesNotMatch(
      html,
      /FAQPage|Questions hosts ask|Dedicated event coverage|streetAddress/,
    )
    const scripts = [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ]
    const graph = scripts
      .map((match) => JSON.parse(match[1]))
      .find((data) => data['@graph'])
    assert.ok(graph)
    assert.deepEqual(
      graph,
      eventPortraitStructuredData(
        'https://ayoubabed.xyz/services/event-portraits/',
      ),
    )
  },
)
