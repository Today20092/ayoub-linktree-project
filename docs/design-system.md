# Design system

The website's color tokens live in `src/tokens.css`. Components use semantic tokens; `--palette-*` primitives belong only in that file. The standalone `public/barber-tracker/` has its own styles and is outside this system and its checks.

## Semantic tokens

Values below are the references in `:root` and `.dark`; dark inherits the light value where no override is defined. The primitive values are in `src/tokens.css`.

| Token                          | Light                             | Dark                              |
| ------------------------------ | --------------------------------- | --------------------------------- |
| `--background`                 | `var(--palette-1)`                | `var(--palette-2)`                |
| `--foreground`                 | `var(--palette-2)`                | `var(--palette-16)`               |
| `--card`                       | `var(--palette-1)`                | `var(--palette-7)`                |
| `--card-foreground`            | `var(--palette-2)`                | `var(--palette-16)`               |
| `--popover`                    | `var(--palette-1)`                | `var(--palette-7)`                |
| `--popover-foreground`         | `var(--palette-2)`                | `var(--palette-16)`               |
| `--primary`                    | `var(--palette-3)`                | `var(--palette-3)`                |
| `--primary-foreground`         | `var(--palette-4)`                | `var(--palette-4)`                |
| `--link`                       | `var(--palette-5)`                | `var(--primary)`                  |
| `--secondary`                  | `var(--palette-6)`                | `var(--palette-17)`               |
| `--secondary-foreground`       | `var(--palette-7)`                | `var(--palette-16)`               |
| `--muted`                      | `var(--palette-6)`                | `var(--palette-17)`               |
| `--muted-foreground`           | `var(--palette-8)`                | `var(--palette-18)`               |
| `--accent`                     | `var(--palette-6)`                | `var(--palette-17)`               |
| `--accent-foreground`          | `var(--palette-7)`                | `var(--palette-16)`               |
| `--destructive`                | `var(--palette-9)`                | `var(--palette-19)`               |
| `--border`                     | `var(--palette-10)`               | `var(--palette-20)`               |
| `--input`                      | `var(--palette-input-light)`      | `var(--palette-input-dark)`       |
| `--input-surface`              | `var(--palette-10)`               | `var(--palette-21)`               |
| `--ring`                       | `var(--palette-5)`                | `var(--palette-3)`                |
| `--chart-1`                    | `var(--palette-11)`               | `var(--palette-11)`               |
| `--chart-2`                    | `var(--palette-12)`               | `var(--palette-12)`               |
| `--chart-3`                    | `var(--palette-13)`               | `var(--palette-13)`               |
| `--chart-4`                    | `var(--palette-14)`               | `var(--palette-14)`               |
| `--chart-5`                    | `var(--palette-15)`               | `var(--palette-15)`               |
| `--viewer`                     | `var(--palette-viewer)`           | `var(--palette-viewer)`           |
| `--viewer-foreground`          | `var(--palette-viewer-text)`      | `var(--palette-viewer-text)`      |
| `--viewer-secondary`           | `var(--palette-viewer-secondary)` | `var(--palette-viewer-secondary)` |
| `--viewer-muted`               | `var(--palette-viewer-muted)`     | `var(--palette-viewer-muted)`     |
| `--scrim`                      | `var(--palette-black)`            | `var(--palette-black)`            |
| `--scrim-foreground`           | `var(--palette-white)`            | `var(--palette-white)`            |
| `--shadow-color`               | `var(--palette-black)`            | `var(--palette-black)`            |
| `--cash-app`                   | `var(--palette-cash-app)`         | `var(--palette-cash-app)`         |
| `--cash-app-foreground`        | `var(--palette-cash-app-text)`    | `var(--palette-cash-app-text)`    |
| `--venmo`                      | `var(--palette-venmo)`            | `var(--palette-venmo)`            |
| `--venmo-foreground`           | `var(--palette-venmo-text)`       | `var(--palette-venmo-text)`       |
| `--paypal`                     | `var(--palette-paypal)`           | `var(--palette-paypal)`           |
| `--paypal-foreground`          | `var(--palette-white)`            | `var(--palette-white)`            |
| `--success`                    | `var(--palette-success)`          | `var(--palette-success-dark)`     |
| `--success-foreground`         | `var(--palette-white)`            | `var(--palette-viewer)`           |
| `--warning`                    | `var(--palette-warning)`          | `var(--palette-warning)`          |
| `--warning-foreground`         | `var(--palette-warning-text)`     | `var(--palette-warning-text)`     |
| `--info`                       | `var(--palette-info)`             | `var(--palette-info-dark)`        |
| `--info-foreground`            | `var(--palette-white)`            | `var(--palette-viewer)`           |
| `--destructive-foreground`     | `var(--palette-white)`            | `var(--palette-viewer)`           |
| `--map-button-background`      | `var(--background)`               | `transparent`                     |
| `--sidebar`                    | `var(--palette-16)`               | `var(--palette-7)`                |
| `--sidebar-foreground`         | `var(--palette-2)`                | `var(--palette-16)`               |
| `--sidebar-primary`            | `var(--palette-3)`                | `var(--palette-3)`                |
| `--sidebar-primary-foreground` | `var(--palette-4)`                | `var(--palette-4)`                |
| `--sidebar-accent`             | `var(--palette-6)`                | `var(--palette-17)`               |
| `--sidebar-accent-foreground`  | `var(--palette-7)`                | `var(--palette-16)`               |
| `--sidebar-border`             | `var(--palette-10)`               | `var(--palette-20)`               |
| `--sidebar-ring`               | `var(--palette-3)`                | `var(--palette-3)`                |

