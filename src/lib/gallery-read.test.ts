import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionEntry } from 'astro:content'

import { createGalleryReader } from './gallery-read'
import type { EventGallery, GalleryPhoto, GuestPhoto } from './gallery-data'

const staticEvent = {
  id: 'event-one',
  data: {
    eventGallery: true,
    title: 'Static title',
    summary: 'Static summary',
    galleryDescription: 'Static gallery description',
    category: 'Static category',
    featuredImage: '/static-cover.jpg',
    imageAlt: 'Static cover',
    gallery: [],
  },
} as unknown as CollectionEntry<'portfolio'>

const dynamicEvent: EventGallery = {
  event_slug: 'event-one',
  title: 'Dynamic title',
  event_date: '2026-07-09',
  event_time: null,
  event_venue: null,
  summary: 'Dynamic summary',
  category: 'Dynamic category',
  flyer_object_key: null,
  flyer_width: null,
  flyer_height: null,
  flyer_alt: null,
  cover_src: null,
  cover_width: null,
  cover_height: null,
  cover_alt: null,
  coming_soon: 0,
  status: 'published',
  created_at: 1,
  updated_at: 1,
}

function reader(
  options: {
    staticValue?: typeof staticEvent | undefined
    dynamicValue?: typeof dynamicEvent | undefined
    invite?: {
      token: string
      event_slug: string
      guest_name: string
      created_at: number
      last_used_at: number | null
    } | null
    photos?: GalleryPhoto[]
    publishedGuests?: GuestPhoto[]
  } = {},
) {
  const staticValue =
    'staticValue' in options ? options.staticValue : staticEvent
  const dynamicValue =
    'dynamicValue' in options ? options.dynamicValue : dynamicEvent
  const invite = options.invite ?? null
  return createGalleryReader({
    staticContent: {
      get: async () => staticValue,
      list: async () => (staticValue ? [staticValue] : []),
    },
    records: {
      getEvent: async () => dynamicValue,
      listEvents: async () => (dynamicValue ? [dynamicValue] : []),
      getSettings: async () => null,
      getHiddenFilenames: async () => new Set(),
      listPublishedGuests: async () => options.publishedGuests ?? [],
      listGuests: async () => [],
      listPhotos: async () => options.photos ?? [],
      listInvites: async () => [],
      getInvite: async () => invite,
    },
  })
}

test('D1 controls visibility and overrides mutable gallery metadata', async () => {
  const gallery = await reader().getPublicDetail('event-one')

  assert.equal(gallery?.title, 'Dynamic title')
  assert.equal(gallery?.summary, 'Dynamic summary')
  assert.equal(gallery?.category, 'Dynamic category')
  assert.equal(gallery?.visibility, 'published')
  assert.equal(gallery?.staticEvent, staticEvent)
})

test('static-only event galleries remain publicly readable', async () => {
  const gallery = await reader({
    dynamicValue: undefined,
  }).getPublicDetail('event-one')

  assert.equal(gallery?.title, 'Static title')
  assert.equal(gallery?.summary, 'Static gallery description')
  assert.equal(gallery?.visibility, 'published')
})

test('D1-only galleries expose a public detail model for every route', async () => {
  const gallery = await reader({ staticValue: undefined }).getPublicDetail(
    'event-one',
  )

  assert.equal(gallery?.eventSlug, 'event-one')
  assert.equal(gallery?.title, 'Dynamic title')
  assert.deepEqual(gallery?.allImages, [])
})

test('hidden galleries are absent from public reads but available to admin reads', async () => {
  const hidden = { ...dynamicEvent, status: 'hidden' as const }
  const galleryReader = reader({ dynamicValue: hidden })

  assert.equal(await galleryReader.getPublicDetail('event-one'), undefined)
  assert.equal(
    (await galleryReader.getAdminDetail('event-one'))?.visibility,
    'hidden',
  )
})

test('invite context only resolves for the requested event', async () => {
  const invite = {
    token: 'invite-token',
    event_slug: 'event-one',
    guest_name: 'Ayoub',
    created_at: 1,
    last_used_at: null,
  }
  const galleryReader = reader({ invite })

  assert.equal(
    (await galleryReader.getInviteContext('event-one', 'invite-token'))?.invite,
    invite,
  )
  assert.equal(
    await galleryReader.getInviteContext('another-event', 'invite-token'),
    undefined,
  )
})

test('public detail projects related rows and suppresses photos while coming soon', async () => {
  const photo: GalleryPhoto = {
    id: 'admin-photo',
    event_slug: 'event-one',
    object_key: 'events/event-one/photos/admin-photo.jpg',
    original_filename: 'photo.jpg',
    width: 1200,
    height: 800,
    alt: 'Admin photo',
    uploader_name: null,
    source: 'admin',
    created_at: 1,
  }
  const guest: GuestPhoto = {
    id: 'guest-photo',
    event_slug: 'event-one',
    object_key: 'events/event-one/guest/guest-photo.jpg',
    original_filename: 'guest.jpg',
    width: 1200,
    height: 800,
    alt: 'Guest photo',
    status: 'published',
    created_at: 1,
    published_at: 1,
  }

  const published = await reader({
    photos: [photo],
    publishedGuests: [guest],
  }).getPublicDetail('event-one')
  assert.deepEqual(
    published?.allImages.map((image) => ('id' in image ? image.id : undefined)),
    ['admin-photo', 'guest-photo'],
  )

  const comingSoon = await reader({
    dynamicValue: { ...dynamicEvent, status: 'coming_soon', coming_soon: 1 },
    photos: [photo],
    publishedGuests: [guest],
  }).getPublicDetail('event-one')
  assert.deepEqual(comingSoon?.allImages, [])
})
