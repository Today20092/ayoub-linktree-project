---
target: event portraits page
total_score: 22
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\User\\orca\\workspaces\\ayoub-linktree-project\\rockfish\\src\\pages\\services\\event-portraits.astro"
target_fingerprint: 'sha256:576aaf8b62c36d6c3903bd15651163414518641afc821bc0c36795cbd4c9b092'
target_path: "C:\\Users\\User\\orca\\workspaces\\ayoub-linktree-project\\rockfish\\src\\pages\\services\\event-portraits.astro"
timestamp: 2026-10-31T22-06-13Z
slug: src-pages-services-event-portraits-astro
---

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                  |
| --------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 2         | A price row does not stay selected. The ready message appears only after the page jumps to a mail app.                     |
| 2         | Match System / Real World       | 3         | Hours and “host pays” match a host. “About 20 portraits” can be read as a cap, and the event-type examples skip birthdays. |
| 3         | User Control and Freedom        | 2         | A price click cannot be cleared. The mailto handoff leaves the page.                                                       |
| 4         | Consistency and Standards       | 2         | “Request a quote” becomes “Open email draft.” The rows look like options but are not a radio group.                        |
| 5         | Error Prevention                | 2         | A past date and zero guests can still be sent. Five to eight hours have no package, only a free-text box.                  |
| 6         | Recognition Rather Than Recall  | 3         | The prices stay on the page and fill the coverage menu. What the guest actually receives is not next to the button.        |
| 7         | Flexibility and Efficiency      | 3         | Price rows prefill coverage. Phone, email, and the contact page are other ways in.                                         |
| 8         | Aesthetic and Minimalist Design | 2         | The page is quiet and thin. The only dated proof sits under a feature list that repeats the hero.                          |
| 9         | Error Recovery                  | 1         | One banner shows the first error. The bad field is not marked or focused.                                                  |
| 10        | Help and Documentation          | 2         | Travel and the extra hour are on the page. Nothing explains how a guest opens the gallery.                                 |
| **Total** |                                 | **22/40** | **Acceptable**                                                                                                             |

## Design Specificity Verdict

**LLM assessment:** The offer is specific. Tampa, host-paid portraits, a gallery within minutes, $400–$850, and Angel’s party on October 24, 2026 are this photographer’s. The layout is not. A two-column hero, three equal blurbs, and a long form could sell any local service. The persuasion is a sentence and one dated photo, not a moment of “the guests already had the pictures.”

**Deterministic scan:** `impeccable detect` on `src/pages/services/event-portraits.astro` exited 0 with no findings. It does not judge whether the hero proves the claim, whether a price row stays selected, or whether the form errors stick to a field.

**Visual overlays:** No overlay. This session has no browser tool that can inject a script.

## Overall Impression

The prices now scan, and Angel’s gallery is real proof. The page still asks for a quote before it shows that proof. The single biggest opportunity is to put Angel’s party, the date, and “from $400” in the first screen.

## What's Working

- Each price row reads in one glance: hours and pace on the left, the dollar amount on the right, and a click carries those hours into the quote.
- The terms a host needs are plain: the host pays, guests do not, travel within 30 miles is included, an extra hour is $150, and the draft does not reserve the date.
- Angel’s caption has a date and a link to the gallery. That is a real event, not stock wording.

## Priority Issues

**[P0] The first screen sells speed without the price or the proof**

- **Why it matters:** The headline promises a gallery within minutes. The first photo is an unnamed pair of guests. $400 and Angel’s party are both below that. A host is asked to request a quote before seeing either the number or the result.
- **Fix:** Under the headline, one line: “From $400. Angel’s birthday gallery was updating during the party.” Use that photo as the hero, with the date and “See the gallery” in the caption.
- **Suggested command:** $impeccable layout

**[P1] “What you get” repeats the hero, and the proof is a footnote**

- **Why it matters:** Three equal lines restate coverage, portraits, and minutes. The birthday photo is a small figure under that list. Nothing says how a guest opens the gallery.
- **Fix:** Lead this section with the large photo, the date, and the gallery link. One sentence on delivery. Then a short sequence: photographed, in the gallery within minutes, the host keeps the set.
- **Suggested command:** $impeccable distill

**[P1] A chosen price does not stay chosen**

- **Why it matters:** The row is a button with no selected style. The click scrolls away and focuses the coverage menu, so the package the host just trusted leaves the screen. “About 20 portraits” also reads like a file cap.
- **Fix:** Keep a ring on the chosen row. Say “Planning pace: about 20 an hour, not a cap.” Show “2 hours, starting at $550” beside “Open email draft” without making the row disappear.
- **Suggested command:** $impeccable polish

**[P2] The quote form is a wall, and errors do not stick to fields**

- **Why it matters:** Ten required fields. Only the first error is announced, and the bad field is not marked. The event-type examples are mosque, school, and nonprofit, after the page just showed a birthday. The columns also collapse to one on a laptop width and come back to two on a wider screen.
- **Fix:** Two groups, Event and How to reach you. Mark the invalid field, focus it, and use “Birthday, mosque, school, nonprofit” as the example. Keep two columns only when the form is wide enough.
- **Suggested command:** $impeccable harden

**[P2] Submit leaves the page for a mail app**

- **Why it matters:** The ready panel is built and then the browser is sent to `mailto:`. If no mail app opens, the host is left on a half-finished form and a second warning that the date is not held.
- **Fix:** Open the draft from the link that stays on the page. Leave the summary, the phone number, and “Or use the contact page” visible.
- **Suggested command:** $impeccable polish

## Persona Red Flags

**Jordan (first-time host):** Cannot tell whether a birthday is the job this page is for, whether “about 40 portraits” covers the guest list, or whether $550 is the bill. “Starting at,” the add-ons, and “does not reserve the date” read as the price moving after they write.

**Casey (phone):** The price rows are easy to tap. The form is long, and the phone number sits up in “What you get,” not beside the submit button. A price tap jumps the screen and can open the keyboard over the summary. Angel’s photo stays small.

**Riley (edge cases):** A past date and zero guests can be submitted. Five to eight hours cannot be chosen as coverage. The price buttons expose no selected state. Only the first error is announced. A long email draft can fail without the page saying so.

## Cognitive load

Four checklist failures: the price row mixes hours, a hedged portrait count, and “starting at”; the real total still includes extras; “What you get” repeats the hero; the form asks for ten things at once. That is high load for a page whose decision is one package.

## Questions to Consider

- If the belief you need is “guests had photos before they left,” why is Angel’s gallery a caption under a feature list instead of the first screen?
- When someone taps $550, are they choosing a package or being dropped into a ten-field email?
- Is this page for the birthday host in the new photo, or for the mosque and chamber story still sitting in the links and the event-type examples?
