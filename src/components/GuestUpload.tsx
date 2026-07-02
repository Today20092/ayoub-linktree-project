import * as React from 'react'
import {
  CheckCircle2,
  CircleAlert,
  ImagePlus,
  LockKeyhole,
  Upload,
} from 'lucide-react'

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
import { Progress } from '@/components/ui/progress'

type UploadStatus = 'ready' | 'uploading' | 'complete' | 'error'

type UploadItem = {
  file: File
  preview: string
  status: UploadStatus
  error?: string
}

type GuestUploadProps = {
  eventSlug: string
  eventTitle: string
  enabled: boolean
  inviteToken?: string
  guestName?: string
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
    // The status fallback below remains actionable if a proxy returns non-JSON.
  }
  return `Request failed with status ${response.status}.`
}

export default function GuestUpload({
  eventSlug,
  eventTitle,
  enabled,
  inviteToken,
  guestName,
}: GuestUploadProps) {
  const [password, setPassword] = React.useState('')
  const [unlocked, setUnlocked] = React.useState(Boolean(inviteToken))
  const [accessPending, setAccessPending] = React.useState(false)
  const [accessError, setAccessError] = React.useState('')
  const [items, setItems] = React.useState<UploadItem[]>([])
  const [uploading, setUploading] = React.useState(false)
  const previews = React.useRef<string[]>([])

  React.useEffect(() => {
    return () =>
      previews.current.forEach((preview) => URL.revokeObjectURL(preview))
  }, [])

  const completed = items.filter(({ status }) => status === 'complete').length
  const settled = items.filter(
    ({ status }) => status === 'complete' || status === 'error',
  ).length
  const progress = items.length ? Math.round((settled / items.length) * 100) : 0

  async function unlock(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccessPending(true)
    setAccessError('')
    try {
      const response = await fetch(`/api/galleries/${eventSlug}/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      setPassword('')
      setUnlocked(true)
    } catch (error) {
      setAccessError(
        error instanceof Error ? error.message : 'Unable to unlock uploads.',
      )
    } finally {
      setAccessPending(false)
    }
  }

  function chooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, 20)
    previews.current.forEach((preview) => URL.revokeObjectURL(preview))
    previews.current = files.map((file) => URL.createObjectURL(file))
    setItems(
      files.map((file, index) => ({
        file,
        preview: previews.current[index],
        status: 'ready',
      })),
    )
    event.target.value = ''
  }

  function updateItem(index: number, update: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...update } : item,
      ),
    )
  }

  async function uploadAll() {
    setUploading(true)
    for (const [index, item] of items.entries()) {
      if (item.status === 'complete') continue
      updateItem(index, { status: 'uploading', error: undefined })
      const formData = new FormData()
      formData.set('photo', item.file)
      try {
        const uploadUrl = inviteToken
          ? `/api/galleries/${eventSlug}/uploads?invite=${encodeURIComponent(inviteToken)}`
          : `/api/galleries/${eventSlug}/uploads`
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) throw new Error(await responseError(response))
        updateItem(index, { status: 'complete' })
      } catch (error) {
        updateItem(index, {
          status: 'error',
          error: error instanceof Error ? error.message : 'The upload failed.',
        })
        if (
          error instanceof Error &&
          error.message.includes('password again')
        ) {
          setUnlocked(false)
          break
        }
      }
    }
    setUploading(false)
  }

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Guest uploads are closed</CardTitle>
          <CardDescription>
            Uploads have not been opened for this event, or the submission
            window has ended.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!inviteToken && !unlocked) {
    return (
      <Card>
        <CardHeader>
          <LockKeyhole
            className="text-primary mb-2 size-8"
            aria-hidden="true"
          />
          <CardTitle>Enter the event upload password</CardTitle>
          <CardDescription>
            Use the password shared by the photographer or event organizer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={unlock}>
            <div className="space-y-2">
              <Label htmlFor="gallery-password">Upload password</Label>
              <Input
                id="gallery-password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {accessError && (
              <p className="text-destructive text-sm" role="alert">
                {accessError}
              </p>
            )}
            <Button type="submit" disabled={accessPending}>
              <LockKeyhole data-icon="inline-start" aria-hidden="true" />
              {accessPending ? 'Checking…' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <ImagePlus className="text-primary mb-2 size-8" aria-hidden="true" />
          <CardTitle>Add your photos</CardTitle>
          <CardDescription>
            Choose up to 20 photos at a time. JPEG, PNG, WebP, and HEIC files up
            to 20 MB are accepted and resized for the web.
            {guestName ? ` Uploading as ${guestName}.` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label
            htmlFor="guest-photos"
            className="border-border hover:bg-muted/50 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors"
          >
            <Upload className="size-7" aria-hidden="true" />
            <span className="font-semibold">Choose photos</span>
            <span className="text-muted-foreground text-xs">
              {inviteToken
                ? `Photos publish to ${eventTitle} after upload`
                : `Photos are reviewed before appearing in ${eventTitle}`}
            </span>
          </Label>
          <Input
            id="guest-photos"
            className="sr-only"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            onChange={chooseFiles}
          />
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{items.length} selected</CardTitle>
            <CardDescription>
              Keep this page open until every photo finishes uploading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
              {items.map((item) => (
                <li
                  key={`${item.file.name}-${item.file.lastModified}`}
                  className="border-border flex min-w-0 items-center gap-3 rounded-lg border p-2"
                >
                  <div
                    className="bg-muted size-14 shrink-0 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.preview}")` }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    {item.error && (
                      <p className="text-destructive mt-1 text-xs" role="alert">
                        {item.error}
                      </p>
                    )}
                  </div>
                  {item.status === 'complete' && (
                    <CheckCircle2
                      className="size-5 shrink-0 text-emerald-600"
                      aria-label="Uploaded"
                    />
                  )}
                  {item.status === 'error' && (
                    <CircleAlert
                      className="text-destructive size-5 shrink-0"
                      aria-label="Upload failed"
                    />
                  )}
                </li>
              ))}
            </ul>
            {(uploading || settled > 0) && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-muted-foreground text-xs">
                  {completed} of {items.length} uploaded
                </p>
              </div>
            )}
            <Button
              type="button"
              size="lg"
              disabled={uploading || completed === items.length}
              onClick={uploadAll}
            >
              <Upload data-icon="inline-start" aria-hidden="true" />
              {uploading
                ? 'Uploading…'
                : completed
                  ? 'Retry remaining photos'
                  : 'Submit for review'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
