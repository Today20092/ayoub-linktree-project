# Reduce gallery and image loading costs

## What to build

Visitors can browse public galleries and portfolio media without unnecessarily large image transfers or gallery markup, while retaining original downloads, full collection access, and accessible controls.

Source: the September 11, 2026 squirrelscan HTTP audit of https://ayoubabed.xyz, version 0.0.94, 26 pages, score 59, 24 failed checks and 264 warnings. Work is local on the current feature branch; publishing and deployment are outside scope.

## Acceptance criteria

- [x] Investigate and fix applicable findings for `images/image-file-size`, `perf/lcp-hints`, `perf/lazy-above-fold`, `perf/dom-size`, `perf/total-byte-weight`, `social/og-image-size`, and `ax/token-weight`.
- [x] Public gallery previews use appropriately sized optimized images; original downloads and full-resolution viewing still work. Local content images continue using Astro Image.
- [x] Reduce excessive initial gallery markup where feasible without hiding the collection from visitors or breaking selection, face search, or downloads.
- [x] Verify the actual media response behavior, not just image URL parameters. Preserve local/remote image handling and private gallery controls.
- [x] Record a disposition for every assigned rule, with evidence for any false positive or deliberate deferral. Do not suppress rules to inflate the score.
- [x] Add focused runnable regression coverage for changed logic and verify the integrated result in a fresh local squirrelscan audit.

## Blocked by

None (can start immediately).

## Local completion

Implemented with GPT-5.6 Luna at high reasoning. Final `npm run verify` passes (48 existing tests, formatting, Astro check, build), plus 3 discovery/cache tests and the expanded gallery HTTP check. Built-browser theme, filter, lightbox navigation and keyboard focus checks pass.

Final one-time audit: 33 local preview pages, score 57, SEO 76, 3345 passed checks, 303 warnings, 68 failed checks. Production baseline was 26 pages, score 59, SEO 64. These scopes differ: localhost HTTP and production sitemap URLs create environment-only findings, and local admin pages are included. All 35 original rule IDs have evidence-backed dispositions across #47, #48, #49; 15 original rule types cleared. Public gallery images over 1 MB fell from 417 baseline resources to zero; tracked resources fell from 818071 KB to 51670 KB. Remaining heuristics and production-only validation are documented below.

Changes remain local and uncommitted on `codex/portfolio-ui-refinement`; no deployment was performed. This closes the local implementation/audit scope, not production rollout.

# Gallery performance results

Scope: public gallery routes and the shared event lightbox. Private gallery
visibility, face search, favorites, original downloads, and the existing
`/api/download` path remain unchanged.

## Changes

- `src/pages/galleries/[slug]/index.astro` now sends the lightbox one reusable
  Astro `<Image>` preview. The client swaps that image to the selected
  original URL only after opening or navigating, and receives each image's
  dimensions, alt text, and caption for the swap. Gallery hero and grid
  previews are capped at 1280px and 960px respectively; grid srcsets use 480px
  and 960px variants. Gallery detail OG metadata now uses the selected hero's
  intrinsic dimensions.
- `src/components/EventLightbox.tsx` updates the reusable image's `src`,
  `srcset`, `sizes`, dimensions, alt text, and caption on navigation. Original
  URLs therefore remain available for full-resolution viewing and downloads.
  `onCloseAutoFocus` restores focus to the opening gallery link when it is
  still connected, while deep links retain the dialog's default fallback.
- `src/pages/galleries.astro` removes the opacity from the Admin dashboard
  link so its text meets contrast requirements.
- Portfolio and gallery index routes now pass the selected cover asset's
  intrinsic width and height to the shared Open Graph metadata.
- `scripts/gallery-performance.test.mjs` adds a runnable public-route check.

## Rule dispositions

