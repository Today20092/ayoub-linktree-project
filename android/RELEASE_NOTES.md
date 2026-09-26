# Ayoub Gallery 0.2.1 beta 1

Create galleries directly from Android. Uploaded photo links now use the connected website's storage, fixing missing preview photos without re-uploading.

- Tap **New gallery**, enter its name and description, and choose visibility. New galleries default to hidden.
- Continue straight into native management to set dates, covers, guest access, and photos.
- Creation requires a pairing key with gallery management enabled. Failed requests preserve entered details.

- Search galleries and open their management controls directly from the gallery list.
- Edit event details and visibility, manage guest upload passwords, and create or share guest invites.
- Review guest photos, approve or delete submissions, hide or restore professional photos, and choose a cover.
- Share the public gallery link and replace the flyer from your phone.
- Date and time pickers follow the phone's light or dark theme and wallpaper colors.
- Uploads retain support for hidden and coming-soon galleries, Tailscale, and resumable batches.

## Installation

Install over the previous beta. Pairing and queued photos are preserved. Existing pairing keys remain upload-only. To manage galleries, create a new key at your website's `/admin/galleries/devices/` page with **Allow gallery management** enabled, then reconnect in Settings. Do not uninstall or clear app data.

Download `ayoub-gallery.apk`. Requires Android 14+. Use this signed release for future updates; debug artifacts have a different signing key. Obtainium/ObtainX setup is in [the Android README](https://github.com/Today20092/ayoub-linktree-project/blob/codex/android-gallery-uploader/android/README.md).

## Testing status and limitations

CI runs Android unit tests and lint before attaching the APK. Backend tests cover authorization expiry/revocation, checksum identity, duplicate/deletion behavior, concurrent requests, stale leases, and failed processing recovery.

No S25 Ultra field test has been performed. LUMIX folder access, locked-screen transfers, camera Wi-Fi with cellular, and 400-photo batches need device testing. After reboot or force-stop, open the app and resume the saved queue.

Management requires the website update and D1 migration `0006_gallery_device_management.sql`. Use the same website address when creating a key and connecting the app. Existing uploaded photos have no companion checksum receipts, so the first sync cannot deduplicate against those older uploads.
