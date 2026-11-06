# Website analytics

## Where to see the reports

Open [Cloudflare](https://dash.cloudflare.com/), select Ayoub's account, and find **Web Analytics** under **Analytics & Logs**. Select `ayoubabed.xyz` or `alphabravomedia.co`. Ya Hala's `yahalausa.net` property is in **Haithum's account** instead. Use the hostname, date, page path, and referrer filters to inspect the visits relevant to each website.

Web Analytics measures browser page views, visits, referrers, devices, and page performance. It does not establish that a contact email was sent or a booking occurred. A missing referrer can mean direct traffic, an app, or removed attribution. Social referrers describe visits arriving from social platforms; they are not the platforms' own reach or engagement statistics. [Cloudflare overview](https://developers.cloudflare.com/web-analytics/), [dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/).

Use [Google Search Console](https://search.google.com/search-console) for Google search impressions, clicks, and indexing. Its social-platform properties are separate from website analytics. Use the platforms' own reports for channel/profile performance. Use Cloudflare **AI Crawl Control** for crawler requests, keeping them separate from actual AI recommendations, citations, and human visits. See the [AI discovery baseline](research/ai-agent-visibility-baseline-2026-11-06.md).

## Automatic injection on Ayoub's website

Production uses the existing `ayoubabed.xyz` Web Analytics property and Cloudflare's **automatic injection**. The site's beacon token is configured in Cloudflare; its site tag identifies the report/API dataset and is not the beacon token. The repository's optional `PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is for explicitly instrumented previews or non-proxied hosts. Leave it unset in production so the manual component does not duplicate automatic injection.

This rollout requires both the reviewed source and the Cloudflare setting. Before enabling automatic injection, deploy the source that removes the manual fallback and protects sensitive responses. Confirm that ordinary production HTML no longer contains the manual snippet. Then enable `auto_install` and `enabled` on the existing property and verify exactly one correct-token beacon on public HTML. Preserve the existing regional setting (`lite: false`) rather than silently changing it. [Automatic setup](https://developers.cloudflare.com/web-analytics/get-started/).

Server responses marked `X-Robots-Tag: noindex` and responses with error statuses receive `Cache-Control: no-transform`. Existing cache directives, such as unlisted galleries' `no-store`, remain in place. The 404 page is server-rendered so missing URLs pass through this middleware instead of serving a static fallback without the header. This stops edge HTML changes on unlisted galleries, guest-upload pages, admin responses, and errors without changing gallery visibility or access. Public galleries can still receive the automatic beacon. [Response body inspection](https://developers.cloudflare.com/rules/configuration-rules/response-body-inspection/).

A zone Configuration Rule additionally sets `disable_rum: true` for non-primary hostnames and administrative, API, payments, and barber-tracker paths. Preserve these exclusions when changing the Cloudflare setup. Free Web Analytics has no custom analytics rules; Configuration Rules provide the supported request-level exclusion. [Web Analytics limits](https://developers.cloudflare.com/web-analytics/limits/), [Configuration Rules settings](https://developers.cloudflare.com/rules/configuration-rules/settings/).

Verify public and excluded responses after rollout. Do not use an unlisted viewing token in a public audit artifact. Synthetic response tests cover preservation of `no-store`, `no-referrer`, repeat application, and unmodified public-page caching; a live error response provides an edge-injection check without visiting a private gallery.

## Other websites

Ya Hala already uses automatic injection, with EU visitors excluded (`lite: true`). Its manual token in `src/data/site.yaml` is intentionally empty. Do not paste Ayoub's token into that project or add a second tracker.

Alpha Bravo Media uses its own automatic property. Its Content Security Policy must permit `https://static.cloudflareinsights.com`; automatic collection uses the same-host `/cdn-cgi/rum` endpoint, allowed by `connect-src 'self'`. Its Configuration Rule excludes non-primary hostnames, the legacy unlisted gallery, admin, CMS, and API paths. EU visitors are excluded (`lite: true`). These settings live in Cloudflare and are not created by a website deployment. [Beacon/CSP FAQ](https://developers.cloudflare.com/web-analytics/faq/).

Automatic injection requires Cloudflare-proxied traffic. A localhost or ordinary preview-host HTML file without a beacon is not proof of a production problem. Ad blockers, disabled JavaScript, geographic exclusions, and sampling can also affect the reports. Do not compare raw request totals to browser visits as if they were the same metric.

## Rollback

Disable automatic injection before restoring the old manual fallback, then deploy the reviewed reversal through the normal Git workflow. Keep the existing analytics property and its data. Recheck public and excluded routes; do not leave both installation methods active. Rollback cannot recover visits that were not collected.
