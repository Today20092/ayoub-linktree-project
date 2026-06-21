import * as React from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

type GalleryImage = {
  src: string
  filename: string
  alt: string
}

type EventLightboxProps = {
  galleryId: string
  heading: string
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
  images,
  downloadAllUrl,
  children,
}: EventLightboxProps) {
  const [open, setOpen] = React.useState(false)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const slidesRef = React.useRef<HTMLDivElement>(null)
  const lastFocusedRef = React.useRef<HTMLElement | null>(null)
  const wasOpenRef = React.useRef(false)

  const showSlide = React.useCallback(
    (nextIndex: number) => {
      if (images.length === 0) return
      setCurrentIndex((nextIndex + images.length) % images.length)
    },
    [images.length],
  )

  React.useEffect(() => {
    const slides = slidesRef.current?.querySelectorAll<HTMLElement>(
      '[data-gallery-slide]',
    )
    slides?.forEach((slide, index) => {
      slide.hidden = index !== currentIndex
    })
  }, [currentIndex, open])

  React.useEffect(() => {
    const gallery = document.getElementById(galleryId)
    if (!gallery) return

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as Element
      const opener = target.closest<HTMLAnchorElement>('[data-gallery-open]')

      if (opener) {
        event.preventDefault()
        lastFocusedRef.current = opener
        showSlide(Number(opener.dataset.galleryOpen ?? 0))
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
  }, [galleryId, showSlide])

  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      lastFocusedRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  const currentImage = images[currentIndex]

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

      <Dialog open={open} onOpenChange={setOpen}>
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
                  <Button
                    variant="secondary"
                    onClick={() =>
                      downloadFile(currentImage.src, currentImage.filename)
                    }
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    Download
                  </Button>
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
                ref={slidesRef}
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
