# Project tool fit — 2026-11-07

Keep the current formatter, type checker, test runners, and Android checks. The best next steps are to run the existing website checks in CI, make the existing Playwright scripts reproducible, and trial Oxlint for script correctness. No broad toolchain replacement is justified.

This assessment applies the requested [project-tool-fit skill](https://github.com/Today20092/skills/tree/main/skills/engineering/project-tool-fit). It proposes setup; it does not install tools or change application configuration.

## Scope and evidence

Inspected the repository instructions, [README](../../README.md), [domain vocabulary](../../CONTEXT.md), manifests, resolved pnpm importer, formatter settings and ignores, TypeScript and Astro configuration, checked-in workflows, Android Gradle configuration, browser-script imports and launch settings, and [local audit guide](../production-audit.md). No glossary map or separate glossary was found in the tracked-file inventory.

This is a toolchain assessment, not a whole-codebase bug review. File counts from tracked paths include 77 TypeScript, 33 TSX, 28 Astro, 20 MDX, 38 MJS, and 23 Kotlin files. Generated and untracked files are outside that inventory. Code-index coverage checks for the inspected code paths reported matching metadata and no recorded issues; that is a best-effort signal, not proof of completeness.

The local environment is Windows x64, Node 26.3.0, and pnpm 11.21.0. The manifest requires Node >=22.23.4 and pins pnpm 11.21.0. Recommendations must also work on the Linux CI environment.

## Current responsibilities

| Responsibility                       | Current owner and evidence                                                                           | Decision                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Formatting                           | Prettier 3.9.10, Astro plugin 1.1.2, Tailwind plugin 0.8.1; `prettier.config.cjs`, `.prettierignore` | **Keep** one formatting owner.                                          |
| Framework and TypeScript diagnostics | `astro check`, strict `tsconfig.json`, TypeScript 6.0.3                                              | **Keep**; linting and type erasure do not replace this contract.        |
| Website build and bundling           | Astro 7.4.2, Cloudflare adapter 14.4.2, Vite 8.3.5 in the lockfile                                   | **Keep**; no measured build bottleneck.                                 |
| Unit and service-level tests         | Node test runner plus `tsx` 4.23.15; explicit commands in `package.json`                             | **Keep**; no demonstrated runner limitation.                            |
| Script linting                       | No direct ESLint, Oxlint, or Biome dependency or configured lint command found                       | **Trial Oxlint**, retaining every current check.                        |
| Browser interactions                 | Seven scripts import `PLAYWRIGHT_MODULE` or `playwright`; sampled scripts launch installed Edge      | **Adopt reproducible local Playwright setup**, reuse scripts.           |
| Website automation                   | Only `.github/workflows/android.yml` is checked in                                                   | **Adopt CI for existing website commands**, before adding more tooling. |
| Dependency advisories                | `audit:prod` already runs `pnpm audit --prod`; pnpm overrides apply security fixes                   | **Keep** the existing scanner for now.                                  |
| Native Android                       | Gradle wrapper, Android lint, JUnit, Compose instrumentation tests, emulator workflow                | **Keep**; JS tooling has no Kotlin coverage.                            |

Resolved versions above come from `pnpm-lock.yaml`, not only manifest ranges. Existing tooling presence does not mean its checks passed during this assessment.

## 1. Adopt website CI using the existing tools

**Project evidence:** `verify` already combines formatting, UI/barber/face/gallery tests, Astro checking, and the build. The only checked-in Actions workflow handles Android. This does not establish whether external Cloudflare checks or repository branch protections exist; those settings were not inspected.

**Benefit:** the same website feedback becomes repeatable on pull requests, including work produced by agents. No new analyzer is required.

**Smallest setup:** add `.github/workflows/website.yml` using a supported Node version satisfying `engines`, the exact pnpm version, `pnpm install --frozen-lockfile`, and `pnpm run verify`. Run the existing production audit separately so advisory-service availability does not obscure source-check results. Use read-only repository permissions and no deploy step. Confirm the build's font/model downloads work on a clean runner before making it required.

**Test selection needs attention:** a tracked-file comparison found eleven `*.test.*` paths not explicitly named in any package script. They include `src/middleware.test.ts`, discovery and event-portrait tests, YouTube and preview-origin tests, and local-Worker integration tests. Separately, `test:gallery-prune` exists but is outside `verify`. This is a command-wiring observation, not proof that none are invoked indirectly. Review each test's dependencies before including it; local-Worker tests require their documented fixtures and must not be swept into a blanket glob.

**Pass condition:** a fresh checkout runs the website gate successfully; a deliberate source/type/test failure produces a failing check; local integration tests remain isolated from production. Rollback is removal of the new workflow and any selected script changes. No GitHub settings or workflow changes were made here.

## 2. Adopt a locked Playwright dependency; reuse existing scripts

**Project evidence:** `scripts/test-gsap-preview.mjs`, `scripts/web-ui-accessibility-browser.mjs`, and gallery/browser scripts already exercise interactions. Playwright is absent from direct dependencies and the resolved lockfile. The sampled launch settings specify `channel: 'msedge'`, which assumes an externally installed browser. These scripts are outside `verify`.

**Benefit:** a fresh checkout can reproduce browser checks without locating an external module. This addresses hydration, keyboard behavior, responsive layout, and gallery interactions that server-rendered assertions cannot fully establish.

**Smallest setup:** pin the `playwright` package as a development dependency, install its matching Chromium binary, and make a small selected script set use that browser rather than requiring Edge. Keep Node assertions and existing scripts; do not migrate all tests to `@playwright/test`. Add one explicit browser-check command and document its server/fixture prerequisites. Start with the existing homepage accessibility script against a local build. Add gallery flows after local D1/R2 fixtures are repeatable, using `scripts/audit/wrangler.jsonc` and the audit guide. Review scripts for external requests before calling the suite offline.

**Tradeoff:** browser downloads, fixture management, and server startup cost more than unit tests. Browser artifacts can contain page data. The existing accessibility script includes custom checks; retaining it does not establish complete accessibility coverage. Adding axe is a later option if a specific missing check warrants it, not a prerequisite for this cleanup.

**Current upstream evidence:** Playwright [release 1.65.0](https://github.com/microsoft/playwright/releases/tag/v1.65.0) and its [tagged package manifest](https://github.com/microsoft/playwright/blob/v1.65.0/packages/playwright/package.json) establish active releases, Apache-2.0 licensing, and Node >=20. The repository's Node requirement satisfies that lower bound. Browser/system support still needs validation on this Windows machine and Linux CI; upstream documentation is not local proof.

**Pass condition:** a fresh dependency install can run the selected scripts with no `PLAYWRIGHT_MODULE` override or installed Edge assumption, using isolated local state. Intentional keyboard or hydration regressions fail the command. Rollback removes the dependency/script wiring and restores the sampled launch settings. No browser checks or browser installation ran here.

## 3. Trial Oxlint as an additional correctness check

**Project evidence:** many JS/TS/TSX scripts exist, but there is no dedicated lint gate. Formatting and types provide different feedback from suspicious-code rules. A missed defect is a plausible gap, not a demonstrated defect found by Oxlint in this run.

**Benefit:** correctness diagnostics with file locations and structured output are useful to humans and agents before a full build. This is a coverage proposal; no local speedup was measured or claimed.

**Smallest trial:** pin Oxlint as a development dependency and add a non-writing `lint` command scoped to authored `src`, `scripts`, and relevant `public` JavaScript. Exclude generated models, generated declarations, build output, and vendored code. Start with correctness rules, not style rules. Inspect findings before enabling fixes or making warnings fatal. Keep Prettier, `astro check`, and every current test/build command.

Use `--format=json` for agent reports. Decide warning exit policy explicitly before adding the command to `verify`; otherwise a warning-only run can look like a clean gate.

**Compatibility:** the [Oxlint guide](https://oxc.rs/docs/guide/usage/linter.html) documents JS/TS/JSX/TSX coverage and correctness defaults. [Context7's supported-files documentation](https://oxc.rs/docs/guide/usage/linter) limits Astro linting to script blocks, so this must not be sold as Astro-template checking. The [tagged 1.92.0 manifest](https://github.com/oxc-project/oxc/blob/oxlint_v1.92.0/npm/oxlint/package.json) declares MIT, Node ^20.19.0 or >=22.12.0, and Windows x64/Linux targets. This is a verified tagged candidate, not a claim that it is the newest registry version. The project's Node minimum satisfies the declared requirement.

**Alternatives:** keeping no linter adds no maintenance but leaves the identified category uncovered. ESLint plus [eslint-plugin-astro](https://ota-meshi.github.io/eslint-plugin-astro/) is the stronger alternative when Astro-template rules are the primary need; the plugin exposes Astro and accessibility rules. Its exact Astro 7 compatibility and full dependency configuration were not tested, so it is not an unconditional recommendation. Do not introduce both lint systems before the Oxlint trial shows a concrete missing rule.

**Pass condition:** review representative TS service code, React components, browser scripts, tests, and Astro script blocks; confirm useful diagnostics, acceptable noise, generated-file exclusions, a nonzero failure exit, and unchanged source files. Only promote to a gate after findings are resolved or narrowly justified. A later type-aware trial must be separate: it adds `oxlint-tsgolint` and needs comparison against the project's TypeScript 6/framework setup. Rollback removes only the trial dependency/config/script.

## Significant keep and skip decisions

- **Keep Prettier; skip an Oxfmt migration now.** The project depends on Astro and Tailwind plugins and formats MDX. [Oxfmt supports these languages](https://oxc.rs/docs/guide/usage/formatter/language-support), but Astro needs explicit enablement and `@astrojs/compiler-rs`; MDX/Astro use bundled Prettier paths. No measured formatting bottleneck or representative output comparison justifies migration. Preserve the existing `PortfolioLocation.astro` exclusion; its historical plugin-version comment is not proof that the current plugin still needs it. Recheck separately before removing it.
- **Skip Biome as a replacement.** Its [current language matrix](https://biomejs.dev/introduction/language-support/) still marks Astro support experimental. Replacing working formatting plus adding linting in one migration increases the compatibility burden without a measured benefit here.
- **Keep Node tests and `tsx`; skip Vitest or a new TypeScript runner.** Existing explicit test commands already serve this application. Improve which tests run before replacing how they run.
- **Keep the Astro build pipeline; skip direct parser/resolver/minifier dependencies.** This is an application, not an AST or bundler project. No unmet requirement was established for those components.
- **Skip Knip for this pass.** No confirmed unused-code/dependency problem was established. Content collections, routes, browser entry points, and dynamic module imports require configuration before deletion reports are trustworthy.
- **Keep `pnpm audit`; skip an additional advisory scanner now.** The production audit completed successfully with zero advisories. That result is a database snapshot for production npm dependencies, not proof of exploitability analysis or Android/dev-dependency safety. Broader ecosystem scanning needs a separate coverage requirement.
- **Keep Android lint/tests/emulator checks.** Do not add another Kotlin analyzer without a specific uncovered need. Physical-phone and camera-provider checks remain distinct from emulator checks, as documented in the Android guide.

## Validation and boundaries

Executed `pnpm audit --prod --json`: exit 0; zero informational, low, moderate, high, or critical advisories. Inspected manifests, lockfile, script wiring, and tracked test/file inventory. Current candidate capabilities were checked through Context7 and owning documentation/tagged manifests on 2026-11-07.

No application changes, dependency installation, lockfile changes, global settings, commits, pushes, or deployment occurred. Only this assessment document was added. The pre-existing untracked analytics research document was left untouched.

The report was formatted and checked with repository-local Prettier. Full `verify`, Android builds/emulator tests, browser flows, Oxlint diagnostics, and performance benchmarks were not run. There is no claim that current application checks are green or that any candidate is locally compatible yet.

The smallest follow-up setup is website CI plus locked Playwright script execution, followed by the bounded Oxlint trial. Each can be reviewed and rolled back independently.
