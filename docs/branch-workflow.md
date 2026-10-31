# Git workflow

`master` is the reviewed release branch and the remote default. `development` is the integration branch: finished work is combined and checked there before promotion. This policy records those roles. It does not create `development`, rename `master`, push, or open a pull request.

The current event-portrait batch is integrated on `Today20092/rockfish` in the rockfish workspace. Treat that branch as this batch's integration branch until it is promoted or folded into `development`.

## Everyday work

One task at a time is committed on the integration branch. Push that branch when a backup is explicitly requested. A push is a backup, not a test result and not a release.

Parallel work uses a temporary branch and worktree cut from the current integration branch. Agent branches use `codex/<scope>`. An Orca workspace may use the slug passed to `orca worktree create --branch`. Keep the primary checkout and existing worktrees.

Merge a finished temporary branch into the integration branch and run checks on that combined tree. A later commit on the temporary branch is absent from the integration tree until it is merged again.

External contributions use a pull request into the integration branch. The same checks below apply.

## Checks

Website code or content: `npm run verify` on the integration branch.

Android code: the unit, lint, and emulator checks in [android/README.md](../android/README.md#github-builds-and-signing) and [`.github/workflows/android.yml`](../.github/workflows/android.yml).

Documentation-only edits: format the changed Markdown and check its links. A website build is not required for documentation alone.

## Promotion

Fetch before synchronizing. When the branch can advance without divergence, use `git pull --ff-only`. When histories diverge, inspect both sides and merge on purpose. Keep local commits.

Promote a tested batch with a pull request from the integration branch into `master`, merged with a merge commit. Record the source revision and the checks that ran. Bring `master`-only fixes back into the integration branch with a merge before the next batch.

After the temporary branch is contained in the integration branch, and its uncommitted files are kept or discarded on purpose, remove that worktree with `orca worktree rm`. Leave `master`, the integration branch, and unrelated worktrees in place.

## What a merge does

Merging to `master` does not deploy the website. Production deploy is a separate command from a clean `master` checkout: `npm run deploy:prod`. Preview deploy is `npm run deploy`.

Pushing `master` does not build the Android app. The Android workflow runs on a pull request that changes `android/**`, on `workflow_dispatch`, on pushes to `codex/android-gallery-uploader` that change `android/**`, and on tags `android-v*`. A tag `android-v*` builds the signed APK and publishes a GitHub Release. Version selection for that tag is in [the versioning policy](releasing.md).

Remote merge settings, branch protection, and whether `development` exists on the remote were not changed or fetched for this policy.
