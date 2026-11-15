import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { themeScript } from './ThemeBoot.mjs'

function boot({ saved = null, dark = false, blocked = false } = {}) {
  const listeners = {}
  const classes = new Set()
  const root = {
    classList: {
      toggle: (name, enabled) =>
        enabled ? classes.add(name) : classes.delete(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    style: {},
    dataset: {},
  }
  const media = {
    matches: dark,
    addEventListener: (name, fn) => (listeners.media = fn),
  }
  const metas = [{ media: 'light' }, { media: 'dark' }]
  const buttons = ['system', 'light', 'dark'].map((value) => ({
    dataset: { themeOption: value },
    setAttribute(name, value) {
      this[name] = value
    },
  }))
  const storage = {
    getItem() {
      if (blocked) throw Error()
      return saved
    },
    setItem(key, value) {
      if (blocked) throw Error()
      saved = value
    },
    removeItem() {
      if (blocked) throw Error()
      saved = null
    },
  }
  const document = {
    documentElement: root,
    querySelectorAll: (selector) =>
      selector.startsWith('meta') ? metas : buttons,
    addEventListener: (name, fn) => (listeners[name] = fn),
  }
  const window = {
    matchMedia: () => media,
    addEventListener: (name, fn) => (listeners[name] = fn),
  }
  vm.runInNewContext(themeScript, {
    document,
    window,
    localStorage: storage,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  })
  const click = (value) =>
    listeners.click({
      target: {
        closest: () =>
          buttons.find((button) => button.dataset.themeOption === value),
      },
    })
  return {
    root,
    classes,
    media,
    metas,
    buttons,
    listeners,
    click,
    setSaved: (value) => {
      saved = value
    },
  }
}

test('boot applies stored theme before paint and keeps reveal ready', () => {
  const app = boot({ saved: 'dark' })
  assert.equal(app.classes.has('dark'), true)
  assert.equal(app.root.style.colorScheme, 'dark')
  assert.equal(app.root.dataset.revealReady, 'true')
  assert.deepEqual(
    app.metas.map((meta) => meta.content),
    ['#1c1917', '#1c1917'],
  )
  assert.equal(app.buttons[2]['aria-pressed'], 'true')
})

test('system follows changes, explicit choices persist, and storage events sync', () => {
  const app = boot()
  app.media.matches = true
  app.listeners.media()
  assert.equal(app.classes.has('dark'), true)
  app.click('light')
  app.listeners.media()
  assert.equal(app.classes.has('dark'), false)
  app.setSaved('dark')
  app.listeners.storage({ key: 'theme' })
  assert.equal(app.buttons[2]['aria-pressed'], 'true')
  app.click('system')
  assert.equal(app.classes.has('dark'), true)
  assert.deepEqual(
    app.metas.map((meta) => meta.content),
    ['#ffffff', '#1c1917'],
  )
})

test('blocked storage falls back to system and still allows a session choice', () => {
  const app = boot({ blocked: true, dark: true })
  assert.equal(app.classes.has('dark'), true)
  app.click('light')
  app.media.matches = false
  app.listeners.media()
  assert.equal(app.root.dataset.themePreference, 'light')
  app.click('system')
  assert.equal(app.root.dataset.themePreference, 'system')
})
