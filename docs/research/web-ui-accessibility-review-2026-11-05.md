# Public website usability and accessibility review

Originally reviewed November 5, 2026 in audit/find mode; implementation and follow-up validation are recorded below. Target: WCAG 2.2 AA, including level A. This is a bounded public-site review, not a conformance evaluation. The original findings and evidence below describe the pre-fix site.

## Implementation and follow-up status

Updated November 5, 2026 on `codex/accessibility-review-completion`, following the first fixes merged in PR #104. All four original findings now have implemented corrections. This does not mean every evaluation method or every site route has been tested.

| Recommendation                     | Current result                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readable text links                | Implemented `text-link` and extended it to the reviewed public header hover, contact/privacy labels, portfolio/location labels, YouTube fallback links, gallery links, and shared link variants. Bright primary fills remain unchanged. Browser checks verify light/dark rendered pairs.                                                                                                  |
| Readable inquiry errors            | Summary and inline messages use the foreground token. Inline errors are on the redesigned muted panel, so checking red on white alone would not establish their contrast. Error wording, associations, destructive borders and focus recovery remain intact.                                                                                                                              |
| Past-event wording                 | Neutral shared delivery message is implemented. The guarded SQL was applied to production D1 `ayoub-gallery-data`, UUID `30b7489f-2cf5-441a-9c62-a479df0822fe`, after reading the exact current row. Readback confirmed the corrected past-tense Radiant Hands description, original event date and `coming_soon` status. No photographs, other gallery settings, or schema were changed. |
| Pricing action cue                 | Instruction appears before the rows; selection retains the visible checkmark, pressed state, polite feedback and form synchronization.                                                                                                                                                                                                                                                    |
| Enlarged text/layout follow-up     | Flexible grid/form minimum widths, wrapping labels/prices and wrapping CTA text remove the observed overflow. Browser assertions pass at 320, 390, 768 and 1280 CSS px, at normal and 200% root-font size, including simultaneous text-spacing overrides. These are reflow/resize checks, not actual browser zoom.                                                                        |
| Preferred generous gallery targets | Photographer/guest favorite controls and viewer previous/next controls now have 44×44px minimum targets. The default mobile thumbnails retain a separate photo-opening area.                                                                                                                                                                                                              |
| Forced-colors focus                | Shared system-color focus outline is implemented. A browser with actual `forced-colors: active` emulation reports a solid 2px visible focus outline.                                                                                                                                                                                                                                      |
| Keyboard and dismissal uncertainty | Resolved in this local run: keyboard skip link is visible and the following Tab enters main content; photography filter updates; gallery Escape removes the dialog/photo query and restores the opener. No dismissal workaround was needed.                                                                                                                                               |
| Reduced motion                     | Browser media emulation confirms the reduced-motion query is active and thumbnail transitions are at most 0.01ms.                                                                                                                                                                                                                                                                         |

### Executed follow-up checks

All 20 focused browser regression groups passed. The machine-readable results are in ignored `.astro/accessibility-browser-results.json`. Inline guest-count error contrast measured 18.11:1 in light mode and 14.52:1 in dark mode.

Two additional defects were reproduced during completion and fixed at their responsible layer:

- At 320px with 200% text, the sticky header was 489px tall and completely covered the focused coverage field (field bounds approximately 356–444px). The header now scrolls normally below the `sm` breakpoint. The enlarged-text regression asserts that the invalid field is exposed, including with text-spacing overrides.
- A portfolio prose link passed in its resting state but switched to the bright primary color on hover (approximately 2.47:1 on white). `src/typeset.css` now uses the accessible link token for that shared hover state. Public-consumer regression groups cover normal, hover and focus colors in both themes.

