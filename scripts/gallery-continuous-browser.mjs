import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8791'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const report = []
const output = process.env.GALLERY_BROWSER_REPORT
const count = (page, minimum) =>
  page.waitForFunction(
    (n) => document.querySelectorAll('[data-gallery-filename]').length >= n,
    minimum,
  )
const ready = (page) =>
  page.waitForSelector('[data-gallery-favorite]:not([disabled])', {
    state: 'attached',
  })
const search = (page, filenames) =>
  page.evaluate(
    (filenames) =>
      new Promise((resolve, reject) =>
        document.querySelector('[data-gallery-browser]').dispatchEvent(
          new CustomEvent('gallery:search-results', {
            detail: { filenames, mode: 'search', resolve, reject },
          }),
        ),
      ),
    filenames,
  )
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const path = `${origin}/galleries/sanad-silwadi-wedding/`
    let failures = 0
    await page.route('**/galleries/sanad-silwadi-wedding/?page=4', (route) => {
      failures++
      return route.fulfill({ status: 503, body: 'Unavailable' })
    })
    const response = await page.goto(path)
    await ready(page)
    const html = await response.body()
    assert.equal(await page.locator('[data-gallery-filename]').count(), 40)
    assert.equal(
      (html.toString().match(/data-gallery-filename=/g) ?? []).length,
      40,
    )
    assert.equal(
      await page.locator('[data-gallery-pagination]').isVisible(),
      false,
    )
    const initial = await page.evaluate(() => ({
      nodes: document.querySelectorAll('*').length,
      cards: document.querySelectorAll('[data-gallery-filename]').length,
      islandProps: [...document.querySelectorAll('astro-island')].reduce(
        (sum, island) => sum + (island.getAttribute('props')?.length ?? 0),
        0,
      ),
      resources: performance.getEntriesByType('resource').map((entry) => ({
        url: entry.name,
        bytes: entry.encodedBodySize,
        transfer: entry.transferSize,
      })),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }))
    if (output) {
      await writeFile(`${output}.${width}.html`, html)
      await page.screenshot({ path: `${output}.${width}.initial.png` })
    }
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await count(page, 80)
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await count(page, 120)
    const filenames = await page
      .locator('[data-gallery-filename]')
      .evaluateAll((cards) => cards.map((card) => card.dataset.galleryFilename))
    assert.equal(new Set(filenames).size, filenames.length)
    await page
      .getByRole('radio', { name: 'Masonry', exact: true })
      .check({ force: true })
    await page
      .getByRole('button', { name: 'Larger photos', exact: true })
      .click()
    await page
      .locator('[data-gallery-open="0"]')
      .locator('..')
      .locator('[data-gallery-favorite]')
      .click({ force: true })
    await page
      .locator('[data-gallery-open="80"]')
      .locator('..')
      .locator('[data-gallery-favorite]')
      .click({ force: true })
    await page.locator('[data-gallery-toggle-favorites]').click()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 2,
    )
    await page.locator('[data-gallery-toggle-favorites]').click()
    await count(page, 120)
    await search(page, [filenames[100], filenames[0], filenames[80]])
    assert.deepEqual(
      await page
        .locator('[data-gallery-filename]')
        .evaluateAll((cards) =>
          cards.map((card) => card.dataset.galleryFilename),
        ),
      [filenames[100], filenames[0], filenames[80]],
    )
    await page
      .getByRole('radio', { name: 'Newest', exact: true })
      .check({ force: true })
    assert.equal(
      await page
        .locator('[data-gallery-filename]')
        .first()
        .getAttribute('data-gallery-filename'),
      filenames[100],
    )
    await page
      .getByRole('radio', { name: 'Oldest', exact: true })
      .check({ force: true })
    await page.locator('[data-gallery-show-page]').click()
    await count(page, 120)
    await page
      .getByRole('radio', { name: 'Oldest', exact: true })
      .check({ force: true })
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await page
      .getByRole('link', { name: 'Retry loading photos', exact: true })
      .waitFor()
      .catch(async (error) => {
        console.log(
          await page.evaluate(() => ({
            cards: document.querySelectorAll('[data-gallery-filename]').length,
            stream: document.querySelector('[data-gallery-stream]').outerHTML,
            gallery: document.querySelector('[data-gallery-browser]').dataset,
          })),
          { failures },
        )
        throw error
      })
    assert.equal(await page.locator('[data-gallery-filename]').count(), 120)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(300)
    assert.equal(failures, 1)
    await page.unroute('**/galleries/sanad-silwadi-wedding/?page=4')
    let release
    let entered
    const intercepted = new Promise((resolve) => {
      entered = resolve
    })
    await page.route(
      '**/galleries/sanad-silwadi-wedding/?page=5',
      async (route) => {
        entered()
        await new Promise((resolve) => {
          release = resolve
        })
        try {
          await route.continue()
        } catch {}
      },
    )
    let overlaps = 0
    await page.route(
      '**/galleries/sanad-silwadi-wedding/?page=4',
      async (route) => {
        overlaps++
        await new Promise((resolve) => setTimeout(resolve, 250))
        await route.continue()
      },
    )
    await page.locator('[data-gallery-load-more]').click()
    await page.locator('[data-gallery-load-more]').click({ force: true })
    await count(page, 160)
    assert.equal(overlaps, 1)
    await page.unroute('**/galleries/sanad-silwadi-wedding/?page=4')
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await Promise.race([
      intercepted,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Automatic next batch did not start')),
          10000,
        ),
      ),
    ])
    await search(page, [filenames[0]])
    release()
    await page.unroute('**/galleries/sanad-silwadi-wedding/?page=5')
    assert.equal(await page.locator('[data-gallery-filename]').count(), 1)
    await page.locator('[data-gallery-show-page]').click()
    await count(page, 160)
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await count(page, 200)
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await count(page, 201)
    assert.equal(
      await page.locator('[data-gallery-load-more]').isVisible(),
      false,
    )
    assert.equal(
      new Set(
        await page
          .locator('[data-gallery-filename]')
          .evaluateAll((cards) =>
            cards.map((card) => card.dataset.galleryFilename),
          ),
      ).size,
      201,
    )
    await page.locator('[data-gallery-open="160"]').click()
    await page.waitForURL(/photo=161/)
    await page.goBack()
    await page.goForward()
    await page.waitForURL(/photo=161/)
    await page.keyboard.press('Escape')
    await page.locator('[data-gallery-open="160"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    const y = await page.evaluate(() => scrollY)
    await page.reload()
    await ready(page)
    await count(page, 201)
    await page.waitForTimeout(350)
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - y) < 5)
    if (output)
      await page.screenshot({ path: `${output}.${width}.long-scroll.png` })
    const final = await page.evaluate(() => ({
      nodes: document.querySelectorAll('*').length,
      cards: document.querySelectorAll('[data-gallery-filename]').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }))
    assert.equal(initial.overflow, false)
    assert.equal(final.overflow, false)
    assert.deepEqual(errors, [])
    report.push({
      width,
      rawBytes: html.length,
      gzipBytes: gzipSync(html).length,
      initial,
      final,
      errors,
    })
    await page.close()
    const deep = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    })
    await deep.goto(`${path}?page=3`)
    await ready(deep)
    await deep.locator('[data-gallery-load-earlier]').scrollIntoViewIfNeeded()
    const before = await deep
      .locator('[data-gallery-open="80"]')
      .evaluate((card) => card.getBoundingClientRect().top)
    await deep.locator('[data-gallery-load-earlier]').click()
    await count(deep, 80)
    const after = await deep
      .locator('[data-gallery-open="80"]')
      .evaluate((card) => card.getBoundingClientRect().top)
    assert.ok(
      Math.abs(after - before) < 5,
      `prepend moved anchor ${after - before}px`,
    )
    await deep.locator('[data-gallery-load-earlier]').click()
    await count(deep, 120)
    assert.equal(await deep.locator('[data-gallery-open="0"]').count(), 1)
    assert.equal(
      await deep.locator('[data-gallery-load-earlier]').isVisible(),
      false,
    )
    await deep.close()
    const ordered = await browser.newPage({ viewport: { width, height: 900 } })
    let completeBatch
    let beganBatch
    const batchStarted = new Promise((resolve) => {
      beganBatch = resolve
    })
    await ordered.route(
      '**/galleries/sanad-silwadi-wedding/?page=5',
      async (route) => {
        beganBatch()
        await new Promise((resolve) => {
          completeBatch = resolve
        })
        await route.continue()
      },
    )
    await ordered.goto(path)
    await ready(ordered)
    await ordered.route('**/galleries/sanad-silwadi-wedding/?page=6', (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    )
    await ordered.route('**/galleries/sanad-silwadi-wedding/?page=4', (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    )
    await ordered
      .getByRole('radio', { name: 'Newest', exact: true })
      .check({ force: true })
    await ordered
      .getByRole('link', { name: 'Retry loading photos', exact: true })
      .waitFor()
    assert.equal(await ordered.locator('[data-gallery-filename]').count(), 40)
    await ordered.unroute('**/galleries/sanad-silwadi-wedding/?page=6')
    await ordered.locator('[data-gallery-load-more]').click()
    await ordered.locator('[data-gallery-open="200"]').waitFor()
    await ordered.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await batchStarted
    const anchor = await ordered
      .locator('[data-gallery-filename]')
      .evaluateAll((cards) => {
        const card = cards.find(
          (card) => card.getBoundingClientRect().bottom > 0,
        )
        return {
          filename: card.dataset.galleryFilename,
          top: card.getBoundingClientRect().top,
        }
      })
    completeBatch()
    await count(ordered, 41)
    assert.deepEqual(
      await ordered
        .locator('[data-gallery-open]')
        .evaluateAll((cards) =>
          cards.map((card) => Number(card.dataset.galleryOpen)),
        ),
      Array.from({ length: 41 }, (_, index) => 200 - index),
    )
    const moved = await ordered
      .locator(`[data-gallery-filename="${anchor.filename}"]`)
      .evaluate((card) => card.getBoundingClientRect().top)
    assert.ok(
      Math.abs(moved - anchor.top) < 5,
      `newest append moved anchor ${moved - anchor.top}px`,
    )
    await ordered.unroute('**/galleries/sanad-silwadi-wedding/?page=5')
    const newestNames = await ordered
      .locator('[data-gallery-filename]')
      .evaluateAll((cards) => cards.map((card) => card.dataset.galleryFilename))
    await search(ordered, [newestNames[40], newestNames[0]])
    assert.deepEqual(
      await ordered
        .locator('[data-gallery-filename]')
        .evaluateAll((cards) =>
          cards.map((card) => card.dataset.galleryFilename),
        ),
      [newestNames[40], newestNames[0]],
    )
    await ordered.locator('[data-gallery-show-page]').click()
    await count(ordered, 41)
    await ordered.waitForTimeout(250)
    await ordered.reload()
    await ready(ordered)
    await count(ordered, 41)
    assert.equal(
      await ordered
        .locator('[data-gallery-open]')
        .first()
        .getAttribute('data-gallery-open'),
      '200',
    )
    await ordered
      .getByRole('radio', { name: 'Oldest', exact: true })
      .check({ force: true })
    await ordered.waitForFunction(
      () =>
        document.querySelector('[data-gallery-browser]').dataset
          .galleryOrder === 'oldest',
    )
    assert.equal(
      await ordered
        .locator('[data-gallery-open]')
        .first()
        .getAttribute('data-gallery-open'),
      '0',
    )
    await ordered.close()
    console.log(
      `Passed continuous scrolling, filters, retry, overlap, history and prepend at ${width}px`,
    )
  }
  for (const width of [320, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    })
    for (const path of [
      '/',
      '/services/event-portraits/',
      '/galleries/sanad-silwadi-wedding/',
    ]) {
      await page.goto(`${origin}${path}`)
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${path} overflows at ${width}px`,
      )
      await page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'Event photography', exact: true })
        .waitFor()
      if (output)
        await page.screenshot({
          path: `${output}.${width}.${path.includes('services') ? 'service' : path.includes('galleries') ? 'gallery' : 'home'}.png`,
        })
    }
    await page.close()
  }
  if (process.env.GALLERY_PAGINATION_FIXTURES === '1') {
    const token = 'a'.repeat(64)
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
    })
    const requests = []
    page.on('request', (request) =>
      requests.push({
        url: request.url(),
        referrer: request.headers().referer,
      }),
    )
    await page.goto(
      `${origin}/galleries/pagination-test-unlisted/?share=${token}`,
    )
    await ready(page)
    await page.locator('[data-gallery-load-more]').scrollIntoViewIfNeeded()
    await count(page, 43)
    assert.equal(await page.locator('#guest-photos-heading').count(), 1)
    assert.equal(await page.locator('[data-gallery-open="42"]').count(), 1)
    assert.ok(
      requests.some((request) => request.url.includes(`page=2&share=${token}`)),
    )
    assert.ok(
      requests
        .filter((request) => request.url.includes('/api/gallery-media/'))
        .every((request) => !request.referrer),
    )
    assert.equal(
      await page.locator('script[src*="cloudflareinsights"]').count(),
      0,
    )
    assert.equal(
      await page.evaluate(
        (token) =>
          JSON.stringify({
            state: history.state,
            storage: { ...localStorage },
          }).includes(token),
        token,
      ),
      false,
    )
    await page
      .getByRole('radio', { name: 'Newest', exact: true })
      .check({ force: true })
    await page.waitForFunction(
      () =>
        document.querySelector('[data-gallery-browser]').dataset
          .galleryOrder === 'newest',
    )
    await count(page, 43)
    assert.deepEqual(
      await page
        .locator('[data-gallery-open]')
        .evaluateAll((cards) =>
          cards.map((card) => Number(card.dataset.galleryOpen)),
        ),
      Array.from({ length: 43 }, (_, index) => 42 - index),
    )
    assert.equal(await page.locator('#guest-photos-heading').count(), 1)
    await page.close()
    console.log(
      'Passed token-preserving automatic append across the guest-photo boundary',
    )
  }
  if (output)
    await writeFile(
      output,
      JSON.stringify(
        { origin, browser: await browser.version(), report },
        null,
        2,
      ),
    )
} finally {
  await browser.close()
}
