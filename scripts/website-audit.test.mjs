import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'

// Run against the built local Worker described in docs/production-audit.md.
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:8788'
const siteOrigin = process.env.AUDIT_SITE_ORIGIN ?? 'https://ayoubabed.xyz'
const page = async (path) => {
  const response = await fetch(new URL(path, origin))
  assert.equal(response.status, 200, path)
  return response.text()
}

test('gallery continuation pages have distinct concise metadata and descriptive navigation', async () => {
  const path = '/galleries/muslim-business-chamber-2026/'
  const first = await page(path)
  const second = await page(path + '?page=2')
  const title = second.match(/<title>(.*?)<\/title>/)?.[1]
  assert.ok(title.length <= 75)
  assert.match(title, /Page 2/)
  const description = (html) =>
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]
  assert.notEqual(description(first), description(second))
  assert.match(description(second), /photos 41–80 of 167/)
  assert.match(second, /Previous photo page/)
  assert.match(second, /Next photo page/)
  assert.match(second, /rel="canonical"[^>]*href="[^"]*\?page=2"/)
})

test('hero preloads match rendered responsive image candidates', async () => {
  for (const path of [
    '/',
    '/services/event-portraits/',
    '/portfolio/ya-hala/',
    '/portfolio/portraits/',
    '/galleries/',
    '/galleries/muslim-business-chamber-2026/',
  ]) {
    const html = await page(path)
    const head = html.split('</head>')[0]
    const link = (head.match(/<link\b[^>]*>/g) || []).find(
      (tag) => /as="image"/.test(tag) && /rel="preload"/.test(tag),
    )
    assert.ok(link, `${path} has a head image preload`)
    const srcset = link.match(/imagesrcset="([^"]+)"/)?.[1]
    const sizes = link.match(/imagesizes="([^"]+)"/)?.[1]
    assert.ok(srcset && sizes, `${path} has responsive preload attributes`)
    assert.ok(
      (html.match(/<img\b[^>]*>/g) || []).some(
        (tag) =>
          tag.includes(`srcset="${srcset}"`) &&
          tag.includes(`sizes="${sizes}"`),
      ),
      `${path} preload matches an actual image`,
    )
    if (path === '/') assert.match(link, /media="\(min-width: 768px\)"/)
  }
})

test('the first gallery thumbnail row loads eagerly while later photos stay lazy', async () => {
  const html = await page('/galleries/dawah-at-tampa-riverwalk/')
  const thumbnails = [
    ...html.matchAll(/<a\b[^>]*data-gallery-open="\d+"[^>]*>[\s\S]*?<\/a>/g),
  ]
    .map(([anchor]) => anchor.match(/<img\b[^>]*>/)?.[0])
    .filter(Boolean)
  assert.ok(thumbnails.length > 5)
  assert.ok(
    thumbnails.slice(0, 5).every((image) => image.includes('loading="eager"')),
  )
  assert.ok(
    thumbnails.slice(5).every((image) => image.includes('loading="lazy"')),
  )
})

test('visible gallery card rows load eagerly with one high-priority cover', async () => {
  for (const path of ['/galleries/', '/admin/galleries/']) {
    const images = ((await page(path)).match(/<img\b[^>]*>/g) || []).slice(0, 3)
    assert.equal(images.length, 3)
    assert.ok(images.every((image) => image.includes('loading="eager"')))
    assert.equal(
      images.filter((image) => image.includes('fetchpriority="high"')).length,
      1,
    )
  }
})

test('photography proof links target the public delivery site from local builds too', async () => {
  const html = await page('/services/event-portraits/')
  assert.match(
    html,
    /href="https:\/\/ayoubabed.xyz\/galleries\/angels-birthday-party-2026\/"/,
  )
  assert.doesNotMatch(html, /href="\/galleries\/angels-birthday-party-2026\/"/)
  for (const path of ['/index.md', '/llms.txt']) {
    const text = await page(path)
    assert.ok(
      text.includes(
        'https://ayoubabed.xyz/galleries/angels-birthday-party-2026/',
      ),
    )
    assert.ok(text.includes(`${siteOrigin}/services/event-portraits/`))
  }
})

