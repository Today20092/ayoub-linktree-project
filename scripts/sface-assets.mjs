import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const sfaceModel = JSON.parse(
  await readFile(resolve(root, 'src/data/sface-model.json'), 'utf8'),
)
export const sfaceDirectory = resolve(
  root,
  'public/face-models',
  sfaceModel.directory,
)

export async function prepareSfaceModels() {
  await mkdir(sfaceDirectory, { recursive: true })
  for (const model of [sfaceModel.detector, sfaceModel.recognizer]) {
    const destination = resolve(sfaceDirectory, model.filename)
    let data
    try {
      data = await readFile(destination)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const valid = (bytes) =>
      bytes && createHash('sha256').update(bytes).digest('hex') === model.sha256
    if (!valid(data)) {
      const response = await fetch(
        `https://media.githubusercontent.com/media/opencv/opencv_zoo/${sfaceModel.commit}/models/${model.folder}/${model.filename}`,
        { signal: AbortSignal.timeout(120_000) },
      )
      if (!response.ok)
        throw new Error(`Model download failed: ${response.status}`)
      data = Buffer.from(await response.arrayBuffer())
      if (!valid(data))
        throw new Error(`Model checksum mismatch: ${model.filename}`)
      await writeFile(`${destination}.tmp`, data)
      await rename(`${destination}.tmp`, destination)
    }
    const licensePath = resolve(sfaceDirectory, `${model.folder}-LICENSE.txt`)
    try {
      await readFile(licensePath)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const response = await fetch(
        `https://raw.githubusercontent.com/opencv/opencv_zoo/${sfaceModel.commit}/models/${model.folder}/LICENSE`,
        { signal: AbortSignal.timeout(30_000) },
      )
      if (!response.ok) throw new Error('Could not retrieve model license')
      await writeFile(licensePath, await response.text())
    }
  }
}
