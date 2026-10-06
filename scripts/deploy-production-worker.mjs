import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'
import { join } from 'node:path'
import { productionGalleryConfig } from './gallery-production-config.mjs'

const branch = execFileSync('git', ['branch', '--show-current'], {
  encoding: 'utf8',
}).trim()
const dirty = execFileSync('git', ['status', '--porcelain'], {
  encoding: 'utf8',
}).trim()
if (branch !== 'master' || dirty)
  throw new Error('Production deployment requires clean master.')
const generated = JSON.parse(
  await readFile(join('dist', 'server', 'wrangler.json'), 'utf8'),
)
const path = join('dist', 'server', 'wrangler.production.json')
await writeFile(
  path,
  JSON.stringify(productionGalleryConfig(generated), null, 2) + '\n',
)
await new Promise((resolve, reject) => {
  const args = ['wrangler', 'deploy', '--config', path]
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npx', ...args], {
          stdio: 'inherit',
        })
      : spawn('npx', args, { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', (code) =>
    code === 0
      ? resolve(undefined)
      : reject(new Error('Production deployment exited with ' + code)),
  )
})
