import {
  formatUsd,
  headlineStartingPrice,
  type ServiceOffer,
} from './service-offer'

export const podcastPath = '/services/podcast-production/'

export const podcastTitle =
  'Mobile podcast production in Tampa | Ayoub Abedrabbo'

export type PodcastPackage = {
  id: 'record' | 'growth' | 'full'
  name: string
  startingPrice: number
  tagline: string
  delivery: string
  featured?: boolean
  features: string[]
}

export const podcastPackages: PodcastPackage[] = [
  {
    id: 'record',
    name: 'Record & Polish',
    startingPrice: 450,
    tagline: 'Show up and talk. Walk away with a finished episode.',
    delivery: '3 days',
    features: [
      'On-location recording, up to 2 hours',
      'All gear brought, set up, and packed down',
      'Full episode, start to finish, no cuts',
      'Professional color grade',
      'Full audio mastering',
      'YouTube description',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    startingPrice: 750,
    tagline: 'One recording becomes dozens of chances to be discovered.',
    delivery: '3 days',
    featured: true,
    features: [
      'Everything in Record & Polish',
      '3 titles and 3 thumbnails for YouTube testing',
      '25–50 AI shorts from OpusClip',
      'Shorts auto-published to YouTube, Instagram, and Facebook',
    ],
  },
  {
    id: 'full',
    name: 'Full Service',
    startingPrice: 1000,
    tagline: 'Know exactly what is working after every episode.',
    delivery: '72 hours',
    features: [
      'Everything in Growth',
      'Analytics report after every episode',
      'YouTube, Facebook, and Instagram compared with the last period',
      'Recommended next steps in every report',
    ],
  },
]

export type PodcastComparisonRow = {
  name: string
  values: Record<PodcastPackage['id'], boolean | string>
}

// Shared by the comparison table and the add-on so the two prices can't drift.
const shortsPackPrice = 150

export const podcastComparison: PodcastComparisonRow[] = [
  {
    name: 'On-location recording',
    values: {
      record: 'Up to 2 hours',
      growth: 'Up to 2 hours',
      full: 'Up to 2 hours',
    },
  },
  {
    name: '4K video, 32-bit float audio',
    values: { record: true, growth: true, full: true },
  },
  {
    name: 'Color grade and audio mastering',
    values: { record: true, growth: true, full: true },
  },
  {
    name: 'YouTube description',
    values: { record: true, growth: true, full: true },
  },
  {
    name: '3 titles + 3 thumbnails',
    values: { record: false, growth: true, full: true },
  },
  {
    name: '25–50 AI shorts, auto-published',
    values: {
      record: `+${formatUsd(shortsPackPrice)}`,
      growth: true,
      full: true,
    },
  },
  {
    name: 'Analytics report',
    values: { record: false, growth: false, full: true },
  },
  {
    name: 'Delivery',
    values: { record: '3 days', growth: '3 days', full: '72 hours' },
  },
]

export type PodcastAddOn = {
  id: string
  label: string
  price: number
  unit?: string
  description: string
  onlyFor?: PodcastPackage['id'][]
}

export const podcastAddOns: PodcastAddOn[] = [
  {
    id: 'shorts',
    label: 'AI shorts pack',
    price: shortsPackPrice,
    description:
      '25–50 OpusClip shorts, auto-published. Included in Growth and Full Service.',
    onlyFor: ['record'],
  },
  {
    id: 'livestream',
    label: 'Livestream',
    price: 350,
    description: 'Live to YouTube and Facebook while recording in 4K.',
  },
  {
    id: 'platform',
    label: 'Extra livestream platform',
    price: 50,
    unit: 'each',
    description: 'Add Instagram, TikTok, or another destination.',
  },
  {
    id: 'graphics',
    label: 'Show graphics',
    price: 200,
    unit: 'one time',
    description:
      'Host name titles and an animated sponsor carousel, reused on every livestream.',
  },
  {
    id: 'rush',
    label: 'Under-24-hour delivery',
    price: 150,
    description: 'Your finished episode the next day.',
  },
  {
    id: 'raw',
    label: 'Raw files',
    price: 150,
    description: 'Original camera and isolated microphone files.',
  },
]

export const podcastExtraHour = 100
export const podcastMistakeCutsPerHour = 100
export const podcastTravelNote =
  'Travel within 30 miles of Tampa included. 30–60 miles: $75 flat. Farther: custom quote.'

export const podcastFaqs = [
  {
    question: 'What do I need to prepare?',
    answer:
      'Your topic and your guests. I bring the camera, microphones, 32-bit float recorder, lights, stands, and cables, set everything up at your table, and pack it down when you finish. I do not write scripts or plan content.',
  },
  {
    question: 'Do you edit out mistakes?',
    answer: `Packages deliver the full episode, start to finish, with only the start and end trimmed. If you want mistakes, retakes, or dead air cut out, add mistake cuts for $${podcastMistakeCutsPerHour} per recorded hour.`,
  },
  {
    question: 'How are the shorts made?',
    answer:
      'OpusClip finds the strongest moments and produces 25–50 shorts depending on episode length. They are auto-published without manual review. Volume is the strategy: the platforms only push the clips that land, so a few breakout shorts make the batch worth it.',
  },
  {
    question: 'What is in the analytics report?',
    answer:
      'Views, follows, watch time, and click-through across YouTube, Facebook, and Instagram, compared with the previous period, plus what to try next. Figures from platform summaries or screenshots are labeled unverified.',
  },
  {
    question: 'What equipment do you use?',
    answer:
      'Panasonic Lumix S5IIX with a Sigma f/2.8 wide zoom, Zoom F8n Pro 32-bit float recorder, RØDE PodMic and Shure MV7+ microphones (up to four voices), two Aputure Amaran 60-watt lights on C-stands. Color is graded in DaVinci Resolve.',
  },
  {
    question: 'Where can we record?',
    answer: `At your location, or I can suggest free spaces. If you want a rented venue, I can help find one and the venue fee is billed at cost. ${podcastTravelNote}`,
  },
  {
    question: 'How do booking and payment work?',
    answer:
      'Half up front reserves your date and the rest is due at delivery. Booking four or more episodes, or coming back as a repeat client, earns a discount. Recordings longer than 2 hours are $100 per extra hour.',
  },
]

export const podcastGuarantee =
  'Your episode on time, or the rush fee is waived and your next episode’s shorts are free.'

const platformAddOn = podcastAddOns.find((a) => a.id === 'platform')
if (!platformAddOn) throw new Error('Missing livestream platform add-on')
export const podcastExtraPlatformPrice = platformAddOn.price

export const podcastOffer: ServiceOffer = {
  name: 'Mobile podcast production',
  path: podcastPath,
  serviceType: 'On-location video podcast recording and post-production',
  unit: 'per episode',
  startingPrices: podcastPackages.map((p) => ({
    name: p.name,
    price: p.startingPrice,
  })),
  extraPrices: [
    {
      name: 'Extra recording hour',
      price: podcastExtraHour,
      note: 'for each recorded hour over 2',
    },
  ],
  facts: [
    'Who: Ayoub Abedrabbo, mobile podcast producer in Tampa, Florida',
    'Mobile 4K video podcast production: gear brought to your location, color-graded video, mastered audio, and AI shorts.',
    `Add-ons: ${podcastAddOns.map((a) => `${a.label} ${formatUsd(a.price)}`).join(', ')}`,
    `Area: ${podcastTravelNote}`,
  ],
  inquiry: {
    subject: 'Podcast inquiry',
    sends:
      'show name, recording city, episodes per month, preferred first recording date, and the package and add-ons you want',
    note: 'The price estimator on the page opens an email draft with these fields. Ayoub replies to confirm availability.',
  },
  proof: [
    {
      label: 'Chop Shop Show case study',
      href: '/portfolio/chop-shop-show-podcast/',
    },
  ],
}

export const podcastDescription = `Mobile 4K video podcast production in Tampa. I bring the gear, record on location, and deliver a color-graded, audio-mastered episode with AI shorts. From ${formatUsd(headlineStartingPrice(podcastOffer))} per episode.`

export type PodcastEstimateInput = {
  packageId: PodcastPackage['id']
  addOns: string[]
  extraHours: number
  extraPlatforms: number
  mistakeCuts: boolean
}

// Starting estimate for one episode; travel and discounts are quoted separately.
export function estimatePodcastPrice(input: PodcastEstimateInput): number {
  const pkg = podcastPackages.find((p) => p.id === input.packageId)
  if (!pkg) throw new Error(`Unknown package: ${input.packageId}`)
  const addOns = podcastAddOns
    .filter((a) => input.addOns.includes(a.id) && a.id !== 'platform')
    .filter((a) => !a.onlyFor || a.onlyFor.includes(pkg.id))
    .reduce((sum, a) => sum + a.price, 0)
  const livestream = input.addOns.includes('livestream')
  const platforms = livestream
    ? input.extraPlatforms * podcastExtraPlatformPrice
    : 0
  const hours = 2 + input.extraHours
  return (
    pkg.startingPrice +
    addOns +
    platforms +
    input.extraHours * podcastExtraHour +
    (input.mistakeCuts ? hours * podcastMistakeCutsPerHour : 0)
  )
}
