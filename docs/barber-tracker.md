# Barber photography field tracker

## What to record and why

The experiment asks whether short photography shifts can produce at least $200 per working day and $30–$40 per total working hour. The tracker collects the smallest practical set of observations for those decisions. It does not require individual conversation logs.

| Record              | How to enter it                                 | Decision it supports                                                |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Total working time  | Start work/travel, arrive, leave/travel, finish | Whether earnings justify all the time spent, including travel       |
| Time at each shop   | Arrival and departure buttons                   | Whether a location produces enough money for its on-site hours      |
| Shop name           | Choose a previous shop or type a name           | Which shops to revisit and compare                                  |
| Customers entering  | Tap + or −                                      | Whether a shop has sufficient traffic                               |
| People approached   | Tap + or −                                      | How many people heard the offer, so sales can be compared fairly    |
| People given photos | Tap + or −                                      | How much photography was delivered; this is separate from purchases |
| Customer payment    | $10/$20/$30/custom, method, optional note       | What people pay, how many transactions occur, and customer revenue  |
| Owner payment       | Amount, method, visit, optional coverage note   | Whether shops provide a useful second revenue stream                |
| Expenses            | Amount and optional description                 | How much of collected revenue remains after recorded costs          |
| Notes               | Optional visit, day, payment, or timer note     | Explaining unusual results without adding another mandatory form    |

Address and GPS location are optional conveniences for identifying and returning to a shop. They are not needed to calculate viability. GPS stores coordinates and accuracy only after the user requests it and grants browser permission. No reverse-geocoding or business-name lookup is performed.

The suggested price starts at $20. An optional pricing field and day note document any future experiment. Do not require a new pricing entry for every customer.

## What we calculate later

- **Earnings per total working hour:** customer revenue plus owner revenue minus costs, divided by total work hours. This is the main comparison with the $30–$40 target.
- **Daily earnings:** the same revenue less costs for the whole work day, compared with $200.
- **Results by shop:** revenue, direct costs, on-site hours, traffic, and purchases. Travel time also matters when choosing a route of several shops.
- **Sales per approach:** purchase transactions divided by people approached. Keep groups in mind: counters count people while payment records count transactions.
- **Average payment and price distribution:** how much people actually pay, including the proportions at $10/$20/$30/custom.
- **Traffic and production:** customers entering and people given photos per on-site hour.
- **Value of owner revenue:** compare the economics with and without payments from shops.

For example, $240 received minus $40 of costs across five total work hours leaves $200 and $40 per hour. The same $200 across eight hours leaves $25 per hour. Counting only the time inside the shop would hide that difference.

Recorded net is a field estimate, not a full profit-and-loss statement. Include later editing, delivery, owner follow-up, and payment fees in the analysis. Equipment, insurance, other overhead, and taxes are not automatically calculated here. For the scaling decision, subtract the full cost of paying another photographer for all their work time and test whether they reproduce the results.

Repeat promising shifts before changing the offer. Compare similar days and times, report sample sizes, and treat one strong visit as a reason to retest rather than proof of scalability.

## Stripe and reconciliation

Stripe payment amounts are not entered manually and are not fetched by this tracker. The optional **Stripe purchase +1** button records a purchase with an unknown amount. No sale is counted when someone merely opens the payment page.

Manual amounts cover cash, Zelle, Venmo, PayPal, Cash App, and Other. Owner payments and expenses are separate record types. The on-screen summary explicitly excludes Stripe amounts. Full earnings and average-price analysis require the tracker backup plus Stripe records, including refunds and fees.

Stripe counter entries represent the same purchases as Stripe's records; they are not additional sales. Use dates and timestamps to reconcile, and identify unmatched payments rather than assigning them to a shop by guess. Avoid assigning an entire month's owner payment to one visit. Use the owner's payment note to describe the period it covers.

## What we skip

No mandatory customer names, contact details, demographics, individual pitch records, rejection reasons, photo-by-photo durations, detailed task timers, or customer interaction forms. Notes are optional. Image-use permissions still need to be handled in the photography workflow, but collecting marketing consent is outside this research tracker.

The four timer buttons are coarse boundaries, not second-by-second reporting requirements. Personal breaks are optional. **More work / travel** can reopen the selected day to include later work. Timer records can be corrected and annotated. Finish the day before exporting so an open timer does not keep growing.

## Using it on Android

Source: `public/barber-tracker/index.html` with plain CSS and JavaScript modules. Served by the existing site's static assets at `/barber-tracker/`. No new dependencies or server database were added.

1. Open the hosted tracker in the same Android browser each time.
2. Use the browser's **Add to home screen** or **Install app** option if available.
3. Wait for **Ready to reopen offline** before relying on offline reopening.
4. Start work, add each shop on arrival, use tallies and payment buttons, and finish work.
5. Tap **Export JSON backup** at the end of the day. Check Downloads and move the file into a Syncthing-synced folder.
6. Send the JSON file and Stripe records back for analysis. CSV is available for spreadsheets.

Every export contains all saved work days, rather than only the day on screen. JSON preserves visit/day notes, payment records, local work dates, timezone, GPS if recorded, and timer timestamps. Amounts are integer USD cents; timestamps are epoch milliseconds. The export includes a UTC export time and reconciliation instructions.

Syncthing syncs the downloaded file, not browser storage. Restoring JSON replaces the browser's records after validation and confirmation. Export current records before restoring a different backup. Imported notes are rendered as text. CSV exports neutralize formula-like strings when opened in spreadsheets.

Use one browser tab for recording. A second tab changing records pauses recording in the first tab to avoid silently overwriting newer data. Undo retains the last 30 changes during the current page session. Counter minus buttons and payment/timer corrections remain available after reloading.

If browser saving fails, the warning explains that changes exist only in the open tab and need an immediate export. Invalid existing records are protected from overwrite and can be exported as a recovery copy. Clearing browser data, switching browsers, or changing the website origin requires restoring an exported backup.

## Offline and delivery boundaries

The service worker is scoped to `/barber-tracker/` and caches only the tracker shell. It does not intercept payment checkout or other website routes. Shell cache names must be changed whenever these static files change; an updated worker waits until older tracker tabs close before activating. Local records are separate from shell caches.

The static response is marked `noindex,nofollow` and no public navigation link is added. This is not an authentication mechanism; the interface is accessible to anyone with the URL, but each browser has its own local records. No tracking data is uploaded by the app.

The shared Permissions-Policy keeps camera, microphone, payment, and USB blocked. The tracker adds same-origin geolocation permission, which still requires a user prompt. Geolocation is no longer globally disabled for static assets so that the tracker can request it.

For development, run `npm run dev` and open the server's `/barber-tracker/` address. The folder requires a web server; opening `index.html` directly as a file is not the supported workflow. No production deployment is implied by local implementation. Follow [AGENTS.md](../AGENTS.md) for deployment authorization.

## Validation

`npm run test:barber-tracker` checks a two-shop day, breaks, completed timer stability, unknown Stripe amounts, manual revenue/cost totals, backup validation, exact cents, and CSV escaping. It is included in `npm run verify`.

Browser validation covers tally +/−, payment forms, owner revenue, expenses, breaks, multiple visits, and persistence after reload. Offline reopening was verified with the browser network disabled. Phone layout is checked at narrow widths; physical Galaxy S25 Ultra and Syncthing folder behavior still require a device trial.

## Sources

- [Original business research](chatgpt-conversation://6ab96416-e5b0-83e9-b995-4fc6fe4c6678)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN offline service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [MDN geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
- [Cloudflare static response headers](https://developers.cloudflare.com/workers/static-assets/headers/)
