#!/usr/bin/env node

import { spawn } from 'node:child_process'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
  createDeterministicZip,
  listZipEntries,
  objectKeyFromUrl,
  parseGalleryMdx,
  pruneGalleryMdx,
  resolvePhotoSelectors,
} from './gallery-prune-core.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const BUCKET = 'alphabravomedia-galleries'
const CONFIG_PATH = join(ROOT, '.gallery-prune.local.json')
const IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function parseArguments(argv) {
  const positional = []
  let dryRun = false
  let yes = false
  let source

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') dryRun = true
    else if (argument === '--yes') yes = true
    else if (argument === '--source') {
      source = argv[index + 1]
      if (!source) throw new Error('--source requires a folder path.')
      index += 1
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option "${argument}".`)
    } else positional.push(argument)
  }

  const [slug, ...selectors] = positional
  if (!slug || selectors.length === 0) {
    throw new Error(
      'Usage: npm run gallery:prune -- <slug> <filename|position|range...> [--source <folder>] [--dry-run] [--yes]',
    )
  }
  return { slug, selectors, source, dryRun, yes }
}

function run(command, args, { capture = false, allowFailure = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: false,
    })
    let output = ''
    let errorOutput = ''
    if (capture) {
      child.stdout.on('data', (chunk) => (output += chunk))
      child.stderr.on('data', (chunk) => (errorOutput += chunk))
    }
    child.on('error', reject)
    child.on('close', (code) => {
      const result = { code, stdout: output.trim(), stderr: errorOutput.trim() }
      if (code === 0 || allowFailure) resolvePromise(result)
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} failed${errorOutput ? `: ${errorOutput}` : ''}`,
          ),
        )
    })
  })
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readConfig() {
  if (!(await exists(CONFIG_PATH))) return { sources: {} }
  return JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
}

