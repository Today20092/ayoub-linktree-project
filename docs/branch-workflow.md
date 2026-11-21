# Git workflow

`master` is the reviewed release branch, the remote default, and the branch production deploys from. Every change reaches `master` through a pull request from a short-lived branch. There is no separate integration branch; `development` and `Today20092/rockfish` are retired and receive no new work.

## Everyday work

1. Work in a worktree the host manages, based on current `origin/master`. A T3 Code thread on the main checkout moves itself with `t3_worktree_handoff` before editing; the project's worktree script runs `pnpm install --frozen-lockfile`. Without host worktree tools, use `git worktree add` and install there. Agent branches use `codex/<scope>` or a short descriptive name.
2. Commit work in progress instead of using `git stash`: stashes are shared by every worktree.
3. End every code task with a commit and a pull request to `master`, without being asked, once the checks below pass. Opening a PR is safe: a merge does not deploy. A push is a backup, not a test result and not a release. External contributions use the same pull request flow and checks.
4. Watch the PR's checks and fix failures until they pass.

## Checks

Website code or content: `npm run verify` on the pull request branch. The [Website workflow](../.github/workflows/website.yml) runs it on every pull request, and on pushes to `master` that change files outside `android/`.

Android code: the unit, lint, and emulator checks in [android/README.md](../android/README.md#github-builds-and-signing) and [`.github/workflows/android.yml`](../.github/workflows/android.yml).

Documentation-only edits: format the changed Markdown and check its links. A website build is not required for documentation alone.

## Merging

Fetch before branching or synchronizing. Use `git pull --ff-only` to advance a local `master`. Never force-push `master`.

Merge only when the user asks, with a merge commit. To merge without waiting, queue it with `gh pr merge --auto --merge`; GitHub merges once `verify` passes. `master` does not require branches to be up to date, so several PRs can each merge on their own checks. Record the checks that ran in the pull request.

After the merge, GitHub deletes the branch. Once its uncommitted files are kept or discarded on purpose, remove the worktree through the host (or `git worktree remove`). Leave `master` and unrelated worktrees in place.

## What a merge does

Merging to `master` does not deploy the website. Production deploy is a separate command from a clean `master` checkout: `npm run deploy:prod`. Preview deploy is `npm run deploy`.

Pushing `master` does not build the Android app. The Android workflow runs on a pull request that changes `android/**`, on `workflow_dispatch`, on pushes to `codex/android-gallery-uploader` that change `android/**`, and on tags `android-v*`. A tag `android-v*` builds the signed APK and publishes a GitHub Release. Version selection for that tag is in [the versioning policy](releasing.md).

## Automated maintenance

- [Dependabot](../.github/dependabot.yml) opens one monthly minor-and-patch pull request per ecosystem (npm, Gradle, GitHub Actions), majors one PR each, with a 7-day cooldown. [Auto-merge](../.github/workflows/dependabot-auto-merge.yml) queues npm and Actions minor and patch PRs to merge once `verify` passes; Gradle and major updates wait for a person.
- GitHub CodeQL default setup, secret scanning, and push protection run from the repository's security settings.
- Branch protection on `master` requires the `verify` check from the Website workflow. Auto-merge is allowed and merged branches are deleted automatically.
