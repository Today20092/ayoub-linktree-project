import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8788'
const output = process.env.GALLERY_BROWSER_REPORT
const baseline = process.env.GALLERY_BROWSER_BASELINE === '1'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
try {
  for (const width of [1440, 390]) {
    for (const slug of [
      'dawah-at-tampa-riverwalk',
      'muslim-business-chamber-2026',
      'sanad-silwadi-wedding',
      'angels-birthday-party-2026',
    ]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => {
        window.auditLcp = []
        new PerformanceObserver((list) =>
          window.auditLcp.push(
            ...list.getEntries().map((entry) => ({
              time: entry.startTime,
              url: entry.url,
              tag: entry.element?.tagName,
            })),
          ),
        ).observe({ type: 'largest-contentful-paint', buffered: true })
      })
      const response = await page.goto(`${origin}/galleries/${slug}/`, {
        waitUntil: 'networkidle',
      })
      if (response.status() === 404 && slug === 'angels-birthday-party-2026') {
        await page.close()
        continue
      }
      assert.equal(response.status(), 200)
      await page.waitForFunction(
        () =>
          !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
      )
      const html = await response.body()
      const measured = await page.evaluate(() => ({
        nodes: document.querySelectorAll('*').length,
        cards: document.querySelectorAll('[data-gallery-filename]').length,
        islandProps: [...document.querySelectorAll('astro-island')].reduce(
          (sum, island) => sum + (island.getAttribute('props')?.length ?? 0),
          0,
        ),
        overflow: document.documentElement.scrollWidth > innerWidth,
        lcp: window.auditLcp,
        resources: performance.getEntriesByType('resource').map((entry) => ({
          name: entry.name,
          bytes: entry.encodedBodySize,
          transfer: entry.transferSize,
          duration: entry.duration,
          type: entry.initiatorType,
        })),
        thumbnails: [...document.querySelectorAll('[data-photo-grid] img')]
          .filter((image) => image.getBoundingClientRect().top < innerHeight)
          .map((image) => ({
            src: image.currentSrc,
            width: image.getBoundingClientRect().width,
            naturalWidth: image.naturalWidth,
          })),
      }))
      results.push({
        slug,
        width,
        rawBytes: html.length,
        gzipBytes: gzipSync(html).length,
        ...measured,
        errors,
      })
      assert.equal(measured.overflow, false)
      assert.deepEqual(errors, [])
      if (!baseline) {
        assert.equal(measured.cards, 40)
        if (output)
          await page.screenshot({
            path: `${output}.${slug}.${width}.png`,
            fullPage: false,
          })
      }
      await page.close()
    }
    if (baseline) continue
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    })
    const path = `${origin}/galleries/dawah-at-tampa-riverwalk/`
    await page.goto(path)
    await page.waitForFunction(
      () => !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
    )
    const first = await page
      .locator('[data-gallery-filename]')
      .first()
      .getAttribute('data-gallery-filename')
    if (width >= 768)
      await page
        .getByRole('button', { name: 'Larger photos', exact: true })
        .click()
    await page.locator('[data-gallery-favorite]').first().click({ force: true })
    await page.getByRole('link', { name: 'Next', exact: true }).click()
    await page.waitForFunction(
      () => !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
    )
    const second = await page
      .locator('[data-gallery-filename]')
      .first()
      .getAttribute('data-gallery-filename')
    await page.locator('[data-gallery-favorite]').first().click({ force: true })
    await page
      .getByRole('button', { name: 'View favorites (2)', exact: true })
      .click()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 2,
    )
    await page.reload()
    await page
      .getByRole('button', { name: 'View favorites (2)', exact: true })
      .waitFor()
    await page
      .getByRole('button', { name: 'View favorites (2)', exact: true })
      .click()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 2,
    )
    assert.deepEqual(
      await page
        .locator('[data-gallery-filename]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.dataset.galleryFilename),
        ),
      [first, second],
    )
    await page.route('https://photos.ayoubabed.xyz/**', (route) =>
      route.fulfill({
        status: 200,
        body: 'download fixture',
        headers: { 'access-control-allow-origin': '*' },
      }),
    )
    const selectedDownload = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Download favorites (2)', exact: true })
      .click()
    const selectedZip = await selectedDownload
    const zipBytes = await readFile(await selectedZip.path())
    assert.ok(zipBytes.includes(Buffer.from(first)))
    assert.ok(zipBytes.includes(Buffer.from(second)))
    assert.equal(
      selectedZip.suggestedFilename(),
      'dawah-at-tampa-riverwalk-selection.zip',
    )
    await page.unroute('https://photos.ayoubabed.xyz/**')
    let archiveRequest
    await page.route('**/api/download/**', (route) => {
      archiveRequest = new URL(route.request().url())
      return route.fulfill({
        status: 200,
        body: 'archive fixture',
        headers: {
          'content-disposition': 'attachment; filename="gallery.zip"',
        },
      })
    })
    const allDownload = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Download all', exact: true })
      .click()
    const allArchive = await allDownload
    archiveRequest ??= new URL(allArchive.url())
    assert.equal(
      archiveRequest.searchParams.get('url'),
      'https://photos.ayoubabed.xyz/events/dawah-at-tampa-riverwalk/downloads/dawah-at-tampa-riverwalk.zip',
    )
    await page.unroute('**/api/download/**')
    await page
      .getByRole('button', { name: 'Show all photos', exact: true })
      .click()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 18,
    )
    await page.locator('[data-gallery-open="40"]').click()
    await page.keyboard.press('ArrowLeft')
    await page.waitForURL(/photo=40/)
    await page.goBack()
    assert.match(page.url(), /\?page=2$/)
    await page.goForward()
    await page.waitForURL(/photo=40/)
    await page.keyboard.press('Escape')
    assert.match(page.url(), /\?page=2$/)
    // Existing public gallery event seam supplies ranked search results without a face index call.
    await page.evaluate(
      ({ first, second }) =>
        new Promise((resolve, reject) => {
          document.querySelector('[data-gallery-browser]').dispatchEvent(
            new CustomEvent('gallery:search-results', {
              detail: {
                filenames: [second, first],
                mode: 'search',
                resolve,
                reject,
              },
            }),
          )
        }),
      { first, second },
    )
    assert.deepEqual(
      await page
        .locator('[data-gallery-filename]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.dataset.galleryFilename),
        ),
      [second, first],
    )
    await page
      .getByRole('radio', { name: 'Masonry', exact: true })
      .check({ force: true })
    await page
      .getByRole('button', { name: 'Show page photos', exact: true })
      .click()
    let delayed
    await page.route(
      '**/galleries/dawah-at-tampa-riverwalk/',
      async (route) => {
        await new Promise((resolve) => {
          delayed = resolve
        })
        try {
          await route.continue()
        } catch {
          /* The reset aborts this request. */
        }
      },
    )
    await page.evaluate((first) => {
      document.querySelector('[data-gallery-browser]').dispatchEvent(
        new CustomEvent('gallery:search-results', {
          detail: {
            filenames: [first],
            mode: 'search',
            resolve() {},
            reject() {},
          },
        }),
      )
    }, first)
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-gallery-browser]')
          .getAttribute('aria-busy') === 'true',
    )
    await page
      .getByRole('button', { name: 'Show page photos', exact: true })
      .click()
    delayed?.()
    await page.unroute('**/galleries/dawah-at-tampa-riverwalk/')
    assert.equal(await page.locator('[data-gallery-filename]').count(), 18)
    assert.equal(await page.locator('[data-gallery-filename]').count(), 18)
    // Failed acquisition retains the page and offers recovery; a reset aborts stale work.
    await page.route('**/galleries/dawah-at-tampa-riverwalk/', (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    )
    await page.evaluate(
      (first) =>
        new Promise((resolve) =>
          document.querySelector('[data-gallery-browser]').dispatchEvent(
            new CustomEvent('gallery:search-results', {
              detail: {
                filenames: [first],
                mode: 'search',
                resolve,
                reject: resolve,
              },
            }),
          ),
        ),
      first,
    )
    assert.equal(await page.locator('[data-gallery-filename]').count(), 18)
    assert.equal(
      await page
        .getByRole('button', { name: 'Retry loading photos', exact: true })
        .isVisible(),
      true,
    )
    await page.unroute('**/galleries/dawah-at-tampa-riverwalk/')
    await page
      .getByRole('button', { name: 'Retry loading photos', exact: true })
      .click()
    await page.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 1,
    )
    await page
      .getByRole('button', { name: 'Show page photos', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Clear favorites', exact: true })
      .click()
    await page.close()

    const nojs = await browser.newPage({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    })
    await nojs.goto(path)
    await nojs.getByRole('link', { name: 'Next', exact: true }).click()
    assert.equal(await nojs.locator('[data-gallery-filename]').count(), 18)
    assert.ok(
      await nojs.locator('[data-gallery-open="40"]').getAttribute('href'),
    )
    const originalUrl = await nojs
      .locator('[data-gallery-open="40"]')
      .getAttribute('href')
    const originalResponse = await nojs.goto(originalUrl)
    assert.equal(originalResponse.status(), 200)
    assert.match(originalResponse.headers()['content-type'], /^image\//)
    await nojs.goto(`${path}photo/41/`)
    await nojs.getByRole('link', { name: 'Continue to the photograph' }).click()
    assert.equal(await nojs.locator('[data-gallery-open="40"]').count(), 1)
    await nojs.close()
    const storageFailure = await browser.newPage({
      viewport: { width, height: 900 },
    })
    await storageFailure.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Storage unavailable')
        },
      }),
    )
    await storageFailure.goto(path)
    await storageFailure.waitForFunction(
      () => !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
    )
    await storageFailure.locator('[data-gallery-open="0"]').click()
    await storageFailure
      .getByRole('button', {
        name: 'Add photograph 1 to favorites',
        exact: true,
      })
      .click()
    await storageFailure.keyboard.press('Escape')
    await storageFailure
      .getByRole('button', { name: 'View favorites (1)', exact: true })
      .click()
    await storageFailure.waitForFunction(
      () => document.querySelectorAll('[data-gallery-filename]').length === 1,
    )
    await storageFailure.close()
    if (process.env.GALLERY_PAGINATION_FIXTURES === '1') {
      const token = 'a'.repeat(64)
      const privatePage = await browser.newPage({
        viewport: { width, height: 900 },
      })
      const requests = []
      privatePage.on('request', (request) =>
        requests.push({
          url: request.url(),
          referer: request.headers().referer,
        }),
      )
      await privatePage.goto(
        `${origin}/galleries/pagination-test-unlisted/?share=${token}`,
      )
      await privatePage.waitForFunction(
        () =>
          !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
      )
      if (width >= 768)
        await privatePage
          .getByRole('button', { name: 'Larger photos', exact: true })
          .click()
      await privatePage.locator('[data-gallery-favorite]').first().click()
      await privatePage.getByRole('link', { name: 'Next', exact: true }).click()
      assert.equal(new URL(privatePage.url()).searchParams.get('share'), token)
      await privatePage.waitForFunction(
        () =>
          !!document.querySelector('[data-gallery-favorite]:not([disabled])'),
      )
      await privatePage.locator('[data-gallery-favorite]').first().click()
      await privatePage
        .getByRole('button', { name: 'View favorites (2)', exact: true })
        .click()
      await privatePage.waitForFunction(
        () => document.querySelectorAll('[data-gallery-filename]').length === 2,
      )
      assert.ok(
        requests.some((request) => request.url.endsWith(`?share=${token}`)),
      )
      for (const request of requests.filter((request) =>
        request.url.includes('/api/gallery-media/'),
      ))
        assert.ok(!request.referer)
      const stored = await privatePage.evaluate(() =>
        JSON.stringify({ ...localStorage }),
      )
      assert.ok(!stored.includes(token))
      assert.equal(
        await privatePage.locator('script[src*="cloudflareinsights"]').count(),
        0,
      )
      await privatePage.close()
    }
  }
  if (output)
    await writeFile(
      output,
      JSON.stringify(
        { origin, baseline, browser: await browser.version(), results },
        null,
        2,
      ),
    )
  console.log(
    `Passed ${baseline ? 'baseline measurements' : 'pagination and no-JS browser checks'}; ${results.length} measurements`,
  )
} finally {
  await browser.close()
}
