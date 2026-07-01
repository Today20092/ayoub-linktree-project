import * as React from 'react'
import { Check, EyeOff, Loader2, RotateCcw, Trash2, X } from 'lucide-react'

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
import type { GallerySettings, GuestPhoto } from '@/lib/gallery-data'

type ProfessionalPhoto = {
  src: string
  alt: string
  filename: string
  hidden: boolean
}

type AdminGalleryProps = {
  eventSlug: string
  settings: GallerySettings | null
  guests: GuestPhoto[]
  professional: ProfessionalPhoto[]
}

type Action =
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
}: {
  src: string
  alt: string
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <label className="border-border bg-card group relative block cursor-pointer overflow-hidden rounded-xl border">
      <span
        className="bg-muted block aspect-[4/3] bg-cover bg-center"
        style={{ backgroundImage: `url("${src}")` }}
        role="img"
        aria-label={alt}
      />
      <span className="block truncate p-3 text-xs font-medium">{label}</span>
      <input
        type="checkbox"
        className="accent-primary absolute top-3 left-3 size-5"
        checked={selected}
        onChange={onSelect}
        aria-label={`Select ${label}`}
      />
    </label>
  )
}

export default function AdminGallery({
  eventSlug,
  settings,
  guests,
  professional,
}: AdminGalleryProps) {
  const [selected, setSelected] = React.useState(new Set<string>())
  const [uploadsEnabled, setUploadsEnabled] = React.useState(
    Boolean(settings?.uploads_enabled),
  )
  const [password, setPassword] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  const pendingGuests = guests.filter(({ status }) => status === 'pending')
  const publishedGuests = guests.filter(({ status }) => status === 'published')
  const visibleProfessional = professional.filter(({ hidden }) => !hidden)
  const hiddenProfessional = professional.filter(({ hidden }) => hidden)

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
            />
          ))}
        </div>
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
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
