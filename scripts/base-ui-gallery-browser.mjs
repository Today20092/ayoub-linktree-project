import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8788'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const outcome of ['success', 'failure', 'viewer-handoff']) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${origin}/galleries/dawah-at-tampa-riverwalk/`)
    await page
      .locator('[data-gallery-favorite]:not([disabled])')
      .first()
      .waitFor({ state: 'attached' })
    const filename = await page
      .locator('[data-gallery-filename]')
      .first()
      .getAttribute('data-gallery-filename')
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    await page.route('https://photos.ayoubabed.xyz/**', async (route) => {
      if (route.request().resourceType() !== 'fetch') return route.continue()
      await held
      return route.fulfill({
        status: outcome === 'failure' ? 503 : 200,
        body: 'download fixture',
        headers: { 'access-control-allow-origin': '*' },
      })
    })
    if (outcome === 'viewer-handoff') {
      await page.locator('[data-gallery-open="0"]').click()
      const viewer = page.getByRole('dialog', { name: /photograph viewer/ })
      await viewer.waitFor()
      const save = viewer.getByRole('link', { name: 'Save photo' })
      assert.match(await save.getAttribute('href'), /^\/api\/download\//)
      assert.equal(await save.getAttribute('role'), null)
      await page.evaluate(
        (filename) =>
          document.querySelector('[data-gallery-browser]').dispatchEvent(
            new CustomEvent('gallery:download-matches', {
              detail: [filename],
            }),
          ),
        filename,
      )
    } else {
      await page.locator('[data-gallery-favorite]').first().click()
      await page
        .getByRole('button', { name: 'Download selected (1)', exact: true })
        .click()
    }
    const preparing = page.getByRole('dialog', {
      name: 'Your download is being prepared',
    })
    await preparing.waitFor()
    await page.waitForFunction(() =>
      document
        .querySelector('[role="dialog"]')
        ?.contains(document.activeElement),
    )
    assert.equal(
      await preparing.evaluate((el) => el.contains(document.activeElement)),
      true,
      `${outcome}: focus stays inside preparation`,
    )
    const progress = preparing.getByRole('progressbar')
    assert.equal(await progress.getAttribute('aria-valuenow'), '0')
    await page.keyboard.press('Escape')
    assert.equal(await preparing.isVisible(), true)
    await page.mouse.click(2, 2)
    assert.equal(await preparing.isVisible(), true)
    if (outcome === 'failure') {
      release()
      const failed = page.getByRole('dialog', { name: 'Download failed' })
      await failed.waitFor()
      await failed.getByRole('button', { name: 'Try again' }).waitFor()
      await page.keyboard.press('Escape')
      await failed.waitFor({ state: 'hidden' })
    } else {
      const download = page.waitForEvent('download')
      release()
      await download
      await preparing.waitFor({ state: 'hidden' })
    }
    assert.deepEqual(errors, [])
    await page.close()
    console.log(
      `Passed ZIP ${outcome}, focus, progress semantics, and pending Escape/outside-press guards`,
    )
  }
} finally {
  await browser.close()
}
