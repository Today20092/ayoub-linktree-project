import { galleryPagePath } from './gallery-pagination'

type Selection = { filenames: string[]; mode: 'favorites' | 'search' }
type Order = 'oldest' | 'newest'
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
  let original = [...content.childNodes]
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
  const stream = gallery.querySelector<HTMLElement>('[data-gallery-stream]')!
  const streamStatus = stream.querySelector<HTMLElement>(
    '[data-gallery-stream-status]',
  )!
  const more = stream.querySelector<HTMLAnchorElement>(
    '[data-gallery-load-more]',
  )!
  const earlier = gallery.querySelector<HTMLAnchorElement>(
    '[data-gallery-load-earlier]',
  )
  const pageCount = Math.ceil(images.length / pageSize)
  let first = Number(gallery.dataset.galleryPage)
  let last = first
  let filtered = false
  let loading = false
  let failed = false
  let failedDirection: 'earlier' | 'more' = 'more'
  let order: Order = 'oldest'
  let deferredOrder: Order | undefined
  let failedOrder: Order | undefined
  let restoring = true
  let restoreCancelled = false
  let batchController: AbortController | undefined
  let batchRevision = 0
  const saved = history.state?.galleryScroll
  const adjacentPage = (direction: 'earlier' | 'more') => {
    if (order === 'newest') return direction === 'more' ? first - 1 : last + 1
    return direction === 'more' ? last + 1 : first - 1
  }
  const updateStream = () => {
    gallery.dataset.galleryFiltered = String(filtered)
    gallery.dataset.galleryOrder = order
    stream.hidden = filtered
    const next = adjacentPage('more')
    const previous = adjacentPage('earlier')
    more.hidden = !failedOrder && (next < 1 || next > pageCount)
    more.href = galleryPagePath(
      location.pathname,
      failedOrder
        ? failedOrder === 'newest'
          ? pageCount
          : 1
        : Math.max(1, Math.min(next, pageCount)),
      share,
    )
    more.textContent =
      failed && (failedDirection === 'more' || failedOrder)
        ? 'Retry loading photos'
        : 'Load more photos'
    more.setAttribute('aria-disabled', String(loading))
    if (earlier) {
      earlier.hidden = filtered || previous < 1 || previous > pageCount
      earlier.href = galleryPagePath(
        location.pathname,
        Math.max(1, Math.min(previous, pageCount)),
        share,
      )
      earlier.setAttribute('aria-disabled', String(loading))
      earlier.textContent =
        failed && failedDirection === 'earlier'
          ? 'Retry earlier photos'
          : order === 'newest'
            ? 'Load newer photos'
            : 'Load earlier photos'
    }
  }
  const cancelBatch = () => {
    batchRevision += 1
    batchController?.abort()
    loading = false
    streamStatus.textContent = ''
  }
  const fetchPage = async (page: number, signal: AbortSignal) => {
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
      throw new Error('Could not load photos. Check your connection and retry.')
    const parsed = new DOMParser().parseFromString(
      await response.text(),
      'text/html',
    )
    const other = parsed.getElementById(gallery.id)
    const slice = other?.querySelector<HTMLElement>(
      '[data-gallery-page-content]',
    )
    const cards = [
      ...(slice?.querySelectorAll<HTMLElement>('[data-gallery-filename]') ??
        []),
    ]
    const expected = images.slice((page - 1) * pageSize, page * pageSize)
    if (
      !slice ||
      Number(other?.dataset.galleryPage) !== page ||
      cards.length !== expected.length ||
      cards.some(
        (card, index) =>
          card.dataset.galleryFilename !== expected[index]?.filename ||
          Number(
            card.querySelector<HTMLElement>('[data-gallery-open]')?.dataset
              .galleryOpen,
          ) !==
            (page - 1) * pageSize + index,
      )
    )
      throw new Error('The gallery changed. Reload this page and try again.')
    return slice
  }
  const remember = () => {
    if (restoring || filtered) return
    history.replaceState(
      {
        ...history.state,
        galleryScroll: {
          path: location.pathname,
          first,
          last,
          order,
          y: scrollY,
        },
      },
      '',
    )
  }
  const load = async (
    direction: 'earlier' | 'more',
    manual = false,
    nextOrder?: Order,
  ) => {
    if (loading || filtered || (!manual && failed)) return
    const page = nextOrder
      ? nextOrder === 'newest'
        ? pageCount
        : 1
      : adjacentPage(direction)
    if (page < 1 || page > pageCount) return
    loading = true
    failed = false
    failedOrder = undefined
    batchController = new AbortController()
    const attempt = ++batchRevision
    streamStatus.textContent = 'Loading more photos…'
    updateStream()
    try {
      const slice = await fetchPage(page, batchController.signal)
      if (attempt !== batchRevision || filtered) return
      const anchor = [
        ...content.querySelectorAll<HTMLElement>('[data-gallery-filename]'),
      ].find((card) => card.getBoundingClientRect().bottom > 0)
      const top = anchor?.getBoundingClientRect().top
      if (nextOrder) {
        content.replaceChildren(...slice.childNodes)
        order = nextOrder
        first = last = page
        updateStream()
      } else
        for (const selector of ['[data-gallery-grid]', 'section']) {
          const incoming = slice.querySelector<HTMLElement>(selector)
          if (!incoming) continue
          const existing = content.querySelector<HTMLElement>(selector)
          if (!existing) {
            if (selector === '[data-gallery-grid]')
              content.insertBefore(incoming, content.firstChild)
            else content.appendChild(incoming)
          } else {
            const grid = existing.matches('[data-photo-grid]')
              ? existing
              : existing.querySelector<HTMLElement>('[data-photo-grid]')!
            const cards = [
              ...incoming.querySelectorAll<HTMLElement>(
                '[data-gallery-filename]',
              ),
            ]
            const before = page < first ? grid.firstChild : null
            cards.forEach((card) => grid.insertBefore(card, before))
          }
        }
      first = Math.min(first, page)
      last = Math.max(last, page)
      original = [...content.childNodes]
      refresh()
      if (!nextOrder && anchor && top !== undefined)
        window.scrollBy({
          top: anchor.getBoundingClientRect().top - top,
          behavior: 'instant',
        })
      streamStatus.textContent = `Showing ${Math.min(last * pageSize, images.length) - (first - 1) * pageSize} of ${images.length} photos.`
      remember()
    } catch (error) {
      if (attempt !== batchRevision) return
      failed = true
      failedDirection = direction
      failedOrder = nextOrder
      streamStatus.textContent =
        error instanceof Error ? error.message : 'Could not load photos. Retry.'
    } finally {
      if (attempt === batchRevision) {
        loading = false
        updateStream()
        if (!restoring) requestAnimationFrame(autoLoad)
      }
    }
  }
  const autoLoad = () => {
    if (
      !restoring &&
      !more.hidden &&
      more.getBoundingClientRect().top < innerHeight + 1000 &&
      more.getBoundingClientRect().bottom > 0
    )
      void load('more')
  }
  const observer = new IntersectionObserver(autoLoad, { rootMargin: '1000px' })
  observer.observe(more)
  const onMore = (event: MouseEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    void load('more', true, failedOrder)
  }
  const onEarlier = (event: MouseEvent) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    void load('earlier', true)
  }
  more.addEventListener('click', onMore)
  earlier?.addEventListener('click', onEarlier)
  const onOrder = (event: Event) => {
    restoreCancelled = true
    restoring = false
    const next =
      (event as CustomEvent<string>).detail === 'newest' ? 'newest' : 'oldest'
    if (filtered) {
      deferredOrder = next
      return
    }
    cancelBatch()
    failed = false
    failedOrder = undefined
    if (order !== next) void load('more', true, next)
    else updateStream()
  }
  gallery.addEventListener('gallery:order', onOrder)
  let scrollTimer: ReturnType<typeof setTimeout> | undefined
  const onScroll = () => {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(remember, 200)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', remember)
  if (pagination) pagination.hidden = true
  updateStream()
  void (async () => {
    if (
      saved?.path === location.pathname &&
      Number.isInteger(saved.first) &&
      Number.isInteger(saved.last) &&
      saved.first >= 1 &&
      saved.last <= pageCount
    ) {
      if (saved.order === 'newest') await load('more', true, 'newest')
      while (first > saved.first && !failed && !filtered && !restoreCancelled)
        await load(saved.order === 'newest' ? 'more' : 'earlier')
      while (last < saved.last && !failed && !filtered && !restoreCancelled)
        await load(saved.order === 'newest' ? 'earlier' : 'more')
      if (!filtered && !restoreCancelled && Number.isFinite(saved.y))
        window.scrollTo({ top: saved.y, behavior: 'instant' })
    }
    restoring = false
    autoLoad()
  })()
  const reset = () => {
    revision += 1
    controller?.abort()
    pending = undefined
    content.replaceChildren(...original)
    filtered = false
    updateStream()
    status.textContent = ''
    retry.hidden = true
    showPage.hidden = true
    gallery.removeAttribute('aria-busy')
    refresh()
    if (deferredOrder) {
      const next = deferredOrder
      deferredOrder = undefined
      onOrder(new CustomEvent('gallery:order', { detail: next }))
    }
    requestAnimationFrame(autoLoad)
  }
  const show = async (selection: Selection) => {
    restoreCancelled = true
    restoring = false
    cancelBatch()
    filtered = true
    updateStream()
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
        collect(await fetchPage(page, signal))
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
      cancelBatch()
      observer.disconnect()
      more.removeEventListener('click', onMore)
      earlier?.removeEventListener('click', onEarlier)
      gallery.removeEventListener('gallery:order', onOrder)
      clearTimeout(scrollTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', remember)
      retry.removeEventListener('click', onRetry)
      showPage.removeEventListener('click', onShowPage)
    },
  }
}

export type GallerySelectionRequest = Request
