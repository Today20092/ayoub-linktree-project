import * as React from 'react'
import { Grid2X2, Columns3, ChevronDown, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { galleryColumns } from '@/lib/gallery-grid'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

export default function GalleryPreferences() {
  const root = React.useRef<HTMLDivElement>(null)
  const viewTrigger = React.useRef<HTMLButtonElement>(null)
  const [optionsOpen, setOptionsOpen] = React.useState(false)
  const optionsId = React.useId()
  const [view, setView] = React.useState('grid')
  const [order, setOrder] = React.useState('oldest')
  const [sizes, setSizes] = React.useState({ columns: 3, min: 2, max: 7 })
  const layoutDescription = React.useId()

  React.useEffect(() => {
    const gallery = root.current?.closest<HTMLElement>('[data-gallery-browser]')
    if (!gallery) return
    const sync = () => {
      setView(gallery.dataset.galleryView ?? 'grid')
      setOrder(gallery.dataset.galleryOrder ?? 'oldest')
      const levels = galleryColumns(gallery.clientWidth)
      setSizes({
        columns: Number(gallery.dataset.galleryColumns ?? 3),
        min: levels[0],
        max: levels.at(-1)!,
      })
    }
    sync()
    gallery.addEventListener('gallery:preferences', sync)
    return () => gallery.removeEventListener('gallery:preferences', sync)
  }, [])

  const change = (kind: 'view' | 'order', values: string[]) => {
    if (!values[0]) return
    if (kind === 'view') setView(values[0])
    else setOrder(values[0])
    root.current
      ?.closest('[data-gallery-browser]')
      ?.dispatchEvent(new CustomEvent(`gallery:${kind}`, { detail: values[0] }))
  }

  return (
    <div
      ref={root}
      className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 sm:w-0 sm:flex-1"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && optionsOpen) {
          setOptionsOpen(false)
          viewTrigger.current?.focus()
        }
      }}
    >
      <span className="text-sm font-semibold">Sort</span>
      <ToggleGroup
        className="max-w-full flex-wrap"
        value={[order]}
        onValueChange={(values) => change('order', values)}
        aria-label="Photo order"
      >
        <ToggleGroupItem value="oldest">Oldest</ToggleGroupItem>
        <ToggleGroupItem value="newest">Newest</ToggleGroupItem>
      </ToggleGroup>
      <Button
        ref={viewTrigger}
        data-gallery-view-toggle
        variant="outline"
        className="min-h-11"
        aria-expanded={optionsOpen}
        aria-controls={optionsId}
        onClick={() => setOptionsOpen(!optionsOpen)}
      >
        View
        <ChevronDown
          data-icon="inline-end"
          className={cn(optionsOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>
      <div
        id={optionsId}
        data-gallery-view-options
        hidden={!optionsOpen}
        className="max-w-full min-w-0 basis-full"
      >
        <div className="bg-muted mt-2 flex w-fit max-w-full flex-col gap-3 rounded-lg p-3">
          <ToggleGroup
            className="max-w-full flex-wrap"
            value={[view]}
            onValueChange={(values) => change('view', values)}
            aria-label="Gallery view"
            aria-describedby={layoutDescription}
          >
            <ToggleGroupItem value="grid">
              <Grid2X2 aria-hidden="true" />
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem value="masonry">
              <Columns3 aria-hidden="true" />
              Natural layout
            </ToggleGroupItem>
          </ToggleGroup>
          <p id={layoutDescription} className="text-muted-foreground text-xs">
            Natural layout: keep original photo proportions.
          </p>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Photo size"
          >
            <span className="text-sm font-semibold">Photo size</span>
            {(['smaller', 'larger'] as const).map((direction) => {
              const Icon = direction === 'smaller' ? Minus : Plus
              return (
                <Button
                  key={direction}
                  variant="outline"
                  size="icon"
                  className="size-11"
                  data-gallery-size={direction}
                  aria-label={
                    direction === 'smaller' ? 'Smaller photos' : 'Larger photos'
                  }
                  disabled={
                    sizes.columns ===
                    (direction === 'smaller' ? sizes.max : sizes.min)
                  }
                  onClick={() =>
                    root.current
                      ?.closest('[data-gallery-browser]')
                      ?.dispatchEvent(
                        new CustomEvent('gallery:size', { detail: direction }),
                      )
                  }
                >
                  <Icon aria-hidden="true" />
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
