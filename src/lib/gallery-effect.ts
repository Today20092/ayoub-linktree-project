import { Cause, Effect, Exit, Result } from 'effect'

export type GalleryFailureKind =
  | 'Validation'
  | 'Authorization'
  | 'MissingResource'
  | 'Conflict'
  | 'ImageProcessing'
  | 'Storage'
  | 'Database'

// Only publicMessage is safe to send to clients. Causes are never logged.
export class GalleryFailure extends Error {
  readonly _tag = 'GalleryFailure'
  constructor(
    readonly kind: GalleryFailureKind,
    readonly publicMessage: string,
    readonly status: number,
    readonly original?: unknown,
  ) {
    super(publicMessage)
  }
}

export const galleryFailure = (status: number, message: string) =>
  new GalleryFailure(
    status === 401 || status === 403
      ? 'Authorization'
      : status === 404
        ? 'MissingResource'
        : status === 409
          ? 'Conflict'
          : 'Validation',
    message,
    status,
  )

export const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      new GalleryFailure(
        'Database',
        'Gallery data is temporarily unavailable.',
        503,
        cause,
      ),
  })
export const storage = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      new GalleryFailure(
        'Storage',
        'Gallery storage is temporarily unavailable.',
        503,
        cause,
      ),
  })
export const imageProcessing = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      new GalleryFailure(
        'ImageProcessing',
        'The photo could not be processed.',
        422,
        cause,
      ),
  })
export const validation = <A>(
  operation: () => Promise<A>,
  message: string,
  status = 400,
) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new GalleryFailure('Validation', message, status, cause),
  })
export const galleryJson = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export function quietCleanup<A>(
  operation: Effect.Effect<A, GalleryFailure>,
  log: (entry: Record<string, unknown>) => void = safeGalleryLog,
) {
  return Effect.catch(operation, (failure) =>
    Effect.sync(() =>
      log({ message: 'gallery cleanup failed', kind: failure.kind }),
    ),
  )
}
export const safeGalleryLog = (entry: Record<string, unknown>) =>
  console.error(JSON.stringify(entry))

// Promise-compatible use-case seam. HTTP callers use runGalleryHttp instead.
export async function runGalleryUseCase<A, E>(workflow: Effect.Effect<A, E>) {
  const result = await Effect.runPromise(Effect.result(workflow))
  if (Result.isFailure(result)) {
    const error = result.failure
    throw error instanceof GalleryFailure && error.original
      ? error.original
      : error
  }
  return result.success
}

export async function runGalleryHttp(
  workflow: Effect.Effect<Response, GalleryFailure>,
  signal?: AbortSignal,
  fallback?: { status: number; message: string },
) {
  const exit = await Effect.runPromiseExit(workflow, { signal })
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findError(exit.cause)
  if (Result.isSuccess(error)) {
    const failure = error.success
    if (failure.original)
      safeGalleryLog({
        message: 'gallery operation failed',
        kind: failure.kind,
      })
    return galleryJson(
      { error: fallback?.message ?? failure.publicMessage },
      fallback?.status ?? failure.status,
    )
  }
  // Do not serialize Cause, defects, request data, or service bindings.
  safeGalleryLog({ message: 'gallery request interrupted or defected' })
  return galleryJson({ error: 'Gallery request could not be completed.' }, 500)
}

export function readBoundedBody(
  request: Request,
  limit: number,
  oversized: string,
  missing: string,
) {
  return Effect.gen(function* () {
    const reader = request.body?.getReader()
    if (!reader) return yield* Effect.fail(galleryFailure(400, missing))
    return yield* Effect.ensuring(
      Effect.gen(function* () {
        const chunks: Uint8Array[] = []
        let size = 0
        while (true) {
          const { done, value } = yield* validation(
            () => reader.read(),
            'Invalid request.',
          )
          if (done) break
          size += value.length
          if (size > limit) {
            yield* quietCleanup(
              validation(() => reader.cancel(), 'Invalid request.'),
            )
            return yield* Effect.fail(galleryFailure(413, oversized))
          }
          chunks.push(value)
        }
        const bytes = new Uint8Array(size)
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
        return bytes
      }),
      Effect.sync(() => reader.releaseLock()),
    )
  })
}
