import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Toaster } from '@/components/ui/sonner'

type GalleryImage = {
  src: string
  filename: string
  alt: string
}

type EventLightboxProps = {
  galleryId: string
  heading: string
  projectSlug: string
  projectTitle: string
  images: GalleryImage[]
  downloadAllUrl?: string
  tipUrl?: string
  children: React.ReactNode
}

type DownloadRequest =
  | { kind: 'file'; url: string; filename: string; label: string }
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

async function downloadFile(
  url: string,
  onProgress: (progress: number) => void,
) {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)

  const total = Number(response.headers.get('content-length'))
  if (!response.body || !total) return response.blob()

  const reader = response.body.getReader()
  const chunks: ArrayBuffer[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value.slice().buffer as ArrayBuffer)
    received += value.length
    onProgress(Math.min(100, Math.round((received / total) * 100)))
  }

  return new Blob(chunks, {
    type: response.headers.get('content-type') ?? 'application/octet-stream',
  })
}

function buildTipUrl(baseUrl: string, amount: number) {
  const url = new URL(baseUrl)
  url.pathname = /\/\d+\/?$/.test(url.pathname)
    ? url.pathname.replace(/\/\d+\/?$/, `/${amount}`)
    : `${url.pathname.replace(/\/$/, '')}/${amount}`
  return url.toString()
}

