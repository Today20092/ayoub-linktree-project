#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseGalleryMdx } from './gallery-prune-core.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const PORTFOLIO = join(ROOT, 'src', 'content', 'portfolio')
const CONFIG_PATH = join(ROOT, '.gallery-prune.local.json')
const NODE = process.execPath

function json(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 1_000_000) throw new Error('Request is too large.')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function safePhoto(photo, index) {
  const src = typeof photo?.src === 'string' ? photo.src : ''
  const url = new URL(src)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Photo ${index + 1} does not have a remote image URL.`)
  }
  if (typeof photo.filename !== 'string' || !photo.filename) {
    throw new Error(`Photo ${index + 1} has no filename.`)
  }
  return {
    filename: basename(photo.filename),
    src: url.href,
    alt: typeof photo.alt === 'string' ? photo.alt : photo.filename,
    width: Number(photo.width) || null,
    height: Number(photo.height) || null,
  }
}

export async function discoverGalleries(folder = PORTFOLIO) {
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .sort((a, b) => a.name.localeCompare(b.name))
  const galleries = []

  for (const file of files) {
    const text = await readFile(join(folder, file.name), 'utf8')
    if (!/^eventGallery:\s*true\s*$/m.test(text)) continue
    const parsed = parseGalleryMdx(text)
    if (!parsed.data.eventGallery) continue
    const slug = file.name.slice(0, -4)
    galleries.push({
      slug,
      title: typeof parsed.data.title === 'string' ? parsed.data.title : slug,
      photos: parsed.data.gallery.map(safePhoto),
    })
  }
  return galleries
}

export function validateSelection(galleries, slug, filenames, confirmation) {
  const gallery = galleries.find((item) => item.slug === slug)
  if (!gallery) throw new Error('Choose a valid gallery.')
  if (!Array.isArray(filenames) || filenames.length === 0) {
    throw new Error('Choose at least one photo.')
  }
  if (new Set(filenames).size !== filenames.length) {
    throw new Error('The photo selection contains duplicates.')
  }
  const available = new Set(gallery.photos.map((photo) => photo.filename))
  if (filenames.some((filename) => !available.has(filename))) {
    throw new Error(
      'The photo selection is no longer valid. Refresh and try again.',
    )
  }
  const expected = `PRUNE ${filenames.length} PHOTOS`
  if (confirmation !== expected)
    throw new Error(`Type "${expected}" to continue.`)
  return gallery
}

export function createOperationLock() {
  let busy = false
  return {
    acquire() {
      if (busy) return false
      busy = true
      return true
    },
    release() {
      busy = false
    },
  }
}

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return { sources: {}, selections: {} }
    throw error
  }
}

async function writeLocalConfig(config) {
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`)
}

function chooseFolder() {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$owner = New-Object System.Windows.Forms.Form',
    '$owner.TopMost = $true',
    '$owner.ShowInTaskbar = $false',
    '$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen',
    '$owner.Size = New-Object System.Drawing.Size(1, 1)',
    '$owner.Opacity = 0',
    '$owner.Show()',
    '$owner.Activate()',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$dialog.Description = 'Choose the local gallery export folder'",
    'if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '  Write-Output $dialog.SelectedPath',
    '}',
    '$owner.Close()',
    '$owner.Dispose()',
  ].join('; ')
  return capture('powershell.exe', ['-NoProfile', '-STA', '-Command', script])
}

function capture(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout.trim())
      else
        reject(
          new Error(stderr.trim() || `${command} exited with code ${code}.`),
        )
    })
  })
}

