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
const contrast = async (locator, imageBackdrop, foregroundProperty = 'color') =>
  locator.evaluate(
    (element, { imageBackdrop, foregroundProperty }) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })
      const colors = []
      for (let current = element; current; current = current.parentElement)
        colors.unshift(
          current === element.parentElement && imageBackdrop
            ? imageBackdrop
            : getComputedStyle(current).backgroundColor,
        )
      context.fillStyle = 'white'
      context.fillRect(0, 0, 1, 1)
      for (const color of colors) {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
      }
      const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = getComputedStyle(element)[foregroundProperty]
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
    },
    { imageBackdrop, foregroundProperty },
  )
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
      await page.waitForFunction(
        () => document.activeElement.getBoundingClientRect().top >= 0,
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
  await check(
    'homepage Support links fit mobile and enlarged text',
    async () => {
      const measurements = []
      for (const colorScheme of ['light', 'dark']) {
        for (const width of [320, 360, 390, 430, 640, 768, 1280]) {
          const page = await browser.newPage({
            viewport: { width, height: 900 },
            colorScheme,
            reducedMotion: 'reduce',
          })
          try {
            await page.goto(origin)
            await page.evaluate(() => document.fonts.ready)
            const links = page
              .getByRole('navigation', {
                name: 'Support and payment links',
              })
              .getByRole('link')
            assert.equal(await links.count(), 6)
            for (const enlarged of [false, true]) {
              if (enlarged) {
                await page.addStyleTag({
                  content:
                    'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}',
                })
              }
              await noOverflow(page)
              const bounds = await links.evaluateAll((elements) =>
                elements.map((element) => {
                  const rect = element.getBoundingClientRect()
                  const label = element.querySelector('span')
                  const range = document.createRange()
                  range.selectNodeContents(label)
                  return {
                    text: element.textContent.trim(),
                    left: rect.left,
                    right: rect.right,
                    height: rect.height,
                    textFits: [...range.getClientRects()].every(
                      (part) =>
                        part.left >= rect.left - 1 &&
                        part.right <= rect.right + 1,
                    ),
                  }
                }),
              )
              for (const link of bounds) {
                assert.ok(
                  link.left >= 0 &&
                    link.right <= width &&
                    link.height >= 44 &&
                    link.textFits,
                  JSON.stringify({ width, colorScheme, enlarged, link }),
                )
              }
              measurements.push({ width, colorScheme, enlarged })
            }
          } finally {
            await page.close()
          }
        }
      }
      return measurements
    },
  )
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
    { path: '/admin/galleries/', selectors: ['main header .text-link'] },
    { path: '/admin/galleries/devices/', selectors: ['main > a.text-link'] },
    {
      path: '/admin/galleries/dawah-at-tampa-riverwalk/',
      selectors: ['main header .text-link'],
    },
    {
      path: '/galleries/dawah-at-tampa-riverwalk/upload/',
      selectors: ['main header .text-link'],
    },
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
    'review layouts with enlarged text and spacing, including expanded controls',
    async () => {
      const paths = [
        '/about/',
        '/contact/',
        '/privacy/',
        '/galleries/',
        '/admin/galleries/',
        '/admin/galleries/devices/',
        '/barber-tracker/',
        '/galleries/missing-gallery/',
      ]
      for (const path of paths) {
        const page = await browser.newPage({
          viewport: { width: 320, height: 900 },
          reducedMotion: 'reduce',
        })
        try {
          const response = await page.goto(`${origin}${path}`)
          assert.equal(
            response.status(),
            path.includes('missing-gallery') ? 404 : 200,
          )
          if (path === '/admin/galleries/')
            await page.locator('#event-title').waitFor({ state: 'attached' })
          await page
            .locator('details')
            .evaluateAll((elements) =>
              elements.forEach((element) => (element.open = true)),
            )
          if (path === '/admin/galleries/') {
            assert.equal(
              await page
                .getByRole('checkbox', { name: 'Coming soon', exact: true })
                .count(),
              1,
            )
          }
          await noOverflow(page)
          await page.addStyleTag({
            content:
              'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}',
          })
          await noOverflow(page)
          if (path === '/barber-tracker/') {
            const controls = await page
              .locator('.tally button')
              .evaluateAll((elements) =>
                elements.map((element) => ({
                  symbol: element.textContent.trim(),
                  name: element.getAttribute('aria-label'),
                })),
              )
            assert.equal(controls.length, 6)
            assert.ok(
              controls.every((control) =>
                control.name?.startsWith(
                  control.symbol === '+' ? 'Add one' : 'Subtract one',
                ),
              ),
            )
            for (const button of await page
              .locator('.tally button, .price-buttons button')
              .all()) {
              const size = await button.boundingBox()
              assert.ok(size.width >= 24 && size.height >= 24)
              assert.ok(
                await button.evaluate(
                  (element) => element.scrollHeight <= element.clientHeight + 1,
                ),
                'Tracker label must fit',
              )
            }
          }
        } finally {
          await page.close()
        }
      }
      return paths
    },
  )
  for (const colorScheme of ['light', 'dark']) {
    await check(
      `payment names, groups and QR dismissal ${colorScheme}`,
      async () => {
        const page = await browser.newPage({
          colorScheme,
          reducedMotion: 'reduce',
          viewport: { width: 390, height: 844 },
        })
        try {
          await page.goto(`${origin}/payments/`)
          assert.equal(
            await page
              .getByRole('group', { name: 'Tip by card or mobile wallet' })
              .count(),
            1,
          )
          assert.equal(
            await page.getByRole('group', { name: 'Payment apps' }).count(),
            1,
          )
          assert.equal(
            await page
              .getByRole('link', {
                name: '$20 Suggested',
                exact: true,
              })
              .count(),
            1,
          )
          const opener = page.getByRole('button', {
            name: 'Show QR code to scan',
          })
          await opener.click()
          await page.getByRole('dialog').waitFor()
          await page.locator('.qr-code svg').waitFor()
          await page.keyboard.press('Escape')
          await page.getByRole('dialog').waitFor({ state: 'hidden' })
          assert.ok(
            await opener.evaluate(
              (element) => document.activeElement === element,
            ),
          )
        } finally {
          await page.close()
        }
      },
    )
    await check(
      `coverage indicators and image-overlay contrast ${colorScheme}`,
      async () => {
        const page = await browser.newPage({
          colorScheme,
          reducedMotion: 'reduce',
        })
        const measurements = []
        try {
          await page.goto(`${origin}/services/event-portraits/`)
          const choices = page.locator('[data-coverage]')
          assert.equal(await choices.count(), 4)
          for (const choice of await choices.all()) {
            assert.match(
              await choice.innerText(),
              /about 20 portrait sessions per hour/,
            )
          }
          const choice = choices.first()
          const checkmark = choice.locator('.coverage-check')
          assert.equal(await checkmark.locator('svg').isVisible(), false)
          const resting = await contrast(checkmark, undefined, 'borderTopColor')
          assert.ok(resting >= 3, `Indicator boundary: ${resting}`)
          await choice.click()
          assert.equal(await choice.getAttribute('aria-pressed'), 'true')
          await checkmark.locator('svg').waitFor({ state: 'visible' })
          const selected = await contrast(checkmark)
          assert.ok(selected >= 3, `Selected indicator: ${selected}`)
          measurements.push({ resting, selected })
          for (const [path, selector] of [
            ['/galleries/', 'main a > div > span'],
            ['/portfolio/ya-hala/', '[data-youtube-play] > span'],
          ]) {
            await page.goto(`${origin}${path}`)
            const overlay = page.locator(selector).first()
            await overlay.waitFor({ state: 'visible' })
            for (const backdrop of ['black', 'white']) {
              const ratio = await contrast(overlay, backdrop)
              assert.ok(ratio >= 4.5, `${path} over ${backdrop}: ${ratio}`)
              measurements.push({ path, backdrop, ratio })
            }
          }
          return measurements
        } finally {
          await page.close()
        }
      },
    )
  }
  await check('portfolio table navigation target sizes', async () => {
    const page = await browser.newPage({
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    })
    try {
      await page.goto(`${origin}/portfolio/chop-shop-show-podcast/`)
      const links = page.locator('th[scope="row"] > a')
      assert.equal(await links.count(), 4)
      for (const link of await links.all()) {
        const box = await link.boundingBox()
        assert.ok(box.width >= 24 && box.height >= 24, JSON.stringify(box))
      }
    } finally {
      await page.close()
    }
  })
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
        await page.waitForFunction(() => {
          const button = document.querySelector(
            '[role="dialog"] button[aria-label="Next photograph"]',
          )
          const box = button?.getBoundingClientRect()
          return box && box.width >= 43.99 && box.height >= 43.99
        })
        for (const name of ['Previous photograph', 'Next photograph']) {
          const box = await page
            .getByRole('button', { name, exact: true })
            .boundingBox()
          assert.ok(box.width >= 44 && box.height >= 44)
        }
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'detached' })
        await page.waitForFunction(
          () =>
            document.activeElement ===
            document.querySelector('[data-gallery-open="0"]'),
        )
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
