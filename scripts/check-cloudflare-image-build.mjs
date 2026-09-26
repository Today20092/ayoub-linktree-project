import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Run after capturing `pnpm run build` output, passing the log path.
const log = readFileSync(process.argv[2], 'utf8')
assert.match(log, /Enabling image processing with Cloudflare Images/)
assert.match(log, /\[build\] Complete!/)
assert.doesNotMatch(
  log,
  /Could not optimize|Falling back to the local image service/,
)
console.log('Cloudflare image build completed without Sharp fallback.')
