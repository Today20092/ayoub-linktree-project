const cacheName = 'ayoub-barber-tracker-v3'
const root = new URL('./', self.location.href).pathname
const files = [
  root,
  root + 'app.mjs',
  root + 'core.mjs',
  root + 'tracker.css',
  root + 'manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files)))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith('ayoub-barber-tracker-') && key !== cacheName,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  )
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Only the tracker shell is cached. Never intercept payments or other site routes.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(root)
  )
    return
  const lookup = event.request.mode === 'navigate' ? root : url.pathname
  if (!files.includes(lookup)) return
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(lookup)
      if (cached) return cached
      return fetch(event.request)
    }),
  )
})
