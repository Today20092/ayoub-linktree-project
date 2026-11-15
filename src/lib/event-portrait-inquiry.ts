import {
  eventPortraitOffer,
  eventPortraitStartingPrices,
} from './event-portrait-offer'
import { formatUsd, offerMailto } from './service-offer'

export type InquiryFieldDef = {
  label: string
  /** Present when the field is required: the message shown if it is empty. */
  required?: string
  type?: 'date' | 'number' | 'tel' | 'email'
  autocomplete?: string
  placeholder?: string
}

// The one inquiry field list: markup, validation, and the email draft read it.
export const inquiryFieldDefs = {
  coverage: {
    label: 'Coverage',
    required: 'Choose a coverage length.',
  },
  extraTime: { label: 'Longer coverage', placeholder: 'Up to 8 hours' },
  date: { label: 'Date', type: 'date', required: 'Enter the event date.' },
  guests: {
    label: 'Guests',
    type: 'number',
    required: 'Enter the approximate guest count.',
  },
  venue: { label: 'Venue', required: 'Enter the venue.' },
  city: {
    label: 'City',
    autocomplete: 'address-level2',
    required: 'Enter the city.',
  },
  eventType: {
    label: 'Event type',
    placeholder: 'Birthday, mosque, school, or nonprofit',
    required: 'Enter the event type.',
  },
  name: { label: 'Name', autocomplete: 'name', required: 'Enter your name.' },
  phone: {
    label: 'Phone',
    type: 'tel',
    autocomplete: 'tel',
    required: 'Enter your phone number.',
  },
  email: {
    label: 'Email',
    type: 'email',
    autocomplete: 'email',
    required: 'Enter your email.',
  },
} as const satisfies Record<string, InquiryFieldDef>

export type InquiryFieldName = keyof typeof inquiryFieldDefs
export type InquiryFields = Record<InquiryFieldName, string>
export const inquiryFieldNames = Object.keys(
  inquiryFieldDefs,
) as InquiryFieldName[]

export type CoveragePrice = { name: string; price: number }

export function startingPriceFor(
  coverage: string,
  prices: readonly CoveragePrice[] = eventPortraitStartingPrices,
) {
  return prices.find((option) => option.name === coverage)?.price
}

export function inquiryErrors(
  fields: InquiryFields,
  prices: readonly CoveragePrice[] = eventPortraitStartingPrices,
): Partial<Record<InquiryFieldName, string>> {
  const errors: Partial<Record<InquiryFieldName, string>> = {}
  for (const name of inquiryFieldNames) {
    const def: InquiryFieldDef = inquiryFieldDefs[name]
    if (def.required && fields[name].trim() === '') errors[name] = def.required
  }
  if (
    fields.coverage.trim() !== '' &&
    startingPriceFor(fields.coverage, prices) === undefined
  ) {
    errors.coverage = 'Choose a published coverage length.'
  }
  if (fields.guests.trim() !== '' && !/^\d+$/.test(fields.guests.trim())) {
    errors.guests = 'Enter the guest count as a whole number.'
  }
  if (
    fields.email.trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())
  ) {
    errors.email = 'Enter an email address.'
  }
  return errors
}

export function inquiryMessage(
  fields: InquiryFields,
  prices: readonly CoveragePrice[] = eventPortraitStartingPrices,
): string {
  const price = startingPriceFor(fields.coverage, prices)
  const extra = fields.extraTime.trim()
  return [
    'Event portrait request',
    '',
    `Coverage: ${fields.coverage.trim()}`,
    `Starting at: ${price === undefined ? 'Custom quote' : formatUsd(price)}`,
    ...(extra === '' ? [] : [`Longer coverage: ${extra}`]),
    `Date: ${fields.date.trim()}`,
    `Venue: ${fields.venue.trim()}`,
    `City: ${fields.city.trim()}`,
    `Approximate guests: ${fields.guests.trim()}`,
    `Event type: ${fields.eventType.trim()}`,
    `Name: ${fields.name.trim()}`,
    `Phone: ${fields.phone.trim()}`,
    `Email: ${fields.email.trim()}`,
    '',
    'This request does not reserve the date.',
  ].join('\n')
}

export function inquiryMailto(
  fields: InquiryFields,
  prices: readonly CoveragePrice[] = eventPortraitStartingPrices,
): string {
  const body = inquiryMessage(fields, prices)
  return offerMailto(eventPortraitOffer, fields.coverage.trim(), body)
}
