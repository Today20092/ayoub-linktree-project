import assert from 'node:assert/strict'
import { test } from 'node:test'

const baseUrl = process.env.GALLERY_TEST_URL ?? 'http://localhost:4321'
const galleries = [
  'dawah-at-tampa-riverwalk',
  'muslim-business-chamber-2026',
  'sanad-silwadi-wedding',
]

test('gallery pages bound cards, preserve global indexes and expose no-JS links', async () => {
  const path = '/galleries/dawah-at-tampa-riverwalk/'
  const first = await (await fetch(new URL(path, baseUrl))).text()
  assert.equal((first.match(/data-gallery-filename=/g) ?? []).length, 40)
  assert.match(first, /href="[^" ]*\?page=2"/)
  const second = await (await fetch(new URL(`${path}?page=2`, baseUrl))).text()
  assert.equal((second.match(/data-gallery-filename=/g) ?? []).length, 18)
  assert.match(second, /data-gallery-open="40"/)
  assert.match(second, /rel="canonical"[^>]*href="[^" ]*\?page=2"/)
  for (const value of [
    '0',
    '-1',
    '1.5',
    '1e2',
    ' 2',
    '9007199254740992',
    '3',
    '',
  ]) {
    assert.equal(
      (
        await fetch(
          new URL(`${path}?page=${encodeURIComponent(value)}`, baseUrl),
        )
      ).status,
      404,
      value,
    )
  }
  const linked = await (
    await fetch(new URL(`${path}?photo=41`, baseUrl))
  ).text()
  assert.match(linked, /data-gallery-open="40"/)
  assert.doesNotMatch(linked, /data-gallery-open="0"/)
})

test('discoverable gallery pages enumerate every authorized photo exactly once', async () => {
  const sitemap = await (await fetch(new URL('/sitemap.xml', baseUrl))).text()
  for (const [slug, total] of [
    ['dawah-at-tampa-riverwalk', 58],
    ['muslim-business-chamber-2026', 167],
    ['sanad-silwadi-wedding', 201],
  ]) {
    const filenames = []
    for (let page = 1; page <= Math.ceil(total / 40); page++) {
      const path = `/galleries/${slug}/${page > 1 ? `?page=${page}` : ''}`
      assert.ok(sitemap.includes(path), path)
      const response = await fetch(new URL(path, baseUrl))
      assert.equal(response.status, 200)
      const html = await response.text()
      const cards = [...html.matchAll(/data-gallery-filename="([^"]+)"/g)].map(
        (match) => match[1],
      )
      assert.equal(cards.length, Math.min(40, total - (page - 1) * 40))
      filenames.push(...cards)
      const indexes = [...html.matchAll(/data-gallery-open="(\d+)"/g)].map(
        (match) => Number(match[1]),
      )
      assert.deepEqual(
        indexes,
        Array.from(
          { length: cards.length },
          (_, index) => (page - 1) * 40 + index,
        ),
      )
    }
    assert.equal(filenames.length, total)
    assert.equal(new Set(filenames).size, total)
  }
})

test('public galleries render one lightbox slide and bounded image variants', async () => {
  for (const slug of galleries) {
    let response
    let html = ''
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(`${baseUrl}/galleries/${slug}/`)
      html = await response.text()
      if (response.status === 200 && html) break
    }
    assert.equal(response.status, 200)

    assert.equal(
      (html.match(/data-gallery-slide/g) ?? []).length,
      1,
      'lightbox should server-render one reusable slide',
    )
    assert.equal(
      /(?:w|width)=2400/.test(html),
      false,
      'gallery HTML should not request 2400px image variants',
    )

    const candidateSources = (html.match(/<img[^>]+>/g) ?? [])
      .flatMap((tag) => {
        const src = tag.match(/\bsrc="([^"]+)"/)?.[1]
        const srcset = tag.match(/\bsrcset="([^"]+)"/)?.[1]
        return [
          src,
          ...(srcset ?? '')
            .split(',')
            .map((part) => part.trim().split(/\s+/)[0]),
        ]
      })
      .filter((source) => source?.includes('/_image/'))
      .map((source) => source.replaceAll('&amp;', '&'))
    assert.ok(
      candidateSources.length > 0,
      'gallery should render optimized images',
    )
    assert.ok(
      candidateSources.every((source) => /[?&]q=\d+/.test(source)),
      'optimized gallery candidates should declare image quality',
    )

    const gridCandidates = candidateSources.filter((source) =>
      /[?&]w=960(?:&|$)/.test(source),
    )
    assert.ok(
      gridCandidates.length > 0,
      'gallery should render grid candidates',
    )
    assert.ok(
      gridCandidates.every((source) => /[?&]q=85(?:&|$)/.test(source)),
      'gallery grid candidates should use quality 85',
    )

    const previewSource = candidateSources[0]
    assert.ok(previewSource, 'gallery should render an optimized preview')
    const previewResponse = await fetch(new URL(previewSource, baseUrl))
    assert.equal(previewResponse.status, 200)
    assert.match(
      previewResponse.headers.get('content-type') ?? '',
      /^image\/webp(?:;|$)/,
    )
    assert.ok(
      (await previewResponse.arrayBuffer()).byteLength < 200_000,
      'gallery preview should stay below the image warning threshold',
    )

    if (slug === 'dawah-at-tampa-riverwalk') {
      const laterHtml = await (
        await fetch(`${baseUrl}/galleries/${slug}/?page=2`)
      ).text()
      const laterCandidates = [
        ...laterHtml.matchAll(/(?:src|srcset)="([^"]+)"/g),
      ].flatMap((match) =>
        match[1]
          .replaceAll('&amp;', '&')
          .split(',')
          .map((value) => value.trim().split(/\s+/)[0]),
      )
      const worstSource = [...candidateSources, ...laterCandidates].find(
        (source) =>
          source.includes('P1271791.JPG') && /[?&]w=960(?:&|$)/.test(source),
      )
      assert.ok(worstSource, 'Dawah regression image should remain in the grid')
      const worstResponse = await fetch(new URL(worstSource, baseUrl))
      assert.equal(worstResponse.status, 200)
      assert.ok(
        (await worstResponse.arrayBuffer()).byteLength < 200_000,
        'worst known gallery grid preview should stay below the image warning threshold',
      )
    }
  }
})
