import {
  formatUsd,
  headlineStartingPrice,
  mapsListingUrl,
  type ServiceOffer,
} from './service-offer'

export const eventPortraitPath = '/services/event-portraits/'
// Public proof is delivered from production, including on preview/local builds.
export const eventPortraitProofGalleryUrl =
  'https://ayoubabed.xyz/galleries/angels-birthday-party-2026/'

// Portfolio entries that prove the event photography offer (#99).
export const eventPortraitProofProjects: ReadonlySet<string> = new Set([
  'portraits',
  'muslim-business-chamber-2026',
])

export const eventPortraitTitle =
  'Event photography in Tampa | Ayoub Abedrabbo.'

export const eventPortraitStartingPrices = [
  { name: '1 hour', price: 400 },
  { name: '2 hours', price: 550 },
  { name: '3 hours', price: 700 },
  { name: '4 hours', price: 850 },
] as const

export const eventPortraitExtraHour = {
  name: 'Extra hour',
  price: 150,
  note: 'for each extra hour',
} as const

export const eventPortraitOffer: ServiceOffer = {
  name: 'Event photography',
  path: eventPortraitPath,
  serviceType: 'Event photography with portrait sessions and a live gallery',
  startingPrices: eventPortraitStartingPrices,
  extraPrices: [eventPortraitExtraHour],
  facts: [
    'Who: Ayoub Abedrabbo, event photographer in Tampa, Florida',
    'Area: within 30 miles of Tampa, Florida. Travel within 30 miles of Tampa is included.',
    'Event photography for the booking. Portrait sessions are included.',
    'Gallery: each photo shows up within minutes of being taken.',
    'Guests do not pay. The host books and pays.',
    'No backdrop, no flash, and no lighting kit.',
    'Videography: custom quote. No published video prices.',
    `Google Maps: ${mapsListingUrl}`,
  ],
  inquiry: {
    subject: 'Event portrait request',
    sends:
      'coverage length, extra time, event date, venue, city, guest count, event type, name, phone, and email',
    note: 'The page form opens an email draft with these fields. Sending it does not reserve the date; Ayoub replies to confirm availability.',
  },
  proof: [
    { label: 'Live event gallery', href: eventPortraitProofGalleryUrl },
    { label: 'Portrait work', href: '/portfolio/portraits/' },
    {
      label: 'Workshop attendee portraits',
      href: '/portfolio/muslim-business-chamber-2026/',
    },
  ],
}

export const eventPortraitDescription = `Tampa event photography with a gallery that updates within minutes. Portraits included. The host pays; guests get photos at no charge. From ${formatUsd(headlineStartingPrice(eventPortraitOffer))}.`
