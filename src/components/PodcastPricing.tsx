import { useId, useState } from 'react'
import { CheckIcon, MailIcon, MinusIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import {
  estimatePodcastPrice,
  podcastAddOns,
  podcastComparison,
  podcastEmail,
  podcastExtraHour,
  podcastFaqs,
  podcastMistakeCutsPerHour,
  podcastPackages,
  podcastTravelNote,
  type PodcastPackage,
} from '@/lib/podcast-offer'

const usd = (n: number) => `$${n.toLocaleString('en-US')}`

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string')
    return <span className="text-muted-foreground text-sm">{value}</span>
  return value ? (
    <CheckIcon aria-label="Included" className="text-primary mx-auto size-4" />
  ) : (
    <MinusIcon
      aria-label="Not included"
      className="text-muted-foreground/40 mx-auto size-4"
    />
  )
}

export default function PodcastPricing() {
  const id = useId()
  const [packageId, setPackageId] = useState<PodcastPackage['id']>('growth')
  const [addOns, setAddOns] = useState<string[]>([])
  const [extraHours, setExtraHours] = useState(0)
  const [extraPlatforms, setExtraPlatforms] = useState(0)
  const [mistakeCuts, setMistakeCuts] = useState(false)

  const pkg = podcastPackages.find((p) => p.id === packageId)!
  const visibleAddOns = podcastAddOns.filter(
    (a) => a.id !== 'platform' && (!a.onlyFor || a.onlyFor.includes(packageId)),
  )
  const livestream = addOns.includes('livestream')
  const total = estimatePodcastPrice({
    packageId,
    addOns,
    extraHours,
    extraPlatforms,
    mistakeCuts,
  })

  const toggle = (addOnId: string) =>
    setAddOns((prev) =>
      prev.includes(addOnId)
        ? prev.filter((x) => x !== addOnId)
        : [...prev, addOnId],
    )

  const chosen = [
    ...visibleAddOns.filter((a) => addOns.includes(a.id)).map((a) => a.label),
    ...(livestream && extraPlatforms
      ? [`${extraPlatforms} extra livestream platform(s)`]
      : []),
    ...(extraHours ? [`${extraHours} extra recording hour(s)`] : []),
    ...(mistakeCuts ? ['Mistake cuts'] : []),
  ]
  const mailto = `mailto:${podcastEmail}?subject=${encodeURIComponent(
    `Podcast inquiry: ${pkg.name}`,
  )}&body=${encodeURIComponent(
    [
      `Package: ${pkg.name} (from ${usd(pkg.price)})`,
      `Add-ons: ${chosen.length ? chosen.join(', ') : 'None'}`,
      `Estimated starting price: ${usd(total)} per episode`,
      '',
      'Show name:',
      'Recording location (city):',
      'Episodes per month:',
      'Preferred first recording date:',
    ].join('\n'),
  )}`

  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-5 lg:grid-cols-3">
        {podcastPackages.map((p) => (
          <Card
            key={p.id}
            className={cn(p.featured && 'ring-primary ring-2 lg:-my-3')}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{p.name}</CardTitle>
                {p.featured && <Badge>Most popular</Badge>}
              </div>
              <CardDescription>{p.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground text-xs">from</span>
                <span className="text-4xl font-bold tracking-tight tabular-nums">
                  {usd(p.price)}
                </span>
                <span className="text-muted-foreground text-sm">/ episode</span>
              </p>
              <Badge variant="secondary">Delivered in {p.delivery}</Badge>
              <Separator />
              <ul className="flex flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <a
                href="#estimate"
                onClick={() => setPackageId(p.id)}
                className={cn(
                  buttonVariants({
                    variant: p.featured ? 'default' : 'outline',
                  }),
                  'w-full',
                )}
              >
                Build my {p.name} episode
              </a>
            </CardFooter>
          </Card>
        ))}
      </div>

      <section
        aria-labelledby={`${id}-compare`}
        className="flex flex-col gap-4"
      >
        <h3 id={`${id}-compare`} className="font-heading text-xl font-semibold">
          Compare packages
        </h3>
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">What you get</TableHead>
                {podcastPackages.map((p) => (
                  <TableHead key={p.id} className="text-center">
                    {p.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {podcastComparison.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium whitespace-normal">
                    {row.name}
                  </TableCell>
                  {podcastPackages.map((p) => (
                    <TableCell key={p.id} className="text-center">
                      <FeatureCell value={row.values[p.id]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section
        id="estimate"
        aria-labelledby={`${id}-estimate`}
        className="grid scroll-mt-24 items-start gap-6 lg:grid-cols-[1fr_22rem]"
      >
        <div className="flex flex-col gap-5">
          <div>
            <h3
              id={`${id}-estimate`}
              className="font-heading text-xl font-semibold"
            >
              Build your episode
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Pick a package and add what your show needs.
            </p>
          </div>
          <ToggleGroup
            aria-label="Package"
            variant="outline"
            value={[packageId]}
            onValueChange={(v) =>
              v[0] && setPackageId(v[0] as PodcastPackage['id'])
            }
            className="flex-wrap"
          >
            {podcastPackages.map((p) => (
              <ToggleGroupItem key={p.id} value={p.id}>
                {p.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ul className="grid gap-2 sm:grid-cols-2">
            {visibleAddOns.map((a) => (
              <li key={a.id}>
                <label
                  htmlFor={`${id}-${a.id}`}
                  className="hover:bg-muted/50 has-data-checked:border-primary flex h-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                >
                  <Checkbox
                    id={`${id}-${a.id}`}
                    checked={addOns.includes(a.id)}
                    onCheckedChange={() => toggle(a.id)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-medium">
                      {a.label}
                      <span className="tabular-nums">
                        +{usd(a.price)}
                        {a.unit && (
                          <span className="text-muted-foreground text-xs font-normal">
                            {' '}
                            {a.unit}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                      {a.description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
            <li>
              <label
                htmlFor={`${id}-cuts`}
                className="hover:bg-muted/50 has-data-checked:border-primary flex h-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors"
              >
                <Checkbox
                  id={`${id}-cuts`}
                  checked={mistakeCuts}
                  onCheckedChange={(c) => setMistakeCuts(c === true)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    Mistake cuts
                    <span className="tabular-nums">
                      +{usd(podcastMistakeCutsPerHour)}
                      <span className="text-muted-foreground text-xs font-normal">
                        {' '}
                        / hour
                      </span>
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                    Remove mistakes, retakes, and dead air. Packages keep the
                    full episode uncut.
                  </span>
                </span>
              </label>
            </li>
          </ul>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <span id={`${id}-hours`} className="text-sm font-medium">
                Extra recording hours{' '}
                <span className="text-muted-foreground font-normal">
                  (+{usd(podcastExtraHour)} each)
                </span>
              </span>
              <ToggleGroup
                aria-labelledby={`${id}-hours`}
                variant="outline"
                size="sm"
                value={[String(extraHours)]}
                onValueChange={(v) => v[0] && setExtraHours(Number(v[0]))}
              >
                {[0, 1, 2].map((n) => (
                  <ToggleGroupItem key={n} value={String(n)}>
                    {n === 0 ? 'None' : `+${n}`}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {livestream && (
              <div className="flex flex-col gap-2">
                <span id={`${id}-platforms`} className="text-sm font-medium">
                  Extra livestream platforms{' '}
                  <span className="text-muted-foreground font-normal">
                    (+$50 each)
                  </span>
                </span>
                <ToggleGroup
                  aria-labelledby={`${id}-platforms`}
                  variant="outline"
                  size="sm"
                  value={[String(extraPlatforms)]}
                  onValueChange={(v) => v[0] && setExtraPlatforms(Number(v[0]))}
                >
                  {[0, 1, 2].map((n) => (
                    <ToggleGroupItem key={n} value={String(n)}>
                      {n === 0 ? 'None' : `+${n}`}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </div>
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardDescription>Estimated starting price</CardDescription>
            <CardTitle
              className="text-4xl font-bold tabular-nums"
              aria-live="polite"
            >
              {usd(total)}
              <span className="text-muted-foreground text-sm font-normal">
                {' '}
                / episode
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-2">
              <span>{pkg.name}</span>
              <span className="tabular-nums">{usd(pkg.price)}</span>
            </div>
            {chosen.length > 0 && (
              <ul className="text-muted-foreground flex flex-col gap-1">
                {chosen.map((c) => (
                  <li key={c}>+ {c}</li>
                ))}
              </ul>
            )}
            <Separator />
            <p className="text-muted-foreground text-xs leading-5">
              {podcastTravelNote} Half up front reserves your date. Four or more
              episodes, or repeat bookings, get a discount.
            </p>
          </CardContent>
          <CardFooter>
            <a
              href={mailto}
              className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
            >
              <MailIcon data-icon="inline-start" />
              Email this plan
            </a>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

export function PodcastFaq() {
  return (
    <Accordion className="w-full">
      {podcastFaqs.map((item) => (
        <AccordionItem key={item.question} value={item.question}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