- `npm run verify` passed on the implementation tree: formatting, barber tracker, face/gallery suites, Astro diagnostics and production build. Build notices about CSP syntax highlighting and bundle size remain; no new build error was reported.
- `scripts/web-ui-accessibility-browser.mjs` uses the repository's existing external-Playwright convention without adding a dependency. It checks keyboard skip/filter behavior; responsive/enlarged text and spacing; inquiry selection, error focus and recovery while preserving entered data; light/dark contrast; gallery targets and dismissal; reduced motion; and forced-colors focus. Representative rendered summary/link contrast was 15.13:1 / 5.11:1 in light mode and 12.63:1 / 7.99:1 in dark mode. These are current browser measurements, distinct from the earlier source-color estimates.
- The existing `scripts/gallery-pagination-browser.mjs` passed with six measurements, including pagination and no-JavaScript checks. The existing `scripts/gallery-continuous-browser.mjs` passed continuous loading, filters, retry, overlapping requests, history and stable prepending at 1440px and 390px. Both ran against the built Worker at `127.0.0.1:8788` with `scripts/audit/wrangler.jsonc`, dummy local D1 and local R2, under `.wrangler/accessibility-review-state`. No production/preview upload or moderation was tested. Downloads and ranked matches in these suites use fixtures; they do not prove real archive contents or remote face-model accuracy.
- Shared-preview interaction checks confirmed incomplete-form focus below the sticky header and field-specific messages; ordinary-motion gallery dismissal and focus return; pricing anchor positioning; and the payment QR dialog's Escape dismissal and focus return. No payment or email was sent.
- The normal dev server runs at `http://localhost:4321/`; `/_astro/status` returned `{"ok":true}`. Managed production-only gallery rows are not copied into local storage merely to populate the dev listing.

Reproduce the focused accessibility checks using an existing Playwright installation:

```powershell
$env:PLAYWRIGHT_MODULE = 'file:///absolute/path/to/playwright/index.mjs'
node scripts/web-ui-accessibility-browser.mjs
```

See [the local audit guide](../production-audit.md) for the isolated built-Worker gallery checks. Execution logs and fixture reports from this run are in ignored `.astro/accessibility-completion-verify.log`, `.astro/accessibility-pagination.log`, `.astro/accessibility-continuous.log` and the corresponding gallery-report files.

### Remaining evaluation limits

Actual 400% browser zoom, real screen-reader announcements, physical mobile/assistive-technology combinations and representative-user sessions remain unavailable in this environment. The shared preview's Ctrl-plus attempt did not change `devicePixelRatio` or the CSS viewport, so it is explicitly not counted as zoom evidence. Forced-colors and reduced-motion checks are browser emulation, not a physical Windows high-contrast/mobile test. Screen-reader semantics and keyboard behavior are checked, but they do not substitute for listening to announcements.

These are uncompleted external evaluation methods, not additional confirmed defects or a claim that the site conforms to WCAG AA. The original sampling exclusions below remain exclusions: this work does not audit every portfolio/gallery, protected admin/upload workflow, or external service. Valid email-client handoff, actual clipboard permission recovery, third-party video captions/audio description and remote face-search matching remain untested. Do not expand the historical pass statements into claims about those surfaces.

## Original audit

## Scope and reference

The review follows the public visitor's tasks: understand Ayoub's work, browse proof projects, request event photography, find event photographs, and reach contact/payment options. The current shared header, BaseLayout, styles, and existing page-family templates are the consistency references. Different gallery, portfolio, and payment compositions serve different tasks and are not defects merely because they differ.

Live production pages were inspected in the shared preview browser. Local source supplied implementation context only: the event photography page and inquiry helper already had uncommitted edits, so live findings do not establish the behavior of that working revision.

Applicable checks included names and labels, headings and landmarks, contrast, responsive reflow, target sizes, form errors, keyboard/focus behavior, disclosure/dialog behavior, and clarity of actions. The invoked web-ui-accessibility skill and its accessibility, consistency, and layout/data references guided the review.

## Findings, in priority order

### 1. High: green text links fail contrast in light mode

- **Classification:** confirmed accessibility defect, WCAG 1.4.3.
- **Where:** `/services/event-portraits/`, including “See starting prices,” proof-gallery links, “Or use the contact page,” and the phone/email links.
- **Expected:** ordinary 14px text needs at least 4.5:1 contrast against its background.
- **Observed:** axe-core 4.10.3 reported approximately 2.49:1 for green `#00bc7d` on white. A separate canvas conversion of the browser's computed OKLCH colors produced approximately 2.47:1; both are well below the threshold. The sampled links measured approximately 7.99:1 in dark mode.
- **Reproduce:** use light appearance, open the event photography page, and inspect the green links against the white background. Underlining identifies the links but does not remedy text contrast.
- **User effect:** important pricing, proof, and contact destinations are harder to read for people with low vision.
- **Narrow fix:** use an accessible foreground token for text links, retaining the bright green where it serves as a filled surface with a suitable foreground. Check default, hover, focus, visited where styled, and dark appearance. Avoid changing every primary fill solely to repair text.
- **Responsible layer:** shared color roles in `src/styles.css`, plus the event photography page's link styling. Other consumers of `text-primary` need a scoped follow-up; this review does not establish that all such consumers fail.

