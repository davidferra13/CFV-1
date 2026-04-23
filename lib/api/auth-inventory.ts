import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { API_SKIP_AUTH_PREFIXES } from '@/lib/auth/route-policy'

export type ApiRouteAuthClassification =
  | 'standard-auth'
  | 'allowlisted-no-standard-auth'
  | 'unknown-no-standard-auth'

export type ApiRouteAuthEntry = {
  classification: ApiRouteAuthClassification
  filePath: string
  hasAlternativeAuth: boolean
  hasStandardAuth: boolean
  relativeFilePath: string
  routePath: string
  urlPath: string
}

export type ApiRouteAuthInventory = {
  alternativeAuthCount: number
  entries: ApiRouteAuthEntry[]
  knownNoStandardAuthCount: number
  protectedRouteRatio: number
  standardAuthCount: number
  totalRoutes: number
  unknownNoStandardAuthRoutes: string[]
}

export const API_AUTH_GUARDS = [
  'requireChef',
  'requireClient',
  'requireAdmin',
  'requireAuth',
  'requirePartner',
  'requireStaff',
  'withApiGuard',
  'getCurrentUser(',
  'getServerSession',
  'isAdmin(',
  'auth(',
] as const

export const API_AUTH_ALTERNATIVE_PATTERNS = [
  'validateToken',
  'verifyToken',
  'token',
  'signature',
  'validateSignature',
  'verifySignature',
  'Twilio',
  'twilio',
  'stripe',
  'NODE_ENV',
  'process.env',
] as const

export const API_NO_STANDARD_AUTH_ALLOWLIST_EXTRAS = [
  'activity',
  'admin',
  'ai',
  'booking',
  'calling',
  'cannabis',
  'chefs/parse-search',
  'comms',
  'discover',
  'features',
  'hub',
  'ical',
  'integrations',
  'openclaw',
  'prospecting',
  'public',
  'push',
  'quick-notes',
  'remy',
  'scheduling',
  'social',
  'stripe',
  'survey',
] as const

export const MIN_PROTECTED_API_ROUTE_RATIO = 0.1

function normalizeAllowlistPattern(value: string) {
  return value.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '')
}

function matchesPathOrChild(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

function walkApiRouteFiles(dir: string, results: string[]) {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walkApiRouteFiles(full, results)
      continue
    }

    if (entry.isFile() && entry.name === 'route.ts') {
      results.push(full)
    }
  }
}

export const API_NO_STANDARD_AUTH_ALLOWLIST = [
  ...new Set([
    ...API_SKIP_AUTH_PREFIXES.map(normalizeAllowlistPattern),
    ...API_NO_STANDARD_AUTH_ALLOWLIST_EXTRAS,
  ]),
].sort()

export function discoverApiRouteFiles(rootDir = process.cwd()): string[] {
  const apiDir = resolve(rootDir, 'app/api')
  const routeFiles: string[] = []
  walkApiRouteFiles(apiDir, routeFiles)
  return routeFiles.sort()
}

export function hasApiAuthGuard(source: string): boolean {
  return API_AUTH_GUARDS.some((guard) => source.includes(guard))
}

export function hasAlternativeApiAuth(source: string): boolean {
  return API_AUTH_ALTERNATIVE_PATTERNS.some((pattern) => source.includes(pattern))
}

export function isKnownNoStandardAuthRoute(routePath: string): boolean {
  return API_NO_STANDARD_AUTH_ALLOWLIST.some((pattern) => matchesPathOrChild(routePath, pattern))
}

export function buildApiRouteAuthInventory(rootDir = process.cwd()): ApiRouteAuthInventory {
  const apiDir = resolve(rootDir, 'app/api')
  const entries = discoverApiRouteFiles(rootDir).map((filePath) => {
    const relativeFilePath = relative(apiDir, filePath).replace(/\\/g, '/')
    const routePath = relativeFilePath.replace(/\/route\.ts$/, '')
    const source = readFileSync(filePath, 'utf8')
    const hasStandardAuth = hasApiAuthGuard(source)
    const hasAlternativeAuth = !hasStandardAuth && hasAlternativeApiAuth(source)
    const classification: ApiRouteAuthClassification = hasStandardAuth
      ? 'standard-auth'
      : isKnownNoStandardAuthRoute(routePath)
        ? 'allowlisted-no-standard-auth'
        : 'unknown-no-standard-auth'

    return {
      classification,
      filePath,
      hasAlternativeAuth,
      hasStandardAuth,
      relativeFilePath,
      routePath,
      urlPath: `/api/${routePath}`,
    }
  })

  const standardAuthCount = entries.filter((entry) => entry.hasStandardAuth).length
  const alternativeAuthCount = entries.filter((entry) => entry.hasAlternativeAuth).length
  const knownNoStandardAuthCount = entries.filter(
    (entry) => entry.classification === 'allowlisted-no-standard-auth'
  ).length
  const unknownNoStandardAuthRoutes = entries
    .filter((entry) => entry.classification === 'unknown-no-standard-auth')
    .map((entry) => entry.relativeFilePath)
  const protectedRouteRatio =
    entries.length === 0 ? 0 : (standardAuthCount + alternativeAuthCount) / entries.length

  return {
    alternativeAuthCount,
    entries,
    knownNoStandardAuthCount,
    protectedRouteRatio,
    standardAuthCount,
    totalRoutes: entries.length,
    unknownNoStandardAuthRoutes,
  }
}
