import { homepageMarkdown, PUBLIC_PAGE_CACHE_CONTROL } from '../lib/discovery'

export const prerender = false

export function GET({ request }: { request: Request }) {
  return new Response(request.method === 'HEAD' ? null : homepageMarkdown(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': PUBLIC_PAGE_CACHE_CONTROL,
    },
  })
}
