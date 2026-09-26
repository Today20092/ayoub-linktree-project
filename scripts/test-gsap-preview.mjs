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
      await page.waitForSelector('html[data-motion]')
      assert.equal(
        await page.locator('html').getAttribute('data-motion'),
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
      for (const filter of [
        'photography',
        'video',
        'podcasts',
        'photography',
        'all',
      ]) {
        await page.locator(`[data-filter="${filter}"]`).click()
        const visible = await page
          .locator('[data-project-filters]:not([hidden])')
          .evaluateAll((items) =>
            items.map((item) => item.dataset.projectFilters),
          )
        assert.ok(visible.length > 0)
        if (filter !== 'all')
          assert.ok(visible.every((value) => value.split(' ').includes(filter)))
      }
      await page.waitForTimeout(800)
      await page.waitForFunction(() => {
        const card = document.querySelector('#portfolio article:last-child')
        return (
          getComputedStyle(card.querySelector('img')).clipPath === 'none' &&
          getComputedStyle(card.querySelector('a > span')).opacity === '1'
        )
      })
      const projectURL = await page
        .locator('#portfolio article a')
        .first()
        .getAttribute('href')
      assert.equal(
        new URL(projectURL, baseURL).searchParams.get('motion'),
        mode === 'off' ? 'off' : null,
      )
      if (mode === 'gsap') {
        await Promise.all([
          page.waitForSelector('[data-photo-transition]', {
            state: 'attached',
          }),
          page.locator('#portfolio article a').first().click(),
        ])
        await page.waitForSelector('[data-photo-transition]', {
          state: 'detached',
        })
      } else await page.locator('#portfolio article a').first().click()
      await page.waitForSelector('html[data-motion]')
      await page.locator('[data-motion-group] h1').scrollIntoViewIfNeeded()
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector('[data-motion-group] h1'))
            .opacity === '1',
      )
      await page.goto(
        `${baseURL}/services?motion=${mode === 'off' ? 'off' : 'gsap'}`,
      )
      await page.waitForSelector('#outcomes')
      assert.equal(await page.locator('#outcomes > section').count(), 4)
      await page.locator('#av h2').scrollIntoViewIfNeeded()
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector('#av h2')).opacity === '1',
      )
      assert.deepEqual(errors, [])
      await page
        .locator('#production-walkthrough ol li')
        .last()
        .scrollIntoViewIfNeeded()
      if (mode === 'gsap') {
        await page.waitForFunction(() =>
          document
            .querySelector('[data-walkthrough-label]')
            .textContent.includes('03'),
        )
      } else
        assert.equal(
          await page.locator('[data-walkthrough-progress]').isVisible(),
          false,
        )
      await page.goto(
        `${baseURL}/portfolio/konan-bbq-podcast/?motion=${mode === 'off' ? 'off' : 'gsap'}`,
      )
      await page.locator('[data-comparison-controls]').scrollIntoViewIfNeeded()
      // Let the entrance and lazy video layout settle before pointer checks.
      await page.waitForTimeout(1000)
      await page.locator('[data-comparison-select="1"]').click()
      assert.equal(
        await page.locator('[data-comparison-panel]:visible').count(),
        1,
      )
      assert.equal(await page.locator('#comparison-1').isVisible(), true)
      await page.locator('[data-comparison-select="0"]').click()
      assert.equal(await page.locator('#comparison-0').isVisible(), true)
      assert.equal(await page.locator('#comparison-1').isVisible(), false)
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
