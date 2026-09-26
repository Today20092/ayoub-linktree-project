import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { galleryAdminAuthorized } from '@/lib/gallery-admin'
import { companionJson, createDevice } from '@/lib/gallery-companion'

export const prerender = false
export const POST: APIRoute = async ({ request }) => {
  if (
    !(await galleryAdminAuthorized(
      request,
      env.GALLERY_ADMIN_EMAIL,
      env.GALLERY_ACCESS_TEAM_DOMAIN,
      env.GALLERY_ACCESS_AUDS,
    ))
  )
    return companionJson({ error: 'Forbidden.' }, 403)
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return companionJson({ error: 'Invalid origin.' }, 403)
  if (Number(request.headers.get('content-length')) > 1024)
    return companionJson({ error: 'Request too large.' }, 413)
  let data: { name?: string; revoke?: string; canManage?: boolean }
  try {
    data = await request.json()
  } catch {
    return companionJson({ error: 'Invalid request.' }, 400)
  }
  if (typeof data.revoke === 'string') {
    await env.GALLERY_DB.prepare('DELETE FROM gallery_devices WHERE id = ?')
      .bind(data.revoke)
      .run()
    return companionJson({ ok: true })
  }
  if (typeof data.name !== 'string' || !data.name.trim())
    return companionJson({ error: 'Enter a device name.' }, 400)
  return companionJson(
    await createDevice(
      env.GALLERY_DB,
      data.name.trim(),
      data.canManage === true,
    ),
    201,
  )
}
