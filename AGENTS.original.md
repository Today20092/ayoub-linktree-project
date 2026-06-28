# AGENTS.md

## Project Overview

This is a personal portfolio website for Ayoub Abedrabbo, a Tampa-based photographer and videographer. Built with Astro, Tailwind CSS, astro-icon, lucide icon, and shadc.

## Development Commands

- Use `npx astro add <integration>` for official Astro integrations; do not edit `package.json` manually.
- Check the latest Astro docs before using newer or recently changed APIs.
- Run `astro dev` normally. Astro 7+ automatically backgrounds the server for coding agents and records its URL, port, and PID in `.astro/dev.json`; reuse it instead of starting duplicates.
- Check `/_astro/status` for `{"ok":true}` before testing. Set `ASTRO_DEV_BACKGROUND=0` only when foreground logs are needed.

## Images

- Always render images with Astro's `Image` component from `astro:assets`. Do not add raw HTML `<img>` tags.
- Store local content images in `src/assets` so Astro can import, optimize, and generate responsive image output.
- For images referenced by content collections, use Astro's `image()` schema helper and pass the resulting image metadata directly to `<Image />`.
- Remote images should also use `<Image />` with explicit dimensions or an authorized remote image configuration.

## Code Formatting

The project uses Prettier with specific configurations:

```bash
# Format code (run manually)
npx prettier --write .
```

## deployment

- ayoubabed.xyz
- hosted on cloudflare pages using workers
- builds from github which is linked to the git repo and cloudflare pages.
