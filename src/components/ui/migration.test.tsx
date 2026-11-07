import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, buttonVariants } from './button'
import { Checkbox } from './checkbox'
import { Label } from './label'
import { Progress } from './progress'
import GalleryPreferences from '../GalleryPreferences'

test('gallery view disclosure exposes its state and controlled panel', () => {
  const html = renderToStaticMarkup(<GalleryPreferences />)
  assert.match(html, /aria-expanded="false"/)
  const controlled = html.match(/aria-controls="([^"]+)"/)?.[1]
  assert.ok(controlled)
  assert.ok(html.includes(`id="${controlled}"`))
  assert.match(html, /data-gallery-view-options="true" hidden=""/)
  assert.match(html, /Natural layout/)
})

test('commands default to button and explicit form submission stays available', () => {
  assert.match(renderToStaticMarkup(<Button>Command</Button>), /type="button"/)
  assert.match(
    renderToStaticMarkup(<Button type="submit">Submit</Button>),
    /type="submit"/,
  )
  const link = renderToStaticMarkup(
    <a href="/galleries/" className={buttonVariants()}>
      Galleries
    </a>,
  )
  assert.match(link, /^<a href="\/galleries\/"/)
  assert.doesNotMatch(link, /role="button"|type="button"/)
})

test('progress exposes the supplied value and indeterminate state', () => {
  const progress = renderToStaticMarkup(
    <Progress value={37} aria-label="Upload progress" />,
  )
  assert.match(progress, /role="progressbar"/)
  assert.match(progress, /aria-valuenow="37"/)
  assert.match(progress, /width:37%/)
  const pending = renderToStaticMarkup(
    <Progress value={null} aria-label="Waiting" />,
  )
  assert.doesNotMatch(pending, /aria-valuenow=/)
})

test('checkbox retains its label association and disabled checked form value', () => {
  const html = renderToStaticMarkup(
    <>
      <Label htmlFor="consent">Consent</Label>
      <Checkbox id="consent" name="consent" checked disabled />
    </>,
  )
  assert.match(html, /<label[^>]*for="consent"/)
  assert.match(html, /<input[^>]*id="consent"/)
  assert.match(html, /aria-checked="true"/)
  assert.match(html, /data-disabled/)
  assert.match(html, /type="checkbox"/)
})
