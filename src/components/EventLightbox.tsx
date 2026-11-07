import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Share2,
  X,
} from 'lucide-react'
import { downloadZip } from 'client-zip'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { nextGalleryPhoto } from '@/lib/gallery-grid'
import { galleryPagePath } from '@/lib/gallery-pagination'
import {
  createGallerySelection,
  type GallerySelectionRequest,
} from '@/lib/gallery-selection'
import { Progress } from '@/components/ui/progress'
import { Toaster } from '@/components/ui/sonner'

type GalleryImage = {
  src: string
  filename: string
  alt: string
  width: number
  height: number
  caption?: string
}

type EventLightboxProps = {
  galleryId: string
  heading: string
  shareToken?: string
  projectSlug: string
  projectTitle: string
  images: GalleryImage[]
  downloadAllUrl?: string
  tipUrl?: string
  children: React.ReactNode
}

type DownloadRequest =
  | { kind: 'file'; url: string; filename: string }
  | { kind: 'selection'; images: GalleryImage[]; filename: string }

type DownloadStatus = 'idle' | 'preparing' | 'complete' | 'error'

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function downloadUrl(url: string, filename: string) {
  return `/api/download/?${new URLSearchParams({ url, filename })}`
}

function sameOriginDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = downloadUrl(url, filename)
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export default function EventLightbox({
  galleryId,
  heading,
  shareToken,
  projectSlug,
  projectTitle,
  images,
  downloadAllUrl,
  tipUrl = 'https://ko-fi.com/ayoubab1/10',
  children,
}: EventLightboxProps) {
  const [open, setOpen] = React.useState(false)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [favoritesOnly, setFavoritesOnly] = React.useState(false)
  const [selectionLoaded, setSelectionLoaded] = React.useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = React.useState(false)
  const [downloadStatus, setDownloadStatus] =
    React.useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = React.useState(0)
  const [downloadLabel, setDownloadLabel] = React.useState('')
  const [downloadError, setDownloadError] = React.useState('')
  const [pendingDownload, setPendingDownload] =
    React.useState<DownloadRequest | null>(null)
  const slidesRef = React.useRef<HTMLDivElement>(null)
  const selectionBarRef = React.useRef<HTMLDivElement>(null)
  const lastFocusedRef = React.useRef<HTMLElement | null>(null)
  const lastFocusedIndexRef = React.useRef<number | null>(null)
  const touchStartX = React.useRef<number | null>(null)
  const touchStartY = React.useRef<number | null>(null)
  const selectionStorageKey = `event-gallery:${projectSlug}:favorites`
  const gridSelection = React.useRef<ReturnType<
    typeof createGallerySelection
  > | null>(null)
  const [gridRevision, setGridRevision] = React.useState(0)

  React.useEffect(() => {
    const bar = selectionBarRef.current
    if (!bar) return
    const resize = () =>
      document.documentElement.style.setProperty(
        '--gallery-selection-height',
        `${Math.ceil(bar.getBoundingClientRect().height) + 32}px`,
      )
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty(
        '--gallery-selection-height',
      )
    }
  }, [selected.size])

  React.useEffect(() => {
    const gallery = document.getElementById(galleryId)
    if (!gallery) return
    const selection = createGallerySelection(gallery, images, shareToken)
    gridSelection.current = selection
    const refresh = () => setGridRevision((value) => value + 1)
    const reset = () => selection.reset()
    const search = (event: Event) => {
      setFavoritesOnly(false)
      const request = (event as CustomEvent<GallerySelectionRequest>).detail
      if (request)
        void selection.show(request).then(request.resolve, request.reject)
    }
    gallery.addEventListener('gallery:layout', refresh)
    gallery.addEventListener('gallery:clear-filter', reset)
    gallery.addEventListener('gallery:search-results', search)
    const startSearch = () => {
      setFavoritesOnly(false)
      selection.reset()
    }
    gallery.addEventListener('gallery:search-start', startSearch)
    const showPage = () => {
      setFavoritesOnly(false)
      gallery.dispatchEvent(new Event('gallery:reset-search'))
      selection.reset()
    }
    gallery.addEventListener('gallery:show-page', showPage)
    return () => {
      selection.destroy()
      gallery.removeEventListener('gallery:layout', refresh)
      gallery.removeEventListener('gallery:clear-filter', reset)
      gallery.removeEventListener('gallery:search-results', search)
      gallery.removeEventListener('gallery:search-start', startSearch)
      gallery.removeEventListener('gallery:show-page', showPage)
    }
  }, [galleryId, images, shareToken])

  React.useEffect(() => {
    if (!favoritesOnly) return
    if (selected.size === 0) {
      gridSelection.current?.reset()
      setFavoritesOnly(false)
    } else
      void gridSelection.current
        ?.show({
          filenames: images
            .filter((image) => selected.has(image.filename))
            .map((image) => image.filename),
          mode: 'favorites',
        })
        .catch(() => {})
  }, [favoritesOnly, selected, images])

  React.useEffect(() => {
    const validFilenames = new Set(images.map((image) => image.filename))

    try {
      const saved = JSON.parse(
        window.localStorage.getItem(selectionStorageKey) ?? '[]',
      )
      if (Array.isArray(saved)) {
        setSelected(
          new Set(
            saved.filter(
              (filename): filename is string =>
                typeof filename === 'string' && validFilenames.has(filename),
            ),
          ),
        )
      }
    } catch {
      /* Favorites remain usable when storage is unavailable. */
    }

    setSelectionLoaded(true)
  }, [images, selectionStorageKey])

  React.useEffect(() => {
    if (!selectionLoaded) return
    try {
      window.localStorage.setItem(
        selectionStorageKey,
        JSON.stringify([...selected]),
      )
    } catch {
      /* Keep favorites for this visit when storage is unavailable. */
    }
  }, [selected, selectionLoaded, selectionStorageKey])

  React.useEffect(() => {
    const gallery = document.getElementById(galleryId)
    if (!gallery) return

    if (favoritesOnly && selected.size === 0) setFavoritesOnly(false)
    gallery
      .querySelectorAll<HTMLElement>('[data-gallery-filename]')
      .forEach((figure) => {
        figure.dataset.favorite = String(
          selected.has(figure.dataset.galleryFilename ?? ''),
        )
      })
    gallery.dataset.galleryHasPicks = String(selected.size > 0)

    gallery
      .querySelectorAll<HTMLElement>('[data-gallery-favorite]')
      .forEach((button) => {
        const isSelected = selected.has(button.dataset.filename ?? '')
        if (button instanceof HTMLButtonElement)
          button.disabled = !selectionLoaded
        button.dataset.selected = String(isSelected)
        button.setAttribute('aria-pressed', String(isSelected))
        const photo = images.findIndex(
          (image) => image.filename === button.dataset.filename,
        )
        button.setAttribute(
          'aria-label',
          `${isSelected ? 'Remove' : 'Add'} photograph ${photo + 1} ${isSelected ? 'from' : 'to'} favorites`,
        )
      })
  }, [galleryId, selected, favoritesOnly, selectionLoaded, gridRevision])

  const toggleFavorite = React.useCallback((filename: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }, [])

  const syncVisibleSlide = React.useCallback(
    (container: HTMLDivElement, index: number, loadOriginal = false) => {
      const slide = container.querySelector<HTMLElement>('[data-gallery-slide]')
      const image = images[index]
      if (!slide || !image) return

      slide.hidden = false
      slide.dataset.gallerySlide = String(index)
      const element = slide.querySelector<HTMLImageElement>('img')
      if (element) {
        element.alt = image.alt
        element.width = image.width
        element.height = image.height
        if (loadOriginal && element.src !== image.src) {
          element.removeAttribute('srcset')
          element.removeAttribute('sizes')
          element.removeAttribute('data-astro-image')
          element.dataset.galleryOriginal = image.src
          element.src = image.src
        }
      }
      const caption = slide.querySelector<HTMLElement>('[data-gallery-caption]')
      if (caption) caption.textContent = image.caption ?? image.filename
    },
    [images],
  )

  const setSlidesContainer = React.useCallback(
    (container: HTMLDivElement | null) => {
      slidesRef.current = container
      if (container) syncVisibleSlide(container, currentIndex, open)
    },
    [currentIndex, open, syncVisibleSlide],
  )

  const getLastFocusedOpener = React.useCallback(() => {
    if (lastFocusedRef.current?.isConnected) return lastFocusedRef.current
    const gallery = document.getElementById(galleryId)
    if (lastFocusedIndexRef.current === null) return gallery

    return (
      document
        .getElementById(galleryId)
        ?.querySelector<HTMLElement>(
          `[data-gallery-open="${lastFocusedIndexRef.current}"]`,
        ) ?? gallery
    )
  }, [galleryId])

  const getPhotoIndexFromUrl = React.useCallback(() => {
    const value = new URL(window.location.href).searchParams.get('photo')
    if (!value || !/^\d+$/.test(value)) return null

    const index = Number(value) - 1
    return index >= 0 && index < images.length ? index : null
  }, [images.length])

  const updatePhotoUrl = React.useCallback(
    (index: number | null, mode: 'push' | 'replace' = 'replace') => {
      const url = new URL(window.location.href)

      if (index === null) {
        url.searchParams.delete('photo')
        const page = Number(
          document.getElementById(galleryId)?.dataset.galleryPage ?? 1,
        )
        const base = new URL(
          galleryPagePath(url.pathname, page, shareToken),
          url,
        )
        url.search = base.search
      } else {
        url.searchParams.set('photo', String(index + 1))
      }

      window.history[mode === 'push' ? 'pushState' : 'replaceState'](
        window.history.state,
        '',
        url,
      )
    },
    [galleryId, shareToken],
  )

  const showSlide = React.useCallback(
    (nextIndex: number, updateUrl = true) => {
      if (images.length === 0) return
      const normalizedIndex = (nextIndex + images.length) % images.length
      setCurrentIndex(normalizedIndex)
      if (updateUrl) updatePhotoUrl(normalizedIndex)
    },
    [images.length, updatePhotoUrl],
  )

  const visibleIndexes = images.flatMap((image, index) =>
    favoritesOnly && !selected.has(image.filename) ? [] : [index],
  )
  const navigatePhoto = (direction: -1 | 1) => {
    const next = nextGalleryPhoto(currentIndex, direction, visibleIndexes)
    if (next !== undefined) showSlide(next)
  }
  const navigationDisabled =
    visibleIndexes.length === 0 ||
    (visibleIndexes.length === 1 && visibleIndexes[0] === currentIndex)

  const toggleFavoritesView = () => {
    const gallery = document.getElementById(galleryId)
    if (!favoritesOnly)
      gallery?.dispatchEvent(new Event('gallery:reset-search'))
    else gridSelection.current?.reset()
    setFavoritesOnly(!favoritesOnly)
    gallery?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen && getPhotoIndexFromUrl() !== null) {
        updatePhotoUrl(null)
      }
    },
    [getPhotoIndexFromUrl, updatePhotoUrl],
  )

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX
    touchStartY.current = event.touches[0].clientY
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return

    const deltaX = event.changedTouches[0].clientX - touchStartX.current
    const deltaY = event.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return

    if (deltaX > 0) {
      navigatePhoto(-1)
    } else {
      navigatePhoto(1)
    }
  }

  React.useEffect(() => {
    if (slidesRef.current) {
      syncVisibleSlide(slidesRef.current, currentIndex, open)
    }
  }, [currentIndex, open, syncVisibleSlide])

  React.useEffect(() => {
    const gallery = document.getElementById(galleryId)
    if (!gallery) return

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as Element
      const favorite = target.closest<HTMLElement>('[data-gallery-favorite]')

      if (favorite) {
        event.preventDefault()
        toggleFavorite(favorite.dataset.filename ?? '')
        return
      }

      const opener = target.closest<HTMLAnchorElement>('[data-gallery-open]')

      if (opener) {
        event.preventDefault()
        lastFocusedRef.current = opener
        const index = Number(opener.dataset.galleryOpen ?? 0)
        lastFocusedIndexRef.current = index
        showSlide(index, false)
        updatePhotoUrl(index, 'push')
        setOpen(true)
        return
      }

      const download = target.closest<HTMLAnchorElement>(
        '[data-gallery-download-file]',
      )
      if (!download) return

      event.preventDefault()
      const filename =
        download.dataset.filename || download.download || 'photograph.jpg'
      download.setAttribute('aria-busy', 'true')
      await startDownload({
        kind: 'file',
        url: download.href,
        filename,
      })
      download.removeAttribute('aria-busy')
    }

    gallery.addEventListener('click', handleClick)
    const showSearchResults = () => setFavoritesOnly(false)
    const downloadMatches = (event: Event) => {
      const filenames = new Set((event as CustomEvent<string[]>).detail ?? [])
      const matched = images.filter((image) => filenames.has(image.filename))
      if (matched.length === 0) return
      void startDownload({
        kind: 'selection',
        images: matched,
        filename: `${projectSlug}-matches.zip`,
      })
    }
    gallery.addEventListener('gallery:search-results', showSearchResults)
    gallery.addEventListener('gallery:download-matches', downloadMatches)
    return () => {
      gallery.removeEventListener('click', handleClick)
      gallery.removeEventListener('gallery:search-results', showSearchResults)
      gallery.removeEventListener('gallery:download-matches', downloadMatches)
    }
  }, [
    galleryId,
    images,
    projectSlug,
    showSlide,
    startDownload,
    toggleFavorite,
    updatePhotoUrl,
  ])

  React.useEffect(() => {
    const syncFromUrl = () => {
      const index = getPhotoIndexFromUrl()
      if (index === null) {
        setOpen(false)
        return
      }

      showSlide(index, false)
      setOpen(true)
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [getPhotoIndexFromUrl, showSlide])

  const currentImage = images[currentIndex]
  const currentImageSelected = currentImage
    ? selected.has(currentImage.filename)
    : false
  const selectedImages = images.filter((image) => selected.has(image.filename))

  async function createSelectionZip(request: DownloadRequest) {
    if (request.kind !== 'selection') return
    const selectionImages = request.images

    async function* files() {
      for (const [index, image] of selectionImages.entries()) {
        setDownloadLabel(
          `Preparing photo ${index + 1} of ${selectionImages.length}`,
        )
        setDownloadProgress(Math.round((index / selectionImages.length) * 100))
        const response = await fetch(image.src, { mode: 'cors' })
        if (!response.ok) {
          throw new Error(`Unable to download ${image.filename}`)
        }
        yield { input: response, name: image.filename }
      }
    }

    // shortcut: ZIPs use browser memory; prebuild archives when galleries outgrow device memory.
    const blob = await downloadZip(files()).blob()
    setDownloadProgress(100)
    saveBlob(blob, request.filename)
  }

  async function startDownload(request: DownloadRequest) {
    if (request.kind === 'file') {
      sameOriginDownload(request.url, request.filename)
      return
    }

    setPendingDownload(request)
    setDownloadDialogOpen(true)
    setDownloadStatus('preparing')
    setDownloadProgress(0)
    setDownloadError('')
    setDownloadLabel(`Preparing ${request.images.length} photos`)
    setOpen(false)

    try {
      await createSelectionZip(request)
      setDownloadProgress(100)
      setDownloadStatus('complete')
      setDownloadDialogOpen(false)
      toast.success('Your download is starting')
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? `${error.message} Try again, or save one photo from the viewer.`
          : 'Unable to prepare the ZIP. Try again, or save one photo from the viewer.',
      )
      setDownloadStatus('error')
    }
  }

  const shareCurrentPhoto = async () => {
    if (!currentImage) return

    const url = new URL(
      `/galleries/${projectSlug}/photo/${currentIndex + 1}/`,
      window.location.origin,
    )
    const title = `${projectTitle} — Photograph ${currentIndex + 1} of ${images.length}`
    const text = `${currentImage.alt}. View this photograph from ${projectTitle}.`
    if (shareToken) url.searchParams.set('share', shareToken)
    const shareData = { title, text, url: url.toString() }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.url)
      toast.success('Photo link copied')
    } catch {
      toast.error('Unable to copy the photo link')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {selected.size > 0 && (
          <div
            ref={selectionBarRef}
            data-gallery-selection-bar
            role="region"
            aria-label="Selected photos"
            className="bg-background text-foreground fixed bottom-4 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border p-3 shadow-lg"
          >
            <div className="mr-auto flex flex-col gap-1">
              <span
                role="status"
                aria-atomic="true"
                className="text-sm font-semibold"
              >
                {selected.size} selected
              </span>
              <span className="text-muted-foreground text-xs">
                Saved on this device
              </span>
            </div>
            <Button
              size="lg"
              variant={favoritesOnly ? 'default' : 'outline'}
              data-gallery-toggle-favorites
              aria-pressed={favoritesOnly}
              onClick={toggleFavoritesView}
              disabled={downloadStatus === 'preparing'}
            >
              <Heart data-icon="inline-start" aria-hidden="true" />
              Favorites ({selected.size})
            </Button>
            <Button
              size="lg"
              disabled={downloadStatus === 'preparing'}
              onClick={() =>
                startDownload({
                  kind: 'selection',
                  images: selectedImages,
                  filename: `${projectSlug}-selection.zip`,
                })
              }
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              Download selected ({selected.size})
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={downloadStatus === 'preparing'}
              onClick={() => {
                document
                  .getElementById(galleryId)
                  ?.querySelector<HTMLElement>('[data-gallery-controls] button')
                  ?.focus()
                setSelected(new Set())
              }}
            >
              Clear
            </Button>
          </div>
        )}
        {images.length > 0 && (
          <Button
            size="lg"
            variant={selected.size > 0 ? 'outline' : 'default'}
            onClick={() =>
              startDownload(
                downloadAllUrl
                  ? {
                      kind: 'file',
                      url: downloadAllUrl,
                      filename: `${projectSlug}.zip`,
                    }
                  : {
                      kind: 'selection',
                      images,
                      filename: `${projectSlug}.zip`,
                    },
              )
            }
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Download ZIP
          </Button>
        )}
      </div>

      {downloadStatus === 'complete' && (
        <a
          href={tipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Support my work (optional)
        </a>
      )}

      <Toaster position="bottom-center" />

      <Dialog
        open={open}
        onOpenChange={handleOpenChange}
        disablePointerDismissal
      >
        <DialogContent
          showCloseButton={false}
          className="gallery-viewer bg-background text-foreground left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 flex-col gap-0 rounded-none p-0 shadow-none ring-0 sm:max-w-none"
          finalFocus={() => getLastFocusedOpener() ?? true}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') navigatePhoto(-1)
            if (event.key === 'ArrowRight') navigatePhoto(1)
          }}
        >
          <DialogTitle className="sr-only">
            {heading} photograph viewer
          </DialogTitle>
          <DialogDescription className="sr-only">
            Use the previous and next buttons, the left and right arrow keys, or
            swipe to browse the gallery.
          </DialogDescription>

          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="gallery-viewer-toolbar flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
              <p className="mr-auto text-sm font-semibold" aria-live="polite">
                {favoritesOnly && selected.has(images[currentIndex]?.filename)
                  ? `Favorite ${visibleIndexes.indexOf(currentIndex) + 1} of ${visibleIndexes.length}`
                  : `Photograph ${currentIndex + 1} of ${images.length}`}
              </p>
              <div className="flex max-w-full flex-wrap items-center gap-2">
                {currentImage && (
                  <>
                    <Button
                      variant={currentImageSelected ? 'default' : 'secondary'}
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => toggleFavorite(currentImage.filename)}
                      aria-label={
                        currentImageSelected
                          ? `Remove photograph ${currentIndex + 1} from favorites`
                          : `Add photograph ${currentIndex + 1} to favorites`
                      }
                      aria-pressed={currentImageSelected}
                    >
                      <Heart
                        className={currentImageSelected ? 'fill-current' : ''}
                        aria-hidden="true"
                      />
                    </Button>
                    <a
                      className={cn(
                        buttonVariants({ variant: 'secondary' }),
                        'min-h-11',
                      )}
                      href={downloadUrl(
                        currentImage.src,
                        currentImage.filename,
                      )}
                      download={currentImage.filename}
                    >
                      <Download data-icon="inline-start" aria-hidden="true" />
                      <span>Save photo</span>
                    </a>
                    <Button
                      variant="secondary"
                      className="min-h-11"
                      onClick={shareCurrentPhoto}
                    >
                      <Share2 data-icon="inline-start" aria-hidden="true" />
                      <span className="hidden sm:inline">Share</span>
                      <span className="sr-only sm:hidden">Share</span>
                    </Button>
                  </>
                )}
                <DialogClose
                  render={
                    <Button
                      variant="secondary"
                      size="icon"
                      className="min-h-11 min-w-11"
                      aria-label="Close photograph viewer"
                    />
                  }
                >
                  <X aria-hidden="true" />
                </DialogClose>
              </div>
            </div>

            <div
              className="gallery-viewer-stage relative flex min-h-0 flex-1 items-center justify-center pb-16 sm:px-16 sm:py-3"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'pan-y' }}
            >
              <Button
                type="button"
                variant="secondary"
                size="icon-lg"
                className="absolute bottom-2 left-3 min-h-11 min-w-11 sm:bottom-auto sm:left-3"
                onClick={() => navigatePhoto(-1)}
                disabled={navigationDisabled}
                aria-label="Previous photograph"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>

              <div
                ref={setSlidesContainer}
                className="flex h-full min-h-0 w-full items-center justify-center"
              >
                {children}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="icon-lg"
                className="absolute right-3 bottom-2 min-h-11 min-w-11 sm:right-3 sm:bottom-auto"
                onClick={() => navigatePhoto(1)}
                disabled={navigationDisabled}
                aria-label="Next photograph"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={downloadDialogOpen}
        disablePointerDismissal={downloadStatus === 'preparing'}
        onOpenChange={(nextOpen, details) => {
          if (!nextOpen && downloadStatus === 'preparing') {
            details.cancel()
            return
          }
          setDownloadDialogOpen(nextOpen)
        }}
      >
        <DialogContent showCloseButton={downloadStatus !== 'preparing'}>
          {downloadStatus === 'preparing' && (
            <>
              <DialogHeader>
                <DialogTitle>Your download is being prepared</DialogTitle>
                <DialogDescription aria-live="polite">
                  {downloadLabel}
                </DialogDescription>
              </DialogHeader>
              <Progress
                value={downloadProgress}
                aria-label={`Download ${downloadProgress}% complete`}
              />
              <p className="text-muted-foreground text-center text-sm">
                {downloadProgress}% complete
              </p>
              <p className="text-muted-foreground text-center text-sm">
                Keep this page open. Large galleries can take several minutes.
              </p>
            </>
          )}

          {downloadStatus === 'error' && (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle>Download failed</DialogTitle>
                <DialogDescription>{downloadError}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDownloadDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() =>
                    pendingDownload && startDownload(pendingDownload)
                  }
                >
                  Try again
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
