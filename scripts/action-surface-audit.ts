#!/usr/bin/env npx tsx
/**
 * Action Surface Audit
 *
 * Inventories all server-action exports across lib/ and checks which UI
 * surfaces consume them (app pages, rail, search/palette, hub/circles).
 *
 * Output: docs/action-surface-audit.json
 * Run:    npx tsx scripts/action-surface-audit.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// 1. Discover action files
// ---------------------------------------------------------------------------

type ActionFile = { relPath: string; exports: string[] }

/** Recursively collect files matching a predicate. */
function walkDir(dir: string, predicate: (f: string) => boolean): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full, predicate))
    } else if (predicate(entry.name)) {
      results.push(full)
    }
  }
  return results
}

function discoverActionFiles(): ActionFile[] {
  const libDir = path.join(ROOT, 'lib')
  const files = walkDir(libDir, (name) => {
    // Match actions.ts or *-actions.ts (not .test.ts, not .d.ts)
    if (!name.endsWith('.ts') || name.endsWith('.d.ts') || name.endsWith('.test.ts')) return false
    return name === 'actions.ts' || name.endsWith('-actions.ts')
  })

  const actionFiles: ActionFile[] = []

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    // Only consider files with 'use server' directive
    if (!content.includes("'use server'") && !content.includes('"use server"')) continue

    const exports = extractExportedAsyncFunctions(content)
    if (exports.length === 0) continue

    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/')
    actionFiles.push({ relPath, exports })
  }

  return actionFiles
}

/** Extract names of exported async functions via regex. */
function extractExportedAsyncFunctions(content: string): string[] {
  const names: string[] = []
  // Pattern: export async function NAME(
  const re = /export\s+async\s+function\s+(\w+)\s*\(/g
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    names.push(match[1])
  }
  return names
}

// ---------------------------------------------------------------------------
// 2. Surface categories and scanning
// ---------------------------------------------------------------------------

type SurfaceCategory = 'app' | 'rail' | 'search' | 'hub'

const SURFACE_DIRS: Record<SurfaceCategory, string> = {
  app: path.join(ROOT, 'app'),
  rail: path.join(ROOT, 'components', 'rail'),
  search: path.join(ROOT, 'components', 'search'),
  hub: path.join(ROOT, 'lib', 'hub'),
}

/** Collect all .ts/.tsx file contents for a surface into a single string for fast searching. */
function loadSurfaceContent(dir: string): string {
  if (!fs.existsSync(dir)) return ''
  const files = walkDir(dir, (name) => name.endsWith('.ts') || name.endsWith('.tsx'))
  const chunks: string[] = []
  for (const f of files) {
    try {
      chunks.push(fs.readFileSync(f, 'utf-8'))
    } catch {
      // Skip unreadable files
    }
  }
  return chunks.join('\n')
}

/** Preload all surface contents into memory for fast multi-action searching. */
function preloadSurfaces(): Record<SurfaceCategory, string> {
  const loaded = {} as Record<SurfaceCategory, string>
  for (const [cat, dir] of Object.entries(SURFACE_DIRS)) {
    loaded[cat as SurfaceCategory] = loadSurfaceContent(dir)
  }
  return loaded
}

/** Check if an action name appears in a surface's content (import or direct reference). */
function actionAppearsInSurface(actionName: string, surfaceContent: string): boolean {
  // Look for the function name as a whole word (import statement, call, or reference)
  const re = new RegExp(`\\b${actionName}\\b`)
  return re.test(surfaceContent)
}

// ---------------------------------------------------------------------------
// 3. Build report
// ---------------------------------------------------------------------------

type ActionEntry = {
  action: string
  module: string
  surfaces: SurfaceCategory[]
  surfaceCount: number
}

type AuditReport = {
  generatedAt: string
  summary: {
    totalActions: number
    singleSurface: number
    multiSurface: number
    zeroSurface: number
    coveragePercent: number
  }
  actions: ActionEntry[]
}

function buildReport(): AuditReport {
  const actionFiles = discoverActionFiles()
  const surfaces = preloadSurfaces()
  const surfaceCategories = Object.keys(SURFACE_DIRS) as SurfaceCategory[]

  const actions: ActionEntry[] = []

  for (const file of actionFiles) {
    for (const fnName of file.exports) {
      const found: SurfaceCategory[] = []
      for (const cat of surfaceCategories) {
        // Skip self-references: don't count hub actions appearing in lib/hub/
        if (cat === 'hub' && file.relPath.startsWith('lib/hub/')) continue
        if (actionAppearsInSurface(fnName, surfaces[cat])) {
          found.push(cat)
        }
      }
      actions.push({
        action: fnName,
        module: file.relPath,
        surfaces: found,
        surfaceCount: found.length,
      })
    }
  }

  // Sort: zero-surface first, then single, then by name
  actions.sort((a, b) => {
    if (a.surfaceCount !== b.surfaceCount) return a.surfaceCount - b.surfaceCount
    return a.action.localeCompare(b.action)
  })

  const totalActions = actions.length
  const zeroSurface = actions.filter((a) => a.surfaceCount === 0).length
  const singleSurface = actions.filter((a) => a.surfaceCount === 1).length
  const multiSurface = actions.filter((a) => a.surfaceCount >= 2).length
  const coveragePercent =
    totalActions > 0 ? Math.round(((totalActions - zeroSurface) / totalActions) * 1000) / 10 : 0

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalActions,
      singleSurface,
      multiSurface,
      zeroSurface,
      coveragePercent,
    },
    actions,
  }
}

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[action-surface-audit] Scanning action files...')
  const report = buildReport()

  const outPath = path.join(ROOT, 'docs', 'action-surface-audit.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log(`[action-surface-audit] Found ${report.summary.totalActions} actions`)
  console.log(`  Zero-surface:  ${report.summary.zeroSurface}`)
  console.log(`  Single-surface: ${report.summary.singleSurface}`)
  console.log(`  Multi-surface:  ${report.summary.multiSurface}`)
  console.log(`  Coverage:       ${report.summary.coveragePercent}%`)
  console.log(`[action-surface-audit] Report written to ${path.relative(ROOT, outPath)}`)
}

main()
