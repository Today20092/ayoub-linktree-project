# AI visibility baseline: November 6, 2026

Follow-up to [the discoverability research](ai-agent-discoverability-2026-11-06.md). Measurements were taken around 20:27–20:33 UTC. This is a partial baseline: crawl observations and public search evidence are available; consumer-product recommendation rates and authenticated search reports remain unavailable.

## Main finding and local repair

The live photography page's Cloudflare Web Analytics script supplied the **site tag** as its beacon token. The authenticated Cloudflare site's `site_token` and its generated installation snippet specify a different value. The local shared component had the site tag as its fallback too.

Corrected the fallback in [CloudflareWebAnalytics.astro](../../src/components/CloudflareWebAnalytics.astro) to the token in Cloudflare's existing installation snippet. No new analytics property or tracker was created. The existing environment override remains supported; an override must also use the site's **beacon token**, not its site tag. These are public installation identifiers, not API credentials.

The component is used by `BaseLayout.astro` and the public standalone gallery-photo route. Existing conditions that omit analytics on protected/unlisted surfaces were not changed. No production deployment was performed. Production still needs the correction released through the normal authorized Git/deployment workflow before collection can be verified.

Evidence: read-only `GET /zones?name=ayoubabed.xyz`, `GET /accounts/{account_id}/rum/site_info/list`, the production page's rendered script attributes, and the existing component. Cloudflare's returned installation snippet uses `site_token`, while analytics queries filter by `siteTag`. See [Web Analytics installation](https://developers.cloudflare.com/web-analytics/get-started/) and [site-list API](https://developers.cloudflare.com/api/resources/rum/subresources/site_info/methods/list/).

## Search evidence

Browser: Default profile, signed out; Google displayed location **33612, Tampa, FL**, from IP address. No consumer-model label or personalization settings were available. Searches are observations of results shown in this session, not exhaustive index exports.

- Google `site:ayoubabed.xyz` returned the homepage, galleries index, and multiple portfolio pages. The domain is visibly represented in Google results.
- Google `site:ayoubabed.xyz/services/event-portraits/` returned “did not match any documents.” Repeating without the trailing slash gave the same response. This is a reason to inspect this specific URL in Search Console, **not proof that it is absent from Google's index**.
- The live service page renders the expected self-canonical, `index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1`, and `ProfessionalService`/`Service` structured data. No page-level indexing prohibition was observed.
- Bing's equivalent service-path search returned unrelated banking results. Treat that response as inconclusive; it does not establish indexing or ranking for this site.
- Search Console redirected to its public introduction with a Google sign-in link. Bing Webmaster Tools likewise showed its public introduction and Sign In. Neither property's indexing, sitemap status, inclusion controls, or AI citation/performance reports could be inspected.

Priority for the next authenticated session: inspect `https://ayoubabed.xyz/services/event-portraits/` in both providers. Record indexing status, exclusion reason if any, selected canonical, last crawl and sitemap discovery. Request indexing only if the actual inspection supports it; do not infer a repair from the public `site:` result alone. [Google URL Inspection documentation](https://support.google.com/webmasters/answer/9012289).

## Cloudflare account observations

The existing zone is active on the Free Website plan. Read-only Bot Management configuration reported:

- `fight_mode: false`.
- `ai_bots_protection`, `content_bots_protection`, and `crawler_protection`: `disabled`.
- `ai_search`, `ai_user`, and `ai_training`: `disabled`.
- All returned named personal-agent blocking actions: `disabled`.
- Managed robots and bot-preference sync: off.

Here, `disabled` describes a disabled blocking/policy control, not a disabled crawler. This follows the API's field descriptions. These observations do not prove that every WAF, Access, origin, or application rule permits every request. A ruleset-list call succeeded, but a subsequent read of one returned response-ruleset identifier returned 404; a complete effective-rule audit was not established. No security settings were changed. [Bot Management configuration API](https://developers.cloudflare.com/api/resources/bot_management/methods/get/).

### Crawl window

Window: **2026-11-05 20:27:00 UTC through 2026-11-06 20:27:00 UTC**. Queried `httpRequestsAdaptiveGroups`, restricted to `requestSource: "eyeball"` and the exact production hostname. User-agent patterns covered GPTBot, OAI-SearchBot, ChatGPT-User, Claude, Perplexity, Googlebot and bingbot. Group counts are adaptive analytics observations, not independently verified bot identities or exact unsampled access logs.

A second query restricted paths to `/`, `/services/`, `/services/event-portraits/`, `/robots.txt`, `/llms.txt`, `/index.md`, `/sitemap.xml`, `/sitemap-index.xml`, and `/AGENTS.md`. It returned nine groups, below the 100-group limit:

| Claimed caller                      | Public path    | Returned count | HTTP status |
| ----------------------------------- | -------------- | -------------: | ----------: |
| OAI-SearchBot                       | `/robots.txt`  |              1 |         200 |
| ClaudeBot                           | `/robots.txt`  |             11 |         200 |
| ClaudeBot                           | `/sitemap.xml` |             12 |         200 |
| Claude-User                         | `/sitemap.xml` |              1 |         200 |
| bingbot                             | `/robots.txt`  |              2 |         200 |
| Googlebot, desktop string           | `/robots.txt`  |             15 |         200 |
| Googlebot, desktop string           | `/`            |              1 |         200 |
| Googlebot, mobile Chrome 99 string  | `/`            |              1 |         200 |
| Googlebot, mobile Chrome 153 string | `/`            |              2 |         200 |

No matching group for the service page appeared in this short window. That does not prove the page has never been crawled. Broader queries returned redirects and missing-page responses, plus some 403 responses under a claimed Googlebot user agent on other paths. No protected gallery identifiers, query tokens, IP addresses, or visitor identities are retained here; those responses do not establish blocking of the service page. Do not weaken security based on a spoofable name.

The user-agent query was used because this zone's free-plan observation is not verified detection-ID evidence. Training-crawler activity such as ClaudeBot must remain separate from search retrieval and user-request fetches. [AI crawl analytics GraphQL reference](https://developers.cloudflare.com/ai-crawl-control/reference/graphql-api/).

### Referrals and collection

Queried existing Web Analytics using `rumPageloadEventsAdaptiveGroups`, the configured `siteTag`, exact `requestHost`, and the 28-day interval **2026-10-09 20:27:00 UTC to 2026-11-06 20:27:00 UTC**, grouping by `refererHost`. The successful response had an empty array and no GraphQL errors. This means **no rows returned for that query**, not zero AI referrals or zero visitors. The observed beacon-token mismatch makes missing collection a plausible explanation, but causation is not established.

A broader follow-up query was rejected with “Rate limiter budget depleted. Please try again after 5 minutes.” No further analytics calls were made after that response. Wider account coverage, beacon ingestion and referral history remain unverified. [GraphQL limits](https://developers.cloudflare.com/analytics/graphql-api/limits/).

After the correction is deployed, verify that an ordinary public visit sends a successful beacon and that the correct property's report receives data. Respect the existing privacy controls and do not use admin/upload or unlisted-gallery visits as test traffic. Historical visits lost to a misconfigured beacon cannot be reconstructed from this observation.

## Consumer-product panel: attempted, unavailable

Both products were opened signed out in the Default browser profile. No paid API was substituted. The exact initial prompt from the research panel was:

> Recommend an event photographer in Tampa for a two-hour community celebration, around $600, with photos guests can access during the event. Give sources.

- **ChatGPT:** first attempt showed “Chat stopped unexpectedly”; one Retry returned “Unable to connect.” No substantive answer, citations, search execution, or model label was available.
- **Perplexity:** Search mode was selected. The response was “Sign up and repeat your request,” followed by sign-in options. No substantive answer or sources were available.

These are unavailable observations. They are excluded from mention, recommendation, citation and accuracy denominators. **No valid discovery-rate estimate exists.** Remaining prompts and repetitions were not submitted after access failed; repeatedly exercising an inaccessible product would not produce evidence.

Resume with the six fixed prompts and three fresh conversations per prompt/product from the original report once access is available. Keep unbranded discovery separate from branded fact checking. Retain full answer text and actual citation URLs, product/model label, time, locale, search mode and repetition number. Do not supply the website URL to the unbranded prompts. No inquiry messages were sent.

## Next concrete steps

1. Review and release the one-line beacon correction through the normal workflow when explicitly requested. Then verify ingestion; no additional analytics service is needed.
2. In an authenticated Search Console/Bing session, inspect the photography URL and existing sitemap before requesting indexing or changing content. Confirm whether the owner already has both properties; create no duplicates.
3. Resume the consumer panel after sign-in/connectivity is available. Keep failed attempts separate from real answers.
4. Record first meaningful referral and inquiry evidence after collection works. Revisit the same prompt panel in about four weeks; do not promise a ranking or recommendation improvement from the token repair.

## Authenticated follow-up: November 6, about 22:49–23:00 UTC

The owner reported verifying both website domains, two YouTube channels, and Instagram in Search Console. After the owner imported browser cookies into T3 Code, the Google session was authenticated and both website properties were accessible. No passwords or cookies were copied into this report. The earlier statements about unavailable Google access describe the initial baseline, not this follow-up.

### Actions and confirmed outcomes

- Both website sitemap tables initially had no submitted entries. Submitted `https://alphabravomedia.co/sitemap-index.xml` and `https://ayoubabed.xyz/sitemap.xml` once each. Google confirmed both submissions. T3 click automation was unreliable; the Ayoub submission was completed in the owner's existing Zen window and then confirmed in the T3 session. No duplicate submission was made.
- Both tables initially showed **Couldn't fetch**. By 22:59 UTC, Alpha Bravo Media's entry had changed to **Success**, type **Sitemap index**, last read November 6, and **35 discovered pages**. This confirms that the initial failure was not its final processing outcome; it does not prove those pages are indexed.
- Ayoub's sitemap still showed **Couldn't fetch**, type **Unknown**, no last-read value in the table, and zero discovered pages at the final check. Its detail page said **Sitemap could not be read**, without a more specific cause. A normal browser opened the public XML successfully, parsed 53 URL entries with no parser error, and found the photography service URL. This establishes browser reachability, not successful Google sitemap ingestion. No website or security configuration was changed to guess at the cause.
- Inspected `https://ayoubabed.xyz/services/event-portraits/` in Google's actual URL Inspection report. The index view said **URL is not on Google**, **URL is unknown to Google**, no referring sitemap or referring page detected, no last crawl, and no Google-selected canonical available. This replaces the earlier inconclusive public `site:` observation with first-party evidence for this URL at this time.
- Ran **Test live URL** for that service page. At 5:56 PM Eastern, Google reported **URL is available to Google** and **Page can be indexed**. A live test does not mean the page has entered the index.
- After the passing live test, used **Request indexing** once. Google confirmed **Indexing requested** and stated that the URL had been added to a priority crawl queue. Do not resubmit repeatedly; acceptance does not guarantee indexing or placement.
- The website overview reports were still processing data. Bing Webmaster Tools remained signed out; opening Sign In displayed its account-choice prompt. No Bing import, account creation, OAuth grant, or Bing indexing submission was completed. Social-property reports were not inspected.

### Remaining work

1. Recheck Ayoub's sitemap after Google has had processing time. If the fetch failure persists, investigate the actual Google-facing response before editing content, security rules, or sitemap routes. Alpha Bravo Media's successful transition is evidence against treating every immediate fetch status as a permanent failure.
2. Revisit the service URL's index view after the queued crawl; preserve the distinction between live-test success, an accepted request, and an indexed page.
3. The owner needs to finish Bing sign-in. Then inspect existing sites or import the two verified websites and their sitemaps from Search Console without creating duplicates.
4. Resume the consumer-product panel separately. Google account access does not establish ChatGPT/Perplexity access or actual recommendation visibility.

## Verification

The earlier local beacon correction passed full website verification and a built-output token check. This follow-up changes only this Markdown report; formatting and its repository-relative links were checked. The authenticated follow-up made the sitemap submissions and single indexing request listed above. No Android changes, new dependencies, commits, pushes, deployments, security changes, or website edits were made during the follow-up.
