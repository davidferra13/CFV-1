/**
 * Dead Route Detection & Classification
 * SECURITY #8 in UNIFIED-BUILD-QUEUE.md
 *
 * Reads public/route-manifest.json, scans all navigation configs,
 * and classifies every route. Outputs docs/dead-route-report.json.
 *
 * Usage: npx tsx scripts/detect-dead-routes.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteEntry = {
  path: string
  tier: string
  auth: string
  segment: string
}

type RouteManifest = {
  generatedAt: string
  totalRoutes: number
  byTier: Record<string, number>
  routes: RouteEntry[]
}

type Classification = 'navigable' | 'token-access' | 'dynamic-child' | 'api-only' | 'orphan'

type ClassifiedRoute = {
  path: string
  tier: string
  classification: Classification
  reason: string
}

type Report = {
  generatedAt: string
  summary: {
    total: number
    navigable: number
    tokenAccess: number
    dynamicChild: number
    apiOnly: number
    orphan: number
  }
  routes: ClassifiedRoute[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..')

function readJSON<T>(relPath: string): T {
  const full = path.join(ROOT, relPath)
  return JSON.parse(fs.readFileSync(full, 'utf-8')) as T
}

/**
 * Recursively extract all href strings from a JS/TS source file.
 * Matches: href: '/...', href: "/...", href={"/..."}, href="/..."
 */
function extractHrefsFromFile(filePath: string): Set<string> {
  const hrefs = new Set<string>()
  if (!fs.existsSync(filePath)) return hrefs
  const content = fs.readFileSync(filePath, 'utf-8')

  const patterns = [
    /href:\s*['"]([^'"]+)['"]/g,
    /href=\{?\s*['"]([^'"]+)['"]\s*\}?/g,
    /href=\s*['"]([^'"]+)['"]/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const href = match[1]
      if (href.startsWith('/') && !href.includes('${')) {
        const clean = href.split('?')[0]
        hrefs.add(clean)
      }
    }
  }

  return hrefs
}

/**
 * Recursively walk a directory and collect all .ts/.tsx files.
 */
function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', '.turbo'].includes(entry.name)) continue
      results.push(...walkDir(full, exts))
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

/**
 * Extract all Link href values from component files across the project.
 * Scans components/ and app/ directories.
 */
function collectAllNavigableHrefs(): Set<string> {
  const allHrefs = new Set<string>()

  // 1. Nav config files (primary source of truth)
  const navDir = path.join(ROOT, 'components', 'navigation')
  const navFiles = walkDir(navDir, ['.ts', '.tsx'])
  for (const f of navFiles) {
    for (const href of extractHrefsFromFile(f)) {
      allHrefs.add(href)
    }
  }

  // 2. Public surface config
  const publicSurfaceConfig = path.join(ROOT, 'lib', 'public', 'public-surface-config.ts')
  for (const href of extractHrefsFromFile(publicSurfaceConfig)) {
    allHrefs.add(href)
  }

  // 3. Scan all component and app files for Link hrefs
  const componentDirs = [path.join(ROOT, 'components'), path.join(ROOT, 'app')]

  for (const dir of componentDirs) {
    const files = walkDir(dir, ['.tsx', '.ts'])
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8')
      if (content.includes('href=') || content.includes('href:')) {
        for (const href of extractHrefsFromFile(f)) {
          allHrefs.add(href)
        }
      }
    }
  }

  return allHrefs
}

/**
 * Check if a manifest route path matches a nav href.
 */
function routeMatchesHref(routePath: string, href: string): boolean {
  if (routePath === href) return true

  // href with dynamic segment placeholder (e.g. /prices/store/[storeId])
  if (href.includes('[')) {
    const hrefParts = href.split('/')
    const routeParts = routePath.split('/')
    if (hrefParts.length === routeParts.length) {
      const matches = hrefParts.every((part, i) => {
        if (part.startsWith('[') && part.endsWith(']')) return true
        return part === routeParts[i]
      })
      if (matches) return true
    }
  }

  return false
}

/**
 * Check if a route is a child of a navigable dynamic route.
 */
