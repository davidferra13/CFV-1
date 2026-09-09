#!/usr/bin/env node
/**
 * Design-system search. This is step 2 of the asset-selection algorithm:
 * before you build anything, search here.
 *
 *   node design-system/registry/find.mjs button
 *   node design-system/registry/find.mjs "empty state"
 *   node design-system/registry/find.mjs --kind=asset remy
 *   node design-system/registry/find.mjs --kind=token radius
 *   node design-system/registry/find.mjs --missing
 *
 * Zero dependencies.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const load = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'))

const args = process.argv.slice(2)
const kindArg = args.find((a) => a.startsWith('--kind='))
const kind = kindArg ? kindArg.split('=')[1] : 'all'
const listMissing = args.includes('--missing')
const query = args.filter((a) => !a.startsWith('--')).join(' ').toLowerCase()

const components = load('components.json')
const patterns = load('patterns.json')
const features = load('features.json')
const assets = load('assets.json')
const tokens = load('../tokens/tokens.json')

const RESET = '[0m'
const BOLD = '[1m'
const DIM = '[2m'
const paint = (s, c) => (process.stdout.isTTY ? `${c}${s}${RESET}` : s)

function flatten(obj, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push({ key, value: Array.isArray(v) ? v.join(', ') : String(v) })
  }
  return out
}

function matches(haystack) {
  if (!query) return true
  return JSON.stringify(haystack).toLowerCase().includes(query)
}

let hits = 0

function section(title, rows) {
  if (rows.length === 0) return
  hits += rows.length
  console.log(`\n${paint(title, BOLD)}`)
  for (const r of rows) console.log(r)
}

if (listMissing) {
  const missing = components.components.filter((c) => c.status === 'missing')
  const gaps = components.components.filter((c) => c.status === 'canonical-gap')
  const dupes = components.components.filter((c) => c.status === 'duplicate')
  section('MISSING - no implementation exists. Building one is legitimate; register it.', missing.map((c) => `  ${c.name.padEnd(28)} ${c.note ?? ''}`))
  section('CANONICAL WITH A KNOWN GAP', gaps.map((c) => `  ${c.name.padEnd(28)} ${c.knownGap ?? ''}`))
  section('DUPLICATE - fold into the canonical entry', dupes.map((c) => `  ${c.name.padEnd(28)} ${c.decision ?? ''}`))
  console.log('')
  process.exit(0)
}

if (!query) {
  console.log(`Design-system search

  node design-system/registry/find.mjs <query>
  node design-system/registry/find.mjs --kind=component|pattern|feature|asset|token <query>
  node design-system/registry/find.mjs --missing        list gaps and duplicates

Registries: ${components.components.length} components, ${patterns.patterns.length} patterns, ${features.features.length} features, ${assets.assets.length} assets.
Rules live in design-system/SPEC.md. The build checklist is design-system/BUILD-CHECKLIST.md.`)
  process.exit(0)
}

if (kind === 'all' || kind === 'component') {
  section(
    'COMPONENTS',
    components.components.filter(matches).map((c) => {
      const head = `  ${paint(c.name, BOLD)}  ${paint(`[${c.status}]`, DIM)}`
      const where = c.path ? `\n      ${c.path}` : '\n      (no implementation)'
      const why = c.purpose ? `\n      ${c.purpose}` : ''
      const variants = c.variants ? `\n      variants: ${Object.keys(c.variants).join(', ')}` : ''
      const gap = c.knownGap ? `\n      ${paint('gap: ' + c.knownGap, DIM)}` : ''
      return head + where + why + variants + gap
    })
  )
}

if (kind === 'all' || kind === 'pattern') {
  const rows = [
    ...patterns.shells.filter(matches).map((s) => `  ${paint(s.id, BOLD)} (shell)\n      ${s.path}\n      ${s.purpose ?? ''}`),
    ...patterns.patterns.filter(matches).map((p) => `  ${paint(p.id, BOLD)}\n      ${p.reference ?? ''}\n      ${(p.rules ?? []).slice(0, 2).join(' ')}`),
  ]
  section('PATTERNS', rows)
}

if (kind === 'all' || kind === 'feature') {
  section(
    'FEATURES',
    features.features.filter(matches).map((f) => {
      const status = f.exists ? 'exists' : 'NOT IMPLEMENTED'
      return `  ${paint(f.name, BOLD)}  ${paint(`[${status}]`, DIM)}\n      ${(f.canonical ?? ['-']).slice(0, 3).join('\n      ')}\n      select when: ${f.selectWhen ?? '-'}`
    })
  )
}

if (kind === 'all' || kind === 'asset') {
  section(
    'ASSETS',
    assets.assets
      .filter(matches)
      .slice(0, 40)
      .map((a) => `  ${a.path.padEnd(46)} ${String(a.bytes).padStart(9)}b  ${a.width ? `${a.width}x${a.height}` : ''.padEnd(10)}  [${a.status}]`)
  )
  section('FONTS', assets.fonts.filter(matches).map((f) => `  ${paint(f.family, BOLD)} [${f.status}] ${f.role}\n      ${f.loader}`))
  section('ICON SETS', assets.iconSets.filter(matches).map((i) => `  ${paint(i.id, BOLD)} [${i.status}] ${i.rule ?? ''}`))
}

if (kind === 'all' || kind === 'token') {
  const rows = flatten(tokens)
    .filter((t) => t.key.toLowerCase().includes(query) || t.value.toLowerCase().includes(query))
    .slice(0, 60)
    .map((t) => `  ${t.key.padEnd(46)} ${t.value.slice(0, 90)}`)
  section('TOKENS', rows)
}

if (hits === 0) {
  console.log(`\nNo registry entry matches "${query}".`)
  console.log('That is the signal to add something new. Before you do:')
  console.log('  1. Try a broader term, and run --missing to see known gaps.')
  console.log('  2. If it really is new, build it, then register it in the matching registry file')
  console.log('     with purpose, variants, states, a11y and usage rules, in the same change.')
  console.log('  3. Record why it was needed in design-system/DECISIONS.md.\n')
  process.exit(1)
}

console.log('')
