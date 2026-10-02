# Website content

## Homepage and link hub

Edit `src/data/site.yaml` for profile information, social and contact links, YouTube channels, and support links. `src/lib/site-config.ts` reads the configuration. `src/pages/index.astro` renders the homepage and loads portfolio cards through `src/components/PortfolioIndex.astro`.

Run `npm run update:youtube` to refresh `src/data/latest-youtube-videos.json`. The updater uses cached data when YouTube cannot be reached. Portfolio videos are entered separately in each project's MDX frontmatter.

Services, About, Contact, and Privacy have their own Astro pages under `src/pages/`. Payment configuration and hostname routing are covered in [payments.md](payments.md).

The instant event photography rate page lives at `/services/event-portraits/`, with its content in `src/pages/services/event-portraits.astro`. The shared page footer, also rendered on the homepage below its support footer, links to it as "Event photography". It is omitted from the main navigation and sitemap, and marked `noindex`. Starting prices cover 1–4 hours; larger or high-demand events receive a custom quote. The parent `/services/` draft continues to redirect to the homepage.

## Portfolio case studies

Each project has an MDX file in `src/content/portfolio/`. `src/content.config.ts` validates the fields, and `src/pages/portfolio/[slug].astro` renders the shared layout. Consult the schema and template for supported fields.

To add a case study:

1. Copy `src/content/portfolio/PROJECT_TEMPLATE.mdx.example` to a lowercase, hyphenated `.mdx` filename in the same folder.
2. Fill in its frontmatter and write the case study below it. Choose its display order using existing projects as a reference.
3. Put local media in `src/assets/client-work/` and reference it relative to the MDX file, such as `../../assets/client-work/example.webp`.
4. Format the changed file and run `npm run verify`.
5. Check the homepage card and `/portfolio/<filename>/` page, including images, links, and mobile layout.

The filename determines the route slug. Preserve existing slugs, or add redirects when a URL change is intended. Edit the MDX file for one project's content; edit the shared template when the change applies to every case study.

The portfolio was migrated from a TypeScript array to content collections. Keep MDX as its content source. AlphaBravoMedia links to the business website, and its old portfolio URL redirects through `src/pages/portfolio/alphabravomedia.astro` and `public/_redirects`.

## Images and styles

Local content images belong in `src/assets/`, with portfolio media under `client-work/`. Content collection images use Astro's `image()` schema helper and the `Image` component. Imported logos and interface images also exist in `src/image/`.

Use `public/` for files served unchanged, such as favicons, the web manifest, contact cards, redirects, and crawler files. Event photos uploaded through the dashboard or app belong in R2; see [gallery infrastructure](interactive-event-galleries.md).

`src/styles.css` contains shared colors, typography, theme rules, and portfolio prose styles. Adjust `.typeset-portfolio` for case-study spacing. Extra blank lines in MDX do not control rendered spacing. Check both light and dark themes after styling changes.

## Deployment watch paths

Cloudflare Build watch paths are dashboard settings, not Wrangler configuration. Documentation-only paths can be excluded there to avoid unnecessary builds. Keep content under `src/`, public assets, scripts, dependency manifests, and build configuration included. A blanket `*.md` exclusion can miss website content.

For release commands and preview/production boundaries, use the [root README](../README.md#releases-and-deployment) and [AGENTS.md](../AGENTS.md).
