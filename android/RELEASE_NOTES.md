# Ayoub Gallery 0.3.0

Stable release for the production website, with compact headers and native gallery management.

- Galleries, Uploads, Settings, and New gallery use a compact, single-row toolbar.
- The duplicate “Your galleries” banner is hidden once your website is connected.
- Existing native gallery creation, management, uploads, and dark-theme pickers remain available.
- New installations connect to `https://ayoubabed.xyz` by default. Existing connections and upload queues are preserved.
- Preview connections are labeled. Finish or clear a pending batch before changing websites; keys and galleries are never moved automatically.
- Settings shows the installed app version.

- Search galleries and open their management controls directly from the gallery list.
- Edit event details and visibility, manage guest upload passwords, and create or share guest invites.
- Review guest photos, approve or delete submissions, hide or restore professional photos, and choose a cover.
- Share the public gallery link and replace the flyer from your phone.
- Date and time pickers follow the phone's light or dark theme and wallpaper colors.
- Uploads retain support for hidden and coming-soon galleries, Tailscale, and resumable batches.

## Installation

Install over the previous beta. Pairing and queued photos are preserved. Existing pairing keys remain upload-only. To manage galleries, create a new key at your website's `/admin/galleries/devices/` page with **Allow gallery management** enabled, then reconnect in Settings. Do not uninstall or clear app data.

To switch from preview to production, finish or clear your current upload batch, set the website to `https://ayoubabed.xyz`, and create a production key at [Device pairing](https://ayoubabed.xyz/admin/galleries/devices/). Your preview galleries and photos stay in preview. Stable releases can be followed in Obtainium/ObtainX without enabling prereleases.

Download `ayoub-gallery.apk`. Requires Android 14+. Use this signed release for future updates; debug artifacts have a different signing key. Obtainium/ObtainX setup is in [the Android README](https://github.com/Today20092/ayoub-linktree-project/blob/master/android/README.md).

## Testing status and limitations

CI runs Android unit tests and lint before attaching the APK. Backend tests cover authorization expiry/revocation, checksum identity, duplicate/deletion behavior, concurrent requests, stale leases, and failed processing recovery.

No S25 Ultra field test has been performed. LUMIX folder access, locked-screen transfers, camera Wi-Fi with cellular, and 400-photo batches need device testing. After reboot or force-stop, open the app and resume the saved queue.

Management requires the website update and D1 migration `0006_gallery_device_management.sql`. Use the same website address when creating a key and connecting the app. Existing uploaded photos have no companion checksum receipts, so the first sync cannot deduplicate against those older uploads.
