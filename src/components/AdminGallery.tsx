import * as React from 'react'
import {
  Check,
  Copy,
  EyeOff,
  ImagePlus,
  Link,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  GalleryInvite,
  GalleryPhoto,
  GallerySettings,
  GuestPhoto,
} from '@/lib/gallery-data'

type ProfessionalPhoto = {
  src: string
  alt: string
  filename: string
  hidden: boolean
}

type AdminGalleryProps = {
  eventSlug: string
  eventMeta: {
    title: string
    summary: string
    category: string
    eventDate: string
    eventTime: string
    eventVenue: string
    comingSoon: boolean
  }
  settings: GallerySettings | null
  guests: GuestPhoto[]
  uploadedPhotos: GalleryPhoto[]
  invites: GalleryInvite[]
  professional: ProfessionalPhoto[]
}

type Action =
  | {
      action: 'updateEvent'
      title: string
      summary: string
      category: string
      eventDate: string
      eventTime: string
      eventVenue: string
      comingSoon: boolean
    }
  | {
      action: 'settings'
      uploadsEnabled: boolean
      password?: string
    }
  | {
      action: 'approveGuest' | 'rejectGuest' | 'removeGuest'
      photoId: string
    }
  | {
      action: 'hideProfessional' | 'restoreProfessional'
      filename: string
    }

function PhotoTile({
  src,
  alt,
  label,
  selected,
  onSelect,
  onOpen,
}: {
  src: string
  alt: string
  label: string
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}) {
  return (
    <article className="border-border bg-card group relative overflow-hidden rounded-xl border">
      <button
        type="button"
        className="bg-muted block aspect-[4/3] w-full bg-cover bg-center text-left"
        style={{ backgroundImage: `url("${src}")` }}
        onClick={onOpen}
        aria-label={`Open ${alt || label} full screen`}
      />
      <button
        type="button"
        className="hover:text-primary block w-full truncate p-3 text-left text-xs font-medium"
        onClick={onOpen}
      >
        {label}
      </button>
      <input
        type="checkbox"
        className="accent-primary absolute top-3 left-3 size-5"
        checked={selected}
        onChange={onSelect}
        aria-label={`Select ${label}`}
      />
    </article>
  )
}

type ReviewPhoto = {
  key: string
  src: string
  alt: string
  label: string
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json()
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error
    }
  } catch {
    // Status fallback covers non-JSON responses.
  }
  return `Request failed with status ${response.status}.`
}

