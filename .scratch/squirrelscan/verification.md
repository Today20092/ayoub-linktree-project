# One-time squirrelscan verification

Implementation is local on `codex/portfolio-ui-refinement`. No commit, push,
merge, deployment, recurring audit, or permanent squirrelscan setup was made.
Three GPT-5.6 Luna agents with high reasoning handled GitHub issues #47, #48,
and #49 in parallel. The three rule reports cover all 35 baseline rule IDs
exactly once.

## Baseline and local audits

| Run                                  | Pages | Overall | SEO | Passed | Warnings | Failed |
| ------------------------------------ | ----: | ------: | --: | -----: | -------: | -----: |
| Production baseline                  |    26 |      59 |  64 |   2912 |      264 |     24 |
| Built localhost preview, first rerun |    33 |      53 |  71 |   3323 |      324 |     69 |
| Built localhost preview, final       |    33 |      57 |  76 |   3345 |      303 |     68 |

These scores are not directly comparable. Local HTTP adds HTTPS, HTTP/2,
compression, and production-domain sitemap findings. The local crawl also
includes four admin pages and three new information pages, and its gallery
data differs from production. The sitemap's new production URLs return 404
until deployment; the corresponding local routes return nonempty 200 pages.

The first local rerun cleared 15 original rule types: accessible label/name
matching, llms.txt, Markdown discovery, unique titles, duplicate titles and
descriptions, TTFB, layout-space hints, redundant image alt text, duplicate
table names, URL slugs, About, Contact, and both privacy-page rules.

It also exposed lossless WebP encoding in gallery previews. Merely bounding
their dimensions was insufficient: a complete check fetched 867 unique
rendered image candidates, all HTTP 200 WebP, and found oversized responses.
One 960px preview fell from 1,516,622 bytes to 139,736 bytes with quality 85.
Explicit quality 85 is now set on gallery grid previews and covered by the
regression check, including the formerly oversized night photograph. The
final audit found zero public gallery image resources over 1 MB, compared
with 417 oversized resources in the production baseline. Three remaining
resources over 1 MB belong to the local admin dashboard, outside the original
public-page scope. There are 28 image resources over 200 KB across public
pages, including one gallery; quality was not reduced solely to satisfy that
heuristic. Full-resolution viewing and download URLs are preserved.

Total tracked resource weight fell from 818,071 KB in the baseline to
51,670 KB in the final local audit. This is scanner resource accounting
across different page/data scopes, not a measured browser first-load saving.

## Verification evidence

- `npm run verify` passed using bundled Node 24: formatting, 48 existing
  tests, Astro check (zero errors/warnings), and the production build.
- Three new cache/discovery checks and the gallery HTTP regression check
  passed against the built preview. The gallery check also passed against
  the development server after its health endpoint returned `ok: true`.
- Built-browser checks passed: system theme, portfolio filtering from 20
  projects to eight photography projects, gallery open/next, Escape, and
  focus restoration to the original photograph link. No browser console
  warnings or errors were emitted during these checks.
- The built CSP contains the exact hash of the authored theme script and
  Astro's executable module scripts. The separate HTTP policy deliberately
  does not impose an incompatible script policy. Squirrelscan's header-only
  CSP warning does not account for the enforced meta policy.
- CSP allows the existing WASM face-analysis fallback and local blob image
  previews. No broad JavaScript evaluation or blob worker allowance was added.
- Social image dimensions now come from actual selected media metadata;
  the new information pages use the absolute 1200×630 social image URL.
- Final built responses for the homepage, all three information pages, and
  a portfolio page return the intended public 60-second browser/300-second
  shared-cache lifetime. The public gallery response remains uncached.
- Built `/galleries` redirects 301 to `/galleries/`; the three new information
  routes redirect 307 to their canonical trailing-slash paths.
- Build logs contain Cloudflare request-cancellation/network warnings near
  shutdown despite exit zero. All 616 output files were nonempty, and the
  preview's route checks and logs showed no matching runtime errors.

## Remaining limits

Full galleries retain large grids and hydration metadata so all photographs,
favorites, face search, and original downloads remain available. Concise
visual case studies are not padded to satisfy word-count heuristics. Shared
contrast tokens were checked numerically in both themes rather than changing
every class name flagged by the scanner. Tables retain correct row-header
semantics.

Gallery caching remains intentionally excluded because publication and
visibility can change. Dynamic third-party resources cannot receive stable
SRI hashes without changing their delivery. Production TLS, compression,
cache behavior, latency, and deployed sitemap availability require a later
production audit after an explicitly authorized deployment.

Raw reports are under
`C:/Users/User/AppData/Local/Temp/ayoub-squirrelscan-once-20260911/`.
The final reports are `local-final.json` and `local-final.llm`; full validation
output is `verify-complete.log`.
Per-rule evidence is in `gallery-results.md`, `accessibility-results.md`,
and `delivery-results.md` beside this file.
