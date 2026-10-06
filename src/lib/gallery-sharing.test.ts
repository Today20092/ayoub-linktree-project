import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import {
  createGallerySharingToken,
  matchesSharingToken,
  gallerySharingPath,
} from './gallery-sharing'
import {
  saveGallerySharing,
  saveGalleryUploadLink,
  saveEventGallery,
} from './gallery-data'

test('sharing identifiers use 256 random bits and strict matching', () => {
  const token = createGallerySharingToken()
  const other = createGallerySharingToken()
  assert.match(token, /^[a-f0-9]{64}$/)
  assert.notEqual(token, other)
  assert.equal(matchesSharingToken(token, token), true)
  for (const value of [
    other,
    undefined,
    '',
    '%',
    token.slice(1),
    token.toUpperCase(),
  ])
    assert.equal(matchesSharingToken(value, token), false)
  assert.equal(
    gallerySharingPath('event', token),
    '/galleries/event/?share=' + token,
  )
})

test('additive sharing migration preserves visibility and passwords; later metadata edits retain sharing', async () => {
  const sqlite = new DatabaseSync(':memory:')
  const migrations = [
    '0001_interactive_galleries.sql',
    '0002_admin_event_galleries.sql',
    '0003_gallery_visibility_status.sql',
    '0004_gallery_cover_image.sql',
    '0005_gallery_companion.sql',
    '0006_gallery_device_management.sql',
  ]
  for (const name of migrations)
    sqlite.exec(
      readFileSync(
        new URL('../../migrations/' + name, import.meta.url),
        'utf8',
      ),
    )
  sqlite.exec(
    "INSERT INTO event_galleries (event_slug,title,summary,category,status,coming_soon,created_at,updated_at) VALUES ('event','Event','Summary','Event','hidden',0,1,1); INSERT INTO gallery_settings (event_slug,uploads_enabled,password_salt,password_hash,updated_at) VALUES ('event',0,'old-salt','old-hash',1)",
  )
  sqlite.exec(
    readFileSync(
      new URL(
        '../../migrations/0007_gallery_sharing_links.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  assert.deepEqual(
    {
      ...sqlite
        .prepare('SELECT status,is_unlisted,share_token FROM event_galleries')
        .get(),
    },
    { status: 'hidden', is_unlisted: 0, share_token: null },
  )
  assert.equal(
    sqlite.prepare('SELECT upload_token FROM gallery_settings').get()
      ?.upload_token,
    null,
  )
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: (string | number | null)[]) {
          return {
            async run() {
              return sqlite.prepare(sql).run(...values)
            },
          }
        },
      }
    },
  } as unknown as D1Database
  const view = 'a'.repeat(64),
    upload = 'b'.repeat(64)
  await saveGallerySharing(db, 'event', true, view)
  await saveGalleryUploadLink(db, 'event', true, upload)
  await saveEventGallery(db, {
    event_slug: 'event',
    title: 'Renamed',
    summary: 'Changed',
    category: 'Event',
    event_date: null,
    event_time: null,
    event_venue: null,
    coming_soon: false,
    status: 'published',
  })
  const event = sqlite.prepare('SELECT * FROM event_galleries').get()!
  assert.equal(event.title, 'Renamed')
  assert.equal(event.is_unlisted, 1)
  assert.equal(event.share_token, view)
  const settings = sqlite.prepare('SELECT * FROM gallery_settings').get()!
  assert.equal(settings.upload_token, upload)
  assert.equal(settings.password_hash, 'old-hash')
  assert.equal(settings.password_salt, 'old-salt')
  sqlite.close()
})
