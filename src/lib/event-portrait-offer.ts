export const eventPortraitPath = '/services/event-portraits/'

export const eventPortraitTitle =
  'Instant event portraits in Tampa | Ayoub Abedrabbo.'

export const eventPortraitDescription =
  'Ayoub Abedrabbo makes instant guest portraits at events in Tampa, Florida, in natural light. Event pictures from the same booking can be included in the gallery. The host pays. Guests receive photos at no charge. Starting at $400.'

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

export const eventPortraitAnswers = [
  {
    question: 'How much does three hours cost?',
    answer:
      'Three hours starts at $700. The other starting prices are $400 for 1 hour, $550 for 2 hours, and $850 for 4 hours. Each extra hour starts at $150. Coverage past 4 hours, up to 8 hours, is a custom quote.',
  },
  {
    question: 'Who pays?',
    answer:
      'The host books and pays. Guests receive their photos at no charge.',
  },
  {
    question: 'Is travel included?',
    answer:
      'Travel is included within 30 miles of Tampa, Florida. Travel farther than that is a custom quote.',
  },
  {
    question: 'How do I request a quote?',
    answer:
      'The inquiry form on the page is how to request a quote. It sends the inquiry to Ayoub@ayoubabed.xyz. The email and phone on the page are Ayoub@AyoubAbed.xyz and (813) 424-0606.',
  },
  {
    question: 'What kind of coverage is this?',
    answer:
      'This booking is instant guest portraits in natural light: there is no backdrop and no light. Guests get a portrait on the spot to use for a profile and to remember the event. Event pictures from the same booking can be included in the gallery.',
  },
] as const

export function eventPortraitMarkdownSection() {
  const prices = eventPortraitPackages
    .map((option) => `${option.price} for ${option.hours}`)
    .join(', ')
  return `## Instant event portraits

- Page: https://ayoubabed.xyz${eventPortraitPath}
- Starting prices: ${prices}, plus ${eventPortraitExtraHour.price} for each extra hour
- Travel: included within 30 miles of Tampa, Florida. Farther travel is a custom quote.
- Ayoub Abedrabbo makes instant guest portraits at events in Tampa, Florida, in natural light. Guests get a portrait on the spot to use for a profile and to remember the event.
- Event pictures from the same booking can be included in the gallery.
- About 20 portrait sessions an hour is a planning estimate.
- Gallery: each photo shows up within minutes of being taken.
- Guests do not pay. The host books and pays.
- Email: ${eventPortraitEmail}
- Phone: ${eventPortraitPhone}
`
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
        areaServed: {
          '@type': 'City',
          name: 'Tampa',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Tampa',
            addressRegion: 'FL',
            addressCountry: 'US',
          },
        },
      },
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: 'Instant guest portraits',
        serviceType: 'Instant guest portraits in natural light',
        description: eventPortraitDescription,
        url: pageUrl,
        provider: { '@id': businessId },
        areaServed: 'Tampa, Florida',
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
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        url: pageUrl,
        mainEntity: eventPortraitAnswers.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  }
}
