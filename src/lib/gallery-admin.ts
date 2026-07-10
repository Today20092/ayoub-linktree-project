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
