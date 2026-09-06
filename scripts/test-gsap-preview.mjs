import assert from 'node:assert/strict'

// Run with Playwright installed, or point PLAYWRIGHT_MODULE at its module URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.argv[2] || 'http://localhost:4321'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const width of [1440, 390]) {
    for (const mode of ['gsap', 'off', 'reduced']) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
      })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${baseURL}/?motion=${mode === 'off' ? 'off' : 'gsap'}`)
      await page.waitForSelector('[data-motion-option][aria-current="true"]')
      assert.equal(
        await page
          .locator('[aria-current="true"][data-motion-option]')
          .getAttribute('data-motion-option'),
        mode === 'off' ? 'off' : 'gsap',
      )
      assert.equal(
        (await page.locator('#main-content [data-reveal]').count()) > 0,
        mode === 'off',
      )
      const card = page.locator('#portfolio article').last()
      await card.locator('a').focus()
      await card.scrollIntoViewIfNeeded()
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('#portfolio article')
        return getComputedStyle(cards[cards.length - 1]).opacity === '1'
      })
      if (mode === 'reduced') {
        assert.equal(
          await card.evaluate((element) => getComputedStyle(element).transform),
          'none',
        )
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      )
      assert.deepEqual(errors, [])
      if (process.env.GSAP_SCREENSHOT_DIR && mode === 'gsap') {
        await page.goto(`${baseURL}/?motion=gsap`)
        await page.waitForTimeout(1800)
        await page.screenshot({
          path: `${process.env.GSAP_SCREENSHOT_DIR}/gsap-${width}.png`,
        })
      }
      console.log(`${width}px ${mode}: passed`)
      await page.close()
    }
  }
} finally {
  await browser.close()
}
