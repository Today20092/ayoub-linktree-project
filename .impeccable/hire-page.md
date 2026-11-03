# Surface brief: hire page

Route: `/services/event-portraits/` (canonical, apex domain). Mode: **Persuade**. Sibling: `/services/` short index. Parent map #91; this brief is #95. Offer source of truth: `src/lib/event-portrait-offer.ts`. Visual world: [DESIGN.md](../DESIGN.md).

Written by an agent without a live interview. The direction is inferred from #91, #94, and the current page. Ayoub has not reviewed it.

## Direction contract

- THESIS: The proof comes before the pitch. One real event photo and its live gallery link do the convincing. The page refuses the agency-landing default: no hero slogan over a darkened photo, no feature grid, no FAQ, no walkthrough.
- OWN-WORLD: White paper, Zodiak headlines, Jakarta body, and emerald only on the action and links. Prices appear as one quiet ruled list with tabular figures. Hairline separators sit between sections. Photos are the only saturated color.
- STORY: A host reads the price, believes guests will see photos within minutes, notes that the host pays and guests do not, and opens a pre-filled email.
- FIRST VIEWPORT: Desktop uses two columns. On the left: h1, a one-line price-plus-proof sentence, the primary button "Request a quote", and the secondary link "See starting prices". On the right: Angel's 4:3 photo with a caption linking to the gallery. On mobile, the h1, sentence, and button sit above the photo, and the button is visible at 390x844 without scrolling.
- FORM: A single-column editorial ledger (option 1 of: ledger, split-sticky, card grid). seed: none (unavailable).
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Section order and copy budget

Keep the total visible copy, excluding the form, under the current page's word count. Target about 60% of it.

1. **Hero.** H1: "Your event. A gallery within minutes." (keep). One line: "Starting at $400. The host pays; guests get the photos free." Primary action: `#inquiry`. Secondary: `#pricing`. Photo: `angel-birthday-cover.jpg` with the caption "Angel’s birthday, October 24, 2026 · See the gallery".
2. **Proof strip.** Three images in a row (one column at 390px): Angel's gallery cover, one portrait from `portraits.mdx` (`P1210377.JPG`, event portrait in a navy suit), and the MCC workshop `featuredImage`. Each caption is the event name plus a link: gallery, `/portfolio/portraits/`, and `/portfolio/muslim-business-chamber-2026/`. Do not add body copy here. The strip replaces the current "What you get" paragraph.
3. **Starting prices (`#pricing`).** Use a ruled list with no boxed rows. Columns: coverage, planning pace (small, muted), and starting price (right-aligned, `text-2xl tabular-nums`). Rows come from `eventPortraitPackages`, followed by an "Extra hour +$150" row. Below the list, add two lines: "Travel included within 30 miles of Tampa." and the denial sentence "No backdrop, flash, or lighting kit." Keep the press-to-preselect behaviour; show the selected state as a `--muted` fill plus a 2px `--primary` left rule instead of a ring.
4. **Inquiry (`#inquiry`).** Keep the current mailto form and validation. Heading: "Request a quote." Sub-line: "Opens an email to Ayoub. It does not reserve the date." The form sits in the right column on desktop and the heading block is sticky on the left.
5. **Contact.** One line with the NAP: Ayoub Abedrabbo · (813) 424-0606 (`tel:`) · Ayoub@AyoubAbed.xyz (`mailto:`) · Tampa, Florida. Do not include a street address.

## Required copy fixes (ticket #96)

The current page breaks locked facts:

- "Ayoub, camera, and lighting." Remove it. There is no lighting kit.
- "…a helper, a backdrop, … are quoted separately." Remove "a backdrop". The denial sentence is the only allowed mention.

## `/services/` index (per #94)

This is a Read-adjacent index, not a second sales page. Remove the 302 and replace the draft with:

- H1 "Services" and one sentence.
- A row for **Event photography**: "Starting at $400", a link to `/services/event-portraits/`, and Angel's photo thumbnail.
- A row for **Video**: "Custom quote", with a link to `/contact/`. Do not show video prices.
- Keep the same tokens. Leave out the hero, FAQ, and walkthrough. Delete the outdated `outcomeDefinitions` prices from `services.astro`. They contradict "video stays a custom quote".

## Breakpoints to verify

390x844 and 1440x900, in light and dark themes. Check that the hero button is above the fold, the price figures align, the proof strip stacks to one column, and there is no horizontal scroll.
