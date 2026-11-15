import assert from 'node:assert/strict'
import test from 'node:test'
import {
  inquiryErrors,
  inquiryFieldDefs,
  inquiryFieldNames,
  inquiryMailto,
  inquiryMessage,
  type InquiryFields,
} from './event-portrait-inquiry'
import { inquiryEmail } from './service-offer'

const complete: InquiryFields = {
  coverage: '3 hours',
  extraTime: '',
  date: '2026-11-14',
  venue: 'Masjid hall',
  city: 'Tampa',
  guests: '80',
  eventType: 'Community dinner',
  name: 'Sara Ali',
  phone: '813-555-0100',
  email: 'sara@example.com',
}

test('a complete request addresses Ayoub and names the selected starting price', () => {
  const message = inquiryMessage(complete)
  const mailto = inquiryMailto(complete)
  assert.match(message, /Coverage: 3 hours/)
  assert.match(message, /Starting at: \$700/)
  assert.match(message, /Venue: Masjid hall/)
  assert.match(message, /does not reserve the date/)
  assert.equal(mailto.startsWith(`mailto:${inquiryEmail}?`), true)
  assert.equal(mailto.includes('+'), false)
  const query = new URLSearchParams(mailto.slice(mailto.indexOf('?') + 1))
  assert.equal(query.get('body'), message)
  assert.equal(
    decodeURIComponent(mailto).includes('Event portrait request'),
    true,
  )
})

test('missing required fields do not produce a sendable request', () => {
  const errors = inquiryErrors({
    ...complete,
    date: ' ',
    email: 'not-an-email',
    guests: 'many',
  })
  assert.equal(errors.date, 'Enter the event date.')
  assert.equal(errors.email, 'Enter an email address.')
  assert.equal(errors.guests, 'Enter the guest count as a whole number.')
  assert.equal(inquiryErrors(complete).date, undefined)
})

test('every required field in the schema is reported when empty', () => {
  const empty = Object.fromEntries(
    inquiryFieldNames.map((name) => [name, '']),
  ) as InquiryFields
  const errors = inquiryErrors(empty)
  for (const name of inquiryFieldNames) {
    const required = 'required' in inquiryFieldDefs[name]
    assert.equal(name in errors, required, name)
  }
  assert.equal(errors.extraTime, undefined)
})

test('an unknown coverage value is rejected', () => {
  assert.equal(
    inquiryErrors({ ...complete, coverage: '9 hours' }).coverage,
    'Choose a published coverage length.',
  )
  assert.equal(inquiryErrors(complete).coverage, undefined)
})

test('an invalid email is rejected', () => {
  assert.equal(
    inquiryErrors({ ...complete, email: 'sara@example' }).email,
    'Enter an email address.',
  )
})

test('the mailto body carries the formatted numeric price', () => {
  const mailto = inquiryMailto({ ...complete, coverage: '4 hours' })
  const query = new URLSearchParams(mailto.slice(mailto.indexOf('?') + 1))
  assert.equal(mailto.startsWith('mailto:inquiry@ayoubabed.xyz?'), true)
  assert.match(query.get('body') ?? '', /Starting at: \$850/)
})
