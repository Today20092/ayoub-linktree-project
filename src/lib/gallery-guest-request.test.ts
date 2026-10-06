import assert from 'node:assert/strict'
import test from 'node:test'
import { Effect } from 'effect'
import {
  guestUploadRequest,
  type GuestUploadRequestDependencies,
} from './gallery-guest-request'
import { guestSessionRequest } from './gallery-guest-session'
import {
  createGallerySession,
  hashGalleryPassword,
  verifyGallerySession,
} from './gallery-auth'

function fixture() {
  const objects = new Map<
    string,
    { public: boolean; metadata: R2HTTPMetadata }
  >()
  const pending = new Set<string>()
  const published = new Set<string>()
  const state = { visible: true, enabled: true, allowed: true }
  const settings = { uploads_enabled: 1, password_salt: '', password_hash: '' }
  let counter = 0
  const dependencies: GuestUploadRequestDependencies = {
    reader: {
      get: () =>
        Effect.sync(() => (state.visible ? { title: 'Event' } : undefined)),
      getUploadContext: () =>
        Effect.sync(() =>
          state.visible
            ? {
                settings: {
                  ...settings,
                  uploads_enabled: state.enabled ? 1 : 0,
                },
              }
            : undefined,
        ),
      getInviteContext: (slug, token) =>
        Effect.succeed(
          slug === 'event' && token === 'trusted'
            ? { invite: { event_slug: 'event', token, guest_name: 'Guest' } }
            : undefined,
        ),
    },
    sessionSecret: 'test-only-session-secret',
    now: () => 1000,
    limit: async () => ({ success: state.allowed }),
    services: {
      createId: () => `guest-${++counter}`,
      optimize: async () => ({
        buffer: new ArrayBuffer(3),
        width: 100,
        height: 80,
      }),
      put: async (isPublic, key, _bytes, metadata) => {
        objects.set(key, { public: isPublic, metadata })
      },
      delete: async (_isPublic, key) => {
        objects.delete(key)
      },
      insertPublic: async (photo) => {
        published.add(photo.id)
      },
      insertPending: async (photo) => {
        pending.add(photo.id)
      },
      findPublic: async (id) => published.has(id),
      findPending: async (id) => pending.has(id),
      markInviteUsed: async () => {},
      log: () => {},
    },
  }
  const request = (
    cookie?: string,
    invite?: string,
    body?: BodyInit,
    headers: Record<string, string> = {},
  ) => {
    const form = new FormData()
    form.set('photo', new File(['photo'], 'photo.png', { type: 'image/png' }))
    return new Request(
      `https://example.com/api/galleries/event/uploads/${invite ? `?invite=${invite}` : ''}`,
      {
        method: 'POST',
        headers: {
          ...(cookie ? { cookie: `gallery_upload_session=${cookie}` } : {}),
          ...headers,
        },
        body: body ?? form,
      },
    )
  }
  return { dependencies, request, state, settings, objects, pending, published }
}

test('guest upload boundary preserves session scope, visibility, settings, invitations and throttling', async () => {
  const { dependencies, request, state, objects, pending, published } =
    fixture()
  const valid = await createGallerySession(
    'event',
    dependencies.sessionSecret!,
    1000,
  )
  const otherEvent = await createGallerySession(
    'other-event',
    dependencies.sessionSecret!,
    1000,
  )
  const run = (cookie?: string, invite?: string) =>
    guestUploadRequest(request(cookie, invite), 'event', dependencies)
  assert.equal((await run()).status, 401)
  assert.equal((await run(otherEvent)).status, 401)
  assert.equal((await run('%')).status, 401)
  state.enabled = false
  assert.equal((await run(valid)).status, 403)
  assert.equal((await run(undefined, 'wrong')).status, 403)
  const trusted = await run(undefined, 'trusted')
  assert.equal(trusted.status, 201)
  assert.equal(trusted.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await trusted.json(), { id: 'guest-1', status: 'published' })
  assert.equal(published.size, 1)
  state.enabled = true
  const password = await run(valid)
  assert.deepEqual(await password.json(), { id: 'guest-2', status: 'pending' })
  assert.equal(pending.size, 1)
  assert.equal(
    [...objects.values()].filter((object) => !object.public)[0].metadata
      .cacheControl,
    'private, no-store',
  )
  state.allowed = false
  assert.equal((await run(valid)).status, 429)
  assert.equal((await run(undefined, 'trusted')).status, 429)
  state.visible = false
  assert.equal((await run(valid)).status, 404)
  assert.equal(objects.size, 2)
})

