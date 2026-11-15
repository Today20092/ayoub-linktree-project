import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import { parse } from 'yaml'

import { formatUtcDate } from './format-date'
import { applyPrivatePageHeaders } from './private-page'

test('private pages are uncached, unindexed, and send no referrer', () => {
  const headers = new Headers()
  applyPrivatePageHeaders(headers)
  assert.equal(headers.get('Cache-Control'), 'no-store')
  assert.equal(headers.get('X-Robots-Tag'), 'noindex, nofollow')
  assert.equal(headers.get('Referrer-Policy'), 'no-referrer')
})

test('the default social image exists in public/', async () => {
  // site-config.ts uses a Vite ?raw import, so read the YAML directly here.
  const { site } = parse(
    await readFile(new URL('../data/site.yaml', import.meta.url), 'utf8'),
  )
  await access(new URL(`../../public/${site.ogImage}`, import.meta.url))
})

test('dates format in UTC', () => {
  const date = new Date('2026-03-01T00:00:00Z')
  assert.equal(formatUtcDate(date), 'March 1, 2026')
  assert.equal(formatUtcDate(date, 'short'), 'Mar 1, 2026')
})
