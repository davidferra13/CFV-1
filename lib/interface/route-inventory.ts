import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  isAdminRoutePath,
  isChefRoutePath,
  isClientRoutePath,
  isPartnerRoutePath,
  isPublicUnauthenticatedPath,
  isStaffRoutePath,
} from '@/lib/auth/route-policy'

export type CoverageRole = 'public' | 'chef' | 'client' | 'admin' | 'staff' | 'partner'

export type PageRouteEntry = {
  filePath: string
  isDynamic: boolean
  role: CoverageRole
  route: string | null
  template: string
  segments: string[]
}

export type StaticPageRouteEntry = PageRouteEntry & {
  isDynamic: false
  route: string
}

export type DynamicPageRouteEntry = PageRouteEntry & {
  isDynamic: true
  route: null
}

export type CoverageSpecRegistryEntry = {
  completionSpecPaths: string[]
  manualSpecPaths: string[]
}

const APP_DIR = path.join(process.cwd(), 'app')
const PAGE_FILE_PATTERN = /^page\.(?:t|j)sx?$/
const ROUTE_GROUP_PATTERN = /^\(.+\)$/
const AUTH_ROUTE_PREFIX = '/auth'

export const COVERAGE_SPEC_REGISTRY: Record<CoverageRole, CoverageSpecRegistryEntry> = {
  public: {
    manualSpecPaths: ['tests/coverage/01-public-routes.spec.ts'],
    completionSpecPaths: ['tests/coverage/07-public-static-inventory.spec.ts'],
  },
  chef: {
    manualSpecPaths: ['tests/coverage/02-chef-routes.spec.ts'],
    completionSpecPaths: ['tests/coverage/08-chef-static-inventory.spec.ts'],
  },
  client: {
    manualSpecPaths: ['tests/coverage/03-client-routes.spec.ts'],
    completionSpecPaths: ['tests/coverage/09-client-static-inventory.spec.ts'],
  },
  admin: {
    manualSpecPaths: ['tests/coverage/04-admin-routes.spec.ts'],
    completionSpecPaths: ['tests/coverage/10-admin-static-inventory.spec.ts'],
  },
  staff: {
    manualSpecPaths: [],
    completionSpecPaths: ['tests/coverage/11-staff-routes.spec.ts'],
  },
  partner: {
    manualSpecPaths: [],
    completionSpecPaths: ['tests/coverage/12-partner-routes.spec.ts'],
  },
}

let cachedPageRouteEntries: PageRouteEntry[] | null = null
const cachedCoveredRoutes = new Map<string, Set<string>>()

function isRouteGroupSegment(segment: string): boolean {
  return ROUTE_GROUP_PATTERN.test(segment)
}

function hasRouteGroup(segments: string[], group: string): boolean {
  return segments.includes(group)
}

function isDynamicRouteSegment(segment: string): boolean {
  return segment.includes('[') || segment.includes(']')
}

function normalizeRoute(route: string): string {
  if (!route || route === '/page') return '/'

  let normalized = route.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1)
  return normalized || '/'
}

function getVisibleSegments(segments: string[]): string[] {
  return segments.filter((segment) => !isRouteGroupSegment(segment))
}

function routeTemplateFromSegments(segments: string[]): string {
  const visibleSegments = getVisibleSegments(segments)
  if (visibleSegments.length === 0) return '/'
  return normalizeRoute(`/${visibleSegments.join('/')}`)
}

function routeFromSegments(segments: string[]): string | null {
  const visibleSegments = getVisibleSegments(segments)
  if (visibleSegments.some(isDynamicRouteSegment)) return null
  if (visibleSegments.length === 0) return '/'
  return normalizeRoute(`/${visibleSegments.join('/')}`)
}

