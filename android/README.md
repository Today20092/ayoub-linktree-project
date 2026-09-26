# Ayoub Gallery for Android

A personal companion for publishing camera JPEGs to Ayoub's event galleries. Built with Kotlin, Jetpack Compose, and Material 3: dynamic wallpaper colors, light/dark themes, rounded tonal cards, and three simple destinations: Galleries, Uploads, Settings.

The interface takes design direction from [ImageToolbox](https://github.com/T8RIN/ImageToolbox) and [ObtainX](https://github.com/bikram-agarwal/ObtainX). No code or brand assets were copied from either app. Native Android transfer jobs were chosen over the Flutter upload library explored in [our research](../docs/android-gallery-uploader-research.md).

## Download and updates

[Download from GitHub Releases](https://github.com/Today20092/ayoub-linktree-project/releases) · [Add to Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://app/%7B%22id%22%3A%22xyz.ayoubabed.gallery%22%2C%22url%22%3A%22https%3A%2F%2Fgithub.com%2FToday20092%2Fayoub-linktree-project%22%2C%22author%22%3A%22Today20092%22%2C%22name%22%3A%22Ayoub%20Gallery%22%7D)

Install `ayoub-gallery.apk` from an **Android** release. Android 14 or newer is required. The app ID is `xyz.ayoubabed.gallery`. The first releases are prereleases for device testing, not claims of completed field testing.

In Obtainium or ObtainX:

1. Add `https://github.com/Today20092/ayoub-linktree-project` as the source.
2. Enable prereleases while testing the beta.
3. Set the release-title filter to `^Ayoub Gallery` and APK filter to `^ayoub-gallery\.apk$` if the client offers these filters.
4. Install the signed release APK. Later versions use the same application ID and signing key, so they update the app without clearing its connection or queue.

Do not install the debug Actions artifact over the release app: it has a different signing key. Use release APKs for ongoing testing and Obtainium updates. Android asks for installation permission from whichever browser/updater you use. There is no in-app updater yet.

## First connection

The app defaults to the production website, `https://ayoubabed.xyz`. The website and D1 migrations `0005_gallery_companion.sql` and `0006_gallery_device_management.sql` must be deployed before pairing and management work. Publishing an APK does **not** deploy the website. Existing preview connections remain unchanged when updating.

1. Open Settings in the app. Confirm `https://ayoubabed.xyz` for production, or explicitly enter the preview website for testing. Finish or clear any pending batch before changing websites.
2. Tap **Get a pairing key**. Sign into the existing gallery admin through Cloudflare Access.
3. Name your phone and enable **Allow gallery management** to create galleries and change their settings. Create the key, copy it into the app, and tap **Connect**. Use a key from the same website you selected.
4. Pick any gallery, including hidden or coming-soon galleries. Choose the LUMIX folder or an SD-import folder using Android's directory picker.
5. For LUMIX's shared folder, set **Photos taken since**. For a dedicated event folder, leave all dates selected.
6. Check for photos, review the count, and tap **Sync photos**. Allow notifications to see progress while the phone is locked.

Device keys allow listing galleries and uploading photos, expire in 90 days, and can be revoked in the dashboard. Explicitly enabled management keys also allow gallery creation, settings, and moderation. The phone encrypts its key using Android Keystore. Backups are disabled so the key is not exported with app data. Switching websites never moves galleries or photos between environments.

## Sync behavior

- A sync captures a fixed batch; new arrivals wait for the next scan.
- JPEG files up to 20 MB are supported. The server keeps the existing 2400px, quality-90 web processing.
- SHA-256 identifies identical original bytes within each gallery, including renamed files. A small checksum check skips known files before transferring their bytes. Server receipts survive later photo removal. Edited/recompressed files count as new photos. Previously uploaded website photos without companion receipts cannot be recognized retroactively.
- EXIF capture time is preferred. Without a usable capture date, file modification time is used and disclosed before upload. EXIF without an offset uses the phone's timezone; set the camera clock correctly.
- Failed uploads retry with backoff. The queue survives process death; **Resume/Retry** recovers unfinished files. After a reboot or force-stop, reopen the app and resume. No promise of unattended auto-resume is made.
- Pausing/clearing a batch does not remove website photos. Phone deletions never propagate. Keep source files until upload finishes.
- Wi-Fi-only waits for unmetered Wi-Fi. Otherwise Android can use an available internet connection. Camera Wi-Fi plus cellular must be tested on the S25 Ultra.
- Uploads preserve the gallery's visibility. Hidden and coming-soon galleries can receive photos before you publish them in the dashboard.
- Tailscale and other VPN networks are eligible for transfers. The queue displays Android's pending-job reason when a job is delayed. After updating from the first beta, tap **Pause**, then **Resume** to replace the old network request without clearing your queue.

## GitHub builds and signing

`.github/workflows/android.yml` runs emulator tests, unit tests, and Android lint, builds an APK, and stores an Actions artifact. Tags beginning `android-v` additionally build a signed release. Versions containing a hyphen are prereleases; other versions are published as the latest stable release.

Repository Actions secrets:

- `GALLERY_ANDROID_KEYSTORE`: base64-encoded PKCS12/JKS keystore, alias `gallery`.
- `GALLERY_ANDROID_KEYSTORE_PASSWORD`: store and key password.

Keep an independent secure backup of this signing key. Never commit it. Increment both `versionCode` and `versionName` in `app/build.gradle.kts` before subsequent releases; update `RELEASE_NOTES.md`, then tag the reviewed commit. Release tags must point to the code actually tested by CI. GitHub releases do not merge the feature branch into production.

Optional local build with JDK 17 and Android SDK 35:

```sh
cd android
./gradlew testDebugUnitTest lintDebug assembleDebug
```

The Gradle wrapper and pinned dependency versions are included. No proprietary upload SDK, analytics, or desktop server is needed.

## Website rollout and device checks

Apply outstanding D1 migrations to the **preview** database `ayoub-gallery-data-preview`, verify the preview bindings in `scripts/deploy-preview-worker.mjs`, and deploy the feature branch to preview using the repository's authorized deployment workflow. Verify uploads, creation, moderation, and media there before merging. Deploy production only from clean `master`, with outstanding production migrations applied. Keep `/admin/galleries/*` and `/api/admin/galleries/*` behind Cloudflare Access. `/api/companion/*` uses its own revocable device bearer key and must not be redirected to interactive Access login. `/api/gallery-media/*` serves only public gallery images from that environment's R2 bucket.

Before production: test LUMIX directory visibility, 400-photo batches with screen locked, rotation and large fonts, light/dark themes, notification denial, Wi-Fi/cellular handoff, mid-upload process death, expired/revoked keys, duplicate retries, and removal followed by resync. Android can stop long jobs; persisted state and recovery are essential. The source folder must be accessible through Android's picker; app-private LUMIX storage would need an explicit export or another supported source.
