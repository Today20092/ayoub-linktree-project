export const MAX_GALLERY_UPLOAD_BYTES = 20 * 1024 * 1024

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
  const scale = Math.min(1, 2400 / width, 2400 / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function safeGalleryFilename(filename: string) {
  return filename.split(/[\\/]/).at(-1)?.slice(0, 255) || 'guest-photo'
}
