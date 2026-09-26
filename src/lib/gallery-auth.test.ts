import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac, pbkdf2Sync } from 'node:crypto'

import {
  createGallerySession,
  gallerySessionCookie,
  hashGalleryPassword,
  setGallerySessionCookie,
  validGalleryPassword,
  verifyGalleryPassword,
  verifyGallerySession,
} from './gallery-auth'

test('hashes and verifies gallery passwords', async () => {
  const stored = await hashGalleryPassword('correct horse battery staple')

  assert.equal(
    await verifyGalleryPassword(
      'correct horse battery staple',
      stored.salt,
      stored.hash,
    ),
    true,
  )
  assert.equal(
    await verifyGalleryPassword('incorrect password', stored.salt, stored.hash),
    false,
  )
  assert.equal(validGalleryPassword('short'), false)
  assert.equal(validGalleryPassword('eight888'), true)
})

test('passwords work with Workers Web Crypto limits and preserve existing hashes', async (t) => {
  t.mock.method(crypto.subtle, 'deriveBits', () => {
    throw new DOMException(
      'Pbkdf2 iteration counts above 100000 are not supported',
      'NotSupportedError',
    )
  })
  const password = 'correct horse battery staple'
  const stored = await hashGalleryPassword(password)
  assert.equal(
    await verifyGalleryPassword(password, stored.salt, stored.hash),
    true,
  )
  const salt = Buffer.from('0123456789abcdef')
  const legacyHash = createHmac(
    'sha256',
    pbkdf2Sync(password, salt, 210_000, 32, 'sha256'),
  )
    .update('gallery-password-verifier')
    .digest('base64url')
  assert.equal(
    await verifyGalleryPassword(
      password,
      salt.toString('base64url'),
      legacyHash,
    ),
    true,
  )
  assert.equal(
    await verifyGalleryPassword(
      'wrong-password',
      salt.toString('base64url'),
      legacyHash,
    ),
    false,
  )
})

test('signs event-scoped expiring sessions', async () => {
  const token = await createGallerySession('event-one', 'test-secret', 1_000)

  assert.equal(
    await verifyGallerySession(token, 'event-one', 'test-secret', 1_001),
    true,
  )
  assert.equal(
    await verifyGallerySession(token, 'event-two', 'test-secret', 1_001),
    false,
  )
  assert.equal(
    await verifyGallerySession(token, 'event-one', 'wrong-secret', 1_001),
    false,
  )
  assert.equal(
    await verifyGallerySession(token, 'event-one', 'test-secret', 50_000),
    false,
  )
})

test('sets and reads the upload session cookie', () => {
  const header = setGallerySessionCookie('event-one', 'payload.signature')
  const request = new Request('https://example.com', {
    headers: { cookie: header.split(';')[0] },
  })

  assert.equal(gallerySessionCookie(request), 'payload.signature')
  assert.match(header, /HttpOnly/)
  assert.match(header, /Secure/)
  assert.match(header, /SameSite=Lax/)
  assert.match(header, /Path=\/api\/galleries\/event-one/)
})
