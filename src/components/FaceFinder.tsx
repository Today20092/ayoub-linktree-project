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

type FaceFinderProps = {
  eventSlug: string
  indexVersion: string
  galleryId: string
}

type DetectedFace = {
  embedding: number[]
  box: [number, number, number, number]
}

type FaceSelection = {
  image: ImageBitmap
  faces: DetectedFace[]
}

type PhotoMatch = {
  filename: string
  score: number
}

function FacePreview({
  image,
  face,
}: {
  image: ImageBitmap
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
  const human = React.useRef<InstanceType<
    (typeof import('@vladmandic/human'))['Human']
  > | null>(null)
  const [consent, setConsent] = React.useState(false)
  const [status, setStatus] = React.useState<
    'idle' | 'loading-model' | 'analyzing' | 'searching' | 'no-match'
  >('idle')
  const [error, setError] = React.useState<string>()
  const [selection, setSelection] = React.useState<FaceSelection>()
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

  async function getHuman() {
    if (human.current) return human.current
    setStatus('loading-model')
    const module = await import('@vladmandic/human')
    const instance = new module.Human({
      backend: 'webgl',
      modelBasePath: '/face-models/',
      cacheSensitivity: 0,
      face: {
        enabled: true,
        detector: { enabled: true, maxDetected: 10, rotation: true },
        mesh: { enabled: true },
        description: { enabled: true },
        emotion: { enabled: false },
        iris: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
    })
    await instance.load()
    await instance.warmup()
    human.current = instance
    return instance
  }

  async function analyze(file?: File) {
    if (!file || !consent) return
    resetGallery()
    setError(undefined)
    setSelection(undefined)

    try {
      const instance = await getHuman()
      setStatus('analyzing')
      const image = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      const result = await instance.detect(image)
      const faces = result.face
        .filter((face) => face.embedding?.length === 1024)
        .map((face) => ({
          embedding: [...(face.embedding ?? [])],
          box: face.box as [number, number, number, number],
        }))

      if (faces.length === 0) {
        image.close()
        setStatus('idle')
        setError('No clear face was found. Try a brighter, front-facing photo.')
        return
      }
      if (faces.length === 1) {
        await searchForFace(faces[0].embedding)
        image.close()
        return
      }
      setSelection({ image, faces })
      setStatus('idle')
    } catch {
      setStatus('idle')
      setError(
        'Face analysis could not start on this device. Try another browser.',
      )
    }
  }

  async function searchForFace(embedding: number[]) {
    setSelection((current) => {
      current?.image.close()
      return undefined
    })
    setStatus('searching')
    setError(undefined)

    try {
      const response = await fetch('/api/faces/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventSlug, indexVersion, embedding }),
      })
      const result = (await response.json()) as {
        matches?: PhotoMatch[]
        error?: string
      }
      if (!response.ok) throw new Error(result.error)
      const nextMatches = result.matches ?? []
      setMatches(nextMatches)
      if (nextMatches.length > 0) showMatches(nextMatches)
      setStatus(nextMatches.length === 0 ? 'no-match' : 'idle')
    } catch (searchError) {
      setStatus('idle')
      setError(
        searchError instanceof Error && searchError.message
          ? searchError.message
          : 'Search is temporarily unavailable.',
      )
    }
  }

  const busy = ['loading-model', 'analyzing', 'searching'].includes(status)

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

      <Field orientation="horizontal">
        <Checkbox
          id="face-search-consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
        />
        <FieldLabel htmlFor="face-search-consent">
          <ShieldCheck aria-hidden="true" />I consent to local face analysis and
          sending a temporary numeric descriptor to search this event. My selfie
          and descriptor are not saved.
        </FieldLabel>
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={!consent || busy}
          onClick={() => cameraInput.current?.click()}
        >
          {busy ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Camera data-icon="inline-start" />
          )}
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
