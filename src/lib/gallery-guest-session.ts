import { Effect } from 'effect'
import {
  createGallerySession,
  setGallerySessionCookie,
  validGalleryPassword,
  verifyGalleryPassword,
} from './gallery-auth'
import { galleryFailure, runGalleryHttp, validation } from './gallery-effect'
import type { GuestRequestReader } from './gallery-guest-request'
export type GuestSessionRequestDependencies = {
  reader: Pick<GuestRequestReader, 'getUploadContext'>
  sessionSecret?: string
  now(): number
  limit(input: { key: string }): Promise<{ success: boolean }>
}
export const guestSessionRequest = (
  request: Request,
  slug: string | undefined,
  dependencies: GuestSessionRequestDependencies,
) =>
  runGalleryHttp(
    Effect.gen(function* () {
      const eventSlug = slug
      if (!eventSlug)
        return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
      const context = yield* dependencies.reader.getUploadContext(eventSlug)
      if (!context)
        return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
      if (Number(request.headers.get('content-length') ?? 0) > 1024)
        return yield* Effect.fail(galleryFailure(413, 'Request is too large.'))
      const clientAddress =
        request.headers.get('cf-connecting-ip') ?? 'local-development'
      const rateLimit = yield* validation(
        () =>
          dependencies.limit({
            key: `${clientAddress}:${eventSlug}`,
          }),
        'Uploads are temporarily unavailable.',
        503,
      )
      if (!rateLimit.success)
        return yield* Effect.fail(
          galleryFailure(429, 'Too many attempts. Try again in a minute.'),
        )
      const text = yield* validation(() => request.text(), 'Invalid request.')
      if (new TextEncoder().encode(text).byteLength > 1024)
        return yield* Effect.fail(galleryFailure(413, 'Request is too large.'))
      const body: unknown = yield* validation(
        async () => JSON.parse(text),
        'Invalid request.',
      )
      const password =
        body && typeof body === 'object' && 'password' in body
          ? body.password
          : undefined
      if (!validGalleryPassword(password))
        return yield* Effect.fail(galleryFailure(401, 'Invalid password.'))
      const { settings } = context
      if (
        !settings?.uploads_enabled ||
        !settings.password_salt ||
        !settings.password_hash
      )
        return yield* Effect.fail(
          galleryFailure(403, 'Uploads are not open for this gallery.'),
        )
      const valid = yield* validation(
        () =>
          verifyGalleryPassword(
            password,
            settings.password_salt!,
            settings.password_hash!,
          ),
        'Invalid password.',
        401,
      )
      if (!valid)
        return yield* Effect.fail(galleryFailure(401, 'Invalid password.'))
      if (!dependencies.sessionSecret)
        return yield* Effect.fail(
          galleryFailure(503, 'Uploads are temporarily unavailable.'),
        )
      const token = yield* validation(
        () =>
          createGallerySession(
            eventSlug,
            dependencies.sessionSecret!,
            dependencies.now(),
          ),
        'Uploads are temporarily unavailable.',
        503,
      )
      return Response.json(
        { ok: true },
        {
          headers: {
            'cache-control': 'no-store',
            'set-cookie': setGallerySessionCookie(eventSlug, token),
          },
        },
      )
    }),
    request.signal,
  )
