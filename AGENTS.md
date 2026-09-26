# AGENTS.md

## Project Overview

Personal portfolio for Ayoub Abedrabbo, Tampa photographer and videographer. Built with Astro, Tailwind CSS, astro-icon, lucide icon, and shadcn.

## Development Commands

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
- A **gallery** is an event or client photo collection for browsing, delivery, uploads, or attendee access. Create and manage it through `/admin/galleries/`; follow `docs/event-galleries.md` only for the legacy local/R2 manifest workflow.
- Do not turn a gallery into a portfolio piece, or a portfolio piece into a gallery, unless the user explicitly wants both. If the destination is unclear, confirm it before changing content.
- Work that is neither belongs in its existing route or feature area; inspect the current pattern before adding a new content type.

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

- GitHub is the source of truth. Local uncommitted code never goes to production.
- `master` is the production branch. Feature work stays on a feature branch until review and merge.
- Never commit, push, merge, or deploy unless the user explicitly asks.
- Site runs as Cloudflare Worker through Astro Cloudflare adapter.
- Production Worker: `ayoub-linktree-project`. Production URL: `https://ayoubabed.xyz`.
- Production deploy only from clean `master`: `npm run deploy:prod`.
- Default deploy is preview-safe: `npm run deploy` (alias of `npm run deploy:preview`).
- Preview Worker: `ayoub-linktree-project-preview`.
- Preview URL: `https://ayoub-linktree-project-preview.ayoub-abedrabbo.workers.dev`.
- Preview D1: `ayoub-gallery-data-preview`.
- Preview R2: `alphabravomedia-galleries-preview` and `alphabravomedia-gallery-uploads-preview`.
- Admin/upload testing must use preview only after D1/R2 names above verified in `scripts/deploy-preview-worker.mjs`.
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
