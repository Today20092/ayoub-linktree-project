import assert from 'node:assert/strict'
import test from 'node:test'

import {
  eventPortraitAnswers,
  eventPortraitDescription,
  eventPortraitMarkdownSection,
  eventPortraitPackages,
  eventPortraitStructuredData,
  eventPortraitTitle,
} from './event-portrait-offer'

test('the public offer names the Tampa starting prices', () => {
  assert.equal(
    eventPortraitTitle,
    'Instant event portraits in Tampa | Ayoub Abedrabbo.',
  )
  assert.match(eventPortraitDescription, /host pays/)
  assert.match(eventPortraitDescription, /no charge/)
  assert.match(eventPortraitDescription, /\$400/)
  assert.deepEqual(
    eventPortraitPackages.map((option) => option.price),
    ['$400', '$550', '$700', '$850'],
  )
  assert.equal(eventPortraitAnswers.length, 5)
  assert.match(eventPortraitAnswers[0].answer, /\$700/)
})

test('agent-readable copies share the offer and omit a street address', () => {
  const section = eventPortraitMarkdownSection()
  const data = JSON.stringify(
    eventPortraitStructuredData(
      'https://ayoubabed.xyz/services/event-portraits/',
    ),
  )
  for (const copy of [section, data]) {
    assert.match(copy, /\$400/)
    assert.match(copy, /\$850/)
    assert.match(copy, /\$150/)
    assert.match(copy, /Tampa/)
    assert.match(copy, /Ayoub@AyoubAbed\.xyz/)
    assert.equal(copy.includes('streetAddress'), false)
    assert.equal(copy.includes('$300'), false)
  }
  assert.match(section, /Guests do not pay/)
  assert.match(data, /Starting price/)
  assert.match(data, /How much does three hours cost/)
})
