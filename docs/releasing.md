# Versioning

Two products share this repository. The website and the Android companion are released separately. Writing this policy does not change a version, tag, or deploy.

## Website

The public site is `https://ayoubabed.xyz`. Visitors depend on public pages, gallery viewing and upload links, and the admin and companion HTTP behavior those pages call.

There is no website release version. `package.json` `"version": "0.0.1"` is package metadata, not the deployed site. The deployed site is whatever clean `master` commit was last published with `npm run deploy:prod`.

A website change ships by promotion to `master` and a separate production deploy. See [the Git workflow](branch-workflow.md). Documentation-only commits ride along with the next deploy and do not make a release by themselves.

## Android

The app id is `xyz.ayoubabed.gallery`. The version people install is `versionName` in `android/app/build.gradle.kts`. The current source value is `0.4.0` with `versionCode` 7. Git tags use `android-v` plus that version name, for example `android-v0.4.0`. The published release title comes from the tag. A hyphen in the version suffix marks the GitHub Release as a prerelease.

People depend on an update keeping the same app id and signing key, the saved connection, the upload queue, and gallery access. Publishing an APK does not deploy the website. Backend changes the app needs are deployed before that APK is distributed.

While the major version stays `0`:

- A fix that leaves saved data and the current companion API usable increments the patch number: `0.4.0` to `0.4.1`.
- New behavior that leaves saved data and the current companion API usable increments the minor number and resets the patch: `0.4.1` to `0.5.0`.
- A change that breaks saved data or the companion API the current app uses also increments the minor number, and the release notes describe recovery. This `0.y.z` line does not promise that older app builds understand newer server behavior beyond what the release notes say.
- `1.0.0` is the version that starts the maintained contract: newer app versions keep opening data and sessions written by `1.0.0` and later, and the release notes name any break.

`versionCode` increases by 1 for every APK that can be installed over the previous one. Released versions stay immutable.

Readiness labels, when used, are SemVer suffixes: `-alpha.N`, `-beta.N`, `-rc.N`. No suffix means the release is the one Obtainium should treat as stable. `0.4.0` is the current stable Android name in source. Physical-phone limits stay in `android/RELEASE_NOTES.md`.

## Prepare a release

1. Choose the reviewed `master` commit. For Android, set `versionName` and `versionCode` to an unused pair and match the tag to `versionName`. For the website, record the `master` commit instead of a version number.
2. Update `android/RELEASE_NOTES.md` for an Android release so the notes match that version, including migration and known limits. Website deploy notes stay with the promotion record.
3. Run `npm run verify` for website source. For Android, the release evidence is the `android-v*` workflow: unit tests, lint, emulator checks, and the signed APK. State any check that did not run.
4. Confirm the tag suffix matches the intended channel. A tag without a hyphen publishes as the latest stable release. A tag with a hyphen publishes as a prerelease.
5. Publish only after an explicit request. An Android tag push is the publication. A website production deploy is `npm run deploy:prod` from clean `master`. Confirm the public release or the deployed site afterward.
