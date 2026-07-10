import assert from 'node:assert/strict'
import test from 'node:test'

import {
  executeGalleryAdminCommand,
  GalleryAdminCommandError,
  type GalleryAdminCommandContext,
  type GalleryAdminCommandDependencies,
  type GalleryAdminEventContext,
} from './gallery-admin-commands'
import type {
  GalleryInvite,
  GalleryPhoto,
  GallerySettings,
  GuestPhoto,
  SaveEventGalleryInput,
} from './gallery-data'

const bytes = () => new Uint8Array([1, 2, 3])

function guestPhoto(overrides: Partial<GuestPhoto> = {}): GuestPhoto {
  return {
    id: 'guest-photo',
    event_slug: 'event-one',
    object_key: 'pending/event-one/guest-photo.jpg',
    original_filename: 'guest.jpg',
    width: 1600,
    height: 900,
    alt: 'Guest upload',
    status: 'pending',
    created_at: 1,
    published_at: null,
    ...overrides,
  }
}

function commandContext(
  event: Partial<GalleryAdminEventContext> = {},
): GalleryAdminCommandContext {
  return {
    event: {
      id: 'event-one',
      title: 'Event One',
      summary: 'Event gallery',
      category: 'Event Photography',
      eventDate: null,
      eventTime: null,
      eventVenue: null,
      comingSoon: false,
      status: 'published',
      staticPhotos: [],
      ...event,
    },
    requestUrl: 'https://example.com/admin/galleries/event-one',
  }
}

type HarnessErrors = {
  publish?: Error
  deleteGuest?: Error
  deletePending?: Error
  deletePublic?: Error
  insertPhoto?: Error
  saveEvent?: Error
}

function createHarness(
  options: {
    photo?: GuestPhoto
    settings?: GallerySettings
    optimized?: { buffer: Uint8Array; width: number; height: number }
    errors?: HarnessErrors
  } = {},
) {
  const errors = options.errors ?? {}
  let photo = options.photo ?? guestPhoto()
  const pending = new Map<string, Uint8Array>(
    photo.status === 'pending' ? [[photo.object_key, bytes()]] : [],
  )
  const published = new Map<string, Uint8Array>(
    photo.status === 'published' ? [[photo.object_key, bytes()]] : [],
  )
  const hidden = new Set<string>()
  const logs: Array<Record<string, unknown>> = []
  let deleted = false
  let savedSettings:
    | { uploadsEnabled: boolean; password?: { salt: string; hash: string } }
    | undefined
  let savedEvent: SaveEventGalleryInput | undefined
  let savedInvite:
    Pick<GalleryInvite, 'token' | 'event_slug' | 'guest_name'> | undefined
  let insertedPhoto: Omit<GalleryPhoto, 'created_at'> | undefined

  const dependencies: GalleryAdminCommandDependencies = {
    data: {
      getSettings: async () => options.settings,
      saveSettings: async (_slug, uploadsEnabled, password) => {
        savedSettings = { uploadsEnabled, password }
      },
      getGuestPhoto: async () => photo,
      publishGuestPhoto: async (id, objectKey, alt) => {
        if (errors.publish) throw errors.publish
        photo = {
          ...photo,
          id,
          object_key: objectKey,
          alt,
          status: 'published',
          published_at: 1,
        }
      },
      deleteGuestPhoto: async () => {
        if (errors.deleteGuest) throw errors.deleteGuest
        deleted = true
      },
      hideProfessionalPhoto: async (_slug, filename) => {
        hidden.add(filename)
      },
      restoreProfessionalPhoto: async (_slug, filename) => {
        hidden.delete(filename)
      },
      listGalleryPhotos: async () => [],
      listGuestPhotos: async () => [photo],
      saveEventGallery: async (input) => {
        if (errors.saveEvent) throw errors.saveEvent
        savedEvent = input
      },
      createInvite: async (invite) => {
        savedInvite = invite
      },
      insertGalleryPhoto: async (inserted) => {
        if (errors.insertPhoto) throw errors.insertPhoto
        insertedPhoto = inserted
      },
    },
    objects: {
      getPending: async (key) => {
        const body = pending.get(key)
        return body ? { body } : undefined
      },
      getPublic: async (key) => {
        const body = published.get(key)
        return body ? { body } : undefined
      },
      publicExists: async (key) => published.has(key),
      putPublic: async (key, body) => {
        assert.ok(body instanceof Uint8Array)
        published.set(key, body)
      },
      deletePending: async (key) => {
        if (errors.deletePending) throw errors.deletePending
        pending.delete(key)
      },
      putPending: async (key, body) => {
        assert.ok(body instanceof Uint8Array)
        pending.set(key, body)
      },
      deletePublic: async (key) => {
        if (errors.deletePublic) throw errors.deletePublic
        published.delete(key)
      },
    },
    images: {
      optimize: async () => {
        if (options.optimized) return options.optimized
        throw new Error('Image optimization was not expected.')
      },
    },
    passwords: {
      valid: () => true,
      hash: async () => ({ salt: 'salt', hash: 'hash' }),
    },
    createId: () => 'generated-id',
    log: (entry) => logs.push(entry),
  }

  return {
    dependencies,
    errors,
    pending,
    published,
    hidden,
    logs,
    photo: () => photo,
    deleted: () => deleted,
    savedSettings: () => savedSettings,
    savedEvent: () => savedEvent,
    savedInvite: () => savedInvite,
    insertedPhoto: () => insertedPhoto,
  }
}

