# Design

Durable visual decisions for the website. Product truth lives in [PRODUCT.md](PRODUCT.md); one-route strategy lives in surface briefs under `.impeccable/`. This file records the incumbent world that the code already ships. It does not introduce a new brand.

## World

A personal portfolio, not an agency. Warm-neutral paper, near-black ink, and one emerald accent. Real photographs carry the color; the interface stays quiet around them.

## Tokens

Source: `src/styles.css` (shadcn tokens, OKLCH).

- Ground: `--background` white (light) / warm near-black `oklch(0.147 0.004 49.25)` (dark).
- Ink: `--foreground`; secondary text `--muted-foreground` only. Do not use grey text on photos.
- Accent: `--primary` emerald `oklch(0.696 0.17 162.48)`. Use it for the primary action and inline links only. Never use it for a decorative fill or section background.
- Surfaces: `--muted` for quiet rows and selected-state fills. `--border` for hairlines.
- Radius: `--radius` 0.5rem. Photos use `rounded-2xl`; controls use `rounded-xl`.

## Type

- Headings: `font-heading` (Zodiak, serif), `font-extrabold`, `tracking-tight`, `text-balance`.
- Body and UI: `font-sans` (Plus Jakarta Sans). It is the incumbent face; keep it.
- Prices: body face, `font-bold tabular-nums`, so the columns align.
- Scale steps in use: `text-sm`, `text-base`, `text-lg`, `text-2xl/3xl` for section headings, and `text-4xl/5xl/6xl` for page h1. Do not add steps between them.

## Components

Use the installed shadcn primitives in `src/components/ui/`: `button` (`buttonVariants`), `separator`, `card`, `badge`, `accordion`, and the others already in that folder. Do not add a registry until the registry decision is made (#93).

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
