export type PortfolioImage = {
  src: string
  alt: string
  caption?: string
}

export type PortfolioLink = {
  label: string
  url: string
}

export type PortfolioProject = {
  slug: string
  title: string
  status: 'complete' | 'placeholder'
  category: string
  summary: string
  thumbnail: string
  heroImage: string
  imageAlt: string
  imageWidth: number
  imageHeight: number
  overview?: string[]
  services?: string[]
  links: PortfolioLink[]
  role?: string
  collaborators?: string[]
  duration?: string
  tools?: string[]
  outcomes?: string[]
  gallery?: PortfolioImage[]
}

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: 'alphabravomedia',
    title: 'AlphaBravoMedia.co',
    status: 'complete',
    category: 'Media production',
    summary:
      'Monthly content retainers, video production, photography, editing, and repurposing for Tampa businesses.',
    thumbnail: '/previews/alphabravomedia-homepage.png',
    heroImage: '/previews/alphabravomedia-homepage.png',
    imageAlt:
      'AlphaBravoMedia website showing its media production services and client work',
    imageWidth: 1440,
    imageHeight: 1050,
    overview: [
      'AlphaBravoMedia helps Tampa businesses build a consistent media presence through ongoing production and content support.',
      'The work brings planning, production, editing, and repurposing into one practical system.',
    ],
    services: [
      'Monthly content retainers',
      'Video production',
      'Photography',
      'Editing',
      'Content repurposing',
    ],
    links: [
      {
        label: 'Visit website',
        url: 'https://alphabravomedia.co',
      },
    ],
  },
  {
    slug: 'omar-erchid-law-firm',
    title: 'Omar Erchid Law Firm',
    status: 'placeholder',
    category: 'Video production',
    summary:
      'Talking-head and client-facing videos for Erchid Law Firm and TitleTown Closing.',
    thumbnail: '/previews/client-work/omar-erchid-law-firm.webp',
    heroImage: '/previews/client-work/omar-erchid-law-firm.webp',
    imageAlt: 'Erchid Law Firm website about page',
    imageWidth: 1024,
    imageHeight: 640,
    services: [
      'Talking-head videos',
      'Client-facing informational videos',
      'YouTube video production',
    ],
    links: [
      { label: 'Website', url: 'https://erchidlaw.com/about-us/' },
      {
        label: 'Erchid Law Firm on YouTube',
        url: 'https://www.youtube.com/@erchidlawfirm/videos',
      },
      {
        label: 'TitleTown Closing on YouTube',
        url: 'https://www.youtube.com/@titletownclosing',
      },
    ],
  },
  {
    slug: 'ya-hala',
    title: 'Ya Hala',
    status: 'placeholder',
    category: 'Web and video production',
    summary:
      'Website development, travel videography, color grading, sound work, lighting, and microphone setup.',
    thumbnail: '/previews/client-work/ya-hala.webp',
    heroImage: '/previews/client-work/ya-hala.webp',
    imageAlt: 'Ya Hala with Haithum website',
    imageWidth: 1024,
    imageHeight: 800,
    services: [
      'Website design and development',
      'Videography',
      'Travel production',
      'Color grading',
      'Dialogue cleanup and mixing',
      'Lighting and microphone setup',
    ],
    links: [
      { label: 'Website', url: 'https://yahalausa.net' },
      { label: 'Recorded video', url: 'https://youtu.be/Aml_gBJ06ms' },
      {
        label: 'Video before our work together',
        url: 'https://youtu.be/E2H1HMGjfbk',
      },
    ],
  },
  {
    slug: 'lavena-health',
    title: 'Lavena Health',
    status: 'placeholder',
    category: 'Podcast production',
    summary: 'Recurring podcast production for Lavena Health.',
    thumbnail: '/previews/client-work/lavena-health.webp',
    heroImage: '/previews/client-work/lavena-health.webp',
    imageAlt: 'Lavena Wellness website homepage',
    imageWidth: 1024,
    imageHeight: 650,
    services: ['Recurring podcast production'],
    links: [
      { label: 'Website', url: 'https://lavenawell.com/' },
      {
        label: 'YouTube channel',
        url: 'https://www.youtube.com/@Lavenawellness',
      },
    ],
  },
  {
    slug: 'konan-bbq-podcast',
    title: 'Konan BBQ Podcast',
    status: 'placeholder',
    category: 'Podcast production',
    summary: 'Recurring production for the No Losses, Just Lessons podcast.',
    thumbnail: '/previews/client-work/konan-bbq-podcast.webp',
    heroImage: '/previews/client-work/konan-bbq-podcast.webp',
    imageAlt: 'No Losses, Just Lessons podcast playlist on YouTube',
    imageWidth: 1024,
    imageHeight: 800,
    services: ['Recurring podcast production'],
    links: [
      {
        label: 'Podcast playlist',
        url: 'https://www.youtube.com/playlist?list=PLrt6pzGb0bEzmrs5Ik6CyPtdncsQJRvlI',
      },
    ],
  },
  {
    slug: 'bayaan-academy',
    title: 'Bayaan Academy',
    status: 'placeholder',
    category: 'School photography',
    summary:
      'Multi-year staff, student yearbook, and graduation photography for Bayaan Academy.',
    thumbnail: '/previews/client-work/bayaan-academy.webp',
    heroImage: '/previews/client-work/bayaan-academy.webp',
    imageAlt: 'Bayaan Academy website showing graduating students',
    imageWidth: 1024,
    imageHeight: 760,
    services: [
      'Staff headshots',
      'Yearbook photography for more than 200 students',
      'Graduation photography',
      'Multi-year photography support',
    ],
    links: [{ label: 'Website', url: 'https://www.bayaanacademy.org/' }],
  },
  {
    slug: 'aya-academy',
    title: 'Aya Academy',
    status: 'placeholder',
    category: 'Event videography',
    summary: 'Graduation ceremony video production for Aya Academy.',
    thumbnail: '/previews/client-work/aya-academy.webp',
    heroImage: '/previews/client-work/aya-academy.webp',
    imageAlt: 'American Youth Academy website homepage',
    imageWidth: 1024,
    imageHeight: 620,
    services: ['Graduation ceremony videography'],
    links: [
      { label: 'Website', url: 'https://www.ayatampa.org/' },
      {
        label: 'Graduation video',
        url: 'https://youtu.be/79pB2SPVQBM',
      },
    ],
  },
  {
    slug: 'maan-academy',
    title: "Ma'an Academy",
    status: 'placeholder',
    category: 'Brand video',
    summary: "A video introducing Ma'an Academy and its work.",
    thumbnail: '/previews/client-work/maan-academy.webp',
    heroImage: '/previews/client-work/maan-academy.webp',
    imageAlt: "Ma'an Academy website homepage",
    imageWidth: 1024,
    imageHeight: 800,
    services: ['School showcase video'],
    links: [
      { label: 'Website', url: 'https://maanacademy.org/' },
      { label: 'Showcase video', url: 'https://youtu.be/zfEZwdZnUmc' },
    ],
  },
  {
    slug: 'arqam-academy',
    title: 'Arqam Academy',
    status: 'placeholder',
    category: 'Staff portraits',
    summary: 'Staff headshots and portraits for Arqam Academy.',
    thumbnail: '/previews/client-work/arqam-academy.webp',
    heroImage: '/previews/client-work/arqam-academy.webp',
    imageAlt: 'Arqam Academy staff page',
    imageWidth: 1024,
    imageHeight: 700,
    services: ['Staff headshots', 'Staff portraits'],
    links: [
      {
        label: 'Website',
        url: 'https://arqamsacademy.org/arqam-staff/',
      },
    ],
  },
]
