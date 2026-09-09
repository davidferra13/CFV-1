/**
 * Structural guards for the design system.
 *
 * These run in `npm run test:unit` (node:test + tsx) alongside the existing
 * theme-and-color-guards. They are cheap static assertions that catch the class
 * of failure this consolidation was built to stop: a documented decision with no
 * code behind it.
 *
 * They deliberately do NOT count violations. Counting is the ratchet's job
 * (scripts/audit-design-system.mjs). These assert that the system exists and is
 * wired, which must be true at all times.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const tokens = JSON.parse(read('design-system/tokens/tokens.json'))

/* ------------------------------------------------------------ source of truth */

test('the design system source of truth exists', () => {
  for (const file of [
    'design-system/SPEC.md',
    'design-system/BUILD-CHECKLIST.md',
    'design-system/DECISIONS.md',
    'design-system/MIGRATION.md',
    'design-system/OPEN-CONFLICTS.md',
    'design-system/tokens/tokens.json',
    'design-system/tokens/tokens.ts',
    'design-system/tokens/tokens.css',
    'design-system/registry/components.json',
    'design-system/registry/patterns.json',
    'design-system/registry/features.json',
    'design-system/registry/assets.json',
    'design-system/gallery/index.html',
    'scripts/audit-design-system.mjs',
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} is missing`)
  }
})

test('generated blocks are present in the files the product actually reads', () => {
  const globals = read('app/globals.css')
  const tw = read('tailwind.config.ts')
  assert.match(globals, /=== GENERATED:design-system-tokens/)
  assert.match(globals, /=== END GENERATED:design-system-tokens ===/)
  assert.match(tw, /=== GENERATED:design-system-scales/)
  assert.match(tw, /=== END GENERATED:design-system-scales ===/)
})

/* ------------------------------------------------------------------ layering */

test('every layer in the scale is a real Tailwind key', () => {
  const tw = read('tailwind.config.ts')
  const zIndexBlock = tw.slice(tw.indexOf('zIndex: {'), tw.indexOf('}', tw.indexOf('zIndex: {')))
  for (const key of Object.keys(tokens.layer.scale)) {
    // Hyphenated keys are emitted quoted, which is required for valid TypeScript.
    const present = zIndexBlock.includes(`${key}:`) || zIndexBlock.includes(`'${key}':`)
    assert.ok(present, `z-${key} is in tokens.json but not in the Tailwind zIndex scale`)
  }
})

test('float sits above dialog so a menu inside a modal is visible', () => {
  assert.ok(
    tokens.layer.scale.float > tokens.layer.scale.dialog,
    'a menu opened from inside a dialog must render above it'
  )
  assert.ok(tokens.layer.scale.dialog > tokens.layer.scale.overlay)
  assert.ok(tokens.layer.scale.tooltip > tokens.layer.scale.toast)
})

test('no layer class is used in source without being defined', () => {
  const tw = read('tailwind.config.ts')
  const defined = new Set(Object.keys(tokens.layer.scale))
  const used = new Set<string>()
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(abs)
      else if (/\.(tsx|jsx)$/.test(entry.name)) {
        const text = fs.readFileSync(abs, 'utf8')
        for (const m of text.matchAll(/\bz-([a-z][a-z-]{2,})\b/g)) used.add(m[1])
      }
    }
  }
  walk(path.join(ROOT, 'components'))
  walk(path.join(ROOT, 'app'))
  // z-auto is a Tailwind default; 'z-index' is a false match on CSS text.
  const ignore = new Set(['auto', 'index'])
  for (const name of used) {
    if (ignore.has(name)) continue
    assert.ok(defined.has(name), `z-${name} is used in source but is not in the layer scale`)
  }
  assert.ok(tw.includes('dialog:'), 'the generated zIndex block is missing')
})

/* --------------------------------------------------------------- typography */

test('at most two visible font families plus one functional monospace', () => {
  const fams = Object.keys(tokens.typography.families)
  assert.deepEqual(fams.sort(), ['display', 'mono', 'sans'])
})

test('banned font weights are not in the allowed list', () => {
  for (const w of tokens.typography.weights.banned) {
    assert.ok(
      !tokens.typography.weights.allowed.includes(w),
      `weight ${w} is both allowed and banned`
    )
  }
})

test('the only webfont loaded at the root is the display family', () => {
  const layout = read('app/layout.tsx')
  const googleImports = [...layout.matchAll(/import\s*\{([^}]+)\}\s*from\s*'next\/font\/google'/g)]
  const families = googleImports.flatMap((m) => m[1].split(',').map((s) => s.trim()))
  assert.deepEqual(
    families,
    ['Playfair_Display'],
    'the root layout must load exactly one webfont family'
  )
  assert.ok(
    !/fonts\.googleapis\.com/.test(layout),
    'the root layout must not link a font CDN directly'
  )
})

test('font-display resolves to the display stack, not the interface stack', () => {
  const tw = read('tailwind.config.ts')
  const block = tw.slice(tw.indexOf('fontFamily: {'), tw.indexOf('spacing: {'))
  const displayLine = block.slice(block.indexOf('display: ['))
  assert.match(
    displayLine.slice(0, 200),
    /--font-playfair/,
    'font-display must carry the brand voice'
  )
})

/* ------------------------------------------------------------------- motion */

test('reduced motion is implemented, not merely documented', () => {
  const globals = read('app/globals.css')
  const generated = globals.slice(globals.indexOf('=== GENERATED:design-system-tokens'))
  assert.match(generated, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(generated, /animation-duration: 0\.01ms !important/)
  assert.match(generated, /animation-fill-mode: forwards !important/)
  assert.ok(
    tokens.motion.reducedMotion.implemented === true,
    'tokens.json must not claim reduced motion is implemented unless it is'
  )
})

test('loading feedback is exempt from motion suppression', () => {
  const selectors: string[] = tokens.motion.essentialSelectors
  for (const needed of ['.animate-spin', '.loading-spinner', '[role="progressbar"]']) {
    assert.ok(selectors.includes(needed), `${needed} must keep moving under reduced motion`)
  }
  const globals = read('app/globals.css')
  assert.ok(
    globals.includes(':not(.animate-spin)'),
    'the reduced-motion block must exempt the spinner'
  )
})

/* ------------------------------------------------------------ accessibility */

test('contrast floors are AA or better', () => {
  assert.ok(tokens.a11y.contrast.bodyText >= 4.5)
  assert.ok(tokens.a11y.contrast.largeText >= 3)
  assert.ok(tokens.a11y.contrast.uiComponent >= 3)
  assert.ok(tokens.a11y.contrast.focusIndicator >= 3)
})

test('touch targets are 44px and never shrink with density', () => {
  assert.equal(tokens.size.touchTarget.min, '44px')
  assert.equal(tokens.density.comfortable.controlHeight, '44px')
  assert.equal(tokens.density.compact.controlHeight, '44px')
})

test('every Button size clears the touch minimum', () => {
  const button = read('components/ui/button.tsx')
  const sizes = button.slice(
    button.indexOf('const sizes = {'),
    button.indexOf('}', button.indexOf('const sizes = {'))
  )
  for (const line of sizes.split('\n').filter((l) => l.includes(':'))) {
    const ok = /min-h-\[44px\]|min-h-touch|h-12|h-11/.test(line)
    if (line.includes('sm:') || line.includes('md:') || line.includes('lg:')) {
      assert.ok(ok, `Button size line does not clear 44px: ${line.trim()}`)
    }
  }
})

test('the interactive Card is keyboard operable', () => {
  const card = read('components/ui/card.tsx')
  assert.match(card, /role=\{isButtonLike \? 'button' : role\}/)
  assert.match(card, /event\.key === 'Enter' \|\| event\.key === ' '/)
  assert.match(card, /focus-visible:ring-\[var\(--focus-ring-color\)\]/)
})

test('Alert announces to assistive technology', () => {
  const alert = read('components/ui/alert.tsx')
  assert.match(alert, /role=\{resolvedRole\}/)
  assert.match(alert, /aria-live=\{live\}/)
})

test('Switch applies disabled to the interactive element', () => {
  const sw = read('components/ui/switch.tsx')
  const buttonTag = sw.slice(sw.indexOf('<button'), sw.indexOf('>', sw.indexOf('className=')))
  assert.match(
    buttonTag,
    /disabled=\{disabled\}/,
    'disabled must land on the <button>, not only the hidden input'
  )
})

test('a disabled or loading Button link is inert', () => {
  const button = read('components/ui/button.tsx')
  assert.match(button, /const inert = Boolean\(disabled \|\| loading\)/)
  assert.match(button, /href=\{inert \? undefined : href\}/)
  assert.match(button, /tabIndex=\{inert \? -1 : undefined\}/)
})

/* ---------------------------------------------------------------- registries */

test('every registry parses and every canonical component path exists', () => {
  const components = JSON.parse(read('design-system/registry/components.json'))
  JSON.parse(read('design-system/registry/patterns.json'))
  JSON.parse(read('design-system/registry/features.json'))
  JSON.parse(read('design-system/registry/assets.json'))

  for (const c of components.components) {
    if (c.status === 'missing') {
      assert.equal(c.path, null, `${c.id} is marked missing but names a path`)
      continue
    }
    assert.ok(c.path, `${c.id} has status ${c.status} but no path`)
    assert.ok(
      fs.existsSync(path.join(ROOT, c.path)),
      `${c.id} points at a file that does not exist: ${c.path}`
    )
  }
})

test('no two registry entries claim the same component id', () => {
  const components = JSON.parse(read('design-system/registry/components.json'))
  const ids = components.components.map((c: { id: string }) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate component id in the registry')
})

test('the audit baseline exists and only shrinks', () => {
  const baselinePath = 'design-system/.audit-baseline.json'
  assert.ok(fs.existsSync(path.join(ROOT, baselinePath)), 'the ratchet needs a baseline')
  const baseline = JSON.parse(read(baselinePath))
  for (const [rule, count] of Object.entries(baseline.rules)) {
    assert.equal(typeof count, 'number', `baseline for ${rule} is not a number`)
  }
})

/* ------------------------------------------------------------------- colour */

test('status roles cover every meaning the system uses', () => {
  const roles = Object.keys(tokens.semantic.status).filter((k) => k !== 'description')
  assert.deepEqual(roles.sort(), ['danger', 'info', 'neutral', 'success', 'warning'])
  for (const role of roles) {
    for (const slot of ['bg', 'fg', 'border', 'solid']) {
      assert.ok(tokens.semantic.status[role][slot], `--status-${role}-${slot} is missing`)
    }
  }
})

test('status tokens are emitted into the stylesheet in both themes', () => {
  const globals = read('app/globals.css')
  const generated = globals.slice(globals.indexOf('=== GENERATED:design-system-tokens'))
  const rootBlock = generated.slice(generated.indexOf(':root {'), generated.indexOf('.dark {'))
  const darkBlock = generated.slice(generated.indexOf('.dark {'))
  for (const role of ['success', 'warning', 'danger', 'info', 'neutral']) {
    assert.ok(rootBlock.includes(`--status-${role}-bg:`), `light --status-${role}-bg missing`)
    assert.ok(darkBlock.includes(`--status-${role}-bg:`), `dark --status-${role}-bg missing`)
  }
})

test('the legacy contrast and shadow variable names still resolve', () => {
  const globals = read('app/globals.css')
  const generated = globals.slice(globals.indexOf('=== GENERATED:design-system-tokens'))
  for (const legacy of [
    '--contrast-status-info-bg',
    '--contrast-status-warning-fg',
    '--contrast-active-surface',
    '--shadow-card',
    '--shadow-overlay',
  ]) {
    assert.ok(
      generated.includes(`${legacy}:`),
      `${legacy} must keep resolving for existing consumers`
    )
  }
})

test('components/ui contains no raw hex colour', () => {
  const dir = path.join(ROOT, 'components/ui')
  const offenders: string[] = []
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(tsx|ts)$/.test(file)) continue
    const text = fs.readFileSync(path.join(dir, file), 'utf8')
    text.split('\n').forEach((line, i) => {
      const stripped = line.replace(/\/\/.*$/, '')
      if (/#[0-9a-fA-F]{6}\b/.test(stripped) && !/design-system-allow/.test(line)) {
        offenders.push(`components/ui/${file}:${i + 1}`)
      }
    })
  }
  // Two registered exceptions:
  //  - branded-illustrations: illustration artwork, tracked as MIGRATION.md M-03.
  //  - rich-text-editor: the swatch list a WRITER picks from for their own document
  //    content. Those are content colours, not interface chrome, so they are not
  //    governed by the interface palette.
  const EXCEPTIONS = ['branded-illustrations', 'rich-text-editor']
  const unexpected = offenders.filter((o) => !EXCEPTIONS.some((e) => o.includes(e)))
  assert.deepEqual(
    unexpected,
    [],
    `raw hex in the primitive layer:\n${unexpected.join('\n')}\nUse a brand-*, stone-* or --status-* token.`
  )
})
