import { galleryPagePath } from './gallery-pagination'

type Selection = { filenames: string[]; mode: 'favorites' | 'search' }
type Request = Selection & {
  resolve: () => void
  reject: (error: Error) => void
}

export function showGalleryMatches(gallery: HTMLElement, filenames: string[]) {
  return new Promise<void>((resolve, reject) => {
    gallery.dispatchEvent(
      new CustomEvent<Request>('gallery:search-results', {
        detail: { filenames, mode: 'search', resolve, reject },
      }),
    )
  })
}

/** One owner swaps Astro-rendered cards for both collection-wide filters. */
export function createGallerySelection(
  gallery: HTMLElement,
  images: { filename: string }[],
  share?: string,
) {
  const content = gallery.querySelector<HTMLElement>(
    '[data-gallery-page-content]',
  )!
  const original = [...content.childNodes]
  const pagination = gallery.querySelector<HTMLElement>(
    '[data-gallery-pagination]',
  )
  const status = gallery.querySelector<HTMLElement>(
    '[data-gallery-filter-status]',
  )!
  const retry = gallery.querySelector<HTMLButtonElement>(
    '[data-gallery-filter-retry]',
  )!
  const showPage = gallery.querySelector<HTMLButtonElement>(
    '[data-gallery-show-page]',
  )!
  const pageSize = Number(gallery.dataset.galleryPageSize)
  const indexes = new Map(images.map((image, index) => [image.filename, index]))
  let controller: AbortController | undefined
  let pending: Selection | undefined
  let revision = 0
  const refresh = () => gallery.dispatchEvent(new Event('gallery:layout'))
  const reset = () => {
    revision += 1
    controller?.abort()
    pending = undefined
    content.replaceChildren(...original)
    if (pagination) pagination.hidden = false
    status.textContent = ''
    retry.hidden = true
    showPage.hidden = true
    gallery.removeAttribute('aria-busy')
    refresh()
  }
  const show = async (selection: Selection) => {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    const attempt = ++revision
    pending = selection
    status.textContent = 'Loading photos from across the gallery…'
    retry.hidden = true
    showPage.hidden = false
    gallery.setAttribute('aria-busy', 'true')
    try {
      const filenames = [...new Set(selection.filenames)]
      if (filenames.some((filename) => !indexes.has(filename)))
        throw new Error('The gallery changed. Reload this page and try again.')
      const figures = new Map<string, HTMLElement>()
      const collect = (root: Pick<ParentNode, 'querySelectorAll'>) => {
        root
          .querySelectorAll<HTMLElement>('[data-gallery-filename]')
          .forEach((figure) => {
            const filename = figure.dataset.galleryFilename!
            if (!filenames.includes(filename)) return
            if (
              Number(
                figure.querySelector<HTMLElement>('[data-gallery-open]')
                  ?.dataset.galleryOpen,
              ) !== indexes.get(filename)
            )
              throw new Error(
                'The gallery changed. Reload this page and try again.',
              )
            figures.set(filename, figure.cloneNode(true) as HTMLElement)
          })
      }
      // The detached page slice is retained only for restoration, never the full gallery.
      original.forEach((node) => {
        if (node instanceof HTMLElement) {
          const wrapper = document.createElement('div')
          wrapper.appendChild(node.cloneNode(true))
          collect(wrapper)
        }
      })
      const pages = new Set(
        filenames
          .filter((filename) => !figures.has(filename))
          .map((filename) => Math.floor(indexes.get(filename)! / pageSize) + 1),
      )
      for (const page of pages) {
        const response = await fetch(
          galleryPagePath(location.pathname, page, share),
          {
            signal,
            cache: 'no-store',
            credentials: 'same-origin',
            referrerPolicy: share ? 'no-referrer' : 'same-origin',
          },
        )
        if (!response.ok)
          throw new Error(
            'Could not load all photos. Check your connection and retry.',
          )
        const parsed = new DOMParser().parseFromString(
          await response.text(),
          'text/html',
        )
        const other = parsed.getElementById(gallery.id)
        if (!other)
          throw new Error(
            'The gallery changed. Reload this page and try again.',
          )
        collect(other)
      }
      if (attempt !== revision) return
      if (filenames.some((filename) => !figures.has(filename)))
        throw new Error('The gallery changed. Reload this page and try again.')
      const grid = document.createElement('div')
      grid.dataset.photoGrid = ''
      filenames.forEach((filename, index) => {
        const figure = figures.get(filename)!
        const badge = figure.querySelector<HTMLElement>('[data-face-rank]')
        if (badge) {
          badge.hidden = selection.mode !== 'search'
          badge.textContent = `Match ${index + 1}`
        }
        grid.appendChild(figure)
      })
      content.replaceChildren(grid)
      if (pagination) pagination.hidden = true
      status.textContent = `Showing ${filenames.length} ${selection.mode === 'search' ? 'possible matches' : 'favorites'} from the whole gallery.`
      pending = undefined
      refresh()
      gallery.dispatchEvent(
        new CustomEvent('gallery:filter-loaded', { detail: selection }),
      )
    } catch (error) {
      if (attempt !== revision || signal.aborted) return
      status.textContent =
        error instanceof Error ? error.message : 'Could not load photos. Retry.'
      retry.hidden = false
      throw error
    } finally {
      if (attempt === revision) gallery.removeAttribute('aria-busy')
    }
  }
  const onRetry = () => {
    if (pending) void show(pending).catch(() => {})
  }
  const onShowPage = () => gallery.dispatchEvent(new Event('gallery:show-page'))
  showPage.addEventListener('click', onShowPage)
  retry.addEventListener('click', onRetry)
  return {
    show,
    reset,
    destroy: () => {
      controller?.abort()
      retry.removeEventListener('click', onRetry)
      showPage.removeEventListener('click', onShowPage)
    },
  }
}

export type GallerySelectionRequest = Request