| Rule                     | Disposition and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `images/image-file-size` | Fixed for initial gallery previews. The previous audit's 2400px lightbox variants (2.3–2.8 MB each) are no longer in gallery HTML. The focused test fetched the first preview for Dawah, Chamber, and Wedding: all returned HTTP 200 `image/webp` responses under 200 KB (54,826 bytes, 9,726 bytes, and 13,440 bytes in the current local run). Full originals are still fetched only when opened and remain used by download URLs.                                                                      |
| `perf/lcp-hints`         | Improved gallery detail LCP handling by marking the hero/flyer `<Image>` as `priority`; the gallery index already marks its first cover `priority` and emits `fetchpriority="high"`. The index still has no explicit preload link in dev output, so any remaining index LCP preload warning should be handled by the shared delivery/discovery owner rather than preloading an unoptimized remote original here.                                                                                          |
| `perf/lazy-above-fold`   | Gallery detail hero/flyer images now use `priority`. The reusable hidden lightbox preview and collection grid remain lazy by design because they are below the initial hero or user-triggered interaction.                                                                                                                                                                                                                                                                                                |
| `perf/dom-size`          | Reduced initial gallery markup by removing one server-rendered lightbox figure per image and retaining one reusable slide. Current local responses contain exactly one `data-gallery-slide`: Dawah 378,714 bytes / 60 images, Chamber 822,979 bytes / 169 images, Wedding 951,714 bytes / 203 images. The full public collection remains in the grid so browsing, face search, selection, and keyboard navigation do not lose photos.                                                                     |
| `perf/total-byte-weight` | Reduced initial image candidates and removed eager lightbox originals/variants. Actual preview fetches are modern WebP and below the 200 KB image warning threshold. The full cross-site tracked-resource total requires the parent agent's fresh integrated audit; remaining weight can include shared CSS, fonts, and intentional original downloads outside this slice.                                                                                                                                |
| `social/og-image-size`   | Gallery detail pages, the gallery index, and portfolio detail pages now pass actual cover/hero dimensions to `BaseLayout` instead of the previous 960x1200 fallback. Current local HTML reports 2400x1600 for the Dawah, Chamber, and Wedding gallery covers, 2400x1600 for the gallery index cover, and representative portfolio dimensions of 1024x700, 1280x720, 2400x1600, and 1280x800. Local source metadata supplies each selected asset's intrinsic dimensions; no image is upscaled or invented. |
| `ax/token-weight`        | Improved substantially by removing duplicate lightbox markup and reducing grid srcsets. Current local HTML is 378,714 / 822,979 / 951,714 bytes for the three public galleries. Large galleries can still exceed the scanner's 100,000-token heuristic because the complete collection and hydration metadata must remain available; further hiding or pagination would change the requested browsing behavior.                                                                                           |

## Verification

```text
node --test scripts/gallery-performance.test.mjs
✔ public galleries render one lightbox slide and bounded image variants
1 pass, 0 fail

pnpm exec astro check
0 errors, 0 warnings, 7 existing hints
```

The remaining Astro hints are in `scripts/gallery-prune-core.mjs`, admin
components, and `src/pages/services.astro`; none are in the gallery route or
`EventLightbox`.

The integrated browser check also opened photograph 1, navigated between
images, verified original source loading and updated alt/caption/dimensions,
toggled favorites, used ArrowLeft, and pressed Escape. After the close
transition, the live photograph 1 gallery link held focus again; a deep-link
open retains the dialog's default focus fallback.

## Built-preview candidate crawl

Against `http://localhost:4322`, a read-only crawl parsed only actual `<img>`
`src` and `srcset` URLs from the three public gallery pages (download anchors
were excluded). Six concurrent workers fetched all 867 unique optimized
candidates; every response was HTTP 200 with `image/webp`.

| Gallery                      | HTML bytes | Candidates | Total candidate bytes | Max candidate | >200 KB | >1 MB |
| ---------------------------- | ---------: | ---------: | --------------------: | ------------: | ------: | ----: |
| Dawah at Tampa Riverwalk     |    253,393 |        121 |            56,978,736 |     1,516,622 |      77 |    16 |
| Muslim Business Chamber 2026 |    694,490 |        339 |           158,171,081 |     1,174,826 |     260 |    29 |
| Sanad Silwadi Wedding        |    822,273 |        407 |           210,069,416 |     1,269,314 |     332 |    31 |

The remaining oversized responses are caused by emitted grid URLs without a
quality parameter: a representative 960x1440 candidate returned WebP
VP8L/lossless at 1,516,622 bytes. The same source and dimensions returned
139,736 bytes with `q=85` and 73,878 bytes with `q=75`. The focused regression
test checks only each route's first preview, so this full candidate crawl is
the stronger evidence for the outstanding `images/image-file-size` and
`perf/total-byte-weight` findings. The source fix should add an explicit
quality value to gallery grid previews has now been applied. The post-quality
candidate crawl below records the measured result before the final built audit.

The explicit grid \`quality={85}\` correction is now applied. The earlier
sample figures in the rule table describe only the first preview from each
route; they must not be read as an all-candidate claim. A post-correction
all-candidate crawl is in progress against the dev server, and the final
built-preview audit is the authoritative integrated result.

The post-quality dev recheck at http://localhost:4321 fetched 864 unique
candidates with six concurrent workers; every response was HTTP 200
image/webp. Dawah had 120 candidates totaling 6,842,816 bytes (max 145,840;
0 over 200 KB or 1 MB), Chamber had 338 totaling 17,137,352 bytes (max
211,518; 3 over 200 KB; 0 over 1 MB), and Wedding had 406 totaling 19,959,098
bytes (max 185,462; 0 over 200 KB or 1 MB). The three Chamber exceptions are
complex q85 frames just above the scanner threshold; no public gallery
candidate exceeded 1 MB after the correction.

The final built audit covered 33 pages: public galleries had zero image
responses over 1 MB, with the remaining three over-1 MB responses confined to
/admin/galleries outside the public gallery scope. Total tracked resources
fell to 51,670 KB from the 818,071 KB baseline.
