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

## deployment

- ayoubabed.xyz
- hosted on Cloudflare Pages using Workers
- builds from GitHub linked to the repo and Cloudflare Pages
