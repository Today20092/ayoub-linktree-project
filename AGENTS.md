# AGENTS.md

## Project overview

This repository contains Ayoub Abedrabbo's Astro website and link hub, MDX portfolio, Cloudflare-backed event galleries, and native Kotlin/Compose Android app in `android/`.

## Task documentation

- For repository orientation, read `README.md` for the project map and production/preview boundaries.
- For homepage links, portfolio content, or shared page styles, read `docs/website-content.md`. Use `src/content.config.ts` and the MDX template for current portfolio fields.
- For gallery storage, guest uploads, moderation, or Access configuration, read `docs/interactive-event-galleries.md`.
- For gallery viewing/submission links, unlisted access, or sharing migrations and rollback, read `docs/gallery-sharing-links.md`. This guide supersedes historical guest-password instructions in the gallery guides.
- For gallery backend workflows, request lifecycles, publication failures, or retries, read `docs/gallery-effect-workflows.md`.
- For native gallery controls or companion API authorization, read `docs/native-gallery-management.md`.
- For Android pairing, upload behavior, builds, or signing, read `android/README.md`. Check `android/RELEASE_NOTES.md` and the relevant release tag before claiming a feature is available in an installed APK.
- For watched-folder discovery, session recovery, or background transfer changes, read `docs/android-watched-folder-design.md` and `docs/adr/0001-android-folder-discovery-and-transfer.md`.
- For payment destinations or payment-host routing, read `docs/payments.md`.
- For the barber field tracker, read `docs/barber-tracker.md`.
- For face search, SFace indexing, or browser face models, read `docs/sface-gallery-workflow.md`. The legacy Human indexer remains in `docs/event-galleries.md`.

Keep this file focused on working rules and task-specific pointers. Put operator instructions in the relevant guide, and update its README pointer when adding a new workflow. Verify documented behavior against the implementation; research and design notes do not establish release status.

## Development Commands

- For dependency installation and toolchain versions, follow [README development setup](README.md#development); `package.json` specifies Node and pnpm requirements.
- Use `npx astro add <integration>` for official Astro integrations; don't edit `package.json` manually.
- Check latest Astro docs before newer or changed APIs.
- Run `npm run dev` normally. Astro 7+ automatically backgrounds the server for coding agents; use `npx astro dev status` to reuse its URL/PID and `npx astro dev logs` for logs.
- Check `/_astro/status` for `{"ok":true}` before testing. Set `ASTRO_DEV_BACKGROUND=0` only for foreground logs.
- Don't use `--ignore-lock` for normal agent testing. It creates an untracked second foreground server, requires a different port, and cannot be combined with background mode or `--force`.

## Images

- Always render images with Astro's `Image` component from `astro:assets`. Don't add raw HTML `<img>` tags.
- Store local content images in `src/assets` so Astro can import, optimize, and generate responsive image output.
- For images in content collections, use Astro's `image()` schema helper and pass the metadata directly to `<Image />`.
- Remote images should also use `<Image />` with explicit dimensions or `inferSize`; authorize their domain or URL pattern when Astro should optimize them.

## Portfolio and Gallery Work

- A **portfolio piece** is curated public work or a case study shown on the main portfolio. Start from `src/content/portfolio/PROJECT_TEMPLATE.mdx.example` and store its local media under `src/assets/client-work/`.
- A **gallery** is an event or client photo collection for browsing, delivery, uploads, or attendee access. Create and manage it through `/admin/galleries/` or the Android app with a management-enabled key. Follow `docs/event-galleries.md` for legacy manifests, ZIPs, or pruning.
- A legacy event write-up in the portfolio collection starts from `src/content/portfolio/EVENT_GALLERY_TEMPLATE.mdx.example`. Do not use that template to create an interactive gallery.
- Do not turn a gallery into a portfolio piece, or a portfolio piece into a gallery, unless the user explicitly wants both. If the destination is unclear, confirm it before changing content.
- Work that is neither belongs in its existing route or feature area; inspect the current pattern before adding a new content type.

## Verification and formatting

- Website code or content: run `npm run verify` before review. It checks formatting, barber tracker, face and gallery tests, Astro types, and the build; it does not run Android checks or the gallery-prune tests.
- During development, run the relevant suite: `npm run test:galleries`, `npm run test:faces`, `npm run test:barber-tracker`, or `npm run test:gallery-prune`. For one TypeScript test file, use `pnpm exec tsx --test src/lib/gallery-sharing.test.ts`, substituting the affected file.
- Android changes: follow [Android build checks](android/README.md#github-builds-and-signing) and `.github/workflows/android.yml` for unit tests, lint, APK builds, and emulator tests. Website verification does not cover Android. Report physical-device checks separately from emulator results.
- Documentation-only changes: format the changed Markdown and verify referenced paths and heading anchors. A website build is not required solely for documentation edits.
- Format explicit changed paths with Prettier; use `--check` on the same paths to confirm. For example:

```bash
pnpm exec prettier --write AGENTS.md
pnpm exec prettier --check AGENTS.md
```

Report checks run and any failures or checks left unrun; a focused suite does not replace `verify` for website changes.

## Agent skills

- Issue work: read `docs/agents/issue-tracker.md` for GitHub issue operations and the external-PR triage boundary.
- Triage: use the label mapping in `docs/agents/triage-labels.md`.
- Code exploration and domain decisions: read `docs/agents/domain.md`, root `CONTEXT.md`, and relevant ADRs in `docs/adr/`.

## Deployment Workflow

- GitHub is the source of truth. Local uncommitted code never goes to production.
- `master` is the production branch. Feature work stays on a feature branch until review and merge.
- Never commit, push, merge, or deploy unless the user explicitly asks.
- When a commit is requested, leave out `.env`, `.env.production`, `.dev.vars`, `.gallery-prune.local.json`, and Android signing files. Keep signing material outside the repo, as described in `android/README.md`.
- Production deploy only from clean `master`: `npm run deploy:prod`.
- Default deploy is preview-safe: `npm run deploy` (alias of `npm run deploy:preview`).
- Environment URLs and usage are in [README production and preview](README.md#production-and-preview). Deployment scripts are authoritative for Worker and binding selection: `scripts/deploy-preview-worker.mjs`, `scripts/deploy-production-worker.mjs`, and `scripts/gallery-production-config.mjs`.
- Admin/upload testing must use preview only after verifying the D1 database and both R2 buckets in `scripts/deploy-preview-worker.mjs` are the isolated preview resources. Check outstanding migrations for that database before testing.
- `npm run deploy:branch-preview` uploads Worker version with preview alias `dev`. Use for branch smoke test only, not admin/upload testing unless bindings checked isolated.
- Do not run `wrangler deploy` directly unless the user explicitly asks for a direct production deployment.
- When explicitly authorized, follow this flow:
  1. create or continue feature branch,
  2. implement change,
  3. run `npm run verify`,
  4. push branch to GitHub,
  5. deploy preview with `npm run deploy` or `npm run deploy:preview`,
  6. share preview URL for review,
  7. merge to `master`,
  8. on clean `master`, run `npm run deploy:prod`.
