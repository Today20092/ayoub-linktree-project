import { eventPortraitMarkdownSection } from './event-portrait-offer'
import { siteConfig } from './site-config'
export {
  cacheControlForPage,
  escapeXml,
  PUBLIC_PAGE_CACHE_CONTROL,
} from './public-delivery'

export function homepageMarkdown(origin = 'https://ayoubabed.xyz') {
  const { site } = siteConfig
  return `# ${site.siteName}

${site.pageDescription}

## Explore

- [Portfolio](${origin}/)
- [Event galleries](${origin}/galleries/)
- [About Ayoub](${origin}/about/)
- [Contact](${origin}/contact/)
- [Privacy](${origin}/privacy/)

## Contact

- [Email Ayoub](mailto:Ayoub@AyoubAbed.xyz)
- [Download the contact card](${origin}/AyoubA-Contact-Card.vcf)

${eventPortraitMarkdownSection(origin)}`
}
