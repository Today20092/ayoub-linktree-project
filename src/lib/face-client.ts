export type FaceImage = ImageBitmap | HTMLImageElement

export type DetectedFace = {
  embedding: number[]
  box: [number, number, number, number]
}

export type FaceAnalysis = {
  image: FaceImage
  faces: DetectedFace[]
}

type FaceDetectionResult = {
  face: Array<{ embedding?: number[]; box: number[] }>
}

export type FaceDetector = {
  load(): Promise<unknown>
  detect(image: FaceImage): Promise<FaceDetectionResult>
}

export type FaceBackend = {
  name: string
  create(): Promise<FaceDetector>
}

type FaceAnalyzerOptions = {
  backends: FaceBackend[]
  decode?: (file: File) => Promise<FaceImage>
  modelTimeout?: number
  analysisTimeout?: number
}

export type FaceAnalyzer = {
  prepare(): Promise<boolean>
  analyze(file: File): Promise<FaceAnalysis | undefined>
  cancel(result?: FaceAnalysis): void
}

const MODEL_TIMEOUT = 30_000
const ANALYSIS_TIMEOUT = 30_000

export class FaceTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FaceTimeoutError'
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new FaceTimeoutError(message)),
          milliseconds,
        )
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

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

export function createFaceAnalyzer({
  backends,
  decode = decodeFaceImage,
  modelTimeout = MODEL_TIMEOUT,
  analysisTimeout = ANALYSIS_TIMEOUT,
}: FaceAnalyzerOptions): FaceAnalyzer {
  type LoadedDetector = { backend: FaceBackend; detector: FaceDetector }
  let loaded: LoadedDetector | undefined
  let detectorLoad: Promise<LoadedDetector> | undefined
  const failedBackends = new Set<string>()
  let attempt = 0

  function resetFailedBackends() {
    if (!loaded && failedBackends.size === backends.length) {
      failedBackends.clear()
    }
  }

  async function loadDetector() {
    if (loaded) return loaded
    if (detectorLoad) return detectorLoad

    detectorLoad = firstSuccessful(
      backends
        .filter((backend) => !failedBackends.has(backend.name))
        .map((backend) => async () => {
          const candidate = await backend.create()
          try {
            await withTimeout(
              candidate.load(),
              modelTimeout,
              'Face recognition took too long to prepare.',
            )
            loaded = { backend, detector: candidate }
            return loaded
          } catch (error) {
            failedBackends.add(backend.name)
            throw error
          }
        }),
    )

    try {
      return await detectorLoad
    } finally {
      detectorLoad = undefined
    }
  }

  async function detect(image: FaceImage) {
    const current = await loadDetector()
    const detectWithTimeout = (selected: LoadedDetector) =>
      withTimeout(
        selected.detector.detect(image),
        analysisTimeout,
        'Face analysis took too long.',
      )

    try {
      return await detectWithTimeout(current)
    } catch {
      failedBackends.add(current.backend.name)
      loaded = undefined
      const fallback = await loadDetector()
      try {
        return await detectWithTimeout(fallback)
      } catch (error) {
        failedBackends.add(fallback.backend.name)
        loaded = undefined
        throw error
      }
    }
  }

  return {
    async prepare() {
      const currentAttempt = ++attempt
      resetFailedBackends()
      try {
        await loadDetector()
        return currentAttempt === attempt
      } catch (error) {
        if (currentAttempt !== attempt) return false
        throw error
      }
    },

    async analyze(file) {
      const currentAttempt = ++attempt
      resetFailedBackends()
      let image: FaceImage | undefined
      const decodePromise = decode(file)

      try {
        image = await withTimeout(
          decodePromise,
          analysisTimeout,
          'Opening this photo took too long.',
        )
        if (currentAttempt !== attempt) {
          releaseFaceImage(image)
          return undefined
        }

        const result = await detect(image)
        if (currentAttempt !== attempt) {
          releaseFaceImage(image)
          return undefined
        }

        return {
          image,
          faces: result.face
            .filter((face) => face.embedding?.length === 1024)
            .map((face) => ({
              embedding: [...(face.embedding ?? [])],
              box: face.box as [number, number, number, number],
            })),
        }
      } catch (error) {
        if (image) releaseFaceImage(image)
        if (!image && error instanceof FaceTimeoutError) {
          void decodePromise.then(releaseFaceImage, () => {})
        }
        if (currentAttempt !== attempt) return undefined
        throw error
      }
    },

    cancel(result) {
      attempt += 1
      if (result) releaseFaceImage(result.image)
    },
  }
}

type HumanModule = typeof import('@vladmandic/human')

function humanBackend(name: 'webgl' | 'wasm'): FaceBackend {
  return {
    name,
    async create() {
      const module: HumanModule = await import('@vladmandic/human')
      const human = new module.Human({
        backend: name,
        warmup: 'none',
        wasmPath: '/face-models/',
        modelBasePath: '/face-models/',
        cacheSensitivity: 0,
        face: {
          enabled: true,
          detector: { enabled: true, maxDetected: 10, rotation: true },
          mesh: { enabled: true },
          description: { enabled: true },
          emotion: { enabled: false },
          iris: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
      })

      return {
        load: () => human.load(),
        detect: (image) => human.detect(image),
      }
    },
  }
}

export const webglFaceBackend = humanBackend('webgl')
export const wasmFaceBackend = humanBackend('wasm')

export function createBrowserFaceAnalyzer() {
  return createFaceAnalyzer({
    backends: [webglFaceBackend, wasmFaceBackend],
  })
}
