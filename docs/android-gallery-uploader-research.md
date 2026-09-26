# Android gallery uploader: FOSS reuse research

Researched 2026-09-26. Research only; no app or production changes. Release dates below were checked against upstream GitHub release APIs, not search-result timestamps. Recommendations are engineering judgments, not device-tested compatibility claims.

## Decision

**Reuse a focused upload component rather than fork an entire photo-management app.** The strongest component found is `background_downloader`, which Immich itself uses. If we choose Flutter, evaluate that package first. If we choose native Kotlin, implement the small uploader around Android's user-initiated transfer APIs and use Les Pas/Nextcloud as implementation references. Neither language choice is settled by this research.

For a ready-made experiment, **Round Sync is the closest folder-to-storage trial**, but its older release and missing gallery semantics make it a test aid, not the leading production foundation. Immich is the strongest complete photo-backup product here, but adopting it means running another server and connecting that server to this website.

The target remains: S25 Ultra; LUMIX shared folder with capture-time cutoff or separate SD-card import folder; 300–400 JPEGs at 1–5 MB; a snapshot batch started by one tap; immediate publication; duplicate skipping; retries; Wi-Fi-only toggle; no propagation of phone deletions and no resurrection of gallery deletions. No desktop dependency.

## Candidates

| Project               | Useful existing behavior/code                                                                                                                                                   | Fit and limits                                                                                                                                                                     | License and maintenance evidence                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Immich**            | Selected device albums, background backup, duplicate prevention; substantial upload UI and state handling.                                                                      | Requires Immich's server/API. A whole fork brings its library, account, database, and generated API layers. Better as a reference and a route to its standalone upload dependency. | AGPL-3.0; [v3.2.2 released 2026-09-15](https://github.com/immich-app/immich/releases/tag/v3.2.2). [Features and license](https://github.com/immich-app/immich).                                                                                                                                           |
| **Nextcloud Android** | Folder auto-upload and an existing native upload queue. Current `FileUploadWorker` extends `CoroutineWorker`, manages notifications, and integrates Nextcloud accounts/storage. | Good queue/error-handling reference, but not a drop-in uploader for our endpoint. Requires Nextcloud or substantial adaptation.                                                    | Root GPLv2; README says contributions since 2016-06-16 are AGPLv3-or-later: inspect individual file licenses. [License statement](https://github.com/nextcloud/android#contribution-guidelines--license-). [35.0.0 released 2026-09-16](https://github.com/nextcloud/android/releases/tag/stable-35.0.0). |
| **Les Pas**           | Native Kotlin photo app; per-folder backup settings; distinguishes one-way camera-roll backup from two-way album sync.                                                          | Best permissively licensed _photo-app reference_. Its default six-hour background camera backup differs from our immediate batch. Nextcloud/WebDAV/account coupling remains.       | Apache-2.0. [README](https://github.com/scubajeff/lespas), [2.11.5 released 2026-08-31](https://github.com/scubajeff/lespas/releases/tag/2.11.5).                                                                                                                                                         |
| **Round Sync**        | rclone Android UI, saved tasks, intent-triggered tasks, SAF support for SD/USB, many storage backends.                                                                          | Closest existing folder-transfer experiment. Would need a storage-to-gallery bridge, capture-time selection, and deletion history. Modern Samsung reliability must be tested.      | GPLv3 app; contribution terms differ, so do not assume the whole app is MIT. [README](https://github.com/newhinton/Round-Sync), [2.5.6 released 2024-09-10](https://github.com/newhinton/Round-Sync/releases/tag/v2.5.6). Repository API last push: 2025-11-16; not archived.                             |
| **Piwigo Android**    | Album navigation and photo upload, closer conceptually to event galleries.                                                                                                      | Requires Piwigo; the inspected official repository is too old to lead a modern Android build. This is not a claim that every Piwigo mobile client is inactive.                     | GPLv3-or-later. [Official repository](https://github.com/Piwigo/Piwigo-Android); latest release v1.0.2, 2019-10-25; repository last push 2021-05-12.                                                                                                                                                      |

PhotoPrism is a server-side photo product, not a reusable native uploader. Its documentation recommends external upload tools including PhotoSync. PhotoSync is a separate product; this research found no FOSS source foundation to reuse from it. Do not confuse PhotoPrism's source availability with PhotoSync's. [PhotoPrism mobile-upload documentation](https://docs.photoprism.app/user-guide/sync/mobile-devices/)

## Components worth reusing

### 1. background_downloader — leading Flutter candidate

Immich's [background upload service](https://github.com/immich-app/immich/blob/f8f4051a24fffa49accb96bd4f107f8b8d5915e9/mobile/lib/services/background_upload.service.dart) imports this standalone package. Its own documentation covers multipart/binary uploads, batch progress, durable task tracking, Android WorkManager and Android 14+ user-initiated transfer jobs. This is a much smaller dependency than a fork of Immich. [Upstream documentation](https://github.com/781flyingdutchman/background_downloader)

The [actual license](https://github.com/781flyingdutchman/background_downloader/blob/7a4c1891d0c8606fd45fb4250b7ec1d871732e46/LICENSE) contains BSD three-clause terms plus an MIT notice for included `localstore` code; GitHub's automated license label is `NOASSERTION`. Published package [9.6.3](https://pub.dev/packages/background_downloader/versions/9.6.3) dates to 2026-09-25, and upstream's inspected commit is from the same day.

Evaluate shared-folder URI access, payload/auth handling, and current Samsung behavior before adopting it. A package's task persistence does not itself implement gallery duplicate records, deletion tombstones, capture-time filtering, or server-side idempotency. Do not copy Immich's AGPL application code merely because its separate dependency has permissive terms.

### 2. Native Android references

Les Pas's [SyncAdapter](https://github.com/scubajeff/lespas/blob/509ad494d4a5209e2d1cd5c833d8cce4bb24bee2/app/src/main/java/site/leos/apps/lespas/sync/SyncAdapter.kt) uses MediaStore, EXIF, and its WebDAV helper. It is approximately 2,385 lines with many app-specific dependencies: useful material to study or selectively adapt under its license, not a clean standalone upload module.

Nextcloud's [FileUploadWorker](https://github.com/nextcloud/android/blob/84efb5c35c392d6fdc285ba6ba68c553cbe7f0c3/app/src/main/java/com/nextcloud/client/jobs/upload/FileUploadWorker.kt) shows foreground progress and persistent upload integration, but also substantial Nextcloud coupling. Prefer learning the separation of queue, network, notification, and account state over copying a large subsystem.

### 3. Android Upload Service — secondary candidate

`gotev/android-upload-service` is Apache-2.0 Kotlin code for HTTP multipart/binary uploads, retries with backoff, notifications, and persisted requests. Its README explicitly lists Android 5–14 and says uploads stop if the app process is killed. Latest [4.9.4 release](https://github.com/gotev/android-upload-service/releases/tag/4.9.4) is 2025-01-18. It therefore needs a current-Android investigation before becoming our transfer engine. [Upstream documentation and license](https://github.com/gotev/android-upload-service)

## Integration constraints

The current website is not an S3/WebDAV gallery API. Its admin guard verifies Cloudflare Access identity; uploading optimizes the image, generates an ID, writes R2 bytes, and inserts gallery metadata in D1. A generic client writing R2 objects alone does not publish gallery records or create deduplication behavior. Preserve authentication while designing an app-specific authorized upload path. [Admin guard](../src/lib/gallery-admin.ts), [upload command](../src/lib/gallery-admin-commands.ts)

For Round Sync/rclone, use copy semantics rather than mirroring: [`rclone copy`](https://rclone.org/commands/rclone_copy/) skips identical destination files and does not delete destination-only files. **However, a destination file deleted during curation can be copied again** because it is now absent. Thus copy alone does not satisfy our “never resurrect” requirement. A separate server-side upload history/tombstone is necessary regardless of client. Its [age filters](https://rclone.org/filtering/) concern modification time, not necessarily JPEG capture time; they do not establish our “photos taken since” rule.

A hosted import bridge could avoid the user's desktop, but adds infrastructure and credentials. Existing Syncthing-to-computer plus an importer remains a reasonable personal backup path, but does not meet the requested independence from the computer. No additional photo server is justified solely to avoid writing a small gallery adapter.

## Proof required before implementation choice

Android's [user-initiated data transfer jobs](https://developer.android.com/develop/background-work/background-tasks/uidt) are intended for long transfers explicitly started by the user, with notification and persisted state. Users/system can still stop work. “Works while locked” is a device acceptance test, not an unconditional guarantee.

Android [SAF directory access](https://developer.android.com/training/data-storage/shared/documents-files) can persist access to a chosen directory, but restricted app-private locations matter. LUMIX's actual saved location must be inspected on the phone; no source here proves that location.

1. Confirm LUMIX folder visibility through MediaStore or the directory picker; test SD-import folders separately.
2. Compare EXIF capture time, timezone, and imported-file timestamps; show a count before enqueuing the fixed batch.
3. Upload 400 JPEGs with the phone locked, app switched, and Samsung battery management at normal settings; record recovery after termination/reboot.
4. Test camera Wi-Fi plus cellular internet, Wi-Fi-only mode, offline interruptions, and expired authentication.
5. Repeat a batch, rename identical bytes, retry after a lost success response, delete a website photo, and delete a phone photo. Verify no duplicate publication or deletion resurrection.

**Recommended next step:** a small transfer feasibility comparison using the standalone Flutter component versus native Android UIDT, without committing to a full UI, app fork, or new server. Test only against isolated preview resources. Then build the minimal gallery/folder/cutoff/Sync interface around the proven option.
