import assert from 'node:assert/strict'
import test from 'node:test'
import { Effect } from 'effect'
import {
  guestUploadWorkflow,
  guestUploadLayer,
  type GuestUploadServices,
} from './gallery-guest-workflow'
import { runGalleryUseCase } from './gallery-effect'

function harness(invite = false) {
  const objects = new Map<string, { metadata?: R2HTTPMetadata }>()
  const rows: string[] = []
  const services: GuestUploadServices = {
    createId: () => 'fixed-guest',
    optimize: async () => ({
      buffer: new ArrayBuffer(3),
      width: 100,
      height: 80,
    }),
    put: async (isPublic, key, _body, metadata) => {
      objects.set(key, { metadata })
      rows.push(isPublic ? 'public' : 'private')
    },
    delete: async (_isPublic, key) => {
      objects.delete(key)
    },
    insertPublic: async () => {
      rows.push('published')
    },
    insertPending: async () => {
      rows.push('pending')
    },
    findPublic: async () => rows.includes('published'),
    findPending: async () => rows.includes('pending'),
    markInviteUsed: async () => {},
    log: () => {},
  }
  const input = {
    eventSlug: 'event',
    eventTitle: 'Event',
    file: new File(['bytes'], 'a.png', { type: 'image/png' }),
    invite: invite ? { token: 'invite', guest_name: 'Guest' } : undefined,
  }
  const run = () =>
    runGalleryUseCase(
      guestUploadWorkflow(input).pipe(
        Effect.provide(guestUploadLayer(services)),
      ),
    )
  return { services, input, run, objects, rows }
}

test('password guests remain private and pending; trusted invite guests publish directly', async () => {
  const password = harness()
  assert.deepEqual(await (await password.run()).json(), {
    id: 'fixed-guest',
    status: 'pending',
  })
  assert.deepEqual(password.rows, ['private', 'pending'])
  assert.equal(
    [...password.objects.values()][0].metadata?.cacheControl,
    'private, no-store',
  )
  const invite = harness(true)
  assert.deepEqual(await (await invite.run()).json(), {
    id: 'fixed-guest',
    status: 'published',
  })
  assert.deepEqual(invite.rows, ['public', 'published'])
})

test('invite bookkeeping failure cannot delete a published guest photo', async () => {
  const state = harness(true)
  state.services.markInviteUsed = async () => {
    throw new Error('bookkeeping failed')
  }
  assert.equal((await state.run()).status, 201)
  assert.equal(state.objects.size, 1)
})

test('failed guest metadata publication compensates bytes without masking original failure', async () => {
  const state = harness()
  state.services.insertPending = async () => {
    throw new Error('insert failed')
  }
  state.services.delete = async () => {
    throw new Error('cleanup failed')
  }
  await assert.rejects(state.run(), /insert failed/)
  assert.equal(state.objects.size, 1)
})
