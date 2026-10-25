import { cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareSfaceModels } from './sface-assets.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'node_modules/@vladmandic/human/models')
const wasmSource = resolve(
  root,
  'node_modules/@tensorflow/tfjs-backend-wasm/dist',
)
const destination = resolve(root, 'public/face-models')

await mkdir(destination, { recursive: true })
for (const filename of [
  'blazeface.json',
  'blazeface.bin',
  'facemesh.json',
  'facemesh.bin',
  'faceres.json',
  'faceres.bin',
]) {
  await cp(resolve(source, filename), resolve(destination, filename))
}

for (const filename of [
  'tfjs-backend-wasm.wasm',
  'tfjs-backend-wasm-simd.wasm',
  'tfjs-backend-wasm-threaded-simd.wasm',
]) {
  await cp(resolve(wasmSource, filename), resolve(destination, filename))
}

await prepareSfaceModels()
const ort = resolve(root, 'node_modules/onnxruntime-web/dist')
const ortDestination = resolve(destination, 'ort-1.23.0')
await mkdir(ortDestination, { recursive: true })
for (const filename of [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
]) {
  await cp(resolve(ort, filename), resolve(ortDestination, filename))
}
