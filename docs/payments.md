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

Set `payments.stripePaymentLink` in `src/data/site.yaml` to the verified Stripe
Payment Link. Until it is configured, the card/mobile-wallet button stays hidden.
The existing payment apps continue to work.

Create a one-time Payment Link titled "Photography tip" with customers choosing
what to pay and a suggested amount of $20 USD. Keep the amount editable and the tip
optional. Use Stripe-hosted checkout with cards and eligible Apple Pay/Google Pay
wallets. Avoid additional phone, shipping, or custom fields. Use Stripe's hosted
thank-you confirmation; this site does not claim to verify a completed payment.

The Stripe account is awaiting review, and the connector requires reauthentication.
After approval and reconnecting,
confirm the account, check that it can accept payments, and create or reuse the
appropriate product, variable price, and Payment Link. Verify the checkout's
amount and payment methods without making a real payment. Wallets appear only on
eligible devices and browsers with the relevant wallet configured.

## Activation

The subdomain is not live until the approved code is merged and deployed and
`payments.ayoubabed.xyz` is attached as a Cloudflare Worker custom domain to
`ayoub-linktree-project`. Follow the repository's preview and production deployment
workflow. Custom domains are managed in Cloudflare; the Wrangler configuration
omits routes so deployments preserve those domain attachments. No DNS or
production deployment is performed by local development.

## Checks

- `pnpm exec tsx --test src/middleware.test.ts`
- `npm run verify`
- At `/payments/`, check small phone, desktop, light/dark, and enlarged text.
- Open Scan, close with Escape, and confirm focus returns to Scan.
- Copy Zelle and verify the clipboard contains `+18134240606`.
- Check all three payment links without sending money.
- Check the configured Stripe link opens "Photography tip" with $20 editable.
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
