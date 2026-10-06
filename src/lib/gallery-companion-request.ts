import { Effect } from 'effect'
import {
  authorizeCompanion,
  companionLayer,
  knownHashes,
  receivePhoto,
  type CompanionBindings,
  type CompanionServices,
} from './gallery-companion-workflow'
import { contentHash } from './gallery-checksum'
import {
  database,
  galleryFailure,
  galleryJson,
  readBoundedBody,
  runGalleryHttp,
  validation,
  type GalleryFailure,
} from './gallery-effect'
import { MAX_GALLERY_UPLOAD_BYTES } from './gallery-upload'

type UploadReader = {
  getAdmin(
    slug: string,
  ):
    | Promise<{ title: string } | undefined>
    | Effect.Effect<{ title: string } | undefined, GalleryFailure>
}
export function companionUpload(
  request: Request,
  bindings: CompanionBindings,
  reader: UploadReader,
  overrides: Partial<
    Pick<CompanionServices, 'now' | 'createId' | 'optimize' | 'log'>
  > = {},
) {
  const workflow = Effect.gen(function* () {
    if (!(yield* authorizeCompanion(request)))
      return yield* Effect.fail(galleryFailure(401, 'Pair this device again.'))
    const url = new URL(request.url)
    const slug = url.searchParams.get('gallery') ?? ''
    const hash = request.headers.get('x-content-sha256') ?? ''
    if (!/^[a-f0-9]{64}$/.test(hash))
      return yield* Effect.fail(galleryFailure(400, 'Invalid photo checksum.'))
    const event = yield* Effect.suspend(() => {
      const read = reader.getAdmin(slug)
      return Effect.isEffect(read) ? read : database(() => read)
    })
    if (!event)
      return yield* Effect.fail(galleryFailure(404, 'Gallery not found.'))
    if (request.headers.get('content-type') !== 'image/jpeg')
      return yield* Effect.fail(
        galleryFailure(415, 'Only JPEG photos are supported.'),
      )
    if (
      Number(request.headers.get('content-length')) > MAX_GALLERY_UPLOAD_BYTES
    )
      return yield* Effect.fail(galleryFailure(413, 'Photo exceeds 20 MB.'))
    const bytes = yield* readBoundedBody(
      request,
      MAX_GALLERY_UPLOAD_BYTES,
      'Photo exceeds 20 MB.',
      'Missing photo.',
    )
    if (
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      (yield* Effect.promise(() =>
        contentHash(bytes.buffer as ArrayBuffer),
      )) !== hash
    )
      return yield* Effect.fail(
        galleryFailure(400, 'Photo changed or is not a JPEG. Scan again.'),
      )
    const file = new File(
      [bytes as Uint8Array<ArrayBuffer>],
      url.searchParams.get('filename') || 'photo.jpg',
      { type: 'image/jpeg' },
    )
    return yield* receivePhoto({ id: slug, title: event.title }, file, hash)
  }).pipe(Effect.provide(companionLayer(bindings, overrides)))
  return runGalleryHttp(workflow, request.signal)
}
export function companionKnown(request: Request, bindings: CompanionBindings) {
  return runGalleryHttp(
    Effect.gen(function* () {
      if (!(yield* authorizeCompanion(request)))
        return yield* Effect.fail(
          galleryFailure(401, 'Pair this device again.'),
        )
      const bytes = yield* readBoundedBody(
        request,
        40_000,
        'Too many checksums.',
        'Missing checksums.',
      )
      const input: { gallery?: unknown; hashes?: unknown } = yield* validation(
        async () => JSON.parse(new TextDecoder().decode(bytes)),
        'Invalid request.',
      )
      if (
        !input ||
        typeof input.gallery !== 'string' ||
        !Array.isArray(input.hashes) ||
        input.hashes.length > 500 ||
        input.hashes.some(
          (hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash),
        )
      )
        return yield* Effect.fail(galleryFailure(400, 'Invalid checksums.'))
      return galleryJson({
        known: yield* knownHashes(input.gallery, input.hashes),
      })
    }).pipe(Effect.provide(companionLayer(bindings))),
    request.signal,
  )
}
