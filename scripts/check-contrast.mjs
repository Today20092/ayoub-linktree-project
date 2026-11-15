#!/usr/bin/env node
// Check WCAG contrast for every token pair in light (:root) and dark (.dark) themes.
// Usage: node check-contrast.mjs <tokens.css> [more.css ...]
// Text pairs need 4.5:1 (WCAG 1.4.3); input and ring need 3:1 against background (WCAG 1.4.11).
// shortcut: reads only plain `:root { }` and `.dark { }` blocks with hex or oklch() values;
// adapt the selectors for [data-theme] or light-dark() setups.
import fs from 'node:fs'

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Usage: node check-contrast.mjs <tokens.css> [more.css ...]')
  process.exit(2)
}
const css = files
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')

function collect(selectorPattern) {
  const vars = {}
  for (const block of css.matchAll(
    new RegExp(`(?:^|[}\\s])${selectorPattern}\\s*\\{([^{}]*)\\}`, 'g'),
  ))
    for (const [, name, value] of block[1].matchAll(
      /(--[\w-]+)\s*:\s*([^;]+);/g,
    ))
      vars[name] = value.trim()
  return vars
}

const light = collect(':root')
const dark = collect('\\.dark')
for (const [name, vars] of Object.entries({ light, dark })) {
  if (!vars['--background'] || !vars['--foreground']) {
    console.error(
      `FAIL  ${name}: theme must define --background and --foreground`,
    )
    process.exit(1)
  }
}
const themes = { light, dark: { ...light, ...dark } }

function resolve(vars, value, depth = 0) {
  if (depth > 20) throw new Error(`var() cycle near ${value}`)
  const m = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/)
  if (!m) return value
  const next = vars[m[1]] ?? m[2]
  if (next == null) throw new Error(`undefined ${m[1]}`)
  return resolve(vars, next.trim(), depth + 1)
}

// Returns [r, g, b] in linear sRGB 0..1, or null for alpha/unsupported values.
function toLinearRgb(value) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  let m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
    return [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255))
  }
  m = value.match(
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i,
  )
  if (!m) return null
  if (m[5] && !['1', '100%'].includes(m[5])) return null
  const L = m[2] ? m[1] / 100 : +m[1]
  const C = +m[3]
  const h = (m[4] * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)))
}

const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function pairs(vars) {
  const out =
    vars['--foreground'] && vars['--background']
      ? [['--foreground', '--background', 4.5]]
      : []
  for (const name of Object.keys(vars))
    if (name.endsWith('-foreground')) {
      const surface = name.slice(0, -'-foreground'.length)
      if (vars[surface]) out.push([name, surface, 4.5])
    }
  for (const surface of ['--background', '--card'])
    if (vars['--muted-foreground'] && vars[surface])
      out.push(['--muted-foreground', surface, 4.5])
  for (const surface of ['--background', '--card'])
    if (vars['--link'] && vars[surface]) out.push(['--link', surface, 4.5])
  if (vars['--viewer-muted'] && vars['--viewer'])
    out.push(['--viewer-muted', '--viewer', 4.5])
  for (const ui of ['--input', '--ring'])
    for (const surface of ['--background', '--card'])
      if (vars[ui] && vars[surface]) out.push([ui, surface, 3])
  return out
}

let failures = 0
for (const [theme, vars] of Object.entries(themes))
  for (const [fg, bg, min] of pairs(vars)) {
    const [a, b] = [fg, bg].map((n) => toLinearRgb(resolve(vars, vars[n])))
    if (!a || !b) {
      failures++
      console.error(
        `FAIL  ${theme}: ${fg} on ${bg} (alpha or unsupported color; check by hand)`,
      )
      continue
    }
    const r = ratio(a, b)
    // WCAG thresholds are not rounded: 4.49 fails 4.5.
    const ok = r >= min
    if (!ok) failures++
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${theme}: ${fg} on ${bg} ${r.toFixed(2)}:1 (needs ${min}:1)`,
    )
  }
if (failures) {
  console.error(
    `\n${failures} token pair(s) failed contrast or could not be checked. Adjust the token values in both themes.`,
  )
  process.exit(1)
}