### 2. Medium: the inquiry error summary fails contrast

- **Classification:** confirmed accessibility defect, WCAG 1.4.3.
- **Where:** event photography inquiry form, `#inquiry-errors`.
- **Expected:** error text at the rendered 14px size needs at least 4.5:1 against its actual tinted background.
- **Observed:** after choosing two hours and submitting the otherwise empty form, axe reported approximately 4.02:1 for `#e7000b` against the rendered pink background `#fde3e7`.
- **Reproduce:** select “2 hours,” then activate “Open email draft” with the remaining required fields empty. The summary reads “Check 8 fields.” No email was sent or valid inquiry submitted during this review.
- **User effect:** the message explaining why the visitor cannot continue is harder to read.
- **Narrow fix:** give the summary a darker error-text foreground or adjust the tinted surface so the actual pair meets 4.5:1. Recheck inline errors and both themes rather than assuming the same token passes on every surface.
- **Responsible layer:** the summary's `text-destructive bg-destructive/10` pairing in `src/pages/services/event-portraits.astro` and the applicable shared error colors.

### 3. Medium: a past event still reads as an upcoming event

- **Classification:** confirmed content inconsistency; no WCAG failure asserted.
- **Where:** `/galleries/radiant-hands-annual-event-giving-that-never-ends/`.
- **Expected:** event information should distinguish a past event awaiting delivery from an upcoming event.
- **Observed:** the event is dated October 17, 2026, but on November 5 the page still says “Join the community,” “I'll be attending,” and “I'll add the photographs here after the event.”
- **User effect:** visitors cannot readily tell whether the event information or delivery status is current.
- **Narrow fix:** retain “Coming soon” if delivery is still pending, but change the event description to past tense and make the pending-photo status explicit. Add a delivery estimate only if one is known.

### 4. Low: selectable pricing needs a clearer action cue

- **Classification:** usability recommendation, not a demonstrated accessibility failure.
- **Where:** the four starting-price rows on the live event photography page.
- **Observed:** the rows look like a pricing list under “Coverage / Starting at.” They are buttons; activating “2 hours” sets the form's coverage to “2 hours” and changes `aria-pressed` to `true`. Their text does not tell a visitor that they prefill the inquiry.
- **User effect:** visitors may miss a useful action or be uncertain what selecting a price does.
- **Narrow fix:** add a short instruction such as “Choose coverage to fill in your inquiry,” with a visible selected indicator. Keep the existing button semantics and synchronized form selection.
- **Validation limit:** no representative-user study was available, so this is an expert-review recommendation rather than an observed user failure.

## Page and state coverage

| Surface                                                                             | Executed inspection                                                                                                                                                                 | Limits                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage `/`                                                                        | Desktop screenshot and accessibility tree at 1280px; 320px DOM/layout inspection; portfolio filter names and pressed state; skip-link keyboard attempt                              | Filter activation timed out; animated skip-link visibility was inconclusive                                                                                               |
| Event photography `/services/event-portraits/`                                      | 320px, 390px, 768px, and 1280px checks; labels and target dimensions; price selection; empty-form error state; light/dark computed link contrast; axe scan of the light error state | Valid submission/email-client handoff not exercised; 390px inspection occurred with enlarged text                                                                         |
| Gallery index `/galleries/`                                                         | 320px layout, names, headings, image-alt presence, destinations                                                                                                                     | Full automated scan unavailable because the page's CSP blocked audit-code evaluation                                                                                      |
| Published gallery `/galleries/angels-birthday-party-2026/`                          | 320px layout and accessibility tree; photo opener; viewer labels, target dimensions, keyboard Tab and Escape attempts                                                               | Dismissal/focus restoration inconclusive because animation progress was frozen; selfie search, favorites, downloads, pagination, Back, and failure recovery not completed |
| Coming-soon gallery `/galleries/radiant-hands-annual-event-giving-that-never-ends/` | 1280px DOM, status copy, headings, destinations                                                                                                                                     | Other coming-soon galleries not inspected                                                                                                                                 |
| About `/about/`                                                                     | 320px DOM/layout, heading, links, names                                                                                                                                             | No complete keyboard or contrast evaluation                                                                                                                               |
| Contact `/contact/`                                                                 | 320px DOM/layout, heading, contact destinations, names                                                                                                                              | External phone/mail/contact-card handoffs not exercised                                                                                                                   |
| Privacy `/privacy/`                                                                 | 320px DOM/layout, headings, link names                                                                                                                                              | Policy/legal adequacy outside this review                                                                                                                                 |
| Portfolio `/portfolio/ya-hala/`                                                     | 320px DOM/layout, media-control names, disclosure and comparison-control presence                                                                                                   | Other portfolio pieces, expanded equipment, comparison transitions, embedded playback, captions and audio description not evaluated                                       |
| Payments `https://payments.ayoubabed.xyz/`                                          | 320px DOM/layout, named QR/Zelle controls, payment destinations                                                                                                                     | QR dialog and clipboard recovery not exercised; no payment initiated                                                                                                      |

