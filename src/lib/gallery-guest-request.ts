import { Effect } from 'effect'
import { matchesSharingToken } from './gallery-sharing'
import {
  acceptedGalleryImage,
  MAX_GALLERY_UPLOAD_BYTES,
} from './gallery-upload'
import {
  guestUploadWorkflow,
  guestUploadLayer,
  type GuestUploadServices,
} from './gallery-guest-workflow'
import {
  galleryFailure,
  runGalleryHttp,
  validation,
  GalleryFailure,
} from './gallery-effect'
export type GuestRequestReader = {
  get(
    slug: string,
  ): Effect.Effect<{ title: string } | undefined, GalleryFailure>
  getUploadContext(slug: string): Effect.Effect<
    | {
        settings?: {
          upload_token?: string | null
          uploads_enabled: number | boolean
          password_salt?: string | null
          password_hash?: string | null
        } | null
      }
    | undefined,
    GalleryFailure
  >
  getInviteContext(
    slug: string,
    token: string,
  ): Effect.Effect<
    | { invite: { token: string; guest_name: string; event_slug: string } }
    | undefined,
    GalleryFailure
  >
}
export type GuestUploadRequestDependencies = {
  reader: GuestRequestReader
  sessionSecret?: string
  now(): number
  limit(input: { key: string }): Promise<{ success: boolean }>
  services: GuestUploadServices
}
export function guestUploadRequest(
  request: Request,
  slug: string | undefined,
  dependencies: GuestUploadRequestDependencies,
) {
  const workflow = Effect.gen(function* () {
    const eventSlug = slug
    if (!eventSlug)
      return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
    const reader = dependencies.reader
    const gallery = yield* reader.get(eventSlug)
    if (!gallery)
      return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
    const inviteToken = new URL(request.url).searchParams.get('invite')?.trim()
    const inviteContext = inviteToken
      ? yield* reader.getInviteContext(eventSlug, inviteToken)
      : undefined
    const invite = inviteContext?.invite
    if (inviteToken && !invite)
      return yield* Effect.fail(
        galleryFailure(403, 'This upload link is not valid.'),
      )
    const uploadToken = new URL(request.url).searchParams.get('upload')
    if (!invite) {
      const settings = (yield* reader.getUploadContext(eventSlug))?.settings
      if (!settings?.uploads_enabled)
        return yield* Effect.fail(
          galleryFailure(403, 'Uploads are not open for this gallery.'),
        )
      if (!matchesSharingToken(uploadToken, settings.upload_token))
        return yield* Effect.fail(
          galleryFailure(401, 'Ask the host for a valid submission link.'),
        )
    }
    const clientAddress =
      request.headers.get('cf-connecting-ip') ?? 'local-development'
    const rateToken = yield* validation(
      async () =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(inviteToken || uploadToken || ''),
            ),
          ),
          (byte) => byte.toString(16).padStart(2, '0'),
        ).join(''),
      'Uploads are temporarily unavailable.',
      503,
    )
    const rateLimit = yield* validation(
      () =>
        dependencies.limit({
          key: `${clientAddress}:${eventSlug}:${rateToken}`,
        }),
      'Uploads are temporarily unavailable.',
      503,
    )
    if (!rateLimit.success)
      return yield* Effect.fail(
        galleryFailure(429, 'Too many uploads. Try again in a minute.'),
      )
    if (
      Number(request.headers.get('content-length') ?? 0) >
      MAX_GALLERY_UPLOAD_BYTES + 64 * 1024
    )
      return yield* Effect.fail(
        galleryFailure(413, 'Photo must be 20 MB or smaller.'),
      )
    const formData = yield* validation(
      () => request.formData(),
      'Invalid upload.',
    )
    const file = formData.get('photo')
    if (!(file instanceof File) || !acceptedGalleryImage(file))
      return yield* Effect.fail(
        galleryFailure(
          415,
          'Choose a JPEG, PNG, WebP, or HEIC photo no larger than 20 MB.',
        ),
      )
    // Preserve the guest upload's existing processing response for dependency failures.
    return yield* Effect.catch(
      guestUploadWorkflow({
        eventSlug,
        eventTitle: gallery.title,
        file,
        invite,
      }),
      (failure) =>
        Effect.fail(
          new GalleryFailure(
            failure.kind,
            'The photo could not be processed.',
            422,
            failure.original,
          ),
        ),
    )
  }).pipe(Effect.provide(guestUploadLayer(dependencies.services)))
  return runGalleryHttp(workflow, request.signal)
}
