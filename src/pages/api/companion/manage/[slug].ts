import { Effect } from 'effect'
import {
  authorizeCompanion,
  companionLayer,
} from '@/lib/gallery-companion-workflow'
import { runGalleryHttp } from '@/lib/gallery-effect'
import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { companionJson } from '@/lib/gallery-companion'
import {
  readGalleryAdminEffect,
  writeGalleryAdminEffect,
} from '@/lib/gallery-admin-route'
import { galleryReaderEffects } from '@/lib/gallery-read'
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

export const GET: APIRoute = ({ request, params }) =>
  runGalleryHttp(
    Effect.gen(function* () {
      if (!(yield* authorizeCompanion(request, true))) return denied()
      if (new URL(request.url).searchParams.get('photo'))
        return yield* readGalleryAdminEffect(request, params.slug)
      const gallery = params.slug
        ? yield* galleryReaderEffects(env.GALLERY_DB).getAdminDetail(
            params.slug,
          )
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
    }).pipe(Effect.provide(companionLayer(env))),
    request.signal,
  )

export const POST: APIRoute = ({ request, params }) =>
  runGalleryHttp(
    Effect.gen(function* () {
      if (!(yield* authorizeCompanion(request, true))) return denied()
      return yield* writeGalleryAdminEffect(request, params.slug)
    }).pipe(Effect.provide(companionLayer(env))),
    request.signal,
  )
