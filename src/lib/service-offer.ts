// Shared shape and renderers for every Service offer. Each service is plain
// data (see event-portrait-offer.ts, podcast-offer.ts); this module derives its
// JSON-LD, agent-readable Markdown, and email draft so prices live in one place.

// The only public contact and inquiry address on the site.
export const inquiryEmail = 'inquiry@ayoubabed.xyz'

// Alpha Bravo Media Google Business Profile listing (#91/#92).
export const mapsListingUrl = 'https://maps.app.goo.gl/7r3JFHfe32ubHtKa7'
const mapsCidUrl = 'https://www.google.com/maps?cid=7799557622400498050'

export const ownerName = 'Ayoub Abedrabbo'

export const formatUsd = (amount: number) =>
  `$${amount.toLocaleString('en-US')}`

export const tampaAreaServed = {
  '@type': 'GeoCircle',
  geoMidpoint: {
    '@type': 'GeoCoordinates',
    latitude: 27.9506,
    longitude: -82.4572,
  },
  geoRadius: 48280, // 30 miles in meters
  description: 'Within 30 miles of Tampa, Florida',
}

export type PriceLine = {
  name: string
  /** Whole US dollars. Format with formatUsd. */
  price: number
  /** Extra prices only: what the price is charged for, e.g. "for each extra hour". */
  note?: string
}

export type ServiceOffer = {
  /** JSON-LD name and Markdown heading. */
  name: string
  /** Public page path, with leading and trailing slash. */
  path: string
  serviceType: string
  /** What each starting price covers, e.g. "per episode". */
  unit?: string
  startingPrices: readonly PriceLine[]
  extraPrices?: readonly PriceLine[]
  /** Markdown bullets for agents, without the leading "- ". */
  facts: readonly string[]
  inquiry: {
    /** Email subject prefix. */
    subject: string
    /** What a request should contain, completing "Send ... to <email>". */
    sends: string
    note: string
  }
  /** Absolute URLs, or site paths starting with "/". */
  proof: readonly { label: string; href: string }[]
}

export const headlineStartingPrice = (offer: ServiceOffer) =>
  Math.min(...offer.startingPrices.map((line) => line.price))

const originOf = (site: string | URL) => new URL(site).origin
const personId = (site: string | URL) => `${originOf(site)}/#person`
const businessId = (site: string | URL) => `${originOf(site)}/#business`

export function personEntity(site: string | URL) {
  const origin = originOf(site)
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: ownerName,
    email: inquiryEmail,
    url: `${origin}/`,
  }
}

export function businessEntity(site: string | URL) {
  return {
    '@type': 'ProfessionalService',
    '@id': businessId(site),
    // Matches the Google Business Profile title so Maps can tie the listing to the site.
    name: 'Alpha Bravo Media',
    alternateName: ownerName,
    founder: { '@id': personId(site) },
    url: `${originOf(site)}/`,
    email: inquiryEmail,
    areaServed: tampaAreaServed,
    sameAs: [mapsListingUrl],
    hasMap: mapsCidUrl,
  }
}

export function offerStructuredData(offer: ServiceOffer, pageUrl: string) {
  const offerNode = (line: PriceLine, description: string) => ({
    '@type': 'Offer',
    name: line.name,
    price: line.price,
    priceCurrency: 'USD',
    description,
    url: pageUrl,
  })
  const starting = ['Starting price', offer.unit].filter(Boolean).join(' ')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      personEntity(pageUrl),
      businessEntity(pageUrl),
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        name: offer.name,
        serviceType: offer.serviceType,
        url: pageUrl,
        provider: { '@id': businessId(pageUrl) },
        areaServed: tampaAreaServed,
        offers: [
          ...offer.startingPrices.map((line) => offerNode(line, starting)),
          ...(offer.extraPrices ?? []).map((line) =>
            offerNode(line, `Starting price ${line.note ?? ''}`.trim()),
          ),
        ],
      },
    ] as const,
  }
}

export function offerMarkdown(offer: ServiceOffer, origin: string) {
  const prices = offer.startingPrices
    .map((line) => `${formatUsd(line.price)} for ${line.name}`)
    .join(', ')
  const extras = (offer.extraPrices ?? [])
    .map((line) =>
      `, plus ${formatUsd(line.price)} ${line.note ?? ''}`.trimEnd(),
    )
    .join('')
  const href = (url: string) => (url.startsWith('/') ? `${origin}${url}` : url)
  return `## ${offer.name}

- Page: ${origin}${offer.path}
- Starting prices${offer.unit ? ` ${offer.unit}` : ''}: ${prices}${extras}
${offer.facts.map((fact) => `- ${fact}`).join('\n')}
- Email: ${inquiryEmail}

### How to inquire

Send ${offer.inquiry.sends} to [${inquiryEmail}](mailto:${inquiryEmail}). ${offer.inquiry.note}

### Proof

${offer.proof.map((item) => `- ${item.label}: ${href(item.href)}`).join('\n')}
`
}

/** Email draft to the inquiry address; `detail` completes the subject, `body` is plain text. */
export function offerMailto(offer: ServiceOffer, detail: string, body: string) {
  return `mailto:${inquiryEmail}?subject=${encodeURIComponent(`${offer.inquiry.subject}: ${detail}`)}&body=${encodeURIComponent(body)}`
}
