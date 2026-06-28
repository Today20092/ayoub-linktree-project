import * as React from 'react'
import {
  Camera,
  CircleAlert,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  Users,
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
import type { FaceCluster } from '@/lib/face-manifests'

type FaceFinderProps = {
  eventSlug: string
  indexVersion: string
  galleryId: string
  clusters: FaceCluster[]
}

type DetectedFace = {
  embedding: number[]
  box: [number, number, number, number]
}

type FaceSelection = {
  image: ImageBitmap
  faces: DetectedFace[]
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
  clusters,
}: FaceFinderProps) {
  const cameraInput = React.useRef<HTMLInputElement>(null)
  const uploadInput = React.useRef<HTMLInputElement>(null)
  const human = React.useRef<InstanceType<
    (typeof import('@vladmandic/human'))['Human']
  > | null>(null)
  const [consent, setConsent] = React.useState(false)
  const [status, setStatus] = React.useState<
    'idle' | 'loading-model' | 'analyzing' | 'searching' | 'no-match'
  >('idle')
  const [error, setError] = React.useState<string>()
  const [selection, setSelection] = React.useState<FaceSelection>()
  const [candidates, setCandidates] = React.useState<
    Array<{ clusterId: string; score: number }>
  >([])
  const [activeCluster, setActiveCluster] = React.useState<string>()

  const filterGallery = React.useCallback(
    (clusterId?: string) => {
      const cluster = clusters.find((item) => item.id === clusterId)
      const filenames = cluster ? new Set(cluster.filenames) : null
      document
        .getElementById(galleryId)
        ?.querySelectorAll<HTMLElement>('[data-gallery-filename]')
        .forEach((item) => {
          item.hidden =
            filenames !== null &&
            !filenames.has(item.dataset.galleryFilename ?? '')
        })
      setActiveCluster(clusterId)
      if (cluster) {
        document
          .getElementById(galleryId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [clusters, galleryId],
  )

  React.useEffect(() => {
    const handleFaceCard = (event: Event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-face-cluster]',
      )
      if (target?.dataset.faceCluster) filterGallery(target.dataset.faceCluster)
    }
    document.addEventListener('click', handleFaceCard)
    return () => document.removeEventListener('click', handleFaceCard)
  }, [filterGallery])

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
    setError(undefined)
    setCandidates([])
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
        candidates?: Array<{ clusterId: string; score: number }>
        error?: string
      }
      if (!response.ok) throw new Error(result.error)
      const nextCandidates = result.candidates ?? []
      setCandidates(nextCandidates)
      setStatus(nextCandidates.length === 0 ? 'no-match' : 'idle')
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
          Choose a face below, or use a selfie to find the closest matches. Your
          selfie stays on this device and is not saved.
        </p>
      </div>

      <Field orientation="horizontal">
        <Checkbox
          id="face-search-consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
        />
        <FieldLabel htmlFor="face-search-consent">
          <ShieldCheck aria-hidden="true" />I consent to this event using an
          anonymous face descriptor to search its retained gallery index.
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
        {activeCluster && (
          <Button type="button" variant="ghost" onClick={() => filterGallery()}>
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
        onChange={(event) => void analyze(event.target.files?.[0])}
      />
      <input
        ref={uploadInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void analyze(event.target.files?.[0])}
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

      {candidates.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Select your closest match</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map(({ clusterId }, index) => {
              const cluster = clusters.find((item) => item.id === clusterId)
              return (
                <Button
                  key={clusterId}
                  type="button"
                  variant={index === 0 ? 'default' : 'outline'}
                  onClick={() => filterGallery(clusterId)}
                >
                  <Users data-icon="inline-start" />
                  Match {index + 1}
                  {cluster ? ` · ${cluster.filenames.length} photos` : ''}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {status === 'no-match' && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No confident match found</EmptyTitle>
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
