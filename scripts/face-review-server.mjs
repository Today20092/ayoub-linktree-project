import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFaceReviewPage } from './face-review-page.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const eventIndex = args.indexOf('--event')
const eventSlug = eventIndex >= 0 ? args[eventIndex + 1] : undefined

if (!eventSlug || !/^[a-z0-9-]+$/.test(eventSlug)) {
  console.error('Usage: npm run faces:review -- --event <slug>')
  process.exit(1)
}

const workspace = resolve(root, '.face-index', eventSlug)
const reviewPath = resolve(workspace, 'review.json')
const cropsDirectory = resolve(workspace, 'crops')
const html = createFaceReviewPage()

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/') {
      response.setHeader('content-type', 'text/html; charset=utf-8')
      response.end(html)
      return
    }
    if (request.url === '/review.json' && request.method === 'GET') {
      response.setHeader('content-type', 'application/json')
      response.end(await readFile(reviewPath))
      return
    }
    if (request.url === '/review.json' && request.method === 'POST') {
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const next = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      await writeFile(reviewPath, `${JSON.stringify(next, null, 2)}\n`)
      response.end('ok')
      return
    }
    if (request.url?.startsWith('/crops/')) {
      response.setHeader('content-type', 'image/webp')
      response.end(
        await readFile(resolve(cropsDirectory, basename(request.url))),
      )
      return
    }
    response.statusCode = 404
    response.end('Not found')
  } catch (error) {
    response.statusCode = 500
    response.end(error instanceof Error ? error.message : 'Error')
  }
})

server.listen(4174, '127.0.0.1', () => {
  console.log(`Review ${eventSlug} at http://127.0.0.1:4174`)
})
