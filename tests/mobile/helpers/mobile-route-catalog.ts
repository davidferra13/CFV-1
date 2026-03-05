import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import type { SeedResult } from '../../helpers/e2e-seed'

export type MobileAuditRole = 'public' | 'chef' | 'client' | 'admin'

export type MobileAuditRoute = {
  role: MobileAuditRole
  path: string
  template: string
  sourceFile: string
}

type CoverageSource = {
  file: string
  role: MobileAuditRole
}

const COVERAGE_SOURCES: CoverageSource[] = [
  { file: 'tests/coverage/01-public-routes.spec.ts', role: 'public' },
  { file: 'tests/coverage/02-chef-routes.spec.ts', role: 'chef' },
  { file: 'tests/coverage/03-client-routes.spec.ts', role: 'client' },
  { file: 'tests/coverage/04-admin-routes.spec.ts', role: 'admin' },
]

function isLikelyRoute(template: string): boolean {
  if (!template.startsWith('/')) return false
  if (template.includes(' ')) return false
  if (template.includes('|')) return false
  if (template.includes('\\/')) return false
  if (template.includes('auth/signin') && template.includes('login')) return false
  if (/not-a-real/i.test(template)) return false
  if (/this-chef-does-not-exist/i.test(template)) return false
  return true
}

function valueAtPath(seedIds: SeedResult, path: string): string | null {
  const segments = path.split('.')
  let current: unknown = seedIds
  for (const segment of segments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return null
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return typeof current === 'string' ? current : null
}

function resolveTemplate(template: string, seedIds: SeedResult): string | null {
  let unresolved = false
  const resolved = template.replace(/\$\{([^}]+)\}/g, (_full, expr) => {
    const raw = String(expr).trim()
    const withoutPrefix = raw.startsWith('seedIds.') ? raw.slice('seedIds.'.length) : raw
    const value = valueAtPath(seedIds, withoutPrefix)
    if (!value) {
      unresolved = true
      return '__UNRESOLVED__'
    }
    return value
  })

  if (unresolved || resolved.includes('__UNRESOLVED__')) return null
  return resolved
}

function extractRouteTemplates(fileContent: string): string[] {
  const routes = new Set<string>()
  const patterns = [
    /assertPageLoads\(\s*page\s*,\s*(['"`])([^'"`]+)\1/g,
    /assertChefPageLoads\(\s*page\s*,\s*(['"`])([^'"`]+)\1/g,
    /assertClientPageLoads\(\s*page\s*,\s*(['"`])([^'"`]+)\1/g,
    /assertAdminPageLoads\(\s*page\s*,\s*(['"`])([^'"`]+)\1/g,
    /page\.goto\(\s*(['"`])([^'"`]+)\1/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(fileContent)
    while (match) {
      const route = match[2].trim()
      if (isLikelyRoute(route)) {
        routes.add(route)
      }
      match = pattern.exec(fileContent)
    }
  }

  return Array.from(routes)
}

export function buildMobileAuditRoutes(seedIds: SeedResult): MobileAuditRoute[] {
  const results: MobileAuditRoute[] = []
  const seen = new Set<string>()

  for (const source of COVERAGE_SOURCES) {
    const absolute = resolve(source.file)
    if (!existsSync(absolute)) continue

    const fileContent = readFileSync(absolute, 'utf-8')
    const templates = extractRouteTemplates(fileContent)

    for (const template of templates) {
      const path = resolveTemplate(template, seedIds)
      if (!path) continue
      const uniqueKey = `${source.role}:${path}`
      if (seen.has(uniqueKey)) continue
      seen.add(uniqueKey)
      results.push({
        role: source.role,
        path,
        template,
        sourceFile: source.file,
      })
    }
  }

  return results.sort((a, b) => {
    if (a.role !== b.role) return a.role.localeCompare(b.role)
    return a.path.localeCompare(b.path)
  })
}
