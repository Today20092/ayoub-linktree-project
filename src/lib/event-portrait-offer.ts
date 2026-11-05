export const eventPortraitPath = '/services/event-portraits/'

// Portfolio entries that prove the event photography offer (#99).
export const eventPortraitProofProjects: ReadonlySet<string> = new Set([
  'portraits',
  'muslim-business-chamber-2026',
])

export const eventPortraitTitle =
  'Event photography in Tampa | Ayoub Abedrabbo.'

export const eventPortraitDescription =
  'Tampa event photography with a gallery that updates within minutes. Portraits included. The host pays; guests get photos at no charge. From $400.'

export const eventPortraitEmail = 'Ayoub@AyoubAbed.xyz'

// Alpha Bravo Media Google Business Profile listing (#91/#92).
export const eventPortraitMapsUrl = 'https://maps.app.goo.gl/7r3JFHfe32ubHtKa7'
const eventPortraitMapsCidUrl =
  'https://www.google.com/maps?cid=7799557622400498050'

export const eventPortraitPackages = [
  { hours: '1 hour', sessions: 'About 20', price: '$400', amount: 400 },
  { hours: '2 hours', sessions: 'About 40', price: '$550', amount: 550 },
  { hours: '3 hours', sessions: 'About 60', price: '$700', amount: 700 },
  { hours: '4 hours', sessions: 'About 80', price: '$850', amount: 850 },
] as const

export const eventPortraitExtraHour = {
  hours: 'Extra hour',
  price: '$150',
  amount: 150,
} as const

export function eventPortraitMarkdownSection() {
  const prices = eventPortraitPackages
    .map((option) => `${option.price} for ${option.hours}`)
    .join(', ')
  return `## Event photography

- Page: https://ayoubabed.xyz${eventPortraitPath}
- Starting prices: ${prices}, plus ${eventPortraitExtraHour.price} for each extra hour
- Who: Ayoub Abedrabbo, event photographer in Tampa, Florida
- Area: within 30 miles of Tampa, Florida. Travel within 30 miles of Tampa is included.
- Event photography for the booking. Portrait sessions are included.
- Gallery: each photo shows up within minutes of being taken.
- Guests do not pay. The host books and pays.
- No backdrop, no flash, and no lighting kit.
- Videography: custom quote. No published video prices.
- Email: ${eventPortraitEmail}
- Google Maps: ${eventPortraitMapsUrl}

### How to inquire

Send coverage length, extra time, event date, venue, city, guest count, event type, name, phone, and email to [${eventPortraitEmail}](mailto:${eventPortraitEmail}). The page form opens an email draft with these fields. Sending it does not reserve the date; Ayoub replies to confirm availability.

### Proof

- Live event gallery: https://ayoubabed.xyz/galleries/angels-birthday-party-2026/
- Portrait work: https://ayoubabed.xyz/portfolio/portraits/
- Workshop attendee portraits: https://ayoubabed.xyz/portfolio/muslim-business-chamber-2026/
`
}

const eventPortraitAreaServed = {
  '@type': 'GeoCircle',
  geoMidpoint: {
    '@type': 'GeoCoordinates',
    latitude: 27.9506,
    longitude: -82.4572,
  },
  geoRadius: 48280, // 30 miles in meters
  description: 'Within 30 miles of Tampa, Florida',
}

export function eventPortraitStructuredData(pageUrl: string) {
  const businessId = `${pageUrl}#business`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': businessId,
        // Matches the Google Business Profile title so Maps can tie the listing to this page.
        name: 'Alpha Bravo Media',
        alternateName: 'Ayoub Abedrabbo',
        founder: { '@type': 'Person', name: 'Ayoub Abedrabbo' },
        url: pageUrl,
        email: eventPortraitEmail,
        areaServed: eventPortraitAreaServed,
        sameAs: [eventPortraitMapsUrl],
        hasMap: eventPortraitMapsCidUrl,
      },
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: 'Event photography',
        serviceType:
          'Event photography with portrait sessions and a live gallery',
        url: pageUrl,
        provider: { '@id': businessId },
        areaServed: eventPortraitAreaServed,
        offers: [
          ...eventPortraitPackages.map((option) => ({
            '@type': 'Offer',
            name: option.hours,
            price: option.amount,
            priceCurrency: 'USD',
            description: 'Starting price',
            url: pageUrl,
          })),
          {
            '@type': 'Offer',
            name: eventPortraitExtraHour.hours,
            price: eventPortraitExtraHour.amount,
            priceCurrency: 'USD',
            description: 'Starting price for each extra hour',
            url: pageUrl,
          },
        ],
      },
    ],
  }
}
