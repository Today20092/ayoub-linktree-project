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
