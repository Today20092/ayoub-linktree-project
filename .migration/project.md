# Base UI migration

November 7, 2026. Full project migration on `codex/base-ui-migration`.
All ten Radix wrappers were migrated while retaining the gallery redesign and
other existing working-tree changes. The user explicitly chose no commits,
overriding the migration skill's clean-tree and per-component commit workflow.
Nothing was pushed, merged or deployed.

## Dependency and configuration changes

- `@base-ui/react` 1.9.0 was already installed for the Cnippet gallery toggles.
- `components.json` now selects `base-rhea`, keeping the existing theme and icons.
- The `radix-ui` dependency and its unused transitive packages were removed through
  pnpm; the lockfile was updated.
- Calendar/react-day-picker, Sonner, and other non-Radix components were retained.
- The CLI-fetched Radix/Base registry pairs informed each migration. Customized
  wrappers kept their local classes rather than receiving wholesale replacements.

## Application sweep

All former `asChild` anchor compositions became native anchors with the existing
button variants. This preserves native link semantics; Base UI Button is used for
commands. The FAQ uses Base UI accordion defaults. The photograph viewer uses
Base UI focus/dismissal props and keeps its full-screen layout. ZIP preparation
rejects dismissal until it finishes. Upload progress received an accessible name.

The source/configuration/dependency sweep found no remaining `radix-ui`,
`@radix-ui`, `--radix-`, `asChild`, or `IconPlaceholder` references in the migrated
application. Per-component reports document exact responsibilities and behavior
changes. There is deliberately no separate migration index.

## Behavior changes

- Buttons default to `type="button"`; intended form submitters already declare
  `type="submit"`.
- Separators are semantic by default in Base UI.
- Accordion values use arrays; the installed accordion has no arrow-key roving
  focus. Tab and Enter/Space remain available.
- Menu checkbox/radio selections remain open by default. No current application
  route consumes the menu; a browser fixture verifies its exported API.
- Touch-opened dialogs normally focus the popup. Viewer focus restoration and
  pending-download guards are explicitly retained.
- Progress now receives the supplied value and exposes its numeric accessible
  state instead of discarding the value at the wrapper boundary.

## Verification

Baseline typecheck and production build passed before migration. Focused checks
passed for each wrapper, and integrated Astro checks/builds passed. Final results:

- `npm run verify`: passed, including the three new UI tests and existing suites.
  Astro reported no errors or warnings and the five existing FormEvent hints.
- `scripts/base-ui-browser.mjs`: passed form/link/checkbox/accordion/menu/progress
  runtime checks with no page errors.
- `scripts/base-ui-gallery-browser.mjs`: passed ZIP success, failure and
  viewer-handoff cases, including pending dismissal guards, focus and progress.
- `scripts/gallery-design-browser.mjs`: passed all eight width/theme combinations
  at 320, 390, 768 and 1440px, including enlarged text and spacing overrides.
- `scripts/gallery-pagination-browser.mjs`: passed pagination and no-JavaScript
  checks with six measurements across available manifest galleries.
- `git diff --check` and explicit changed-file formatting checks: passed.
- Final shadcn info reports `base: base`, `style: base-rhea`. Source and lockfile
  sweeps found zero remaining Radix dependencies/imports or stale Radix props.

Two read-only subagent reviews examined the wrappers and callers. One disabled
accordion styling issue was fixed and verified in the browser fixture; no other
concrete migration defects were reported. Logs and screenshots are retained in
ignored `.wrangler/base-ui-*` and `.wrangler/gallery-design-*` files.

The user-requested Astro dev server remains running on Tailscale at
`http://100.71.29.14:4321/`; its status endpoint and public gallery both returned
success. The separate isolated audit Worker used for browser checks is stopped
after validation. Neither server deploys changes.

`npm run test:ui` covers command/submit/link semantics, determinate/indeterminate
progress, and checkbox labeling/form output. It is included in `npm run verify`.

`scripts/base-ui-browser.mjs` builds an isolated browser fixture using the Vite
already provided by Astro. It verifies form behavior, native links, checkbox
labels and keyboard control, accordion states/disabled appearance, menu
keyboard/typeahead/submenus/focus return, and progress semantics. It adds no
production route or dependency.

`scripts/base-ui-gallery-browser.mjs` tests real local gallery downloads with
delayed synthetic fetch responses. It checks progress, pending Escape/backdrop
guards, successful ZIP completion, failure recovery, and viewer-to-preparation
focus transfer.

Set `PLAYWRIGHT_MODULE` to an available Playwright module and `GALLERY_TEST_URL`
to the isolated local Worker from `docs/production-audit.md` before running the
gallery browser scripts. Browser fixtures require a completed website build for
the actual stylesheet. Output and temporary builds stay under ignored `.wrangler`.

## Limits

No physical-phone, screen-reader, forced-colors or actual browser-zoom conformance
evaluation. Android was not changed or tested. Existing React FormEvent and
Shiki/CSP/large-bundle advisories are outside this migration.

0 wrappers remain on Radix.
