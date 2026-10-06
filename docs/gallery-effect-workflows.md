# Gallery backend Effect workflows

The backend pins Effect 4.0.1. This migration changes orchestration, without a
database migration or a native/client runtime. Pure filename, URL, image-size,
password, checksum, and session cryptography functions remain ordinary functions.
The published API payloads, visibility rules, device permissions, and guest
publication policies remain compatible with the existing clients.

## Services and boundaries

- `gallery-effect.ts` defines categorized `GalleryFailure` values and the single
  `runGalleryHttp` boundary. Expected validation, authorization, missing-resource,
  and conflict errors retain their intentional status and public message.
  Images failures return 422; database/storage dependency failures return safe
  503 responses. Guest processing retains its existing 422 response. Unexpected
  defects/interruption return a safe 500. JSON responses use `no-store`.
- `GalleryDatabase` supplies D1 for companion authentication and known-hash
  preflight. `Companion` additionally supplies the public bucket, Images,
  optimizer, clock (Unix seconds), attempt IDs, and logger. `companionLayer`
  creates these dependencies for the current request; tests replace clock/IDs
  and external service implementations.
- `GalleryAdmin` reuses the injectable command dependencies: database records,
  pending/public object access, Images, password functions, IDs, and logging.
  Web and companion management share `galleryAdminCommand`. Web creation uses
  the same service. Access/device authentication stays at the route boundary.
- `GuestUpload` supplies storage, metadata publication/reconciliation, image
  optimization, invite bookkeeping, and IDs. Password sessions store private,
  pending submissions. Trusted invites publish directly into gallery photos.
  `guestUploadRequest` and `guestSessionRequest` expose injectable HTTP seams for
  visibility, event-scoped credentials, upload settings, throttling, multipart
  validation, and password-session responses, with deterministic clocks.
- `createGalleryReaderEffects` composes typed record reads and static content
  lookups. The existing Promise reader facade remains available to Astro page
  callers. `gallery-media.ts` contains only browser-safe pure URL helpers;
  `gallery-media-server.ts` reads/transforms media through Effect.
  HTTP workflows yield `galleryReaderEffects` operations directly, preserving
  request interruption and the original typed failure/defect channel.

