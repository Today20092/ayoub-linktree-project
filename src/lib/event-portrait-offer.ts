export const eventPortraitPath = '/services/event-portraits/'

export const eventPortraitTitle =
  'Event photography in Tampa | Ayoub Abedrabbo.'

export const eventPortraitDescription =
  'Book event photography in Tampa and get a gallery that updates within minutes. Portrait sessions are included. The host pays. Guests receive photos at no charge. Coverage starts at $400.'

export const eventPortraitEmail = 'Ayoub@AyoubAbed.xyz'
export const eventPortraitPhone = '(813) 424-0606'
export const eventPortraitPhoneUri = '+1-813-424-0606'

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
- Phone: ${eventPortraitPhone}

### How to inquire

Send coverage length, extra time, event date, venue, city, guest count, event type, name, phone, and email to [${eventPortraitEmail}](mailto:${eventPortraitEmail}). The page form opens an email draft with these fields. Sending it does not reserve the date; Ayoub replies to confirm availability.

### Proof

- Live event gallery: https://ayoubabed.xyz/galleries/angels-birthday-party-2026/
- Portrait work: https://ayoubabed.xyz/portfolio/portraits/
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
        name: 'Ayoub Abedrabbo',
        url: pageUrl,
        email: eventPortraitEmail,
        telephone: eventPortraitPhoneUri,
        areaServed: eventPortraitAreaServed,
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
