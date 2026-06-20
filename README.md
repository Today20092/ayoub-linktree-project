# Ayoub Abedrabbo Portfolio

Personal portfolio and link hub for Ayoub Abedrabbo, a Tampa-based
photographer, videographer, field producer, colorist, audio technician, and web
developer.

The live website is [ayoubabed.xyz](https://ayoubabed.xyz).

This README describes the project as it exists in June 2026. It is intended to
help Ayoub, collaborators, and AI coding agents understand where content lives,
how pages are generated, and how to update the website safely.

## What the website does

The homepage combines:

- A short personal introduction
- Contact and social links
- YouTube channel links
- Portfolio project cards
- Support and payment links

Each portfolio project has its own URL and editable MDX file. Portfolio pages
share one design template, so project content can be updated without rebuilding
the page layout each time.

The site supports light and dark modes based on the visitor's system
preference.

## Technology

- [Astro](https://astro.build/) for pages, routing, and static generation
- Astro Content Collections for structured portfolio content
- MDX for individually editable case studies
- Tailwind CSS v4 for styling
- shadcn/ui and Radix-based UI components
- React for the small number of React components
- astro-icon and Lucide for icons
- Prettier for formatting
- Cloudflare Pages/Workers for hosting

The production site is built from the linked GitHub repository and deployed to
Cloudflare.

## How the architecture works

The website separates three concerns:

```text
Content              Page templates             Styling
MDX and YAML         Astro files                Tailwind and CSS
```

For portfolio projects:

```text
src/content/portfolio/ya-hala.mdx
                |
                | loaded and validated by
                v
src/content.config.ts
                |
                | rendered through
                v
src/pages/portfolio/[slug].astro
                |
                v
/portfolio/ya-hala
```

This means a normal portfolio project does not need its own `.astro` page.
Each project gets its own `.mdx` content file, while all projects reuse the same
page layout.

## Project structure

```text
/
├── public/
│   ├── previews/
│   │   ├── alphabravomedia-homepage.webp
│   │   └── client-work/
│   │       ├── arqam-academy.webp
│   │       ├── aya-academy.webp
│   │       ├── bayaan-academy.webp
│   │       ├── konan-bbq-podcast.webp
│   │       ├── lavena-health.webp
│   │       ├── maan-academy.webp
│   │       ├── omar-erchid-law-firm.webp
│   │       └── ya-hala.webp
│   ├── _redirects
│   ├── AyoubA-Contact-Card.vcf
│   ├── AyoubContactCardImage.jpg
│   ├── favicon files
│   └── site.webmanifest
├── scripts/
│   ├── generate-favicons.js
│   └── update-latest-youtube-video.mjs
├── src/
│   ├── components/
│   │   ├── PortfolioIndex.astro
│   │   └── ui/
│   ├── content/
│   │   └── portfolio/
│   │       ├── PROJECT_TEMPLATE.mdx.example
│   │       ├── ya-hala.mdx
│   │       ├── omar-erchid-law-firm.mdx
│   │       └── other project MDX files
│   ├── data/
│   │   ├── site.yaml
│   │   ├── youtube-channels.json
│   │   └── latest-youtube-videos.json
│   ├── image/
│   │   └── logos and interface images
│   ├── lib/
│   │   ├── site-config.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── index.astro
│   │   └── portfolio/
│   │       ├── [slug].astro
│   │       └── alphabravomedia.astro
│   ├── content.config.ts
│   └── styles.css
├── astro.config.mjs
├── components.json
├── package.json
└── prettier.config.cjs
```

## Where to edit common things

| What you want to change                       | File or folder                           |
| --------------------------------------------- | ---------------------------------------- |
| A portfolio project's writing or details      | `src/content/portfolio/project-name.mdx` |
| Portfolio field rules and validation          | `src/content.config.ts`                  |
| Layout shared by every portfolio page         | `src/pages/portfolio/[slug].astro`       |
| Homepage portfolio card layout                | `src/components/PortfolioIndex.astro`    |
| Homepage metadata and data loading            | `src/pages/index.astro`                  |
| Social, contact, payment, and channel links   | `src/data/site.yaml`                     |
| Portfolio images                              | `public/previews/client-work/`           |
| General logos and imported images             | `src/image/`                             |
| Colors, typography, dark mode, and MDX styles | `src/styles.css`                         |
| Astro integrations and production URL         | `astro.config.mjs`                       |
| Cloudflare redirects                          | `public/_redirects`                      |
| Contact card                                  | `public/AyoubA-Contact-Card.vcf`         |

## Portfolio system

Portfolio projects live here:

```text
src/content/portfolio/
```

Current projects include:

```text
ya-hala.mdx
omar-erchid-law-firm.mdx
lavena-health.mdx
konan-bbq-podcast.mdx
bayaan-academy.mdx
aya-academy.mdx
maan-academy.mdx
arqam-academy.mdx
```

### How filenames become URLs

The MDX filename is the project's slug:

```text
ya-hala.mdx
→ /portfolio/ya-hala

omar-erchid-law-firm.mdx
→ /portfolio/omar-erchid-law-firm
```

Renaming an MDX file changes its public URL. Do not rename an existing project
without also considering redirects and existing links.

### Anatomy of a project file

Each MDX file has two parts.

#### 1. Frontmatter

Frontmatter is the structured information between the opening and closing
`---` markers:

```mdx
---
order: 1
title: Example Project
status: complete
category: Video production
summary: A short summary of the project.
thumbnail: /previews/client-work/example-project.webp
heroImage: /previews/client-work/example-project.webp
imageAlt: Description of the project image
imageWidth: 1280
imageHeight: 720
services:
  - Videography
  - Lighting
links:
  - label: Visit website
    url: https://example.com
---
```

Frontmatter controls:

- Homepage order
- Card title and image
- Project metadata and SEO
- Hero image
- Services
- Role and collaborators
- Duration
- Tools
- Outcomes
- Gallery images
- Project links
- YouTube videos

#### 2. MDX body

Everything after the closing `---` is the written case study:

```md
## Overview

Write normal paragraphs here.

## Production process

- Describe the recording
- Describe the lighting
- Describe the final delivery
```

The MDX body supports headings, paragraphs, lists, links, images, and MDX
components. If a project has no written body, the shared template does not
render an empty section.

## Portfolio frontmatter reference

### Required fields

| Field         | Purpose                                         |
| ------------- | ----------------------------------------------- |
| `order`       | Controls the project's position on the homepage |
| `title`       | Visible project name                            |
| `status`      | Either `complete` or `placeholder`              |
| `category`    | Short project category                          |
| `summary`     | Homepage and SEO description                    |
| `thumbnail`   | Image used on the homepage card                 |
| `heroImage`   | Large image at the top of the project page      |
| `imageAlt`    | Accessible description of the image             |
| `imageWidth`  | Source image width                              |
| `imageHeight` | Source image height                             |

The schema automatically supplies empty arrays for `services`, `links`,
`collaborators`, `tools`, `outcomes`, `gallery`, and `videos` when they are
omitted.

### Optional detail fields

```yaml
role: Videographer and colorist
collaborators:
  - Client name
  - Editing team
duration: January 2026-present
tools:
  - DaVinci Resolve
  - Lumix S5IIX
outcomes:
  - Cleaner dialogue
  - More consistent color
```

### Gallery images

```yaml
gallery:
  - src: /previews/client-work/example-behind-the-scenes.webp
    alt: Ayoub adjusting a light before recording
    caption: Optional visible caption
```

### Videos

```yaml
videos:
  - youtubeId: VIDEO_ID
    label: Finished production
    title: Accessible video title
    publishedAt: '2026-01-01'
    description: What this video demonstrates.
```

Use only the YouTube video ID:

```text
https://www.youtube.com/watch?v=Aml_gBJ06ms
                                      └─────────┘
                                      video ID
```

### Before and after videos

Use `comparisonRole` to place a video in the comparison section:

```yaml
videos:
  - youtubeId: BEFORE_VIDEO_ID
    label: Before working together
    title: Earlier production
    publishedAt: '2025-04-14'
    description: The production before my involvement.
    comparisonRole: before

  - youtubeId: AFTER_VIDEO_ID
    label: After production improvements
    title: Current production
    publishedAt: '2026-03-30'
    description: The result after improving the workflow.
    comparisonRole: after
```

Videos without a `comparisonRole` appear as milestone cards under the first
collaborations section.

## Adding a new portfolio project

1. Copy:

   ```text
   src/content/portfolio/PROJECT_TEMPLATE.mdx.example
   ```

2. Rename the copy using lowercase words separated by hyphens:

   ```text
   new-client.mdx
   ```

3. Fill in the frontmatter.

4. Write the project story below the frontmatter.

5. Add local images to:

   ```text
   public/previews/client-work/
   ```

6. Reference local images without including `public`:

   ```yaml
   thumbnail: /previews/client-work/new-client.webp
   ```

7. Choose an unused `order` number.

8. Format and build the project:

   ```bash
   npx prettier --write src/content/portfolio/new-client.mdx
   npm run build
   ```

9. Open the generated page:

   ```text
   http://localhost:4321/portfolio/new-client
   ```

The homepage card and project route are generated automatically.

## Content validation

The portfolio collection schema is defined in:

```text
src/content.config.ts
```

Astro validates every MDX file during development and builds. For example,
this is invalid:

```yaml
order: first
```

The correct value is numeric:

```yaml
order: 1
```

When content does not match the schema, Astro reports the project and field
that need attention.

If a new type of portfolio information is needed, such as a testimonial or
client location, update the schema first and then update the shared page
template to render it.

## Homepage configuration

Most homepage links and profile information live in:

```text
src/data/site.yaml
```

This file contains:

- Page title and description
- Profile image and social sharing image
- Social links
- Contact actions
- YouTube channel information
- Support and payment links

The file is parsed and typed by:

```text
src/lib/site-config.ts
```

The homepage itself is:

```text
src/pages/index.astro
```

It loads the site configuration and portfolio collection. Projects are sorted
by their `order` value before being passed to `PortfolioIndex.astro`.

## Shared portfolio page

The shared portfolio template is:

```text
src/pages/portfolio/[slug].astro
```

It is responsible for:

- Generating every portfolio route
- Page titles and SEO metadata
- Hero images
- Rendering the MDX body
- Services and project details
- Before and after video comparisons
- Collaboration milestone videos
- Outcomes
- Image galleries
- External project links

Edit an individual `.mdx` file to change one project. Edit `[slug].astro` only
when changing the design or behavior of every portfolio page.

Portfolio frontmatter can also include an optional `location` object with an
address, latitude, longitude, Plus Code, and Google Maps URL. When present, the
shared page renders a lazy-loaded OpenStreetMap preview and a Google Maps link.

## Images

### Public images

Images under `public/` are served directly from the site root.

```text
public/previews/client-work/example.webp
→ /previews/client-work/example.webp
```

Use this location for portfolio thumbnails, hero images, and gallery images
that are referenced by path in MDX frontmatter.

### Source images

The `src/image/` folder contains imported logos and other images used by the
application. These assets are resolved through the site configuration and
Astro's build process.

## YouTube data updater

The script:

```text
scripts/update-latest-youtube-video.mjs
```

reads channel information from `src/data/site.yaml`, fetches recent YouTube
metadata, and updates:

```text
src/data/latest-youtube-videos.json
```

Run it with:

```bash
npm run update:youtube
```

The script uses cached data when YouTube cannot be reached.

Portfolio videos are separate from this updater. Videos attached to a
portfolio case study are entered manually in that project's MDX frontmatter.

## AlphaBravoMedia redirect

AlphaBravoMedia is linked as Ayoub's business website, but it is not displayed
as a portfolio project.

The previous portfolio URL is preserved:

```text
/portfolio/alphabravomedia
→ https://alphabravomedia.co
```

The Astro redirect page is:

```text
src/pages/portfolio/alphabravomedia.astro
```

The Cloudflare-compatible redirect rules are:

```text
public/_redirects
```

## Styling

Global styles are in:

```text
src/styles.css
```

This file defines:

- Light and dark color tokens
- Typography
- Tailwind theme values
- Base styles
- MDX case-study styles under `.portfolio-prose`
- Reduced-motion behavior

The site follows the visitor's operating-system light or dark preference.

Portfolio heading and paragraph spacing is controlled by `.portfolio-prose`,
not by the number of blank lines in an MDX file. Markdown blank lines separate
content in the source, but they do not create extra visual space in the rendered
HTML. Adjust the shared prose rules when vertical rhythm needs to change so
every case study remains consistent.

## Development commands

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

The site will normally be available at:

```text
http://localhost:4321
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Update cached YouTube data:

```bash
npm run update:youtube
```

Format the repository:

```bash
npx prettier --write .
```

Run Astro CLI commands:

```bash
npm run astro -- --help
```

Use Astro's integration command when adding an Astro integration:

```bash
npm run astro -- add integration-name
```

## Before deploying

At minimum:

```bash
npm run verify
npm run audit:prod
```

Then check:

- Homepage cards are in the intended order
- New and edited portfolio URLs work
- Images load and have useful alternative text
- External links open the correct destination
- Mobile layout does not overflow horizontally
- Light and dark modes remain readable
- No browser console errors appear

## Deployment

- Domain: [ayoubabed.xyz](https://ayoubabed.xyz)
- Hosting: Cloudflare Pages/Workers
- Source: GitHub repository connected to Cloudflare
- Required Node version: 22 or newer
- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Build output directory: `dist`
- Production builds use the commands and dependencies in `package.json`

Pushing changes to the connected GitHub branch triggers the Cloudflare build
and deployment workflow. The repository does not deploy a second copy through
GitHub Pages.

## Accepted audit warnings

The site intentionally keeps its About and Contact information on the homepage
instead of creating separate routes. Squirrel may therefore report missing
dedicated About, Contact, and Privacy pages. These are accepted warnings for the
current release. The `sms:` contact action and LinkedIn's crawler response can
also appear as broken external links even when they work correctly for visitors.

## Notes for AI coding agents

Before changing the project:

1. Read `AGENTS.md`.
2. Read this README.
3. Preserve existing route slugs unless the user explicitly requests a URL
   change.
4. Treat `src/content/portfolio/*.mdx` as the source of truth for portfolio
   content.
5. Treat `src/content.config.ts` as the source of truth for valid portfolio
   fields.
6. Preserve user changes already present in the working tree.
7. Use the official Astro documentation for Astro APIs and Content Collection
   behavior.
8. Run formatting and `npm run build` after structural changes.
9. Verify affected pages in a browser at desktop and mobile widths.

Do not recreate `src/data/portfolio.ts`. The portfolio was intentionally
migrated from one TypeScript array to individual MDX Content Collection
entries.
