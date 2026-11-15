# Design

Durable visual decisions for the website. Product truth lives in [PRODUCT.md](PRODUCT.md); one-route strategy lives in surface briefs under `.impeccable/`. This file records the incumbent world that the code already ships. It does not introduce a new brand.

## World

A personal portfolio, not an agency. Warm-neutral paper, near-black ink, and one emerald accent. Real photographs carry the color; the interface stays quiet around them.

## Tokens

Source: `src/styles.css` (shadcn tokens, OKLCH).

- Ground: `--background` white (light) / warm near-black `oklch(0.147 0.004 49.25)` (dark).
- Ink: `--foreground`; secondary text `--muted-foreground` only. Do not use grey text on photos.
- Accent: `--primary` emerald `oklch(0.696 0.17 162.48)`. Use it for the primary action and inline links only. Never use it for a decorative fill or section background.
- Status and overlays: colour tokens live in `src/tokens.css` and are listed in [the design system](docs/design-system.md). Use `--success` for confirmations (a check icon, not a fill) and `--scrim` / `--scrim-foreground` for scrims and controls over photo or video (black in both themes on purpose; e.g. `bg-scrim/80`). Never write `text-emerald-*`, `bg-black`, `text-white`, or raw `rgb()`/hex in components; `pnpm run check:design-system` enforces this.
- Surfaces: `--muted` for quiet rows and selected-state fills. `--border` for hairlines.
- Radius: `--radius` 0.5rem. Photos use `rounded-2xl` (`rounded-sm` for the editorial photos on the event photography page); controls use `rounded-xl`.

## Type

- Two heading roles, each defined once in `src/styles.css` or a layout module:
  - Page headings (`PageHeader`, portfolio, prose): `font-heading` (Zodiak, serif), `font-extrabold`, `tracking-tight`, `text-balance`. Every h1 outside the service pages is extrabold.
  - Marketing display headings (service pages, via `display-hero` for the h1 and `ServiceSection` for h2): Plus Jakarta Sans medium with tight tracking, plus an optional Zodiak accent line written as `<em>` inside the heading. Never restyle headings or `em` in page CSS.
- Eyebrow labels: the `eyebrow` utility (`text-xs`, semibold, tracked, uppercase, muted). Add the margin at the call site.
- Body and UI: `font-sans` (Plus Jakarta Sans). It is the incumbent face; keep it.
- Prices: body face, `font-bold tabular-nums`, so the columns align.
- Scale steps in use: `text-sm`, `text-base`, `text-lg`, `text-2xl/3xl` for section headings, and `text-4xl/5xl/6xl` for page h1. Do not add steps between them.

## Components

Use the installed shadcn primitives in `src/components/ui/`: `button` (`buttonVariants`), `separator`, `card`, `badge`, `accordion`, and the others already in that folder. Do not add a registry until the registry decision is made (#93).

### Use these, not hand-rolled classes

- Page layout, from `src/components/layout/`:
  - `PageContainer` is the page's `<main id="main-content">`. `width="narrow"` (default) is prose width with its own vertical padding (about, contact, privacy, 404); `width="wide"` is the 1280px service and admin width, where sections own their padding. Pass only extra layout through `class`.
  - `PageHeader` renders the eyebrow, the page's `<h1>` (`title` prop), and a lead paragraph (`slot="lead"`). Other content goes in the default slot; attributes such as `data-reveal` and `class` go on the `<header>`.
  - `ServiceSection` is a numbered service-page section: `eyebrow`, `titleId`, optional `id` (adds `scroll-mt-24`), `layout="stack" | "split"`, `stickyIntro`. Slots: `title` (wrap the accent line in `<em>`), `lead`, and the default content slot. Separate sections with `<Separator />`.
  - Compose a page from these. A page `<style>` block is for something genuinely unique to that page, never standard structure, and must not repeat a utility already in the markup (page CSS is unlayered and beats Tailwind utilities).
- Long-form prose (privacy, MDX): `class="typeset"` from `src/typeset.css`. The Tailwind typography plugin is not installed, so `prose` classes do nothing.
- Text links: `class="link"` (accent) or `class="link-quiet"` (inherits colour), defined once in `src/styles.css`. Add only layout (`inline-flex min-h-11 items-center`) and weight.
- Buttons and button-looking links: `buttonVariants({ variant, size })` from `@/components/ui/button`.
- Choosing one of several: React uses `ToggleGroup`. In `.astro`, use a `role="group"` with `aria-label` of `buttonVariants({ variant: 'outline' })` buttons toggling `aria-pressed` (the outline variant styles the pressed state in both themes), or native radios in a `<fieldset>` with `<legend>` when the choice submits with a form (see the coverage picker in `services/event-portraits.astro`). Never mirror one choice in two controls.
- Text fields in `.astro`: `inputClassName` from `@/components/ui/input`.
- Focus is `focus-visible:ring-*` with `ring-ring`, never `outline-*`.

## Imagery

- Use only real proof from the repo: `src/assets/portraits/`, the portfolio collection, and the authorized remote event hosts.
- Always use `<Image />` from `astro:assets`.
- Each image needs a caption that names the real event and links to its proof (gallery or portfolio piece).
- No stock photos, gradients over photos, glass, or icon tiles standing in for proof.

## Motion

Keep motion minimal. Hover and focus transitions only, and they must respect `prefers-reduced-motion`. Persuade pages do not use scroll-jacking or walkthrough animation.

## Accessibility floor

- Targets at least 44px (`min-h-11`).
- Visible `focus-visible` outlines on every link and control.
- Body text on `--background` meets WCAG AA in both themes.
- Layouts are checked at 390px and 1440px wide.
