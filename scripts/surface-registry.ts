#!/usr/bin/env npx tsx
/**
 * Surface Registry Scanner
 *
 * Scans app/ for all page.tsx files, cross-references nav configs,
 * and outputs a structured manifest of every route surface.
 *
 * Run with: npx tsx scripts/surface-registry.ts
 * Outputs:  docs/surface-registry.json
 *           docs/surface-registry-summary.md
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ─── Constants ────────────────────────────────────────────────────
const __filename_local = fileURLToPath(import.meta.url)
const __dirname_local = path.dirname(__filename_local)
const ROOT = path.resolve(__dirname_local, '..')
const APP_DIR = path.join(ROOT, 'app')
const NAV_CONFIG = path.join(ROOT, 'components', 'navigation', 'nav-config.tsx')
const ADMIN_NAV_CONFIG = path.join(ROOT, 'components', 'navigation', 'admin-nav-config.ts')
const CLIENT_NAV = path.join(ROOT, 'components', 'navigation', 'client-nav.tsx')
const OUTPUT_JSON = path.join(ROOT, 'docs', 'surface-registry.json')
const OUTPUT_MD = path.join(ROOT, 'docs', 'surface-registry-summary.md')

// ─── Types ────────────────────────────────────────────────────────
interface RouteEntry {
  path: string
  file: string
  group: string
  domain: string
  type: string
  inNav: boolean
  navLabel: string | null
  dynamic: boolean
}

interface RegistryManifest {
  generated: string
  summary: {
    totalRoutes: number
    orphanedRoutes: number
    routesByGroup: Record<string, number>
    routesByType: Record<string, number>
    routesByDomain: Record<string, number>
  }
  routes: RouteEntry[]
}

// ─── File system scanning ─────────────────────────────────────────
function findAllPages(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      results.push(...findAllPages(fullPath))
    } else if (entry.name === 'page.tsx') {
      results.push(fullPath)
    }
  }
  return results
}

// ─── Route path extraction ────────────────────────────────────────
function fileToRoutePath(filePath: string): string {
  // Get path relative to app/
  let rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/')
  // Remove trailing /page.tsx
  rel = rel.replace(/\/page\.tsx$/, '')

  // Strip route groups: (chef), (client), (public), etc.
  // e.g. "(chef)/dashboard" -> "dashboard"
  rel = rel.replace(/\([^)]+\)\/?/g, '')

  // Build route path
  if (!rel || rel === 'page.tsx') return '/'
  return '/' + rel
}

function fileToRelative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

// ─── Group detection ──────────────────────────────────────────────
function detectGroup(filePath: string): string {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/')
  const match = rel.match(/^\(([^)]+)\)\//)
  if (match) return match[1]
  // Files directly under app/ without a group
  return 'root'
}

// ─── Domain detection ─────────────────────────────────────────────
function detectDomain(routePath: string): string {
  // First meaningful segment after /
  const segments = routePath.split('/').filter(Boolean)
  if (segments.length === 0) return 'root'
  // Skip dynamic segments for domain
  const first = segments[0]
  if (first.startsWith('[')) {
    return segments.length > 1 ? segments[1] : 'dynamic'
  }
  return first
}

// ─── Route type classification ────────────────────────────────────
function classifyRoute(routePath: string, _filePath: string): string {
  const segments = routePath.split('/').filter(Boolean)
  const last = segments[segments.length - 1] || ''
  const hasDynamic = segments.some((s) => s.startsWith('['))

  // Wizard routes
  if (last === 'wizard' || segments.includes('wizard')) return 'wizard'

  // Form routes (new, edit, create, import, signup, etc.)
  if (['new', 'edit', 'create', 'signup', 'import', 'compose'].includes(last)) return 'form'
  if (last === 'from-text') return 'form'

  // Settings pages
  if (segments[0] === 'settings' || segments.includes('settings')) return 'settings'

  // Dashboard pages
  if (last === 'dashboard' || last === 'overview') return 'dashboard'

  // Detail pages (dynamic segment as last or near-last)
  if (hasDynamic) {
    // If the last segment is dynamic, it's a detail page
    if (last.startsWith('[')) return 'detail'
    // If a dynamic segment precedes a named sub-page
    return 'detail-sub'
  }

  // Filtered state pages (status filters like /accepted, /draft, /overdue, etc.)
  const filteredStates = new Set([
    'accepted',
    'active',
    'archived',
    'awaiting-deposit',
    'awaiting-response',
    'awaiting-client-reply',
    'cancelled',
    'completed',
    'confirmed',
    'contacted',
    'converted',
    'declined',
    'draft',
    'drafts',
    'expired',
    'failed',
    'inactive',
    'menu-drafting',
    'new',
    'overdue',
    'paid',
    'qualified',
    'refunded',
    'rejected',
    'sent',
    'sent-to-client',
    'viewed',
    'vip',
  ])
  if (filteredStates.has(last)) return 'filtered-state'

  // List pages (plural nouns at the end, likely listing pages)
  // This is heuristic; some pages like /analytics are dashboards
  const dashboardDomains = new Set([
    'dashboard',
    'analytics',
    'briefing',
    'insights',
    'intelligence',
    'pulse',
    'production',
    'daily',
    'onboarding',
    'welcome',
  ])
  if (dashboardDomains.has(last) || dashboardDomains.has(segments[0])) return 'dashboard'

  // Tab-like pages (sub-pages under a domain hub)
  if (segments.length >= 3) return 'tab'

  // Default: page
  return 'page'
}

// ─── Nav config parsing (static text analysis) ────────────────────
function extractNavHrefs(configPath: string): Map<string, string> {
  const hrefMap = new Map<string, string>()
  if (!fs.existsSync(configPath)) return hrefMap

  const content = fs.readFileSync(configPath, 'utf-8')

  // Match href/label pairs that appear close together in object literals.
  // Handles both orders: { href: '...', label: '...' } and { label: '...', href: '...' }
  const pairRegex = /href:\s*['"]([^'"]+)['"][^}]*?label:\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = pairRegex.exec(content)) !== null) {
    const href = match[1]
    const label = match[2]
    if (!hrefMap.has(href)) {
      hrefMap.set(href, label)
    }
  }

  // Also try the reverse order: label before href
  const reversePairRegex = /label:\s*['"]([^'"]+)['"][^}]*?href:\s*['"]([^'"]+)['"]/g
  while ((match = reversePairRegex.exec(content)) !== null) {
    const label = match[1]
    const href = match[2]
    if (!hrefMap.has(href)) {
      hrefMap.set(href, label)
    }
  }

  return hrefMap
}

function extractClientNavHrefs(configPath: string): Map<string, string> {
  const hrefMap = new Map<string, string>()
  if (!fs.existsSync(configPath)) return hrefMap

  const content = fs.readFileSync(configPath, 'utf-8')

  // Client nav uses a simpler structure: { href: '/my-bookings', label: 'Bookings', ... }
  const itemRegex = /href:\s*['"]([^'"]+)['"],\s*label:\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(content)) !== null) {
    hrefMap.set(match[1], match[2])
  }

  // Also capture BOOK_NOW_HREF
  const bookNow = content.match(/BOOK_NOW_HREF\s*=\s*['"]([^'"]+)['"]/)
  if (bookNow) {
    hrefMap.set(bookNow[1], 'Book Now')
  }

  return hrefMap
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const startTime = Date.now()

  // 1. Find all pages
  const pages = findAllPages(APP_DIR).sort()

  // 2. Parse nav configs
  const chefNavHrefs = extractNavHrefs(NAV_CONFIG)
  const adminNavHrefs = extractNavHrefs(ADMIN_NAV_CONFIG)
  const clientNavHrefs = extractClientNavHrefs(CLIENT_NAV)

  // Merge all nav hrefs (first-write-wins: chef nav takes priority)
  const allNavHrefs = new Map<string, string>()
  for (const [href, label] of chefNavHrefs) {
    if (!allNavHrefs.has(href)) allNavHrefs.set(href, label)
  }
  for (const [href, label] of adminNavHrefs) {
    if (!allNavHrefs.has(href)) allNavHrefs.set(href, label)
  }
  for (const [href, label] of clientNavHrefs) {
    if (!allNavHrefs.has(href)) allNavHrefs.set(href, label)
  }

  // 3. Build route entries
  const routes: RouteEntry[] = pages.map((pagePath) => {
    const routePath = fileToRoutePath(pagePath)
    const group = detectGroup(pagePath)
    const domain = detectDomain(routePath)
    const type = classifyRoute(routePath, pagePath)
    const dynamic = /\[/.test(routePath)
    const navLabel = allNavHrefs.get(routePath) || null
    const inNav = allNavHrefs.has(routePath)

    return {
      path: routePath,
      file: fileToRelative(pagePath),
      group,
      domain,
      type,
      inNav,
      navLabel,
      dynamic,
    }
  })

  // 4. Compute summary
  const routesByGroup: Record<string, number> = {}
  const routesByType: Record<string, number> = {}
  const routesByDomain: Record<string, number> = {}

  for (const route of routes) {
    routesByGroup[route.group] = (routesByGroup[route.group] || 0) + 1
    routesByType[route.type] = (routesByType[route.type] || 0) + 1
    routesByDomain[route.domain] = (routesByDomain[route.domain] || 0) + 1
  }

  const orphanedRoutes = routes.filter((r) => !r.inNav)

  const manifest: RegistryManifest = {
    generated: new Date().toISOString(),
    summary: {
      totalRoutes: routes.length,
      orphanedRoutes: orphanedRoutes.length,
      routesByGroup,
      routesByType,
      routesByDomain: Object.fromEntries(
        Object.entries(routesByDomain).sort((a, b) => b[1] - a[1])
      ),
    },
    routes,
  }

  // 5. Write JSON manifest
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2) + '\n')

  // 6. Write summary markdown
  const elapsed = Date.now() - startTime
  const md = generateSummary(manifest, orphanedRoutes, elapsed)
  fs.writeFileSync(OUTPUT_MD, md)

  // 7. Print summary to stdout
  console.log(`Surface Registry scan complete in ${elapsed}ms`)
  console.log(`  Total routes: ${routes.length}`)
  console.log(`  Orphaned routes (not in nav): ${orphanedRoutes.length}`)
  console.log(`  Routes by group:`)
  for (const [group, count] of Object.entries(routesByGroup).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${group}: ${count}`)
  }
  console.log(`  Routes by type:`)
  for (const [type, count] of Object.entries(routesByType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`)
  }
  console.log(`\n  Output: ${OUTPUT_JSON}`)
  console.log(`  Summary: ${OUTPUT_MD}`)
}

// ─── Markdown summary generator ──────────────────────────────────
function generateSummary(
  manifest: RegistryManifest,
  orphanedRoutes: RouteEntry[],
  elapsedMs: number
): string {
  const { summary, routes } = manifest
  const lines: string[] = []

  lines.push('# Surface Registry Summary')
  lines.push('')
  lines.push(`Generated: ${manifest.generated}`)
  lines.push(`Scan time: ${elapsedMs}ms`)
  lines.push('')

  // Overall stats
  lines.push('## Overview')
  lines.push('')
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total routes | ${summary.totalRoutes} |`)
  lines.push(`| In nav config | ${summary.totalRoutes - summary.orphanedRoutes} |`)
  lines.push(`| Orphaned (no nav entry) | ${summary.orphanedRoutes} |`)
  lines.push('')

  // Routes by group
  lines.push('## Routes by Group')
  lines.push('')
  lines.push('| Group | Count |')
  lines.push('|-------|-------|')
  for (const [group, count] of Object.entries(summary.routesByGroup).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${group} | ${count} |`)
  }
  lines.push('')

  // Routes by type
  lines.push('## Routes by Type')
  lines.push('')
  lines.push('| Type | Count |')
  lines.push('|------|-------|')
  for (const [type, count] of Object.entries(summary.routesByType).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${type} | ${count} |`)
  }
  lines.push('')

  // Top 30 domains by route count
  lines.push('## Top Domains (by route count)')
  lines.push('')
  lines.push('| Domain | Count |')
  lines.push('|--------|-------|')
  const sortedDomains = Object.entries(summary.routesByDomain).sort((a, b) => b[1] - a[1])
  for (const [domain, count] of sortedDomains.slice(0, 30)) {
    lines.push(`| ${domain} | ${count} |`)
  }
  if (sortedDomains.length > 30) {
    lines.push(`| ... and ${sortedDomains.length - 30} more | |`)
  }
  lines.push('')

  // Orphaned routes
  lines.push('## Orphaned Routes (no nav entry)')
  lines.push('')
  lines.push(`${orphanedRoutes.length} routes have no corresponding entry in any nav config.`)
  lines.push('')
  // Group orphans by group for readability
  const orphansByGroup: Record<string, RouteEntry[]> = {}
  for (const route of orphanedRoutes) {
    if (!orphansByGroup[route.group]) orphansByGroup[route.group] = []
    orphansByGroup[route.group].push(route)
  }
  for (const [group, groupRoutes] of Object.entries(orphansByGroup).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    lines.push(`### ${group} (${groupRoutes.length})`)
    lines.push('')
    for (const r of groupRoutes.sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`- \`${r.path}\` (${r.type})`)
    }
    lines.push('')
  }

  // Drift detection baseline info
  lines.push('## Drift Detection')
  lines.push('')
  lines.push('Run `scripts/check-surface-drift.sh` to compare against the last committed baseline.')
  lines.push('New routes, removed routes, and newly orphaned routes will be reported.')
  lines.push('')

  return lines.join('\n')
}

main()
