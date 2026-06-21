import * as React from 'react'
import { ChevronLeft, ChevronRight, Download, Share2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
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
  children: React.ReactNode
}

async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)

    const objectUrl = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export default function EventLightbox({
  galleryId,
  heading,
  projectSlug,
  projectTitle,
  images,
  downloadAllUrl,
  children,
}: EventLightboxProps) {
  const [open, setOpen] = React.useState(false)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const slidesRef = React.useRef<HTMLDivElement>(null)
  const lastFocusedRef = React.useRef<HTMLElement | null>(null)
  const wasOpenRef = React.useRef(false)

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
      await downloadFile(download.href, filename)
      download.removeAttribute('aria-busy')
    }

    gallery.addEventListener('click', handleClick)
    return () => gallery.removeEventListener('click', handleClick)
  }, [galleryId, showSlide, updatePhotoUrl])

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

  const shareCurrentPhoto = async () => {
    if (!currentImage) return

    const url = new URL(
      `/portfolio/${projectSlug}/photo/${currentIndex + 1}/`,
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
      {downloadAllUrl && (
        <Button asChild size="lg">
          <a href={downloadAllUrl} download>
            <Download data-icon="inline-start" aria-hidden="true" />
            Download all
          </a>
        </Button>
      )}

      <Toaster position="bottom-center" />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none bg-black p-0 text-white shadow-none ring-0 sm:max-w-none"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') showSlide(currentIndex - 1)
            if (event.key === 'ArrowRight') showSlide(currentIndex + 1)
          }}
        >
          <DialogTitle className="sr-only">
            {heading} photograph viewer
          </DialogTitle>
          <DialogDescription className="sr-only">
            Use the previous and next buttons or the left and right arrow keys
            to browse the gallery.
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
                      variant="secondary"
                      size="icon"
                      onClick={shareCurrentPhoto}
                      aria-label={`Share photograph ${currentIndex + 1}`}
                    >
                      <Share2 aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        downloadFile(currentImage.src, currentImage.filename)
                      }
                    >
                      <Download data-icon="inline-start" aria-hidden="true" />
                      Download
                    </Button>
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

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4 sm:px-20">
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
    </>
  )
}
