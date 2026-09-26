# Android watched-folder upload

Design confirmed by the user and implemented for Android 0.4.0. Validation and remaining field checks are recorded below. See [GitHub Releases](https://github.com/Today20092/ayoub-linktree-project/releases) for signed APKs.

## Confirmed behavior

- The operator selects the gallery, folder, and upload settings before starting a session.
- Watching continues until the operator stops the session, including while the screen is locked.
- Only new arrivals are eligible. Files already in the folder when the session starts are excluded.
- Uploads are one-way. Local edits and deletions do not change uploaded gallery photos.
- The selected capture-date/time filter also applies to new arrivals. An older photo arriving during a session remains excluded by that filter.
- When connectivity is lost, eligible arrivals are queued and uploads catch up automatically when connectivity returns.
- Stop watching ends discovery; already queued uploads finish. Pausing uploads is a separate control.
- After a phone restart, the operator reopens the app and explicitly resumes the saved session.
- Watching includes subfolders of the selected folder.
- Only one watched folder/gallery session is active at a time initially.
- Target discovery within 15 seconds after copying finishes. This target requires device testing and is not a guarantee.
- Uploads respect the existing Wi-Fi-only setting. Cellular is allowed when that setting is off.

- Resuming an interrupted session catches up on missed arrivals using the original session's starting point. Starting a new session excludes files already present at that new start.
- Wait until an arriving file appears complete before uploading. If it changes before upload finishes, retry after it settles; never mark a partial upload successful.
- Editing or replacing an already uploaded file does not automatically upload another version. Publishing an edited version requires a deliberate manual upload.
- Changing the gallery, folder, or capture-time filter requires stopping watching and finishing or clearing the remaining queue before starting with new settings.
- A permanently failed file remains visibly failed while other files continue.
- Losing folder access pauses discovery and prompts the operator to restore access.

## Implementation verification

Discovery uses recursive Storage Access Framework queries every five seconds in an explicitly started foreground service. SQLite stores the session, baseline paths, observed file metadata, and queue membership. New files must settle for at least five seconds, have JPEG start/end markers, and remain unchanged during hashing. Uploads recheck the source and retain the server's SHA-256 verification. Baseline and handled paths remain excluded even when replaced. Renamed paths are new candidates, with existing checksum receipts preventing identical-byte reuploads.

The foreground service only discovers files; automatic transfers use ordinary network-constrained jobs because background discovery cannot assume eligibility to schedule user-initiated transfer jobs. Manual uploads retain their user-initiated jobs. The service holds a renewable, bounded wake lock while watching and has an explicit Stop notification action. Reboot and process death require reopening and resuming the saved session.

Files that remain unreadable or incomplete across twelve discovery attempts are surfaced for retry. Changing their metadata allows another attempt. A missing or inaccessible folder pauses discovery without replacing the baseline.

The implementation must still verify the screen-locked discovery-delay target on the intended phone and folder provider. Metadata stability and JPEG markers are heuristics; the server remains responsible for validating and processing uploaded images.

Verification should cover files present at session start, eligible and filtered new arrivals, arrivals in subfolders, offline catch-up, restart/resume, stopping discovery while uploads finish, incomplete copies, changed files, permanent upload failures, and revoked folder access.

### Local validation, September 26, 2026

- 13 JVM unit tests passed, including seven watched-file state tests.
- 16 instrumentation tests passed on an Android 15 ARM64 emulator. The watched-folder integration tests exercise discovery with the screen off, incomplete-copy completion, recursive discovery, date filtering, uploads paused during discovery, lost folder access and recovery, missed arrivals, stopping without clearing the queue, and recovery of a saved in-progress upload. A background-job test verifies automatic scheduling and the upload-pause preference without contacting a server.
- Database tests verify version-one migration, persistent baselines, duplicate arrivals, destination guards, and protection against a late scan restarting a stopped session.
- Debug build and lint passed. Release compilation and vital lint passed; release packaging requires the existing signing key, which was not configured locally. Signing configuration was not changed.
- Markdown formatting and `git diff --check` passed.

Physical S25 Ultra/LUMIX-provider testing, a real reboot, large-folder timing and battery measurements, and end-to-end preview uploads through network loss remain field checks. Emulator discovery while uploads are paused is not a substitute for a real network-handoff test. Release signing runs in GitHub Actions using the existing signing key.

## Checksum discussion

The existing upload protocol uses SHA-256 for original-file identity within a gallery. The user asked whether a different algorithm would be preferable; no algorithm change has been agreed.

Recommendation: retain SHA-256 and avoid repeatedly hashing unchanged files. The server independently verifies the supplied hash; existing duplicate receipts and retry handling depend on it. Benchmark on the target device before considering an algorithm migration.

## Android references

- [Foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types#special-use): continuous user-visible folder monitoring declares its special-use subtype. Uploads remain separate jobs.
- [User-initiated transfer jobs](https://developer.android.com/develop/background-work/background-tasks/uidt): scheduling restrictions make these unsuitable for assuming every background arrival is a new user-initiated transfer.
