export const MAX_GALLERY_UPLOAD_BYTES = 20 * 1024 * 1024
export const GALLERY_IMAGE_MAX_EDGE = 2400
export const GALLERY_IMAGE_QUALITY = 84

const GALLERY_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export function acceptedGalleryImage(file: File) {
  const submittedType = file.type.toLowerCase()
  const heicWithoutType = !submittedType && /\.(heic|heif)$/i.test(file.name)
  return (
    file.size > 0 &&
    file.size <= MAX_GALLERY_UPLOAD_BYTES &&
    (GALLERY_IMAGE_TYPES.has(submittedType) || heicWithoutType)
  )
}

export function fittedGalleryDimensions(width: number, height: number) {
  const scale = Math.min(
    1,
    GALLERY_IMAGE_MAX_EDGE / width,
    GALLERY_IMAGE_MAX_EDGE / height,
  )
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function safeGalleryFilename(filename: string) {
  return filename.split(/[\\/]/).at(-1)?.slice(0, 255) || 'guest-photo'
}

export function gallerySlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || crypto.randomUUID()
  )
}

export async function optimizedGalleryImage(file: File, images: ImagesBinding) {
  const info = await images.info(file.stream())
  if (!('width' in info) || !('height' in info)) {
    throw new Error('Unsupported image format.')
  }
  const dimensions = fittedGalleryDimensions(info.width, info.height)
  const transformed = await images
    .input(file.stream())
    .transform({
      width: GALLERY_IMAGE_MAX_EDGE,
      height: GALLERY_IMAGE_MAX_EDGE,
      fit: 'scale-down',
    })
    .output({ format: 'image/jpeg', quality: GALLERY_IMAGE_QUALITY })
  return {
    ...dimensions,
    buffer: await transformed.response().arrayBuffer(),
  }
}
