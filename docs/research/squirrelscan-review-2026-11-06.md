# Local SquirrelScan review — November 6, 2026

## Mobile Support follow-up

After the homepage Support layout fix, a fresh local SquirrelScan 0.0.171 run at **concurrency one** returned **88/100 (B), 5,136 passed checks, 188 warnings and zero failures** without audit exceptions. The corresponding contextual run returned **90/100 (A), 5,180 passed checks, 144 warnings and zero failures**, using the same exact-host Cloudflare analytics exception described below. Both scanned 45 local URLs with the local-origin build, offline/passive HTTP mode, a 500-page limit, refreshed checks, no ignored findings and no publishing.

The earlier follow-up attempts at concurrency two are preserved: `support-fix-unadjusted.json` had five TTFB failures, and `support-fix-unadjusted-idle.json` had ten. Reported response times were roughly 1012–1222ms. Direct serial document requests to representative affected pages returned headers in 38–137ms; a full scan at concurrency one then cleared the timing failures. This documents local simulator/crawl sensitivity, not a source-level speed improvement or a production performance guarantee. Concurrency differs from the earlier final runs below, so keep that environment change explicit in comparisons.

Current artifacts under `.astro/squirrelscan-2026-11-06/`:

- `support-fix-serial.json`, `support-fix-serial.log` and `support-fix-unadjusted.html`: final unadjusted serial scan.
- `support-fix-context.json`, `support-fix-context.log` and `support-fix-report.html`: final contextual serial scan.
- `support-fix-verify.log` and `support-fix-built-browser.log`: full verification and 35/35 browser groups, including 28 Support viewport/theme/text combinations.

The scan commands below remain applicable with `--concurrency 1` and these output paths. Original reports are retained. Nothing was deployed, and live production/physical-device behavior was not verified.

## Implementation follow-up

Implemented the actionable findings and repeated SquirrelScan **0.0.171** locally. The final contextual score is **90/100 (A)**, with **5,180 passed checks, 144 warnings and zero failures**. The same build without the vendor-specific audit configuration scores **88/100**, with **5,136 passed checks, 188 warnings and zero failures**. No application dependencies, production data changes, deployment, cloud audit or report publication were involved.

| Stage                                                    | Score | What changed                                                                                                        |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| Original local audit                                     | 76    | Preserved baseline below.                                                                                           |
| Application fixes, production-origin build               | 84    | Metadata, links, image discovery/loading and social cards. The local/production sitemap mismatch remains.           |
| Dedicated local-origin build, unadjusted scanner         | 88    | Includes the final thumbnail-row fix and an audit origin matching localhost; production configuration is unchanged. |
| Local-origin build, documented Cloudflare beacon context | 90    | One exact-host SRI exemption, with no excluded rules or pages.                                                      |

The stages distinguish application improvements from audit-environment corrections. They are not a production performance benchmark. Every scan uses `--no-ignore`; the optional contextual configuration is explicit, and the unadjusted report remains available.

### Changes and evidence

