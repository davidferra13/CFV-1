'use server'

import * as fs from 'fs'
import * as path from 'path'

import { requireChef } from '@/lib/auth/get-user'

import { getOwner } from './ownership-registry'
import type {
  OwnershipHealth,
  OwnershipSummary,
  SurfaceEntry,
  SurfaceOwner,
} from './ownership-types'

const APP_DIR = path.join(process.cwd(), 'app')

const ALL_OWNERS: SurfaceOwner[] = [
  'lifecycle',
  'clients',
  'menus',
  'recipes',
  'ingredients',
  'settings',
  'admin',
  'portal',
  'public',
  'operations',
  'intelligence',
  'finance',
]

/**
 * Recursively scan app/ for page.tsx files and return route paths.
 */
function scanPageFiles(dir: string, base = ''): { route: string; filePath: string }[] {
  const results: { route: string; filePath: string }[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip route groups (parenthesized) from the route path but still recurse
      const routeSegment = entry.name.startsWith('(') ? '' : `/${entry.name}`
      results.push(...scanPageFiles(fullPath, `${base}${routeSegment}`))
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      const route = base || '/'
      results.push({ route, filePath: fullPath })
    }
  }

  return results
}

/**
 * Check if a route directory has a layout file.
 */
function hasLayout(filePath: string): boolean {
  const dir = path.dirname(filePath)
  return fs.existsSync(path.join(dir, 'layout.tsx')) || fs.existsSync(path.join(dir, 'layout.ts'))
}

/**
 * Build surface entries from the app/ directory scan.
 */
function buildSurfaceEntries(): SurfaceEntry[] {
  const pages = scanPageFiles(APP_DIR)
  return pages.map(({ route, filePath }) => ({
    route,
    owner: getOwner(route) ?? ('public' as SurfaceOwner),
    filePath,
    hasLayout: hasLayout(filePath),
  }))
}

/**
 * Get a full ownership summary of all routes.
 */
export async function getOwnershipSummary(): Promise<OwnershipSummary> {
  await requireChef()

  const entries = buildSurfaceEntries()
  const orphans = entries.filter((e) => getOwner(e.route) === undefined)

  const byOwner = {} as Record<SurfaceOwner, number>
  for (const owner of ALL_OWNERS) {
    byOwner[owner] = 0
  }
  for (const entry of entries) {
    const owner = getOwner(entry.route)
    if (owner) {
      byOwner[owner]++
    }
  }

  return {
    totalRoutes: entries.length,
    ownedRoutes: entries.length - orphans.length,
    orphanRoutes: orphans.length,
    byOwner,
  }
}

/**
 * Get all routes that have no registered owner.
 */
export async function getOrphanRoutes(): Promise<SurfaceEntry[]> {
  await requireChef()

  const entries = buildSurfaceEntries()
  return entries.filter((e) => getOwner(e.route) === undefined)
}

/**
 * Get all routes belonging to a specific owner.
 */
export async function getRoutesByOwner(owner: SurfaceOwner): Promise<SurfaceEntry[]> {
  await requireChef()

  const entries = buildSurfaceEntries()
  return entries.filter((e) => getOwner(e.route) === owner)
}

/**
 * Get full ownership health report.
 */
export async function getOwnershipHealth(): Promise<OwnershipHealth> {
  await requireChef()

  const summary = await getOwnershipSummary()
  const orphans = await getOrphanRoutes()

  const coverage =
    summary.totalRoutes > 0
      ? Math.round((summary.ownedRoutes / summary.totalRoutes) * 1000) / 10
      : 100

  return {
    summary,
    orphans: orphans.map((e) => e.route),
    coverage,
    generatedAt: new Date().toISOString(),
  }
}
