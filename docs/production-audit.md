# Local production-build audit

This is the repeatable SquirrelScan baseline for issue #83. It audits the built
Astro Worker with local Cloudflare simulations. It does not deploy or publish
anything. Website fixes belong to #84; CI automation belongs to #85.

## Build and isolated storage

Run from the repository root with the Node/pnpm versions in `package.json`.
Use a separate port from any Astro development server. The recorded run used
`squirrelscan-90` at `412ea4a` (the event-portrait pricing/inquiry branch),
Astro 7.4.2, Wrangler 4.152.0, Node 26.3.0, and SquirrelScan 0.0.148.

```powershell
$env:WRANGLER_SEND_METRICS = 'false'
npm run build
pnpm exec wrangler d1 migrations apply GALLERY_DB --config scripts/audit/wrangler.jsonc --local --persist-to .wrangler/squirrelscan-state
pnpm exec wrangler dev --config scripts/audit/wrangler.jsonc --local --ip 127.0.0.1 --port 8788 --inspector-port 9238 --persist-to .wrangler/squirrelscan-state
```

Leave the last command running in its own terminal. Stop only that process when
finished. `scripts/audit/wrangler.jsonc` serves `dist/server/entry.mjs` and
`dist/client`, never Vite source modules. It has a dummy D1 UUID, audit-only R2
names, and a local Images binding. It has no account, remote bindings, Vectorize,
Access credentials, or production/preview identifiers. Always keep `--local`;
this configuration is solely for local use, never deployment.

The state directory is ignored and workspace-local. Start with a fresh directory
for the initial baseline; on later runs, reuse only the state created by this
procedure. Applying migrations is repeatable. Do not copy a production database
or point this procedure at a parent's Wrangler state. The baseline has an empty
managed-gallery database and the three manifest-backed galleries in the source
tree. No synthetic gallery is added to the listing or sitemap.

The first uninitialized run returned 500 for both `/galleries/` and
`/sitemap.xml`; the server logged missing D1 tables. Applying migrations
0001–0007 changed both to 200 without changing application code. A plain static
file server cannot supply these database-backed routes.

`/_astro/status` is the development-server readiness check. For this built
Worker, check the actual routes instead:

```powershell
curl.exe --fail http://127.0.0.1:8788/sitemap.xml
curl.exe --fail --output NUL http://127.0.0.1:8788/galleries/
curl.exe --fail --output NUL http://127.0.0.1:8788/galleries/dawah-at-tampa-riverwalk/
curl.exe --fail --output NUL http://127.0.0.1:8788/galleries/muslim-business-chamber-2026/
curl.exe --fail --output NUL http://127.0.0.1:8788/galleries/sanad-silwadi-wedding/
```

All must return 200. `/sitemap.xml` must include the three galleries and
`/services/event-portraits/`. An unknown gallery must return 404. No admin or
upload operation is needed. Localhost intentionally permits dashboard reads;
that does not test production Cloudflare Access.

### Optional local R2 and image-transform smoke check

This stores the existing social card under a test object key, without adding a
gallery/database row. It does not change crawl coverage or use remote R2.

```powershell
pnpm exec wrangler r2 object put squirrelscan-audit-public/events/squirrelscan-audit/photos/sample.jpg --file public/og-ayoub-digital-media.jpg --content-type image/jpeg --config scripts/audit/wrangler.jsonc --local --persist-to .wrangler/squirrelscan-state
curl.exe --fail --output NUL http://127.0.0.1:8788/api/gallery-media/events/squirrelscan-audit/photos/sample.jpg/
curl.exe --fail --output NUL 'http://127.0.0.1:8788/_image/?href=%2Fapi%2Fgallery-media%2Fevents%2Fsquirrelscan-audit%2Fphotos%2Fsample.jpg%2F&w=160&h=84&q=75'
```

