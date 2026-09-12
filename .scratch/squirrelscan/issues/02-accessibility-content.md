# Make public content and controls accessible

## What to build

Visitors can understand and operate public portfolio pages with accurate accessible names, readable links and text, named tables, and useful page descriptions, while preserving the site's existing design and factual content.

Source: the September 11, 2026 squirrelscan HTTP audit of https://ayoubabed.xyz, version 0.0.94, 26 pages, score 59. Work is local on the current feature branch; publishing and deployment are outside scope.

## Acceptance criteria

- [x] Investigate and fix applicable findings for `a11y/label-content-name-mismatch`, `a11y/color-contrast`, `a11y/image-redundant-alt`, `a11y/link-in-text-block`, `a11y/table-duplicate-name`, `perf/cls-hints`, `core/meta-description`, `content/keyword-stuffing`, and `content/word-count`.
- [x] Accessible names contain visible control labels, links in prose have a non-color cue, tables have useful names, and embeds reserve space where necessary.
- [x] Verify computed styling before treating heuristic contrast or layout warnings as confirmed defects.
- [x] Edit descriptions and copy only when useful and supported by existing facts. Do not pad photography galleries to an arbitrary word minimum or invent claims.
- [x] Record a disposition for every assigned rule, with evidence for false positives or deliberate deferrals. Do not suppress audit rules.
- [x] Run focused checks for changed behavior and verify the integrated result in a fresh local squirrelscan audit.

## Blocked by

None (can start immediately).

## Local completion

Implemented with GPT-5.6 Luna at high reasoning. Final `npm run verify` passes (48 existing tests, formatting, Astro check, build), plus 3 discovery/cache tests and the expanded gallery HTTP check. Built-browser theme, filter, lightbox navigation and keyboard focus checks pass.

Final one-time audit: 33 local preview pages, score 57, SEO 76, 3345 passed checks, 303 warnings, 68 failed checks. Production baseline was 26 pages, score 59, SEO 64. These scopes differ: localhost HTTP and production sitemap URLs create environment-only findings, and local admin pages are included. All 35 original rule IDs have evidence-backed dispositions across #47, #48, #49; 15 original rule types cleared. Public gallery images over 1 MB fell from 417 baseline resources to zero; tracked resources fell from 818071 KB to 51670 KB. Remaining heuristics and production-only validation are documented below.

Changes remain local and uncommitted on `codex/portfolio-ui-refinement`; no deployment was performed. This closes the local implementation/audit scope, not production rollout.

# Accessibility and content results

Baseline: September 11, 2026 squirrelscan HTTP audit, version 0.0.94, against `https://ayoubabed.xyz`.

## Changes

- Removed the portfolio pager `aria-label` overrides so each link's accessible name comes from its visible `Previous project` or `Next project` label and project title.
- Replaced the redundant `Screenshot of` homepage alt text with `Ayoubabed.xyz portfolio homepage`.
- Added `width="600"` and `height="450"` to the reusable OpenStreetMap iframe. The existing responsive container still controls its rendered size.
- Added unique accessible names, captions, column headers, and row headers to both data tables in the Chop Shop case study.
- Changed portfolio detail terms from `text-muted-foreground` to `text-foreground/70`. This keeps the small labels in the existing palette while increasing their contrast.
- Set the homepage description to 160 characters and set the affected portfolio SEO descriptions to 120 to 160 characters. The descriptions use facts already present in each case study.

## Rule dispositions