Use `bg-background text-foreground` for pages, `bg-card text-card-foreground` for panels, `text-muted-foreground` for secondary text, and `text-link` for links. Use the matching foreground with status, action, viewer, and payment surfaces. `input` is a field boundary; `input-surface` is its fill. Keep an outline for focus in forced colors.

## Guardrails

Run `pnpm run check:design-system` and `pnpm run test:design-system`. The raw-color check scans `src`, exempts the token file and test fixtures, and permits `dark:` only in `src/components/ui/`. Its messages include:

- `Primitive token --palette-1 outside the token file. Use a semantic token.`
- `Tailwind palette class "bg-white". Use a semantic token utility: bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground, border-border, bg-primary text-primary-foreground, bg-destructive, bg-success/warning/info.`
- `Arbitrary color value "-[#ff0000]". Add or reuse a token in the token file, then use its utility.`
- `Hex color #ffffff outside the token file. Reference a semantic token: var(--background), var(--primary), …`
- `Raw color function rgb(…) outside the token file. Define it as a primitive in the token file and use the semantic token that references it.`
- `dark: variant in feature code. Dark mode comes from token values; use semantic utilities so the .dark token set applies automatically.`
- `.dark selector outside the token file. Move the value into a semantic token defined under :root and .dark.`

A necessary exception requires a same-line comment `design-system-allow: <reason>`. Use it for values that cannot consume CSS tokens, such as browser theme metadata or canvas initialization. The contrast check requires both themes and fails unsupported or translucent checked pairs; it checks token pairs, not rendered text over images or composited backgrounds.

## Theme and layout

`BaseLayout.astro` runs the theme boot script before rendering. `ThemeSwitch` supports System, Light, and Dark; the preference is stored in `localStorage.theme`. It renders once, inside the header menu (`[data-header-menu]`): the phone menu panel and the desktop Appearance dropdown. Avoid per-page theme scripts. Reuse `src/components/ui/` for shared controls. Page layout modules (`PageContainer`, `PageHeader`, `ServiceSection` in `src/components/layout/`) and the shared `link`, `eyebrow` and display-heading utilities are described in [DESIGN.md](../DESIGN.md).

When adding a color role, define the semantic value for both themes (or deliberately inherit an unchanged value), expose a utility in `@theme inline` if needed, update this table, and run both design-system commands. Check rendered contrast in both applied themes where tokens alone cannot establish it.

The inline boot runs before styles load, updates native `color-scheme` and browser `theme-color`, and follows system changes only in System mode. Explicit choices persist across pages and tabs; blocked storage retains the choice for the current page. Theme changes suppress transitions. Text fields and checkboxes use the opaque `input` token for their borders; translucent `input-surface` is a fill, not proof of boundary contrast.

For rendered preference and header checks, run `node scripts/theme-browser.mjs` with `WEB_UI_TEST_URL` pointing to the local server and `PLAYWRIGHT_MODULE` pointing to an existing Playwright module, as described in [the local audit guide](production-audit.md#focused-public-page-regression-checks). Use the isolated built Worker from that guide for gallery and CSP verification; an uninitialized dev database returns gallery errors. The script checks the first animation frame, not a video-based flash measurement.
