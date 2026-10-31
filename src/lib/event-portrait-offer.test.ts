import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  eventPortraitAnswers,
  eventPortraitDescription,
  eventPortraitExtraHour,
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
  assert.match(eventPortraitDescription, /instant guest portraits/)
  assert.match(eventPortraitDescription, /natural light/)
  assert.match(
    eventPortraitDescription,
    /Event pictures from the same booking can be included in the gallery/,
  )
  assert.deepEqual(
    eventPortraitPackages.map((option) => option.price),
    ['$400', '$550', '$700', '$850'],
  )
  assert.deepEqual(
    eventPortraitPackages.map((option) => [option.hours, option.amount]),
    [
      ['1 hour', 400],
      ['2 hours', 550],
      ['3 hours', 700],
      ['4 hours', 850],
    ],
  )
  assert.equal(eventPortraitExtraHour.amount, 150)
  assert.equal(eventPortraitAnswers.length, 5)
  assert.match(eventPortraitAnswers[0].answer, /\$700/)
  assert.match(
    eventPortraitAnswers[4].answer,
    /instant guest portraits in natural light/,
  )
  assert.match(
    eventPortraitAnswers[4].answer,
    /there is no backdrop and no light/,
  )
})

test('agent-readable copies share the offer and omit a street address', () => {
  const section = eventPortraitMarkdownSection()
  const data = JSON.stringify(
    eventPortraitStructuredData(
      'https://ayoubabed.xyz/services/event-portraits/',
    ),
  )
  for (const copy of [section, data]) {
    assert.match(copy, /instant guest portraits/)
    assert.match(copy, /natural light/)
    assert.match(
      copy,
      /Event pictures from the same booking can be included in the gallery/,
    )
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
  assert.match(data, /"name":"Instant guest portraits"/)
})

test('the crawler copy matches the generated markdown offer', () => {
  const llms = readFileSync(
    new URL('../../public/llms.txt', import.meta.url),
    'utf8',
  )
  assert.equal(
    llms
      .slice(llms.indexOf('## Instant event portraits'))
      .replaceAll('\r\n', '\n')
      .trim(),
    eventPortraitMarkdownSection().trim(),
  )
})
