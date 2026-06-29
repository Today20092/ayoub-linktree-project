export type FaceImage = ImageBitmap | HTMLImageElement

export function releaseFaceImage(image: FaceImage) {
  if ('close' in image) image.close()
}

export async function firstSuccessful<T>(
  attempts: Array<() => Promise<T>>,
): Promise<T> {
  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export async function decodeFaceImage(file: File): Promise<FaceImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Safari and older Chromium builds can reject supported camera images here.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}
