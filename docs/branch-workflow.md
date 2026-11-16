# Git workflow

`master` is the reviewed release branch, the remote default, and the branch production deploys from. Every change reaches `master` through a pull request from a short-lived branch. There is no separate integration branch; `development` and `Today20092/rockfish` are retired and receive no new work.

## Everyday work

Cut a branch from an up-to-date `origin/master` for each task. Agent branches use `codex/<scope>` or a short descriptive name. An Orca workspace may use the slug passed to `orca worktree create --branch`. Keep the primary checkout and existing worktrees.

Open a pull request from that branch into `master` once the checks below pass. A push is a backup, not a test result and not a release. External contributions use the same pull request flow and checks.

## Checks

Website code or content: `npm run verify` on the pull request branch. The [Website workflow](../.github/workflows/website.yml) runs it on every pull request, and on pushes to `master` that change files outside `android/`.

Android code: the unit, lint, and emulator checks in [android/README.md](../android/README.md#github-builds-and-signing) and [`.github/workflows/android.yml`](../.github/workflows/android.yml).

Documentation-only edits: format the changed Markdown and check its links. A website build is not required for documentation alone.

## Merging

Fetch before branching or synchronizing. When a branch falls behind `master`, merge or rebase `origin/master` into it on purpose and rerun the checks. Keep local commits.

Merge the pull request into `master` with a merge commit. Record the checks that ran in the pull request.

After the branch is merged, and its uncommitted files are kept or discarded on purpose, remove its worktree with `orca worktree rm` and delete the branch. Leave `master` and unrelated worktrees in place.

## What a merge does

Merging to `master` does not deploy the website. Production deploy is a separate command from a clean `master` checkout: `npm run deploy:prod`. Preview deploy is `npm run deploy`.

Pushing `master` does not build the Android app. The Android workflow runs on a pull request that changes `android/**`, on `workflow_dispatch`, on pushes to `codex/android-gallery-uploader` that change `android/**`, and on tags `android-v*`. A tag `android-v*` builds the signed APK and publishes a GitHub Release. Version selection for that tag is in [the versioning policy](releasing.md).

## Automated maintenance

- [Dependabot](../.github/dependabot.yml) opens grouped update pull requests: npm and Gradle weekly, GitHub Actions monthly. Treat them like any other pull request; merge only after the checks pass.
- GitHub CodeQL default setup, secret scanning, and push protection run from the repository's security settings.
- Branch protection on `master` requires the `verify` check from the Website workflow.
