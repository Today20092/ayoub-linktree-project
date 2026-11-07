# Gallery interface verification

November 7, 2026. This report records the gallery design pass before the later
[Base UI migration](../../.migration/project.md). No deployment occurred.
During this design pass, Cnippet's new toggle controls used Base UI alongside the
then-existing Radix components. Registry provenance and adaptations are recorded in
[Website content](../website-content.md#gallery-browsing).

## Scope

The shared gallery page, sort/layout controls, favorites, selfie-search disclosure,
and photograph viewer. The design keeps photographs primary, groups related
controls, reduces duplicate introductory text, and gives mobile viewer images
the available width. Previous/next controls remain available without swiping.
Downloads, selection, search, pagination, and sharing retain their existing flows.

## Checks

- `npm run verify`: formatting, unit suites, Astro checks, and build.
- `scripts/gallery-design-browser.mjs`: local Edge at 320, 390, 768, and 1440
  CSS pixels in light and dark themes. Checks remembered layout, sort changes,
  favorites and accessible labels, keyboard opening/navigation/closing, focus
  return, image bounds, viewer text contrast, and reflow with 200% root text plus
  simultaneous text-spacing overrides, including expanded selfie search.
- `scripts/gallery-pagination-browser.mjs`: pagination and no-JavaScript
  browsing, six measurements across available manifest galleries.
- `scripts/gallery-continuous-browser.mjs`: automatic appending, filters,
  retry, overlapping requests, browser history, and earlier-photo prepending
  passed at 1440px and 390px.
- Screenshots and raw results are in the ignored `.wrangler/gallery-design-*`
  files. These are local evidence rather than published assets.
- A bounded local SquirrelScan inspected one gallery. It reported no image,
  mobile, or core accessibility errors. Its sitemap-domain error reflects the
  production-origin sitemap on localhost. Content, request-chain, and token-weight
  warnings remain; this scan is not a WCAG conformance evaluation.

## Limits

No physical-phone, screen-reader, axe, forced-colors, or actual 400% browser-zoom
evaluation. Browser viewport sizes simulate responsive layouts, not physical
devices. Selfie matching, share-sheet behavior, ZIP generation, and upload/admin
flows were not manually exercised. Existing React `FormEvent`, Shiki/CSP, and
large-bundle build advisories remain outside this gallery change.

## Repeat

Use the isolated local Worker and migrations from
[the local audit guide](../production-audit.md#build-and-isolated-storage).
Set `PLAYWRIGHT_MODULE` to an installed Playwright module and optionally
`GALLERY_TEST_URL` to that local origin, then run the two browser scripts above.
Restart the local Worker if rebuilding removes files it is currently serving.
