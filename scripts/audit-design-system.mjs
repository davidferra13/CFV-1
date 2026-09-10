#!/usr/bin/env node
/**
 * Design-system enforcement.
 *
 * Zero dependencies, same shape as scripts/audit-a11y-markup.mjs so it drops
 * straight into the existing CI job and regression firewall.
 *
 *   node scripts/audit-design-system.mjs               report against the baseline
 *   node scripts/audit-design-system.mjs --strict      exit 1 if any rule got worse
 *   node scripts/audit-design-system.mjs --zero        exit 1 on ANY violation (aspirational)
 *   node scripts/audit-design-system.mjs --update-baseline
 *   node scripts/audit-design-system.mjs --out report.json
 *   node scripts/audit-design-system.mjs --rule no-raw-hex   show every hit for one rule
 *
 * RATCHET MODEL
 * The codebase carries real, pre-existing debt (thousands of raw hex values
 * accumulated over months). A repo-wide zero-tolerance gate would fail on day
 * one and get switched off, which protects nothing. So each rule records a
 * baseline count in design-system/.audit-baseline.json and --strict fails only
 * when a count goes UP. Debt can only shrink. Lower the baseline as you migrate;
 * never raise it without a line in design-system/DECISIONS.md.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const BASELINE_PATH = path.join(ROOT, 'design-system', '.audit-baseline.json')

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const zero = argv.includes('--zero')
const updateBaseline = argv.includes('--update-baseline')
const outArg = argv.find((a) => a.startsWith('--out'))
const outPath = outArg ? (outArg.includes('=') ? outArg.split('=')[1] : argv[argv.indexOf(outArg) + 1]) : null
const ruleArg = argv.find((a) => a.startsWith('--rule='))
const onlyRule = ruleArg ? ruleArg.split('=')[1] : null

const SCAN_DIRS = ['app', 'components', 'lib']
const SCAN_EXT = new Set(['.tsx', '.jsx', '.ts', '.css'])
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'test-results'])

/* --------------------------------------------------------------- rule set */

/**
 * Each rule: { id, severity, why, fix, appliesTo(file), test(line, file) -> boolean }
 * `allow` short-circuits a file or line that is a legitimate exception.
 */

const OG_ROUTE = /(opengraph-image|twitter-image|app\/api\/og\/|compare-social-image|generate-foh-image)/
const PRINT_FILE = /(components\/print\/|\/print\/|print-layout)/
const TOKEN_FILE = /(app\/globals\.css|design-system\/|lib\/themes\/color-palettes\.ts|lib\/ui\/contrast-contract\.ts|lib\/documents\/pdf-design-tokens\.ts)/
const UI_DIR = /components\/ui\//
// Email HTML has no CSS custom properties in most clients, so inline hex is required there.
const EMAIL_TEMPLATE = /lib\/email\/templates\//

