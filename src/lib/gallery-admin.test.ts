import assert from 'node:assert/strict'
import test from 'node:test'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'

import {
  galleryAdminAuthorized,
  parseGalleryAdminAction,
} from './gallery-admin'

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

test('parses only supported admin actions', () => {
  assert.deepEqual(
    parseGalleryAdminAction({
      action: 'settings',
      uploadsEnabled: true,
      password: 'event-password',
    }),
    {
      action: 'settings',
      uploadsEnabled: true,
      password: 'event-password',
    },
  )
  assert.deepEqual(
    parseGalleryAdminAction({
      action: 'hideProfessional',
      filename: 'photo.jpg',
    }),
    { action: 'hideProfessional', filename: 'photo.jpg' },
  )
  assert.equal(
    parseGalleryAdminAction({ action: 'deleteEverything' }),
    undefined,
  )
})
