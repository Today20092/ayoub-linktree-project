# Ayoub Gallery for Android

A personal companion for publishing camera JPEGs to Ayoub's event galleries. Built with Kotlin, Jetpack Compose, and Material 3: dynamic wallpaper colors, light/dark themes, rounded tonal cards, and three simple destinations: Galleries, Uploads, Settings.

The interface takes design direction from [ImageToolbox](https://github.com/T8RIN/ImageToolbox) and [ObtainX](https://github.com/bikram-agarwal/ObtainX). No code or brand assets were copied from either app. Native Android transfer jobs were chosen over the Flutter upload library explored in [our research](../docs/android-gallery-uploader-research.md).

## Download and updates

[Download from GitHub Releases](https://github.com/Today20092/ayoub-linktree-project/releases) · [Obtainium](https://obtainium.imranr.dev/)

Install `ayoub-gallery.apk` from an **Android** release. Android 14 or newer is required. The app ID is `xyz.ayoubabed.gallery`. The first releases are prereleases for device testing, not claims of completed field testing.

In Obtainium or ObtainX:

1. Add `https://github.com/Today20092/ayoub-linktree-project` as the source.
2. Enable prereleases while testing the beta.
3. Set the release-title filter to `^Ayoub Gallery` and APK filter to `^ayoub-gallery\.apk$` if the client offers these filters.
4. Install the signed release APK. Later versions use the same application ID and signing key, so they update the app without clearing its connection or queue.

Do not install the debug Actions artifact over the release app: it has a different signing key. Use release APKs for ongoing testing and Obtainium updates. Android asks for installation permission from whichever browser/updater you use. There is no in-app updater yet.

## First connection

The companion server changes and migration `0005_gallery_companion.sql` must be deployed before pairing works. Publishing an APK does **not** deploy the website. The app defaults to the isolated preview website for testing; production is unchanged until separately deployed.

1. Open Settings in the app. Confirm the preview website address.
2. Tap **Get a pairing key**. Sign into the existing gallery admin through Cloudflare Access.
3. Name your phone and create a key. Copy it into the app and tap **Connect**.
4. Pick a published gallery. Choose the LUMIX folder or an SD-import folder using Android's directory picker.
5. For LUMIX's shared folder, set **Photos taken since**. For a dedicated event folder, leave all dates selected.
6. Check for photos, review the count, and tap **Sync & publish**. Allow notifications to see progress while the phone is locked.

Device keys allow listing galleries and uploading photos only, expire in 90 days, and can be revoked in the dashboard. The phone encrypts its key using Android Keystore. Backups are disabled so the key is not exported with app data.

## Sync behavior

- A sync captures a fixed batch; new arrivals wait for the next scan.
- JPEG files up to 20 MB are supported. The server keeps the existing 2400px, quality-90 web processing.
- SHA-256 identifies identical original bytes within each gallery, including renamed files. Server receipts survive later photo removal. Edited/recompressed files count as new photos. Previously uploaded website photos without companion receipts cannot be recognized retroactively.
- EXIF capture time is preferred. Without a usable capture date, file modification time is used and disclosed before upload. EXIF without an offset uses the phone's timezone; set the camera clock correctly.
- Failed uploads retry with backoff. The queue survives process death; **Resume/Retry** recovers unfinished files. After a reboot or force-stop, reopen the app and resume. No promise of unattended auto-resume is made.
- Pausing/clearing a batch does not remove website photos. Phone deletions never propagate. Keep source files until upload finishes.
- Wi-Fi-only waits for unmetered Wi-Fi. Otherwise Android can use an available internet connection. Camera Wi-Fi plus cellular must be tested on the S25 Ultra.
- Only published galleries accept companion uploads. Hidden/coming-soon galleries must be published explicitly in the dashboard first.

## GitHub builds and signing

`.github/workflows/android.yml` runs unit tests and Android lint, builds an APK, and stores an Actions artifact. Tags beginning `android-v` additionally build a signed release and attach it to a GitHub prerelease.

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

Apply D1 migration 0005 to the **preview** database `ayoub-gallery-data-preview`, verify the preview bindings in `scripts/deploy-preview-worker.mjs`, and deploy the feature branch to preview using the repository's authorized deployment workflow. Keep `/admin/galleries/*` and `/api/admin/galleries/*` behind Cloudflare Access. `/api/companion/*` uses its own revocable device bearer key and must not be redirected to interactive Access login.

Before production: test LUMIX directory visibility, 400-photo batches with screen locked, rotation and large fonts, light/dark themes, notification denial, Wi-Fi/cellular handoff, mid-upload process death, expired/revoked keys, duplicate retries, and removal followed by resync. Android can stop long jobs; persisted state and recovery are essential. The source folder must be accessible through Android's picker; app-private LUMIX storage would need an explicit export or another supported source.
