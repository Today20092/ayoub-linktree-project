import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { companionKnown } from '@/lib/gallery-companion-request'
export const prerender = false
export const POST: APIRoute = ({ request }) => companionKnown(request, env)
