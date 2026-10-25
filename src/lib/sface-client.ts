import model from '../data/sface-model.json'
import type { FaceDetector, FaceImage } from './face-client'
import {
  alignedSfaceTensor,
  decodeYunet,
  yunetInput,
  type Landmark,
  type YunetFace,
} from './sface-core'
import * as ort from 'onnxruntime-web/wasm'

export function createSfaceDetector(): FaceDetector {
  let detector: ort.InferenceSession
  let recognizer: ort.InferenceSession
  return {
    async load() {
      ort.env.wasm.wasmPaths = {
        mjs: new URL(
          '/face-models/ort-1.23.0/ort-wasm-simd-threaded.mjs',
          location.href,
        ).href,
        wasm: new URL(
          '/face-models/ort-1.23.0/ort-wasm-simd-threaded.wasm',
          location.href,
        ).href,
      }
      ort.env.wasm.numThreads = 1
      const directory = `/face-models/${model.directory}/`
      ;[detector, recognizer] = await Promise.all([
        ort.InferenceSession.create(directory + model.detector.filename, {
          executionProviders: ['wasm'],
        }),
        ort.InferenceSession.create(directory + model.recognizer.filename, {
          executionProviders: ['wasm'],
        }),
      ])
    },
    async detect(image: FaceImage) {
      const scale = Math.min(1, 1800 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Image analysis is unavailable')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
      const detectionCanvas = document.createElement('canvas')
      detectionCanvas.width = detectionCanvas.height = 640
      const detectionContext = detectionCanvas.getContext('2d', {
        willReadFrequently: true,
      })
      if (!detectionContext) throw new Error('Face detection is unavailable')
      const detectorScale = 640 / Math.max(canvas.width, canvas.height)
      detectionContext.fillStyle = '#000'
      detectionContext.fillRect(0, 0, 640, 640)
      detectionContext.drawImage(
        canvas,
        0,
        0,
        canvas.width * detectorScale,
        canvas.height * detectorScale,
      )
      const input = new ort.Tensor(
        'float32',
        yunetInput(detectionContext.getImageData(0, 0, 640, 640)),
        [1, 3, 640, 640],
      )
      let detected: Record<string, ort.Tensor>
      try {
        detected = await detector.run({ [detector.inputNames[0]]: input })
      } finally {
        input.dispose()
      }
      let candidates: YunetFace[]
      try {
        candidates = decodeYunet(
          Object.fromEntries(
            Object.entries(detected).map(([name, value]) => [
              name,
              value.data as Float32Array,
            ]),
          ),
        )
      } finally {
        Object.values(detected).forEach((tensor) => tensor.dispose())
      }
      const face = []
      for (const candidate of candidates) {
        const landmarks: Landmark[] = candidate.landmarks.map(([x, y]) => [
          x / detectorScale,
          y / detectorScale,
        ])
        const input = new ort.Tensor(
          'float32',
          alignedSfaceTensor(pixels, landmarks),
          [1, 3, 112, 112],
        )
        let output: Record<string, ort.Tensor>
        try {
          output = await recognizer.run({ [recognizer.inputNames[0]]: input })
        } finally {
          input.dispose()
        }
        try {
          const embedding = Array.from(
            output[recognizer.outputNames[0]].data as Float32Array,
          )
          if (embedding.length !== 128 || !embedding.every(Number.isFinite))
            throw new Error('Invalid face descriptor')
          face.push({
            embedding,
            box: candidate.box.map((value) => value / detectorScale / scale),
          })
        } finally {
          Object.values(output).forEach((tensor) => tensor.dispose())
        }
      }
      return { face }
    },
  }
}
