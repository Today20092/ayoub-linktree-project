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

import { Button } from '@/components/ui/button'
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
  const lastFocusedRef = React.useRef<HTMLElement | null>(null)
  const lastFocusedIndexRef = React.useRef<number | null>(null)
  const touchStartX = React.useRef<number | null>(null)
  const touchStartY = React.useRef<number | null>(null)
  const selectionStorageKey = `event-gallery:${projectSlug}:favorites`

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

    const filtering = favoritesOnly && selected.size > 0
    gallery.dataset.galleryFavoritesOnly = String(filtering)
    if (favoritesOnly && selected.size === 0) setFavoritesOnly(false)
    gallery
      .querySelectorAll<HTMLElement>('[data-gallery-filename]')
      .forEach((figure) => {
        figure.dataset.favorite = String(
          selected.has(figure.dataset.galleryFilename ?? ''),
        )
      })
    const favoritesButton = gallery.querySelector<HTMLButtonElement>(
      '[data-gallery-toggle-favorites]',
    )
    const count = gallery.querySelector<HTMLElement>(
      '[data-gallery-favorites-count]',
    )
    if (favoritesButton) {
      favoritesButton.disabled = selected.size === 0
      favoritesButton.textContent = filtering
        ? 'Show all photos'
        : `View favorites (${selected.size})`
      favoritesButton.setAttribute('aria-pressed', String(filtering))
    }
    if (count)
      count.textContent = filtering
        ? `Showing ${selected.size} ${selected.size === 1 ? 'favorite' : 'favorites'}`
        : ''

    gallery
      .querySelectorAll<HTMLElement>('[data-gallery-favorite]')
      .forEach((button) => {
        const isSelected = selected.has(button.dataset.filename ?? '')
        if (button instanceof HTMLButtonElement)
          button.disabled = !selectionLoaded
        button.dataset.selected = String(isSelected)
        button.setAttribute('aria-pressed', String(isSelected))
      })
  }, [galleryId, selected, favoritesOnly, selectionLoaded])

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
    if (lastFocusedIndexRef.current === null) return null

    return document
      .getElementById(galleryId)
      ?.querySelector<HTMLElement>(
        `[data-gallery-open="${lastFocusedIndexRef.current}"]`,
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
      } else {
        url.searchParams.set('photo', String(index + 1))
      }

      window.history[mode === 'push' ? 'pushState' : 'replaceState'](
        window.history.state,
        '',
        url,
      )
    },
    [],
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
      if (target.closest('[data-gallery-toggle-favorites]')) {
        toggleFavoritesView()
        return
      }
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
    gallery.addEventListener('gallery:search-results', showSearchResults)
    return () => {
      gallery.removeEventListener('click', handleClick)
      gallery.removeEventListener('gallery:search-results', showSearchResults)
    }
  }, [galleryId, showSlide, startDownload, toggleFavorite, updatePhotoUrl])

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
        error instanceof Error ? error.message : 'Unable to prepare download',
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
      {selected.size > 0 && (
        <>
          <Button
            size="lg"
            onClick={() =>
              startDownload({
                kind: 'selection',
                images: selectedImages,
                filename: `${projectSlug}-selection.zip`,
              })
            }
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Download favorites ({selected.size})
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setSelected(new Set())}
          >
            Clear favorites
          </Button>
        </>
      )}
      {images.length > 0 && (
        <Button
          size="lg"
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
          Download all
        </Button>
      )}

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

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none bg-black p-0 text-white shadow-none ring-0 sm:max-w-none"
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            const opener = getLastFocusedOpener()
            if (opener) {
              event.preventDefault()
              opener.focus()
            }
          }}
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
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p
                className="w-full text-sm font-semibold sm:w-auto"
                aria-live="polite"
              >
                {favoritesOnly && selected.has(images[currentIndex]?.filename)
                  ? `Favorite ${visibleIndexes.indexOf(currentIndex) + 1} of ${visibleIndexes.length}`
                  : `Photograph ${currentIndex + 1} of ${images.length}`}
              </p>
              <div className="flex items-center gap-2">
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
                    <Button variant="secondary" className="min-h-11" asChild>
                      <a
                        href={downloadUrl(
                          currentImage.src,
                          currentImage.filename,
                        )}
                        download={currentImage.filename}
                      >
                        <Download data-icon="inline-start" aria-hidden="true" />
                        Save photo
                      </a>
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={shareCurrentPhoto}
                      aria-label="Share current photo"
                    >
                      <Share2 aria-hidden="true" />
                    </Button>
                  </>
                )}
                <DialogClose asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label="Close photograph viewer"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </DialogClose>
              </div>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4 sm:px-20"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'pan-y' }}
            >
              <Button
                type="button"
                variant="secondary"
                size="icon-lg"
                className="absolute left-2 sm:left-5"
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
                className="absolute right-2 sm:right-5"
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
        onOpenChange={(nextOpen) => {
          if (downloadStatus !== 'preparing') setDownloadDialogOpen(nextOpen)
        }}
      >
        <DialogContent
          showCloseButton={downloadStatus !== 'preparing'}
          onEscapeKeyDown={(event) => {
            if (downloadStatus === 'preparing') event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (downloadStatus === 'preparing') event.preventDefault()
          }}
        >
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
