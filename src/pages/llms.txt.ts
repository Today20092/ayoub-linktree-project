import type { APIContext } from 'astro'
import { llmsText } from '../lib/discovery'
import { siteConfig } from '../lib/site-config'

export function GET({ site }: APIContext) {
  return new Response(llmsText(site!.origin, siteConfig.site), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
