import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import { flyerKey, galleryStatus, saveEventGallery } from '@/lib/gallery-data'
import {
  acceptedGalleryImage,
  gallerySlug,
  optimizedGalleryImage,
} from '@/lib/gallery-upload'

export const prerender = false

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })

const text = (formData: FormData, key: string) => {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export const POST: APIRoute = async ({ request }) => {
  if (
    !(await galleryAdminAuthorized(
      request,
      env.GALLERY_ADMIN_EMAIL,
      env.GALLERY_ACCESS_TEAM_DOMAIN,
      env.GALLERY_ACCESS_AUDS,
    ))
  ) {
    return json({ error: 'Forbidden.' }, 403)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json({ error: 'Invalid form submission.' }, 400)
  }

  const title = text(formData, 'title')
  const summary = text(formData, 'summary')
  if (!title || !summary) {
    return json({ error: 'Name and about information are required.' }, 400)
  }

  const eventSlug = gallerySlug(text(formData, 'slug') || title)
  const flyer = formData.get('flyer')
  let savedFlyer:
    | { object_key: string; width: number; height: number; alt: string }
    | undefined

  if (flyer instanceof File && flyer.size > 0) {
    if (!acceptedGalleryImage(flyer)) {
      return json({ error: 'Flyer must be a web image under 20 MB.' }, 415)
    }
    const optimized = await optimizedGalleryImage(flyer, env.IMAGES)
    const objectKey = flyerKey(eventSlug)
    await env.GALLERY_PUBLIC.put(objectKey, optimized.buffer, {
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=300',
      },
    })
    savedFlyer = {
      object_key: objectKey,
      width: optimized.width,
      height: optimized.height,
      alt: `${title} flyer`,
    }
  }

  await saveEventGallery(env.GALLERY_DB, {
    event_slug: eventSlug,
    title,
    event_date: text(formData, 'eventDate') || null,
    event_time: text(formData, 'eventTime') || null,
    event_venue: text(formData, 'eventVenue') || null,
    summary,
    category: text(formData, 'category') || 'Event Photography',
    coming_soon: text(formData, 'comingSoon') !== 'false',
    status:
      galleryStatus(text(formData, 'visibilityStatus')) ??
      (text(formData, 'comingSoon') === 'false' ? 'published' : 'coming_soon'),
    flyer: savedFlyer,
    cover: savedFlyer
      ? {
          src: `https://photos.ayoubabed.xyz/${savedFlyer.object_key}`,
          width: savedFlyer.width,
          height: savedFlyer.height,
          alt: savedFlyer.alt,
        }
      : undefined,
  })

  return json({ ok: true, eventSlug }, 201)
}
