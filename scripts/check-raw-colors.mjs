#!/usr/bin/env node
// Fail on raw colors and theme overrides outside the token files.
// Usage: node check-raw-colors.mjs [--tokens src/tokens.css,src/theme.css] [--allow-dark src/components/ui] [paths...]
// Paths default to src. Add `design-system-allow: <reason>` in a comment on a line to exempt it.
// shortcut: line-based regexes, not a CSS/JSX parser; port the rules to Stylelint/ESLint
// when the project needs autofix or editor integration.
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const option = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return []
  const [value] = args.splice(i, 2).slice(1)
  return value.split(',').map((p) => path.resolve(p))
}
const tokenFiles = new Set(option('--tokens'))
const darkAllowed = option('--allow-dark')
const roots = args.length ? args : ['src']

const SKIP_FILES = /(?:\.test\.[^.]+|(?:^|[\\/])env\.d\.ts)$/
const EXTENSIONS = /\.(css|scss|astro|tsx|jsx|ts|js|mjs|vue|svelte|html|mdx)$/
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.astro',
  '.next',
  '.git',
  'coverage',
])
const PALETTE =
  'white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITY =
  'bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder'

const rules = [
  {
    pattern: /--palette-[\w-]+/,
    message: (m) =>
      `Primitive token ${m} outside the token file. Use a semantic token.`,
  },
  {
    pattern: new RegExp(
      `(?<![\\w-])(?:[\\w-]+:)*(?:${UTILITY})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?(?![\\w-])`,
    ),
    message: (m) =>
      `Tailwind palette class "${m}". Use a semantic token utility: bg-background, bg-card, bg-muted, text-foreground, text-muted-foreground, border-border, bg-primary text-primary-foreground, bg-destructive, bg-success/warning/info.`,
  },
  {
    pattern: /-\[(?:#|rgba?\(|hsla?\(|oklch\(|oklab\()[^\]]*\]/,
    message: (m) =>
      `Arbitrary color value "${m}". Add or reuse a token in the token file, then use its utility.`,
  },
  {
    pattern:
      /(?<![a-zA-Z0-9&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/,
    message: (m) =>
      `Hex color ${m} outside the token file. Reference a semantic token: var(--background), var(--primary), …`,
  },
  {
    pattern: /(?<![a-zA-Z0-9-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/,
    message: (m) =>
      `Raw color function ${m}…) outside the token file. Define it as a primitive in the token file and use the semantic token that references it.`,
  },
  {
    pattern: /(?:^|[\s"'`{])dark:[\w[-]/,
    dark: true,
    message: () =>
      'dark: variant in feature code. Dark mode comes from token values; use semantic utilities so the .dark token set applies automatically.',
  },
  {
    pattern: /(?:^|[\s,}])\.dark[\s.:{[>~+,)]/,
    dark: true,
    message: () =>
      '.dark selector outside the token file. Move the value into a semantic token defined under :root and .dark.',
  },
]

function* walk(target) {
  const stat = fs.statSync(target)
  if (stat.isFile()) {
    if (EXTENSIONS.test(target) && !SKIP_FILES.test(target)) yield target
    return
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true }))
    if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(target, entry.name))
}

const findings = []
for (const root of roots)
  for (const file of walk(root)) {
    const absolute = path.resolve(file)
    if (tokenFiles.has(absolute)) continue
    const darkOk = darkAllowed.some((dir) =>
      absolute.startsWith(dir + path.sep),
    )
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (/(?:\/\/|\/\*|<!--|\*)\s*design-system-allow:\s*\S/.test(line))
          return
        for (const rule of rules) {
          if (rule.dark && darkOk) continue
          const match = line.match(rule.pattern)
          if (match)
            findings.push(`${file}:${i + 1}: ${rule.message(match[0].trim())}`)
        }
      })
  }

for (const finding of findings) console.error(finding)
if (findings.length) {
  console.error(
    `\n${findings.length} raw color finding(s). Exempt a justified line with a "design-system-allow: <reason>" comment.`,
  )
  process.exit(1)
}
console.log('No raw colors outside token files.')
