import { Effect } from 'effect'
import { storage, imageProcessing, runGalleryHttp } from './gallery-effect'
import { galleryMediaKey } from './gallery-media'
export function readGalleryMediaEffect(bucket: R2Bucket, path: string) {
  return Effect.gen(function* () {
    const key = galleryMediaKey(path)
    if (!key) return new Response('Not found', { status: 404 })
    const object = yield* storage(() => bucket.get(key))
    if (!object) return new Response('Not found', { status: 404 })
    const headers = new Headers({
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      etag: object.httpEtag,
      'content-length': String(object.size),
    })
    return new Response(object.body, { headers })
  })
}
export function readGalleryMedia(bucket: R2Bucket, path: string) {
  return runGalleryHttp(readGalleryMediaEffect(bucket, path))
}
export function transformGalleryMedia(
  bucket: R2Bucket,
  images: ImagesBinding,
  url: URL,
) {
  return runGalleryHttp(
    Effect.gen(function* () {
      const params = url.searchParams
      const source = yield* readGalleryMediaEffect(
        bucket,
        params.get('href') ?? '',
      )
      if (!source.ok || !source.body) return source
      const dimension = (key: string) => {
        const value = Number(params.get(key))
        return Number.isInteger(value) && value > 0
          ? Math.min(value, 2400)
          : undefined
      }
      const output = yield* imageProcessing(() =>
        images
          .input(source.body!)
          .transform({
            width: dimension('w'),
            height: dimension('h'),
            fit: params.get('fit') === 'contain' ? 'contain' : 'cover',
          })
          .output({
            format: 'image/webp',
            quality: Math.min(100, Math.max(1, Number(params.get('q')) || 85)),
          }),
      )
      const response = output.response()
      const headers = new Headers(response.headers)
      headers.set('cache-control', 'public, max-age=300')
      return new Response(response.body, { status: response.status, headers })
    }),
  )
}
