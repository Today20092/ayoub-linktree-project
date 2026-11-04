---
target: event portraits price table
total_score: 22
max_score: 36
na_heuristics: 7
p0_count: 2
p1_count: 1
target_identity: "file:C:\\Users\\User\\orca\\workspaces\\ayoub-linktree-project\\rockfish\\src\\pages\\services\\event-portraits.astro"
target_fingerprint: 'sha256:fd797b5af94bfd078a8895a1cc578322021e32afc189567e77bba66d2dfc689b'
target_path: "C:\\Users\\User\\orca\\workspaces\\ayoub-linktree-project\\rockfish\\src\\pages\\services\\event-portraits.astro"
timestamp: 2026-10-31T21-13-23Z
slug: src-pages-services-event-portraits-astro
---

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                          |
| --------- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | The page says the form does not reserve the date. Opening the email draft still leaves the page with no proof the mail app opened. |
| 2         | Match System / Real World       | 3         | Hours and dollars match a host’s budget talk. “About 20” never says portraits, people, or groups.                                  |
| 3         | User Control and Freedom        | 3         | Phone, email, and the contact page are exits. The mailto handoff cannot be undone here.                                            |
| 4         | Consistency and Standards       | 2         | Price cells are large and padded. The “Starting at” header is tiny and unpadded, so it collides with the prices.                   |
| 5         | Error Prevention                | 2         | Required markers help. A past date, zero guests, and free-text extra hours can still build a bad request.                          |
| 6         | Recognition Rather Than Recall  | 3         | The coverage menu repeats the starting price. Extra hour, travel, helper, and rush stay in a paragraph under the table.            |
| 7         | Flexibility and Efficiency      | n/a       | One-time quote page. Repeat-use shortcuts are not the job.                                                                         |
| 8         | Aesthetic and Minimalist Design | 2         | The zebra row spends most of its width on empty track between “About 20” and $400.                                                 |
| 9         | Error Recovery                  | 2         | The alert is plain and focused. Only the first error shows, and a missing mail app looks like a dead button.                       |
| 10        | Help and Documentation          | 2         | “Starting at” is incomplete without the extra-hour and travel lines, which sit in muted type after the decision.                   |
| **Total** |                                 | **22/36** | **Acceptable**                                                                                                                     |

## Design Specificity Verdict

**LLM assessment:** Lightly authored copy on an interchangeable rate-card shell. Tampa, the 30-mile radius, host-paid portraits, and the live gallery are this photographer’s. The table is not. A full-width zebra table with the number shoved to the edge could belong to any pricing page. The empty middle is what makes it look unfinished.

**Deterministic scan:** `impeccable detect` on `src/pages/services/event-portraits.astro` exited 0 and returned no findings. It does not measure column gaps, header padding, or whether a row’s background paints unused space. That clean scan missed the bug the screenshots show.

**Visual overlays:** No overlay. This session has no browser tool that can inject a script into the page.

## Overall Impression

The offer is clear and the prices are honest. The table throws that away. On a phone, each row is a dark bar with a hole in the middle and the dollar amount jammed against the right edge. The single biggest fix is to stop stretching three short columns across the screen.

## What's Working

- A host can see who pays, that guests do not, the Tampa travel radius, and the four starting prices before the form.
- The coverage menu repeats “starting at” the published price, and the page does not pretend the date is held.
- The table has a caption, column headers, and row headers. The failure is visual, not missing structure.

## Priority Issues

**[P0] The price row is mostly empty space**

- **Why it matters:** “About 20” sits on the left of the middle column and $400 sits on the right of the last column. `table.w-full` puts every spare pixel between them, and the zebra background paints that hole. Comparing a package means looking across a dead bar.
- **Fix:** Stop stretching the rate card. Cap it near `max-w-lg`. On a phone, stack “1 hour” and “About 20 portraits” on the left and keep the price in a nowrap column on the right. Paint the rounded row background only around that content.
- **Suggested command:** $impeccable layout

**[P0] The prices and “Starting at” are jammed to the edge**

- **Why it matters:** Price cells use `px-3 text-xl text-right`. The header is `text-xs` with only bottom padding, so “Starting at” clips into the price column and $400–$850 sit about 12px from the screen edge.
- **Fix:** Give the header and the price the same horizontal padding. Keep both on one line. Give the price column a stable width and at least 1rem of inset.
- **Suggested command:** $impeccable layout

**[P1] “Starting at” hides the number that changes the quote**

- **Why it matters:** Extra hour +$150 and travel past 30 miles are one muted sentence under the table. A host can screenshot $400 and miss the rest.
- **Fix:** Put “Extra hour +$150” and “Travel included within 30 miles of Tampa” on their own lines inside the rate card. Leave helper, backdrop, highlight, and rush as one “quoted separately” line.
- **Suggested command:** $impeccable clarify

**[P2] A row is not a way to ask for that price**

- **Why it matters:** Nothing in the row is a control. The host scrolls down and chooses the same hours again.
- **Fix:** Let a row open the quote form with that tier already selected, and show “1 hour, starting at $400” beside the submit button.
- **Suggested command:** $impeccable polish

**[P3] One portrait carries a $400–$850 ask**

- **Why it matters:** The gallery-within-minutes claim is text. The only picture is the hero crop.
- **Fix:** Add one captioned still from a real Tampa event under “What you get,” and keep the portfolio links.
- **Suggested command:** $impeccable delight

## Persona Red Flags

**Jordan (first-timer host):** “About 20” does not say 20 portraits. “Starting at” plus a paragraph of extras means the circled prices are not a budget. The gappy row looks unfinished before the nine-field form.

**Casey (phone):** The dollars sit in the right edge, under the thumb and the browser chrome. “Starting at” collides with that column. Matching “About 40” to $550 means crossing the empty zebra gap. There is no action on the row.

**Sam (zoom and screen reader):** The caption and headers are sound, and clipping does not remove “Starting at” from the accessibility tree. A full-bleed table at high zoom scrolls sideways instead of stacking. Session counts are muted text on a muted bar, so they fail contrast first.

## Cognitive load

Two checklist failures: the row splits one comparison across a visual hole, and the real quote is the table plus a second list of extras. That is moderate load. The four prices themselves are within working memory.

## Questions to Consider

- If the only number a host screenshots is the price, why is that the column with the least padding and the most distance from the sessions it buys?
- Would a board member trust “starting at” while helper, backdrop, and travel are still a footnote?
- What changes if each row is the quote action, with that tier already filled in?
