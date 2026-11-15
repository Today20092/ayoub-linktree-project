#!/usr/bin/env node
// Self-check for the bundled scripts: node selftest.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const here = path.dirname(
  new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-design-system-'))
const write = (name, text) => (
  fs.writeFileSync(path.join(dir, name), text),
  path.join(dir, name)
)
const run = (script, ...args) =>
  spawnSync(process.execPath, [path.join(here, script), ...args], {
    encoding: 'utf8',
  })

// Raw colors: token file exempt, each violation reported with file:line.
const tokens = write(
  'tokens.css',
  ':root { --primary: oklch(0.5 0.2 264); }\n.dark { --primary: #abcdef; }\n',
)
const bad = write(
  'Bad.tsx',
  [
    '<div className="bg-white text-gray-500 hover:bg-blue-500/50" />',
    '<p className="text-[#ff0000]" />',
    "const c = 'rgb(0 0 0)'",
    '<a href="#main" className="dark:bg-card bg-background" />',
    "const qr = '#000000' // design-system-allow: QR codes need pure black",
    '<div className="shadow-[0_1px_rgb(15_23_42_/_0.2)]" />',
    'color: var(--palette-1)',
  ].join('\n'),
)
let r = run('check-raw-colors.mjs', '--tokens', tokens, dir)
assert.equal(r.status, 1)
assert.match(r.stderr, /Bad\.tsx:1: Tailwind palette class "bg-white"/)
assert.match(r.stderr, /Bad\.tsx:2: Arbitrary color value "-\[#ff0000\]"/)
assert.match(r.stderr, /Bad\.tsx:3: Raw color function rgb/)
assert.match(r.stderr, /Bad\.tsx:4: dark: variant/)
assert.match(r.stderr, /Bad\.tsx:6: Raw color function rgb/)
assert.match(r.stderr, /Bad\.tsx:7: Primitive token --palette-1/)
assert.doesNotMatch(r.stderr, /tokens\.css|Bad\.tsx:5|#main/)
fs.rmSync(bad)
write('fixture.test.ts', "const color = '#fff'")
write('env.d.ts', "const color = '#fff'")
const ui = path.join(dir, 'ui')
fs.mkdirSync(ui)
fs.writeFileSync(
  path.join(ui, 'Button.tsx'),
  '<div className="dark:bg-card" />',
)
r = run('check-raw-colors.mjs', '--tokens', tokens, '--allow-dark', ui, dir)
assert.equal(r.status, 0, r.stderr)
r = run('check-raw-colors.mjs', '--tokens', tokens, dir)
assert.equal(r.status, 1)
assert.match(r.stderr, /dark: variant/)

// Contrast: known ratios, both themes, failure exits 1.
const ok = write(
  'ok.css',
  ':root { --background: #ffffff; --foreground: #000000; }\n.dark { --background: #000000; --foreground: #ffffff; }\n',
)
r = run('check-contrast.mjs', ok)
assert.equal(r.status, 0, r.stdout + r.stderr)
assert.match(r.stdout, /light: --foreground on --background 21\.00:1/)
assert.match(r.stdout, /dark: --foreground on --background 21\.00:1/)
const low = write(
  'low.css',
  ':root { --background: #ffffff; --foreground: #ffffff; --gray: #777777; --muted-foreground: var(--gray); }\n.dark { --background: #000; --foreground: #fff; }\n',
)
r = run('check-contrast.mjs', low)
assert.equal(r.status, 1)
assert.match(
  r.stdout,
  /FAIL {2}light: --muted-foreground on --background 4\.48:1/,
)

const missing = write(
  'missing.css',
  ':root { --background: #fff; --foreground: #000; }',
)
r = run('check-contrast.mjs', missing)
assert.equal(r.status, 1)
assert.match(r.stderr, /dark: theme must define/)
const unsupported = write(
  'unsupported.css',
  ':root { --background: #fff; --foreground: rgb(0 0 0); } .dark { --background: #000; --foreground: #fff; }',
)
r = run('check-contrast.mjs', unsupported)
assert.equal(r.status, 1)
assert.match(r.stderr, /alpha or unsupported color/)

const cardBoundary = write(
  'card-boundary.css',
  ':root { --background: #fff; --foreground: #000; --card: #777; --input: #777; } .dark { --background: #000; --foreground: #fff; --card: #777; --input: #777; }',
)
r = run('check-contrast.mjs', cardBoundary)
assert.equal(r.status, 1)
assert.match(r.stdout, /FAIL  light: --input on --card 1\.00:1/)
const featureStyle = write('feature.css', '.gallery-viewer { color: #fff; }')
r = run('check-raw-colors.mjs', '--tokens', tokens, featureStyle)
assert.equal(r.status, 1)
assert.match(r.stderr, /Hex color #fff outside the token file/)

fs.rmSync(dir, { recursive: true })
console.log('selftest passed')
