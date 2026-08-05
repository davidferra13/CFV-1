// Tier-aware route classification for the wiring audit.
// Source of tier truth: lib/navigation/ia-tier-map.json (keyed by top-level
// chef section slug). Reachability contract per the rescue blueprint S4.8:
//   tier 0/1 and untagged: need nav refs (legacy WEAK/ORPHAN rules)
//   tier 2: a registered module slug in lib/billing/modules.ts counts as a
//           gallery path, so the route is WIRED
//   tier 3/4: any single reference suffices
//   allowlisted routes are ALLOWED and never fail the firewall

export function tierForRoute(route, tierMap) {
  const segment = String(route).split('/').filter(Boolean)[0]
  if (!segment) return null
  const entry = tierMap[segment]
  return entry ? { tier: entry.tier, module: entry.module } : null
}

export function classifyRouteStatus({
  route,
  refCount,
  navRefs,
  tierEntry,
  allowlist,
  moduleSlugs,
  isMiddlewareWired,
}) {
  if (allowlist && allowlist.has(route)) return 'ALLOWED'

  const tier = tierEntry ? tierEntry.tier : null

  if (tier === 2 && tierEntry.module && moduleSlugs && moduleSlugs.has(tierEntry.module)) {
    return 'WIRED'
  }
  if ((tier === 3 || tier === 4) && refCount >= 1) {
    return 'WIRED'
  }

  // Legacy rules (mirrors the pre-retool logic in wiring-audit.mjs)
  if (refCount === 0) return 'ORPHAN'
  if (refCount === 1 && navRefs === 0) {
    return isMiddlewareWired ? 'WIRED' : 'WEAK'
  }
  return 'WIRED'
}
