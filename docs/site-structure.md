# Site structure

A page loads route data, sets metadata and lists its bands in order. A layout owns the document. Read this before adding or moving a component.

## Where things go

| Folder                        | Holds                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `src/pages/`                  | Routes only                                                                        |
| `src/layouts/`                | `BaseLayout.astro`: `<html>`, `<head>`, header and the main slot                   |
| `src/components/layout/`      | Page frame pieces: `PageContainer`, `PageHeader`, `ServiceSection`, upload shell   |
| `src/components/sections/<p>` | One page band each, grouped by page area: `home`, `portfolio`, `gallery`, services |
| `src/components/`             | Pieces used by several bands or pages, and the React tools (gallery, upload, face) |
| `src/components/ui/`          | Generic shadcn/Base UI primitives                                                  |
| `src/lib/`, `src/data/`       | Plain TypeScript and static data                                                   |

## What may import what

`pnpm run test:structure` enforces this table. Use `@/…` across folders and `./` for siblings. No barrel files.

| From                  | May not import                                 |
| --------------------- | ---------------------------------------------- |
| anything              | `pages/`                                       |
| `layouts/`            | `components/sections/`                         |
| `components/sections` | `layouts/`, another sections folder            |
| `components/layout`   | `layouts/`, `components/sections/`             |
| other `components/`   | `layouts/`, `components/sections/`             |
| `components/ui`       | also `components/layout/`, `data/`, `content/` |
| `lib/`                | `layouts/`, `.astro` files                     |
| `data/`               | `layouts/`, `components/`                      |

The test reads `import`, `export … from`, `import()` and `<script src>` in `.astro`, `.ts`, `.js` and `.tsx` files. It misses `import.meta.glob`, template-literal imports and MDX.

## When to create a component

- **Section:** a full-width band you would move or delete as one unit, even if used once. Name it by content.
- **Shared component:** the third real use, or sooner when behavior or accessibility must stay identical (`GuestUploadShell` serves two upload routes).
- Keep markup where it is when sharing it would need a prop for that one case.
- A section's client script lives in the section file.
- Access checks, route data and page metadata stay in the page.

## Moving markup safely

- Scoped styles do not follow markup into a child component. Move the rules with it, or use `:global()` under a scoped parent.
- Pages import `styles.css` first. Keep component import order, which sets CSS order.
- Scripts depend on DOM shape:
  - `MotionPreview` reads `[data-motion-home] > header`, `#contact`, `#portfolio`, `[data-motion-hero]`, `aria-labelledby="comparison-title"` and the `data-comparison*` attributes.
  - The gallery scripts expect `GalleryGridControls` as a direct child of `section[data-gallery-browser]`, and check IDs, order, `data-gallery-open` and `data-gallery-filename` in fetched pages.
  - The pricing radios on the event photography page join `EventPortraitInquiry` through `form="event-portrait-inquiry"`; the script also reads `#coverage`.
- Compare production builds. Verify with `pnpm run verify` and check the changed pages in a browser.

## Deviations from the general standard

- Sections may import `components/layout/` pieces, because the shared page primitives in [DESIGN.md](../DESIGN.md) live there.
- Earlier components stay at the root of `src/components/`. Move one only as its own change.
- Several pages still hold their own bands (for example the event photography hero, experience, proof and pricing bands, and the portfolio detail hero, story and links). Extract them when they next change.
