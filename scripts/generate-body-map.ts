/**
 * Body Map Generator: file-to-domain inventory for the ChefFlow codebase.
 *
 * Scans lib/, app/, and components/ to build a JSON map of every file
 * grouped by its owning domain ("organ"). Outputs:
 *   - docs/body-map.json (full inventory)
 *   - docs/body-map-summary.md (markdown table)
 *
 * Usage: npx tsx scripts/generate-body-map.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { BodyMap, Organ } from '../lib/body-map/body-map-types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkDir(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      results.push(...walkDir(full, extensions))
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

function relPath(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

/**
 * Extract the domain name from a file path.
 * lib/events/actions.ts -> "events"
 * components/menus/MenuCard.tsx -> "menus"
 * app/(chef)/events/page.tsx -> "events"
 */
function extractDomain(filePath: string, rootDir: string): string | null {
  const rel = path.relative(path.join(ROOT, rootDir), filePath).replace(/\\/g, '/')
  const parts = rel.split('/')

  if (rootDir === 'app') {
    // Skip route groups like (chef), (public), (auth) and dynamic segments like [id]
    const meaningful = parts.filter((p) => !p.startsWith('(') && !p.startsWith('['))
    return meaningful[0] || null
  }

  // lib/ and components/: first folder is the domain
  return parts[0] || null
}

const ROUTE_FILES = new Set([
  'page.tsx',
  'page.ts',
  'layout.tsx',
  'layout.ts',
  'route.ts',
  'route.tsx',
])

function isRouteFile(filePath: string): boolean {
  const base = path.basename(filePath)
  return ROUTE_FILES.has(base)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate(): void {
  const exts = ['.ts', '.tsx']
  const organMap = new Map<string, { files: string[]; routes: string[]; components: string[] }>()
  const unmappedFiles: string[] = []
  let totalFiles = 0

  // Scan lib/
  const libFiles = walkDir(path.join(ROOT, 'lib'), exts)
  for (const f of libFiles) {
    totalFiles++
    const domain = extractDomain(f, 'lib')
    if (!domain) {
      unmappedFiles.push(relPath(f))
      continue
    }
    if (!organMap.has(domain)) organMap.set(domain, { files: [], routes: [], components: [] })
    organMap.get(domain)!.files.push(relPath(f))
  }

  // Scan app/
  const appFiles = walkDir(path.join(ROOT, 'app'), exts)
  for (const f of appFiles) {
    totalFiles++
    const domain = extractDomain(f, 'app')
    if (!domain) {
      unmappedFiles.push(relPath(f))
      continue
    }
    if (!organMap.has(domain)) organMap.set(domain, { files: [], routes: [], components: [] })
    if (isRouteFile(f)) {
      organMap.get(domain)!.routes.push(relPath(f))
    } else {
      organMap.get(domain)!.files.push(relPath(f))
    }
  }

  // Scan components/
  const componentFiles = walkDir(path.join(ROOT, 'components'), exts)
  for (const f of componentFiles) {
    totalFiles++
    const domain = extractDomain(f, 'components')
    if (!domain) {
      unmappedFiles.push(relPath(f))
      continue
    }
    if (!organMap.has(domain)) organMap.set(domain, { files: [], routes: [], components: [] })
    organMap.get(domain)!.components.push(relPath(f))
  }

  // Build organs array sorted by name
  const organs: Organ[] = Array.from(organMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => ({
      name,
      files: data.files.sort(),
      routes: data.routes.sort(),
      components: data.components.sort(),
      fileCount: data.files.length + data.routes.length + data.components.length,
    }))

  const bodyMap: BodyMap = {
    organs,
    totalFiles,
    unmappedFiles: unmappedFiles.sort(),
    generatedAt: new Date().toISOString(),
  }

  // Write JSON
  const jsonPath = path.join(ROOT, 'docs', 'body-map.json')
  fs.writeFileSync(jsonPath, JSON.stringify(bodyMap, null, 2), 'utf-8')
  console.log(`Wrote ${jsonPath}`)

  // Write summary markdown
  const mapped = totalFiles - unmappedFiles.length
  const coverage = totalFiles > 0 ? ((mapped / totalFiles) * 100).toFixed(1) : '0'
  const sorted = [...organs].sort((a, b) => b.fileCount - a.fileCount)

  const lines: string[] = [
    '# Body Map Summary',
    '',
    `Generated: ${bodyMap.generatedAt}`,
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Total files | ${totalFiles} |`,
    `| Organs (domains) | ${organs.length} |`,
    `| Mapped files | ${mapped} |`,
    `| Unmapped files | ${unmappedFiles.length} |`,
    `| Coverage | ${coverage}% |`,
    `| Largest organ | ${sorted[0]?.name ?? 'n/a'} (${sorted[0]?.fileCount ?? 0} files) |`,
    `| Smallest organ | ${sorted[sorted.length - 1]?.name ?? 'n/a'} (${sorted[sorted.length - 1]?.fileCount ?? 0} files) |`,
    '',
    '## Organs by Size',
    '',
    '| Organ | Lib Files | Routes | Components | Total |',
    '| --- | ---: | ---: | ---: | ---: |',
  ]

  for (const organ of sorted) {
    lines.push(
      `| ${organ.name} | ${organ.files.length} | ${organ.routes.length} | ${organ.components.length} | ${organ.fileCount} |`
    )
  }

  if (unmappedFiles.length > 0) {
    lines.push('', '## Unmapped Files', '')
    for (const f of unmappedFiles) {
      lines.push(`- ${f}`)
    }
  }

  lines.push('')

  const mdPath = path.join(ROOT, 'docs', 'body-map-summary.md')
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8')
  console.log(`Wrote ${mdPath}`)
  console.log(`\nDone: ${organs.length} organs, ${totalFiles} files, ${coverage}% coverage`)
}

generate()
