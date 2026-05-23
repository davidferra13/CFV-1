'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  RouteWiringStatus,
  ConnectedDomain,
  UnwiredRoute,
  OverwiredRoute,
  WiringReport,
} from './wiring-types'

const APP_ROOT = path.join(process.cwd(), 'app')

// ---------------------------------------------------------------------------
// Contextual Wiring Mise en Place
// Inspects route source files and reports domain/action/component connections.
// ---------------------------------------------------------------------------

/**
 * Get wiring status for a specific route (page.tsx).
 * Shows all connected domains, server actions, and components.
 */
export async function getWiringStatus(route: string): Promise<WiringReport> {
  await requireAdmin()

  const runAt = new Date().toISOString()
  const pagePath = await resolvePagePath(route)

  if (!pagePath) {
    return { route: null, runAt }
  }

  try {
    const content = await fs.readFile(pagePath, 'utf-8')
    const connectedDomains = extractDomainImports(content)
    const connectedComponents = extractComponentImports(content)
    const serverActionCount = countServerActionImports(content)

    const status: RouteWiringStatus = {
      route,
      connectedDomains,
      connectedComponents,
      serverActionCount,
      domainCount: connectedDomains.length,
      isOverwired: connectedDomains.length >= 10,
      isUnwired: serverActionCount === 0,
    }

    return { route: status, runAt }
  } catch {
    return { route: null, runAt }
  }
}

/**
 * Return all routes with no server action imports.
 */
export async function getUnwiredRoutes(): Promise<WiringReport> {
  await requireAdmin()

  const runAt = new Date().toISOString()
  const pages = await collectPageFiles(APP_ROOT)
  const unwired: UnwiredRoute[] = []

  await Promise.all(
    pages.map(async (p) => {
      try {
        const content = await fs.readFile(p.path, 'utf-8')
        const actionCount = countServerActionImports(content)
        if (actionCount === 0) {
          unwired.push({
            route: p.route,
            reason: 'No server action imports found in page.tsx',
          })
        }
      } catch {
        // Non-fatal
      }
    })
  )

  return { route: null, unwiredRoutes: unwired, runAt }
}

/**
 * Return all routes importing from 10 or more domains.
 */
export async function getOverwiredRoutes(): Promise<WiringReport> {
  await requireAdmin()

  const runAt = new Date().toISOString()
  const pages = await collectPageFiles(APP_ROOT)
  const overwired: OverwiredRoute[] = []

  await Promise.all(
    pages.map(async (p) => {
      try {
        const content = await fs.readFile(p.path, 'utf-8')
        const domains = extractDomainImports(content)
        if (domains.length >= 10) {
          overwired.push({
            route: p.route,
            domainCount: domains.length,
            domains: domains.map((d) => d.domain),
          })
        }
      } catch {
        // Non-fatal
      }
    })
  )

  return { route: null, overwiredRoutes: overwired, runAt }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolvePagePath(route: string): Promise<string | null> {
  // Map route to likely page.tsx location
  const segments = route.replace(/^\//, '').split('/').filter(Boolean)
  const candidates = [
    path.join(APP_ROOT, ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(chef)', ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(admin)', ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(client)', ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(staff)', ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(partner)', 'partner', ...segments, 'page.tsx'),
    path.join(APP_ROOT, '(public)', ...segments, 'page.tsx'),
  ]
  for (const c of candidates) {
    try {
      await fs.access(c)
      return c
    } catch {
      // Try next candidate
    }
  }
  return null
}

function extractDomainImports(content: string): ConnectedDomain[] {
  const domainMap = new Map<string, string[]>()
  const importPattern = /from\s+['"]@\/lib\/([\w/-]+)['"]/g
  let match
  while ((match = importPattern.exec(content)) !== null) {
    const fullPath = match[1]
    const parts = fullPath.split('/')
    const domain = parts[0]
    const exportName = parts[parts.length - 1]
    const existing = domainMap.get(domain) ?? []
    domainMap.set(domain, [...existing, exportName])
  }

  return Array.from(domainMap.entries()).map(([domain, actions]) => ({
    domain,
    importCount: actions.length,
    serverActions: actions,
  }))
}

function extractComponentImports(content: string): { name: string; path: string }[] {
  const components: { name: string; path: string }[] = []
  const pattern = /from\s+['"](@\/components\/[\w/-]+)['"]/g
  let match
  while ((match = pattern.exec(content)) !== null) {
    const importPath = match[1]
    const name = importPath.split('/').pop() ?? importPath
    components.push({ name, path: importPath })
  }
  return components
}

function countServerActionImports(content: string): number {
  // Heuristic: count imports from files that likely export server actions
  const pattern = /from\s+['"]@\/lib\/[\w/-]*(?:actions|mutations|queries)[\w/-]*['"]/g
  const matches = content.match(pattern)
  return matches?.length ?? 0
}

interface PageFile {
  path: string
  route: string
}

async function collectPageFiles(dir: string): Promise<PageFile[]> {
  const pages: PageFile[] = []
  await walkDir(dir, async (filePath) => {
    if (path.basename(filePath) === 'page.tsx') {
      const relative = filePath
        .replace(APP_ROOT, '')
        .replace(/\\/g, '/')
        .replace(/^\/\([^)]+\)/, '') // strip route groups
        .replace(/\/page\.tsx$/, '')
      pages.push({ path: filePath, route: relative || '/' })
    }
  })
  return pages
}

async function walkDir(dir: string, callback: (filePath: string) => Promise<void>): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walkDir(fullPath, callback)
        } else {
          await callback(fullPath)
        }
      })
    )
  } catch {
    // Non-fatal
  }
}