function page(token) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gallery Pruner</title>
  <style>
    :root { color-scheme: light; --ink:#171713; --paper:#f3efe4; --red:#b53324; --line:#c9c0ad; --green:#214f3b; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--paper); font:16px/1.45 Georgia,serif; }
    header { padding:38px clamp(20px,5vw,72px) 28px; border-bottom:1px solid var(--line); background:linear-gradient(120deg,#e7ddca,#f8f5ec); }
    h1 { margin:0; font-size:clamp(36px,6vw,76px); line-height:.95; font-weight:500; letter-spacing:-.04em; }
    header p { max-width:700px; margin:16px 0 0; }
    main { display:grid; grid-template-columns:minmax(220px,320px) 1fr; min-height:70vh; }
    aside { padding:28px; border-right:1px solid var(--line); }
    section { padding:28px clamp(20px,4vw,56px) 56px; min-width:0; }
    label { display:block; font-weight:700; margin-bottom:8px; }
    select,input,button { font:inherit; }
    select,input[type=text] { width:100%; padding:11px 12px; border:1px solid var(--line); border-radius:2px; background:#fffdf7; }
    button { border:0; padding:11px 16px; border-radius:2px; color:white; background:var(--green); cursor:pointer; }
    button[disabled] { opacity:.45; cursor:not-allowed; }
    .danger { background:var(--red); width:100%; margin-top:10px; }
    .source { margin:24px 0; }
    .source small { display:block; overflow-wrap:anywhere; margin:8px 0; color:#615b50; }
    .progress { margin-top:24px; }
    .progress h2 { margin:0 0 8px; font-size:18px; }
    .grid { columns:170px; column-gap:14px; }
    .photo { position:relative; display:inline-block; width:100%; margin:0 0 14px; border:3px solid transparent; background:#ddd4c2; break-inside:avoid; }
    .photo:has(input:checked) { border-color:var(--red); }
    .photo button { display:block; width:100%; padding:0; border:0; border-radius:0; background:transparent; cursor:zoom-in; }
    .photo img { display:block; width:100%; height:auto; }
    .photo input { position:absolute; z-index:1; top:9px; left:9px; width:22px; height:22px; accent-color:var(--red); cursor:pointer; }
    .photo figcaption { padding:8px; font:12px/1.2 ui-monospace,monospace; overflow:hidden; text-overflow:ellipsis; }
    .toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:18px; }
    .toolbar button { color:var(--ink); background:transparent; border:1px solid var(--line); padding:7px 10px; }
    #status { white-space:pre-wrap; padding:14px; min-height:90px; max-height:280px; overflow:auto; background:#171713; color:#e9e3d7; font:13px/1.5 ui-monospace,monospace; }
    dialog { width:100vw; max-width:none; height:100vh; max-height:none; margin:0; padding:0; border:0; background:rgba(15,15,12,.96); color:white; }
    dialog::backdrop { background:rgba(15,15,12,.96); }
    .preview-frame { position:relative; display:grid; grid-template-rows:1fr auto; width:100%; height:100%; padding:24px; }
    #preview-image { display:block; width:100%; height:calc(100vh - 105px); object-fit:contain; }
    .preview-nav { position:absolute; top:50%; width:52px; height:72px; padding:0; translate:0 -50%; background:rgba(243,239,228,.82); color:var(--ink); font-size:42px; line-height:1; }
    #preview-previous { left:24px; }
    #preview-next { right:24px; }
    .preview-bar { display:flex; justify-content:space-between; align-items:center; gap:20px; font:14px/1.3 ui-monospace,monospace; }
    .preview-bar button { background:#f3efe4; color:var(--ink); }
    .preview-details,.preview-actions { display:flex; align-items:center; gap:18px; }
    .preview-actions label { display:flex; align-items:center; gap:8px; margin:0; cursor:pointer; }
    #preview-select { width:22px; height:22px; accent-color:var(--red); }
    [hidden] { display:none !important; }
    @media (max-width:760px) { main { grid-template-columns:1fr; } aside { border-right:0; border-bottom:1px solid var(--line); } }
  </style>
</head>
<body>
  <header><h1>Gallery Pruner</h1><p>Choose carefully. A completed prune updates the gallery, replaces its ZIP, deletes the selected R2 images, commits, and pushes.</p></header>
  <main>
    <aside>
      <label for="gallery">Event gallery</label>
      <select id="gallery"></select>
      <div class="source">
        <label>Local export folder</label>
        <input id="source-path" type="text" placeholder="Choose a folder or paste its path">
        <small id="source">No folder selected</small>
        <button id="choose" type="button">Choose folder</button>
      </div>
      <label for="confirmation">Confirmation</label>
      <input id="confirmation" type="text" autocomplete="off" spellcheck="false">
      <button class="danger" id="prune" type="button" disabled>Prune selected photos</button>
      <div class="progress">
        <h2>Progress</h2>
        <pre id="status">Checking repository...</pre>
      </div>
    </aside>
    <section>
      <div class="toolbar"><strong id="count">0 photos selected</strong><button id="clear" type="button">Clear selection</button></div>
      <div class="grid" id="photos"></div>
    </section>
  </main>
  <dialog id="preview">
    <div class="preview-frame">
      <img id="preview-image" alt="">
      <button class="preview-nav" id="preview-previous" type="button" aria-label="Previous photo">&lsaquo;</button>
      <button class="preview-nav" id="preview-next" type="button" aria-label="Next photo">&rsaquo;</button>
      <div class="preview-bar">
        <div class="preview-details"><span id="preview-position"></span><span id="preview-name"></span></div>
        <div class="preview-actions">
          <label><input id="preview-select" type="checkbox"> Select for pruning</label>
          <button id="close-preview" type="button">Close</button>
        </div>
      </div>
    </div>
  </dialog>
  <script>
    const token = ${JSON.stringify(token)}
    const headers = { 'content-type': 'application/json', 'x-session-token': token }
    const gallerySelect = document.querySelector('#gallery')
    const photos = document.querySelector('#photos')
    const confirmation = document.querySelector('#confirmation')
    const prune = document.querySelector('#prune')
    const sourceLabel = document.querySelector('#source')
    const sourcePath = document.querySelector('#source-path')
    const status = document.querySelector('#status')
    const preview = document.querySelector('#preview')
    const previewImage = document.querySelector('#preview-image')
    const previewName = document.querySelector('#preview-name')
    const previewPosition = document.querySelector('#preview-position')
    const previewSelect = document.querySelector('#preview-select')
    const previewPrevious = document.querySelector('#preview-previous')
    const previewNext = document.querySelector('#preview-next')
    let galleries = []
    let sources = {}
    let savedSelections = {}
    let source = ''
    let running = false
    let worktreeClean = false
    let previewPhotos = []
    let previewIndex = -1
    let selectionSave = Promise.resolve()

    const selected = () => [...photos.querySelectorAll('input:checked')].map(input => input.value)
    const gridInputAt = index => photos.querySelectorAll('.photo input')[index]
    function persistSelection() {
      const slug = gallerySelect.value
      const filenames = selected()
      savedSelections[slug] = filenames
      selectionSave = selectionSave
        .then(() =>
          fetch('/api/selections', {
            method:'POST',
            headers,
            body:JSON.stringify({ slug, filenames }),
          }),
        )
        .then(async response => {
          if (!response.ok) {
            const data = await response.json()
            status.textContent = 'Could not save selection: ' + data.error
          }
        })
        .catch(error => {
          status.textContent = 'Could not save selection: ' + error.message
        })
    }
    function update() {
      const count = selected().length
      document.querySelector('#count').textContent = count + (count === 1 ? ' photo selected' : ' photos selected')
      confirmation.placeholder = count ? 'PRUNE ' + count + ' PHOTOS' : 'Select photos first'
      prune.disabled = running || !worktreeClean || !source || !count || confirmation.value !== 'PRUNE ' + count + ' PHOTOS'
    }
    function showPreview(index) {
      if (index < 0 || index >= previewPhotos.length) return
      previewIndex = index
      const photo = previewPhotos[index]
      previewImage.src = photo.src
      previewImage.alt = photo.alt
      previewName.textContent = photo.filename
      previewPosition.textContent = (index + 1) + ' / ' + previewPhotos.length
      previewSelect.checked = gridInputAt(index).checked
      previewPrevious.disabled = index === 0
      previewNext.disabled = index === previewPhotos.length - 1
    }
    function setPreviewSelected(checked) {
      previewSelect.checked = checked
      gridInputAt(previewIndex).checked = checked
      update()
      persistSelection()
    }
    function render() {
      const gallery = galleries.find(item => item.slug === gallerySelect.value)
      if (preview.open) preview.close()
      previewPhotos = gallery?.photos || []
      previewIndex = -1
      source = sources[gallery?.slug] || ''
      sourcePath.value = source
      sourceLabel.textContent = source || 'No folder selected'
      confirmation.value = ''
      photos.replaceChildren(...previewPhotos.map((photo, index) => {
        const figure = document.createElement('figure')
        figure.className = 'photo'
        const input = document.createElement('input')
        input.type = 'checkbox'; input.value = photo.filename
        input.checked = (savedSelections[gallery.slug] || []).includes(photo.filename)
        input.setAttribute('aria-label', 'Select ' + photo.filename + ' for pruning')
        input.addEventListener('change', () => {
          if (previewIndex === index) previewSelect.checked = input.checked
          update()
          persistSelection()
        })
        const open = document.createElement('button')
        open.type = 'button'
        open.setAttribute('aria-label', 'Preview ' + photo.filename)
        const image = document.createElement('img')
        image.src = photo.src; image.alt = photo.alt; image.loading = 'lazy'
        if (photo.width && photo.height) {
          image.width = photo.width
          image.height = photo.height
        }
        open.addEventListener('click', () => {
          showPreview(index)
          preview.showModal()
        })
        const caption = document.createElement('figcaption')
        caption.textContent = photo.filename
        open.append(image)
        figure.append(input, open, caption)
        return figure
      }))
      update()
    }
    async function load() {
      const response = await fetch('/api/galleries', { headers: { 'x-session-token': token } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      galleries = data.galleries; sources = data.sources
      savedSelections = data.selections
      worktreeClean = data.worktreeClean
      status.textContent = worktreeClean
        ? 'Ready.'
        : 'Blocked: Git has uncommitted changes. Commit or stash them, then close and reopen this tool.'
      gallerySelect.replaceChildren(...galleries.map(item => {
        const option = document.createElement('option')
        option.value = item.slug; option.textContent = item.title + ' (' + item.photos.length + ')'
        return option
      }))
      render()
    }
    gallerySelect.addEventListener('change', render)
    confirmation.addEventListener('input', update)
    sourcePath.addEventListener('input', () => {
      source = sourcePath.value.trim()
      sourceLabel.textContent = source || 'No folder selected'
      update()
    })
    document.querySelector('#close-preview').addEventListener('click', () => preview.close())
    previewPrevious.addEventListener('click', () => showPreview(previewIndex - 1))
    previewNext.addEventListener('click', () => showPreview(previewIndex + 1))
    previewSelect.addEventListener('change', () =>
      setPreviewSelected(previewSelect.checked),
    )
    document.addEventListener('keydown', event => {
      if (!preview.open) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        showPreview(previewIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        showPreview(previewIndex + 1)
      } else if (event.code === 'Space') {
        event.preventDefault()
        setPreviewSelected(!previewSelect.checked)
      }
    })
    preview.addEventListener('click', event => {
      if (event.target === preview) preview.close()
    })
    document.querySelector('#clear').addEventListener('click', () => {
      photos.querySelectorAll('input').forEach(input => input.checked = false)
      if (preview.open) previewSelect.checked = false
      confirmation.value = ''; update(); persistSelection()
    })
    document.querySelector('#choose').addEventListener('click', async () => {
      status.textContent = 'Opening the Windows folder picker...'
      try {
        const response = await fetch('/api/folder', { method:'POST', headers, body:'{}' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (data.path) {
          source = data.path
          sourcePath.value = source
          sourceLabel.textContent = source
          status.textContent = 'Folder selected.'
          update()
        } else {
          status.textContent = 'Folder selection cancelled. You can also paste the folder path above.'
        }
      } catch (error) {
        status.textContent = error.message + '\\nYou can paste the folder path above instead.'
      }
    })
    prune.addEventListener('click', async () => {
      running = true; prune.textContent = 'Pruning...'; update(); status.textContent = 'Starting prune...\\n'
      try {
        const response = await fetch('/api/prune', {
          method:'POST', headers,
          body:JSON.stringify({ slug:gallerySelect.value, filenames:selected(), source, confirmation:confirmation.value })
        })
        if (!response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || 'Prune could not start.')
        }
        if (!response.body) throw new Error('No response from pruner.')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let output = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream:true })
          output += chunk
          status.textContent += chunk
          status.scrollTop = status.scrollHeight
        }
        if (!response.ok || !output.includes('Pruner exited with code 0.')) {
          throw new Error('Prune failed. Read the recovery instructions above.')
        }
        await load()
      } catch (error) {
        status.textContent += '\\n' + error.message
      } finally {
        running = false; prune.textContent = 'Prune selected photos'; update()
      }
    })
    load().catch(error => status.textContent = error.message)
  </script>
</body>
</html>`
}

export function createApp({
  root = ROOT,
  token = randomBytes(24).toString('hex'),
} = {}) {
  const portfolio = join(root, 'src', 'content', 'portfolio')
  const lock = createOperationLock()

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1')
      const authorized =
        url.searchParams.get('token') === token ||
        request.headers['x-session-token'] === token
      if (!authorized)
        return json(response, 403, { error: 'Invalid session token.' })

      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        })
        return response.end(page(token))
      }

      if (request.method === 'GET' && url.pathname === '/api/galleries') {
        const config =
          root === ROOT
            ? await readLocalConfig()
            : { sources: {}, selections: {} }
        return json(response, 200, {
          galleries: await discoverGalleries(portfolio),
          sources: config.sources ?? {},
          selections: config.selections ?? {},
          worktreeClean:
            root === ROOT
              ? !(await capture('git', ['status', '--porcelain']))
              : true,
        })
      }

      if (request.method === 'POST' && url.pathname === '/api/selections') {
        const body = await readJson(request)
        const galleries = await discoverGalleries(portfolio)
        const gallery = galleries.find((item) => item.slug === body.slug)
        if (!gallery) {
          return json(response, 400, { error: 'Choose a valid gallery.' })
        }
        if (!Array.isArray(body.filenames)) {
          return json(response, 400, { error: 'Invalid photo selection.' })
        }
        const available = new Set(gallery.photos.map((photo) => photo.filename))
        if (body.filenames.some((filename) => !available.has(filename))) {
          return json(response, 400, {
            error: 'The photo selection is no longer valid.',
          })
        }
        const config = await readLocalConfig()
        config.selections ??= {}
        if (body.filenames.length) config.selections[body.slug] = body.filenames
        else delete config.selections[body.slug]
        await writeLocalConfig(config)
        return json(response, 200, { saved: body.filenames.length })
      }

      if (request.method === 'POST' && url.pathname === '/api/folder') {
        if (process.platform !== 'win32') {
          return json(response, 400, {
            error: 'The folder picker requires Windows.',
          })
        }
        return json(response, 200, { path: await chooseFolder() })
      }

      if (request.method === 'POST' && url.pathname === '/api/prune') {
        if (!lock.acquire()) {
          return json(response, 409, {
            error: 'A prune operation is already running.',
          })
        }
        try {
          const body = await readJson(request)
          const galleries = await discoverGalleries(portfolio)
          validateSelection(
            galleries,
            body.slug,
            body.filenames,
            body.confirmation,
          )
          if (typeof body.source !== 'string' || !body.source.trim()) {
            throw new Error('Choose the local export folder.')
          }

          response.writeHead(200, {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          })
          const child = spawn(
            NODE,
            [
              join(root, 'scripts', 'prune-gallery.mjs'),
              body.slug,
              ...body.filenames,
              '--source',
              body.source,
              '--yes',
            ],
            { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
          )
          child.stdout.pipe(response, { end: false })
          child.stderr.pipe(response, { end: false })
          child.on('error', (error) => {
            response.write(`\nUnable to start pruner: ${error.message}\n`)
            response.end()
            lock.release()
          })
          child.on('close', (code) => {
            response.write(`\nPruner exited with code ${code}.\n`)
            response.end()
            lock.release()
          })
          return
        } catch (error) {
          lock.release()
          return json(response, 400, { error: error.message })
        }
      }

      json(response, 404, { error: 'Not found.' })
    } catch (error) {
      json(response, 500, { error: error.message })
    }
  })
  return { server, token }
}

async function main() {
  const { server, token } = createApp()
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const { port } = server.address()
  const url = `http://127.0.0.1:${port}/?token=${token}`
  console.log(`Gallery Pruner: ${url}`)
  console.log('Close this window or press Ctrl+C to stop it.')
  if (process.platform === 'win32') {
    spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`Gallery Pruner GUI failed: ${error.message}`)
    process.exitCode = 1
  })
}
