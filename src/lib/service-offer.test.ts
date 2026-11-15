import assert from 'node:assert/strict'
import test from 'node:test'

import { eventPortraitOffer } from './event-portrait-offer'
import { podcastOffer, podcastPath } from './podcast-offer'
import {
  formatUsd,
  headlineStartingPrice,
  inquiryEmail,
  offerMailto,
  offerStructuredData,
  personEntity,
} from './service-offer'

test('prices are numbers formatted once', () => {
  assert.equal(formatUsd(400), '$400')
  assert.equal(formatUsd(1000), '$1,000')
  assert.equal(headlineStartingPrice(eventPortraitOffer), 400)
  assert.equal(headlineStartingPrice(podcastOffer), 450)
})

test('every service names the same Person and business entities', () => {
  for (const [offer, url] of [
    [eventPortraitOffer, 'https://ayoubabed.xyz/services/event-portraits/'],
    [podcastOffer, `https://ayoubabed.xyz${podcastPath}`],
  ] as const) {
    const [person, business, service] = offerStructuredData(offer, url)[
      '@graph'
    ]
    assert.deepEqual(person, personEntity('https://ayoubabed.xyz/about/'))
    assert.equal(person['@id'], 'https://ayoubabed.xyz/#person')
    assert.deepEqual(business.founder, { '@id': person['@id'] })
    assert.deepEqual(service.provider, { '@id': business['@id'] })
    assert.equal(business.email, inquiryEmail)
    assert.equal(service.offers[0].price, offer.startingPrices[0].price)
  }
})

test('email drafts go to the inquiry address', () => {
  const href = offerMailto(podcastOffer, 'Growth', 'Line one\nLine two')
  assert.ok(href.startsWith(`mailto:${inquiryEmail}?`))
  const query = new URLSearchParams(href.slice(href.indexOf('?') + 1))
  assert.equal(query.get('subject'), 'Podcast inquiry: Growth')
  assert.equal(query.get('body'), 'Line one\nLine two')
})
