import { siteConfig } from './site-config'
export {
  cacheControlForPage,
  escapeXml,
  PUBLIC_PAGE_CACHE_CONTROL,
} from './public-delivery'

export function homepageMarkdown() {
  const { site } = siteConfig
  return `# ${site.siteName}

${site.pageDescription}

## Explore

- [Portfolio](https://ayoubabed.xyz/)
- [Event galleries](https://ayoubabed.xyz/galleries/)
- [About Ayoub](https://ayoubabed.xyz/about/)
- [Contact](https://ayoubabed.xyz/contact/)
- [Privacy](https://ayoubabed.xyz/privacy/)

## Contact

- [Email Ayoub](mailto:Ayoub@AyoubAbed.xyz)
- [Call Ayoub](tel:+18134240606)
- [Download the contact card](https://ayoubabed.xyz/AyoubA-Contact-Card.vcf)
`
}
