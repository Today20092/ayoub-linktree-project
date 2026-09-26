import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const generatedConfigPath = join('dist', 'server', 'wrangler.json')
const previewConfigPath = join('dist', 'server', 'wrangler.preview.json')

const config = JSON.parse(await readFile(generatedConfigPath, 'utf8'))

config.name = 'ayoub-linktree-project-preview'
config.topLevelName = 'ayoub-linktree-project-preview'
config.workers_dev = true
config.d1_databases = [
  {
    binding: 'GALLERY_DB',
    database_name: 'ayoub-gallery-data-preview',
    database_id: '78b0eec4-1c28-497b-b6dd-699aedd8a8fc',
  },
]
config.r2_buckets = [
  {
    binding: 'GALLERY_PUBLIC',
    bucket_name: 'alphabravomedia-galleries-preview',
  },
  {
    binding: 'GALLERY_PENDING',
    bucket_name: 'alphabravomedia-gallery-uploads-preview',
  },
]
config.previews = undefined
config.env = undefined

await writeFile(previewConfigPath, `${JSON.stringify(config, null, 2)}\n`)

await new Promise((resolve, reject) => {
  const args = ['wrangler', 'deploy', '--config', previewConfigPath]
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npx', ...args], {
          stdio: 'inherit',
        })
      : spawn('npx', args, { stdio: 'inherit' })
  child.on('exit', (code) =>
    code === 0
      ? resolve()
      : reject(new Error(`wrangler deploy exited with ${code}`)),
  )
})
