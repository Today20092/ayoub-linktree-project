import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import { gallerySessionCookie, verifyGallerySession } from '@/lib/gallery-auth'
import {
  getGallerySettings,
  insertPendingGuestPhoto,
  pendingGuestKey,
} from '@/lib/gallery-data'
import {
  acceptedGalleryImage,
  fittedGalleryDimensions,
  MAX_GALLERY_UPLOAD_BYTES,
  safeGalleryFilename,
} from '@/lib/gallery-upload'

export const prerender = false

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })

export const POST: APIRoute = async ({ params, request }) => {
  const eventSlug = params.slug
  if (!eventSlug) return json({ error: 'Gallery not found.' }, 404)

  const event = await getEntry('portfolio', eventSlug)
  if (!event?.data.eventGallery) {
    return json({ error: 'Gallery not found.' }, 404)
  }

  const settings = await getGallerySettings(env.GALLERY_DB, eventSlug)
  if (!settings?.uploads_enabled) {
    return json({ error: 'Uploads are not open for this gallery.' }, 403)
  }

  const token = gallerySessionCookie(request)
  if (
    !token ||
    !env.GALLERY_SESSION_SECRET ||
    !(await verifyGallerySession(token, eventSlug, env.GALLERY_SESSION_SECRET))
  ) {
    return json({ error: 'Enter the event upload password again.' }, 401)
  }

  const clientAddress =
    request.headers.get('cf-connecting-ip') ?? 'local-development'
  const rateLimit = await env.GALLERY_UPLOAD_RATE_LIMITER.limit({
    key: `${clientAddress}:${eventSlug}:${token.slice(-16)}`,
  })
  if (!rateLimit.success) {
    return json({ error: 'Too many uploads. Try again in a minute.' }, 429)
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_GALLERY_UPLOAD_BYTES + 64 * 1024) {
    return json({ error: 'Photo must be 20 MB or smaller.' }, 413)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json({ error: 'Invalid upload.' }, 400)
  }
  const file = formData.get('photo')
  if (!(file instanceof File) || !acceptedGalleryImage(file)) {
    return json(
      {
        error: 'Choose a JPEG, PNG, WebP, or HEIC photo no larger than 20 MB.',
      },
      415,
    )
  }

  try {
    const info = await env.IMAGES.info(file.stream())
    if (!('width' in info) || !('height' in info)) {
      return json({ error: 'This image format is not supported.' }, 415)
    }

    const dimensions = fittedGalleryDimensions(info.width, info.height)
    const transformed = await env.IMAGES.input(file.stream())
      .transform({ width: 2400, height: 2400, fit: 'scale-down' })
      .output({ format: 'image/jpeg', quality: 84 })
    const optimizedImage = await transformed.response().arrayBuffer()

    const id = crypto.randomUUID()
    const objectKey = pendingGuestKey(eventSlug, id)
    await env.GALLERY_PENDING.put(objectKey, optimizedImage, {
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: 'private, no-store',
      },
    })

    try {
      await insertPendingGuestPhoto(env.GALLERY_DB, {
        id,
        event_slug: eventSlug,
        object_key: objectKey,
        original_filename: safeGalleryFilename(file.name),
        width: dimensions.width,
        height: dimensions.height,
        alt: `Guest photo from ${event.data.title}`,
      })
    } catch (error) {
      await env.GALLERY_PENDING.delete(objectKey)
      throw error
    }

    console.log(
      JSON.stringify({
        message: 'guest photo uploaded',
        eventSlug,
        photoId: id,
      }),
    )
    return json({ id, status: 'pending' }, 201)
  } catch (error) {
    console.error(
      JSON.stringify({
        message: 'guest photo upload failed',
        eventSlug,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    return json({ error: 'The photo could not be processed.' }, 422)
  }
}