export default function EventLightbox({
  galleryId,
  heading,
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
  const [selectionLoaded, setSelectionLoaded] = React.useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = React.useState(false)
  const [downloadStatus, setDownloadStatus] =
    React.useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = React.useState(0)
  const [downloadLabel, setDownloadLabel] = React.useState('')
  const [downloadError, setDownloadError] = React.useState('')
  const [pendingDownload, setPendingDownload] =
    React.useState<DownloadRequest | null>(null)
  const [customTip, setCustomTip] = React.useState('')
  const [customTipError, setCustomTipError] = React.useState('')
  const slidesRef = React.useRef<HTMLDivElement>(null)
  const lastFocusedRef = React.useRef<HTMLElement | null>(null)
  const wasOpenRef = React.useRef(false)
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
      window.localStorage.removeItem(selectionStorageKey)
    }

    setSelectionLoaded(true)
  }, [images, selectionStorageKey])

  React.useEffect(() => {
    if (!selectionLoaded) return
    window.localStorage.setItem(
      selectionStorageKey,
      JSON.stringify([...selected]),
    )
  }, [selected, selectionLoaded, selectionStorageKey])

  React.useEffect(() => {
    const gallery = document.getElementById(galleryId)
    if (!gallery) return

    gallery
      .querySelectorAll<HTMLElement>('[data-gallery-favorite]')
      .forEach((button) => {
        const isSelected = selected.has(button.dataset.filename ?? '')
        button.dataset.selected = String(isSelected)
        button.setAttribute('aria-pressed', String(isSelected))
      })
  }, [galleryId, selected])

  const toggleFavorite = React.useCallback((filename: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }, [])

  const syncVisibleSlide = React.useCallback(
    (container: HTMLDivElement, index: number) => {
      const slides = container.querySelectorAll<HTMLElement>(
        '[data-gallery-slide]',
      )
      slides.forEach((slide, slideIndex) => {
        slide.hidden = slideIndex !== index
      })
    },
    [],
  )

  const setSlidesContainer = React.useCallback(
    (container: HTMLDivElement | null) => {
      slidesRef.current = container
      if (container) syncVisibleSlide(container, currentIndex)
    },
    [currentIndex, syncVisibleSlide],
  )

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
      showSlide(currentIndex - 1)
    } else {
      showSlide(currentIndex + 1)
    }
  }

  React.useEffect(() => {
    if (slidesRef.current) {
      syncVisibleSlide(slidesRef.current, currentIndex)
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
        label: filename,
      })
      download.removeAttribute('aria-busy')
    }

    gallery.addEventListener('click', handleClick)
    return () => gallery.removeEventListener('click', handleClick)
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

  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      lastFocusedRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

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

    const blob = await downloadZip(files()).blob()
    setDownloadProgress(100)
    saveBlob(blob, request.filename)
  }

  async function startDownload(request: DownloadRequest) {
    setPendingDownload(request)
    setDownloadDialogOpen(true)
    setDownloadStatus('preparing')
    setDownloadProgress(0)
    setDownloadError('')
    setDownloadLabel(
      request.kind === 'selection'
        ? `Preparing ${request.images.length} selected photos`
        : request.label,
    )
    setOpen(false)

    try {
      if (request.kind === 'selection') {
        await createSelectionZip(request)
      } else {
        const blob = await downloadFile(request.url, setDownloadProgress)
        saveBlob(blob, request.filename)
      }
      setDownloadProgress(100)
      setDownloadStatus('complete')
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : 'Unable to prepare download',
      )
      setDownloadStatus('error')
    }
  }

  const openTip = (amount: number) => {
    window.open(buildTipUrl(tipUrl, amount), '_blank', 'noopener,noreferrer')
  }

  const submitCustomTip = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[1-9]\d*$/.test(customTip)) {
      setCustomTipError('Enter a whole-dollar amount of at least $1.')
      return
    }
    setCustomTipError('')
    openTip(Number(customTip))
  }

  const shareCurrentPhoto = async () => {
    if (!currentImage) return

    const url = new URL(
      `/galleries/${projectSlug}/photo/${currentIndex + 1}/`,
      window.location.origin,
    )
    const title = `${projectTitle} — Photograph ${currentIndex + 1} of ${images.length}`
    const text = `${currentImage.alt}. View this photograph from ${projectTitle}.`
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
            Download selected ({selected.size})
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </>
      )}
      {downloadAllUrl && (
        <Button
          size="lg"
          onClick={() =>
            startDownload({
              kind: 'file',
              url: downloadAllUrl,
              filename: `${projectSlug}.zip`,
              label: `Downloading all ${images.length} photos`,
            })
          }
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Download all
        </Button>
      )}

      <Toaster position="bottom-center" />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none bg-black p-0 text-white shadow-none ring-0 sm:max-w-none"
          onInteractOutside={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') showSlide(currentIndex - 1)
            if (event.key === 'ArrowRight') showSlide(currentIndex + 1)
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
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="text-sm font-semibold" aria-live="polite">
                Photograph {currentIndex + 1} of {images.length}
              </p>
              <div className="flex items-center gap-2">
                {currentImage && (
                  <>
                    <Button
                      variant={currentImageSelected ? 'default' : 'secondary'}
                      size="icon"
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
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={shareCurrentPhoto}>
                            <Share2 aria-hidden="true" />
                            Share current photo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              startDownload({
                                kind: 'file',
                                url: currentImage.src,
                                filename: currentImage.filename,
                                label: currentImage.filename,
                              })
                            }
                          >
                            <Download aria-hidden="true" />
                            Download current photo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={selected.size === 0}
                            onSelect={() =>
                              startDownload({
                                kind: 'selection',
                                images: selectedImages,
                                filename: `${projectSlug}-selection.zip`,
                              })
                            }
                          >
                            <Download aria-hidden="true" />
                            Download favorites ({selected.size})
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <DialogClose asChild>
                  <Button
                    variant="secondary"
                    size="icon"
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
                onClick={() => showSlide(currentIndex - 1)}
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
                onClick={() => showSlide(currentIndex + 1)}
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
            </>
          )}

          {downloadStatus === 'complete' && (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle>Thank you for viewing the photos</DialogTitle>
                <DialogDescription>
                  Your download is starting. If you enjoyed the gallery, please
                  consider leaving a tip on Ko-fi.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    onClick={() => openTip(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <form noValidate onSubmit={submitCustomTip}>
                <Field data-invalid={Boolean(customTipError)}>
                  <FieldLabel htmlFor="custom-tip">
                    Custom tip amount
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="custom-tip"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={customTip}
                      onChange={(event) => setCustomTip(event.target.value)}
                      placeholder="Amount in dollars"
                      aria-invalid={Boolean(customTipError)}
                    />
                    <Button type="submit">
                      <Coffee data-icon="inline-start" aria-hidden="true" />
                      Tip
                    </Button>
                  </div>
                  <FieldError>{customTipError}</FieldError>
                </Field>
              </form>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDownloadDialogOpen(false)}
                >
                  No thanks
                </Button>
              </DialogFooter>
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
