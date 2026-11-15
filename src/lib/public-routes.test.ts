import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { publicRoutes } from './public-routes'

// Pages deliberately not in the registry: error page, redirects, and the
// payments host. Dynamic ([param]) pages and the admin/api trees are skipped
// by the scan below.
const excludedPages = new Set([
  '404.astro',
  'services.astro', // 301 to the event photography page
  'payments.astro', // payments.ayoubabed.xyz only
  'portfolio/alphabravomedia.astro', // 301 to alphabravomedia.co
])
const excludedDirs = new Set(['admin', 'api'])

const pagesDir = join(process.cwd(), 'src/pages')

function astroPages(dir = ''): string[] {
  return readdirSync(join(pagesDir, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const rel = dir ? `${dir}/${entry.name}` : entry.name
      if (entry.isDirectory())
        return excludedDirs.has(entry.name) ? [] : astroPages(rel)
      return rel.endsWith('.astro') && !rel.includes('[') ? [rel] : []
    },
  )
}

const pageFile = (path: string) =>
  path === '/' ? 'index.astro' : `${path.slice(1, -1)}.astro`

test('every static page is in the registry or deliberately excluded', () => {
  const registered = new Set(publicRoutes.map((route) => pageFile(route.path)))
  const missing = astroPages().filter(
    (file) => !registered.has(file) && !excludedPages.has(file),
  )
  assert.deepEqual(missing, [])
})

test('every registry path has a page file', () => {
  const missing = publicRoutes.filter(
    (route) => !existsSync(join(pagesDir, pageFile(route.path))),
  )
  assert.deepEqual(missing, [])
})

test('registry paths are unique and slash-delimited', () => {
  const paths = publicRoutes.map((route) => route.path)
  assert.equal(new Set(paths).size, paths.length)
  for (const path of paths) assert.match(path, /^\/([^/]+\/)*$/)
})