function isDynamicChild(routePath: string, navigableHrefs: Set<string>): boolean {
  if (!routePath.includes('[')) return false

  const parts = routePath.split('/')
  for (let i = parts.length - 1; i >= 2; i--) {
    const parent = parts.slice(0, i).join('/')
    if (parent && navigableHrefs.has(parent)) return true
  }

  const dynamicIndex = parts.findIndex((p) => p.startsWith('['))
  if (dynamicIndex > 0) {
    const baseParent = parts.slice(0, dynamicIndex).join('/')
    if (baseParent && navigableHrefs.has(baseParent)) return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyRoute(route: RouteEntry, navigableHrefs: Set<string>): ClassifiedRoute {
  const p = route.path

  // 1. API routes
  if (p.startsWith('/api/') || p === '/api') {
    return {
      path: p,
      tier: route.tier,
      classification: 'api-only',
      reason: 'API endpoint',
    }
  }

  // 2. Token/deep-link access routes
  const tokenPatterns = [
    { test: (r: string) => r.includes('[token]'), reason: 'token-based access route' },
    { test: (r: string) => r.includes('[shareToken]'), reason: 'share token route' },
    { test: (r: string) => r.includes('/e2e/'), reason: 'e2e test route' },
    { test: (r: string) => r.includes('/callback'), reason: 'OAuth/auth callback route' },
    { test: (r: string) => r.includes('/verify'), reason: 'verification route' },
    { test: (r: string) => r.includes('/unsubscribe'), reason: 'email unsubscribe route' },
    { test: (r: string) => r.includes('/confirm'), reason: 'confirmation route' },
    { test: (r: string) => r.includes('/accept'), reason: 'acceptance route' },
    { test: (r: string) => r.includes('/rsvp'), reason: 'RSVP deep-link route' },
    { test: (r: string) => r.includes('/share/'), reason: 'shared content route' },
    { test: (r: string) => r.includes('/embed'), reason: 'embeddable widget route' },
    { test: (r: string) => r.includes('/auth/'), reason: 'auth flow route' },
    { test: (r: string) => r === '/auth', reason: 'auth flow route' },
    { test: (r: string) => r.includes('/join/'), reason: 'invite join route' },
    { test: (r: string) => r.includes('/invite'), reason: 'invitation route' },
    { test: (r: string) => r.includes('/pay/'), reason: 'payment deep-link' },
    { test: (r: string) => r.includes('/receipt/'), reason: 'receipt deep-link' },
    { test: (r: string) => r.includes('/success'), reason: 'success/completion page' },
    { test: (r: string) => r.includes('[code]'), reason: 'code-based access route' },
    { test: (r: string) => r.includes('[inviteCode]'), reason: 'invite code route' },
  ]

  for (const { test, reason } of tokenPatterns) {
    if (test(p)) {
      return {
        path: p,
        tier: route.tier,
        classification: 'token-access',
        reason,
      }
    }
  }

  // 3. Check if route is directly navigable
  for (const href of navigableHrefs) {
    if (routeMatchesHref(p, href)) {
      return {
        path: p,
        tier: route.tier,
        classification: 'navigable',
        reason: `linked from navigation (matches ${href})`,
      }
    }
  }

  // 4. Dynamic child routes
  if (isDynamicChild(p, navigableHrefs)) {
    return {
      path: p,
      tier: route.tier,
      classification: 'dynamic-child',
      reason: 'child of navigable dynamic route',
    }
  }

  // 5. Routes with dynamic segments whose base is navigable
  if (p.includes('[')) {
    const parts = p.split('/')
    const dynamicIdx = parts.findIndex((seg) => seg.startsWith('['))
    if (dynamicIdx > 0) {
      const base = parts.slice(0, dynamicIdx).join('/')
      if (navigableHrefs.has(base)) {
        return {
          path: p,
          tier: route.tier,
          classification: 'dynamic-child',
          reason: `dynamic child of navigable route ${base}`,
        }
      }
    }
  }

  // 6. Framework pages (loading/error/not-found) for navigable parents
  const frameworkSuffixes = ['/loading', '/error', '/not-found']
  for (const suffix of frameworkSuffixes) {
    if (p.endsWith(suffix)) {
      const parent = p.slice(0, -suffix.length)
      if (parent && (navigableHrefs.has(parent) || parent === '')) {
        return {
          path: p,
          tier: route.tier,
          classification: 'dynamic-child',
          reason: `framework page for ${parent || '/'}`,
        }
      }
    }
  }

  // 7. Everything else is an orphan
  return {
    path: p,
    tier: route.tier,
    classification: 'orphan',
    reason: 'no navigation path found',
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Reading route manifest...')
  const manifest = readJSON<RouteManifest>('public/route-manifest.json')
  console.log(`Found ${manifest.totalRoutes} routes`)

  console.log('Collecting navigable hrefs from nav configs and components...')
  const navigableHrefs = collectAllNavigableHrefs()
  console.log(`Found ${navigableHrefs.size} unique navigable hrefs`)

  console.log('Classifying routes...')
  const classified: ClassifiedRoute[] = []
  const summary = {
    total: manifest.routes.length,
    navigable: 0,
    tokenAccess: 0,
    dynamicChild: 0,
    apiOnly: 0,
    orphan: 0,
  }

  for (const route of manifest.routes) {
    const result = classifyRoute(route, navigableHrefs)
    classified.push(result)

    switch (result.classification) {
      case 'navigable':
        summary.navigable++
        break
      case 'token-access':
        summary.tokenAccess++
        break
      case 'dynamic-child':
        summary.dynamicChild++
        break
      case 'api-only':
        summary.apiOnly++
        break
      case 'orphan':
        summary.orphan++
        break
    }
  }

  // Sort: orphans first (most actionable), then by path
  classified.sort((a, b) => {
    const order: Record<Classification, number> = {
      orphan: 0,
      'token-access': 1,
      'dynamic-child': 2,
      navigable: 3,
      'api-only': 4,
    }
    const diff = order[a.classification] - order[b.classification]
    if (diff !== 0) return diff
    return a.path.localeCompare(b.path)
  })

  const report: Report = {
    generatedAt: new Date().toISOString(),
    summary,
    routes: classified,
  }

  const outPath = path.join(ROOT, 'docs', 'dead-route-report.json')
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log('\nClassification Summary:')
  console.log(`  Total:         ${summary.total}`)
  console.log(`  Navigable:     ${summary.navigable}`)
  console.log(`  Token Access:  ${summary.tokenAccess}`)
  console.log(`  Dynamic Child: ${summary.dynamicChild}`)
  console.log(`  API Only:      ${summary.apiOnly}`)
  console.log(`  Orphan:        ${summary.orphan}`)
  console.log(`\nReport written to: ${outPath}`)
}

main()
