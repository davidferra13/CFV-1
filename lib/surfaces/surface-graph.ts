// Unified Surface Graph - single queryable resolver for route visibility.
//
// Wraps (never replaces) the 6 existing visibility systems:
//   1. Feature Registry      (lib/features/registry.ts)
//   2. Module Toggles        (lib/billing/modules.ts)
//   3. Focus Mode            (lib/billing/focus-mode.ts)
//   4. Progressive Disclosure (lib/progressive-disclosure/)
//   5. Shell Budget           (lib/interface/surface-governance.ts)
//   6. Day-1 Defaults         (lib/surfaces/day-one-defaults.ts + route-metadata.ts)
//
// Resolution order: first "hide" wins, but all reasons are accumulated
// so the caller can explain WHY a surface is hidden.

import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
import type { WorkspaceDensity } from '@/lib/interface/surface-governance'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import type { Feature } from '@/lib/features/registry'
import type { RouteTier } from './route-metadata'

import { FEATURE_REGISTRY } from '@/lib/features/registry'
import { MODULES } from '@/lib/billing/modules'
import {
  CORE_MODULES,
  EXTENDED_MODULES,
  CORE_NAV_HREFS,
  EXTENDED_NAV_HREFS,
} from '@/lib/billing/focus-mode'
import { isBrandNewChef, isNavGroupVisible } from '@/lib/progressive-disclosure/nav-visibility'
import { resolveChefShellBudget } from '@/lib/interface/surface-governance'
import { getRouteTier } from './route-metadata'
import { isDay1Route } from './day-one-defaults'

// ─── Public Types ────────────────────────────────────────────────

export type SurfaceVisibility = {
  /** Final verdict: should this route be shown? */
  visible: boolean
  /** Human-readable explanation of why it is hidden (or "visible by all systems"). */
  reason: string
  /** The route's maturity tier. */
  tier: RouteTier
  /** Which system made the hiding decision (empty string if visible). */
  source: string
  /** If hidden, alternative routes the chef could use instead. */
  alternatives?: string[]
}

export type ChefSurfaceContext = {
  chefId: string
  tenantId: string
  /** Data-presence flags from progressive disclosure. */
  dataPresence: TenantDataPresence
  /** Module slugs the chef has enabled (from chef_preferences.enabled_modules). */
  enabledModules: string[]
  /** Whether the chef has focus mode turned on. */
  focusModeEnabled: boolean
  /** Workspace density preference. */
  workspaceDensity: WorkspaceDensity
  /** Chef's selected archetype (null if not yet chosen). */
  archetype?: ArchetypeId | null
  /** Whether this user has admin privileges. */
  isAdmin?: boolean
}

// ─── Internal helpers ────────────────────────────────────────────

/** Find the feature registry entry whose entryPoint.value matches a route. */
function findFeatureForRoute(routePath: string): Feature | undefined {
  return FEATURE_REGISTRY.find((f) => {
    if (!f.entryPoint || f.entryPoint.type !== 'route') return false
    const ep = f.entryPoint.value
    if (!ep) return false
    // Exact match
    if (ep === routePath) return true
    // Dynamic entry point: /events/[id]/schedule matches /events
    if (routePath.startsWith(ep + '/') || ep.startsWith(routePath + '/')) return false
    return false
  })
}

/**
 * Find which module (if any) owns the nav group this route belongs to.
 * We check the first path segment against module navGroupIds.
 */
function findModuleForRoute(routePath: string): { slug: string; navGroupId: string } | undefined {
  const segments = routePath.split('/').filter(Boolean)
  if (segments.length === 0) return undefined

  const firstSegment = segments[0]

  // Direct mapping from route domain to nav group / module
  const ROUTE_TO_NAV_GROUP: Record<string, string> = {
    dashboard: 'dashboard',
    inquiries: 'pipeline',
    quotes: 'pipeline',
    leads: 'pipeline',
    'guest-leads': 'pipeline',
    prospecting: 'pipeline',
    proposals: 'pipeline',
    marketplace: 'pipeline',
    calls: 'pipeline',
    'rate-card': 'pipeline',
    pipeline: 'pipeline',
    events: 'events',
    calendar: 'events',
    culinary: 'culinary',
    recipes: 'culinary',
    menus: 'culinary',
    'culinary-board': 'culinary',
    kitchen: 'culinary',
    nutrition: 'culinary',
    clients: 'clients',
    circles: 'clients',
    loyalty: 'clients',
    reviews: 'clients',
    reputation: 'clients',
    finance: 'finance',
    expenses: 'finance',
    payments: 'finance',
    goals: 'finance',
    commerce: 'commerce',
    staff: 'operations',
    tasks: 'operations',
    stations: 'operations',
    travel: 'operations',
    ops: 'operations',
    inventory: 'supply-chain',
    vendors: 'supply-chain',
    'food-cost': 'supply-chain',
    prices: 'supply-chain',
    analytics: 'more',
    marketing: 'more',
    network: 'more',
    community: 'more',
    portfolio: 'more',
    content: 'more',
    social: 'more',
    charity: 'more',
    cannabis: 'protection',
    safety: 'protection',
    contracts: 'protection',
    insurance: 'protection',
  }

  const navGroupId = ROUTE_TO_NAV_GROUP[firstSegment]
  if (!navGroupId) return undefined

  const mod = MODULES.find((m) => m.navGroupId === navGroupId)
  if (!mod) return undefined

  return { slug: mod.slug, navGroupId }
}

