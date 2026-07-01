const encoder = new TextEncoder()

const PASSWORD_ITERATIONS = 210_000
const SESSION_DURATION_SECONDS = 12 * 60 * 60

type SessionPayload = {
  eventSlug: string
  expiresAt: number
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function derivePassword(password: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations: PASSWORD_ITERATIONS,
      },
      key,
      256,
    ),
  )
}

async function passwordKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  return crypto.subtle.importKey(
    'raw',
    await derivePassword(password, salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export function validGalleryPassword(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128
  )
}

export async function hashGalleryPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const verifier = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await passwordKey(password, salt),
      encoder.encode('gallery-password-verifier'),
    ),
  )
  return { salt: toBase64Url(salt), hash: toBase64Url(verifier) }
}

export async function verifyGalleryPassword(
  password: string,
  salt: string,
  expectedHash: string,
) {
  try {
    return crypto.subtle.verify(
      'HMAC',
      await passwordKey(password, fromBase64Url(salt)),
      fromBase64Url(expectedHash),
      encoder.encode('gallery-password-verifier'),
    )
  } catch {
    return false
  }
}

export async function createGallerySession(
  eventSlug: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        eventSlug,
        expiresAt: now + SESSION_DURATION_SECONDS,
      } satisfies SessionPayload),
    ),
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      await hmacKey(secret),
      encoder.encode(payload),
    ),
  )
  return `${payload}.${toBase64Url(signature)}`
}

export async function verifyGallerySession(
  token: string,
  eventSlug: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  try {
    const [payload, signature, extra] = token.split('.')
    if (!payload || !signature || extra) return false
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(signature),
      encoder.encode(payload),
    )
    if (!validSignature) return false

    const parsed = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as Partial<SessionPayload>
    return parsed.eventSlug === eventSlug && Number(parsed.expiresAt) > now
  } catch {
    return false
  }
}

export function gallerySessionCookie(request: Request) {
  const cookies = request.headers.get('cookie') ?? ''
  for (const cookie of cookies.split(';')) {
    const [name, ...parts] = cookie.trim().split('=')
    if (name === 'gallery_upload_session') {
      return decodeURIComponent(parts.join('='))
    }
  }
  return undefined
}

export function setGallerySessionCookie(eventSlug: string, token: string) {
  return [
    `gallery_upload_session=${encodeURIComponent(token)}`,
    `Path=/api/galleries/${encodeURIComponent(eventSlug)}`,
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ')
}
