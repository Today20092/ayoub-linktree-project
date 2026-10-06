# Native gallery management

Guest access now uses separate unlisted viewing and moderated submission links. Guest passwords are retired; see [Gallery sharing links](gallery-sharing-links.md) for current behavior, compatibility, and rollback limitations. Historical password setup below does not apply to the current backend.

The Android app opens native management screens from **Galleries → select a gallery → Manage**. The website dashboard groups the same controls into Details, Sharing & uploads, Guest access, and Photos. Date selection on the website uses a compact date field.

## Android controls

- Create galleries from the gallery list. New galleries default to hidden until published.
- Details: name, category, about text, venue, event date and time, and published / coming soon / hidden visibility.
- Access: enable guest submissions, set or rotate the upload password, create named guest invites, and share existing invites.
- Photos: preview pending submissions, approve or reject them, remove published guest photos, hide or restore professional photos, and choose a cover from published photos.
- Sharing: share the public link and replace the flyer and cover from the Android photo picker.
- Photographer uploads continue through the existing folder scanning and persistent upload queue.

Date and time dialogs use Compose Material 3 under the app's dynamic light/dark color scheme. Calendar values are interpreted as UTC calendar dates, then combined with the selected local time for upload filtering. Cancelling either picker leaves the filter unchanged.

The native visual direction uses tonal cards, 16dp rounded fields, 24dp cards, and controls at least 48dp tall. References were [ImageToolbox's date picker](https://github.com/T8RIN/ImageToolbox/blob/master/core/ui/src/main/kotlin/com/t8rin/imagetoolbox/core/ui/widget/enhanced/EnhancedDatePickerDialog.kt) and [ObtainX's Material theme](https://github.com/bikram-agarwal/ObtainX/blob/main/lib/theme.dart). The implementation uses this app's existing Compose dependencies; no source code or packages were copied from those projects.

## Permissions and backend changes

Device pairing depends on `migrations/0005_gallery_companion.sql`; management permission depends on `0006_gallery_device_management.sql`. The latter adds `can_manage`, defaulting to false for existing keys. For a new environment, apply outstanding migrations and deploy the backend before pairing. Follow [AGENTS.md](../AGENTS.md) for preview isolation and production deployment.

Create a new key at `/admin/galleries/devices/` with **Allow gallery management** selected, then reconnect in the app's Settings. Existing upload-only keys keep working for uploads and cannot read management data or modify gallery settings. Management keys expire after 90 days and can be revoked on the same page.

`/api/companion/manage/[slug]/` requires management permission for reads, photo previews, and mutations. It uses the same command handler as the Cloudflare Access-protected web dashboard. Password hashes and salts are not included in its metadata response. Public image requests never receive the device bearer key.

`/api/companion/galleries/` lists galleries and accepts creation with a management key. Duplicate slugs are rejected rather than replacing an existing gallery. Uploads and known-file checks use the companion API's upload-only permissions.

The web dashboard and Android app share the website's gallery data. Uploads use that environment's R2 bucket and public media route. An APK release and a website deployment are separate operations. Use the [Android README](../android/README.md) for installation and signing, and its release notes for version-specific changes.

## Verification

Run the website verification suite for API or dashboard changes and the Android checks for native changes. Exercise creation, visibility, upload-only versus management keys, revocation, photo moderation, and media loading in isolated preview. Check dark/light pickers and gallery creation in the Android emulator suite. Physical-device upload checks and release-specific limits belong in the Android release notes.
