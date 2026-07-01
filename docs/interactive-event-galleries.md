# Interactive event galleries

Guest uploads and browser-based culling use the existing Astro Worker plus D1,
R2, Cloudflare Images, and Cloudflare Access. Gallery pages read moderation
state at request time, so publishing or hiding a photo does not rebuild the
site.

## Provisioned resources

- D1 database: `ayoub-gallery-data`
- Public R2 bucket: `alphabravomedia-galleries`
- Private pending R2 bucket: `alphabravomedia-gallery-uploads`
- Worker secret: `GALLERY_SESSION_SECRET`

The initial D1 migration has been applied locally and remotely. For future
migrations:

```powershell
npx wrangler d1 migrations apply GALLERY_DB --local
npx wrangler d1 migrations apply GALLERY_DB --remote
```

Cloudflare Images Paid must be active for HEIC decoding, resizing, and JPEG
output. Do not attach a public domain to the pending bucket.

## Required Cloudflare Access setup

Before deploying, create one Zero Trust Access self-hosted application named
`Event Gallery Admin` with two public destinations:

1. `ayoubabed.xyz/admin/galleries/*`
2. `ayoubabed.xyz/api/admin/galleries/*`

Add an Allow policy containing only
`ayoub.abedrabbo@gmail.com` and enable One-time PIN as an identity provider.
The application should use a 24-hour session, hide from the App Launcher,
auto-redirect to the One-time PIN provider, and enable the binding cookie.

The team domain is already configured as
`https://ayoub-abedrabbo.cloudflareaccess.com`. Copy the application AUD tag,
then set it on the Worker:

```powershell
npx wrangler secret put GALLERY_ACCESS_AUDS
# Enter the application AUD tag
```

The application verifies the Access JWT signature, issuer, audience, expiry,
and authenticated email. It returns `403` when any value is missing or invalid.
Localhost is allowed for development.

## Local development

Create an ignored `.dev.vars` file:

```text
GALLERY_SESSION_SECRET=<random development-only value>
```

Then use the normal background Astro server:

```powershell
npm run dev
```

Open `/admin/galleries/`, choose an event, set an upload password of at least
eight characters, and enable uploads. Guest upload pages remain closed until
this setting is enabled.

## Moderation behavior

- New files are validated, converted to a maximum 2400-pixel progressive JPEG,
  and stored only in the private pending bucket.
- Approval copies the optimized JPEG to
  `events/{event-slug}/guest/{photo-id}.jpg`, updates D1, and removes the
  pending object.
- Rejection removes the pending object and database row.
- Removing a published guest photo deletes its public object and database row.
- Hiding a professional photo adds a D1 tombstone. It does not delete the R2
  object or rebuild the professional Download All ZIP.
- Use the existing local gallery-prune workflow when a hidden professional
  photo should be permanently removed.

Guest photos are shown in a separate community section and participate in
individual and selection downloads. They are not added to the professional ZIP
or face-search index.

## Verification

```powershell
npm run verify
npx wrangler deploy --dry-run
```

Pilot one event before opening uploads broadly. Confirm password throttling,
HEIC upload, approval, rejection, public gallery display, soft-hide/restore,
and mobile layouts.
