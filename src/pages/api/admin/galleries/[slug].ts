import type { APIRoute } from 'astro'
import { getEntry } from 'astro:content'
import { env } from 'cloudflare:workers'

import {
  galleryAdminAuthorized,
  parseGalleryAdminAction,
} from '@/lib/gallery-admin'
import { hashGalleryPassword, validGalleryPassword } from '@/lib/gallery-auth'
import {
  deleteGuestPhoto,
  getGallerySettings,
  getGuestPhoto,
  hideProfessionalPhoto,
  listGuestPhotos,
  listHiddenPhotos,
  publishGuestPhoto,
  publishedGuestKey,
  restoreProfessionalPhoto,
  saveGallerySettings,
} from '@/lib/gallery-data'

export const prerender = false

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })

async function eventGallery(eventSlug: string | undefined) {
  if (!eventSlug) return
  const event = await getEntry('portfolio', eventSlug)
  return event?.data.eventGallery ? event : undefined
}

export const GET: APIRoute = async ({ params, request }) => {
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
  const event = await eventGallery(params.slug)
  if (!event) return json({ error: 'Gallery not found.' }, 404)

  const photoId = new URL(request.url).searchParams.get('photo')
  if (photoId) {
    const photo = await getGuestPhoto(env.GALLERY_DB, photoId)
    if (!photo || photo.event_slug !== event.id) {
      return json({ error: 'Photo not found.' }, 404)
    }
    const bucket =
      photo.status === 'pending' ? env.GALLERY_PENDING : env.GALLERY_PUBLIC
    const object = await bucket.get(photo.object_key)
    if (!object) return json({ error: 'Photo not found.' }, 404)
    return new Response(object.body, {
      headers: {
        'content-type': 'image/jpeg',
        'cache-control': 'private, no-store',
        'content-length': String(object.size),
      },
    })
  }

  const [settings, guests, hidden] = await Promise.all([
    getGallerySettings(env.GALLERY_DB, event.id),
    listGuestPhotos(env.GALLERY_DB, event.id),
    listHiddenPhotos(env.GALLERY_DB, event.id),
  ])
  return json({ settings, guests, hidden })
}

export const POST: APIRoute = async ({ params, request }) => {
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
  const event = await eventGallery(params.slug)
  if (!event) return json({ error: 'Gallery not found.' }, 404)

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 4096) {
    return json({ error: 'Request is too large.' }, 413)
  }
  let value: unknown
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 4096) {
      return json({ error: 'Request is too large.' }, 413)
    }
    value = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON.' }, 400)
  }
  const action = parseGalleryAdminAction(value)
  if (!action) return json({ error: 'Invalid action.' }, 400)

  if (action.action === 'settings') {
    const existing = await getGallerySettings(env.GALLERY_DB, event.id)
    const newPassword = action.password?.trim()
    if (newPassword && !validGalleryPassword(newPassword)) {
      return json({ error: 'Password must be 8 to 128 characters.' }, 400)
    }
    if (
      action.uploadsEnabled &&
      !newPassword &&
      (!existing?.password_hash || !existing.password_salt)
    ) {
      return json({ error: 'Set a password before enabling uploads.' }, 400)
    }
    const password = newPassword
      ? await hashGalleryPassword(newPassword)
      : undefined
    await saveGallerySettings(
      env.GALLERY_DB,
      event.id,
      action.uploadsEnabled,
      password,
    )
    return json({ ok: true })
  }

  if (
    action.action === 'approveGuest' ||
    action.action === 'rejectGuest' ||
    action.action === 'removeGuest'
  ) {
    const photo = await getGuestPhoto(env.GALLERY_DB, action.photoId)
    if (!photo || photo.event_slug !== event.id) {
      return json({ error: 'Photo not found.' }, 404)
    }

    if (action.action === 'approveGuest') {
      if (photo.status === 'published') return json({ ok: true })
      const publicKey = publishedGuestKey(event.id, photo.id)
      const pending = await env.GALLERY_PENDING.get(photo.object_key)
      if (pending) {
        await env.GALLERY_PUBLIC.put(publicKey, pending.body, {
          httpMetadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=300',
          },
        })
      } else if (!(await env.GALLERY_PUBLIC.head(publicKey))) {
        return json({ error: 'Pending image is missing.' }, 409)
      }
      const alt = action.alt?.trim().slice(0, 240) || photo.alt
      await publishGuestPhoto(env.GALLERY_DB, photo.id, publicKey, alt)
      await env.GALLERY_PENDING.delete(photo.object_key)
    } else {
      if (action.action === 'rejectGuest' && photo.status !== 'pending') {
        return json({ error: 'Published photos must be removed instead.' }, 409)
      }
      const bucket =
        photo.status === 'pending' ? env.GALLERY_PENDING : env.GALLERY_PUBLIC
      await bucket.delete(photo.object_key)
      await deleteGuestPhoto(env.GALLERY_DB, photo.id)
    }

    console.log(
      JSON.stringify({
        message: 'gallery guest moderation completed',
        eventSlug: event.id,
        action: action.action,
        photoId: photo.id,
      }),
    )
    return json({ ok: true })
  }

  if (
    action.action !== 'hideProfessional' &&
    action.action !== 'restoreProfessional'
  ) {
    return json({ error: 'Invalid action.' }, 400)
  }

  const inlineImages = event.data.gallery.filter(
    (
      image,
    ): image is Extract<
      (typeof event.data.gallery)[number],
      { filename: string }
    > => 'filename' in image,
  )
  const available = new Set(inlineImages.map(({ filename }) => filename))
  if (!available.has(action.filename)) {
    return json({ error: 'Professional photo not found.' }, 404)
  }

  if (action.action === 'hideProfessional') {
    await hideProfessionalPhoto(env.GALLERY_DB, event.id, action.filename)
  } else {
    await restoreProfessionalPhoto(env.GALLERY_DB, event.id, action.filename)
  }
  return json({ ok: true })
}
