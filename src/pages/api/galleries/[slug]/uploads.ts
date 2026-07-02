import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import { gallerySessionCookie, verifyGallerySession } from '@/lib/gallery-auth'
import {
  adminPhotoKey,
  getEventGallery,
  getGalleryInvite,
  getGallerySettings,
  insertGalleryPhoto,
  insertPendingGuestPhoto,
  markGalleryInviteUsed,
  pendingGuestKey,
} from '@/lib/gallery-data'
import {
  acceptedGalleryImage,
  MAX_GALLERY_UPLOAD_BYTES,
  optimizedGalleryImage,
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

  const staticEvent = await getEntry('portfolio', eventSlug)
  const dynamicEvent = staticEvent?.data.eventGallery
    ? undefined
    : await getEventGallery(env.GALLERY_DB, eventSlug)
  if (!staticEvent?.data.eventGallery && !dynamicEvent) {
    return json({ error: 'Gallery not found.' }, 404)
  }
  if (dynamicEvent?.status === 'hidden') {
    return json({ error: 'Gallery not found.' }, 404)
  }
  const eventTitle =
    staticEvent?.data.title ?? dynamicEvent?.title ?? 'the event'
  const inviteToken = new URL(request.url).searchParams.get('invite')?.trim()
  const invite = inviteToken
    ? await getGalleryInvite(env.GALLERY_DB, inviteToken)
    : null
  if (inviteToken && invite?.event_slug !== eventSlug) {
    return json({ error: 'This upload link is not valid.' }, 403)
  }

  const sessionToken = gallerySessionCookie(request)
  if (!invite) {
    const settings = await getGallerySettings(env.GALLERY_DB, eventSlug)
    if (!settings?.uploads_enabled) {
      return json({ error: 'Uploads are not open for this gallery.' }, 403)
    }
    if (
      !sessionToken ||
      !env.GALLERY_SESSION_SECRET ||
      !(await verifyGallerySession(
        sessionToken,
        eventSlug,
        env.GALLERY_SESSION_SECRET,
      ))
    ) {
      return json({ error: 'Enter the event upload password again.' }, 401)
    }
  }

  const clientAddress =
    request.headers.get('cf-connecting-ip') ?? 'local-development'
  const rateLimit = await env.GALLERY_UPLOAD_RATE_LIMITER.limit({
    key: `${clientAddress}:${eventSlug}:${(inviteToken || sessionToken || '').slice(-16)}`,
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
    const optimized = await optimizedGalleryImage(file, env.IMAGES)
    const id = crypto.randomUUID()
    const objectKey = invite
      ? adminPhotoKey(eventSlug, id)
      : pendingGuestKey(eventSlug, id)
    const bucket = invite ? env.GALLERY_PUBLIC : env.GALLERY_PENDING
    await bucket.put(objectKey, optimized.buffer, {
      httpMetadata: {
        contentType: 'image/jpeg',
        cacheControl: invite ? 'public, max-age=300' : 'private, no-store',
      },
    })

    try {
      if (invite) {
        await insertGalleryPhoto(env.GALLERY_DB, {
          id,
          event_slug: eventSlug,
          object_key: objectKey,
          original_filename: safeGalleryFilename(file.name),
          width: optimized.width,
          height: optimized.height,
          alt: `Photo from ${eventTitle} by ${invite.guest_name}`,
          uploader_name: invite.guest_name,
          source: 'guest',
        })
        await markGalleryInviteUsed(env.GALLERY_DB, invite.token)
      } else {
        await insertPendingGuestPhoto(env.GALLERY_DB, {
          id,
          event_slug: eventSlug,
          object_key: objectKey,
          original_filename: safeGalleryFilename(file.name),
          width: optimized.width,
          height: optimized.height,
          alt: `Guest photo from ${eventTitle}`,
        })
      }
    } catch (error) {
      await bucket.delete(objectKey)
      throw error
    }

    console.log(
      JSON.stringify({
        message: 'guest photo uploaded',
        eventSlug,
        photoId: id,
      }),
    )
    return json({ id, status: invite ? 'published' : 'pending' }, 201)
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
