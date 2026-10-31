# Website content

## Homepage and link hub

Edit `src/data/site.yaml` for profile information, social and contact links, YouTube channels, and support links. `src/lib/site-config.ts` reads the configuration. `src/pages/index.astro` renders the homepage and loads portfolio cards through `src/components/PortfolioIndex.astro`.

Run `npm run update:youtube` to refresh `src/data/latest-youtube-videos.json`. The updater uses cached data when YouTube cannot be reached. Portfolio videos are entered separately in each project's MDX frontmatter.

Services, About, Contact, and Privacy have their own Astro pages under `src/pages/`. Payment configuration and hostname routing are covered in [payments.md](payments.md).

The instant event portraits page lives at `/services/event-portraits/`, with its content in `src/pages/services/event-portraits.astro`. It is public and indexable, included in the sitemap, and linked from the shared footer as "Event photography". It stays out of the main navigation. Starting prices are $400, $550, $700, and $850 for 1–4 hours, plus $150 for each extra hour. Larger or high-demand events receive a custom quote. The same offer is repeated in the page's structured data, `/index.md`, and `/llms.txt`. The parent `/services/` draft continues to redirect to the homepage.

## Portfolio case studies

Each project has an MDX file in `src/content/portfolio/`. `src/content.config.ts` validates the fields, and `src/pages/portfolio/[slug].astro` renders the shared layout. Consult the schema and template for supported fields.

To add a case study:

1. Copy `src/content/portfolio/PROJECT_TEMPLATE.mdx.example` to a lowercase, hyphenated `.mdx` filename in the same folder.
2. Fill in its frontmatter and write the case study below it. Choose its display order using existing projects as a reference.
3. Put local media in `src/assets/client-work/` and reference it relative to the MDX file, such as `../../assets/client-work/example.webp`.
4. Format the changed file and run `npm run verify`.
5. Check the homepage card and `/portfolio/<filename>/` page, including images, links, and mobile layout.

The filename determines the route slug. Preserve existing slugs, or add redirects when a URL change is intended. Edit the MDX file for one project's content; edit the shared template when the change applies to every case study.

Project pages introduce the title, summary, and role before the main media, followed by selected visuals or a link to the separate event gallery. Process, deliverables, credits, equipment, and supporting videos follow. Long stories with at least four level-two headings receive links to the work, results (when the story has a results heading) or delivery, and process. These anchors are generated from the content and shared sections; no per-project navigation configuration is needed.

Write past engagements in the past tense and bound channel-wide or "every episode" claims to the period actually covered. Analytics need a reporting window and scope; do not imply that channel-wide results are attributable only to Ayoub's work. Use each video's actual label, distinguish production roles from collaborators' editorial work, and keep runtime in the story rather than treating it as a project duration.

The portfolio was migrated from a TypeScript array to content collections. Keep MDX as its content source. AlphaBravoMedia links to the business website, and its old portfolio URL redirects through `src/pages/portfolio/alphabravomedia.astro` and `public/_redirects`.

## Images and styles

### Gallery browsing

Public event galleries render up to 40 photos per numbered page. Previous, Next, and numbered links work without JavaScript; shared photo links open the page containing that photo. Grid/Masonry views and photo-size controls scroll with the page. Layout and density are remembered per gallery in the current browser. Favorites are also stored in that browser; they are not synchronized between devices. **View favorites** loads favorites from every page and filters viewer navigation. Selfie results likewise load matches across the whole gallery, in match order; the viewer retains gallery-wide navigation. **Show all photos** or **Show page photos** restores the page you started from. Ordinary page navigation resets transient filters while preserving favorites and layout. Starting a selfie search leaves the favorites view; opening favorites clears the selfie search. Failed filter loading preserves the current photos and offers retry.

The photo viewer exposes **Save photo** directly. **Download all** downloads every gallery photo, regardless of favorites or selfie-search filters. It uses a prebuilt ZIP when configured; otherwise, the browser prepares a ZIP with progress and retry feedback, just as it does for favorites. Keep the page open while preparing a download. These browser-generated ZIPs use device memory; large galleries on limited-memory devices may need a prebuilt archive through `downloadAllUrl`. Successful preparation closes the progress dialog and shows a short confirmation. Support remains an optional link rather than a tipping dialog.

Uploaded-photo thumbnails use responsive WebP candidates through the existing `/_image/` endpoint. The shared gallery template uses Astro's `Image` component with an explicit `srcset` for dynamic R2 URLs. The viewer and downloads retain the original gallery image URL. Legacy remote images keep the established Astro optimization path without redundant `picture` wrappers. Hidden face-match badges are included only when the gallery supports selfie search.

### Content assets

Local content images belong in `src/assets/`, with portfolio media under `client-work/`. Content collection images use Astro's `image()` schema helper and the `Image` component. Imported logos and interface images also exist in `src/image/`.

Card and portfolio images bound their fallback `src` dimensions as well as their responsive candidates, so clients without `srcset` support do not download the full source. Preserve aspect ratios when setting explicit width and height; original gallery files remain available through the viewer and download links.

Use `public/` for files served unchanged, such as favicons, the web manifest, contact cards, redirects, and crawler files. Event photos uploaded through the dashboard or app belong in R2; see [gallery infrastructure](interactive-event-galleries.md).

`public/AGENTS.md` contains public website reading guidance, separate from repository
agent instructions. `public/.well-known/security.txt` directs security reports to
the published contact email without promising a response time or reward. Review its
contact details and renew its expiry before October 1, 2027.

`src/styles.css` contains shared colors, typography, theme rules, and portfolio prose styles. Adjust `.typeset-portfolio` for case-study spacing. Extra blank lines in MDX do not control rendered spacing. Check both light and dark themes after styling changes.

## Deployment watch paths

Cloudflare Build watch paths are dashboard settings, not Wrangler configuration. Documentation-only paths can be excluded there to avoid unnecessary builds. Keep content under `src/`, public assets, scripts, dependency manifests, and build configuration included. A blanket `*.md` exclusion can miss website content.

For release commands and preview/production boundaries, use the [root README](../README.md#releases-and-deployment) and [AGENTS.md](../AGENTS.md).
