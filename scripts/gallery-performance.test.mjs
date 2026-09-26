import assert from 'node:assert/strict'
import { test } from 'node:test'

const baseUrl = process.env.GALLERY_TEST_URL ?? 'http://localhost:4321'
const galleries = [
  'dawah-at-tampa-riverwalk',
  'muslim-business-chamber-2026',
  'sanad-silwadi-wedding',
]

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
      const worstSource = candidateSources.find(
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