The first response is JPEG; the second is WebP. Both returned 200 in the
baseline checks. Legacy gallery image URLs still reference the public photo
CDN. When the audited local `/_image/` endpoint transforms one of those URLs,
the local runtime can fetch the source image over the Internet. Local Images
processing uses no paid Cloudflare binding. This is an offline **scanner** audit,
not an air-gapped application test.

## Exact scan and artifacts

Use the same scanner version for comparisons. In PowerShell, the installed
binary used for the baseline is:

```powershell
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.148.exe --version
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.148.exe audit http://127.0.0.1:8788 --offline --no-publish --level full --max-pages 500 --http --passive --refresh --no-ignore --includePages --format json --output C:/Users/User/AppData/Local/Temp/squirrelscan-production-baseline.json
& C:/Users/User/AppData/Local/Temp/squirrel-0.0.148.exe report --input C:/Users/User/AppData/Local/Temp/squirrelscan-production-baseline.json --format html --output C:/Users/User/AppData/Local/Temp/squirrelscan-production-baseline.html
```

`--offline` disables cloud checks, rendering, telemetry, publication, and scanner
requests to other origins. `--no-publish` is explicit defense in depth.
`--passive` disables active security probes; discovery GETs still occur.
No rules or route patterns are excluded. `--no-ignore` prevents local waivers
from silently masking findings. The recorded run reported `Config defaults`
with no `squirrel.toml`. Check that remains true when reproducing. Preserve the
JSON, HTML, CLI log, build log, migration log, and coverage evidence together.
Do not overwrite these baseline files when making a comparison run.

Recorded artifacts outside the repository, under
`C:/Users/User/AppData/Local/Temp/`:

- `squirrelscan-production-baseline.json` and `.html`: unadjusted reports.
- `squirrelscan-production-audit.log`: exact offline run output.
- `squirrelscan-production-build.log`: production build output.
- `squirrelscan-production-server.log`: local runtime requests, including the
  deliberate pre-migration failures and subsequent smoke checks.
- `squirrelscan-local-migrations.log`: all seven local migrations applied.
- `squirrelscan-baseline-handoff.md`: detailed findings, checks, and resource
  coverage query for #84.

The original `rockfish-squirrelscan.json` and `.html` in that directory remain
unchanged. The scanner's local audit ID is
`9a00b449-6ecb-40c2-aad3-ad4a936f92ad`, timestamp
`2026-10-31T10:43:48.260Z`.

## Unadjusted baseline and coverage

| Metric                       | Recorded result                                               |
| ---------------------------- | ------------------------------------------------------------- |
| Overall                      | 67/100, grade D                                               |
| SEO                          | 72                                                            |
| Performance group            | 62                                                            |
| Security group               | 50                                                            |
| Agents group                 | 50                                                            |
| JSON summary                 | 3,849 passed; 241 warnings; 21 failed; 0 skipped              |
| Crawl                        | Completed; 35 URLs of a 500-page budget; 0 page failures      |
| HTML rules                   | 34 HTML pages evaluated, no rule-cache replays                |
| Other URL                    | One contact-card VCF, 200, no HTML rules                      |
| Scope                        | 29 public HTML pages, 5 localhost dashboard HTML pages, 1 VCF |
| Image resource measurements  | 500 records, all HTTP 200, 33,873,044 bytes                   |
| CSS resource measurements    | 1 record, HTTP 200, 99,109 bytes                              |
| Script analysis              | Report metadata says 2 scripts evaluated                      |
| Script/CSS/font status check | Scanner reports 3 checked, no broken resources                |
| External links               | 502 not checked by offline policy                             |

Resource numbers are the scanner's stored measurements, not complete browser
network coverage. Its parsed HTML contains 543 image elements, 540 distinct
`src` URLs, and 2,620 distinct `src`/`srcset` candidates. All 540 `src` URLs are
same-origin, often local optimizer URLs. Only 500 image URLs were sized; do not
interpret zero stored resource errors as full image coverage. Fontshare CSS and
font bytes, Cloudflare Analytics, embeds, and other third-party resources were
not fetched directly by the scanner. Browser rendering, hydration, visual
contrast, real viewport LCP, interaction timing, and authenticated workflows
were not tested.

