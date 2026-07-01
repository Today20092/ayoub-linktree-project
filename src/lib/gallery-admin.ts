import { createRemoteJWKSet, jwtVerify } from 'jose'

const accessKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export type GalleryAdminAction =
  | {
      action: 'settings'
      uploadsEnabled: boolean
      password?: string
    }
  | {
      action: 'approveGuest'
      photoId: string
      alt?: string
    }
  | {
      action: 'rejectGuest' | 'removeGuest'
      photoId: string
    }
  | {
      action: 'hideProfessional' | 'restoreProfessional'
      filename: string
    }

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

export function parseGalleryAdminAction(
  value: unknown,
): GalleryAdminAction | undefined {
  if (!value || typeof value !== 'object' || !('action' in value)) return
  const input = value as Record<string, unknown>

  if (
    input.action === 'settings' &&
    typeof input.uploadsEnabled === 'boolean' &&
    (input.password === undefined || typeof input.password === 'string')
  ) {
    const password =
      typeof input.password === 'string' ? input.password : undefined
    return {
      action: 'settings',
      uploadsEnabled: input.uploadsEnabled,
      password,
    }
  }
  if (
    input.action === 'approveGuest' &&
    typeof input.photoId === 'string' &&
    (input.alt === undefined || typeof input.alt === 'string')
  ) {
    const alt = typeof input.alt === 'string' ? input.alt : undefined
    return {
      action: input.action,
      photoId: input.photoId,
      alt,
    }
  }
  if (
    (input.action === 'rejectGuest' || input.action === 'removeGuest') &&
    typeof input.photoId === 'string'
  ) {
    return { action: input.action, photoId: input.photoId }
  }
  if (
    (input.action === 'hideProfessional' ||
      input.action === 'restoreProfessional') &&
    typeof input.filename === 'string'
  ) {
    return { action: input.action, filename: input.filename }
  }
}
