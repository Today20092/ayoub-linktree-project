# Ayoub Gallery 0.1.0 beta 1

First Android test build with a Material 3 interface inspired by ImageToolbox and ObtainX.

- Connect a device using a revocable dashboard pairing key.
- Choose a gallery and folder; filter by photo capture time.
- Review a batch and publish JPEGs, with checksum duplicate detection.
- Persistent upload queue, notification progress, retries, pause/resume, and optional Wi-Fi-only transfers.
- Dynamic colors and system light/dark themes.

## Installation

Download `ayoub-gallery.apk`. Requires Android 14+. Use this signed release for future updates; debug artifacts have a different signing key. Obtainium/ObtainX setup is in [the Android README](https://github.com/Today20092/ayoub-linktree-project/blob/codex/android-gallery-uploader/android/README.md).

## Testing status and limitations

CI runs Android unit tests and lint before attaching the APK. Backend tests cover authorization expiry/revocation, checksum identity, duplicate/deletion behavior, concurrent requests, stale leases, and failed processing recovery.

No S25 Ultra field test has been performed. LUMIX folder access, locked-screen transfers, camera Wi-Fi with cellular, and 400-photo batches need device testing. After reboot or force-stop, open the app and resume the saved queue.

**The website companion API and D1 migration must be deployed separately to preview before pairing/upload tests.** This release does not deploy or change production. Existing uploaded photos have no companion checksum receipts, so the first sync cannot deduplicate against those older uploads.