test('missing gallery recovery does not echo private URLs or load analytics', async () => {
  const response = await fetch(
    new URL('/galleries/missing-gallery/?share=private-test-token', origin),
  )
  assert.equal(response.status, 404)
  const html = await response.text()
  assert.match(html, /Page not found/)
  assert.match(html, /href="\/galleries\/"/)
  assert.doesNotMatch(html, /private-test-token|beacon\.min\.js/)
})

test('video controls keep their visible words in their accessible names', async () => {
  const html = await page('/portfolio/chop-shop-show-podcast/')
  const links = [
    ...html.matchAll(
      /<a\b([^>]*aria-label="([^"]*)"[^>]*)>\s*Watch on YouTube\s*<\/a>/g,
    ),
  ]
  assert.ok(links.length > 0)
  for (const link of links) assert.match(link[2], /^Watch on YouTube: /)
  assert.match(html, /<span aria-hidden="true"[^>]*>▶<\/span>\s*Play/)
})

test('portfolio hero video posters describe their 896px container', async () => {
  const html = await page('/portfolio/ya-hala/')
  const poster = (html.match(/<img\b[^>]*>/g) ?? []).find((tag) =>
    tag.includes('data-youtube-poster'),
  )
  assert.ok(poster)
  assert.match(
    poster,
    /sizes="\(min-width: 960px\) 896px, \(min-width: 640px\) calc\(100vw - 48px\), calc\(100vw - 32px\)"/,
  )
})

const schemas = (html) =>
  [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ].flatMap((match) => {
    const value = JSON.parse(match[1])
    return value['@graph'] ?? [value]
  })

test('About and Contact describe the actual page in structured data', async () => {
  for (const [path, type] of [
    ['/', 'ProfilePage'],
    ['/about/', 'AboutPage'],
    ['/contact/', 'ContactPage'],
  ]) {
    const data = schemas(await page(path)).find(
      (item) => item['@type'] === type,
    )
    assert.ok(data, `${path} has ${type} schema`)
    assert.equal(data.url, `${siteOrigin}${path}`)
    assert.equal(data.mainEntity.name, 'Ayoub Abedrabbo')
  }
})

test('public gallery breadcrumbs describe their visible navigation', async () => {
  for (const slug of [
    'dawah-at-tampa-riverwalk',
    'muslim-business-chamber-2026',
    'sanad-silwadi-wedding',
  ]) {
    const path = `/galleries/${slug}/`
    const data = schemas(await page(path)).find(
      (item) => item['@type'] === 'BreadcrumbList',
    )
    assert.ok(data, `${path} has breadcrumb schema`)
    assert.deepEqual(
      data.itemListElement.map((item) => [item.position, item.item]),
      [
        [1, `${siteOrigin}/`],
        [2, `${siteOrigin}/galleries/`],
        [3, `${siteOrigin}${path}`],
      ],
    )
  }
  assert.equal(
    (await fetch(new URL('/galleries/missing-audit-gallery/', origin))).status,
    404,
  )
})

test('gallery thumbnails retain responsive previews without redundant picture wrappers', async () => {
  for (const slug of [
    'dawah-at-tampa-riverwalk',
    'muslim-business-chamber-2026',
    'sanad-silwadi-wedding',
  ]) {
    const html = await page(`/galleries/${slug}/`)
    const figures = [
      ...html.matchAll(
        /<figure\b[^>]*data-gallery-filename="([^"]+)"[^>]*>([\s\S]*?)<\/figure>/g,
      ),
    ]
    assert.ok(figures.length > 0)
    for (const [, filename, figure] of figures) {
      assert.doesNotMatch(figure, /<picture\b|<source\b/)
      assert.match(figure, /<img\b[^>]*srcset="[^"]+ 960w"/)
      assert.match(figure, /data-gallery-open="\d+"/)
      assert.match(figure, /data-gallery-favorite/)
      assert.ok(figure.includes(filename))
    }
    if (slug === 'dawah-at-tampa-riverwalk')
      assert.doesNotMatch(html, /<span\b[^>]*data-face-rank/)
  }
})

