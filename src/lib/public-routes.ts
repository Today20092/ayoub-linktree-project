import { eventPortraitOffer } from './event-portrait-offer'
import { podcastOffer } from './podcast-offer'

// The one list of static public pages. Dynamic routes (portfolio entries,
// galleries) are generated where they are served; see docs/website-content.md.
export type NavKey =
  'home' | 'galleries' | 'event-photography' | 'podcasts' | 'about' | 'contact'

export type PublicRoute = {
  /** Public path, with leading and trailing slash. */
  path: string
  /** Link text in the header and footer. */
  label: string
  /** Shorter label for the header nav; defaults to `label`. */
  navLabel?: string
  /** Header link; the key is what pages pass as `activeNav`. */
  nav?: NavKey
  footer?: true
  /** Listed in /sitemap.xml. */
  sitemap: true
  /** Gets the public page Cache-Control (public-delivery.ts). */
  cache?: true
  /** Listed under "Key pages" in /llms.txt. */
  keyPage?: { label: string; description: string }
}

export const publicRoutes: readonly PublicRoute[] = [
  {
    path: '/',
    label: 'Home',
    nav: 'home',
    sitemap: true,
    cache: true,
    keyPage: {
      label: 'Portfolio',
      description:
        'Selected photography, videography, podcast, and digital media projects.',
    },
  },
  {
    path: '/galleries/',
    label: 'Galleries',
    nav: 'galleries',
    sitemap: true,
    keyPage: {
      label: 'Event galleries',
      description: 'Public event and wedding photography galleries.',
    },
  },
  {
    path: eventPortraitOffer.path,
    label: eventPortraitOffer.name,
    navLabel: 'Events',
    nav: 'event-photography',
    footer: true,
    sitemap: true,
    cache: true,
  },
  {
    path: podcastOffer.path,
    label: 'Podcasts',
    nav: 'podcasts',
    footer: true,
    sitemap: true,
    cache: true,
  },
  {
    path: '/about/',
    label: 'About',
    nav: 'about',
    footer: true,
    sitemap: true,
    cache: true,
    keyPage: { label: 'About', description: 'Background and areas of work.' },
  },
  {
    path: '/contact/',
    label: 'Contact',
    nav: 'contact',
    footer: true,
    sitemap: true,
    cache: true,
    keyPage: {
      label: 'Contact',
      description: 'Email and contact card options.',
    },
  },
  {
    path: '/privacy/',
    label: 'Privacy',
    footer: true,
    sitemap: true,
    cache: true,
    keyPage: {
      label: 'Privacy',
      description:
        'Current site, gallery, analytics, and third-party resource information.',
    },
  },
]
