#!/usr/bin/env node
/**
 * ChefFlow design token generator.
 *
 * Reads design-system/tokens/tokens.json (the single source of truth) and writes:
 *   1. design-system/tokens/tokens.css   - the generated CSS custom properties
 *   2. design-system/tokens/tokens.ts    - typed constants for JS/TS consumers
 *   3. app/globals.css                   - the block between the GENERATED markers
 *   4. tailwind.config.ts                - the block between the GENERATED markers
 *
 * Zero dependencies. Run with `node design-system/tokens/build-tokens.mjs`
 * or `npm run tokens:build`. Pass --check to fail instead of writing when the
 * generated output is out of date (used by CI).
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..', '..')
const TOKENS_PATH = path.join(HERE, 'tokens.json')

const START = (name) => `/* === GENERATED:${name} - do not edit by hand. Run npm run tokens:build === */`
const END = (name) => `/* === END GENERATED:${name} === */`
const TS_START = (name) => `  // === GENERATED:${name} - do not edit by hand. Run npm run tokens:build ===`
const TS_END = (name) => `  // === END GENERATED:${name} ===`

const checkOnly = process.argv.includes('--check')
const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'))

/*
 * The repo runs prettier on every staged file through lint-staged. If this
 * generator emitted anything prettier would reformat, the committed file and the
 * generated file would disagree forever and --check would be permanently red.
 * So the generator formats its own output with the project's prettier config,
 * which makes the two agree by construction. Prettier is a devDependency and is
 * always present when npm scripts can run; if it is somehow missing the
 * generator still works, it just emits unformatted output.
 */
let prettier = null
try {
  prettier = await import('prettier')
} catch {
  prettier = null
}

async function format(content, filepath) {
  if (!prettier) return content
  try {
    const config = (await prettier.resolveConfig(filepath)) ?? {}
    return await prettier.format(content, { ...config, filepath })
  } catch {
    return content
  }
}

/* ------------------------------------------------------------------ helpers */

function pick(value, mode) {
  if (value && typeof value === 'object' && (mode in value)) return value[mode]
  return value
}

