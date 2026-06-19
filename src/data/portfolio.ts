export type PortfolioImage = {
  src: string
  alt: string
  caption?: string
}

export type PortfolioLink = {
  label: string
  url: string
}

export type PortfolioVideo = {
  youtubeId: string
  label: string
  title: string
  publishedAt: string
  description: string
  comparisonRole?: 'before' | 'after'
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
  videos?: PortfolioVideo[]
}

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: 'ya-hala',
    title: 'Ya Hala with Haithum',
    status: 'complete',
    category: 'Web and field production',
    summary:
      'An ongoing web and travel-production partnership combining an automatically updated media platform with polished field video, color, lighting, and sound.',
    thumbnail: 'https://i.ytimg.com/vi/Aml_gBJ06ms/maxresdefault.jpg',
    heroImage: 'https://i.ytimg.com/vi/Aml_gBJ06ms/maxresdefault.jpg',
    imageAlt:
      'Ya Hala with Haithum filming on location for the Houston real estate episode',
    imageWidth: 1280,
    imageHeight: 720,
    overview: [
      'I designed, coded, and continue to maintain yahalausa.net as a living media hub for Ya Hala with Haithum. The site brings together current episodes, social channels, audience reach, locations visited, and collaboration information, with automated data updates that keep the experience current.',
      'The website was built with Astro, Tailwind CSS, shadcn/ui, T3 Chat, Codex CLI, and an AI-assisted development workflow. The source is public on GitHub.',
      'For field production, I travel with Haithum, help plan and set up each shoot, operate Sony a7S III and Lumix S5IIX cameras, build lighting with Aputure and Amaran fixtures, and record dialogue with Hollyland wireless microphones.',
      'After recording, I handle the technical finish in DaVinci Resolve: AI noise reduction, EQ, compression, limiting, dialogue cleanup, and color grading for Rec.709 Gamma 2.2 delivery. The editors then take care of the complete video assembly and editorial cut.',
    ],
    services: [
      'Website design and development',
      'Automated content updates',
      'Travel and field production',
      'Camera operation and lighting',
      'Location audio recording',
      'Color grading and audio finishing',
    ],
    role: 'Website developer, field videographer, camera and audio technician, colorist',
    collaborators: ['Haithum', 'Ya Hala editing team'],
    duration: 'October 2025–present',
    tools: [
      'Astro',
      'Tailwind CSS',
      'shadcn/ui',
      'T3 Chat',
      'Codex CLI',
      'DaVinci Resolve',
      'Sony a7S III',
      'Lumix S5IIX',
      'Hollyland wireless microphones',
      'Aputure and Amaran lighting',
    ],
    outcomes: [
      'A public, automatically updated website for the Ya Hala audience',
      'A repeatable travel-production workflow across cameras, lighting, and sound',
      'More consistent color, cleaner dialogue, and controlled audio delivery',
      'A clear production handoff from technical finishing to the editorial team',
    ],
    links: [
      {
        label: 'Visit yahalausa.net',
        url: 'https://yahalausa.net',
      },
      {
        label: 'View the website source on GitHub',
        url: 'https://github.com/Today20092/yahala-usa-linktree',
      },
      {
        label: 'Visit Ya Hala on YouTube',
        url: 'https://www.youtube.com/@YaHalaUSA',
      },
    ],
    videos: [
      {
        youtubeId: 'T3kQ0gAQMf0',
        label: 'Before working together',
        title: 'الوجه الآخر لمدينة لوس أنجلوس… المدينة الأشهر في العالم',
        publishedAt: '2025-04-14',
        description:
          'Published before our collaboration, this episode provides a baseline for the earlier camera, color, lighting, and sound quality.',
        comparisonRole: 'before',
      },
      {
        youtubeId: 'Aml_gBJ06ms',
        label: 'After production improvements',
        title:
          'الحقيقة وراء أرخص منزل في أمريكا… جولة داخل سوق العقارات في هيوستن',
        publishedAt: '2026-03-30',
        description:
          'A later production showing the refined recording workflow, cleaner dialogue, controlled lighting, Rec.709 Gamma 2.2 color, and finished audio.',
        comparisonRole: 'after',
      },
      {
        youtubeId: 'z-b4CHPFHEk',
        label: 'First collaboration',
        title: 'المدارس الإسلامية في أمريكا: الحقيقة التي لا تعرفها!',
        publishedAt: '2025-10-03',
        description:
          'One of the first Ya Hala episodes I recorded after joining the production.',
      },
      {
        youtubeId: 'nRdhwaluBEQ',
        label: 'Early collaboration',
        title:
          'سر لا يعرفه المهاجرون: تأمين صحي مجاني ومزايا لا تُصدق في أمريكا!',
        publishedAt: '2025-10-06',
        description:
          'An early follow-up production that helps establish when our ongoing work began.',
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
