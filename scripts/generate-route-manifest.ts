/**
 * Generate Route Manifest JSON
 *
 * Reads the route-policy classification data and outputs a machine-readable
 * manifest to public/route-manifest.json. Powers health dashboard and
 * dead-route detection (SECURITY #8).
 *
 * Run: npx tsx scripts/generate-route-manifest.ts
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Dynamic import to sidestep tsx ESM named-export resolution
const mod = await import('../lib/security/route-policy.js')
const routePolicy: Record<string, string> = mod.routePolicy

type RoutePolicyTier =
  | 'public'
  | 'authenticated'
  | 'chef'
  | 'client'
  | 'staff'
  | 'admin'
  | 'partner'
  | 'vendor'
  | 'demo'
  | 'mobile'
  | 'kiosk'

interface RouteEntry {
  path: string
  tier: RoutePolicyTier
  auth: 'none' | 'required'
  segment: string
}

interface RouteManifest {
  generatedAt: string
  totalRoutes: number
  byTier: Record<string, number>
  routes: RouteEntry[]
}

const PUBLIC_TIERS = new Set<string>(['public', 'demo'])

function inferSegment(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return 'root'
  const first = parts[0]
  return first.startsWith('[') ? 'dynamic-root' : first
}

function buildManifest(): RouteManifest {
  const entries = Object.entries(routePolicy) as [string, RoutePolicyTier][]
  const byTier: Record<string, number> = {}
  const routes: RouteEntry[] = []

  for (const [path, tier] of entries) {
    byTier[tier] = (byTier[tier] || 0) + 1

    routes.push({
      path,
      tier,
      auth: PUBLIC_TIERS.has(tier) ? 'none' : 'required',
      segment: inferSegment(path),
    })
  }

  // Sort routes alphabetically for stable output
  routes.sort((a, b) => a.path.localeCompare(b.path))

  return {
    generatedAt: new Date().toISOString(),
    totalRoutes: entries.length,
    byTier,
    routes,
  }
}

const manifest = buildManifest()
const outPath = resolve(__dirname, '..', 'public', 'route-manifest.json')
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

console.log(`Route manifest written to ${outPath}`)
console.log(`  Total routes: ${manifest.totalRoutes}`)
console.log(
  `  Tiers: ${Object.entries(manifest.byTier)
    .map(([t, n]) => `${t}=${n}`)
    .join(', ')}`
)
