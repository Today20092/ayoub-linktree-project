# Astro 7.3 upgrade review

Reviewed September 6, 2026 for the `master` branch.

## Dependencies

| Package               | Before  | After   |
| --------------------- | ------- | ------- |
| `astro`               | 7.1.1   | 7.3.1   |
| `@astrojs/cloudflare` | 14.1.3  | 14.3.0  |
| `@astrojs/mdx`        | 7.0.3   | 8.0.0   |
| `@astrojs/react`      | 6.0.1   | 6.0.5   |
| `@astrojs/sitemap`    | 3.7.3   | 3.7.4   |
| `wrangler`            | 4.105.0 | 4.129.0 |

Versions were checked against npm's `latest` tags. Wrangler was updated to satisfy the adapter and Cloudflare Vite plugin peer requirements. Removed the obsolete `@cloudflare/vite-plugin` 1.42.1 override; the adapter now resolves its supported plugin version. The Node engine declaration now matches Astro's minimum, 22.12.0.

The existing uncommitted npm-to-pnpm migration was preserved, including the deleted npm lockfile. Resolved its placeholder build-script settings by allowing esbuild, Sharp, and workerd to install their native binaries. Updated and formatted `pnpm-lock.yaml`.

MDX 8 delegates processing to Markdown processors. This project uses plain `mdx()` without an explicitly installed processor, so the release notes require no source migration. See the [MDX changelog](https://github.com/withastro/astro/blob/main/packages/integrations/mdx/CHANGELOG.md#800).

## Adopted features and recommendations

- **Disabled unused Astro sessions.** Set `session: false` to remove Astro's session runtime and prevent the Cloudflare adapter from automatically configuring session KV. No Astro session API calls were found in `src`; gallery authentication uses its own signed cookies. See the [sessions documentation](https://docs.astro.build/en/guides/sessions/) and [Astro 7.2 notes](https://astro.build/blog/astro-720/).
- **Enabled Cloudflare build-time image optimization.** Set `imageService: { build: 'cloudflare-binding', runtime: 'cloudflare-binding' }`. This transforms static images through the existing IMAGES binding during workerd prerendering and falls back to Sharp if the binding fails. Runtime images also use the Cloudflare binding. See the [Cloudflare adapter documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) and [adapter changelog](https://github.com/withastro/astro/blob/main/packages/integrations/cloudflare/CHANGELOG.md#1420).
- **No custom Worker change needed.** The new `finalize()` helper applies cookies and Cloudflare CDN defaults after a custom `astro/fetch` pipeline. `wrangler.jsonc` uses the standard Astro server entrypoint, so adding a custom handler would serve no current need. See the [Astro 7.3 release notes](https://astro.build/blog/astro-730/).
- **Defer incremental builds.** Astro 7.2 introduces experimental incremental static builds; the latest adapter supports concurrent rendering with them. Revisit if measured build times justify maintaining build caches. See the [Astro 7.2 notes](https://astro.build/blog/astro-720/).

Astro 7.3 also improves logger integration for image services and cache providers, and supports multiple preview servers with `--ignore-lock`. These require no project changes. Keep using the normal managed server workflow.

## Validation

- Dependency peer check: passed.
- Face-search and gallery tests: 48 passed.
- Astro check: 0 errors, 0 warnings, 6 React `FormEvent` deprecation hints.
- `pnpm run verify`: passed, including formatting, all 48 tests, Astro check, and the production build.
- Build reports a non-blocking warning about chunks larger than 500 kB after minification.
- After applying the adapter patch, the build completed with zero image-service fallbacks. The regression check passes for the patched build and rejects the unpatched build log.

The IMAGES binding uses `remote: true` in the default, preview, and version-preview configurations so builds use Cloudflare's image service. See [Cloudflare's remote binding documentation](https://developers.cloudflare.com/workers/local-development/bindings-per-env/). No experimental flags were enabled.

## Cloudflare adapter workaround

Adapter 14.3.0 sends an empty POST for remote source images, but its prerender handler treats the empty request stream as image bytes. All 36 remote image transforms fell back to Sharp with the unpatched adapter, using both the local emulator and the remote service.

A one-line pnpm patch excludes requests with `Content-Length: 0` from the raw-image branch so the handler fetches the source URL instead. Local image uploads with nonempty or chunked bodies retain the existing path. The version-scoped patch is stored in `patches/@astrojs__cloudflare@14.3.0.patch`; remove it when an upstream adapter release fixes this behavior.

Check a captured build log with `node scripts/check-cloudflare-image-build.mjs <log-path>`. This rejects unsuccessful builds and image-service fallbacks, since Astro otherwise reports a successful build even when every Cloudflare transform falls back to Sharp.
