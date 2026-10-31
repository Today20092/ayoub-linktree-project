import assert from 'node:assert/strict'
import test from 'node:test'

const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:8788'
const site = process.env.AUDIT_SITE_ORIGIN ?? 'https://ayoubabed.xyz'

test('public discovery and canonical URLs use the built site origin', async () => {
  for (const path of [
    '/robots.txt',
    '/llms.txt',
    '/index.md',
    '/sitemap.xml',
  ]) {
    const response = await fetch(new URL(path, origin))
    assert.equal(response.status, 200, path)
    const body = await response.text()
    assert.ok(body.includes(`${site}/`), path)
    if (site !== 'https://ayoubabed.xyz')
      assert.ok(!body.includes('https://ayoubabed.xyz/'), path)
  }
  for (const path of [
    '/',
    '/about/',
    '/galleries/',
    '/galleries/dawah-at-tampa-riverwalk/',
  ]) {
    const response = await fetch(new URL(path, origin))
    assert.equal(response.status, 200, path)
    assert.match(
      await response.text(),
      new RegExp(
        `<link[^>]*rel="canonical"[^>]*href="${site.replaceAll('.', '\\.')}\\${path}"`,
      ),
    )
  }
})

test('public preview does not grant anonymous gallery management', async () => {
  for (const path of ['/admin/galleries/', '/api/admin/galleries/']) {
    const response = await fetch(new URL(path, origin), { redirect: 'manual' })
    assert.ok(
      [302, 303, 401, 403].includes(response.status),
      `${path}: ${response.status}`,
    )
  }
  assert.equal(
    (await fetch(new URL('/galleries/nonexistent-preview-check/', origin)))
      .status,
    404,
  )
})
