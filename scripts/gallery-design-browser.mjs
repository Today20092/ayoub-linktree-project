import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.GALLERY_TEST_URL ?? 'http://127.0.0.1:8788'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
const openView = async (page) => {
  const trigger = page.locator('[data-gallery-view-toggle]')
  if ((await trigger.getAttribute('aria-expanded')) === 'false')
    await trigger.click()
}
const measureContrast = (locator, pseudo = null) =>
  locator.evaluate((element, pseudo) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const luminance = (color) => {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .reduce((sum, channel, i) => {
          const value = channel / 255
          return (
            sum +
            (value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4) *
              [0.2126, 0.7152, 0.0722][i]
          )
        }, 0)
    }
    const styles = getComputedStyle(element)
    const background = luminance(
      getComputedStyle(element, pseudo).backgroundColor,
    )
    const foreground = luminance(styles.color)
    return (
      (Math.max(background, foreground) + 0.05) /
      (Math.min(background, foreground) + 0.05)
    )
  }, pseudo)
try {
  for (const width of [320, 390, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        colorScheme: theme,
        hasTouch: width < 768,
      })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${origin}/galleries/muslim-business-chamber-2026/`)
      await page
        .locator('[data-gallery-favorite]:not([disabled])')
        .first()
        .waitFor({ state: 'attached' })
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle('dark', theme === 'dark'),
        theme,
      )
      const fits = async () =>
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width} ${theme}: horizontal overflow ${JSON.stringify(
            await page.evaluate(() =>
              [...document.querySelectorAll('body *')]
                .filter(
                  (el) =>
                    el.getBoundingClientRect().right > innerWidth + 1 ||
                    el.scrollWidth > el.clientWidth + 1,
                )
                .slice(0, 8)
                .map((el) => ({
                  tag: el.tagName,
                  cls: el.className,
                  width: el.getBoundingClientRect().width,
                  scroll: el.scrollWidth,
                })),
            ),
          )}`,
        )
      await fits()
      const viewToggle = page.locator('[data-gallery-view-toggle]')
      await viewToggle.focus()
      const beforeView = await viewToggle.evaluate((el) => ({
        x: el.getBoundingClientRect().left + scrollX,
        y: el.getBoundingClientRect().top + scrollY,
      }))
      await page.keyboard.press('Enter')
      await page.locator('[data-gallery-view-options]').waitFor()
      const afterView = await viewToggle.evaluate((el) => ({
        x: el.getBoundingClientRect().left + scrollX,
        y: el.getBoundingClientRect().top + scrollY,
      }))
      assert.ok(
        Math.abs(beforeView.x - afterView.x) < 1 &&
          Math.abs(beforeView.y - afterView.y) < 1,
        `View trigger stays in place: ${JSON.stringify({ beforeView, afterView })}`,
      )
      await page.keyboard.press('Escape')
      await page
        .locator('[data-gallery-view-options]')
        .waitFor({ state: 'hidden' })
      assert.equal(
        await viewToggle.evaluate((el) => el === document.activeElement),
        true,
      )
      await openView(page)
      await page
        .getByRole('button', { name: 'Natural layout', exact: true })
        .click()
      await page.waitForFunction(
        () =>
          document.querySelector('[data-gallery-browser]').dataset
            .galleryView === 'masonry',
      )
      await page.reload()
      await openView(page)
      await page
        .getByRole('button', { name: 'Natural layout', pressed: true })
        .waitFor()
      await page.getByRole('button', { name: 'Grid', exact: true }).click()
      await page.getByRole('button', { name: 'Newest', exact: true }).click()
      await page.waitForFunction(
        () =>
          document.querySelector('[data-gallery-browser]').dataset
            .galleryOrder === 'newest',
      )
      await page.getByRole('button', { name: 'Oldest', exact: true }).click()
      await page.waitForFunction(
        () =>
          document.querySelector('[data-gallery-browser]').dataset
            .galleryOrder === 'oldest',
      )
      if (
        (await page
          .locator('[data-gallery-browser]')
          .getAttribute('data-dense')) === 'true'
      ) {
        await page
          .getByRole('button', { name: 'Larger photos', exact: true })
          .click()
      }
      const favorite = page.locator('[data-gallery-favorite]').first()
      await page.locator('[data-gallery-view-toggle]').click()
      const favoriteBounds = await favorite.boundingBox()
      assert.ok(favoriteBounds.width >= 44 && favoriteBounds.height >= 44)
      const visibleCircle = await favorite.evaluate((el) => {
        const style = getComputedStyle(el, '::before')
        return {
          width: parseFloat(style.width),
          height: parseFloat(style.height),
        }
      })
      assert.equal(visibleCircle.width, 32)
      assert.equal(visibleCircle.height, 32)
      assert.ok(
        (await measureContrast(favorite, '::before')) >= 3,
        'Favorite icon contrast',
      )
      assert.ok(
        (await measureContrast(
          page.getByRole('button', { name: 'Oldest', exact: true }),
        )) >= 4.5,
        'Selected sort text contrast',
      )
      await favorite.focus()
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-gallery-favorite]')
            .getAttribute('aria-pressed') === 'true',
      )
      assert.match(
        await favorite.getAttribute('aria-label'),
        /Remove photograph/,
      )
      const selection = page.getByRole('region', { name: 'Selected photos' })
      await selection.waitFor()
      assert.match(await selection.innerText(), /Saved on this device/)
      await selection
        .getByRole('button', { name: 'Favorites (1)', exact: true })
        .click()
      await page.waitForFunction(
        () =>
          document.querySelector('[data-gallery-browser]').dataset
            .galleryFiltered === 'true',
      )
      await selection
        .getByRole('button', { name: 'Favorites (1)', exact: true })
        .click()
      await page.waitForFunction(
        () =>
          document.querySelector('[data-gallery-browser]').dataset
            .galleryFiltered === 'false',
      )
      const opener = page.locator('[data-gallery-open="0"]')
      await page.locator('[data-gallery-open]').last().focus()
      const focusedBottom = await page.evaluate(
        () => document.activeElement.getBoundingClientRect().bottom,
      )
      const selectionBounds = await selection.boundingBox()
      assert.ok(
        focusedBottom <= selectionBounds.y + 1,
        'Selection bar does not cover the focused photo',
      )
      await page.locator('[data-gallery-controls]').scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `.wrangler/gallery-design-${width}-${theme}-controls.png`,
      })
      await opener.click()
      const viewer = page.getByRole('dialog')
      await viewer.waitFor()
      assert.match(
        await viewer.getByRole('link', { name: 'Save photo' }).innerText(),
        /Save photo/,
      )
      const contrast = await measureContrast(viewer)
      assert.ok(contrast >= 4.5, `Viewer text contrast: ${contrast}`)
      await page
        .getByRole('button', { name: 'Next photograph', exact: true })
        .click()
      await page.keyboard.press('ArrowLeft')
      const image = viewer.locator('img')
      await image.waitFor()
      const imageBox = await image.boundingBox()
      assert.ok(imageBox.x >= 0 && imageBox.x + imageBox.width <= width + 1)
      assert.ok(imageBox.y >= 0 && imageBox.y + imageBox.height <= 900)
      if (width < 640)
        assert.ok(
          imageBox.width >= width - 2,
          'Mobile photograph should use the full width',
        )
      await viewer.screenshot({
        path: `.wrangler/gallery-design-${width}-${theme}-viewer.png`,
      })
      await page.keyboard.press('Escape')
      await viewer.waitFor({ state: 'hidden' })
      assert.equal(
        await opener.evaluate((el) => el === document.activeElement),
        true,
        'Close returns keyboard focus',
      )
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
        const style = document.createElement('style')
        style.textContent =
          '* {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}'
        document.head.append(style)
      })
      await fits()
      await page.locator('.gallery-search summary').click()
      await openView(page)
      await fits()
      await page.screenshot({
        path: `.wrangler/gallery-design-${width}-${theme}-text.png`,
      })
      const barBounds = await selection.boundingBox()
      assert.ok(barBounds.x >= 0 && barBounds.x + barBounds.width <= width + 1)
      assert.ok(barBounds.y >= 0 && barBounds.y + barBounds.height <= 900)
      await selection
        .getByRole('button', { name: 'Clear', exact: true })
        .click()
      await selection.waitFor({ state: 'hidden' })
      assert.equal(
        await page
          .locator('[data-gallery-controls]')
          .evaluate((el) => el.contains(document.activeElement)),
        true,
      )
      assert.deepEqual(errors, [])
      results.push({ width, theme, passed: true, imageBox })
      await page.close()
    }
  }
  console.log(JSON.stringify(results))
  await writeFile(
    '.wrangler/gallery-design-results.json',
    JSON.stringify(results, null, 2),
  )
} finally {
  await browser.close()
}
