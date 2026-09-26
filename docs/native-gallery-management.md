# Native gallery management

The Android app now opens native management screens from **Galleries → select a gallery → Manage**. The website dashboard groups the same controls into Details, Sharing & uploads, Guest access, and Photos. Date selection on the website uses a compact date field.

## Android controls

- Details: name, category, about text, venue, event date and time, and published / coming soon / hidden visibility.
- Access: enable guest submissions, set or rotate the upload password, create named guest invites, and share existing invites.
- Photos: preview pending submissions, approve or reject them, remove published guest photos, hide or restore professional photos, and choose a cover from published photos.
- Sharing: share the public link and replace the flyer and cover from the Android photo picker.
- Photographer uploads continue through the existing folder scanning and persistent upload queue.

Date and time dialogs use Compose Material 3 under the app's dynamic light/dark color scheme. Calendar values are interpreted as UTC calendar dates, then combined with the selected local time for upload filtering. Cancelling either picker leaves the filter unchanged.

The native visual direction uses tonal cards, 16dp rounded fields, 24dp cards, and controls at least 48dp tall. References were [ImageToolbox's date picker](https://github.com/T8RIN/ImageToolbox/blob/master/core/ui/src/main/kotlin/com/t8rin/imagetoolbox/core/ui/widget/enhanced/EnhancedDatePickerDialog.kt) and [ObtainX's Material theme](https://github.com/bikram-agarwal/ObtainX/blob/main/lib/theme.dart). The implementation uses this app's existing Compose dependencies; no source code or packages were copied from those projects.

## Server rollout

Apply `migrations/0006_gallery_device_management.sql` to the isolated preview D1 database before deploying the website update. This adds `can_manage`, defaulting to false for all existing device keys. Production requires the same migration as part of a separately authorized deployment.

Create a new key at `/admin/galleries/devices/` with **Allow gallery management** selected, then reconnect in the app's Settings. Existing upload-only keys keep working for uploads and cannot read management data or modify gallery settings. Management keys expire after 90 days and can be revoked on the same page.

`/api/companion/manage/[slug]/` requires management permission for reads, photo previews, and mutations. It uses the same command handler as the Cloudflare Access-protected web dashboard. Password hashes and salts are not included in its metadata response. Public image requests never receive the device bearer key.

Install the signed Android 0.2.0 beta 1 release over the previous version after the server rollout. An installed older APK will not gain these controls until updated.

## Validation

The website verification suite passed, including 40 gallery tests and the new management-permission checks. Android unit tests, lint, the debug APK, and instrumentation-test compilation passed. Local browser checks covered desktop and 390px mobile layouts, panel switching, retained draft fields, and disabled moderation actions with no selection.

No Android device or emulator was connected for this change. The new light/dark calendar instrumentation checks and native management flows still need to run on a device. Preview API testing requires the migration and deployment above.
