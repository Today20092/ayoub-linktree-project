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

function createCommandHarness(
  photo: GuestPhoto,
  options: {
    publishError?: Error
    deleteGuestError?: Error
    deletePendingError?: Error
    deletePublicError?: Error
    insertPhotoError?: Error
    saveEventError?: Error
    settings?: GallerySettings
    optimized?: { buffer: Uint8Array; width: number; height: number }
  } = {},
) {
  const pending = new Map<string, Uint8Array>(
    photo.status === 'pending'
      ? [[photo.object_key, new Uint8Array([1, 2, 3])]]
      : [],
  )
  const published = new Map<string, Uint8Array>(
    photo.status === 'published'
      ? [[photo.object_key, new Uint8Array([1, 2, 3])]]
      : [],
  )
  let storedPhoto = photo
  let deleted = false
  const hidden = new Set<string>()
  let savedSettings:
    | { uploadsEnabled: boolean; password?: { salt: string; hash: string } }
    | undefined
  let savedEvent: SaveEventGalleryInput | undefined
  let savedInvite:
    Pick<GalleryInvite, 'token' | 'event_slug' | 'guest_name'> | undefined
  let insertedPhoto: Omit<GalleryPhoto, 'created_at'> | undefined
  const logs: Array<Record<string, unknown>> = []

  const dependencies: GalleryAdminCommandDependencies = {
    data: {
      getSettings: async () => options.settings,
      saveSettings: async (_eventSlug, uploadsEnabled, password) => {
        savedSettings = { uploadsEnabled, password }
      },
      getGuestPhoto: async () => storedPhoto,
      publishGuestPhoto: async (photoId, objectKey, alt) => {
        if (options.publishError) throw options.publishError
        storedPhoto = {
          ...storedPhoto,
          id: photoId,
          object_key: objectKey,
          alt,
          status: 'published',
          published_at: 1,
        }
      },
      deleteGuestPhoto: async () => {
        if (options.deleteGuestError) throw options.deleteGuestError
        deleted = true
      },
      hideProfessionalPhoto: async (_eventSlug, filename) => {
        hidden.add(filename)
      },
      restoreProfessionalPhoto: async (_eventSlug, filename) => {
        hidden.delete(filename)
      },
      listGalleryPhotos: async () => [],
      listGuestPhotos: async () => [storedPhoto],
      saveEventGallery: async (input) => {
        if (options.saveEventError) throw options.saveEventError
        savedEvent = input
      },
      createInvite: async (invite) => {
        savedInvite = invite
      },
      insertGalleryPhoto: async (inserted) => {
        if (options.insertPhotoError) throw options.insertPhotoError
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
        if (!(body instanceof Uint8Array)) {
          throw new Error('The test adapter expected a byte array.')
        }
        published.set(key, body)
      },
      deletePending: async (key) => {
        if (options.deletePendingError) throw options.deletePendingError
        pending.delete(key)
      },
      putPending: async (key, body) => {
        if (!(body instanceof Uint8Array)) {
          throw new Error('The test adapter expected a byte array.')
        }
        pending.set(key, body)
      },
      deletePublic: async (key) => {
        if (options.deletePublicError) throw options.deletePublicError
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
    pending,
    published,
    photo: () => storedPhoto,
    deleted: () => deleted,
    savedSettings: () => savedSettings,
    hidden,
    savedEvent: () => savedEvent,
    savedInvite: () => savedInvite,
    insertedPhoto: () => insertedPhoto,
    logs,
  }
}

test('approving a guest photo publishes it and removes the pending copy', async () => {
  const original: GuestPhoto = {
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
  }
  const state = createCommandHarness(original)

  const result = await executeGalleryAdminCommand(
    {
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
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'approveGuest', photoId: 'guest-photo', alt: 'Approved' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.equal(state.pending.size, 0)
  assert.deepEqual(
    [...state.published.keys()],
    ['events/event-one/guest/guest-photo.jpg'],
  )
  assert.equal(state.photo().status, 'published')
  assert.equal(state.photo().alt, 'Approved')
})

test('approval removes a copied public image when the database update fails', async () => {
  const original: GuestPhoto = {
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
  }
  const failure = new Error('Database unavailable')
  const state = createCommandHarness(original, { publishError: failure })

  await assert.rejects(
    executeGalleryAdminCommand(
      {
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
        },
        requestUrl: 'https://example.com/admin/galleries/event-one',
      },
      { action: 'approveGuest', photoId: 'guest-photo' },
      state.dependencies,
    ),
    failure,
  )

  assert.equal(state.published.size, 0)
  assert.equal(state.pending.size, 1)
  assert.equal(state.photo().status, 'pending')
})

test('rejecting a pending guest photo removes its image and record', async () => {
  const original: GuestPhoto = {
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
  }
  const state = createCommandHarness(original)

  const result = await executeGalleryAdminCommand(
    {
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
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'rejectGuest', photoId: 'guest-photo' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.equal(state.pending.size, 0)
  assert.equal(state.deleted(), true)
})

test('uploads cannot be enabled before the gallery has a password', async () => {
  const state = createCommandHarness({
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
  })

  await assert.rejects(
    executeGalleryAdminCommand(
      {
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
        },
        requestUrl: 'https://example.com/admin/galleries/event-one',
      },
      { action: 'settings', uploadsEnabled: true },
      state.dependencies,
    ),
    (error) =>
      error instanceof GalleryAdminCommandError &&
      error.status === 400 &&
      error.message === 'Set a password before enabling uploads.',
  )
  assert.equal(state.savedSettings(), undefined)
})

test('hiding a professional photo validates it against the event gallery', async () => {
  const state = createCommandHarness({
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
  })

  const result = await executeGalleryAdminCommand(
    {
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
        staticPhotos: [
          {
            src: 'https://photos.example/event-one/pro.jpg',
            width: 1200,
            height: 800,
            alt: 'Professional photo',
            filename: 'pro.jpg',
          },
        ],
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'hideProfessional', filename: 'pro.jpg' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.deepEqual([...state.hidden], ['pro.jpg'])
})

test('updating event details saves one normalized gallery record', async () => {
  const state = createCommandHarness({
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
  })

  const result = await executeGalleryAdminCommand(
    {
      event: {
        id: 'event-one',
        title: 'Old title',
        summary: 'Old summary',
        category: 'Event Photography',
        eventDate: null,
        eventTime: null,
        eventVenue: null,
        comingSoon: false,
        status: 'published',
        staticPhotos: [],
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
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
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
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

test('creating an invite returns the event-scoped upload link', async () => {
  const state = createCommandHarness({
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
  })

  const result = await executeGalleryAdminCommand(
    {
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
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'createInvite', guestName: '  Guest Name  ' },
    state.dependencies,
  )

  assert.deepEqual(state.savedInvite(), {
    token: 'generated-id',
    event_slug: 'event-one',
    guest_name: 'Guest Name',
  })
  assert.deepEqual(result, {
    status: 200,
    body: {
      ok: true,
      token: 'generated-id',
      url: 'https://example.com/galleries/event-one/upload/generated-id/',
    },
  })
})

test('setting a cover accepts only an image from the event gallery', async () => {
  const state = createCommandHarness({
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
  })
  const coverSrc = 'https://photos.example/event-one/pro.jpg'

  const result = await executeGalleryAdminCommand(
    {
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
        staticPhotos: [
          {
            src: coverSrc,
            width: 1200,
            height: 800,
            alt: 'Professional photo',
            filename: 'pro.jpg',
          },
        ],
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    {
      action: 'setCover',
      src: coverSrc,
      width: 1200,
      height: 800,
      alt: '  Event cover  ',
    },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.deepEqual(state.savedEvent(), {
    event_slug: 'event-one',
    title: 'Event One',
    summary: 'Event gallery',
    category: 'Event Photography',
    event_date: null,
    event_time: null,
    event_venue: null,
    coming_soon: false,
    status: 'published',
    cover: {
      src: coverSrc,
      width: 1200,
      height: 800,
      alt: 'Event cover',
    },
  })
})

test('uploading an admin photo stores one optimized gallery photo', async () => {
  const state = createCommandHarness(
    {
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
    },
    {
      optimized: {
        buffer: new Uint8Array([4, 5, 6]),
        width: 1200,
        height: 800,
      },
    },
  )
  const file = new File(['photo'], '../Original Photo.PNG', {
    type: 'image/png',
  })

  const result = await executeGalleryAdminCommand(
    {
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
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'uploadAdminPhoto', file, alt: '  Admin photo  ' },
    state.dependencies,
  )

  assert.deepEqual(result, {
    status: 201,
    body: { ok: true, id: 'generated-id' },
  })
  assert.deepEqual(state.insertedPhoto(), {
    id: 'generated-id',
    event_slug: 'event-one',
    object_key: 'events/event-one/photos/generated-id.jpg',
    original_filename: 'Original Photo.PNG',
    width: 1200,
    height: 800,
    alt: 'Admin photo',
    uploader_name: null,
    source: 'admin',
  })
  assert.deepEqual(
    [...state.published.keys()],
    ['events/event-one/photos/generated-id.jpg'],
  )
})

test('replacing a flyer saves matching flyer and cover metadata', async () => {
  const state = createCommandHarness(
    {
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
    },
    {
      optimized: {
        buffer: new Uint8Array([7, 8, 9]),
        width: 900,
        height: 1200,
      },
    },
  )
  const file = new File(['flyer'], 'flyer.png', { type: 'image/png' })

  const result = await executeGalleryAdminCommand(
    {
      event: {
        id: 'event-one',
        title: 'Event One',
        summary: 'Event gallery',
        category: 'Community',
        eventDate: '2026-08-01',
        eventTime: '18:00',
        eventVenue: 'Tampa',
        comingSoon: true,
        status: 'coming_soon',
        staticPhotos: [],
      },
      requestUrl: 'https://example.com/admin/galleries/event-one',
    },
    { action: 'updateFlyer', file },
    state.dependencies,
  )

  const objectKey = 'events/event-one/flyer-generated-id.jpg'
  const flyer = {
    object_key: objectKey,
    width: 900,
    height: 1200,
    alt: 'Event One flyer',
  }
  assert.deepEqual(result, { status: 201, body: { ok: true, flyer } })
  assert.deepEqual(state.savedEvent(), {
    event_slug: 'event-one',
    title: 'Event One',
    summary: 'Event gallery',
    category: 'Community',
    event_date: '2026-08-01',
    event_time: '18:00',
    event_venue: 'Tampa',
    coming_soon: true,
    status: 'coming_soon',
    flyer,
    cover: {
      src: `https://photos.ayoubabed.xyz/${objectKey}`,
      width: 900,
      height: 1200,
      alt: 'Event One flyer',
    },
  })
  assert.deepEqual([...state.published.keys()], [objectKey])
})

test('approval remains successful when pending cleanup must be retried', async () => {
  const failure = new Error('Pending bucket unavailable')
  const state = createCommandHarness(
    {
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
    },
    { deletePendingError: failure },
  )

  const result = await executeGalleryAdminCommand(
    commandContext(),
    { action: 'approveGuest', photoId: 'guest-photo' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.equal(state.photo().status, 'published')
  assert.equal(state.pending.size, 1)
  assert.equal(
    state.logs.some(
      ({ message, objectKey }) =>
        message === 'gallery guest cleanup failed' &&
        objectKey === 'pending/event-one/guest-photo.jpg',
    ),
    true,
  )
})

test('rejection keeps the pending image when deleting its record fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createCommandHarness(
    {
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
    },
    { deleteGuestError: failure },
  )

  await assert.rejects(
    executeGalleryAdminCommand(
      commandContext(),
      { action: 'rejectGuest', photoId: 'guest-photo' },
      state.dependencies,
    ),
    failure,
  )
  assert.equal(state.pending.size, 1)
})

test('removing a published guest photo deletes its public image and record', async () => {
  const state = createCommandHarness({
    id: 'guest-photo',
    event_slug: 'event-one',
    object_key: 'events/event-one/guest/guest-photo.jpg',
    original_filename: 'guest.jpg',
    width: 1600,
    height: 900,
    alt: 'Guest upload',
    status: 'published',
    created_at: 1,
    published_at: 2,
  })

  const result = await executeGalleryAdminCommand(
    commandContext(),
    { action: 'removeGuest', photoId: 'guest-photo' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.equal(state.published.size, 0)
  assert.equal(state.deleted(), true)
})

test('published removal restores the public image when deleting its record fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createCommandHarness(
    {
      id: 'guest-photo',
      event_slug: 'event-one',
      object_key: 'events/event-one/guest/guest-photo.jpg',
      original_filename: 'guest.jpg',
      width: 1600,
      height: 900,
      alt: 'Guest upload',
      status: 'published',
      created_at: 1,
      published_at: 2,
    },
    { deleteGuestError: failure },
  )

  await assert.rejects(
    executeGalleryAdminCommand(
      commandContext(),
      { action: 'removeGuest', photoId: 'guest-photo' },
      state.dependencies,
    ),
    failure,
  )
  assert.deepEqual(
    [...state.published.keys()],
    ['events/event-one/guest/guest-photo.jpg'],
  )
})

test('published removal keeps its record when public deletion fails', async () => {
  const failure = new Error('Public bucket unavailable')
  const state = createCommandHarness(
    {
      id: 'guest-photo',
      event_slug: 'event-one',
      object_key: 'events/event-one/guest/guest-photo.jpg',
      original_filename: 'guest.jpg',
      width: 1600,
      height: 900,
      alt: 'Guest upload',
      status: 'published',
      created_at: 1,
      published_at: 2,
    },
    { deletePublicError: failure },
  )

  await assert.rejects(
    executeGalleryAdminCommand(
      commandContext(),
      { action: 'removeGuest', photoId: 'guest-photo' },
      state.dependencies,
    ),
    failure,
  )
  assert.equal(state.deleted(), false)
  assert.equal(state.published.size, 1)
})

test('repeated approval cleans a stale pending object by its deterministic key', async () => {
  const state = createCommandHarness({
    id: 'guest-photo',
    event_slug: 'event-one',
    object_key: 'events/event-one/guest/guest-photo.jpg',
    original_filename: 'guest.jpg',
    width: 1600,
    height: 900,
    alt: 'Guest upload',
    status: 'published',
    created_at: 1,
    published_at: 2,
  })
  state.pending.set(
    'pending/event-one/guest-photo.jpg',
    new Uint8Array([1, 2, 3]),
  )

  const result = await executeGalleryAdminCommand(
    commandContext(),
    { action: 'approveGuest', photoId: 'guest-photo' },
    state.dependencies,
  )

  assert.deepEqual(result, { status: 200, body: { ok: true } })
  assert.equal(state.pending.size, 0)
})

test('restoring a professional photo reverses its hidden state', async () => {
  const state = createCommandHarness({
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
  })
  const context = commandContext({
    staticPhotos: [
      {
        src: 'https://photos.example/event-one/pro.jpg',
        filename: 'pro.jpg',
      },
    ],
  })

  await executeGalleryAdminCommand(
    context,
    { action: 'hideProfessional', filename: 'pro.jpg' },
    state.dependencies,
  )
  await executeGalleryAdminCommand(
    context,
    { action: 'restoreProfessional', filename: 'pro.jpg' },
    state.dependencies,
  )

  assert.deepEqual([...state.hidden], [])
})

test('enabling uploads reuses an existing gallery password', async () => {
  const state = createCommandHarness(
    {
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
    },
    {
      settings: {
        event_slug: 'event-one',
        uploads_enabled: 0,
        password_salt: 'salt',
        password_hash: 'hash',
        updated_at: 1,
      },
    },
  )

  await executeGalleryAdminCommand(
    commandContext(),
    { action: 'settings', uploadsEnabled: true },
    state.dependencies,
  )

  assert.deepEqual(state.savedSettings(), {
    uploadsEnabled: true,
    password: undefined,
  })
})

test('admin photo upload removes the public object when insertion fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createCommandHarness(
    {
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
    },
    {
      insertPhotoError: failure,
      optimized: {
        buffer: new Uint8Array([4, 5, 6]),
        width: 1200,
        height: 800,
      },
    },
  )

  await assert.rejects(
    executeGalleryAdminCommand(
      commandContext(),
      {
        action: 'uploadAdminPhoto',
        file: new File(['photo'], 'photo.png', { type: 'image/png' }),
      },
      state.dependencies,
    ),
    failure,
  )
  assert.equal(state.published.size, 0)
})

test('flyer replacement removes the public object when saving fails', async () => {
  const failure = new Error('Database unavailable')
  const state = createCommandHarness(
    {
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
    },
    {
      saveEventError: failure,
      optimized: {
        buffer: new Uint8Array([7, 8, 9]),
        width: 900,
        height: 1200,
      },
    },
  )

  await assert.rejects(
    executeGalleryAdminCommand(
      commandContext(),
      {
        action: 'updateFlyer',
        file: new File(['flyer'], 'flyer.png', { type: 'image/png' }),
      },
      state.dependencies,
    ),
    failure,
  )
  assert.equal(state.published.size, 0)
})