function cssVarLines(mode) {
  const out = []

  out.push(`  /* brand ramp - ${tokens.brand.description.split('.')[0]} */`)
  for (const [stop, value] of Object.entries(tokens.brand.scale)) {
    out.push(`  --brand-${stop}: ${value};`)
  }

  out.push('')
  out.push('  /* surface scale */')
  for (const [role, spec] of Object.entries(tokens.semantic.surface.roles)) {
    out.push(`  --${role}-rgb: ${pick(spec, mode)};`)
  }
  for (const role of Object.keys(tokens.semantic.surface.roles)) {
    out.push(`  --${role}: rgb(var(--${role}-rgb));`)
  }

  out.push('')
  out.push('  /* text tiers */')
  for (const [role, spec] of Object.entries(tokens.semantic.text)) {
    out.push(`  --${role}: ${pick(spec, mode)};`)
  }

  out.push('')
  out.push('  /* borders */')
  for (const [role, spec] of Object.entries(tokens.semantic.border)) {
    out.push(`  --${role}: ${pick(spec, mode)};`)
  }

  out.push('')
  out.push('  /* status roles - meaning is global, silhouette is local */')
  for (const [role, spec] of Object.entries(tokens.semantic.status)) {
    if (role === 'description') continue
    for (const slot of ['bg', 'fg', 'border', 'solid']) {
      if (!spec[slot]) continue
      out.push(`  --status-${role}-${slot}: ${pick(spec[slot], mode)};`)
    }
  }

  out.push('')
  out.push('  /* interaction */')
  for (const [key, value] of Object.entries(tokens.semantic.interaction)) {
    if (key.startsWith('focus-ring-contrast')) continue
    out.push(`  --${key}: ${pick(value, mode)};`)
  }

  out.push('')
  out.push('  /* overlay and media */')
  for (const [key, value] of Object.entries(tokens.semantic.overlay)) {
    if (key.endsWith('-note')) continue
    out.push(`  --${key}: ${pick(value, mode)};`)
  }

  out.push('')
  out.push('  /* radius scale */')
  for (const [key, value] of Object.entries(tokens.radius.scale)) {
    out.push(`  --radius-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.radius.semantic)) {
    out.push(`  --radius-role-${key}: ${value};`)
  }

  out.push('')
  out.push('  /* elevation */')
  for (const [key, spec] of Object.entries(tokens.elevation.scale)) {
    out.push(`  --elevation-${key}: ${pick(spec, mode)};`)
  }

  out.push('')
  out.push('  /* layering */')
  for (const [key, value] of Object.entries(tokens.layer.scale)) {
    out.push(`  --layer-${key}: ${value};`)
  }

  out.push('')
  out.push('  /* motion */')
  for (const [key, value] of Object.entries(tokens.motion.duration)) {
    out.push(`  --duration-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.motion.easing)) {
    out.push(`  --ease-${key === 'inOut' ? 'in-out' : key}: ${value};`)
  }

  out.push('')
  out.push('  /* sizing */')
  out.push(`  --touch-target-min: ${tokens.size.touchTarget.min};`)
  out.push(`  --control-height-sm: ${tokens.size.control['height-sm']};`)
  out.push(`  --control-height-md: ${tokens.size.control['height-md']};`)
  out.push(`  --control-height-lg: ${tokens.size.control['height-lg']};`)
  for (const [key, value] of Object.entries(tokens.size.icon)) {
    if (key === 'note') continue
    out.push(`  --icon-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.size.container)) {
    out.push(`  --container-${key}: ${value};`)
  }

  out.push('')
  out.push('  /* spacing roles */')
  for (const [key, value] of Object.entries(tokens.space.semantic)) {
    out.push(`  --space-${key}: ${value};`)
  }

  out.push('')
  out.push('  /* typography */')
  out.push(`  --font-display: ${tokens.typography.families.display.stack};`)
  out.push(`  --font-sans: ${tokens.typography.families.sans.stack};`)
  out.push(`  --font-mono: ${tokens.typography.families.mono.stack};`)
  out.push(`  --measure-prose: ${tokens.typography.maxLineLength.split(',')[0].trim().split(' ')[0]};`)

  return out
}

function buildCssBlock() {
  const lines = []
  lines.push(START('design-system-tokens'))
  lines.push('/*')
  lines.push(' * Source: design-system/tokens/tokens.json')
  lines.push(' * Spec:   design-system/SPEC.md')
  lines.push(' *')
  lines.push(' * These declarations sit AFTER the historical :root/.dark blocks on purpose,')
  lines.push(' * so the generated values win. Aliases at the bottom keep every legacy variable')
  lines.push(' * name working while pointing it at a single source.')
  lines.push(' */')
  lines.push(':root {')
  lines.push(...cssVarLines('light'))
  lines.push('')
  lines.push('  /* legacy aliases - single source of truth, old names still resolve */')
  lines.push('  --contrast-status-info-bg: var(--status-info-bg);')
  lines.push('  --contrast-status-info-fg: var(--status-info-fg);')
  lines.push('  --contrast-status-warning-bg: var(--status-warning-bg);')
  lines.push('  --contrast-status-warning-fg: var(--status-warning-fg);')
  lines.push('  --contrast-status-success-bg: var(--status-success-bg);')
  lines.push('  --contrast-status-success-fg: var(--status-success-fg);')
  lines.push('  --contrast-status-danger-bg: var(--status-danger-bg);')
  lines.push('  --contrast-status-danger-fg: var(--status-danger-fg);')
  lines.push('  --contrast-active-surface: var(--selected-surface);')
  lines.push('  --contrast-active-foreground: var(--selected-foreground);')
  lines.push('  --shadow-card: var(--elevation-card);')
  lines.push('  --shadow-card-hover: var(--elevation-card-hover);')
  lines.push('  --shadow-overlay: var(--elevation-overlay);')
  lines.push('  --shadow-toast: var(--elevation-overlay);')
  lines.push('}')
  lines.push('')
  lines.push('.dark {')
  lines.push(...cssVarLines('dark'))
  lines.push('}')
  lines.push('')
  lines.push('/* ---- Semantic utility classes built from the tokens above ---- */')
  lines.push('.surface-0 { background-color: var(--surface-0); }')
  lines.push('.surface-1 { background-color: var(--surface-1); }')
  lines.push('.surface-2 { background-color: var(--surface-2); }')
  lines.push('.surface-3 { background-color: var(--surface-3); }')
  lines.push('.surface-4 { background-color: var(--surface-4); }')
  lines.push('.text-inverse { color: var(--text-inverse); }')
  lines.push('.border-token-subtle { border-color: var(--border-subtle); }')
  lines.push('.border-token-default { border-color: var(--border-default); }')
  lines.push('.border-token-strong { border-color: var(--border-strong); }')
  lines.push('.measure-prose { max-width: var(--measure-prose); }')
  lines.push('.media-scrim { background-image: var(--media-scrim); }')
  lines.push('')
  for (const role of ['success', 'warning', 'danger', 'info', 'neutral']) {
    lines.push(`.status-${role} { background-color: var(--status-${role}-bg); color: var(--status-${role}-fg); border-color: var(--status-${role}-border); }`)
    lines.push(`.status-${role}-fg { color: var(--status-${role}-fg); }`)
    lines.push(`.status-${role}-solid { background-color: var(--status-${role}-solid); }`)
  }
  lines.push('')
  lines.push('/* ---- Reduced motion (WCAG 2.1 SC 2.3.3) ----')
  lines.push(' * Documented as resolved in docs/ui-ux-full-reconciliation.md Q7 but never shipped.')
  lines.push(' * Shipped 2026-09-09. Entrance animations are forced to their FINAL state rather than')
  lines.push(' * merely shortened, so nothing is left invisible at opacity 0.')
  lines.push(' * Escape hatch: add class "motion-essential" to the three essential cases')
  lines.push(' * (route progress, loading spinner, determinate progress fill).')
  lines.push(' */')
  const essential = tokens.motion.essentialSelectors
  // Only .motion-essential propagates to descendants; the rest are leaf elements.
  const notEssential = essential
    .map((sel) => (sel === '.motion-essential' ? `:not(${sel}):not(${sel} *)` : `:not(${sel})`))
    .join('')
  lines.push('@media (prefers-reduced-motion: reduce) {')
  lines.push('  html { scroll-behavior: auto !important; }')
  lines.push(`  *${notEssential},`)
  lines.push(`  *${notEssential}::before,`)
  lines.push(`  *${notEssential}::after {`)
  lines.push('    animation-duration: 0.01ms !important;')
  lines.push('    animation-iteration-count: 1 !important;')
  lines.push('    animation-delay: 0ms !important;')
  lines.push('    transition-duration: 0.01ms !important;')
  lines.push('    transition-delay: 0ms !important;')
  lines.push('    animation-fill-mode: forwards !important;')
  lines.push('    scroll-behavior: auto !important;')
  lines.push('  }')
  lines.push('  /* Entrance animations must resolve to their final state, never stay invisible. */')
  lines.push(`  [class*="animate-"]${notEssential} {`)
  lines.push('    opacity: 1 !important;')
  lines.push('    transform: none !important;')
  lines.push('  }')
  lines.push('}')
  lines.push('')
  lines.push('/* ---- Forced colors / high contrast ---- */')
  lines.push('@media (forced-colors: active) {')
  lines.push('  *:focus-visible { outline: 3px solid CanvasText !important; outline-offset: 2px !important; }')
  lines.push('}')
  lines.push(END('design-system-tokens'))
  return lines.join('\n')
}

/** Quote a theme key unless it is a bare JS identifier. */
function k(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : `'${name}'`
}

function buildTailwindBlock() {
  const l = []
  const ind = '      '
  l.push(TS_START('design-system-scales'))
  // Only the semantic aliases are emitted. The numeric scale intentionally stays
  // Tailwind's own, so none of the 15,551 existing rounded-* usages shift.
  l.push(`${ind}borderRadius: {`)
  for (const [key, v] of Object.entries(tokens.radius.semantic)) {
    l.push(`${ind}  ${k(key)}: '${v}',`)
  }
  l.push(`${ind}},`)
  l.push(`${ind}zIndex: {`)
  for (const [key, v] of Object.entries(tokens.layer.scale)) {
    l.push(`${ind}  ${k(key)}: '${v}',`)
  }
  l.push(`${ind}},`)
  l.push(`${ind}transitionDuration: {`)
  for (const [key, v] of Object.entries(tokens.motion.duration)) {
    l.push(`${ind}  ${k(key)}: '${v}',`)
  }
  l.push(`${ind}},`)
  l.push(`${ind}transitionTimingFunction: {`)
  for (const [key, v] of Object.entries(tokens.motion.easing)) {
    l.push(`${ind}  ${k(key === 'inOut' ? 'in-out' : key)}: '${v}',`)
  }
  l.push(`${ind}},`)
  l.push(`${ind}minHeight: {`)
  l.push(`${ind}  touch: '${tokens.size.touchTarget.min}',`)
  l.push(`${ind}  'control-sm': '${tokens.size.control['height-sm']}',`)
  l.push(`${ind}  'control-md': '${tokens.size.control['height-md']}',`)
  l.push(`${ind}  'control-lg': '${tokens.size.control['height-lg']}',`)
  l.push(`${ind}},`)
  l.push(`${ind}minWidth: {`)
  l.push(`${ind}  touch: '${tokens.size.touchTarget.min}',`)
  l.push(`${ind}},`)
  l.push(`${ind}maxWidth: {`)
  for (const [key, v] of Object.entries(tokens.size.container)) {
    l.push(`${ind}  ${k(key)}: '${v}',`)
  }
  l.push(`${ind}},`)
  l.push(`${ind}boxShadow: {`)
  l.push(`${ind}  card: 'var(--elevation-card)',`)
  l.push(`${ind}  'card-hover': 'var(--elevation-card-hover)',`)
  l.push(`${ind}  overlay: 'var(--elevation-overlay)',`)
  l.push(`${ind}},`)
  l.push(TS_END('design-system-scales'))
  return l.join('\n')
}

function buildTokensTs() {
  const bp = tokens.breakpoint.scale
  return `/**
 * GENERATED FILE - do not edit by hand.
 * Source: design-system/tokens/tokens.json
 * Regenerate with: npm run tokens:build
 *
 * Import these instead of hardcoding numbers in JS. Reading window.innerWidth
 * to branch layout is a design-system violation; use BREAKPOINTS or a Tailwind prefix.
 */

export const BREAKPOINTS = {
  sm: ${bp.sm},
  md: ${bp.md},
  lg: ${bp.lg},
  xl: ${bp.xl},
  '2xl': ${bp['2xl']},
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/** The widths every UI change must be verified at. */
export const VERIFY_WIDTHS = [${tokens.breakpoint.verifyAt.join(', ')}] as const

export const MEDIA = {
  sm: \`(min-width: \${BREAKPOINTS.sm}px)\`,
  md: \`(min-width: \${BREAKPOINTS.md}px)\`,
  lg: \`(min-width: \${BREAKPOINTS.lg}px)\`,
  xl: \`(min-width: \${BREAKPOINTS.xl}px)\`,
  belowMd: \`(max-width: \${BREAKPOINTS.md - 1}px)\`,
  belowLg: \`(max-width: \${BREAKPOINTS.lg - 1}px)\`,
  coarsePointer: '(pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const

export const LAYER = {
${Object.entries(tokens.layer.scale).map(([k, v]) => `  ${JSON.stringify(k)}: ${v},`).join('\n')}
} as const

export const DURATION = {
${Object.entries(tokens.motion.duration).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}
} as const

export const EASING = {
${Object.entries(tokens.motion.easing).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
} as const

export const TOUCH_TARGET_MIN_PX = ${parseInt(tokens.size.touchTarget.min, 10)}
export const MOUSE_TARGET_MIN_PX = ${parseInt(tokens.size.touchTarget.minMouse, 10)}

/** Hard interface maximums. Exceeding one is a design defect, not a preference. */
export const LIMITS = {
${Object.entries(tokens.limits)
  .filter(([k, v]) => typeof v === 'number')
  .map(([k, v]) => `  ${k}: ${v},`)
  .join('\n')}
} as const

/** Status roles. Meaning is global; the silhouette is local. */
export const STATUS_ROLES = ['success', 'warning', 'danger', 'info', 'neutral'] as const
export type StatusRole = (typeof STATUS_ROLES)[number]

/** Loading indicator thresholds in ms. */
export const LOADING_THRESHOLDS = { skeletonAfter: 1000, progressAfter: 2000, backgroundAfter: 10000 } as const

export const TOAST_DURATION = { confirmation: 3000, warning: 5000, error: 0 } as const
`
}

function buildStandaloneCss(block) {
  return `/*
 * ChefFlow design tokens - standalone copy.
 * GENERATED from design-system/tokens/tokens.json. Do not edit by hand.
 *
 * app/globals.css already contains this block inline (Tailwind needs it in the
 * same file to avoid an extra request). This copy exists so non-Tailwind
 * surfaces - generated PDFs, emails, embeds, the visual catalog - can import
 * exactly the same values.
 */
${block}
`
}

/* ------------------------------------------------------------------- writer */

const results = []

function replaceBlock(filePath, name, block, { startMarker, endMarker, appendIfMissing }) {
  const abs = path.join(ROOT, filePath)
  const original = fs.readFileSync(abs, 'utf8')
  const s = original.indexOf(startMarker(name))
  const e = original.indexOf(endMarker(name))
  let next
  if (s !== -1 && e !== -1) {
    next = original.slice(0, s) + block + original.slice(e + endMarker(name).length)
  } else if (appendIfMissing) {
    next = original.trimEnd() + '\n\n' + block + '\n'
  } else {
    throw new Error(`Markers for ${name} not found in ${filePath} and appendIfMissing is false`)
  }
  return { abs, filePath, original, next }
}

function writeFile(filePath, content) {
  const abs = path.join(ROOT, filePath)
  const original = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
  return { abs, filePath, original, next: content }
}

const cssBlock = buildCssBlock()

results.push(writeFile('design-system/tokens/tokens.css', buildStandaloneCss(cssBlock)))
results.push(writeFile('design-system/tokens/tokens.ts', buildTokensTs()))
results.push(
  replaceBlock('app/globals.css', 'design-system-tokens', cssBlock, {
    startMarker: START,
    endMarker: END,
    appendIfMissing: true,
  })
)
results.push(
  replaceBlock('tailwind.config.ts', 'design-system-scales', buildTailwindBlock(), {
    startMarker: TS_START,
    endMarker: TS_END,
    appendIfMissing: false,
  })
)

for (const r of results) {
  r.next = await format(r.next, r.abs)
}

let stale = 0
for (const r of results) {
  const changed = r.original !== r.next
  if (checkOnly) {
    if (changed) {
      stale += 1
      console.error(`STALE  ${r.filePath}`)
    } else {
      console.log(`ok     ${r.filePath}`)
    }
  } else {
    if (changed) fs.writeFileSync(r.abs, r.next)
    console.log(`${changed ? 'wrote ' : 'ok    '} ${r.filePath}`)
  }
}

if (checkOnly && stale > 0) {
  console.error(`\n${stale} generated file(s) are out of date. Run: npm run tokens:build`)
  process.exit(1)
}