| Rule                               | Disposition and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y/label-content-name-mismatch` | Fixed in `src/pages/portfolio/[slug].astro` by removing the overriding labels. Local AX output now reports `Previous project Arqam Academy`, matching the visible label and title.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `a11y/color-contrast`              | Fixed for the owned portfolio detail terms with `text-foreground/70`: CSS-token contrast is approximately 7.45:1 in light mode and 8.77:1 in dark mode over the existing `bg-muted/50` surface. Base `text-muted-foreground` used by Header navigation and gallery metadata computes to 6.56:1 light and 9.85:1 dark against the page background (8.72:1 against the dark card), and gallery EventLightbox default, secondary, and outline buttons compute to 6.14:1/6.14:1, 16.04:1/14.56:1, and 19.75:1/18.92:1 across light/dark themes, so those warnings are false positives. The gallery Admin dashboard link has now removed its `/50` opacity; its base token passes at 6.56:1 light and 9.85:1 dark while retaining hover underline and focus styling. |
| `a11y/image-redundant-alt`         | Fixed in `src/content/portfolio/ai-built-website.mdx`. The homepage and case study now render `Ayoubabed.xyz portfolio homepage` without the redundant medium label.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `a11y/link-in-text-block`          | The three baseline items (`Home`, `Galleries`, and `Contact`) are Header navigation inside a labeled `<nav>`, so `no-underline` is a deliberate navigation treatment rather than a link embedded in prose. Portfolio MDX prose links receive the shared `.typeset a` dotted underline and focus outline, and portfolio breadcrumb links are explicitly underlined. Gallery breadcrumbs are also navigation and do not need prose-link styling.                                                                                                                                                                                                                                                                                                                  |
| `a11y/table-duplicate-name`        | Fixed in `src/content/portfolio/chop-shop-show-podcast.mdx`. The two tables have unique `aria-label` values and matching visually hidden captions. Local DOM output exposes both table names and proper column and row headers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `perf/cls-hints`                   | Fixed for the three affected portfolio map pages through the shared `PortfolioLocation` iframe dimensions. The YouTube component already reserves a 16:9 box with `aspect-video` before inserting its iframe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `core/meta-description`            | Fixed for the owned static/public descriptions: homepage 160 characters; affected portfolio descriptions 125, 134, 137, 141, and 155; galleries index 129. The three affected gallery routes emit dynamic D1 summaries of 178 (Sanad), 81 (Dawah), and 99 (Muslim Chamber) characters. These are unique, useful event-specific author summaries; `src/lib/gallery-read.ts` intentionally prioritizes `dynamicEvent.summary` over static MDX. Disposition: accepted scanner length heuristics for the gallery summaries, with no rendering or indexing defect identified.                                                                                                                                                                                        |
| `content/keyword-stuffing`         | Disposition: deliberate false positives. The reported terms are factual proper names (`community`, `firm`, `forno`, `grill`) or the service term `content`, repeated in titles, labels, image alternatives, and short descriptions at the reported 3.3% to 5.1% densities. Replacing those terms would reduce accuracy; no copy padding was added.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `content/word-count`               | Disposition: deliberate deferral for visual landing and gallery pages. The audit's generic 300-word minimum flags the homepage and event galleries, which intentionally prioritize navigation and photography. Adding filler would misrepresent the work and violate the ticket's instruction not to pad galleries.                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Validation

- Baseline keyword findings also included factual project terms (`ibrahim`, `law`, `lebanese`, `masjid`, `media`, `menu`, `podcast`, `portrait`, `school`, `social`, `tampa`, `temple`, `terrace`, `titletown`, `video`, and `yearbook`) plus generated image URL artifacts (`jpg`, `jpgf`, and `jpgp`); these are covered by the deliberate false-positive disposition above.
- Baseline word-count findings also covered 12 portfolio case-study pages at 68–288 words. They are curated visual project pages with structured media, details, and outcomes; the ticket prohibits filler and arbitrary minimums, so their concise copy remains a deliberate deferral.
- The table follow-up check confirms the first columns are row labels, so `<th scope="row">` is semantically correct alongside `<th scope="col">` headers; the th-has-data-cells warning is a scanner heuristic and needs no structural change.
- `npx prettier --write` completed for the changed Astro, MDX, YAML, and content files.
- Local browser AX output confirmed the pager name, both named tables, table headers, and the updated image alt text.
- Static CSS-token contrast calculation covered both themes: base muted text is 6.56:1 light / 9.85:1 dark (8.72:1 against the dark card); portfolio detail labels are 7.45:1 light / 8.77:1 dark; gallery default, secondary, and outline controls are 6.14:1/6.14:1, 16.04:1/14.56:1, and 19.75:1/18.92:1; the former gallery Admin dashboard `/50` treatment was 2.22:1 light / 3.17:1 dark and now uses the passing base token.
- `Invoke-WebRequest` returned the homepage at 200 and confirmed the labeled Primary navigation. Gallery route responses still contained the old 178/81/99-character descriptions, verifying the dynamic D1 precedence described in the meta-description disposition.
- Local HTTP responses confirmed the rendered homepage and affected portfolio meta descriptions at 160, 141, 125, 137, 134, 141, and 155 characters respectively; gallery responses retained the dynamic D1 summaries documented above.
- `npx astro check` reached the full project and found no diagnostics in the owned files. It remains red on concurrent work in `src/pages/services.astro` (`activeNav="services"`) and `src/pages/galleries/[slug]/index.astro` (`caption` type), which belong to other changes.
- Root should run the fresh integrated squirrelscan audit after the other ownership areas land.

Changed files:

- `src/pages/portfolio/[slug].astro`
- `src/components/PortfolioLocation.astro`
- `src/content/portfolio/ai-built-website.mdx`
- `src/content/portfolio/aya-academy.mdx`
- `src/content/portfolio/chop-shop-show-podcast.mdx`
- `src/content/portfolio/muslim-business-chamber-2026.mdx`
- `src/content/portfolio/sanad-silwadi-wedding.mdx`
- `src/content/portfolio/temple-terrace-community-open-house.mdx`
- `src/content/portfolio/ya-hala-the-joe-show.mdx`
- `src/data/site.yaml`
