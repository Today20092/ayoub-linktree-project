import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createCompanionGallery } from './gallery-create'
import {
  companionAuthorized,
  contentHash,
  createDevice,
  knownCompanionHashes,
  receiveCompanionPhoto,
} from './gallery-companion'

function fixture() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(
    readFileSync(
      new URL(
        '../../migrations/0002_admin_event_galleries.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  sqlite.exec(
    readFileSync(
      new URL('../../migrations/0005_gallery_companion.sql', import.meta.url),
      'utf8',
    ),
  )
  sqlite.exec(
    readFileSync(
      new URL(
        '../../migrations/0006_gallery_device_management.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  )
  class Statement {
    values: (string | number | null)[] = []
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) {
      this.values = values
      return this
    }
    async first() {
      return sqlite.prepare(this.sql).get(...this.values) ?? null
    }
    async all() {
      return { results: sqlite.prepare(this.sql).all(...this.values) }
    }
    async run() {
      return {
        meta: {
          changes: Number(sqlite.prepare(this.sql).run(...this.values).changes),
        },
      }
    }
  }
  const db = {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN')
      try {
        const results = []
        for (const statement of statements) results.push(await statement.run())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  } as unknown as D1Database
  const objects = new Map<string, unknown>()
  const bindings = {
    GALLERY_DB: db,
    GALLERY_PUBLIC: {
      async put(key: string, value: unknown) {
        objects.set(key, value)
      },
      async delete(key: string) {
        objects.delete(key)
      },
    } as unknown as R2Bucket,
    IMAGES: {} as ImagesBinding,
  }
  const optimize = async () => ({
    width: 2400,
    height: 1600,
    buffer: new ArrayBuffer(3),
  })
  return { db, sqlite, objects, bindings, optimize }
}
const event = { id: 'event', title: 'Event' }
const file = new File(['test'], 'camera.jpg', { type: 'image/jpeg' })
const hash = 'a'.repeat(64)

test('native gallery creation requires management permission and cannot overwrite existing galleries', async () => {
  const { db, sqlite } = fixture()
  // The fixture starts with the upload schema; creation also uses visibility migration.
  sqlite.exec(
    "ALTER TABLE event_galleries ADD COLUMN status TEXT NOT NULL DEFAULT 'published'",
  )
  const manager = await createDevice(db, 'Manager', true)
  const uploader = await createDevice(db, 'Uploader')
  const input = {
    title: 'New event',
    summary: 'About the event',
    slug: 'new-event',
  }
  const request = (token: string, body = input) =>
    new Request('https://example.com/api/companion/galleries/', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  const exists = async () => false
  assert.equal(
    (await createCompanionGallery(request(uploader.token), db, exists)).status,
    403,
  )
  assert.equal(
    (
      await createCompanionGallery(
        request(manager.token, { ...input, title: '' }),
        db,
        exists,
      )
    ).status,
    400,
  )
  assert.equal(
    (await createCompanionGallery(request(manager.token), db, async () => true))
      .status,
    409,
  )
  const response = await createCompanionGallery(
    request(manager.token),
    db,
    exists,
  )
  assert.equal(response.status, 201)
  assert.equal(
    ((await response.json()) as { gallery: { status: string } }).gallery.status,
    'hidden',
  )
  assert.equal(
    (
      await createCompanionGallery(
        request(manager.token, { ...input, title: 'Overwrite' }),
        db,
        exists,
      )
    ).status,
    409,
  )
  assert.equal(
    sqlite
      .prepare('SELECT title FROM event_galleries WHERE event_slug = ?')
      .get('new-event')?.title,
    input.title,
  )
})

test('device keys are hashed, expire, and can be revoked', async () => {
  const { db, sqlite } = fixture()
  const device = await createDevice(db, 'Phone')
  const request = new Request('https://example.com', {
    headers: { authorization: `Bearer ${device.token}` },
  })
  assert.equal(await companionAuthorized(request, db), true)
  assert.notEqual(
    sqlite.prepare('SELECT token_hash FROM gallery_devices').get()?.token_hash,
    device.token,
  )
  assert.equal(
    await companionAuthorized(new Request('https://example.com'), db),
    false,
  )
  sqlite.exec('UPDATE gallery_devices SET expires_at = 0')
  assert.equal(await companionAuthorized(request, db), false)
  sqlite.exec('DELETE FROM gallery_devices')
  assert.equal(await companionAuthorized(request, db), false)
})

test('management requires explicit permission and remains revocable', async () => {
  const { db, sqlite } = fixture()
  const upload = await createDevice(db, 'Upload only')
  const manager = await createDevice(db, 'Manager', true)
  const request = (token: string) =>
    new Request('https://example.com', {
      headers: { authorization: `Bearer ${token}` },
    })
  assert.equal(await companionAuthorized(request(upload.token), db), true)
  assert.equal(
    await companionAuthorized(request(upload.token), db, true),
    false,
  )
  assert.equal(
    await companionAuthorized(request(manager.token), db, true),
    true,
  )
  sqlite
    .prepare('UPDATE gallery_devices SET expires_at = 0 WHERE id = ?')
    .run(manager.id)
  assert.equal(
    await companionAuthorized(request(manager.token), db, true),
    false,
  )
  sqlite.prepare('DELETE FROM gallery_devices WHERE id = ?').run(manager.id)
  assert.equal(
    await companionAuthorized(request(manager.token), db, true),
    false,
  )
})

test('same bytes skip after repeat, rename, and gallery photo deletion', async () => {
  const { bindings, optimize, sqlite, objects } = fixture()
  assert.equal(
    (await receiveCompanionPhoto(bindings, event, file, hash, optimize)).status,
    201,
  )
  assert.equal(objects.size, 1)
  const again = await receiveCompanionPhoto(
    bindings,
    event,
    new File(['test'], 'renamed.jpg'),
    hash,
    optimize,
  )
  assert.deepEqual(await again.json(), { status: 'skipped' })
  sqlite.exec('DELETE FROM gallery_photos')
  assert.deepEqual(
    await (
      await receiveCompanionPhoto(bindings, event, file, hash, optimize)
    ).json(),
    { status: 'skipped' },
  )
  assert.equal(
    sqlite.prepare('SELECT count(*) n FROM gallery_photos').get()?.n,
    0,
  )
})

test('receipt identity is scoped to its gallery', async () => {
  const { bindings, optimize, sqlite } = fixture()
  await receiveCompanionPhoto(bindings, event, file, hash, optimize)
  assert.equal(
    (
      await receiveCompanionPhoto(
        bindings,
        { id: 'other', title: 'Other' },
        file,
        hash,
        optimize,
      )
    ).status,
    201,
  )
  assert.equal(
    sqlite.prepare('SELECT count(*) n FROM gallery_photos').get()?.n,
    2,
  )
})

test('concurrent upload gets retry response; old expired attempt cannot publish', async () => {
  const { bindings, optimize, sqlite, objects } = fixture()
  let release!: () => void
  let entered!: () => void
  const ready = new Promise<void>((resolve) => {
    entered = resolve
  })
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  const first = receiveCompanionPhoto(bindings, event, file, hash, async () => {
    entered()
    await hold
    return optimize()
  })
  await ready
  assert.equal(
    (await receiveCompanionPhoto(bindings, event, file, hash, optimize)).status,
    409,
  )
  sqlite.exec('UPDATE gallery_upload_receipts SET lease_until = 0')
  assert.equal(
    (await receiveCompanionPhoto(bindings, event, file, hash, optimize)).status,
    201,
  )
  release()
  assert.equal((await first).status, 409)
  assert.equal(
    sqlite.prepare('SELECT count(*) n FROM gallery_photos').get()?.n,
    1,
  )
  assert.equal(objects.size, 1)
})

test('failed optimization releases claim for retry', async () => {
  const { bindings, optimize, objects } = fixture()
  await assert.rejects(
    receiveCompanionPhoto(bindings, event, file, hash, async () => {
      throw new Error('bad image')
    }),
  )
  assert.equal(objects.size, 0)
  assert.equal(
    (await receiveCompanionPhoto(bindings, event, file, hash, optimize)).status,
    201,
  )
})

test('sha256 follows known test vector', async () => {
  assert.equal(
    await contentHash(new TextEncoder().encode('abc').buffer),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
})

test('preflight skips known bytes without transferring photos again', async () => {
  const { db, bindings, optimize } = fixture()
  await receiveCompanionPhoto(bindings, event, file, hash, optimize)
  assert.deepEqual(
    await knownCompanionHashes(db, event.id, [hash, 'b'.repeat(64)]),
    [hash],
  )
  assert.deepEqual(await knownCompanionHashes(db, 'other', [hash]), [])
})
