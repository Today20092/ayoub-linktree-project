# AGENTS.md

## Project Overview

Personal portfolio for Ayoub Abedrabbo, Tampa photographer and videographer. Built with Astro, Tailwind CSS, astro-icon, lucide icon, and shadc.

## Development Commands

- Use `npx astro add <integration>` for official Astro integrations; don't edit `package.json` manually.
- Check latest Astro docs before newer or changed APIs.
- Run `astro dev` normally. Astro 7+ backgrounds server for coding agents and records URL, port, PID in `.astro/dev.json`; reuse it.
- Check `/_astro/status` for `{"ok":true}` before testing. Set `ASTRO_DEV_BACKGROUND=0` only for foreground logs.

## Images

- Always render images with Astro's `Image` component from `astro:assets`. Don't add raw HTML `<img>` tags.
- Store local content images in `src/assets` so Astro can import, optimize, and generate responsive image output.
- For images in content collections, use Astro's `image()` schema helper and pass the metadata directly to `<Image />`.
- Remote images should also use `<Image />` with explicit dimensions or an authorized remote image config.

## Code Formatting

Project uses Prettier:

```bash
# Format code
npx prettier --write .
```

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Deployment Workflow

- GitHub source of truth. Local uncommitted code never go production.
- `master` = production branch. Feature work stay on feature branch until review/merge.
- Site runs as Cloudflare Worker through Astro Cloudflare adapter.
- Production Worker: `ayoub-linktree-project`. Production URL: `https://ayoubabed.xyz`.
- Production deploy only from clean `master`: `npm run deploy:prod`.
- `npm run deploy:prod` runs `npm run verify`, then `wrangler deploy`.
- Default deploy is preview safe: `npm run deploy` = `npm run deploy:preview`.
- Preview Worker: `ayoub-linktree-project-preview`.
- Preview URL: `https://ayoub-linktree-project-preview.ayoub-abedrabbo.workers.dev`.
- `npm run deploy:preview` runs `npm run verify`, builds, rewrites generated `dist/server/wrangler.json` into `dist/server/wrangler.preview.json`, then deploys preview Worker.
- Preview D1: `ayoub-gallery-data-preview`.
- Preview R2: `alphabravomedia-galleries-preview` and `alphabravomedia-gallery-uploads-preview`.
- Admin/upload testing must use preview only after D1/R2 names above verified in `scripts/deploy-preview-worker.mjs`.
- `npm run deploy:branch-preview` uploads Worker version with preview alias `dev`. Use for branch smoke test only, not admin/upload testing unless bindings checked isolated.
- Do not run `wrangler deploy` direct unless user explicitly asks direct production deploy.
- Normal AI flow:
  1. create or continue feature branch,
  2. implement change,
  3. run `npm run verify`,
  4. push branch to GitHub,
  5. deploy preview with `npm run deploy` or `npm run deploy:preview`,
  6. share preview URL for review,
  7. merge to `master`,
  8. on clean `master`, run `npm run deploy:prod`.
