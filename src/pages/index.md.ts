import { homepageMarkdown, PUBLIC_PAGE_CACHE_CONTROL } from '../lib/discovery'
import type { APIContext } from 'astro'
import { siteConfig } from '../lib/site-config'

export const prerender = false

export function GET({ request, site }: APIContext) {
  return new Response(
    request.method === 'HEAD'
      ? null
      : homepageMarkdown(site!.origin, siteConfig.site),
    {
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': PUBLIC_PAGE_CACHE_CONTROL,
        link: '</index.md>; rel="alternate"; type="text/markdown"',
      },
    },
  )
}
