# Payments page

The public, unlisted payment page is intended for `https://payments.ayoubabed.xyz/`.
During development and preview it is available at `/payments/`. Middleware renders
that page at the payments hostname root. The homepage and payment page render on
request so hostname routing runs before the page is selected; the homepage keeps
its existing public cache headers. The main production site's `/payments/`
redirects to the subdomain. It is excluded from the sitemap and sends `noindex` in
both its HTML and response headers. This is discoverability control, not access
control; anyone with the URL can see the payment destinations and phone number.

Cash App, Venmo, and PayPal reuse `src/data/site.yaml`. The confirmed Zelle number
is in `src/pages/payments.astro`. The Zelle button copies it; customers paste it into
Zelle within their banking app. Copy failure leaves the visible number and explains
how to enter it manually. The page does not process or confirm payments.

The Scan button opens a native dialog with a locally generated, black-on-white QR
code, error correction L and a four-module quiet zone. It generates the code in
the browser when opened, using the current origin and pathname, including any port.
Query parameters and fragments are omitted. A Tailscale preview QR requires the
scanning device to have tailnet access.

## Stripe checkout

Live tip links were created in the Alpha Bravo Media account
`acct_1U2j8kIlyeigpagV` through the logged-in dashboard on September 30, 2026.
`payments.stripeTipLinks` in `src/data/site.yaml` supplies $10, $20, and $30 USD
suggestions. Each link is titled "Photography tip" and lets customers edit the
amount. `payments.stripePaymentLink` supplies the Other option, which opens the
$20 link with an editable amount. The $20 choice is highlighted on the page.

The links use Stripe-hosted checkout and a hosted thank-you message. No additional
phone, shipping, custom fields, automatic tax, paid invoice PDF, or Managed
Payments option is enabled. They are not added to the public Stripe profile.
Stripe controls available payment methods and wallet eligibility; the page labels
the choices "Card or mobile wallet" without promising a wallet on every device.
The site does not process or confirm payments. No real payment is made during QA.

The connector still requires reauthentication; browser dashboard access was used
instead. Future edits should confirm the account and live mode before changing
links. Clearing `stripePaymentLink` hides the card section.

## Activation

The subdomain is not live until the approved code is merged and deployed and
`payments.ayoubabed.xyz` is attached as a Cloudflare Worker custom domain to
`ayoub-linktree-project`. Follow the repository's preview and production deployment
workflow. Custom domains are managed in Cloudflare; the Wrangler configuration
omits routes so deployments preserve those domain attachments. No DNS or
production deployment is performed by local development.

## Checks

- The standalone middleware test currently needs a Workers-aware runner because
  gallery middleware imports `cloudflare:workers`; plain `tsx` cannot load it.
- `npm run verify`
- At `/payments/`, check small phone, desktop, light/dark, and enlarged text.
- Open Scan, close with Escape, and confirm focus returns to Scan.
- Copy Zelle and verify the clipboard contains `+18134240606`.
- Check all three payment links without sending money.
- Check the three Stripe choices open "Photography tip" with $10/$20/$30 editable.
- Check Other opens an editable amount.
- Open a URL with a query/fragment and verify Scan encodes only its origin/path.

Local validation covered a 320 x 568 phone viewport, a 390 x 844 phone viewport,
desktop, light/dark themes, enlarged text, QR dismissal/focus return, and the exact
Zelle clipboard value. Secondary text and Scan button contrast exceed 4.5:1.
The routing test and project verification passed. The Cloudflare build logged
runtime cancellation messages during teardown but exited successfully. Lighthouse
could not complete because the local browser launcher failed; no performance score
is claimed.

## References

- [Astro middleware rewriting](https://docs.astro.build/en/guides/middleware/#rewriting)
- [QR correction levels and margins](https://github.com/soldair/node-qrcode#readme)
- [Using Zelle through a banking app](https://www.zelle.com/blog/how-do-i-access-zelle)
- [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve)
- [Stripe customer-chosen Payment Links](https://docs.stripe.com/payment-links/create)
- [Venmo brand assets](https://venmo.com/about/brand)
