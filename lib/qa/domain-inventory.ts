/**
 * Domain Inventory Utilities
 *
 * Pure functions for computing domain health metrics from the lib/ directory.
 * Used by QA validation surfaces to provide contextual domain information.
 *
 * NOT a server action file. Imported by build scripts and QA tools.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type DomainHealthStatus = 'healthy' | 'needs-tests' | 'needs-types' | 'at-risk'

export type DomainEntry = {
  name: string
  fileCount: number
  hasTests: boolean
  hasTypes: boolean
  exportCount: number
  dependencies: string[]
  status: DomainHealthStatus
}

export type DomainInventorySummary = {
  totalDomains: number
  totalFiles: number
  domainsWithTests: number
  domainsWithoutTests: number
  domainsWithTypes: number
  healthyDomains: number
  atRiskDomains: number
}

// ── Health Classification ──────────────────────────────────────────────────

export function classifyDomainHealth(entry: {
  fileCount: number
  hasTests: boolean
  hasTypes: boolean
  exportCount: number
}): DomainHealthStatus {
  // At-risk: large domain with no tests
  if (entry.fileCount >= 10 && !entry.hasTests) return 'at-risk'
  // Needs tests: any domain without tests
  if (!entry.hasTests) return 'needs-tests'
  // Needs types: domain without type definitions
  if (!entry.hasTypes && entry.exportCount > 5) return 'needs-types'
  return 'healthy'
}

export function computeInventorySummary(domains: DomainEntry[]): DomainInventorySummary {
  return {
    totalDomains: domains.length,
    totalFiles: domains.reduce((sum, d) => sum + d.fileCount, 0),
    domainsWithTests: domains.filter((d) => d.hasTests).length,
    domainsWithoutTests: domains.filter((d) => !d.hasTests).length,
    domainsWithTypes: domains.filter((d) => d.hasTypes).length,
    healthyDomains: domains.filter((d) => d.status === 'healthy').length,
    atRiskDomains: domains.filter((d) => d.status === 'at-risk').length,
  }
}

// ── Critical Domain List ───────────────────────────────────────────────────

/** Domains that handle money, auth, or safety. Must have tests. */
export const CRITICAL_DOMAINS = [
  'auth',
  'ledger',
  'pricing',
  'quotes',
  'invoices',
  'finance',
  'events',
  'dietary',
  'menus',
  'recipes',
  'clients',
  'inquiries',
  'compliance',
] as const

export type CriticalDomain = (typeof CRITICAL_DOMAINS)[number]

export function isCriticalDomain(name: string): boolean {
  return (CRITICAL_DOMAINS as readonly string[]).includes(name)
}

// ── Dependency Detection ───────────────────────────────────────────────────

/**
 * Extract domain dependencies from import statements.
 * Looks for patterns like: from '@/lib/{domain}/' or from '../../{domain}/'
 */
export function extractDomainDependencies(importStatements: string[]): string[] {
  const deps = new Set<string>()
  for (const stmt of importStatements) {
    // Match @/lib/{domain} pattern
    const aliasMatch = stmt.match(/@\/lib\/([a-z0-9-]+)/)
    if (aliasMatch) deps.add(aliasMatch[1])

    // Match relative ../../{domain} pattern
    const relMatch = stmt.match(/\.\.\/([a-z0-9-]+)/)
    if (relMatch) deps.add(relMatch[1])
  }
  return Array.from(deps).sort()
}

/**
 * Detect potential circular dependencies between domains.
 * Returns pairs of domains that import each other.
 */
export function detectCircularDeps(
  domainDeps: Record<string, string[]>
): Array<[string, string]> {
  const circulars: Array<[string, string]> = []
  const checked = new Set<string>()

  for (const [domain, deps] of Object.entries(domainDeps)) {
    for (const dep of deps) {
      const pair = [domain, dep].sort().join('|')
      if (checked.has(pair)) continue
      checked.add(pair)

      if (domainDeps[dep]?.includes(domain)) {
        circulars.push([domain, dep])
      }
    }
  }

  return circulars
}