function classifyCoverageRole(route: string, segments: string[]): CoverageRole {
  if (
    route === AUTH_ROUTE_PREFIX ||
    route.startsWith(`${AUTH_ROUTE_PREFIX}/`) ||
    isPublicUnauthenticatedPath(route)
  ) {
    return 'public'
  }
  if (hasRouteGroup(segments, '(admin)') || isAdminRoutePath(route)) return 'admin'
  if (hasRouteGroup(segments, '(client)') || isClientRoutePath(route)) return 'client'
  if (hasRouteGroup(segments, '(staff)') || isStaffRoutePath(route)) return 'staff'
  if (hasRouteGroup(segments, '(partner)') || isPartnerRoutePath(route)) return 'partner'
  if (hasRouteGroup(segments, '(chef)') || isChefRoutePath(route)) return 'chef'
  return 'public'
}

function walkPageRoutes(currentDir: string, segments: string[], entries: PageRouteEntry[]) {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const nextPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      walkPageRoutes(nextPath, [...segments, entry.name], entries)
      continue
    }

    if (!entry.isFile() || !PAGE_FILE_PATTERN.test(entry.name)) continue

    const template = routeTemplateFromSegments(segments)
    const route = routeFromSegments(segments)
    const isDynamic = route === null

    entries.push({
      filePath: nextPath,
      isDynamic,
      role: classifyCoverageRole(route ?? template, segments),
      route,
      template,
      segments: [...segments],
    })
  }
}

export function discoverPageRouteEntriesInAppDir(appDir: string): PageRouteEntry[] {
  if (!existsSync(appDir)) return []
  const entries: PageRouteEntry[] = []
  walkPageRoutes(appDir, [], entries)

  return entries.sort((left, right) => {
    if (left.role !== right.role) return left.role.localeCompare(right.role)
    if (left.template !== right.template) return left.template.localeCompare(right.template)
    return left.filePath.localeCompare(right.filePath)
  })
}

function buildPageRouteEntries(): PageRouteEntry[] {
  return discoverPageRouteEntriesInAppDir(APP_DIR)
}

function extractRouteToken(title: string): string | null {
  const match = title.trim().match(/^\/\S*/)
  return match ? normalizeRoute(match[0]) : null
}