const run = (
  command: unknown,
  state: ReturnType<typeof createHarness>,
  context = commandContext(),
) => executeGalleryAdminCommand(context, command, state.dependencies)

test('approves a guest photo and removes its pending copy', async () => {
  const state = createHarness()
  assert.deepEqual(
    await run(
      { action: 'approveGuest', photoId: 'guest-photo', alt: 'Approved' },
      state,
    ),
    { status: 200, body: { ok: true } },
  )
  assert.equal(state.pending.size, 0)
  assert.deepEqual(
    [...state.published],
    [['events/event-one/guest/guest-photo.jpg', bytes()]],
  )
  assert.equal(state.photo().alt, 'Approved')
})

test('rolls back a copied image when guest publishing fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createHarness({ errors: { publish: failure } })
  await assert.rejects(
    run({ action: 'approveGuest', photoId: 'guest-photo' }, state),
    failure,
  )
  assert.equal(state.pending.size, 1)
  assert.equal(state.published.size, 0)
})

test('retries deterministic cleanup after approval succeeds', async () => {
  const state = createHarness({
    errors: { deletePending: new Error('Bucket unavailable') },
  })
  assert.deepEqual(
    await run({ action: 'approveGuest', photoId: 'guest-photo' }, state),
    { status: 200, body: { ok: true } },
  )
  assert.equal(state.pending.size, 1)
  assert.equal(
    state.logs.some(
      ({ objectKey }) => objectKey === 'pending/event-one/guest-photo.jpg',
    ),
    true,
  )

  state.errors.deletePending = undefined
  await run({ action: 'approveGuest', photoId: 'guest-photo' }, state)
  assert.equal(state.pending.size, 0)
})

test('rejects a pending guest photo', async () => {
  const state = createHarness()
  await run({ action: 'rejectGuest', photoId: 'guest-photo' }, state)
  assert.equal(state.pending.size, 0)
  assert.equal(state.deleted(), true)
})

test('restores a pending image when record deletion fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createHarness({ errors: { deleteGuest: failure } })
  await assert.rejects(
    run({ action: 'rejectGuest', photoId: 'guest-photo' }, state),
    failure,
  )
  assert.equal(state.pending.size, 1)
})

test('removes a published photo', async () => {
  const state = createHarness({
    photo: guestPhoto({
      status: 'published',
      object_key: 'events/event-one/guest/guest-photo.jpg',
      published_at: 2,
    }),
  })
  await run({ action: 'removeGuest', photoId: 'guest-photo' }, state)
  assert.equal(state.published.size, 0)
  assert.equal(state.deleted(), true)
})

test('restores a public image when record deletion fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createHarness({
    photo: guestPhoto({
      status: 'published',
      object_key: 'events/event-one/guest/guest-photo.jpg',
      published_at: 2,
    }),
    errors: { deleteGuest: failure },
  })
  await assert.rejects(
    run({ action: 'removeGuest', photoId: 'guest-photo' }, state),
    failure,
  )
  assert.equal(state.published.size, 1)
})

test('keeps the record when public deletion fails', async () => {
  const failure = new Error('Bucket unavailable')
  const state = createHarness({
    photo: guestPhoto({
      status: 'published',
      object_key: 'events/event-one/guest/guest-photo.jpg',
      published_at: 2,
    }),
    errors: { deletePublic: failure },
  })
  await assert.rejects(
    run({ action: 'removeGuest', photoId: 'guest-photo' }, state),
    failure,
  )
  assert.equal(state.deleted(), false)
  assert.equal(state.published.size, 1)
})

test('requires a password before enabling uploads', async () => {
  const state = createHarness()
  await assert.rejects(
    run({ action: 'settings', uploadsEnabled: true }, state),
    (error) =>
      error instanceof GalleryAdminCommandError &&
      error.message === 'Set a password before enabling uploads.',
  )
})