Effect APIs were checked against the installed official `effect@4.0.1` source:
`Context.Service`, `Layer.succeed`/`merge`, `Effect.gen`, `tryPromise`, `catch`,
`result`, `uninterruptible`, `ensuring`, and `runPromiseExit`. See the
[Effect 4 release](https://effect.website/blog/releases/effect/40) and
[versioned source](https://github.com/Effect-TS/effect/tree/effect%404.0.1/packages/effect/src).

## Runtime lifecycle and cancellation

HTTP entry points run the workflow through `runGalleryHttp`. The Promise use-case
facades use `runGalleryUseCase` to retain the established test/caller interface;
they unwrap an adapter's original exception for callers, while HTTP boundaries
only expose safe messages. Readers used by Astro pages are read-only Promise
facades. Service implementations, credentials, bindings, and mutable upload
variables are never cached between requests. The existing Access public-key
cache remains separate from request credentials.

Authentication and body reads are interruptible. Companion body reads enforce
the streamed 20 MiB limit regardless of Content-Length, validate JPEG signature
and SHA-256, and release their reader lock. Once a receipt claim or externally
visible publication starts, the mutation is deliberately uninterruptible until
publication, compensation, or reconciliation finishes. A disconnected caller
may not receive success even though publication completes; its next known-hash
or upload request reconciles the completed receipt. There are no detached fibers
or mutation timeouts that pretend to cancel an external write. This can retain
a request while an external service is slow; Worker lifetime limits still apply.

## Publication, compensation, and retries

D1, R2, and Images do not form an atomic transaction. Companion deduplication
remains gallery + SHA-256, including renamed/deleted published photos. Receipt
claims retain their five-minute lease, unique attempt keys, owner guards, and
transactional D1 photo/receipt batch. A stale attempt deletes only its own key.

On failed companion publication, query the owner-specific receipt before any
deletion. A completed receipt preserves the object and returns `skipped`. If the
query fails, retain bytes/receipt and return a dependency failure. An unresolved
outcome requires later reconciliation; do not guess or bulk-delete objects.

Guest/admin publication similarly queries the persisted photo or flyer before
compensating a failed metadata response. Moderation reconciles a failed approval
response before deleting a copied public object. Approval retries clean stale
pending copies. Failed deletion restores stored bytes and their HTTP metadata.
Cleanup failures are categorized and logged without replacing the original
failure or turning successful publication into a failed upload. Invite-use
bookkeeping is post-publication cleanup and cannot delete the published photo.

No automatic mutation retry is introduced. Callers can retry only after the
existing outcome/receipt checks. Any future retry needs a bounded transient
failure policy plus a demonstrated idempotent operation and outcome check.
Never retry the entire upload or moderation workflow blindly.

Logs contain controlled messages, failure categories, and safe gallery/photo
identifiers. Exception text, Cause values, tokens, passwords, cookies, bindings,
and image contents are not serialized. A failure category is observable while
its raw dependency exception stays out of logs and HTTP responses.

## Worked example

To extend the shared command handler, add a validation failure and yield a typed
adapter operation within `galleryAdminCommand`:

```ts
if (input.action === 'hideProfessional') {
  // Check the filename against the gallery's available professional photos.
  yield *
    database(() =>
      dependencies.data.hideProfessionalPhoto(context.event.id, filename),
    )
  return { status: 200, body: { ok: true } }
}
```

Test through `executeGalleryAdminCommand` or a public request/use-case interface,
injecting the existing data/object seams. Assert the response and observable
published/pending state. Keep writes within the mutation's interruption boundary,
and add explicit reconciliation/compensation when more than one service changes.
Do not run a nested runtime for a new internal workflow: yield its Effect.

## Verification and rollout

`npm run test:galleries` includes the SQLite receipt/authentication tests, fake
bucket moderation/media tests, and guest publication tests. Run `npm run verify`,
`npm run audit:prod`, and `npm run deploy:dry-run` before review. A dry-run bundles
the Worker locally; it is not a deployment or an authorization to write to live
bindings. Record bundle totals before/after and confirm client bundles contain
no Effect runtime.

Preview deployment and upload/management/moderation smoke tests require separate
authorization. Verify the isolated preview D1/R2 names in
`scripts/deploy-preview-worker.mjs`, as documented in [AGENTS.md](../AGENTS.md).
No live-service smoke test is implied by local fake binding tests.

Rollback uses a reviewed code revert or previous Worker version. The migration
does not change tables or stored formats, so rollback needs no destructive data
migration. Retain existing completed receipts and stored objects; pending cleanup
or uncertain outcomes must be reconciled using their existing IDs and keys.

## Local validation for issue #68 (October 6, 2026)

- Effect is pinned to 4.0.1; the frozen lockfile installation passed.
- `npm run verify` passed: 87 tests (68 gallery), Astro check with zero errors
  and warnings, and the production build. Seven pre-existing hints remain.
- `npm run deploy:dry-run` passed without deployment. Worker upload size changed
  from 7291.82 KiB / gzip 2421.64 KiB to 7466.24 KiB / gzip 2464.93 KiB
  (+174.42 KiB / gzip +43.29 KiB). The client output contains no Effect runtime.
- Local workerd smoke passed six authorization/missing-resource/media HTTP probes
  against explicitly isolated local D1/R2 bindings; no remote service was used.
- Independent repository-standards and issue-specification reviews found no
  remaining material issues after the failure-injection fixes.
- `npm run audit:prod` failed on the same four baseline advisories: three high
  (`http-cache-semantics`, `source-map-js`, `sharp`) and one moderate (`smol-toml`).
  Baseline and final advisory IDs match; this migration adds no audit findings.
- Real preview upload, management and moderation smoke testing remains pending
  separate deployment authorization and verified isolated preview bindings.
