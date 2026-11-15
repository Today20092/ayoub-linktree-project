import { createRemoteJWKSet, jwtVerify } from 'jose'

const accessKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export async function galleryAdminAuthorized(
  request: Request,
  adminEmail: string,
  teamDomain?: string,
  audienceList?: string,
) {
  const hostname = new URL(request.url).hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  const token = request.headers.get('cf-access-jwt-assertion')
  const audiences = audienceList
    ?.split(',')
    .map((audience) => audience.trim())
    .filter(Boolean)
  if (!token || !teamDomain || !audiences?.length) return false

  try {
    const issuer = teamDomain.replace(/\/$/, '')
    let keySet = accessKeySets.get(issuer)
    if (!keySet) {
      keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
      accessKeySets.set(issuer, keySet)
    }
    const { payload } = await jwtVerify(token, keySet, {
      issuer,
      audience: audiences,
    })
    return (
      typeof payload.email === 'string' &&
      payload.email.toLowerCase() === adminEmail.toLowerCase()
    )
  } catch {
    return false
  }
}

export type GalleryAdminGate =
  'skip' | 'allow' | 'forbidden' | 'forbidden-api' | 'not-found'

// Single admin gate, applied by src/middleware.ts to /admin/** and /api/admin/**.
export async function galleryAdminGate(
  request: Request,
  env: {
    GALLERY_ADMIN_EMAIL: string
    GALLERY_ACCESS_TEAM_DOMAIN?: string
    GALLERY_ACCESS_AUDS?: string
  },
): Promise<GalleryAdminGate> {
  const url = new URL(request.url)
  // Astro decodes the path before routing, so match the decoded form; undecodable paths fail closed.
  let path = url.pathname
  try {
    path = decodeURIComponent(path)
  } catch {
    path = '/admin/'
  }
  path = path.replace(/\/{2,}/g, '/').toLowerCase()
  if (!/^\/(api\/)?admin(\/|$)/.test(path)) return 'skip'
  if (url.hostname === 'payments.ayoubabed.xyz') return 'not-found'
  return (await galleryAdminAuthorized(
    request,
    env.GALLERY_ADMIN_EMAIL,
    env.GALLERY_ACCESS_TEAM_DOMAIN,
    env.GALLERY_ACCESS_AUDS,
  ))
    ? 'allow'
    : path.startsWith('/api/')
      ? 'forbidden-api'
      : 'forbidden'
}
