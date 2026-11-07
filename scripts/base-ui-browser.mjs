import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const astroRequire = createRequire(require.resolve('astro/package.json'))
const { build } = await import(pathToFileURL(astroRequire.resolve('vite')).href)
await build({
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': resolve('src') } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: '.wrangler/base-ui-fixture',
    lib: {
      entry: 'scripts/fixtures/base-ui.tsx',
      name: 'MigrationFixture',
      formats: ['iife'],
      fileName: () => 'fixture.js',
    },
  },
})
const js = await readFile('.wrangler/base-ui-fixture/fixture.js', 'utf8')
const cssFiles = (await readdir('dist/client/_astro')).filter((file) =>
  file.endsWith('.css'),
)
const css = (
  await Promise.all(
    cssFiles.map((file) => readFile(`dist/client/_astro/${file}`, 'utf8')),
  )
).join('\n')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('http://migration.test/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><head><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
    }),
  )
  await page.goto('http://migration.test/')
  await page.getByRole('button', { name: 'Ordinary command' }).click()
  assert.equal(await page.locator('output').innerText(), 'Not submitted')
  await page.getByRole('button', { name: 'Submit fixture' }).click()
  assert.equal(await page.locator('output').innerText(), 'Submitted')
  await page.getByRole('link', { name: 'Native destination' }).click()
  assert.match(page.url(), /#destination$/)
  await page.getByText('Fixture consent', { exact: true }).click()
  assert.equal(
    await page.getByRole('checkbox', { name: 'Fixture consent' }).isChecked(),
    true,
  )
  await page.getByRole('checkbox', { name: 'Fixture consent' }).focus()
  await page.keyboard.press('Space')
  assert.equal(
    await page.getByRole('checkbox', { name: 'Fixture consent' }).isChecked(),
    false,
  )
  await page.getByRole('button', { name: 'First answer' }).click()
  await page.getByText('First content', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Second answer' }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'First answer' })
      .getAttribute('aria-expanded'),
    'false',
  )
  await page.getByRole('button', { name: 'Second answer' }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Second answer' })
      .getAttribute('aria-expanded'),
    'false',
  )
  assert.equal(
    await page.getByRole('button', { name: 'Disabled answer' }).isDisabled(),
    true,
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Disabled answer' })
      .evaluate((el) => getComputedStyle(el).opacity),
    '0.5',
  )
  await page.getByRole('button', { name: 'Fixture menu' }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Normal action' }).waitFor()
  await page.keyboard.press('p')
  assert.equal(
    await page
      .getByRole('menuitemcheckbox', { name: 'Pin item' })
      .evaluate((el) => el === document.activeElement),
    true,
  )
  await page.keyboard.press('Enter')
  assert.equal(
    await page
      .getByRole('menuitemcheckbox', { name: 'Pin item' })
      .getAttribute('aria-checked'),
    'true',
  )
  await page.getByRole('menuitem', { name: 'More actions' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('menuitem', { name: 'Nested action' }).waitFor()
  await page.keyboard.press('Escape')
  await page
    .getByRole('menuitem', { name: 'Nested action' })
    .waitFor({ state: 'hidden' })
  await page.keyboard.press('Escape')
  await page
    .getByRole('menuitem', { name: 'Normal action' })
    .waitFor({ state: 'hidden' })
  await page.waitForFunction(
    () => document.activeElement?.textContent === 'Fixture menu',
  )
  assert.equal(
    await page
      .getByRole('button', { name: 'Fixture menu' })
      .evaluate((el) => el === document.activeElement),
    true,
  )
  assert.equal(
    await page
      .getByRole('progressbar', { name: 'Fixture progress' })
      .getAttribute('aria-valuenow'),
    '37',
  )
  assert.deepEqual(errors, [])
  console.log(
    'Passed Base UI forms, native links, checkbox labels/keyboard, accordion states, disabled appearance, menu keyboard/typeahead/submenu, focus return, and progress semantics',
  )
} finally {
  await browser.close()
}
