#!/usr/bin/env npx tsx
/**
 * Action Surface Audit
 *
 * Inventories every server-action export in lib/ and classifies how it is used:
 *   - ui-wired:     referenced from app/ or components/ (a chef can reach it)
 *   - server-only:  referenced only by other lib/ or hooks/ code
 *   - unreferenced: referenced nowhere outside its own file
 *
 * It also records which named surfaces reference each action (app pages, rail,
 * search/palette, hub/circles, other components) so multi-surface coverage can
 * still be read. Test files are ignored. Matching is by exported name, so a
 * result is structural evidence, not proof: an unreferenced action may have
 * been superseded by a differently named one.
 *
 * Output: docs/action-surface-audit.json (or --out <path>)
 * Run:    npx tsx scripts/action-surface-audit.ts [--out <path>]
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const SKIP_DIRS = new Set(['node_modules', '.next', '.git'])
const SOURCE_RE = /\.(tsx?|jsx?|mjs|cjs)$/
const TEST_RE = /\.(test|spec)\.|__tests__/

function walkDir(dir: string, predicate: (f: string) => boolean): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkDir(full, predicate))
    else if (predicate(full)) results.push(full)
  }
  return results
}

const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, '/')

// ---------------------------------------------------------------------------
// 1. Discover server actions
// ---------------------------------------------------------------------------

type ActionFile = { relPath: string; exports: string[] }

function extractExportedAsyncFunctions(content: string): string[] {
  const names: string[] = []
  const re = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) names.push(match[1])
  return names
}

function discoverActionFiles(): ActionFile[] {
  const files = walkDir(path.join(ROOT, 'lib'), (full) => {
    const name = path.basename(full)
    if (!name.endsWith('.ts') || name.endsWith('.d.ts') || TEST_RE.test(name)) return false
    return name === 'actions.ts' || name.endsWith('-actions.ts')
  })
  const out: ActionFile[] = []
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    if (!content.includes("'use server'") && !content.includes('"use server"')) continue
    const exports = extractExportedAsyncFunctions(content)
    if (exports.length > 0) out.push({ relPath: rel(filePath), exports })
  }
  return out
}

// ---------------------------------------------------------------------------
// 2. Index every identifier by the files that mention it
// ---------------------------------------------------------------------------

type SurfaceCategory = 'app' | 'rail' | 'search' | 'hub' | 'components'
type ActionStatus = 'ui-wired' | 'server-only' | 'unreferenced'

function surfaceOf(relPath: string): SurfaceCategory | null {
  if (relPath.startsWith('app/')) return 'app'
  if (relPath.startsWith('components/rail/')) return 'rail'
  if (relPath.startsWith('components/search/')) return 'search'
  if (relPath.startsWith('lib/hub/')) return 'hub'
  if (relPath.startsWith('components/')) return 'components'
  return null
}

function buildIdentifierIndex(): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()
  const dirs = ['app', 'components', 'lib', 'hooks', 'src']
  const files = dirs.flatMap((d) =>
    walkDir(path.join(ROOT, d), (full) => SOURCE_RE.test(full) && !TEST_RE.test(rel(full)))
  )
  for (const full of files) {
    let content: string
    try {
      content = fs.readFileSync(full, 'utf-8')
    } catch {
      continue
    }
    const r = rel(full)
    for (const token of new Set(content.match(/\b[A-Za-z_]\w*\b/g) ?? [])) {
      let set = index.get(token)
      if (!set) index.set(token, (set = new Set()))
      set.add(r)
    }
  }
  return index
}

// ---------------------------------------------------------------------------
// 3. Build report
// ---------------------------------------------------------------------------

type ActionEntry = {
  action: string
  module: string
  status: ActionStatus
  surfaces: SurfaceCategory[]
  surfaceCount: number
}

type AuditReport = {
  generatedAt: string
  method: string
  summary: {
    totalActions: number
    uiWired: number
    serverOnly: number
    unreferenced: number
    uiWiredPercent: number
    multiSurface: number
  }
  byDomain: Record<
    string,
    { total: number; uiWired: number; serverOnly: number; unreferenced: number }
  >
  actions: ActionEntry[]
}

function buildReport(): AuditReport {
  const actionFiles = discoverActionFiles()
  const index = buildIdentifierIndex()
  const actions: ActionEntry[] = []

  for (const file of actionFiles) {
    for (const fnName of file.exports) {
      const users = [...(index.get(fnName) ?? [])].filter((r) => r !== file.relPath)
      const surfaces = new Set<SurfaceCategory>()
      for (const r of users) {
        const s = surfaceOf(r)
        // Hub actions referenced from other hub files are internal, not a surface.
        if (s === 'hub' && file.relPath.startsWith('lib/hub/')) continue
        if (s) surfaces.add(s)
      }
      const ui = users.some((r) => r.startsWith('app/') || r.startsWith('components/'))
      const status: ActionStatus = ui
        ? 'ui-wired'
        : users.length > 0
          ? 'server-only'
          : 'unreferenced'
      actions.push({
        action: fnName,
        module: file.relPath,
        status,
        surfaces: [...surfaces].sort(),
        surfaceCount: surfaces.size,
      })
    }
  }

  const order: Record<ActionStatus, number> = { unreferenced: 0, 'server-only': 1, 'ui-wired': 2 }
  actions.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      a.module.localeCompare(b.module) ||
      a.action.localeCompare(b.action)
  )

  const byDomain: AuditReport['byDomain'] = {}
  for (const a of actions) {
    const domain = a.module.split('/')[1] ?? 'root'
    const d = (byDomain[domain] ??= { total: 0, uiWired: 0, serverOnly: 0, unreferenced: 0 })
    d.total++
    if (a.status === 'ui-wired') d.uiWired++
    else if (a.status === 'server-only') d.serverOnly++
    else d.unreferenced++
  }

  const total = actions.length
  const uiWired = actions.filter((a) => a.status === 'ui-wired').length
  return {
    generatedAt: new Date().toISOString(),
    method:
      'Exported async functions in use-server lib/**/actions.ts and *-actions.ts, matched by name against app/, components/, lib/, hooks/, src/ (tests excluded). Structural evidence only.',
    summary: {
      totalActions: total,
      uiWired,
      serverOnly: actions.filter((a) => a.status === 'server-only').length,
      unreferenced: actions.filter((a) => a.status === 'unreferenced').length,
      uiWiredPercent: total > 0 ? Math.round((uiWired / total) * 1000) / 10 : 0,
      multiSurface: actions.filter((a) => a.surfaceCount >= 2).length,
    },
    byDomain,
    actions,
  }
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

function main() {
  const outArg = process.argv.indexOf('--out')
  const outPath =
    outArg > -1 && process.argv[outArg + 1]
      ? path.resolve(process.argv[outArg + 1])
      : path.join(ROOT, 'docs', 'action-surface-audit.json')

  console.log('[action-surface-audit] Scanning...')
  const report = buildReport()
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  const s = report.summary
  console.log(`[action-surface-audit] ${s.totalActions} server actions`)
  console.log(`  UI-wired:      ${s.uiWired} (${s.uiWiredPercent}%)`)
  console.log(`  Server-only:   ${s.serverOnly}`)
  console.log(`  Unreferenced:  ${s.unreferenced}`)
  console.log(`  Multi-surface: ${s.multiSurface}`)
  console.log(`[action-surface-audit] Report written to ${outPath}`)
}

main()
