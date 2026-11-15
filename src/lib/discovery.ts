import { eventPortraitOffer } from './event-portrait-offer'
import { podcastOffer } from './podcast-offer'
import { publicRoutes } from './public-routes'
import { inquiryEmail, offerMarkdown } from './service-offer'
import type { SiteInfo } from './site-config'
export {
  cacheControlForPage,
  escapeXml,
  PUBLIC_PAGE_CACHE_CONTROL,
} from './public-delivery'

// Callers pass siteConfig.site; keeping the YAML import out lets tsx tests load this module.
type DiscoverySite = Pick<SiteInfo, 'siteName' | 'pageDescription'>

const serviceOffers = [eventPortraitOffer, podcastOffer]

const keyPages = publicRoutes.flatMap((route) =>
  route.keyPage ? [{ ...route.keyPage, path: route.path }] : [],
)

const keyPageLinks = (origin: string) =>
  keyPages
    .map(
      (page) => `- [${page.label}](${origin}${page.path}): ${page.description}`,
    )
    .join('\n')

const offersMarkdown = (origin: string) =>
  serviceOffers.map((offer) => offerMarkdown(offer, origin)).join('\n')

export function homepageMarkdown(origin: string, site: DiscoverySite) {
  return `# ${site.siteName}

${site.pageDescription}

## Explore

${keyPageLinks(origin)}

## Contact

- [Email Ayoub](mailto:${inquiryEmail})
- [Download the contact card](${origin}/AyoubA-Contact-Card.vcf)

${offersMarkdown(origin)}`
}

export function llmsText(origin: string, site: DiscoverySite) {
  return `# ${site.siteName}

${site.pageDescription}

## Key pages

${keyPageLinks(origin)}

${offersMarkdown(origin)}`
}