Protected admin, pairing, guest-upload/submission routes, hidden/unlisted gallery access, other portfolio/gallery instances, the barber tracker, Android, and external linked websites were not inspected. Their behavior remains unassessed rather than passed.

## Useful behavior observed

- The public pages use a consistent primary navigation order and recognizable page-family headings. Sampled pages had one `h1` and a main landmark.
- No document-level horizontal overflow was detected at default text size in the sampled 320px pages. The inquiry page also fit at 768px and 1280px.
- The sampled images had `alt` attributes; this checks presence, not the quality of every photograph's description.
- Inquiry fields have associated visible labels and required states. Price selection synchronized its pressed state and the coverage select.
- Incomplete-form submission focused the first invalid field (`date`), set `aria-invalid`, and associated inline errors through `aria-describedby`. The focused date field was below the sticky header.
- The inquiry form's measured controls were at least 44px tall. Gallery favorites were 32px squares and viewer previous/next controls were 36px squares: these are below the skill's preferred 44px recommendation but exceed the 24px AA size minimum. They are not size failures on that evidence.
- The photo viewer supplied a title and instructions, named close/previous/next/favorite controls, and a visible keyboard focus ring on the sampled Save action.
- The payment page's minimal shell is a justified task-specific variant, with a link back to the website.

## Test evidence and uncertainty

- **Automation:** axe-core 4.10.3, WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags, ran on the event photography page's light-theme error state. It reported the color-contrast rule with failing nodes and 30 passing rules, with no incomplete rules in that run. This is not evidence that other pages pass.
- **Text spacing:** simultaneous line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, and paragraph spacing 2em overrides were applied to the inquiry page at 320px. No document overflow or right-edge overflow candidates were found. This was a DOM check, not complete visual proof of every label and control.
- **Enlarged text:** a 200% root-font override at 320px produced a 367px document scroll width, with overflow involving the quote CTA, prices, and inquiry area. At 390px the document fit. Treat the 320px result as a layout follow-up, not a confirmed WCAG 1.4.4 failure: horizontal scrolling alone does not establish loss of content or function. This was not actual browser text zoom or 400% browser zoom.
- **Browser limitation:** sampled browser animations reported `playState: running` with `currentTime: 0`, including numerous reveal animations. The viewer remained mounted after Escape removed the photo query, and the skip link's transform did not visibly advance. These may be preview-environment artifacts. They are not counted as confirmed site defects; repeat dismissal, focus restoration, and skip-link visibility in a normal progressing browser session.
- **Unavailable checks:** actual 400% browser zoom, screen-reader announcements, forced colors, executed reduced-motion behavior, physical mobile/touch testing, full delayed/error/retry flows, and representative-user tasks. Source contains reduced-motion rules, but source presence is not a runtime pass.
- **Repository checks:** no application code changed, so `npm run verify` and Android checks were not run. Only this review document was added and formatted.

## Suggested fix order

Repair light-mode link contrast and the error-summary color pair first. Then refresh the past-event wording and clarify the pricing selection action. Retest the working revision independently: the production findings are not validation of the uncommitted event photography redesign.

Relevant standards: [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
