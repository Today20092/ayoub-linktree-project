# Ayoub Gallery 0.4.0

Watched-folder uploads automatically queue new JPEGs imported into your selected folder.

## Using watched folders

1. Select the gallery, folder, capture-time filter, and Wi-Fi preference.
2. Tap **Start watching** before importing new photos. Files already present are excluded.
3. Import JPEGs into the folder or its subfolders. The app waits for completed files and queues eligible arrivals.
4. Tap **Stop watching** to end discovery. Photos already queued can finish uploading. **Pause uploads** pauses transfers while discovery continues.

The session saves its original baseline. After a restart, reopen the app and tap **Resume watching** to catch up on missed arrivals. Starting a new session creates a new baseline.

- Local edits and deletions do not change website photos.
- Identical files still use the existing SHA-256 duplicate checks.
- Lost folder access pauses discovery and offers a restore action.
- Failed or incomplete files remain available for retry while other files continue.
- Watching uses a visible notification and consumes battery while active. Android controls when background transfers run.

## Installation

Install `ayoub-gallery.apk` over the previous signed release. The app keeps your connection and queue, and migrates its local database. Android 14 or newer is required. Do not uninstall or clear app data to update.

For production, use `https://ayoubabed.xyz` and a pairing key from that website. Gallery management requires **Allow gallery management** on the key. Preview photos and keys remain separate from production.

[Setup and update instructions](https://github.com/Today20092/ayoub-linktree-project/blob/master/android/README.md)

## Verification and remaining field checks

The implementation passed 13 unit tests and 16 Android 15 emulator tests locally, including screen-off discovery, saved-session recovery, incomplete copies, subfolders, date filtering, and paused uploads. Release CI reruns emulator tests, unit tests, lint, and signed packaging.

Physical S25 Ultra/LUMIX-provider testing, real reboot recovery, large-folder timing, battery use, and end-to-end uploads through network loss remain field checks. The 15-second discovery target is not a guarantee. After a force-stop or reboot, reopen the app and resume the saved session.

This release uses the existing website upload API and needs no new server migration.
