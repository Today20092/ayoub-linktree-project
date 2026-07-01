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

## Deployment Workflow

- `master` is production. Feature work must happen on a branch and be reviewed before merging.
- GitHub is the source of truth. Do not deploy uncommitted local code to production.
- Production URL: `ayoubabed.xyz`.
- The site is deployed as a Cloudflare Worker using Astro's Cloudflare adapter.
- Production deploy is explicit only: `npm run deploy:prod`.
- Default deploy is safe preview: `npm run deploy` runs `npm run deploy:preview`.
- Preview deploys use `npm run deploy:preview`, which rewrites Astro's generated Worker config to the separate preview Worker before deploying.
- Preview URL: `https://ayoub-linktree-project-preview.ayoub-abedrabbo.workers.dev`.
- Branch/version preview uploads are available with `npm run deploy:branch-preview`, but do not use them for admin/upload testing unless bindings are confirmed isolated.
- Preview bindings use separate D1/R2 resources and must be verified in `scripts/deploy-preview-worker.mjs` before admin/upload testing.
- Do not run `wrangler deploy` directly unless the user explicitly asks for a direct production deploy.
- Normal AI workflow:
  1. create or continue a feature branch,
  2. implement changes,
  3. run `npm run verify`,
  4. push the branch to GitHub,
  5. use the Cloudflare preview URL for review,
  6. merge to `master`,
  7. deploy production from `master`.
