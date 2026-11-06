import type { APIContext } from 'astro'
import template from '../data/llms.txt?raw'
import { eventPortraitProofGalleryUrl } from '../lib/event-portrait-offer'

export function GET({ site }: APIContext) {
  return new Response(
    template
      .split(eventPortraitProofGalleryUrl)
      .map((part) => part.replaceAll('https://ayoubabed.xyz', site!.origin))
      .join(eventPortraitProofGalleryUrl),
    {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    },
  )
}
