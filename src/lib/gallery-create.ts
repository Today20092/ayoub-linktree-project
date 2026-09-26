import { companionAuthorized, companionJson } from './gallery-companion'
import { galleryStatus } from './gallery-data'
import { gallerySlug } from './gallery-upload'

export async function createCompanionGallery(
  request: Request,
  database: D1Database,
  exists: (slug: string) => Promise<boolean>,
) {
  if (!(await companionAuthorized(request, database, true)))
    return companionJson(
      {
        error:
          'Create a pairing key with gallery management enabled, then reconnect in Settings.',
      },
      403,
    )
  let input: Record<string, unknown>
  try {
    const body = await request.text()
    if (body.length > 16_384)
      return companionJson({ error: 'Gallery details are too long.' }, 413)
    input = JSON.parse(body)
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error()
  } catch {
    return companionJson({ error: 'Invalid gallery details.' }, 400)
  }
  const text = (key: string) =>
    typeof input[key] === 'string' ? input[key].trim() : ''
  const title = text('title')
  const summary = text('summary')
  const category = text('category') || 'Event Photography'
  const status =
    input.visibilityStatus === undefined
      ? 'hidden'
      : galleryStatus(input.visibilityStatus)
  if (
    !title ||
    title.length > 200 ||
    !summary ||
    summary.length > 5000 ||
    category.length > 120 ||
    !status
  )
    return companionJson(
      {
        error:
          'Enter a name (up to 200 characters), about information (up to 5,000), and a valid visibility.',
      },
      400,
    )
  const slug =
    text('slug') ||
    `${gallerySlug(title).slice(0, 65)}-${crypto.randomUUID().slice(0, 8)}`
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80)
    return companionJson(
      {
        error:
          'Use up to 80 lowercase letters, numbers, and hyphens for the gallery link.',
      },
      400,
    )
  if (await exists(slug))
    return companionJson(
      { error: 'That gallery link is already in use. Choose another.' },
      409,
    )
  // Creation must never use the editing upsert: concurrent requests cannot overwrite a gallery.
  const result = await database
    .prepare(
      `INSERT OR IGNORE INTO event_galleries
    (event_slug, title, summary, category, coming_soon, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
    )
    .bind(
      slug,
      title,
      summary,
      category,
      status === 'coming_soon' ? 1 : 0,
      status,
    )
    .run()
  if (!result.meta.changes)
    return companionJson(
      { error: 'That gallery link is already in use. Choose another.' },
      409,
    )
  return companionJson({ gallery: { id: slug, title, category, status } }, 201)
}