test('guest upload boundary rejects malformed forms and oversize headers without publishing', async () => {
  const { dependencies, request, objects } = fixture()
  const token = await createGallerySession(
    'event',
    dependencies.sessionSecret!,
    1000,
  )
  assert.equal(
    (
      await guestUploadRequest(
        request(token, undefined, 'not multipart', {
          'content-type': 'multipart/form-data; boundary=test',
        }),
        'event',
        dependencies,
      )
    ).status,
    400,
  )
  assert.equal(
    (
      await guestUploadRequest(
        request(token, undefined, new FormData()),
        'event',
        dependencies,
      )
    ).status,
    415,
  )
  assert.equal(
    (
      await guestUploadRequest(
        request(token, undefined, undefined, {
          'content-length': String(22 * 1024 * 1024),
        }),
        'event',
        dependencies,
      )
    ).status,
    413,
  )
  assert.equal(objects.size, 0)
})

test('uncertain guest publication retains bytes, reports a safe response, and logs only its category', async (context) => {
  const { dependencies, request, objects } = fixture()
  const logs: string[] = []
  context.mock.method(console, 'error', (...args: unknown[]) =>
    logs.push(args.join(' ')),
  )
  dependencies.services.insertPublic = async () => {
    throw new Error('secret=test-private-data')
  }
  dependencies.services.findPublic = async () => {
    throw new Error('secret=another-secret')
  }
  const response = await guestUploadRequest(
    request(undefined, 'trusted'),
    'event',
    dependencies,
  )
  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    error: 'The photo could not be processed.',
  })
  assert.equal(objects.size, 1)
  assert.equal(
    logs.some((log) => log.includes('Database')),
    true,
  )
  assert.equal(
    logs.some((log) => log.includes('secret=')),
    false,
  )
})

test('password session boundary retains response contracts and creates an event-scoped cookie', async () => {
  const { dependencies, state, settings } = fixture()
  const password = await hashGalleryPassword('test-password')
  settings.password_salt = password.salt
  settings.password_hash = password.hash
  const request = (body = JSON.stringify({ password: 'test-password' })) =>
    new Request('https://example.com/api/galleries/event/session/', {
      method: 'POST',
      body,
    })
  assert.equal(
    (await guestSessionRequest(request('bad json'), 'event', dependencies))
      .status,
    400,
  )
  assert.equal(
    (
      await guestSessionRequest(
        request(JSON.stringify({ password: 'wrong-password' })),
        'event',
        dependencies,
      )
    ).status,
    401,
  )
  state.enabled = false
  assert.equal(
    (await guestSessionRequest(request(), 'event', dependencies)).status,
    403,
  )
  state.enabled = true
  state.allowed = false
  assert.equal(
    (await guestSessionRequest(request(), 'event', dependencies)).status,
    429,
  )
  state.allowed = true
  assert.equal(
    (
      await guestSessionRequest(request(), 'event', {
        ...dependencies,
        sessionSecret: undefined,
      })
    ).status,
    503,
  )
  const response = await guestSessionRequest(request(), 'event', dependencies)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  const cookie = response.headers.get('set-cookie')!
  assert.equal(cookie.includes('Path=/api/galleries/event'), true)
  assert.equal(cookie.includes('HttpOnly'), true)
  assert.equal(cookie.includes('Secure'), true)
  const token = decodeURIComponent(cookie.split(';')[0].split('=')[1])
  assert.equal(
    await verifyGallerySession(
      token,
      'event',
      dependencies.sessionSecret!,
      1000,
    ),
    true,
  )
  assert.equal(
    await verifyGallerySession(
      token,
      'other-event',
      dependencies.sessionSecret!,
      1000,
    ),
    false,
  )
})
