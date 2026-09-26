import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { companionAuthorized, companionJson } from '@/lib/gallery-companion'
import { readGalleryAdmin, writeGalleryAdmin } from '@/lib/gallery-admin-route'
import { galleryReader } from '@/lib/gallery-read'
import { galleryObjectUrl } from '@/lib/gallery-media'

export const prerender = false
const denied = () =>
  companionJson(
    {
      error:
        'Create a pairing key with gallery management enabled, then reconnect in Settings.',
    },
    403,
  )

export const GET: APIRoute = async ({ request, params }) => {
  if (!(await companionAuthorized(request, env.GALLERY_DB, true)))
    return denied()
  if (new URL(request.url).searchParams.get('photo'))
    return readGalleryAdmin(request, params.slug)
  const gallery = params.slug
    ? await galleryReader(env.GALLERY_DB).getAdminDetail(params.slug)
    : undefined
  if (!gallery) return companionJson({ error: 'Gallery not found.' }, 404)
  const absolute = (src: string) => new URL(src, request.url).toString()
  return companionJson({
    event: {
      title: gallery.title,
      summary: gallery.summary,
      category: gallery.category,
      eventDate: gallery.eventDate?.toISOString().slice(0, 10) ?? '',
      eventTime: gallery.eventTime ?? '',
      eventVenue: gallery.eventVenue ?? '',
      visibilityStatus: gallery.visibility,
      comingSoon: gallery.comingSoon,
      coverSrc: gallery.cover ? absolute(gallery.cover.src) : '',
    },
    settings: {
      uploadsEnabled: Boolean(gallery.settings?.uploads_enabled),
      hasPassword: Boolean(gallery.settings?.password_hash),
    },
    invites: gallery.invites,
    photos: [
      ...gallery.guests.map((photo) => ({
        id: photo.id,
        kind: photo.status,
        label: photo.original_filename,
        src: absolute(galleryObjectUrl(photo.object_key)),
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
      })),
      ...gallery.uploadedPhotos.map((photo) => ({
        id: photo.id,
        kind: 'uploaded',
        label: photo.original_filename,
        src: absolute(galleryObjectUrl(photo.object_key)),
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
      })),
      ...gallery.professional.map((photo) => ({
        id: photo.filename,
        kind: photo.hidden ? 'hidden' : 'professional',
        label: photo.filename,
        src: photo.src,
        width: photo.width,
        height: photo.height,
        alt: photo.alt,
      })),
    ],
  })
}

export const POST: APIRoute = async ({ request, params }) => {
  if (!(await companionAuthorized(request, env.GALLERY_DB, true)))
    return denied()
  return writeGalleryAdmin(request, params.slug)
}