test('reuses an existing upload password', async () => {
  const state = createHarness({
    settings: {
      event_slug: 'event-one',
      uploads_enabled: 0,
      password_salt: 'salt',
      password_hash: 'hash',
      updated_at: 1,
    },
  })
  await run({ action: 'settings', uploadsEnabled: true }, state)
  assert.deepEqual(state.savedSettings(), {
    uploadsEnabled: true,
    password: undefined,
  })
})

test('hides and restores a professional photo', async () => {
  const state = createHarness()
  const context = commandContext({
    staticPhotos: [{ src: 'photo.jpg', filename: 'photo.jpg' }],
  })
  await run(
    { action: 'hideProfessional', filename: 'photo.jpg' },
    state,
    context,
  )
  await run(
    { action: 'restoreProfessional', filename: 'photo.jpg' },
    state,
    context,
  )
  assert.deepEqual([...state.hidden], [])
})

test('normalizes updated event details', async () => {
  const state = createHarness()
  await run(
    {
      action: 'updateEvent',
      title: '  New title  ',
      summary: '  New summary  ',
      eventDate: '2026-08-01',
      eventTime: '18:00',
      eventVenue: 'Tampa',
      category: 'Community',
      comingSoon: true,
      visibilityStatus: 'coming_soon',
    },
    state,
  )
  assert.deepEqual(state.savedEvent(), {
    event_slug: 'event-one',
    title: 'New title',
    summary: 'New summary',
    event_date: '2026-08-01',
    event_time: '18:00',
    event_venue: 'Tampa',
    category: 'Community',
    coming_soon: true,
    status: 'coming_soon',
  })
})

test('creates an event-scoped invite', async () => {
  const state = createHarness()
  assert.deepEqual(
    await run({ action: 'createInvite', guestName: '  Guest Name  ' }, state),
    {
      status: 200,
      body: {
        ok: true,
        token: 'generated-id',
        url: 'https://example.com/galleries/event-one/upload/generated-id/',
      },
    },
  )
  assert.deepEqual(state.savedInvite(), {
    token: 'generated-id',
    event_slug: 'event-one',
    guest_name: 'Guest Name',
  })
})

test('sets a cover from an event photo', async () => {
  const state = createHarness()
  const src = 'https://photos.example/event-one/photo.jpg'
  await run(
    { action: 'setCover', src, width: 1200, height: 800, alt: ' Cover ' },
    state,
    commandContext({ staticPhotos: [{ src, filename: 'photo.jpg' }] }),
  )
  assert.deepEqual(state.savedEvent()?.cover, {
    src,
    width: 1200,
    height: 800,
    alt: 'Cover',
  })
})

test('uploads an admin photo and compensates insertion failure', async () => {
  const optimized = { buffer: bytes(), width: 1200, height: 800 }
  const state = createHarness({ optimized })
  assert.deepEqual(
    await run(
      {
        action: 'uploadAdminPhoto',
        file: new File(['photo'], '../Photo.PNG', { type: 'image/png' }),
        alt: ' Admin photo ',
      },
      state,
    ),
    { status: 201, body: { ok: true, id: 'generated-id' } },
  )
  assert.equal(state.insertedPhoto()?.original_filename, 'Photo.PNG')
  assert.equal(state.published.size, 1)

  const failure = new Error('Database unavailable')
  const failed = createHarness({
    optimized,
    errors: { insertPhoto: failure },
  })
  await assert.rejects(
    run(
      {
        action: 'uploadAdminPhoto',
        file: new File(['photo'], 'photo.png', { type: 'image/png' }),
      },
      failed,
    ),
    failure,
  )
  assert.equal(failed.published.size, 0)
})

test('replaces a flyer and compensates save failure', async () => {
  const optimized = { buffer: bytes(), width: 900, height: 1200 }
  const state = createHarness({ optimized })
  const command = {
    action: 'updateFlyer',
    file: new File(['flyer'], 'flyer.png', { type: 'image/png' }),
  }
  const result = await run(command, state)
  assert.equal(result.status, 201)
  assert.equal(
    state.savedEvent()?.flyer?.object_key,
    'events/event-one/flyer-generated-id.jpg',
  )
  assert.equal(state.published.size, 1)

  const failure = new Error('Database unavailable')
  const failed = createHarness({
    optimized,
    errors: { saveEvent: failure },
  })
  await assert.rejects(run(command, failed), failure)
  assert.equal(failed.published.size, 0)
})

test('rejects unsupported commands', async () => {
  await assert.rejects(
    run({ action: 'deleteEverything' }, createHarness()),
    (error) =>
      error instanceof GalleryAdminCommandError && error.status === 400,
  )
})
