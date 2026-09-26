import * as React from 'react'
import {
  Camera,
  CircleAlert,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  createBrowserFaceAnalyzer,
  FaceTimeoutError,
  type DetectedFace,
  type FaceAnalysis,
  type FaceImage,
} from '@/lib/face-client'

const SEARCH_TIMEOUT = 15_000

type FaceFinderProps = {
  eventSlug: string
  indexVersion: string
  galleryId: string
}

type PhotoMatch = {
  filename: string
  score: number
}

function FacePreview({
  image,
  face,
}: {
  image: FaceImage
  face: DetectedFace
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const [x, y, width, height] = face.box
    const padding = Math.max(width, height) * 0.25
    context.drawImage(
      image,
      Math.max(0, x - padding),
      Math.max(0, y - padding),
      Math.min(image.width - x, width + padding * 2),
      Math.min(image.height - y, height + padding * 2),
      0,
      0,
      canvas.width,
      canvas.height,
    )
  }, [face, image])

  return (
    <canvas
      ref={ref}
      width="96"
      height="96"
      className="bg-muted size-20 rounded-xl object-cover"
      aria-hidden="true"
    />
  )
}

export default function FaceFinder({
  eventSlug,
  indexVersion,
  galleryId,
}: FaceFinderProps) {
  const cameraInput = React.useRef<HTMLInputElement>(null)
  const uploadInput = React.useRef<HTMLInputElement>(null)
  const originalFigures = React.useRef<HTMLElement[]>([])
  const [analyzer] = React.useState(createBrowserFaceAnalyzer)
  const selectionRef = React.useRef<FaceAnalysis | undefined>(undefined)
  const searchAttempt = React.useRef(0)
  const [consent, setConsent] = React.useState(false)
  const [status, setStatus] = React.useState<
    'idle' | 'loading-model' | 'analyzing' | 'searching' | 'no-match'
  >('idle')
  const [error, setError] = React.useState<string>()
  const [selection, setSelection] = React.useState<FaceAnalysis>()
  const [matches, setMatches] = React.useState<PhotoMatch[]>([])

  const resetGallery = React.useCallback(() => {
    const grid = document
      .getElementById(galleryId)
      ?.querySelector<HTMLElement>('[data-gallery-grid]')
    if (!grid) return

    originalFigures.current.forEach((figure) => {
      figure.hidden = false
      const badge = figure.querySelector<HTMLElement>('[data-face-rank]')
      if (badge) badge.hidden = true
      grid.appendChild(figure)
    })
    setMatches([])
  }, [galleryId])

  const showMatches = React.useCallback(
    (nextMatches: PhotoMatch[]) => {
      const gallery = document.getElementById(galleryId)
      const grid = gallery?.querySelector<HTMLElement>('[data-gallery-grid]')
      if (!gallery || !grid) return

      const figures = [
        ...gallery.querySelectorAll<HTMLElement>('[data-gallery-filename]'),
      ]
      if (originalFigures.current.length === 0) {
        originalFigures.current = figures
      }
      const rank = new Map(
        nextMatches.map((match, index) => [match.filename, index]),
      )

      figures
        .sort(
          (left, right) =>
            (rank.get(left.dataset.galleryFilename ?? '') ?? Infinity) -
            (rank.get(right.dataset.galleryFilename ?? '') ?? Infinity),
        )
        .forEach((figure) => {
          const matchIndex = rank.get(figure.dataset.galleryFilename ?? '')
          const badge = figure.querySelector<HTMLElement>('[data-face-rank]')
          figure.hidden = matchIndex === undefined
          if (badge) {
            badge.hidden = matchIndex === undefined
            badge.textContent =
              matchIndex === undefined ? '' : `Match ${matchIndex + 1}`
          }
          grid.appendChild(figure)
        })

      gallery.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [galleryId],
  )

  const clearSelection = React.useCallback(() => {
    analyzer.cancel(selectionRef.current)
    selectionRef.current = undefined
    setSelection(undefined)
  }, [analyzer])

  async function prepareModel() {
    setError(undefined)
    setStatus('loading-model')

    try {
      if (await analyzer.prepare()) setStatus('idle')
    } catch (modelError) {
      setStatus('idle')
      setError(
        modelError instanceof FaceTimeoutError
          ? `${modelError.message} Try again or use another browser.`
          : 'Face recognition could not start on this device. Try again or use another browser.',
      )
    }
  }

  async function analyze(file?: File) {
    if (!file || !consent) return
    const currentSearchAttempt = ++searchAttempt.current
    resetGallery()
    setError(undefined)
    clearSelection()

    try {
      setStatus('analyzing')
      const result = await analyzer.analyze(file)
      if (!result) return

      if (result.faces.length === 0) {
        analyzer.cancel(result)
        setStatus('idle')
        setError('No clear face was found. Try a brighter, front-facing photo.')
        return
      }
      if (result.faces.length === 1) {
        await searchForFace(result.faces[0].embedding, currentSearchAttempt)
        analyzer.cancel(result)
        return
      }
      selectionRef.current = result
      setSelection(result)
      setStatus('idle')
    } catch (analysisError) {
      setStatus('idle')
      setError(
        analysisError instanceof FaceTimeoutError
          ? `${analysisError.message} Try again with a smaller photo.`
          : analysisError instanceof DOMException &&
              ['EncodingError', 'NotSupportedError'].includes(
                analysisError.name,
              )
            ? 'This photo format could not be opened. Try a JPEG, PNG, or WebP photo.'
            : 'Face analysis could not start. Check your connection and try the photo again.',
      )
    }
  }

  async function searchForFace(
    embedding: number[],
    currentAttempt = ++searchAttempt.current,
  ) {
    clearSelection()
    setStatus('searching')
    setError(undefined)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)

    try {
      const response = await fetch('/api/faces/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventSlug, indexVersion, embedding }),
        signal: controller.signal,
      })
      const result = (await response.json()) as {
        matches?: PhotoMatch[]
        error?: string
      }
      if (searchAttempt.current !== currentAttempt) return
      if (!response.ok) throw new Error(result.error)
      const nextMatches = result.matches ?? []
      setMatches(nextMatches)
      if (nextMatches.length > 0) showMatches(nextMatches)
      setStatus(nextMatches.length === 0 ? 'no-match' : 'idle')
    } catch (searchError) {
      if (searchAttempt.current !== currentAttempt) return
      setStatus('idle')
      setError(
        controller.signal.aborted
          ? 'Gallery search took too long. Check your connection and try again.'
          : searchError instanceof Error && searchError.message
            ? searchError.message
            : 'Search is temporarily unavailable.',
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  React.useEffect(
    () => () => {
      analyzer.cancel(selectionRef.current)
    },
    [analyzer],
  )

  const busy = ['loading-model', 'analyzing', 'searching'].includes(status)
  const statusMessage = {
    'loading-model': 'Preparing face recognition',
    analyzing: 'Analyzing your photo',
    searching: 'Searching the gallery',
  }[status]

  return (
    <section className="border-border mt-10 flex flex-col gap-5 border-y py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Search aria-hidden="true" />
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            Find your photos
          </h2>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm leading-6">
          Take or upload a selfie. The closest gallery photos appear below with
          the strongest matches first.
        </p>
      </div>

      <Field
        orientation="horizontal"
        className="min-h-12 cursor-pointer items-start rounded-xl py-2"
      >
        <Checkbox
          id="face-search-consent"
          className="mt-0.5 size-6"
          checked={consent}
          onCheckedChange={(checked) => {
            const nextConsent = checked === true
            setConsent(nextConsent)
            if (nextConsent) {
              void prepareModel()
            } else {
              searchAttempt.current += 1
              clearSelection()
              setStatus('idle')
              setError(undefined)
            }
          }}
        />
        <FieldLabel
          htmlFor="face-search-consent"
          className="cursor-pointer items-start text-sm leading-6"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" />I
          consent to local face analysis and sending a temporary numeric
          descriptor to search this event. My selfie and descriptor are not
          saved.
        </FieldLabel>
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={!consent || busy}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera data-icon="inline-start" />
          Take a selfie
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!consent || busy}
          onClick={() => uploadInput.current?.click()}
        >
          <Upload data-icon="inline-start" />
          Upload a photo
        </Button>
        {matches.length > 0 && (
          <Button type="button" variant="ghost" onClick={resetGallery}>
            <RotateCcw data-icon="inline-start" />
            Show all photos
          </Button>
        )}
      </div>

      {statusMessage && (
        <Alert role="status" aria-live="polite">
          <Spinner />
          <AlertTitle>{statusMessage}</AlertTitle>
          <AlertDescription>
            Keep this page open. This can take a moment on the first photo.
          </AlertDescription>
        </Alert>
      )}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(event) => {
          void analyze(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void analyze(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />

      {selection && (
        <div
          className="flex flex-col gap-3"
          role="group"
          aria-label="Choose your face"
        >
          <p className="text-sm font-medium">Which face is yours?</p>
          <div className="flex flex-wrap gap-3">
            {selection.faces.map((face, index) => (
              <Button
                key={`${face.box.join('-')}-${index}`}
                type="button"
                variant="outline"
                className="h-auto flex-col"
                onClick={() => void searchForFace(face.embedding)}
              >
                <FacePreview image={selection.image} face={face} />
                Face {index + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

      {matches.length > 0 && (
        <Alert>
          <Search aria-hidden="true" />
          <AlertTitle>
            Found {matches.length}{' '}
            {matches.length === 1 ? 'possible photo' : 'possible photos'}
          </AlertTitle>
          <AlertDescription>
            Results are possible matches, not confirmed identities.
          </AlertDescription>
        </Alert>
      )}

      {status === 'no-match' && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No likely photos found</EmptyTitle>
            <EmptyDescription>
              Try another well-lit photo with your face looking toward the
              camera.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Face search unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  )
}
