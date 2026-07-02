// Admin form for creating reusable event gallery records from the mobile admin panel.
import * as React from 'react'
import { CalendarDays, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function isoDate(date: Date | undefined) {
  return date?.toISOString().slice(0, 10) ?? ''
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
    // The status fallback is enough for non-JSON proxy errors.
  }
  return `Request failed with status ${response.status}.`
}

export default function AdminEventCreator() {
  const [date, setDate] = React.useState<Date>()
  const [comingSoon, setComingSoon] = React.useState(true)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [error, setError] = React.useState('')

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    setError('')
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('eventDate', isoDate(date))
    formData.set('comingSoon', comingSoon ? 'true' : 'false')

    try {
      const response = await fetch('/api/admin/galleries', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error(await responseError(response))
      const body = (await response.json()) as { eventSlug?: string }
      setMessage('Gallery created.')
      window.location.href = `/admin/galleries/${body.eventSlug}/`
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Gallery was not created.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create event gallery</CardTitle>
        <CardDescription>
          Add the event info, flyer, and coming-soon state from your phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={createEvent}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="event-title">Name</FieldLabel>
              <Input id="event-title" name="title" required maxLength={120} />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-summary">About information</FieldLabel>
              <Textarea
                id="event-summary"
                name="summary"
                required
                maxLength={500}
                rows={4}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-category">Category</FieldLabel>
              <Input
                id="event-category"
                name="category"
                defaultValue="Event Photography"
                maxLength={80}
              />
            </Field>
            <Field>
              <FieldLabel>Event date</FieldLabel>
              <div className="border-border w-fit rounded-2xl border">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  captionLayout="dropdown"
                />
              </div>
              <FieldDescription>
                <CalendarDays aria-hidden="true" />
                {date ? isoDate(date) : 'No date selected'}
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="event-time">Time</FieldLabel>
                <Input id="event-time" name="eventTime" maxLength={80} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-venue">Venue</FieldLabel>
                <Input id="event-venue" name="eventVenue" maxLength={120} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="event-flyer">
                Flyer or cover photo
              </FieldLabel>
              <Input
                id="event-flyer"
                name="flyer"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              />
              <FieldDescription>
                Uploaded images are resized to 2400px on the longest edge.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="event-coming-soon"
                checked={comingSoon}
                onCheckedChange={(value) => setComingSoon(Boolean(value))}
              />
              <FieldContent>
                <FieldLabel htmlFor="event-coming-soon">Coming soon</FieldLabel>
                <FieldDescription>
                  Hide public photos until the gallery is ready.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          {(message || error) && (
            <p
              className={
                error ? 'text-destructive text-sm' : 'text-sm font-medium'
              }
              role="status"
            >
              {error || message}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Plus data-icon="inline-start" aria-hidden="true" />
            )}
            Create gallery
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
