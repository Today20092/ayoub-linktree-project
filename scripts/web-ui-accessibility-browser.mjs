import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.WEB_UI_TEST_URL ?? 'http://localhost:4321'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const results = []
const check = async (name, run) => {
  console.log(`Checking ${name}`)
  try {
    const detail = await run()
    results.push({ name, passed: true, detail })
  } catch (error) {
    results.push({ name, passed: false, error: error.message })
  }
}
const noOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  assert.ok(
    dimensions.document <= dimensions.viewport,
    JSON.stringify(dimensions),
  )
}
const contrast = async (locator) =>
  locator.evaluate((element) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const colors = []
    for (let current = element; current; current = current.parentElement)
      colors.unshift(getComputedStyle(current).backgroundColor)
    context.fillStyle = 'white'
    context.fillRect(0, 0, 1, 1)
    for (const color of colors) {
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
    }
    const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = getComputedStyle(element).color
    context.fillRect(0, 0, 1, 1)
    const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
    const luminance = (rgb) =>
      rgb.reduce((sum, value, index) => {
        value /= 255
        return (
          sum +
          (value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index]
        )
      }, 0)
    const a = luminance(foreground)
    const b = luminance(background)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
try {
  await check('homepage keyboard skip and photography filter', async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    try {
      await page.goto(origin)
      await page.keyboard.press('Tab')
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent.trim()),
        'Skip to content',
      )
      const skip = await page.locator('a').first().boundingBox()
      assert.ok(skip.y >= 0, 'Focused skip link must be visible')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Tab')
      assert.ok(
        await page.evaluate(() => !!document.activeElement.closest('main')),
        'Next Tab after skip must enter main content',
      )
      const filter = page.locator('[data-filter="photography"]')
      await filter.waitFor({ state: 'visible' })
      await filter.click()
      assert.equal(await filter.getAttribute('aria-pressed'), 'true')
      assert.match(
        await page.locator('[data-filter-count]').innerText(),
        /project/,
      )
    } finally {
      await page.close()
    }
  })
  for (const width of [320, 390, 768, 1280]) {
    await check(
      `inquiry reflow ${width}px, 200% text and spacing`,
      async () => {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: 'reduce',
        })
        try {
          await page.goto(`${origin}/services/event-portraits/`)
          await noOverflow(page)
          await page.addStyleTag({ content: 'html{font-size:200%!important}' })
          await noOverflow(page)
          await page.addStyleTag({
            content:
              '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}',
          })
          await noOverflow(page)
          if (width === 320) {
            await page
              .locator('#event-portrait-inquiry')
              .evaluate((form) => form.requestSubmit())
            const exposed = await page.evaluate(() => {
              const box = document.activeElement.getBoundingClientRect()
              const headerBottom =
                document.querySelector('body > header')?.getBoundingClientRect()
                  .bottom ?? 0
              return box.bottom > headerBottom && box.top < innerHeight
            })
            assert.ok(
              exposed,
              'Enlarged-text invalid field must not be entirely obscured by header',
            )
          }
        } finally {
          await page.close()
        }
      },
    )
  }
  for (const colorScheme of ['light', 'dark']) {
    await check(
      `inquiry errors, recovery, selection and contrast ${colorScheme}`,
      async () => {
        const page = await browser.newPage({
          colorScheme,
          reducedMotion: 'reduce',
        })
        try {
          await page.goto(`${origin}/services/event-portraits/`)
          await page.locator('#name').fill('Accessibility test')
          await page.locator('[data-coverage="2 hours"]').click()
          assert.equal(await page.locator('#coverage').inputValue(), '2 hours')
          await page
            .getByRole('button', { name: 'Open email draft', exact: true })
            .click()
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            'date',
          )
          const focusedField = await page
            .locator('#date')
            .evaluate((element) => {
              const box = element.getBoundingClientRect()
              const headerBottom =
                document.querySelector('body > header')?.getBoundingClientRect()
                  .bottom ?? 0
              const style = getComputedStyle(element)
              return {
                exposed: box.bottom > headerBottom && box.top < innerHeight,
                focusVisible: element.matches(':focus-visible'),
                ring: style.boxShadow,
                outline: style.outlineStyle,
              }
            })
          assert.ok(focusedField.exposed)
          assert.ok(focusedField.focusVisible)
          assert.ok(
            focusedField.ring !== 'none' || focusedField.outline !== 'none',
          )
          assert.equal(
            await page.locator('#date').getAttribute('aria-invalid'),
            'true',
          )
          assert.equal(
            await page.locator('#name').inputValue(),
            'Accessibility test',
          )
          await page.locator('#date').fill('2027-01-15')
          await page
            .getByRole('button', { name: 'Open email draft', exact: true })
            .click()
          assert.equal(
            await page.locator('#date').getAttribute('aria-invalid'),
            null,
          )
          assert.equal(await page.locator('#coverage').inputValue(), '2 hours')
          const errorRatio = await contrast(page.locator('#inquiry-errors'))
          const inlineErrorRatio = await contrast(page.locator('#error-guests'))
          const linkRatio = await contrast(page.locator('a[href="#pricing"]'))
          assert.ok(errorRatio >= 4.5, `Error contrast ${errorRatio}`)
          assert.ok(
            inlineErrorRatio >= 4.5,
            `Inline guest error contrast ${inlineErrorRatio}`,
          )
          assert.ok(linkRatio >= 4.5, `Link contrast ${linkRatio}`)
          return { errorRatio, inlineErrorRatio, linkRatio }
        } finally {
          await page.close()
        }
      },
    )
  }
  const textConsumers = [
    {
      path: '/contact/',
      selectors: [
        'main a[href="/services/event-portraits/"]',
        'main .text-link',
      ],
    },
    {
      path: '/privacy/',
      selectors: ['main a[href="/contact/"]', 'main .text-link'],
    },
    {
      path: '/portfolio/ya-hala/',
      selectors: [
        'main a.text-link[href*="youtube.com"]',
        'main a[href="https://yahalausa.net"]',
      ],
    },
    { path: '/galleries/', selectors: ['main a h2'] },
    {
      path: '/galleries/dawah-at-tampa-riverwalk/',
      selectors: ['main a[class*="hover:text-link"]'],
    },
    { path: '/', selectors: ['body > header a'] },
  ]
  for (const colorScheme of ['light', 'dark']) {
    for (const { path, selectors } of textConsumers) {
      await check(
        `public text contrast ${path} ${colorScheme}, normal/hover/focus`,
        async () => {
          const page = await browser.newPage({
            colorScheme,
            reducedMotion: 'reduce',
          })
          try {
            await page.goto(`${origin}${path}`)
            const measurements = []
            for (const selector of selectors) {
              const text = page.locator(selector).first()
              await text.waitFor({ state: 'visible', timeout: 5000 })
              await text.scrollIntoViewIfNeeded()
              const label = (await text.innerText()).trim()
              assert.ok(label, `Expected actual visible text for ${selector}`)
              const normal = await contrast(text)
              await text.hover()
              const hover = await contrast(text)
              const link = text.locator('xpath=ancestor-or-self::a[1]')
              let focus = null
              if (await link.count()) {
                await page.keyboard.press('Tab')
                await link.focus()
                assert.ok(
                  await link.evaluate(
                    (element) => element === document.activeElement,
                  ),
                )
                focus = await contrast(text)
              }
              assert.ok(normal >= 4.5, `${label}: normal ${normal}`)
              assert.ok(hover >= 4.5, `${label}: hover ${hover}`)
              assert.ok(
                focus === null || focus >= 4.5,
                `${label}: focus ${focus}`,
              )
              measurements.push({ label, normal, hover, focus })
            }
            return measurements
          } finally {
            await page.close()
          }
        },
      )
    }
  }
  await check(
    'gallery targets, reduced motion, Escape and focus return',
    async () => {
      const page = await browser.newPage({
        viewport: { width: 320, height: 800 },
        reducedMotion: 'reduce',
      })
      try {
        await page.goto(`${origin}/galleries/dawah-at-tampa-riverwalk/`)
        await page
          .locator('[data-gallery-favorite]:not([disabled])')
          .first()
          .waitFor()
        const favorite = await page
          .locator('[data-gallery-favorite]')
          .first()
          .boundingBox()
        assert.ok(favorite.width >= 44 && favorite.height >= 44)
        const opener = page.locator('[data-gallery-open="0"]')
        await opener.focus()
        await page.keyboard.press('Enter')
        await page.getByRole('dialog').waitFor()
        for (const name of ['Previous photograph', 'Next photograph']) {
          const box = await page
            .getByRole('button', { name, exact: true })
            .boundingBox()
          assert.ok(box.width >= 44 && box.height >= 44)
        }
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        assert.equal(
          await opener.evaluate(
            (element) => element === document.activeElement,
          ),
          true,
        )
        assert.ok(
          await page.evaluate(
            () => matchMedia('(prefers-reduced-motion: reduce)').matches,
          ),
        )
        const transition = await page
          .locator('[data-gallery-open="0"] img')
          .evaluate((element) => getComputedStyle(element).transitionDuration)
        assert.ok(
          transition.split(',').every((value) => parseFloat(value) <= 0.00001),
        )
        await page.emulateMedia({ forcedColors: 'active' })
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const style = getComputedStyle(document.activeElement)
          return {
            forced: matchMedia('(forced-colors: active)').matches,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
          }
        })
        assert.ok(focus.forced)
        assert.notEqual(focus.outlineStyle, 'none')
        assert.ok(parseFloat(focus.outlineWidth) >= 2)
        return focus
      } finally {
        await page.close()
      }
    },
  )
} finally {
  await browser.close()
}
console.log(
  JSON.stringify(
    {
      origin,
      results,
      unavailable: [
        'Actual 400% browser zoom',
        'Screen reader',
        'Physical mobile/touch device',
        'Full WCAG conformance evaluation',
      ],
    },
    null,
    2,
  ),
)
if (results.some((result) => !result.passed)) process.exitCode = 1
