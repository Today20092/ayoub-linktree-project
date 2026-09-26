// Run once by the release maintainer. Never print or commit signing material.
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const repository = 'Today20092/ayoub-linktree-project'
const directory = join(homedir(), '.config', 'ayoub-gallery', 'signing')
const keystore = join(directory, 'gallery.p12')
const passwordFile = join(directory, 'password')
mkdirSync(directory, { recursive: true, mode: 0o700 })
chmodSync(directory, 0o700)
const existingSecrets = JSON.parse(
  execFileSync(
    'gh',
    ['secret', 'list', '--repo', repository, '--json', 'name'],
    { encoding: 'utf8' },
  ),
)
if (existingSecrets.some(({ name }) => name.startsWith('GALLERY_ANDROID_'))) {
  throw new Error(
    'Android signing secrets already exist. Refusing to replace the update identity.',
  )
}
if (existsSync(keystore) !== existsSync(passwordFile))
  throw new Error('Incomplete signing backup; inspect it before continuing.')
const password = existsSync(passwordFile)
  ? readFileSync(passwordFile, 'utf8')
  : randomBytes(32).toString('hex')
if (!existsSync(keystore)) {
  const keytool = process.env.JAVA_HOME
    ? join(process.env.JAVA_HOME, 'bin', 'keytool')
    : 'keytool'
  execFileSync(
    keytool,
    [
      '-genkeypair',
      '-keystore',
      keystore,
      '-storetype',
      'PKCS12',
      '-alias',
      'gallery',
      '-keyalg',
      'RSA',
      '-keysize',
      '3072',
      '-validity',
      '10000',
      '-dname',
      'CN=Ayoub Gallery',
      '-storepass:env',
      'GALLERY_SIGNING_PASSWORD',
      '-keypass:env',
      'GALLERY_SIGNING_PASSWORD',
    ],
    {
      env: { ...process.env, GALLERY_SIGNING_PASSWORD: password },
      stdio: 'pipe',
    },
  )
  writeFileSync(passwordFile, password, { mode: 0o600 })
  chmodSync(keystore, 0o600)
}
for (const [name, value] of [
  ['GALLERY_ANDROID_KEYSTORE', readFileSync(keystore).toString('base64')],
  ['GALLERY_ANDROID_KEYSTORE_PASSWORD', password],
]) {
  execFileSync('gh', ['secret', 'set', name, '--repo', repository], {
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}
console.log(`Signing secrets configured. Keep a secure backup of ${directory}.`)