const RULES = [
  {
    id: 'no-raw-hex',
    severity: 'error',
    why: 'A raw hex value cannot follow the active palette. The brand ramp is swapped at runtime across 8 palettes, so #e88f47 is correct in exactly one of them and wrong in the other seven.',
    fix: 'Use a brand-* / stone-* utility, or var(--brand-500), or a status token.',
    appliesTo: (f) => SCAN_EXT.has(path.extname(f)) && !TOKEN_FILE.test(f) && !OG_ROUTE.test(f) && !PRINT_FILE.test(f),
    test: (line) => /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/.test(stripComments(line)) && !/(?:^|[^\w-])(?:id|href|url|key|hash|sha|#!)/.test(line),
  },
  {
    id: 'no-raw-rgb-literal',
    severity: 'error',
    why: 'Same reason as raw hex. rgb(var(--token)) is fine; rgba(74, 124, 78, 0.15) is a hardcoded brand green with eight different alpha spellings.',
    fix: 'rgb(var(--brand-500) / 0.15)',
    appliesTo: (f) => SCAN_EXT.has(path.extname(f)) && !TOKEN_FILE.test(f) && !OG_ROUTE.test(f) && !PRINT_FILE.test(f),
    test: (line) => /\brgba?\(\s*\d/.test(stripComments(line)),
  },
  {
    id: 'no-off-identity-color-family',
    severity: 'error',
    why: 'blue, sky, cyan, indigo, violet and fuchsia are not declared in tailwind.config.ts at all, so they leak Tailwind defaults into a deliberately warm identity. The existing theme guard already bans them on public surfaces; this extends it repo-wide.',
    fix: 'Use brand-* for accent, or a status token for meaning.',
    appliesTo: (f) => /\.(tsx|jsx|ts|css)$/.test(f),
    test: (line) => /(?:^|[\s"'`:{])(?:hover:|focus:|active:|group-hover:|dark:|sm:|md:|lg:|xl:)*(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow|accent|caret|decoration|placeholder)-(?:blue|sky|cyan|indigo|violet|fuchsia)-\d{2,3}\b/.test(line),
  },
  {
    id: 'no-arbitrary-font-size',
    severity: 'warn',
    why: 'text-[10px] and text-[11px] already exist as text-2xs and text-xxs. 819 of these are a pure find-and-replace.',
    fix: 'text-[10px] -> text-2xs, text-[11px] -> text-xxs, text-[12px] -> text-xs-tight.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    test: (line) => /\btext-\[\d+(?:px|rem)\]/.test(line),
  },
  {
    id: 'no-font-family-declaration',
    severity: 'error',
    why: 'A component that picks its own font breaks the two-family rule. Typography families are declared once, in tailwind.config.ts and the token file.',
    fix: 'font-display, font-sans or font-mono.',
    appliesTo: (f) => SCAN_EXT.has(path.extname(f)) && !TOKEN_FILE.test(f) && !OG_ROUTE.test(f) && !PRINT_FILE.test(f) && !/culinary-board/.test(f),
    test: (line) => /font-?[Ff]amily\s*[:=]/.test(line) && !/var\(--font-(playfair|sans|mono|display)\)/.test(line),
  },
  {
    id: 'no-external-font-link',
    severity: 'error',
    why: 'A raw <link> to a font CDN is render-blocking, unpinned and bypasses next/font. Only the culinary board is an approved exception, and even it should move behind next/font.',
    fix: 'Load fonts through next/font in app/layout.tsx.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f) && !/culinary-board/.test(f),
    test: (line) => /fonts\.(googleapis|gstatic)\.com/.test(line),
  },
  {
    id: 'no-arbitrary-z-index',
    severity: 'error',
    why: 'There were 14 ad-hoc stacking layers including z-[9999] and zIndex 2147483647, and four named classes (z-dialog, z-float, z-chrome, z-toast) that were used in 122 files while being undefined. The layer scale is now real.',
    fix: 'z-raised | z-sticky | z-chrome | z-nav | z-overlay | z-dialog | z-float | z-toast | z-tooltip | z-max.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    test: (line) => /\bz-\[\d+\]/.test(line) || /zIndex:\s*['"]?\d{3,}/.test(line),
  },
  {
    id: 'no-arbitrary-radius',
    severity: 'warn',
    why: 'Nine near-identical arbitrary radii sit in the 1.25rem to 2rem band. That is one missing token, not nine decisions.',
    fix: 'rounded-card (12px), rounded-sheet (16px), rounded-3xl (24px), rounded-pill.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    test: (line) => /\brounded-\[[^\]]+\]/.test(line),
  },
  {
    id: 'no-hardcoded-breakpoint-in-js',
    severity: 'error',
    why: 'Six files branch layout on a literal width. They silently drift from the Tailwind scale.',
    fix: "import { BREAKPOINTS, MEDIA } from '@/design-system/tokens/tokens'",
    appliesTo: (f) => /\.(tsx|jsx|ts)$/.test(f),
    test: (line) => /window\.innerWidth\s*[<>]=?\s*\d{3,}/.test(line) || /matchMedia\(\s*['"`]\(\s*(?:min|max)-width:\s*\d{3,}px/.test(line),
  },
  {
    id: 'no-styled-raw-button',
    severity: 'warn',
    why: "The documented heuristic from docs/ui-ux-full-reconciliation.md Q4: a raw <button> carrying Tailwind styling outside components/ui is a hand-built Button. 3,395 raw buttons exist across 1,178 files.",
    fix: '<Button variant="..." size="..."> from @/components/ui/button.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f) && !UI_DIR.test(f) && !/error\.tsx$|global-error\.tsx$/.test(f),
    test: (line) => /<button\b/.test(line) && /className=/.test(line) && /(bg-|rounded-|px-|py-)/.test(line),
  },
  {
    id: 'touch-target-too-small',
    severity: 'error',
    why: 'Interactive targets are 44x44px minimum on touch. A 32px tap target is a defect, not a density choice.',
    fix: 'min-h-touch / min-w-touch, or size="sm" on Button which already clears 44px.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    test: (line) => {
      // Only flag elements that are actually interactive. A 2px min-height on a
      // bar chart or a 20px badge is not a tap target.
      const interactive = /<button\b|<a\s|role=|onClick|cursor-pointer|<Button\b|<Link\b/.test(line)
      if (!interactive) return false
      const m = [...line.matchAll(/\bmin-(?:h|w)-\[(\d+)px\]/g)]
      return m.some((x) => Number(x[1]) > 0 && Number(x[1]) < 44)
    },
  },
  {
    id: 'no-inline-style-color',
    severity: 'warn',
    why: 'An inline style colour escapes both Tailwind and the theme. The dialog and select popovers were pinned to the dark theme this way.',
    fix: "style={{ background: 'var(--glass-heavy-bg)' }}",
    appliesTo: (f) =>
      /\.(tsx|jsx)$/.test(f) && !OG_ROUTE.test(f) && !PRINT_FILE.test(f) && !EMAIL_TEMPLATE.test(f),
    // rgb(var(--token)) and var(--token) are the correct form and are not literals.
    test: (line) =>
      /(?:background|backgroundColor|color|borderColor|fill|stroke)\s*:\s*['"`](?:#|rgba?\(\s*\d|hsla?\(\s*\d)/.test(line),
  },
  {
    id: 'no-link-wraps-button',
    severity: 'warn',
    why: "A next/link <Link> renders an <a>, so <Link><Button/></Link> is a nested interactive element: two focus stops for one action, and a screen reader announces it twice. scripts/audit-a11y-markup.mjs only catches the literal <a> form, so this rule covers the Link form.",
    fix: '<Button href="/path"> renders the anchor itself. For client-side navigation, put the Link inside the Button-styled element instead of around it.',
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f),
    // Line-based matching cannot see this: the <Link> and the <Button> are almost
    // always on separate lines, so this rule scans the whole file.
    fileTest: (text) => {
      const hits = []
      const re = /<Link\b[^>]*>\s*<Button\b/g
      let m
      while ((m = re.exec(text))) hits.push(text.slice(0, m.index).split('\n').length)
      return hits
    },
  },
  {
    id: 'no-emoji-as-icon',
    severity: 'warn',
    why: 'Phosphor is the icon system. An emoji renders differently on every platform, cannot be recoloured by a token, and is read aloud by its unicode name.',
    fix: "import the icon from '@/components/ui/icons'",
    appliesTo: (f) => /\.(tsx|jsx)$/.test(f) && !/emoji|reaction|picker/i.test(f),
    test: (line) =>
      /<(?:span|div|button|Button)[^>]*>\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(line),
  },
  {
    id: 'no-lucide-import',
    severity: 'error',
    why: 'Phosphor is the icon system. 53 files still import lucide-react, so both libraries ship to the client.',
    fix: "import { X } from '@/components/ui/icons'",
    appliesTo: (f) => /\.(tsx|jsx|ts)$/.test(f) && !/components\/ui\/icons\.ts$/.test(f),
    test: (line) => /from\s+['"]lucide-react['"]/.test(line),
  },
]

/* ---------------------------------------------------------------- scanning */

function stripComments(line) {
  return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
}

function walk(dir, acc = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) walk(abs, acc)
    else if (SCAN_EXT.has(path.extname(e.name))) acc.push(abs)
  }
  return acc
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
const results = Object.fromEntries(RULES.map((r) => [r.id, []]))

for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/')
  const applicable = RULES.filter((r) => r.appliesTo(rel))
  if (applicable.length === 0) continue
  let lines
  try {
    // Normalise CRLF first: a Windows checkout would otherwise leave a trailing
    // \r on every line and shift the counts this ratchet compares against.
    lines = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').split('\n')
  } catch {
    continue
  }
  const text = lines.join('\n')
  for (const rule of applicable) {
    if (!rule.fileTest) continue
    for (const lineNo of rule.fileTest(text, rel)) {
      const raw = lines[lineNo - 1] ?? ''
      if (raw.includes('design-system-allow')) continue
      results[rule.id].push({ file: rel, line: lineNo, text: raw.trim().slice(0, 160) })
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.includes('design-system-allow')) continue
    for (const rule of applicable) {
      if (!rule.test) continue
      if (rule.test(line, rel)) {
        results[rule.id].push({ file: rel, line: i + 1, text: line.trim().slice(0, 160) })
      }
    }
  }
}

/* ------------------------------------------------------------- token sync */

const generatedChecks = []
function checkGenerated(label, cmdDescription, filePath, marker) {
  const abs = path.join(ROOT, filePath)
  const ok = fs.existsSync(abs) && fs.readFileSync(abs, 'utf8').includes(marker)
  generatedChecks.push({ label, ok, filePath, fix: cmdDescription })
}
checkGenerated('globals.css token block present', 'npm run tokens:build', 'app/globals.css', 'GENERATED:design-system-tokens')
checkGenerated('tailwind scales block present', 'npm run tokens:build', 'tailwind.config.ts', 'GENERATED:design-system-scales')
checkGenerated('reduced-motion block present', 'npm run tokens:build', 'app/globals.css', 'prefers-reduced-motion: reduce')
checkGenerated('layer scale defined', 'npm run tokens:build', 'tailwind.config.ts', 'dialog:')

/* --------------------------------------------------------------- reporting */

const counts = Object.fromEntries(RULES.map((r) => [r.id, results[r.id].length]))
const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : null

if (onlyRule) {
  const rule = RULES.find((r) => r.id === onlyRule)
  if (!rule) {
    console.error(`Unknown rule "${onlyRule}". Known: ${RULES.map((r) => r.id).join(', ')}`)
    process.exit(2)
  }
  console.log(`\n${rule.id} (${rule.severity}) - ${counts[rule.id]} hit(s)\nwhy: ${rule.why}\nfix: ${rule.fix}\n`)
  for (const hit of results[rule.id]) console.log(`  ${hit.file}:${hit.line}  ${hit.text}`)
  console.log('')
  process.exit(0)
}

console.log(`\nDesign-system audit  (${files.length} files scanned)\n`)
console.log('  rule                              now   baseline   delta')
console.log('  ' + '-'.repeat(58))

let regressions = 0
let improvements = 0
for (const rule of RULES) {
  const now = counts[rule.id]
  const base = baseline?.rules?.[rule.id]
  const delta = base === undefined ? null : now - base
  if (delta !== null && delta > 0) regressions += 1
  if (delta !== null && delta < 0) improvements += 1
  const deltaText = delta === null ? '   new' : delta === 0 ? '     0' : delta > 0 ? `  +${delta}` : `  ${delta}`
  const flag = delta !== null && delta > 0 ? '  WORSE' : delta !== null && delta < 0 ? '  better' : ''
  console.log(`  ${rule.id.padEnd(33)} ${String(now).padStart(5)}  ${String(base ?? '-').padStart(9)}  ${deltaText}${flag}`)
}

console.log('')
for (const c of generatedChecks) {
  console.log(`  ${c.ok ? 'ok  ' : 'FAIL'}  ${c.label}${c.ok ? '' : `   fix: ${c.fix}`}`)
}

const generatedFailures = generatedChecks.filter((c) => !c.ok).length
const total = Object.values(counts).reduce((a, b) => a + b, 0)
console.log(`\n  total violations: ${total}   regressions: ${regressions}   improvements: ${improvements}\n`)

if (outPath) {
  fs.writeFileSync(
    path.join(ROOT, outPath),
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        filesScanned: files.length,
        counts,
        baseline: baseline?.rules ?? null,
        generatedChecks,
        rules: RULES.map((r) => ({ id: r.id, severity: r.severity, why: r.why, fix: r.fix })),
        hits: results,
      },
      null,
      2
    )
  )
  console.log(`  wrote ${outPath}\n`)
}

if (updateBaseline) {
  fs.writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        note: 'Ratchet baseline for scripts/audit-design-system.mjs. A count may only go DOWN. Raising a number here requires a line in design-system/DECISIONS.md saying why.',
        updated: new Date().toISOString().slice(0, 10),
        rules: counts,
      },
      null,
      2
    ) + '\n'
  )
  console.log(`  wrote design-system/.audit-baseline.json\n`)
  process.exit(0)
}

if (generatedFailures > 0) {
  console.error('  Generated design-system output is missing or stale. Run: npm run tokens:build\n')
  process.exit(1)
}

if (zero && total > 0) {
  console.error(`  --zero: ${total} violation(s) remain.\n`)
  process.exit(1)
}

if (strict) {
  if (!baseline) {
    console.error('  No baseline. Run: node scripts/audit-design-system.mjs --update-baseline\n')
    process.exit(1)
  }
  if (regressions > 0) {
    console.error(`  ${regressions} rule(s) got worse. The design-system ratchet only turns one way.`)
    console.error('  Inspect a rule with: node scripts/audit-design-system.mjs --rule=<id>\n')
    process.exit(1)
  }
  console.log('  strict: no regressions.\n')
}
