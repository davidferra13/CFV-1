// Complexity level presets for progressive disclosure.
// Controls which nav groups and routes are visible based on chef experience.
// All routes remain accessible via direct URL regardless of level.

export type ComplexityLevel = 'starter' | 'standard' | 'pro'

export type ComplexityPreset = {
  level: ComplexityLevel
  label: string
  description: string
  /** Nav group IDs visible at this level */
  visibleNavGroups: string[]
  /** Route prefixes visible in nav at this level */
  visibleRoutes: string[]
}

export const COMPLEXITY_PRESETS: Record<ComplexityLevel, ComplexityPreset> = {
  starter: {
    level: 'starter',
    label: 'Solo Chef',
    description:
      'Just the essentials: dashboard, events, clients, recipes, and finance. Perfect for getting started.',
    visibleNavGroups: ['pipeline', 'events', 'clients', 'culinary'],
    visibleRoutes: [
      '/dashboard',
      '/events',
      '/clients',
      '/recipes',
      '/culinary',
      '/finance',
      '/menus',
      '/inquiries',
      '/settings',
    ],
  },
  standard: {
    level: 'standard',
    label: 'Growing Chef',
    description:
      'Core tools plus calendar, inbox, menus, quotes, communication, and circles. For chefs building their client base.',
    visibleNavGroups: [
      'pipeline',
      'events',
      'clients',
      'culinary',
      'finance',
      'operations',
      'commerce',
    ],
    visibleRoutes: [
      '/dashboard',
      '/events',
      '/clients',
      '/recipes',
      '/culinary',
      '/finance',
      '/menus',
      '/inquiries',
      '/calendar',
      '/inbox',
      '/quotes',
      '/circles',
      '/communication',
      '/contracts',
      '/settings',
    ],
  },
  pro: {
    level: 'pro',
    label: 'Full Access',
    description:
      'Everything visible. Analytics, marketing, supply chain, protection, and all advanced tools.',
    visibleNavGroups: [], // empty = show all
    visibleRoutes: [], // empty = show all
  },
}

export const COMPLEXITY_LEVELS: ComplexityLevel[] = ['starter', 'standard', 'pro']

export function getComplexityPreset(level: ComplexityLevel): ComplexityPreset {
  return COMPLEXITY_PRESETS[level]
}

/** Returns true if a route should be visible at the given complexity level */
export function isRouteVisibleAtLevel(route: string, level: ComplexityLevel): boolean {
  if (level === 'pro') return true
  const preset = COMPLEXITY_PRESETS[level]
  return preset.visibleRoutes.some((prefix) => route === prefix || route.startsWith(prefix + '/'))
}

/** Returns true if a nav group should be visible at the given complexity level */
export function isNavGroupVisibleAtLevel(groupId: string, level: ComplexityLevel): boolean {
  if (level === 'pro') return true
  const preset = COMPLEXITY_PRESETS[level]
  return preset.visibleNavGroups.includes(groupId)
}