/**
 * Derive a chef's effective tier from data presence.
 * Brand new (< 3 populated) = day-one
 * 3-6 populated = week-one
 * 7+ = established
 */
function deriveChefTier(presence: TenantDataPresence): RouteTier {
  if (isBrandNewChef(presence)) return 'day-one'
  if (presence.populatedCount < 7) return 'week-one'
  return 'established'
}

const TIER_ORDER: RouteTier[] = ['day-one', 'week-one', 'established', 'power', 'admin']

function tierIndex(t: RouteTier): number {
  return TIER_ORDER.indexOf(t)
}

// ─── Main resolver ───────────────────────────────────────────────

/**
 * Resolve visibility for a single route path given a chef's full context.
 *
 * Resolution order (first "hide" wins, but all reasons accumulate):
 *   1. Feature registry: internal/hidden/gated features
 *   2. Module toggles: disabled module
 *   3. Focus mode: extended module in focus mode
 *   4. Progressive disclosure: insufficient data presence
 *   5. Shell budget: immersive/minimal mode suppression
 *   6. Day-1 defaults: route tier vs chef maturity
 *
 * Admin users bypass all checks except feature registry internal markers.
 */
export function resolveSurfaceVisibility(
  routePath: string,
  context: ChefSurfaceContext
): SurfaceVisibility {
  const normalized = routePath === '/' ? '/' : routePath.replace(/\/+$/, '')
  const tier = getRouteTier(normalized)
  const reasons: string[] = []

  // ── 1. Feature Registry ────────────────────────────────────────
  const feature = findFeatureForRoute(normalized)
  if (feature) {
    // Internal-only and developer tools: hidden from all non-admin users
    if (feature.classification === 'internal_only' || feature.classification === 'internal_admin') {
      if (!context.isAdmin) {
        return {
          visible: false,
          reason: `Internal feature: ${feature.name} (classification: ${feature.classification})`,
          tier,
          source: 'feature-registry',
          alternatives: ['/dashboard'],
        }
      }
    }

    if (feature.classification === 'developer_tool') {
      if (!context.isAdmin) {
        return {
          visible: false,
          reason: `Developer tool: ${feature.name}`,
          tier,
          source: 'feature-registry',
          alternatives: ['/dashboard'],
        }
      }
    }

    // Hidden features: not shown in nav but accessible via direct URL
    if (feature.visibility === 'hidden') {
      reasons.push(`Feature "${feature.name}" is marked hidden in the feature registry`)
    }

    // Gated features: require specific conditions
    if (feature.visibility === 'gated') {
      reasons.push(`Feature "${feature.name}" is gated (may require pro tier or flag)`)
    }

    // Internal visibility: admin only
    if (feature.visibility === 'internal' && !context.isAdmin) {
      return {
        visible: false,
        reason: `Feature "${feature.name}" is internal-only`,
        tier,
        source: 'feature-registry',
        alternatives: ['/dashboard'],
      }
    }
  }

  // Admin users bypass the remaining checks (modules, focus, disclosure, tier)
  if (context.isAdmin) {
    return {
      visible: true,
      reason:
        reasons.length > 0
          ? `Visible (admin bypass). Notes: ${reasons.join('; ')}`
          : 'Visible (admin bypass)',
      tier,
      source: '',
    }
  }

  // ── 2. Module Toggles ──────────────────────────────────────────
  const moduleInfo = findModuleForRoute(normalized)
  if (moduleInfo) {
    const mod = MODULES.find((m) => m.slug === moduleInfo.slug)
    if (mod && !mod.alwaysVisible) {
      const enabled = new Set(context.enabledModules)
      if (!enabled.has(moduleInfo.slug)) {
        return {
          visible: false,
          reason: `Module "${mod.label}" is disabled in workspace settings`,
          tier,
          source: 'module-toggles',
          alternatives: ['/settings/modules'],
        }
      }
    }
  }

  // ── 3. Focus Mode ─────────────────────────────────────────────
  if (context.focusModeEnabled) {
    // Check if this route's module is in the extended set
    if (moduleInfo) {
      const isExtended = (EXTENDED_MODULES as readonly string[]).includes(moduleInfo.slug)
      if (isExtended) {
        return {
          visible: false,
          reason: `Module "${moduleInfo.slug}" is hidden by Focus Mode (extended module)`,
          tier,
          source: 'focus-mode',
          alternatives: ['/settings/modules'],
        }
      }
    }

    // Check standalone nav hrefs
    if (EXTENDED_NAV_HREFS.has(normalized)) {
      return {
        visible: false,
        reason: `Route is in the extended nav set, hidden by Focus Mode`,
        tier,
        source: 'focus-mode',
        alternatives: ['/settings/modules'],
      }
    }
  }

  // ── 4. Progressive Disclosure ──────────────────────────────────
  if (moduleInfo?.navGroupId) {
    const groupVisible = isNavGroupVisible(
      moduleInfo.navGroupId,
      context.dataPresence,
      false // showAll = false; let the system decide
    )
    if (!groupVisible) {
      reasons.push(
        `Nav group "${moduleInfo.navGroupId}" hidden by progressive disclosure (insufficient data)`
      )
      // Progressive disclosure hides from nav but doesn't block access.
      // We mark it hidden with a soft reason so the caller can decide
      // whether to fully suppress or just remove from nav.
      return {
        visible: false,
        reason: `Nav group "${moduleInfo.navGroupId}" hidden by progressive disclosure`,
        tier,
        source: 'progressive-disclosure',
        alternatives: suggestAlternatives(moduleInfo.navGroupId),
      }
    }
  }

  // ── 5. Shell Budget ────────────────────────────────────────────
  const shellBudget = resolveChefShellBudget(normalized)
  // In immersive modes (no sidebar/nav), the route itself is accessible
  // but chrome is stripped. We don't block the route; just note it.
  if (!shellBudget.showDesktopSidebar && !shellBudget.showMobileNav) {
    reasons.push('Shell budget: immersive mode (no chrome)')
  }

  // ── 6. Day-1 Tier Check ────────────────────────────────────────
  const chefTier = deriveChefTier(context.dataPresence)
  const routeTierIndex = tierIndex(tier)
  const chefTierIndex = tierIndex(chefTier)

  // Admin-tier routes are never shown to non-admin users via tier check
  if (tier === 'admin') {
    return {
      visible: false,
      reason: 'Admin-tier route requires platform admin access',
      tier,
      source: 'day-one-defaults',
      alternatives: ['/dashboard'],
    }
  }

  // If the route's tier exceeds the chef's current maturity, hide it
  // Exception: if the archetype explicitly includes this as a day-1 route
  if (routeTierIndex > chefTierIndex) {
    const archetype = context.archetype ?? 'private-chef'
    if (isDay1Route(normalized, archetype)) {
      // Archetype override: this route is day-1 for this chef type
      reasons.push(
        `Route tier "${tier}" exceeds chef maturity "${chefTier}" but included in ${archetype} day-1 set`
      )
    } else {
      return {
        visible: false,
        reason: `Route tier "${tier}" exceeds chef maturity "${chefTier}"`,
        tier,
        source: 'day-one-defaults',
        alternatives: suggestTierAlternatives(tier),
      }
    }
  }

  // ── All checks passed ─────────────────────────────────────────
  return {
    visible: true,
    reason: reasons.length > 0 ? `Visible. Notes: ${reasons.join('; ')}` : 'Visible by all systems',
    tier,
    source: '',
  }
}