export default function AdminGallery({
  eventSlug,
  eventMeta,
  settings,
  guests,
  uploadedPhotos,
  invites,
  professional,
}: AdminGalleryProps) {
  const [selected, setSelected] = React.useState(new Set<string>())
  const [uploadsEnabled, setUploadsEnabled] = React.useState(
    Boolean(settings?.uploads_enabled),
  )
  const [password, setPassword] = React.useState('')
  const [meta, setMeta] = React.useState(eventMeta)
  const [guestName, setGuestName] = React.useState('')
  const [inviteList, setInviteList] = React.useState(invites)
  const [origin, setOrigin] = React.useState('')
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([])
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')
  const [reviewKey, setReviewKey] = React.useState<string | null>(null)
  const [hiddenFilenames, setHiddenFilenames] = React.useState(
    () =>
      new Set(
        professional
          .filter(({ hidden }) => hidden)
          .map(({ filename }) => filename),
      ),
  )

  const pendingGuests = guests.filter(({ status }) => status === 'pending')
  const publishedGuests = guests.filter(({ status }) => status === 'published')
  const visibleProfessional = professional.filter(
    ({ filename }) => !hiddenFilenames.has(filename),
  )
  const hiddenProfessional = professional.filter(({ filename }) =>
    hiddenFilenames.has(filename),
  )
  const reviewPhotos = React.useMemo<ReviewPhoto[]>(
    () => [
      ...pendingGuests.map((photo) => ({
        key: `pending:${photo.id}`,
        src: `/api/admin/galleries/${eventSlug}?photo=${photo.id}`,
        alt: photo.alt,
        label: photo.original_filename,
      })),
      ...publishedGuests.map((photo) => ({
        key: `published:${photo.id}`,
        src: `/api/admin/galleries/${eventSlug}?photo=${photo.id}`,
        alt: photo.alt,
        label: photo.original_filename,
      })),
      ...uploadedPhotos.map((photo) => ({
        key: `uploaded:${photo.id}`,
        src: `https://photos.ayoubabed.xyz/${photo.object_key}`,
        alt: photo.alt,
        label: photo.uploader_name
          ? `${photo.original_filename} by ${photo.uploader_name}`
          : photo.original_filename,
      })),
      ...visibleProfessional.map((photo) => ({
        key: `professional:${photo.filename}`,
        src: photo.src,
        alt: photo.alt,
        label: photo.filename,
      })),
      ...hiddenProfessional.map((photo) => ({
        key: `hidden:${photo.filename}`,
        src: photo.src,
        alt: photo.alt,
        label: photo.filename,
      })),
    ],
    [
      eventSlug,
      hiddenProfessional,
      pendingGuests,
      publishedGuests,
      uploadedPhotos,
      visibleProfessional,
    ],
  )
  const reviewIndex = reviewPhotos.findIndex((photo) => photo.key === reviewKey)
  const reviewPhoto = reviewIndex >= 0 ? reviewPhotos[reviewIndex] : null

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  React.useEffect(() => {
    if (!reviewPhoto) return

    function move(offset: number) {
      setReviewKey((currentKey) => {
        const currentIndex = reviewPhotos.findIndex(
          (photo) => photo.key === currentKey,
        )
        const start = currentIndex >= 0 ? currentIndex : 0
        return (
          reviewPhotos[
            (start + offset + reviewPhotos.length) % reviewPhotos.length
          ]?.key ?? currentKey
        )
      })
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setReviewKey(null)
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reviewPhoto, reviewPhotos])

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function send(action: Action) {
    const response = await fetch(`/api/admin/galleries/${eventSlug}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(action),
    })
    if (!response.ok) {
      const body: unknown = await response.json()
      throw new Error(
        body &&
          typeof body === 'object' &&
          'error' in body &&
          typeof body.error === 'string'
          ? body.error
          : `Request failed with status ${response.status}.`,
      )
    }
  }

  async function run(actions: Action[], success: string) {
    if (!actions.length) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      for (const action of actions) await send(action)
      setSelected(new Set())
      setMessage(success)
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed.')
    } finally {
      setPending(false)
    }
  }

  async function runInPlace(
    actions: Action[],
    success: string,
    afterSuccess: () => void,
  ) {
    if (!actions.length) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      for (const action of actions) await send(action)
      setSelected(new Set())
      setMessage(success)
      afterSuccess()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed.')
    } finally {
      setPending(false)
    }
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(
      [
        {
          action: 'updateEvent',
          title: meta.title,
          summary: meta.summary,
          category: meta.category,
          eventDate: meta.eventDate,
          eventTime: meta.eventTime,
          eventVenue: meta.eventVenue,
          comingSoon: meta.comingSoon,
        },
      ],
      'Event details saved.',
    )
  }

  async function uploadAdminPhotos(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!uploadFiles.length) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      for (const file of uploadFiles) {
        const formData = new FormData()
        formData.set('action', 'uploadAdminPhoto')
        formData.set('photo', file)
        const response = await fetch(`/api/admin/galleries/${eventSlug}`, {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) throw new Error(await responseError(response))
      }
      setMessage('Photos uploaded.')
      window.location.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.')
    } finally {
      setPending(false)
    }
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!guestName.trim()) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/galleries/${eventSlug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'createInvite', guestName }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const body = (await response.json()) as { token: string }
      const invite = {
        token: body.token,
        event_slug: eventSlug,
        guest_name: guestName.trim(),
        created_at: Math.floor(Date.now() / 1000),
        last_used_at: null,
      }
      setInviteList((current) => [invite, ...current])
      setGuestName('')
      setMessage('Guest invite created.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invite failed.')
    } finally {
      setPending(false)
    }
  }

  function confirmAndRun(actions: Action[], prompt: string, success: string) {
    if (actions.length && window.confirm(prompt)) {
      void run(actions, success)
    }
  }

  function selectedActions(prefix: string, build: (value: string) => Action) {
    return [...selected]
      .filter((key) => key.startsWith(`${prefix}:`))
      .map((key) => build(key.slice(prefix.length + 1)))
  }

  function moveReview(offset: number) {
    if (!reviewPhotos.length) return
    const start = reviewIndex >= 0 ? reviewIndex : 0
    setReviewKey(
      reviewPhotos[(start + offset + reviewPhotos.length) % reviewPhotos.length]
        .key,
    )
  }

  function adjacentReviewKey() {
    if (reviewPhotos.length < 2) return null
    const start = reviewIndex >= 0 ? reviewIndex : 0
    return reviewPhotos[(start + 1) % reviewPhotos.length].key
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <p
          className={error ? 'text-destructive text-sm' : 'text-sm font-medium'}
          role="status"
        >
          {error || message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>
            These details power the public gallery and coming-soon view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={saveEvent}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-title">Name</Label>
                <Input
                  id="event-title"
                  value={meta.title}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-category">Category</Label>
                <Input
                  id="event-category"
                  value={meta.category}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-summary">About information</Label>
              <Textarea
                id="event-summary"
                rows={4}
                value={meta.summary}
                onChange={(event) =>
                  setMeta((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={meta.eventDate}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      eventDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  value={meta.eventTime}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      eventTime: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-venue">Venue</Label>
                <Input
                  id="event-venue"
                  value={meta.eventVenue}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      eventVenue: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={meta.comingSoon}
                onChange={(event) =>
                  setMeta((current) => ({
                    ...current,
                    comingSoon: event.target.checked,
                  }))
                }
              />
              Keep public photos hidden as coming soon
            </label>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
              )}
              Save event
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload photographer photos</CardTitle>
            <CardDescription>
              Photos are resized to 2400px and stored in the public R2 bucket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={uploadAdminPhotos}>
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                onChange={(event) =>
                  setUploadFiles([...(event.target.files ?? [])])
                }
              />
              <Button type="submit" disabled={pending || !uploadFiles.length}>
                <ImagePlus data-icon="inline-start" aria-hidden="true" />
                Upload {uploadFiles.length || ''} photos
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guest invite links</CardTitle>
            <CardDescription>
              Each link uploads without a password and tracks the guest name.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="flex gap-2" onSubmit={createInvite}>
              <Input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Guest name"
                maxLength={120}
              />
              <Button type="submit" disabled={pending || !guestName.trim()}>
                <Link data-icon="inline-start" aria-hidden="true" />
                Create
              </Button>
            </form>
            <div className="grid gap-2">
              {inviteList.map((invite) => {
                const url = `${origin}/galleries/${eventSlug}/upload/${invite.token}/`
                return (
                  <div
                    key={invite.token}
                    className="border-border grid gap-2 rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{invite.guest_name}</p>
                    <code className="bg-muted truncate rounded-md px-2 py-1 text-xs">
                      {url}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void navigator.clipboard.writeText(url)}
                    >
                      <Copy data-icon="inline-start" aria-hidden="true" />
                      Copy link
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guest upload access</CardTitle>
          <CardDescription>
            Enable submissions and set or rotate the shared event password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                [
                  {
                    action: 'settings',
                    uploadsEnabled,
                    password: password || undefined,
                  },
                ],
                'Upload settings saved.',
              )
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-gallery-password">
                {settings?.password_hash
                  ? 'New password (leave blank to keep current)'
                  : 'Upload password'}
              </Label>
              <Input
                id="new-gallery-password"
                type="password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  checked={uploadsEnabled}
                  onChange={(event) => setUploadsEnabled(event.target.checked)}
                />
                Accept guest uploads
              </label>
            </div>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
              )}
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="pending-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge>{pendingGuests.length} pending</Badge>
            <h2
              id="pending-heading"
              className="font-heading mt-2 text-2xl font-extrabold"
            >
              Guest photos awaiting review
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                void run(
                  selectedActions('pending', (photoId) => ({
                    action: 'approveGuest',
                    photoId,
                  })),
                  'Guest photos published.',
                )
              }
            >
              <Check data-icon="inline-start" aria-hidden="true" />
              Approve selected
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                confirmAndRun(
                  selectedActions('pending', (photoId) => ({
                    action: 'rejectGuest',
                    photoId,
                  })),
                  'Permanently reject and delete the selected guest photos?',
                  'Guest photos rejected.',
                )
              }
            >
              <X data-icon="inline-start" aria-hidden="true" />
              Reject selected
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pendingGuests.map((photo) => (
            <PhotoTile
              key={photo.id}
              src={`/api/admin/galleries/${eventSlug}?photo=${photo.id}`}
              alt={photo.alt}
              label={photo.original_filename}
              selected={selected.has(`pending:${photo.id}`)}
              onSelect={() => toggle(`pending:${photo.id}`)}
              onOpen={() => setReviewKey(`pending:${photo.id}`)}
            />
          ))}
        </div>
        {!pendingGuests.length && (
          <p className="text-muted-foreground text-sm">
            No guest photos are waiting for review.
          </p>
        )}
      </section>

      <section aria-labelledby="published-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2
            id="published-heading"
            className="font-heading text-2xl font-extrabold"
          >
            Published guest photos
          </h2>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              confirmAndRun(
                selectedActions('published', (photoId) => ({
                  action: 'removeGuest',
                  photoId,
                })),
                'Permanently remove the selected published guest photos?',
                'Guest photos removed.',
              )
            }
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            Remove selected
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {publishedGuests.map((photo) => (
            <PhotoTile
              key={photo.id}
              src={`/api/admin/galleries/${eventSlug}?photo=${photo.id}`}
              alt={photo.alt}
              label={photo.original_filename}
              selected={selected.has(`published:${photo.id}`)}
              onSelect={() => toggle(`published:${photo.id}`)}
              onOpen={() => setReviewKey(`published:${photo.id}`)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="uploaded-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="uploaded-heading"
              className="font-heading text-2xl font-extrabold"
            >
              Uploaded gallery photos
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Includes photographer uploads and trusted guest invite uploads.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {uploadedPhotos.map((photo) => (
            <PhotoTile
              key={photo.id}
              src={`https://photos.ayoubabed.xyz/${photo.object_key}`}
              alt={photo.alt}
              label={
                photo.uploader_name
                  ? `${photo.original_filename} by ${photo.uploader_name}`
                  : photo.original_filename
              }
              selected={selected.has(`uploaded:${photo.id}`)}
              onSelect={() => toggle(`uploaded:${photo.id}`)}
              onOpen={() => setReviewKey(`uploaded:${photo.id}`)}
            />
          ))}
        </div>
        {!uploadedPhotos.length && (
          <p className="text-muted-foreground text-sm">
            No direct gallery photos have been uploaded yet.
          </p>
        )}
      </section>

      <section aria-labelledby="professional-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="professional-heading"
              className="font-heading text-2xl font-extrabold"
            >
              Professional gallery
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Hiding is immediate, but does not delete the R2 object or remove
              it from the prebuilt Download All ZIP.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              void run(
                selectedActions('professional', (filename) => ({
                  action: 'hideProfessional',
                  filename,
                })),
                'Professional photos hidden.',
              )
            }
          >
            <EyeOff data-icon="inline-start" aria-hidden="true" />
            Hide selected
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProfessional.map((photo) => (
            <PhotoTile
              key={photo.filename}
              src={photo.src}
              alt={photo.alt}
              label={photo.filename}
              selected={selected.has(`professional:${photo.filename}`)}
              onSelect={() => toggle(`professional:${photo.filename}`)}
              onOpen={() => setReviewKey(`professional:${photo.filename}`)}
            />
          ))}
        </div>
      </section>

      {hiddenProfessional.length > 0 && (
        <section aria-labelledby="hidden-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2
              id="hidden-heading"
              className="font-heading text-2xl font-extrabold"
            >
              Hidden professional photos
            </h2>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                void run(
                  selectedActions('hidden', (filename) => ({
                    action: 'restoreProfessional',
                    filename,
                  })),
                  'Professional photos restored.',
                )
              }
            >
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Restore selected
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hiddenProfessional.map((photo) => (
              <PhotoTile
                key={photo.filename}
                src={photo.src}
                alt={photo.alt}
                label={photo.filename}
                selected={selected.has(`hidden:${photo.filename}`)}
                onSelect={() => toggle(`hidden:${photo.filename}`)}
                onOpen={() => setReviewKey(`hidden:${photo.filename}`)}
              />
            ))}
          </div>
        </section>
      )}

      {reviewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 p-4 text-white sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Review ${reviewPhoto.label}`}
        >
          <div className="mx-auto flex h-full max-w-screen-2xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{reviewPhoto.label}</p>
                <p className="text-xs text-white/60">
                  Use ← / → to move, Esc to close.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={reviewPhoto.src} target="_blank" rel="noreferrer">
                    Open image in new tab
                  </a>
                </Button>
                {reviewPhoto.key.startsWith('pending:') && (
                  <>
                    <Button
                      disabled={pending}
                      onClick={() =>
                        void run(
                          [
                            {
                              action: 'approveGuest',
                              photoId: reviewPhoto.key.slice('pending:'.length),
                            },
                          ],
                          'Guest photo published.',
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={pending}
                      onClick={() =>
                        confirmAndRun(
                          [
                            {
                              action: 'rejectGuest',
                              photoId: reviewPhoto.key.slice('pending:'.length),
                            },
                          ],
                          'Permanently reject and delete this guest photo?',
                          'Guest photo rejected.',
                        )
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}
                {reviewPhoto.key.startsWith('published:') && (
                  <Button
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      confirmAndRun(
                        [
                          {
                            action: 'removeGuest',
                            photoId: reviewPhoto.key.slice('published:'.length),
                          },
                        ],
                        'Permanently remove this published guest photo?',
                        'Guest photo removed.',
                      )
                    }
                  >
                    Remove
                  </Button>
                )}
                {reviewPhoto.key.startsWith('professional:') && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      const filename = reviewPhoto.key.slice(
                        'professional:'.length,
                      )
                      const nextKey = adjacentReviewKey()
                      void runInPlace(
                        [{ action: 'hideProfessional', filename }],
                        'Professional photo hidden.',
                        () => {
                          setHiddenFilenames((current) => {
                            const next = new Set(current)
                            next.add(filename)
                            return next
                          })
                          setReviewKey(nextKey)
                        },
                      )
                    }}
                  >
                    Hide
                  </Button>
                )}
                {reviewPhoto.key.startsWith('hidden:') && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      const filename = reviewPhoto.key.slice('hidden:'.length)
                      const nextKey = adjacentReviewKey()
                      void runInPlace(
                        [{ action: 'restoreProfessional', filename }],
                        'Professional photo restored.',
                        () => {
                          setHiddenFilenames((current) => {
                            const next = new Set(current)
                            next.delete(filename)
                            return next
                          })
                          setReviewKey(nextKey)
                        },
                      )
                    }}
                  >
                    Restore
                  </Button>
                )}
                <Button variant="outline" onClick={() => setReviewKey(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveReview(-1)}
                aria-label="Previous photo"
              >
                ←
              </Button>
              <span
                className="block h-full min-h-[60vh] rounded-lg bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${reviewPhoto.src}")` }}
                role="img"
                aria-label={reviewPhoto.alt}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => moveReview(1)}
                aria-label="Next photo"
              >
                →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