function readCoveredRoutesFromSpec(specPath: string): Set<string> {
  const routes = new Set<string>()
  const absolutePath = path.join(process.cwd(), specPath)
  const source = readFileSync(absolutePath, 'utf8')

  const titleMatches = source.matchAll(/test(?:\.(?:skip|only|fixme))?\(\s*(['"`])([^'"`]+)\1/g)
  for (const match of titleMatches) {
    const route = extractRouteToken(match[2])
    if (route) routes.add(route)
  }

  return routes
}

function getCoveredRoutesCacheKey(role: CoverageRole, mode: 'all' | 'manual') {
  return `${role}:${mode}`
}

export function getCoverageSpecPathsForRole(
  role: CoverageRole,
  mode: 'all' | 'manual' = 'all'
): string[] {
  const registryEntry = COVERAGE_SPEC_REGISTRY[role]
  const specPaths =
    mode === 'manual'
      ? registryEntry.manualSpecPaths
      : [...registryEntry.manualSpecPaths, ...registryEntry.completionSpecPaths]

  return [...new Set(specPaths)]
}

export function getPageRouteEntries(): PageRouteEntry[] {
  if (!cachedPageRouteEntries) {
    cachedPageRouteEntries = buildPageRouteEntries()
  }

  return cachedPageRouteEntries
}

export function getPageRouteEntriesForRole(role: CoverageRole): PageRouteEntry[] {
  return getPageRouteEntries().filter((entry) => entry.role === role)
}

export function getDynamicPageRouteEntries(): DynamicPageRouteEntry[] {
  return getPageRouteEntries().filter((entry): entry is DynamicPageRouteEntry => entry.isDynamic)
}

export function getDynamicPageRouteEntriesForRole(role: CoverageRole): DynamicPageRouteEntry[] {
  return getDynamicPageRouteEntries().filter((entry) => entry.role === role)
}

export function getStaticPageRouteEntries(): StaticPageRouteEntry[] {
  return getPageRouteEntries().filter((entry): entry is StaticPageRouteEntry => !entry.isDynamic)
}

export function getStaticPageRouteEntriesForRole(role: CoverageRole): StaticPageRouteEntry[] {
  return getStaticPageRouteEntries().filter((entry) => entry.role === role)
}

export function getStaticPageRoutesForRole(role: CoverageRole): string[] {
  return [...new Set(getStaticPageRouteEntriesForRole(role).map((entry) => entry.route))].sort(
    (left, right) => left.localeCompare(right)
  )
}

export function getCoveredRoutesForRole(
  role: CoverageRole,
  mode: 'all' | 'manual' = 'all'
): Set<string> {
  const cacheKey = getCoveredRoutesCacheKey(role, mode)
  const cached = cachedCoveredRoutes.get(cacheKey)
  if (cached) return cached

  const routes = new Set<string>()
  for (const specPath of getCoverageSpecPathsForRole(role, mode)) {
    for (const route of readCoveredRoutesFromSpec(specPath)) {
      routes.add(route)
    }
  }

  cachedCoveredRoutes.set(cacheKey, routes)
  return routes
}

export function getManuallyCoveredRoutesForRole(role: CoverageRole): Set<string> {
  return getCoveredRoutesForRole(role, 'manual')
}

export function getUncoveredStaticPageRoutesForRole(role: CoverageRole): string[] {
  const staticRoutes = getStaticPageRoutesForRole(role)
  const manuallyCoveredRoutes = getManuallyCoveredRoutesForRole(role)
  return staticRoutes.filter((route) => !manuallyCoveredRoutes.has(route))
}

export function getStaticCoverageGapsForRole(role: CoverageRole): string[] {
  const completionSpecPaths = COVERAGE_SPEC_REGISTRY[role].completionSpecPaths
  if (
    completionSpecPaths.length > 0 &&
    completionSpecPaths.every((specPath) => existsSync(path.join(process.cwd(), specPath)))
  ) {
    return []
  }

  const staticRoutes = getStaticPageRoutesForRole(role)
  const manuallyCoveredRoutes = getManuallyCoveredRoutesForRole(role)
  return staticRoutes.filter((route) => !manuallyCoveredRoutes.has(route))
}

export function getRoutePolicyGapsForRole(role: CoverageRole): string[] {
  const staticRoutes = getStaticPageRoutesForRole(role)

  switch (role) {
    case 'public':
      return staticRoutes.filter((route) => route !== '/' && !isPublicUnauthenticatedPath(route))
    case 'chef':
      return staticRoutes.filter(
        (route) => !isChefRoutePath(route) && !isPublicUnauthenticatedPath(route)
      )
    case 'client':
      return staticRoutes.filter((route) => !isClientRoutePath(route))
    case 'admin':
      return staticRoutes.filter((route) => !isAdminRoutePath(route))
    case 'staff':
      return staticRoutes.filter((route) => !isStaffRoutePath(route))
    case 'partner':
      return staticRoutes.filter((route) => !isPartnerRoutePath(route))
    default:
      return []
  }
}

export function hasUsableStorageState(storageStatePath: string): boolean {
  try {
    const absolutePath = path.join(process.cwd(), storageStatePath)
    const raw = readFileSync(absolutePath, 'utf8')
    const state = JSON.parse(raw) as { cookies?: unknown[] }
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

const routeInventory = {
  discoverPageRouteEntriesInAppDir,
  getCoverageSpecPathsForRole,
  getCoveredRoutesForRole,
  getDynamicPageRouteEntries,
  getDynamicPageRouteEntriesForRole,
  getManuallyCoveredRoutesForRole,
  getPageRouteEntries,
  getPageRouteEntriesForRole,
  getRoutePolicyGapsForRole,
  getStaticCoverageGapsForRole,
  getStaticPageRouteEntries,
  getStaticPageRouteEntriesForRole,
  getStaticPageRoutesForRole,
  getUncoveredStaticPageRoutesForRole,
  hasUsableStorageState,
}

export default routeInventory
