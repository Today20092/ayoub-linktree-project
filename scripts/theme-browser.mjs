import assert from 'node:assert/strict'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.WEB_UI_TEST_URL ?? 'http://localhost:4321'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
let checks = 0
const failures = []
const checkTheme = async (page, preference, dark) => {
  await page.waitForFunction(
    ({ preference, dark }) =>
      document.documentElement.dataset.themePreference === preference &&
      document.documentElement.classList.contains('dark') === dark,
    { preference, dark },
  )
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
    dark ? 'dark' : 'light',
  )
  for (const option of ['system', 'light', 'dark'])
    assert.equal(
      await page
        .locator(`[data-theme-option="${option}"]`)
        .getAttribute('aria-pressed'),
      String(option === preference),
    )
  checks++
}
try {
  await context.addInitScript(() => {
    requestAnimationFrame(() => {
      window.firstThemeFrame = {
        dark: document.documentElement.classList.contains('dark'),
        preference: document.documentElement.dataset.themePreference,
      }
    })
  })
  const page = await context.newPage()
  const violations = []
  page.on('console', (message) => {
    if (
      /content security policy|refused to execute|violates the following/i.test(
        message.text(),
      )
    )
      violations.push(message.text())
  })
  page.on('pageerror', (error) => {
    if (/content security policy/i.test(error.message))
      violations.push(error.message)
  })
  await page.goto(origin)
  await checkTheme(page, 'system', false)
  await page.emulateMedia({ colorScheme: 'dark' })
  await checkTheme(page, 'system', true)
  await page.emulateMedia({ colorScheme: 'light' })
  await checkTheme(page, 'system', false)
  for (const [preference, system] of [
    ['light', 'dark'],
    ['dark', 'light'],
  ]) {
    await page.emulateMedia({ colorScheme: system })
    const button = page.locator(`[data-theme-option="${preference}"]`)
    await button.focus()
    await page.keyboard.press('Enter')
    await checkTheme(page, preference, preference === 'dark')
    assert.equal(
      await page.evaluate(() => localStorage.getItem('theme')),
      preference,
    )
    await page.reload()
    await checkTheme(page, preference, preference === 'dark')
    const first = await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => resolve(window.firstThemeFrame)),
        ),
    )
    assert.deepEqual(first, { dark: preference === 'dark', preference })
    checks++
  }
  const second = await context.newPage()
  await second.goto(origin)
  await checkTheme(second, 'dark', true)
  await page.locator('[data-theme-option="light"]').click()
  await checkTheme(second, 'light', false)
  await second.locator('[data-theme-option="system"]').click()
  await checkTheme(page, 'system', false)
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const size of [100, 200]) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = `${size}%`
      }, size)
      const measurements = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        header: document.querySelector('header').scrollWidth,
        targets: [...document.querySelectorAll('[data-theme-option]')].map(
          (el) => ({
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          }),
        ),
      }))
      if (measurements.document > width || measurements.header > width)
        failures.push({ width, size, measurements })
      for (const target of measurements.targets)
        if (target.width < 44 || target.height < 44)
          failures.push({ width, size, target })
      checks++
    }
  }
  assert.deepEqual(violations, [])
  checks++
  console.log(
    JSON.stringify(
      {
        origin,
        checks,
        cspViolations: violations.length,
        failures,
        note: 'First animation frame observes theme state; this is not a video-based flash measurement.',
      },
      null,
      2,
    ),
  )
  assert.deepEqual(failures, [])
} finally {
  await context.close()
  await browser.close()
}
