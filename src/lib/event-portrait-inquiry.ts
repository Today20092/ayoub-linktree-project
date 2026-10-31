export const inquiryRecipient = 'Ayoub@ayoubabed.xyz'

export type PortraitPackage = {
  hours: string
  price: string
}

export type InquiryFields = {
  coverage: string
  extraTime: string
  date: string
  venue: string
  city: string
  guests: string
  eventType: string
  name: string
  phone: string
  email: string
}

const required: Array<[keyof InquiryFields, string]> = [
  ['coverage', 'Choose a coverage length.'],
  ['date', 'Enter the event date.'],
  ['venue', 'Enter the venue.'],
  ['city', 'Enter the city.'],
  ['guests', 'Enter the approximate guest count.'],
  ['eventType', 'Enter the event type.'],
  ['name', 'Enter your name.'],
  ['phone', 'Enter your phone number.'],
  ['email', 'Enter your email.'],
]

export function inquiryErrors(
  fields: InquiryFields,
  packages: readonly PortraitPackage[],
): Partial<Record<keyof InquiryFields, string>> {
  const errors: Partial<Record<keyof InquiryFields, string>> = {}
  for (const [key, message] of required) {
    if (fields[key].trim() === '') errors[key] = message
  }
  if (
    fields.coverage.trim() !== '' &&
    !packages.some((option) => option.hours === fields.coverage)
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
  packages: readonly PortraitPackage[],
): string {
  const selected = packages.find((option) => option.hours === fields.coverage)
  const extra = fields.extraTime.trim()
  return [
    'Event portrait request',
    '',
    `Coverage: ${fields.coverage.trim()}`,
    `Starting at: ${selected?.price ?? 'Custom quote'}`,
    `Longer coverage: ${extra === '' ? 'No' : extra}`,
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
  packages: readonly PortraitPackage[],
): string {
  const subject = `Event portrait request: ${fields.coverage.trim()}`
  const params = new URLSearchParams({
    subject,
    body: inquiryMessage(fields, packages),
  })
  return `mailto:${inquiryRecipient}?${params.toString()}`
}
