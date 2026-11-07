# Gallery controls and selection follow-up

November 7, 2026. Implemented the six requested improvements using the installed
Cnippet toggle groups, shared Base UI buttons, and existing gallery workflows.
Previous design and migration work remains uncommitted; nothing was deployed.

## Changes and reference

- Thumbnail favorites have a 32px visible circle inside the existing 44px tap
  target at default text size. Selected hearts are filled; image-center taps
  continue opening photographs.
- Sort remains visible. View contains Grid, Natural layout, its explanation,
  and photo-size controls. Existing `masonry` preferences remain compatible.
- View follows the [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/):
  a native button exposes `aria-expanded` and `aria-controls`; options remain
  hidden until expanded. Enter/Space toggle it; Escape returns focus to View.
  The button stays in place while its panel expands underneath the controls.
- Favorites, Download selected and Clear live in one fixed selection bar with
  an announced count and Saved on this device. The previous duplicate toolbar
  selection actions were removed. Clearing returns focus to the gallery controls.
- The bar respects the bottom safe area. Its measured height reserves scroll
  space; its height is bounded to half the viewport with internal scrolling so
  enlarged text does not cover the whole gallery.
- Save photo retains its visible text in the mobile viewer. Download ZIP still
  means the whole gallery; Download selected uses the existing favorites ZIP.

## Automated checks

`npm run test:ui` runs four component-level checks and is included in
`npm run verify`. They cover disclosure state/panel relationships, command vs
submit/link semantics, progress values, and checkbox labeling/form output.
`verify` additionally runs the existing gallery/face/tracker suites, formatting,
Astro typechecks and the production build.

Browser checks are automated Playwright scripts run on demand against an
isolated local Worker; they are not automatically run by the current CI workflows:

- `node scripts/gallery-design-browser.mjs`: 320, 390, 768 and 1440px in both
  themes; stable View position, keyboard disclosure/focus, layout persistence,
  resizing, favorite target/circle dimensions, actual icon/selected-sort/viewer
  contrast, selection filtering, visible Save photo, unobscured focused photo,
  and clear-selection focus. It checks 200% root text plus simultaneous spacing
  overrides with View and selfie search expanded, and captures screenshots.
- `node scripts/gallery-pagination-browser.mjs`: pagination, cross-page favorites,
  selected/all downloads, shared-photo navigation and no-JavaScript browsing.
- `node scripts/base-ui-gallery-browser.mjs`: ZIP success, failure recovery and
  viewer-to-preparation focus handoff, with delayed synthetic fetch responses
  and pending Escape/backdrop dismissal guards.

Set `PLAYWRIGHT_MODULE` to an installed Playwright module. The default browser
test origin is `http://127.0.0.1:8788`; override it with `GALLERY_TEST_URL`.
Follow [the isolated local audit setup](../production-audit.md#build-and-isolated-storage).

## Results and limits

The full verification suite passed, including four UI component tests. All eight
responsive/theme browser combinations passed, including the stable trigger,
unobscured photo focus, contrast and enlarged-text assertions. Pagination and
no-JavaScript checks passed with six measurements. ZIP success, failure and
viewer-handoff checks also passed. Continuous scrolling, filters, retry,
overlapping requests, history and prepending checks passed at 1440px and 390px.
Changed-file formatting and `git diff --check` passed. Evidence lives in ignored
`.wrangler/gallery-polish-*` logs and `.wrangler/gallery-design-*` screenshots.

The Astro development toolbar intercepted some early dev-server test clicks;
the final browser gate uses the built Worker, which does not include that toolbar.
The user-requested Tailscale dev server remains available separately.

A fresh one-page local SquirrelScan completed. It retained the expected
production-sitemap/local-origin mismatch and content/performance/token-weight
warnings; it found no new core accessibility or mobile error. This bounded
static scan does not cover the interactive behavior or establish conformance.

No axe integration, pixel-diff screenshot baseline, physical-phone or
screen-reader evaluation is claimed. Actual 400% browser zoom and forced colors
have not been evaluated. This targets WCAG 2.2 AA within the changed scope and
does not establish whole-gallery conformance. Screenshot review and automated
checks complement the user's physical-phone screenshots; they do not replace
real device and assistive-technology evaluation.
