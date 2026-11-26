// Import direction from docs/site-structure.md.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// First matching prefix wins; `deny` lists what files under it may not import.
const rules = [
  ['pages/', []],
  ['layouts/', ['pages/', 'components/sections/']],
  [
    'components/sections/',
    // Plus any other sections folder, checked below.
    ['pages/', 'layouts/'],
  ],
  ['components/layout/', ['pages/', 'layouts/', 'components/sections/']],
  [
    'components/ui/',
    [
      'pages/',
      'layouts/',
      'components/sections/',
      'components/layout/',
      'content/',
      'data/',
    ],
  ],
  ['components/', ['pages/', 'layouts/', 'components/sections/']],
  ['lib/', ['pages/', 'layouts/']],
  ['data/', ['pages/', 'layouts/', 'components/']],
]

// Static imports, re-exports, dynamic import() and <script src>.
const specifiers = (source) =>
  [
    ...source.matchAll(
      /(?:\bfrom\s+|\bimport\s+|\bimport\(\s*|<script[^>]*\ssrc=)['"]([^'"\n]+)['"]/g,
    ),
  ].map((match) => match[1])

export function violations(file, source) {
  const rule = rules.find(([prefix]) => file.startsWith(prefix))
  if (!rule) return []
  return specifiers(source).flatMap((specifier) => {
    const target = specifier.startsWith('@/')
      ? specifier.slice(2)
      : specifier.startsWith('.')
        ? posix.join(posix.dirname(file), specifier)
        : undefined
    if (!target) return []
    const otherSection =
      file.startsWith('components/sections/') &&
      target.startsWith('components/sections/') &&
      posix.dirname(target) !== posix.dirname(file)
    const astroInPlainCode =
      /^(lib|data)\//.test(file) && target.split('?')[0].endsWith('.astro')
    return otherSection ||
      astroInPlainCode ||
      rule[1].some((prefix) => target.startsWith(prefix))
      ? [`src/${file} may not import ${specifier}`]
      : []
  })
}

test('the checker rejects forbidden imports and allows permitted ones', () => {
  const rejected = [
    ['lib/a.ts', "import x from '../pages/index.astro'"],
    ['lib/a.ts', "export { x } from '@/components/Header.astro'"],
    ['components/ui/a.tsx', "import x from '@/data/site.yaml'"],
    ['components/sections/home/A.astro', "import B from '../gallery/B.astro'"],
    [
      'components/sections/home/A.astro',
      "const x = await import('@/layouts/BaseLayout.astro')",
    ],
  ]
  for (const [file, source] of rejected)
    assert.equal(violations(file, source).length, 1, `${file}: ${source}`)
  assert.deepEqual(
    violations(
      'components/sections/home/A.astro',
      "import B from './B.astro'\nimport C from '@/components/layout/C.astro'",
    ),
    [],
  )
})

test('src follows the import direction', () => {
  const root = fileURLToPath(new URL('../src/', import.meta.url))
  const files = readdirSync(root, { recursive: true })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => /\.(astro|[cm]?[jt]sx?)$/.test(file))
    .filter((file) => !/\.test\./.test(file))
  assert.ok(files.length > 50, `only ${files.length} source files found`)
  assert.deepEqual(
    files.flatMap((file) =>
      violations(file, readFileSync(posix.join(root, file), 'utf8')),
    ),
    [],
  )
})