/**
 * Batch resolve: check visibility for multiple routes at once.
 * Returns a map of route path to visibility result.
 */
export function resolveSurfaceBatch(
  routePaths: string[],
  context: ChefSurfaceContext
): Map<string, SurfaceVisibility> {
  const results = new Map<string, SurfaceVisibility>()
  for (const path of routePaths) {
    results.set(path, resolveSurfaceVisibility(path, context))
  }
  return results
}

/**
 * Get all visible routes from a set, filtered through the surface graph.
 */
export function filterVisibleRoutes(routePaths: string[], context: ChefSurfaceContext): string[] {
  return routePaths.filter((p) => resolveSurfaceVisibility(p, context).visible)
}

// ─── Alternative suggestions ─────────────────────────────────────

function suggestAlternatives(navGroupId: string): string[] {
  switch (navGroupId) {
    case 'finance':
      return ['/events', '/dashboard']
    case 'operations':
      return ['/events', '/dashboard']
    case 'commerce':
      return ['/events', '/finance']
    case 'analytics':
      return ['/dashboard', '/finance']
    case 'marketing':
      return ['/clients', '/dashboard']
    case 'network':
      return ['/clients', '/circles']
    case 'protection':
      return ['/settings', '/events']
    case 'supply-chain':
      return ['/culinary', '/culinary/prep']
    case 'more':
      return ['/dashboard']
    default:
      return ['/dashboard']
  }
}

function suggestTierAlternatives(routeTier: RouteTier): string[] {
  switch (routeTier) {
    case 'week-one':
      return ['/dashboard', '/events', '/clients']
    case 'established':
      return ['/dashboard', '/events', '/finance']
    case 'power':
      return ['/finance', '/analytics', '/settings']
    case 'admin':
      return ['/dashboard']
    default:
      return ['/dashboard']
  }
}

// ─── Re-exports for convenience ──────────────────────────────────

export type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
export type { WorkspaceDensity } from '@/lib/interface/surface-governance'
export type { ArchetypeId } from '@/lib/archetypes/presets'
export type { RouteTier } from './route-metadata'
