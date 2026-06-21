import { Film, Play } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'

type UpcomingVideoProps = {
  label: string
  title: string
  description: string
}

export default function UpcomingVideo({
  label,
  title,
  description,
}: UpcomingVideoProps) {
  return (
    <section
      className="border-border mx-auto max-w-4xl border-t py-8 sm:py-10"
      aria-labelledby="upcoming-video-title"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(15rem,0.55fr)] lg:items-center">
        <div
          className="border-border bg-muted/40 relative aspect-video overflow-hidden rounded-2xl border"
          aria-hidden="true"
        >
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background text-foreground inline-flex size-14 items-center justify-center rounded-full shadow-sm">
              <Film aria-hidden="true" />
            </span>
          </div>
          <div className="absolute right-4 bottom-4 left-4 space-y-2">
            <Skeleton className="bg-background/70 h-3 w-2/3" />
            <Skeleton className="bg-background/70 h-3 w-1/3" />
          </div>
        </div>

        <div>
          <p className="text-primary text-xs font-bold tracking-wider uppercase">
            {label}
          </p>
          <h2
            id="upcoming-video-title"
            className="font-heading mt-2 text-2xl font-bold"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 leading-7">{description}</p>
          <p className="mt-5 flex items-center gap-2 text-sm font-bold">
            <Play data-icon="inline-start" aria-hidden="true" />
            YouTube release coming soon
          </p>
        </div>
      </div>
    </section>
  )
}
