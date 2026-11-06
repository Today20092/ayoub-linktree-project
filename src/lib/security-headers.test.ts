import assert from 'node:assert/strict'
import test from 'node:test'
import { withSecurityHeaders } from './security-headers'

test('server-rendered responses get the static security headers', () => {
  const response = withSecurityHeaders(new Response('page'))
  assert.match(
    response.headers.get('Strict-Transport-Security')!,
    /max-age=31536000/,
  )
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY')
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(
    response.headers.get('Referrer-Policy'),
    'strict-origin-when-cross-origin',
  )
})

test('immutable responses are copied instead of throwing', () => {
  const response = Response.redirect('https://ayoubabed.xyz/', 301)
  const result = withSecurityHeaders(response)
  assert.equal(result.status, 301)
  assert.equal(result.headers.get('X-Frame-Options'), 'DENY')
})

test('headers a route already set are kept', () => {
  const response = withSecurityHeaders(
    new Response('page', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } }),
  )
  assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN')
})

test('unlisted responses prevent edge injection without losing their cache policy', () => {
  const response = withSecurityHeaders(
    new Response('unlisted gallery', {
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    }),
  )
  assert.equal(response.headers.get('Cache-Control'), 'no-store, no-transform')
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
  assert.equal(
    withSecurityHeaders(response).headers.get('Cache-Control'),
    'no-store, no-transform',
  )
})

test('errors prevent edge injection while public pages keep their cache policy', () => {
  const error = withSecurityHeaders(new Response('missing', { status: 404 }))
  assert.equal(error.headers.get('Cache-Control'), 'no-transform')
  const page = withSecurityHeaders(
    new Response('public gallery', {
      headers: { 'Cache-Control': 'public, max-age=60' },
    }),
  )
  assert.equal(page.headers.get('Cache-Control'), 'public, max-age=60')
})