async function savePendingSelection(slug, selectors) {
  const config = await readConfig()
  config.selections ??= {}
  if (selectors.length) config.selections[slug] = selectors
  else delete config.selections[slug]
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`)
}

async function getSourceFolder({ slug, source, dryRun }) {
  const config = await readConfig()
  if (source) {
    const resolved = resolve(source)
    if (!dryRun) {
      config.sources ??= {}
      config.sources[slug] = resolved
      await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`)
    }
    return resolved
  }
  if (config.sources?.[slug]) return config.sources[slug]
  if (!stdin.isTTY) {
    throw new Error(`No source folder saved for "${slug}". Pass --source.`)
  }

  const prompt = createInterface({ input: stdin, output: stdout })
  const answer = await prompt.question(`Local export folder for ${slug}: `)
  prompt.close()
  if (!answer.trim()) throw new Error('Source folder is required.')
  const resolved = resolve(answer.trim())
  if (!dryRun) {
    config.sources ??= {}
    config.sources[slug] = resolved
    await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`)
  }
  return resolved
}

async function assertCleanWorktree() {
  const status = await run('git', ['status', '--porcelain'], { capture: true })
  if (status.stdout) {
    throw new Error('Git worktree is not clean. Commit or stash changes first.')
  }
}

function assertMatchingInventory(gallery, localFilenames, alreadyMissing) {
  const expected = new Set(gallery.map((photo) => photo.filename))
  const actual = new Set(localFilenames)
  if (actual.size === 0) {
    throw new Error(
      'The selected folder contains no photos. Choose the complete local gallery export so the download ZIP can be rebuilt safely.',
    )
  }
  const missing = [...expected].filter((filename) => !actual.has(filename))
  const extra = [...actual].filter((filename) => !expected.has(filename))
  const absentAgain = alreadyMissing.filter((filename) => actual.has(filename))

  if (missing.length || extra.length || absentAgain.length) {
    throw new Error(
      [
        'Local export folder does not match gallery manifest.',
        missing.length ? `Missing: ${missing.join(', ')}` : '',
        extra.length ? `Extra: ${extra.join(', ')}` : '',
        absentAgain.length
          ? `Selectors absent from MDX but present locally: ${absentAgain.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
}

async function confirmPlan(plan) {
  console.log(`\nGallery: ${plan.slug}`)
  console.log(`Branch: ${plan.branch} -> origin/${plan.branch}`)
  console.log(`Source: ${plan.sourceFolder}`)
  console.log(`ZIP: r2://${BUCKET}/${plan.zipKey}`)
  console.log(`Photos: ${plan.selected.length}`)
  for (const selection of plan.selected) {
    console.log(
      `  ${selection.position}. ${selection.photo.filename} -> r2://${BUCKET}/${objectKeyFromUrl(selection.photo.src)}`,
    )
  }
  if (plan.alreadyMissing.length) {
    console.log(`Already absent: ${plan.alreadyMissing.join(', ')}`)
  }
  if (plan.dryRun) {
    console.log(
      '\nDry run complete. No files, R2 objects, or Git state changed.',
    )
    return false
  }
  if (plan.yes) return true

  const prompt = createInterface({ input: stdin, output: stdout })
  const expected = `PRUNE ${plan.selected.length} PHOTOS`
  const answer = await prompt.question(`\nType "${expected}" to continue: `)
  prompt.close()
  if (answer !== expected) throw new Error('Confirmation did not match.')
  return true
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  await savePendingSelection(options.slug, options.selectors)
  await assertCleanWorktree()

  const mdxPath = join(
    ROOT,
    'src',
    'content',
    'portfolio',
    `${options.slug}.mdx`,
  )
  const mdxRelativePath = `src/content/portfolio/${options.slug}.mdx`
  if (!(await exists(mdxPath)))
    throw new Error(`Unknown gallery "${options.slug}".`)

  const originalMdx = await readFile(mdxPath, 'utf8')
  const parsed = parseGalleryMdx(originalMdx)
  if (!parsed.data.eventGallery) {
    throw new Error(`"${options.slug}" is not an event gallery.`)
  }

  const resolution = resolvePhotoSelectors(
    parsed.data.gallery,
    options.selectors,
  )
  if (resolution.selected.length === 0) {
    console.log(
      `All requested filenames are already absent: ${resolution.alreadyMissing.join(', ')}`,
    )
    return
  }

  const sourceFolder = await getSourceFolder({ ...options })
  if (!(await exists(sourceFolder))) {
    throw new Error(`Source folder does not exist: ${sourceFolder}`)
  }
  const localFilenames = (await readdir(sourceFolder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.test(entry.name))
    .map((entry) => entry.name)
  assertMatchingInventory(
    parsed.data.gallery,
    localFilenames,
    resolution.alreadyMissing,
  )

  const selectedNames = new Set(
    resolution.selected.map(({ photo }) => photo.filename),
  )
  const remainingNames = localFilenames.filter(
    (filename) => !selectedNames.has(filename),
  )
  if (remainingNames.length === 0) {
    throw new Error('Refusing to prune every photo from a gallery.')
  }

  const downloadUrl = parsed.data.downloadAllUrl
  if (typeof downloadUrl !== 'string') {
    throw new Error('Gallery has no downloadAllUrl.')
  }
  const zipKey = objectKeyFromUrl(downloadUrl)
  const branch = (
    await run('git', ['branch', '--show-current'], { capture: true })
  ).stdout
  if (!branch) throw new Error('Detached HEAD is not supported.')

  const plan = {
    ...options,
    ...resolution,
    sourceFolder,
    zipKey,
    branch,
  }
  if (!(await confirmPlan(plan))) return

  await run(NPX, ['wrangler', 'whoami'])

  const temporaryFolder = await mkdtemp(join(tmpdir(), 'gallery-prune-'))
  const zipPath = join(temporaryFolder, basename(zipKey))
  const quarantineFolder = join(
    sourceFolder,
    '.pruned',
    options.slug,
    new Date().toISOString().replace(/[:.]/g, '-'),
  )
  const moved = []
  let remoteMutationStarted = false
  let commitCreated = false

  try {
    await createDeterministicZip(
      remainingNames.map((filename) => join(sourceFolder, filename)),
      zipPath,
    )
    const zipEntries = await listZipEntries(zipPath)
    const expectedEntries = [...remainingNames].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    )
    if (JSON.stringify(zipEntries) !== JSON.stringify(expectedEntries)) {
      throw new Error('Generated ZIP contents do not match remaining gallery.')
    }

    await mkdir(quarantineFolder, { recursive: true })
    for (const { photo } of resolution.selected) {
      const from = join(sourceFolder, photo.filename)
      const to = join(quarantineFolder, photo.filename)
      await rename(from, to)
      moved.push({ from, to })
    }

    const updatedMdx = pruneGalleryMdx(originalMdx, resolution.selectedIndexes)
    await writeFile(mdxPath, updatedMdx)
    await run(NPX, ['prettier', '--write', mdxPath])
    await run(NPX, ['prettier', '--check', mdxPath])
    await run(NPM, ['run', 'check'])
    await run(NPM, ['run', 'build'])

    remoteMutationStarted = true
    await run(NPX, [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${zipKey}`,
      '--file',
      zipPath,
      '--content-type',
      'application/zip',
      '--content-disposition',
      `attachment; filename="${basename(zipKey)}"`,
      '--remote',
      '--force',
    ])
    for (const { photo } of resolution.selected) {
      await run(NPX, [
        'wrangler',
        'r2',
        'object',
        'delete',
        `${BUCKET}/${objectKeyFromUrl(photo.src)}`,
        '--remote',
        '--force',
      ])
    }

    const verifyZip = join(temporaryFolder, `verify-${basename(zipKey)}`)
    await run(NPX, [
      'wrangler',
      'r2',
      'object',
      'get',
      `${BUCKET}/${zipKey}`,
      '--file',
      verifyZip,
      '--remote',
    ])
    const remoteEntries = await listZipEntries(verifyZip)
    if (JSON.stringify(remoteEntries) !== JSON.stringify(expectedEntries)) {
      throw new Error('Uploaded ZIP verification failed.')
    }
    for (const { photo } of resolution.selected) {
      const result = await run(
        NPX,
        [
          'wrangler',
          'r2',
          'object',
          'get',
          `${BUCKET}/${objectKeyFromUrl(photo.src)}`,
          '--file',
          join(temporaryFolder, `deleted-${photo.filename}`),
          '--remote',
        ],
        { capture: true, allowFailure: true },
      )
      if (result.code === 0) {
        throw new Error(`R2 object still exists: ${photo.filename}`)
      }
    }

    await run('git', ['add', '--', mdxRelativePath])
    await run('git', [
      'commit',
      '-m',
      `chore(gallery): prune ${options.slug} photos`,
    ])
    commitCreated = true
    await run('git', ['push', 'origin', branch])
    await savePendingSelection(options.slug, [])
    console.log(
      `\nPruned ${resolution.selected.length} photos and pushed ${branch}.`,
    )
    console.log(`Quarantine: ${quarantineFolder}`)
  } catch (error) {
    if (!commitCreated) {
      await run('git', ['restore', '--staged', '--', mdxRelativePath], {
        allowFailure: true,
        capture: true,
      })
      await writeFile(mdxPath, originalMdx)
      for (const move of moved.reverse()) {
        if (await exists(move.to)) await rename(move.to, move.from)
      }
      await rm(quarantineFolder, { recursive: true, force: true })
    }
    const recovery = commitCreated
      ? `git push origin ${branch}`
      : remoteMutationStarted
        ? `npm run gallery:prune -- ${options.slug} ${resolution.selected.map(({ photo }) => photo.filename).join(' ')} --source "${sourceFolder}"`
        : 'Fix reported error, then rerun same command.'
    throw new Error(`${error.message}\nRecovery: ${recovery}`)
  } finally {
    await rm(temporaryFolder, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`\nGallery prune failed: ${error.message}`)
  process.exitCode = 1
})
