export const themeScript = `;(() => {
  const key = 'theme'
  const colors = { light: '#ffffff', dark: '#1c1917' } // design-system-allow: browser theme-color metadata requires literal colors
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const root = document.documentElement
  let transientPreference
  let transitionFrame

  const read = () => {
    if (transientPreference) return transientPreference
    try {
      const value = localStorage.getItem(key)
      return value === 'light' || value === 'dark' ? value : 'system'
    } catch {
      return 'system'
    }
  }
  const apply = (preference = read()) => {
    const dark = preference === 'dark' || (preference === 'system' && media.matches)
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    root.dataset.themePreference = preference
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = preference === 'system'
        ? (meta.media.includes('dark') ? colors.dark : colors.light)
        : colors[preference]
    })
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === preference))
    })
  }
  const switchTheme = (preference) => {
    root.classList.add('no-transitions')
    apply(preference)
    cancelAnimationFrame(transitionFrame)
    transitionFrame = requestAnimationFrame(() => {
      transitionFrame = requestAnimationFrame(() => root.classList.remove('no-transitions'))
    })
  }
  const set = (preference) => {
    transientPreference = undefined
    try {
      if (preference === 'system') localStorage.removeItem(key)
      else localStorage.setItem(key, preference)
    } catch {
      transientPreference = preference
    }
    switchTheme(preference)
  }
  apply()
  root.dataset.revealReady = 'true'
  media.addEventListener('change', () => {
    if (read() === 'system') switchTheme('system')
  })
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) {
      transientPreference = undefined
      switchTheme(read())
    }
  })
  document.addEventListener('DOMContentLoaded', () => apply())
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-option]')
    const preference = button?.dataset.themeOption
    if (preference === 'system' || preference === 'light' || preference === 'dark') set(preference)
  })
  document.addEventListener('astro:after-swap', () => apply())
})()`
