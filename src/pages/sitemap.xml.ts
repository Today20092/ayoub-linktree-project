import { getCollection } from 'astro:content'
import { env } from 'cloudflare:workers'
import type { APIContext } from 'astro'

import { escapeXml, PUBLIC_PAGE_CACHE_CONTROL } from '../lib/discovery'
import { galleryReader } from '../lib/gallery-read'
import { sortPortfolioProjects } from '../lib/portfolio-order'

export const prerender = false

export async function GET({ site }: APIContext) {
  const baseUrl = site ?? new URL('https://ayoubabed.xyz/')
  const [portfolio, galleries] = await Promise.all([
    getCollection('portfolio'),
    galleryReader(env.GALLERY_DB).listPublic(),
  ])
  const paths = new Set([
    '/',
    '/about/',
    '/contact/',
    '/privacy/',
    '/galleries/',
    ...portfolio
      .filter((entry) => entry.data.status === 'complete')
      .sort(sortPortfolioProjects)
      .map((entry) => `/portfolio/${entry.id}/`),
    ...galleries.map((gallery) => `/galleries/${gallery.id}/`),
  ])
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...paths]
  .map(
    (path) =>
      `  <url><loc>${escapeXml(new URL(path, baseUrl).toString())}</loc></url>`,
  )
  .join('\n')}
</urlset>
`
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': PUBLIC_PAGE_CACHE_CONTROL,
    },
  })
}
