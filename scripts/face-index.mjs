import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareSfaceModels } from './sface-assets.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await prepareSfaceModels()
const child = spawn(
  'uv',
  [
    'run',
    '--python',
    '3.12',
    '--script',
    resolve(root, 'scripts/face-index-sface.py'),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: 'inherit',
  },
)
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
