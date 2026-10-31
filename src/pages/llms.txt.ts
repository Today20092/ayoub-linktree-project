import type { APIContext } from 'astro'
import template from '../data/llms.txt?raw'

export function GET({ site }: APIContext) {
  return new Response(
    template.replaceAll('https://ayoubabed.xyz', site!.origin),
    {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    },
  )
}
