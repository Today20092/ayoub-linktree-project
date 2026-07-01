import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import {
  createGallerySession,
  setGallerySessionCookie,
  validGalleryPassword,
  verifyGalleryPassword,
} from '@/lib/gallery-auth'
import { getGallerySettings } from '@/lib/gallery-data'

export const prerender = false

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...headers,
    },
  })

export const POST: APIRoute = async ({ params, request }) => {
  const eventSlug = params.slug
  if (!eventSlug) return json({ error: 'Gallery not found.' }, 404)

  const event = await getEntry('portfolio', eventSlug)
  if (!event?.data.eventGallery) {
    return json({ error: 'Gallery not found.' }, 404)
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 1024) {
    return json({ error: 'Request is too large.' }, 413)
  }

  const clientAddress =
    request.headers.get('cf-connecting-ip') ?? 'local-development'
  const rateLimit = await env.GALLERY_PASSWORD_RATE_LIMITER.limit({
    key: `${clientAddress}:${eventSlug}`,
  })
  if (!rateLimit.success) {
    return json({ error: 'Too many attempts. Try again in a minute.' }, 429)
  }

  let body: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 1024) {
      return json({ error: 'Request is too large.' }, 413)
    }
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
  const password =
    body && typeof body === 'object' && 'password' in body
      ? body.password
      : undefined
  if (!validGalleryPassword(password)) {
    return json({ error: 'Invalid password.' }, 401)
  }

  const settings = await getGallerySettings(env.GALLERY_DB, eventSlug)
  if (
    !settings?.uploads_enabled ||
    !settings.password_salt ||
    !settings.password_hash
  ) {
    return json({ error: 'Uploads are not open for this gallery.' }, 403)
  }

  const valid = await verifyGalleryPassword(
    password,
    settings.password_salt,
    settings.password_hash,
  )
  if (!valid) return json({ error: 'Invalid password.' }, 401)
  if (!env.GALLERY_SESSION_SECRET) {
    console.error(
      JSON.stringify({
        message: 'gallery session secret missing',
        eventSlug,
      }),
    )
    return json({ error: 'Uploads are temporarily unavailable.' }, 503)
  }

  const token = await createGallerySession(
    eventSlug,
    env.GALLERY_SESSION_SECRET,
  )
  return json({ ok: true }, 200, {
    'set-cookie': setGallerySessionCookie(eventSlug, token),
  })
}