The report JSON's `summary.skipped = 0` is not a coverage guarantee. The raw
scanner database contains additional `skipped` rule rows for unavailable or
inapplicable checks. The handoff documents those separately. The stored-report
console renders 240 warnings while the exported JSON records 241; retain the
original JSON as the comparison artifact instead of rewriting counts.

The old development report had 26 fetched URLs, four failed requests in its
crawl database, 46/100, nine scripts evaluated, and 184 skipped image-size
records. The new database has no skipped image-size records. Old skipped
examples contain `/@fs/` Vite image URLs; production uses emitted `/_astro/`
assets and working `/_image/` responses. This is a new production baseline,
not an apples-to-apples claim of a 21-point code improvement: source revision,
runtime, gallery availability, and route coverage differ.

## Interpreting findings for #84

Keep the report unchanged while triaging:

- **Confirmed markup/content candidates:** accessible-name mismatches in the
  shared YouTube embed on 15 portfolio pages; missing About/Contact schema;
  gallery breadcrumbs without BreadcrumbList schema; manifest missing
  `start_url` and disagreeing theme colors; two measured oversized Al Forno
  WebP images; metadata length warnings and small social-image dimensions.
- **Needs browser/semantic validation:** text-link styling, table header
  associations, above-fold lazy loading, preload hints, CSS request chains,
  and large gallery DOMs. Static scanner heuristics do not prove a visual or
  assistive-technology failure. Do not add preloads for every image or pad
  short case studies just to satisfy a rule.
- **Local origin limitations:** all 29 sitemap URLs correctly use the configured
  production origin. Localhost domain/coverage/orphan warnings follow from
  that deliberate origin mismatch; `/sitemap.xml` exists and returns valid XML.
  Do not change public canonicals or sitemap origin for this audit. Nine
  HTTPS/HTTP2/TLS/compression/cache-delivery rules are automatically not scored
  by SquirrelScan for private hosts. Production CDN behavior remains untested.
- **Local dashboard scope:** five admin HTML pages are reachable by design on
  loopback. They contribute content/metadata/noindex warnings. Production
  Access is not represented; do not weaken auth or remove noindex for scores.
- **Context-dependent warnings:** the portrait request form prepares an email;
  a missing-CAPTCHA heuristic does not establish a public submission endpoint.
  Fontshare and the self-updating Analytics script lack SRI; pinning an
  arbitrary live hash can break them. Security-contact and agent-document
  suggestions need a real operator policy; do not expose the repository's
  internal `AGENTS.md` as public content.

The production-build report does not reproduce the development-only missing
sitemap, gallery 500s, missing CSP/framing protection, or script-duplication
failures. CSP presence, frame-ancestors, and declared-resource compatibility pass
the static checks; actual embeds, analytics, and fonts still need browser
validation in #84. Preserve the existing portrait pricing/inquiry behavior.

## Sources and verification

The runtime procedure follows the installed Wrangler help and official
[Astro Cloudflare deployment guide](https://docs.astro.build/en/guides/deploy/cloudflare/),
[Cloudflare local development guide](https://developers.cloudflare.com/workers/local-development/),
and [D1 local migration guide](https://developers.cloudflare.com/d1/best-practices/local-development/).
The scanner behavior is documented by its installed `audit --help` and
[crawler settings](https://docs.squirrelscan.com/configuration/crawler).

For changes to this guide/configuration, format and check the explicit paths.
For application changes, run `npm run verify` and rerun the exact audit command
to new report filenames. Compare the page set and coverage before comparing
scores. Do not push, deploy, publish reports, or change live resources as part
of this procedure.
