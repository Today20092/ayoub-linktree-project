# Ayoub's website and gallery app

This repository contains Ayoub Abedrabbo's personal website, portfolio, event galleries, gallery dashboard, and native Android companion. The homepage is also the link hub for social profiles, contact details, channels, and payment links.

[Website](https://ayoubabed.xyz) · [Gallery dashboard](https://ayoubabed.xyz/admin/galleries/) · [Download Android](https://github.com/Today20092/ayoub-linktree-project/releases/latest) · [Android setup](android/README.md)

## Project map

| Part                     | Purpose                                               | Source                                                          |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- |
| Homepage and link hub    | Introduction, links, channels, and portfolio cards    | `src/pages/index.astro`, `src/data/site.yaml`                   |
| Portfolio                | Curated projects and case studies                     | `src/content/portfolio/`, `src/pages/portfolio/[slug].astro`    |
| Services and information | Services, About, Contact, and Privacy                 | Their named Astro files in `src/pages/`                         |
| Public galleries         | Event photos, viewing, downloads, and guest uploads   | `src/pages/galleries/`, `src/pages/galleries.astro`             |
| Gallery dashboard        | Gallery creation, settings, uploads, and moderation   | `src/pages/admin/galleries/`, `src/components/AdminGallery.tsx` |
| Android app              | Upload camera JPEGs and manage galleries from a phone | `android/`                                                      |
| Payments                 | Payment destinations and QR sharing                   | `src/pages/payments.astro`, [payment guide](docs/payments.md)   |

A portfolio piece is curated work used to explain a project. A gallery is a photo collection for delivery, browsing, and uploads. Create galleries in the dashboard or Android app. Use MDX for portfolio case studies. Older manifest-based galleries remain supported.

## Android app

Install `ayoub-gallery.apk` from the latest stable Android release. Android 14 or newer is required.

1. Open Settings and enter `https://ayoubabed.xyz` as the website address.
2. Tap **Get a pairing key** and sign in to the website dashboard.
3. Create a key with **Allow gallery management** enabled.
4. Paste the key into the app and connect.
5. Create or select a gallery. Edit its details, visibility, guest access, and photos through the native management screens.
6. Select a camera-transfer folder, review the photos, and start an upload batch.

The app keeps its queue on the phone and skips identical files already uploaded through the companion API to that gallery. It sends photos to the website's storage without a desktop server. Date and time pickers follow the phone's theme.

The [Android README](android/README.md) covers folder access, retries, Obtainium/ObtainX updates, local builds, and signing. [Release notes](android/RELEASE_NOTES.md) describe the release's capabilities and testing limits.

### Watched-folder release status

Watched-folder uploads are included starting with Android 0.4.0. Physical-phone and LUMIX-provider testing remains; see the release notes for testing limits.

The feature watches for new JPEG arrivals after a session starts, then queues them for upload. Existing files form the starting baseline. It does not mirror phone edits or deletions to the website. See [implementation and verification notes](docs/android-watched-folder-design.md).

## Gallery visibility and storage

- **Published** shows the gallery and its photos publicly.
- **Coming soon** shows event information while withholding photos.
- **Hidden** removes the gallery from public pages. Its public page returns 404.

Uploading does not change visibility. A hidden gallery can receive photos before publication. Visibility controls gallery pages; it is not private-file access control for images already in the public bucket.

The website runs on an Astro Cloudflare Worker. D1 stores gallery metadata, moderation state, device permissions, and upload receipts. R2 stores images. Cloudflare Images processes uploads. Password-based guest submissions wait in a private bucket until approved. Photographer and trusted-invite uploads use the direct upload flow.

New uploaded images use `/api/gallery-media/` on the selected website, so preview reads preview storage and production reads production storage. Legacy manifest photos may still use `photos.ayoubabed.xyz`.

## Production and preview

| Environment | Website                                                                               | Use                                     |
| ----------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| Production  | [ayoubabed.xyz](https://ayoubabed.xyz)                                                | Live galleries and normal app use       |
| Preview     | [Preview website](https://ayoub-linktree-project-preview.ayoub-abedrabbo.workers.dev) | Upload, moderation, and release testing |

Each environment has separate gallery data, image buckets, and pairing keys. Switching the app's website does not move photos or galleries. Finish or clear a pending batch before switching, then create a key on the destination website.

The web dashboard uses Cloudflare Access. The Android API uses revocable device keys. Upload-only keys cannot manage galleries; management permission must be explicitly enabled. Keep keys and signing credentials out of source control.

## Development

Use the Node and pnpm versions specified in `package.json`, then run:

```sh
pnpm install --frozen-lockfile
npm run dev
```

Use the server URL reported by Astro. The gallery backend also needs Cloudflare bindings and local configuration; see [gallery infrastructure](docs/interactive-event-galleries.md).

For website changes:

```sh
npm run verify
npm run audit:prod
```

`verify` checks formatting, face-search and gallery tests, Astro types, and the website build. Android has separate Gradle checks and a GitHub Actions workflow, documented in its README. See `package.json` for the full website command list.

For documentation-only edits, format the changed Markdown and check its links. A website build is not needed solely for documentation changes.

## Releases and deployment

GitHub is the source of truth. Website changes go through a feature branch, verification, preview, review, and merge to `master`. Production deploys from clean `master`.

- `npm run deploy` and `npm run deploy:preview` deploy the isolated preview website.
- `npm run deploy:prod` deploys production.
- Android release tags build and publish an APK through `.github/workflows/android.yml`.

Publishing an APK does not deploy the website. Deploy required backend changes and database migrations before distributing an app that depends on them. Preview upload testing must use the isolated bindings in `scripts/deploy-preview-worker.mjs`.

Follow [AGENTS.md](AGENTS.md) for deployment authorization and the repository's release procedure. Android signing and versioning instructions live in the [Android build guide](android/README.md#github-builds-and-signing).

## Documentation map

| When you need to…                                                  | Read                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Edit links, portfolio content, images, or shared styles            | [Website content](docs/website-content.md)                                    |
| Change native gallery controls or companion permissions            | [Native gallery management](docs/native-gallery-management.md)                |
| Configure storage, Access, guest uploads, or moderation            | [Gallery infrastructure](docs/interactive-event-galleries.md)                 |
| Maintain legacy manifests, ZIPs, pruning, or face-search workflows | [Legacy event galleries](docs/event-galleries.md)                             |
| Install, pair, build, or release Android                           | [Android README](android/README.md)                                           |
| Understand watched-folder behavior and verification                | [Watched-folder notes](docs/android-watched-folder-design.md)                 |
| Change payment destinations or payment-host routing                | [Payments](docs/payments.md)                                                  |
| Work as a coding agent                                             | [AGENTS.md](AGENTS.md)                                                        |
| Understand domain terms and recorded decisions                     | [CONTEXT.md](CONTEXT.md), [domain documentation rules](docs/agents/domain.md) |

Research documents record investigations and proposals. Check implementation and release notes before treating a proposal as shipped behavior.
