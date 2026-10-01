import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import ts from 'typescript'

test('YouTube loads only on Play and repeated activation creates one player', () => {
  const source = readFileSync(
    new URL('../src/components/YouTubeEmbed.astro', import.meta.url),
    'utf8',
  )
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)
  let activate
  let loads = 0
  let focused = false
  let loadListener
  const classes = new Set(['opacity-0'])
  const posterClasses = new Set()
  const iframe = {
    classList: { remove: (name) => classes.delete(name) },
    addEventListener: (event, callback) => {
      assert.equal(event, 'load')
      loadListener = callback
    },
    focus: () => {
      focused = true
    },
  }
  const player = { replaceChildren: (child) => assert.equal(child, iframe) }
  const poster = { classList: { add: (name) => posterClasses.add(name) } }
  const button = {
    addEventListener: (event, callback, options) => {
      assert.equal(event, 'click')
      assert.equal(options.once, true)
      activate = callback
    },
  }
  const embed = {
    dataset: { youtubeId: 'video123', youtubeTitle: 'Portfolio video' },
    querySelector: (selector) =>
      ({
        '[data-youtube-player]': player,
        '[data-youtube-poster]': poster,
        '[data-youtube-play]': button,
      })[selector],
  }
  runInNewContext(ts.transpileModule(script, {}).outputText, {
    URLSearchParams,
    document: {
      querySelectorAll: () => [embed],
      createElement: (tag) => {
        assert.equal(tag, 'iframe')
        loads++
        return iframe
      },
    },
    // No IntersectionObserver or matchMedia: neither can trigger eager loading.
    window: {},
  })
  assert.equal(loads, 0)
  assert.equal(posterClasses.size, 0)
  activate()
  activate()
  assert.equal(loads, 1)
  const url = new URL(iframe.src)
  assert.equal(url.origin, 'https://www.youtube-nocookie.com')
  assert.equal(url.searchParams.get('autoplay'), '1')
  assert.notEqual(url.searchParams.get('mute'), '1')
  assert.equal(iframe.title, 'Portfolio video')
  assert.equal(focused, true)
  loadListener()
  assert.equal(classes.has('opacity-0'), false)
  assert.equal(posterClasses.has('invisible'), true)
})
