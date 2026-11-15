import assert from 'node:assert/strict'
import test from 'node:test'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'

import { galleryAdminAuthorized, galleryAdminGate } from './gallery-admin'

test('requires a signed Access token outside local development', async () => {
  const production = new Request('https://ayoubabed.xyz/admin/galleries', {
    headers: {
      'cf-access-authenticated-user-email': 'ayoub@example.com',
    },
  })
  const spoofed = new Request('https://ayoubabed.xyz/admin/galleries')
  const local = new Request('http://localhost:4321/admin/galleries')

  assert.equal(
    await galleryAdminAuthorized(production, 'ayoub@example.com'),
    false,
  )
  assert.equal(
    await galleryAdminAuthorized(spoofed, 'ayoub@example.com'),
    false,
  )
  assert.equal(await galleryAdminAuthorized(local, 'ayoub@example.com'), true)
})

test('accepts a valid Access JWT for the configured admin', async () => {
  const issuer = 'https://gallery-test.cloudflareaccess.com'
  const audience = 'gallery-admin-audience'
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const publicJwk = await exportJWK(publicKey)
  publicJwk.kid = 'gallery-test-key'
  const token = await new SignJWT({ email: 'ayoub@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime('1h')
    .sign(privateKey)
  const request = new Request('https://ayoubabed.xyz/admin/galleries', {
    headers: { 'cf-access-jwt-assertion': token },
  })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => Response.json({ keys: [publicJwk] })

  try {
    assert.equal(
      await galleryAdminAuthorized(
        request,
        'ayoub@example.com',
        issuer,
        audience,
      ),
      true,
    )
    assert.equal(
      await galleryAdminAuthorized(
        request,
        'someone-else@example.com',
        issuer,
        audience,
      ),
      false,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('admin gate covers every admin path family and the payments host', async () => {
  const env = { GALLERY_ADMIN_EMAIL: 'ayoub@example.com' }
  const gate = (url: string) => galleryAdminGate(new Request(url), env)
  for (const path of [
    '/admin/galleries/',
    '/admin',
    '//admin/galleries',
    '/%61dmin/galleries',
    '/ADMIN/galleries',
    '/%E0%A4%A',
  ])
    assert.equal(await gate(`https://ayoubabed.xyz${path}`), 'forbidden', path)
  assert.equal(
    await gate('https://ayoubabed.xyz/api/admin/galleries/devices'),
    'forbidden-api',
  )
  for (const path of ['/administrator', '/api/companion/devices', '/'])
    assert.equal(await gate(`https://ayoubabed.xyz${path}`), 'skip', path)
  assert.equal(await gate('http://localhost:4321/admin/galleries/'), 'allow')
  assert.equal(
    await gate('https://payments.ayoubabed.xyz/admin/galleries/'),
    'not-found',
  )
})