- **Gallery metadata:** shorter event/page titles, unique photo-range descriptions, and descriptive previous/next links. Existing canonicals, pagination, authorization and indexability are preserved.
- **Image discovery/loading:** responsive head preloads match the actual rendered image URLs, `srcset`, sizes, quality, fit and position. Homepage preload is restricted to desktop widths; uploaded R2 gallery heroes retain their existing eager, high-priority custom-optimizer path. The first three listing/admin covers and first five main gallery thumbnails load eagerly; only the leading cover receives high priority. Later photos stay lazy.
- **Navigation and labels:** primary navigation is visibly underlined, About has descriptive editorial inbound links, and gallery/proof links have contextual accessible names.
- **Social images:** shared fallback dimensions now match the branded 1200×630 asset; admin pages use that asset explicitly.
- **Public delivery link:** the photography proof gallery uses its public production URL on every environment. It is absent from the isolated local database; the change avoids promising a local copy while preserving its production destination. `/index.md` and `/llms.txt` retain that destination while other site links follow the build origin. Its live availability was not checked by this offline audit.
- **Cloudflare SRI:** `scripts/audit/squirrel.toml` exempts only `static.cloudflareinsights.com`. [Cloudflare documents that manually embedded analytics cannot safely use a fixed integrity hash without version pinning](https://developers.cloudflare.com/web-analytics/faq/#how-can-i-enforce-subresource-integrity-sri-with-the-js-beacon); [SquirrelScan supports an exact-host exception for scripts updated in place](https://squirrelscan.com/releases/0.0.117). This changes audit interpretation, not application security.

`npm run verify` passed after the final source changes (formatting, project test suites, Astro checks and build). All **18 focused HTTP tests** and **34 browser checks** passed. The HTTP checks cover pagination metadata, exact responsive preload matching, eager first rows, public proof URLs and the previous public-page regressions. Browser checks cover responsive accessibility; the separate gallery pagination/no-JavaScript check also passed six measurements. Logs and reports are retained under `.astro/squirrelscan-2026-11-06/`.

### Remaining warnings

The remaining 144 warning occurrences span eleven rule groups, rather than 144 distinct defects:

- Five deliberately private admin pages are `noindex`; their internal-link warnings are also expected. Public galleries remain indexable.
- The inquiry form prepares an email draft and does not submit to a server. Adding a CAPTCHA would not protect an existing submission endpoint.
- Short content, repeated gallery/UI labels and low visible-text-to-markup ratios are heuristics on a photo-delivery/link-hub site. Do not pad pages, remove necessary controls or hide public work to raise these scores.
- Shared CSS is render blocking by design. Local browser measurements did not establish a reason to defer it and introduce unstyled content.
- One static LCP-preload suggestion remains on the private admin gallery listing. Its leading cover is eager and high priority; an additional head preload was not justified by the local measurements.
- Static lazy-image guesses need viewport evidence. Tall-phone inspection found and corrected the first main thumbnail row; listing/admin cover rows were also corrected. A final check covered all 15 flagged routes from the pre-thumbnail scan plus the two gallery listings at **390×900 and 1280×900** (34 route/viewport checks). No visible gallery/listing image remained marked lazy. Three homepage masonry cards retained native lazy loading, and all three had loaded without scrolling. Eagerly fetching every full-size card would increase work on phones.
- The table warning flags column headers above intentional row-header cells. Keep the existing semantic `th scope="row"` cells and accessible table structure.
- Four anchor-text heuristics remain on contextual gallery links; their accessible labels include the destination event.

This is the highest justified score from the current findings without padding content, weakening semantics, removing features or excluding whole rules/pages. A static 100 in the scanner's Accessibility category is not a WCAG conformance claim.

### Final reproduction and artifacts

Follow [the origin-aligned local build instructions](../production-audit.md#origin-aligned-local-scans), restart the isolated local Worker if rebuilding invalidates its generated chunks, and run scans serially while browser checks are idle:

```powershell
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.171.exe audit http://127.0.0.1:8788 --offline --no-publish --level full --max-pages 500 --http --passive --refresh --no-ignore --includePages --concurrency 2 --format json --output .astro/squirrelscan-2026-11-06/final-unadjusted-serial.json
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.171.exe --config-file scripts/audit/squirrel.toml audit http://127.0.0.1:8788 --offline --no-publish --level full --max-pages 500 --http --passive --refresh --no-ignore --includePages --concurrency 2 --format json --output .astro/squirrelscan-2026-11-06/final-context.json
```

Final artifacts:

- `.astro/squirrelscan-2026-11-06/final-report.html` and `final-context.json`: contextual final report.
- `.astro/squirrelscan-2026-11-06/final-unadjusted.html` and `final-unadjusted-serial.json`: final unadjusted comparison.
- `.astro/squirrelscan-2026-11-06/final-source.json`: application-fix stage before the dedicated local-origin build.
- `.astro/squirrelscan-2026-11-06/fixes-verify.log`, `final-http.log`, `fixes-browser.log` and `fixes-pagination.log`: verification evidence.

Intermediate runs are retained too. Running immediately after a build or simultaneously with browser/HTTP checks produced local simulator TTFB warnings/failures (roughly 1007–1364 ms); serial idle scans at concurrency two cleared them. Repeated warmed document requests were 6–69 ms, with one first homepage request of 165 ms. These observations describe local test contention, not production TTFB or Core Web Vitals. Under-load before/after browser measurements are not used to claim a speed improvement.

No live CDN/network audit, production authenticated flow, physical-device or screen-reader verification was performed. The original baseline below is retained unchanged apart from this historical framing.

## Original baseline

Ran SquirrelScan **0.0.171** against the then-current production build at `http://127.0.0.1:8788`, using the existing isolated local audit Worker. The original scan completed in **41.3 seconds**, before the implementation follow-up above.

## Result

Raw overall score: **76/100, grade C**. The exported summary reports **4,968 passed checks, 308 warnings and 2 failures**. These are check occurrences across pages, not 308 distinct repair tasks. Findings are grouped into **21 rule groups**. The scanner's Accessibility category is **87/100**; this static score is not a WCAG evaluation and does not replace the separate Playwright/axe work.

The two failures are local-environment limitations, rather than demonstrated production defects:

1. **`crawl/sitemap-domain`:** all 39 sitemap URLs correctly use the production origin `https://ayoubabed.xyz`, while the audit origin is localhost. The scanner treats that as a cross-domain sitemap. Related sitemap-coverage warnings follow from the same mismatch. Do not change production canonicals or sitemap URLs to localhost to satisfy this report. A separately built audit-origin version can remove this source of noise in a future run.
2. **`links/broken-links`:** the photography page links to `/galleries/angels-birthday-party-2026/`, which returns 404 in the local database. It is a managed-gallery destination absent from this isolated dataset. This run does not establish whether the live link is broken; production was not scanned and production data was not copied locally.

## Recommendations worth considering

| Priority | Recommendation from the scan                                                     | Evidence and interpretation                                                                                                                                                                                                                                                                                          | Appropriate next step                                                                                                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First    | Improve gallery pagination metadata                                              | Four Muslim Business Chamber continuation pages have 78-character titles. Three descriptions are duplicated across 13 gallery pages. These are observed metadata properties; the length threshold is a heuristic.                                                                                                    | Shorten continuation titles while retaining event identity and page number. Consider a page-specific photo range/count in each description. Preserve the existing pagination canonicals and indexability contract.                                                   |
| First    | Check image loading and render-blocking resources with browser performance tools | Missing likely-LCP preload on 36 pages; suspected above-fold lazy images on 17 pages; one or two CSS request chains on 44 pages. HTTP-only scanning cannot identify the actual viewport LCP or prove that a flagged thumbnail is above the fold.                                                                     | Profile representative homepage, photography, portfolio and gallery pages in a real browser. Fix the measured LCP resource and genuinely visible lazy images. Do not preload every image or remove shared CSS merely because a normal stylesheet is render-blocking. |
| Next     | Reduce unnecessary HTML weight where useful                                      | `ax/token-weight` warns on 41 pages: visible text is under 15% of HTML. Utility classes, gallery image markup and hydration may contribute. This ratio does not measure transfer performance or readability by itself.                                                                                               | Measure HTML bytes and repeated/hydration markup on representative routes. Keep semantic controls and accessible names. Existing `/index.md` and `/llms.txt` already provide discovery alternatives; add per-page Markdown only if a concrete use warrants it.       |
| Optional | Give About an editorial inbound link                                             | About is flagged as receiving only sitewide navigation links.                                                                                                                                                                                                                                                        | Add a descriptive body link where it naturally helps visitors learn about Ayoub. Do not add unrelated links to raise a score.                                                                                                                                        |
| Optional | Make pagination link names more explicit                                         | “Next” and “Previous” are flagged as generic link text on 13 gallery pages. “Load earlier photos” is also flagged for sharing no words with an event's title. The source already places pagination in `nav aria-label="Photo pages"` and uses `rel="prev"` / `rel="next"`; names are understandable in that context. | “Next photo page” / “Previous photo page,” or page-number names, could improve an out-of-context link list. The title-word-overlap warning alone is not evidence that “Load earlier photos” is wrong.                                                                |

## Warnings to interpret rather than apply automatically

| Scanner warning                              | Current interpretation                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `a11y/link-in-text-block`, 44 pages          | The five repeated names are **About, Contact, Event photography, Galleries and Home**. These are shared navigation, not ordinary links embedded in prose. The rule's text-block classification needs semantic/rendered verification; navigation does not require a prose-link treatment solely to clear this warning. Shared footer links separately have explicit underline classes.                                                                        |
| `a11y/th-has-data-cells`, one portfolio page | It flags **Metric** and **Short**, the first column headers in the Chop Shop tables. Their body cells are intentional `th scope="row"` headers; the adjacent value cells are `td`, and the top headers have `scope="col"`. This looks like the heuristic rejecting a row-header column, not evidence that these data tables should become layout/presentation tables. Preserve their semantics; confirm actual screen-reader associations before any change. |
| `security/form-captcha`, photography inquiry | The form prepares an email draft in the browser rather than posting a public inquiry to a server. CAPTCHA is not justified by the presence of a form alone.                                                                                                                                                                                                                                                                                                  |
| `security/sri`, 44 pages                     | A cross-origin resource is unpinned. The site's Cloudflare analytics beacon is self-updating; an arbitrary integrity hash can break it. Review the actual resource and policy rather than pinning a live analytics response.                                                                                                                                                                                                                                 |
| `core/robots-meta`, five pages               | Local admin pages intentionally send `noindex,nofollow`. Keep those directives and authentication boundaries.                                                                                                                                                                                                                                                                                                                                                |
| Weak internal links, four pages              | Samples include admin detail and pairing pages. These operational pages do not need SEO links to improve their ranking. Review public routes separately.                                                                                                                                                                                                                                                                                                     |
| Small social card, five pages                | Samples are admin pages; the report sees default 960×1200 metadata there. Public portfolio social images already have dedicated output. This is a low-priority admin-sharing polish item, not a reason to change every site's image.                                                                                                                                                                                                                         |
| Thin content, 28 pages                       | The reported 57–281-word pages include the link hub and image galleries. Their job is navigation or photo delivery. Do not pad them to 300/500 words or noindex useful galleries based on a generic word-count claim.                                                                                                                                                                                                                                        |
| Keyword stuffing, 19 pages                   | Repeated photo labels, gallery navigation and category names can trigger frequency heuristics. Review actual prose before editing; the scanner does not establish a search-engine penalty.                                                                                                                                                                                                                                                                   |

## Coverage and limitations

- **46 local URL fetches:** 45 returned 200 and one returned 404. Of these, **44 HTML pages** had rules evaluated, with zero cached-rule replays. The other two were the contact-card VCF and the missing managed gallery. The HTML set includes five localhost dashboard pages and 39 public HTML pages, including numbered gallery continuations.
- The exported `pages` array has **85 records**: the 46 local URLs plus **39 production-origin sitemap entries with status 0**. Those foreign-origin entries were blocked by offline policy, not observed network failures. The sitemap-coverage check separately reports 29 sitemap URLs not crawled; retain that raw diagnostic rather than treating its count as a new HTTP failure count.
- The report records **271 executed rules** and **2 scripts evaluated**. It also reports skipped/not-applicable coverage outside the summary's `skipped: 0`: **nine transport/delivery rules are not applicable on a private target**, and external-link checking is explicitly not checked.
- HTTPS/TLS, HSTS, HTTP/2, compression and CDN caching were not assessed locally. No cloud rendering, AI analysis, external dead-link verification, real Core Web Vitals, authenticated production flows, browser hydration or physical-device accessibility evaluation was performed by this scan.
- Local image optimization may fetch legacy source photos from the photo CDN. `--offline` limits the scanner's requests; it does not make the locally served application air-gapped.
- No synthetic gallery was inserted for this scan. Source-file timestamps were checked against the built Worker and no source file was newer. The checked working tree includes the uncommitted accessibility implementation based on HEAD `9f02682`.
- Earlier reports used another scanner version and page set. This is not an apples-to-apples score comparison. The exported original baseline files were not overwritten. The CLI log notes its normal database retention retired one older stored crawl; that is separate from the preserved exported reports.

## Reproduction and artifacts

The target followed [the existing local audit workflow](../production-audit.md), with `scripts/audit/wrangler.jsonc`: dummy D1 UUID, local audit R2 names and a local Images binding. The current server uses `.wrangler/web-ui-review-state`, whose temporary accessibility fixtures had already been removed. Public gallery and sitemap routes returned 200 before scanning, the missing-gallery route returned 404, and the sitemap contained no test-fixture URLs. No remote D1/R2 resources were targeted.

Used the standalone official Windows binary without changing the globally installed scanner. Its SHA-256 matched the publisher's checksum:

```text
b6302a9f8bf0d6b434c904024dd5b6b32e79b4d7ec570dab3320970ac7fdd6b0
```

Exact audit and export commands:

```powershell
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.171.exe audit http://127.0.0.1:8788 --offline --no-publish --level full --max-pages 500 --http --passive --refresh --no-ignore --includePages --format json --output .astro/squirrelscan-2026-11-06/report.json
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.171.exe report --input .astro/squirrelscan-2026-11-06/report.json --format html --output .astro/squirrelscan-2026-11-06/report.html
```

Both commands exited 0. Scan configuration was reported as **defaults**, with a fresh crawl and no ignored findings. Local artifacts:

- `.astro/squirrelscan-2026-11-06/report.html`: self-contained original HTML report.
- `.astro/squirrelscan-2026-11-06/report.json`: original machine-readable findings and coverage.
- `.astro/squirrelscan-2026-11-06/scan.log`: exact scan log.
- This Markdown: interpretation and prioritized recommendations. It does not change or suppress the raw findings.

During the original baseline-only phase, only this review document was added to tracked project content. Application changes and their verification are recorded in the implementation follow-up above.

Publisher references: [SquirrelScan download and checksum](https://squirrelscan.com/download), [official source](https://github.com/squirrelscan/squirrelscan), and [CLI documentation](https://docs.squirrelscan.com/). Installed 0.0.171 CLI help verified the offline, passive and no-publish flags used here.
