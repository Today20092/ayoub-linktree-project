import assert from 'node:assert/strict'
import test from 'node:test'
import {
  inquiryErrors,
  inquiryMailto,
  inquiryMessage,
  inquiryRecipient,
  type InquiryFields,
  type PortraitPackage,
} from './event-portrait-inquiry'

const packages: readonly PortraitPackage[] = [
  { hours: '1 hour', price: '$400' },
  { hours: '2 hours', price: '$550' },
  { hours: '3 hours', price: '$700' },
  { hours: '4 hours', price: '$850' },
]

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
  const message = inquiryMessage(complete, packages)
  const mailto = inquiryMailto(complete, packages)
  assert.match(message, /Coverage: 3 hours/)
  assert.match(message, /Starting at: \$700/)
  assert.match(message, /Venue: Masjid hall/)
  assert.match(message, /does not reserve the date/)
  assert.equal(mailto.startsWith(`mailto:${inquiryRecipient}?`), true)
  const body = new URLSearchParams(mailto.slice(mailto.indexOf('?') + 1)).get(
    'body',
  )
  assert.equal(body, message)
})

test('missing required fields do not produce a sendable request', () => {
  const errors = inquiryErrors(
    { ...complete, date: ' ', email: 'not-an-email', guests: 'many' },
    packages,
  )
  assert.equal(errors.date, 'Enter the event date.')
  assert.equal(errors.email, 'Enter an email address.')
  assert.equal(errors.guests, 'Enter the guest count as a whole number.')
  assert.equal(inquiryErrors(complete, packages).date, undefined)
})
