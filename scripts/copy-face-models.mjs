import { cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'node_modules/@vladmandic/human/models')
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
