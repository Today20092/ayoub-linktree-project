import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  eventPortraitDescription,
  eventPortraitMapsUrl,
  eventPortraitMarkdownSection,
  eventPortraitPackages,
  eventPortraitPath,
  eventPortraitProofProjects,
  eventPortraitProofGalleryUrl,
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
  // Search results truncate descriptions past about 155 characters.
  assert.ok(
    eventPortraitDescription.length <= 155,
    `${eventPortraitDescription.length} chars`,
  )
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
    assert.doesNotMatch(copy, /- Phone:|(?:tel|sms):/)
    assert.equal(copy.includes('streetAddress'), false)
    assert.equal(copy.includes('$300'), false)
  }
  assert.match(section, /Guests do not pay/)
  assert.match(section, /Portrait sessions are included/)
  assert.match(section, /within minutes/)
})

test('agent-readable offer answers how to book without the page layout', () => {
  const section = eventPortraitMarkdownSection()
  assert.match(section, /Who: Ayoub Abedrabbo/)
  assert.match(section, /Travel within 30 miles of Tampa is included/)
  assert.match(section, /No backdrop, no flash, and no lighting kit/)
  assert.match(section, /Videography: custom quote/)
  assert.match(
    section,
    /coverage length, extra time, event date, venue, city, guest count, event type, name, phone, and email/,
  )
  assert.match(section, /mailto:Ayoub@AyoubAbed\.xyz/)
  assert.match(section, /does not reserve the date/)
  assert.match(
    section,
    /https:\/\/ayoubabed\.xyz\/galleries\/angels-birthday-party-2026\//,
  )
  assert.match(section, /https:\/\/ayoubabed\.xyz\/portfolio\/portraits\//)
  assert.equal(/FAQ|\$300|streetAddress/.test(section), false)
})

// Agent crawl smoke (#100): each answer a bot needs, in the plain-text copy.
test('agent-readable offer answers who, where, prices, payer, inquiry and Maps', () => {
  const section = eventPortraitMarkdownSection()
  for (const fact of [
    /Who: Ayoub Abedrabbo/,
    /Tampa, Florida/,
    /Starting prices: \$400 for 1 hour/,
    /The host books and pays/,
    /How to inquire/,
    /Google Maps: https:\/\/maps\.app\.goo\.gl\/7r3JFHfe32ubHtKa7/,
  ]) {
    assert.match(section, fact)
  }
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
  assert.equal('telephone' in business, false)
  assert.equal(JSON.stringify(data).includes('streetAddress'), false)
  const service = data['@graph'][1]
  assert.equal(service.name, 'Event photography')
  assert.equal(
    service.serviceType,
    'Event photography with portrait sessions and a live gallery',
  )
  assert.deepEqual(service.provider, { '@id': `${url}#business` })
  const area = {
    '@type': 'GeoCircle',
    geoMidpoint: {
      '@type': 'GeoCoordinates',
      latitude: 27.9506,
      longitude: -82.4572,
    },
    geoRadius: 48280,
    description: 'Within 30 miles of Tampa, Florida',
  }
  assert.deepEqual(business.areaServed, area)
  assert.deepEqual(service.areaServed, area)
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

test('structured data links the live Google Maps listing', () => {
  const data = eventPortraitStructuredData(
    'https://ayoubabed.xyz/services/event-portraits/',
  )
  const business = data['@graph'][0]
  assert.equal(
    eventPortraitMapsUrl,
    'https://maps.app.goo.gl/7r3JFHfe32ubHtKa7',
  )
  assert.deepEqual(business.sameAs, [eventPortraitMapsUrl])
  assert.equal(
    business.hasMap,
    'https://www.google.com/maps?cid=7799557622400498050',
  )
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
    assert.doesNotMatch(html, /href="(?:tel|sms):/)
    // The denial is the only mention of a backdrop or lighting.
    const visible = html
      .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
    assert.deepEqual(visible.match(/[^.]*\b(backdrop|lighting)\b[^.]*\./gi), [
      ' No backdrop, flash, or lighting kit.',
    ])
    assert.match(copy, /Travel included within 30 miles of Tampa\./)
    assert.match(copy, /Ayoub Abedrabbo · Alpha Bravo Media/)
    assert.ok(html.includes('href="https://maps.app.goo.gl/7r3JFHfe32ubHtKa7"'))
    assert.match(copy, /Find us on Google Maps/)
    for (const proof of [
      eventPortraitProofGalleryUrl,
      '/portfolio/portraits/',
      '/portfolio/muslim-business-chamber-2026/',
    ]) {
      assert.ok(html.includes(`href="${proof}"`), proof)
    }
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

test(
  'services permanently redirects to the event photography page',
  { skip: !process.env.EVENT_PORTRAIT_TEST_ORIGIN },
  async () => {
    const origin = process.env.EVENT_PORTRAIT_TEST_ORIGIN!
    const response = await fetch(`${origin}/services/`, { redirect: 'manual' })
    assert.equal(response.status, 301)
    assert.equal(
      new URL(response.headers.get('location')!, origin).pathname,
      eventPortraitPath,
    )
  },
)

test('proof projects are real portfolio entries that lead back to prices', async () => {
  assert.deepEqual([...eventPortraitProofProjects].sort(), [
    'muslim-business-chamber-2026',
    'portraits',
  ])
  for (const id of eventPortraitProofProjects) {
    await readFile(new URL(`../content/portfolio/${id}.mdx`, import.meta.url))
  }
})