test('text fonts are served locally without a third-party stylesheet chain', async () => {
  const html = await page('/')
  assert.doesNotMatch(html, /https:\/\/(?:api|cdn)\.fontshare\.com/)
  const fontLinks = [
    ...html.matchAll(/<link\b[^>]*href="([^"]+\.woff2)"[^>]*>/g),
  ]
  assert.ok(fontLinks.length > 0, 'essential fonts are preloaded')
  for (const [, href] of fontLinks) {
    const url = new URL(href, origin)
    assert.equal(url.origin, origin)
    const response = await fetch(url)
    assert.equal(response.status, 200)
    assert.equal(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      'wOF2',
    )
  }
})

test('the web manifest starts at home and matches the default browser theme', async () => {
  const manifest = JSON.parse(await page('/site.webmanifest'))
  assert.equal(manifest.start_url, '/')
  const html = await page('/')
  const theme = html.match(/<meta\s+name="theme-color"\s+content="([^"]+)"/)
  assert.ok(theme)
  assert.equal(manifest.theme_color, theme[1])
})

test('restaurant photographs have right-sized default image downloads', async () => {
  const html = await page('/portfolio/al-forno-lebanese-grill-utc/')
  const tags = [...html.matchAll(/<img\b[^>]*>/g)].filter((match) =>
    /p1170048|p1170053/.test(match[0]),
  )
  const urls = [
    ...new Set(
      tags.flatMap(([tag]) =>
        [...tag.matchAll(/\b(?:src|srcset)="([^"]+)"/g)].flatMap(([, value]) =>
          value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]),
        ),
      ),
    ),
  ]
  assert.ok(urls.length >= 2)
  for (const url of urls) {
    const response = await fetch(new URL(url.replaceAll('&amp;', '&'), origin))
    assert.equal(response.status, 200)
    assert.ok((await response.arrayBuffer()).byteLength <= 200 * 1024, url)
  }
})

test('cards and portfolio photographs bound their fallback image downloads', async () => {
  for (const path of [
    '/',
    '/galleries/',
    '/admin/galleries/',
    '/portfolio/arqam-academy/',
    '/portfolio/bayaan-academy/',
    '/portfolio/results-after-work-podcast/',
  ]) {
    const html = await page(path)
    const urls = [
      ...new Set(
        [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(
          (match) => match[1],
        ),
      ),
    ]
    for (const url of urls) {
      const response = await fetch(
        new URL(url.replaceAll('&amp;', '&'), origin),
      )
      assert.equal(response.status, 200, url)
      assert.ok(
        (await response.arrayBuffer()).byteLength <= 200 * 1024,
        `${path}: ${url}`,
      )
    }
  }
})

test('portfolio social cards use a landscape crop with truthful dimensions', async () => {
  const html = await page('/portfolio/portraits/')
  assert.ok(html.includes('property="og:image:width" content="1200"'))
  assert.ok(html.includes('property="og:image:height" content="630"'))
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1]
  assert.ok(image)
  const local = new URL(image)
  const response = await fetch(
    new URL(local.pathname + local.search.replaceAll('&amp;', '&'), origin),
  )
  assert.equal(response.status, 200)
  const metadata = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata()
  assert.equal(metadata.width, 1200)
  assert.equal(metadata.height, 630)
})

test('public agent guidance points readers to the offer and respects gallery access', async () => {
  const guidance = await page('/AGENTS.md')
  assert.match(guidance, /\/llms\.txt/)
  assert.match(guidance, /\/services\/event-portraits\//)
  assert.match(guidance, /unlisted/)
  assert.doesNotMatch(
    guidance,
    /Deployment Workflow|codebase-memory-mcp|workspaces/,
  )
})

test('security reports have a public contact without a promised response policy', async () => {
  const contact = await page('/.well-known/security.txt')
  assert.match(contact, /^Contact: mailto:Ayoub@AyoubAbed.xyz$/m)
  assert.match(
    contact,
    /^Canonical: https:\/\/ayoubabed.xyz\/\.well-known\/security.txt$/m,
  )
  const expires = contact.match(/^Expires: (.+)$/m)?.[1]
  assert.ok(
    Date.parse(expires) > Date.now(),
    'security contact has not expired',
  )
})
