import { Effect } from 'effect'
import { galleryFailure, runGalleryHttp } from './gallery-effect'
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
      if (!slug || !(yield* dependencies.reader.getUploadContext(slug)))
        return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
      return yield* Effect.fail(
        galleryFailure(
          410,
          'Guest passwords have been replaced by submission links. Ask the host for a new link.',
        ),
      )
    }),
    request.signal,
  )
