# Contextual Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a collapsible, per-page intelligence banner that surfaces contextual operational data across 8 categories, powered by the existing 42-resolver scoring pipeline.

**Architecture:** Layout-level server component reads pathname from `headers()`, matches a Rail Profile from a static registry, dispatches only the resolvers relevant to that page, and renders a collapsible banner between RailStrip and page content. Entity context (event ID, client ID, etc.) is extracted from the URL. Client component handles expand/collapse, SSE refresh, and inline actions.

**Tech Stack:** Next.js App Router (server components + `'use client'`), existing God Mode resolver pipeline (`lib/discovery/`), existing SSE channel (`'rail'`), Tailwind CSS, `cn()` utility.

**Design Spec:** `docs/superpowers/specs/2026-05-18-contextual-rail-design.md`

---

## Scope

This plan covers **Waves 1-3** (Foundation + Component Shell + Entity Scoping). This delivers the full working Contextual Rail on every page with entity-scoped intelligence on the 5 highest-value pages.

**Wave 4 (Polish)** and **Wave 5 (Parallel Routes)** are separate follow-up plans. They add hover popovers, inline actions, keyboard shortcuts, and the Phase 2 parallel route architecture. The system works without them.

---

## File Map

### New Files

| File                                          | Responsibility                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/discovery/contextual-rail-types.ts`      | RailProfile, RailCategory, EntityContext, CollapsedMetric, ContextualRailData types          |
| `lib/discovery/rail-profiles.ts`              | Static registry of 10 Rail Profiles with URL patterns and category configs                   |
| `lib/discovery/contextual-rail-assembly.ts`   | Orchestrator: match profile, filter resolvers, dispatch, score, group by category, cap items |
| `components/rail/contextual-rail-server.tsx`  | Server component: reads pathname, calls assembly, renders client component with data         |
| `components/rail/contextual-rail-client.tsx`  | Client component: expand/collapse, SSE refresh, renders CollapsedBar or ExpandedPanel        |
| `components/rail/collapsed-bar.tsx`           | One-line summary bar: readiness bar, metric chips, critical badge, toggle chevron            |
| `components/rail/expanded-panel.tsx`          | Multi-column panel with CategorySection per active category                                  |
| `components/rail/category-section.tsx`        | Single category column: header, list of RailIntelCards                                       |
| `components/rail/rail-intel-card.tsx`         | Individual intel item: icon, label, value, severity coloring, click action                   |
| `tests/unit/contextual-rail-profiles.test.ts` | Unit tests for profile matching and entity extraction                                        |
| `tests/unit/contextual-rail-assembly.test.ts` | Unit tests for assembly pipeline, resolver filtering, category grouping                      |

### Modified Files

| File                                                          | Change                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `lib/discovery/god-mode-types.ts`                             | Add `currentPage?` and `entityContext?` to `GodModeResolverContext` |
| `lib/discovery/rail-tier-assigner.ts`                         | Fix `currentPage: null` on line 144 to pass actual page             |
| `lib/discovery/god-mode-dispatcher.ts`                        | Add `dispatchFilteredResolvers()` that takes a name filter list     |
| `lib/interface/surface-governance.ts`                         | Add `showContextualRail` to `ChefShellBudget`                       |
| `app/(chef)/layout.tsx`                                       | Mount `<ContextualRailServer />` between RailStrip and `{children}` |
| `lib/discovery/resolvers/chef/event-resolver.ts`              | Add entity-scoped branch                                            |
| `lib/discovery/resolvers/chef/payment-resolver.ts`            | Add entity-scoped branch                                            |
| `lib/discovery/resolvers/chef/completion-resolver.ts`         | Add entity-scoped branch                                            |
| `lib/discovery/resolvers/chef/message-resolver.ts`            | Add entity-scoped branch                                            |
| `lib/discovery/resolvers/chef/communication-feed-resolver.ts` | Add entity-scoped branch                                            |

---

## WAVE 1: Foundation

### Task 1: Contextual Rail Types

**Files:**

- Create: `lib/discovery/contextual-rail-types.ts`
- Test: `tests/unit/contextual-rail-profiles.test.ts`

- [ ] **Step 1: Create the types file**

```ts
// lib/discovery/contextual-rail-types.ts

import type { GodModeResolvedItem } from './god-mode-types'

export type RailCategory =
  | 'readiness'
  | 'money'
  | 'people'
  | 'time'
  | 'risk'
  | 'intelligence'
  | 'communication'
  | 'actions'

export const RAIL_CATEGORIES = [
  'readiness',
  'money',
  'people',
  'time',
  'risk',
  'intelligence',
  'communication',
  'actions',
] as const

export type EntityType = 'event' | 'client' | 'menu' | 'recipe' | 'inquiry' | 'page'

export interface EntityContext {
  type: EntityType
  id: string
  parentIds?: Record<string, string>
}

export type CollapsedSummaryType = 'readiness-bar' | 'metric-row' | 'countdown' | 'status-ticker'

export type MetricFormat = 'currency' | 'percent' | 'number' | 'date' | 'countdown'

export type MetricSeverity = 'normal' | 'warn' | 'critical'

export interface CollapsedMetric {
  label: string
  resolverKey: string
  format: MetricFormat
  severity?: MetricSeverity
}

export interface RailProfile {
  id: string
  pattern: RegExp
  entityExtract?: (match: RegExpMatchArray) => EntityContext | null
  categories: RailCategory[]
  primaryCategory: RailCategory
  resolverFilter: string[]
  entityScoped: boolean
  collapsedSummary: CollapsedSummaryType
  collapsedMetrics: CollapsedMetric[]
  layout: 'columns' | 'stack'
  columnCount?: 2 | 3 | 4
  maxItems: number
  refreshInterval?: number
  defaultExpanded: boolean
  stickyOnScroll: boolean
}

export interface RailProfileMatch {
  profile: RailProfile
  entityContext: EntityContext | null
}

export interface CategoryGroup {
  category: RailCategory
  items: GodModeResolvedItem[]
}

export interface ContextualRailData {
  profileId: string
  categories: CategoryGroup[]
  collapsedMetrics: ResolvedCollapsedMetric[]
  totalItems: number
  criticalCount: number
  layout: 'columns' | 'stack'
  columnCount: number
  defaultExpanded: boolean
  collapsedSummary: CollapsedSummaryType
  primaryCategory: RailCategory
  assembledAt: string
}

export interface ResolvedCollapsedMetric {
  label: string
  value: string | number | null
  format: MetricFormat
  severity: MetricSeverity
}

export const CATEGORY_COLORS: Record<RailCategory, { bg: string; text: string; icon: string }> = {
  readiness: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'check-circle' },
  money: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: 'dollar-sign' },
  people: { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: 'users' },
  time: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'clock' },
  risk: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'shield' },
  intelligence: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: 'brain' },
  communication: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: 'message-circle' },
  actions: { bg: 'bg-stone-500/10', text: 'text-stone-300', icon: 'check-square' },
}

export const RESOLVER_CATEGORY_MAP: Record<string, RailCategory> = {
  completion: 'readiness',
  events: 'time',
  'menu-approvals': 'readiness',
  'packing-status': 'readiness',
  'prep-status': 'readiness',
  'shopping-lists': 'readiness',
  payments: 'money',
  'revenue-goals': 'money',
  'recurring-invoices': 'money',
  'vendor-invoices': 'money',
  'receipt-capture': 'money',
  'revenue-opportunities': 'money',
  'pie-attention': 'money',
  'dormant-clients': 'people',
  'client-birthdays': 'people',
  followups: 'people',
  'staff-issues': 'people',
  'network-activity': 'people',
  'review-requests': 'people',
  contracts: 'time',
  'cadence-due': 'time',
  'scheduled-messages': 'time',
  'hours-logging': 'time',
  'weather-alerts': 'risk',
  'equipment-conflicts': 'risk',
  'quality-drift': 'risk',
  insurance: 'risk',
  certifications: 'risk',
  'cil-signals': 'intelligence',
  'intelligence-signals': 'intelligence',
  'dish-fatigue': 'intelligence',
  'weather-cooking': 'intelligence',
  'lifecycle-stages': 'intelligence',
  inquiries: 'communication',
  messages: 'communication',
  'communication-feed': 'communication',
  'proposal-activity': 'communication',
  waiting: 'communication',
  handoffs: 'actions',
  resume: 'actions',
  'automation-activity': 'actions',
  onboarding: 'readiness',
  quotes: 'money',
}
```

- [ ] **Step 2: Write test scaffolding for types**

```ts
// tests/unit/contextual-rail-profiles.test.ts

import { describe, it, expect } from 'vitest'
import {
  RAIL_CATEGORIES,
  CATEGORY_COLORS,
  RESOLVER_CATEGORY_MAP,
  type RailCategory,
} from '@/lib/discovery/contextual-rail-types'

describe('contextual-rail-types', () => {
  it('every RailCategory has a color entry', () => {
    for (const cat of RAIL_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toBeDefined()
      expect(CATEGORY_COLORS[cat].bg).toBeTruthy()
      expect(CATEGORY_COLORS[cat].text).toBeTruthy()
    }
  })

  it('RESOLVER_CATEGORY_MAP values are all valid RailCategories', () => {
    const validCategories = new Set<string>(RAIL_CATEGORIES)
    for (const [resolver, category] of Object.entries(RESOLVER_CATEGORY_MAP)) {
      expect(validCategories.has(category)).toBe(true)
    }
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run tests/unit/contextual-rail-profiles.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```
git add lib/discovery/contextual-rail-types.ts tests/unit/contextual-rail-profiles.test.ts
git commit -m "feat(rail): add contextual rail types and category mapping"
```

---

### Task 2: Rail Profile Registry

**Files:**

- Create: `lib/discovery/rail-profiles.ts`
- Modify: `tests/unit/contextual-rail-profiles.test.ts`

- [ ] **Step 1: Create the profile registry**

```ts
// lib/discovery/rail-profiles.ts

import type { RailProfile, RailProfileMatch, EntityContext } from './contextual-rail-types'

export const RAIL_PROFILES: RailProfile[] = [
  {
    id: 'event-detail',
    pattern: /^\/events\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'event', id: m[1] }),
    categories: ['readiness', 'money', 'people', 'time', 'risk', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: [
      'completion',
      'events',
      'payments',
      'prep-status',
      'packing-status',
      'shopping-lists',
      'menu-approvals',
      'contracts',
      'messages',
      'communication-feed',
      'staff-issues',
      'weather-alerts',
      'equipment-conflicts',
      'cil-signals',
      'intelligence-signals',
      'lifecycle-stages',
      'dish-fatigue',
    ],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Ready', resolverKey: 'completion', format: 'percent' },
      { label: 'Critical', resolverKey: '_critical_count', format: 'number', severity: 'critical' },
      { label: 'Days', resolverKey: 'events', format: 'countdown' },
      { label: 'Margin', resolverKey: 'payments', format: 'percent' },
      { label: 'Messages', resolverKey: 'messages', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 4,
    maxItems: 24,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'client-detail',
    pattern: /^\/clients\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'client', id: m[1] }),
    categories: ['people', 'money', 'communication', 'risk', 'intelligence'],
    primaryCategory: 'people',
    resolverFilter: [
      'payments',
      'dormant-clients',
      'client-birthdays',
      'followups',
      'messages',
      'communication-feed',
      'cadence-due',
      'scheduled-messages',
      'revenue-opportunities',
      'cil-signals',
      'intelligence-signals',
      'review-requests',
    ],
    entityScoped: true,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Lifetime', resolverKey: 'payments', format: 'currency' },
      { label: 'Last Contact', resolverKey: 'communication-feed', format: 'date' },
      { label: 'Outstanding', resolverKey: 'payments', format: 'currency' },
      { label: 'Events', resolverKey: 'events', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 18,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'menu-detail',
    pattern: /^\/menus\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'menu', id: m[1] }),
    categories: ['readiness', 'money', 'people', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: [
      'completion',
      'payments',
      'menu-approvals',
      'dish-fatigue',
      'quality-drift',
      'intelligence-signals',
      'cil-signals',
      'shopping-lists',
    ],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Ready', resolverKey: 'completion', format: 'percent' },
      { label: 'Food Cost', resolverKey: 'payments', format: 'currency' },
      { label: 'Margin', resolverKey: 'payments', format: 'percent' },
      { label: 'Dishes', resolverKey: 'completion', format: 'number' },
      { label: 'Alerts', resolverKey: 'intelligence-signals', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 4,
    maxItems: 20,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'calendar',
    pattern: /^\/calendar$/,
    categories: ['time', 'risk', 'intelligence'],
    primaryCategory: 'time',
    resolverFilter: [
      'events',
      'contracts',
      'prep-status',
      'packing-status',
      'inquiries',
      'equipment-conflicts',
      'weather-alerts',
      'completion',
      'payments',
      'revenue-goals',
      'cil-signals',
      'intelligence-signals',
    ],
    entityScoped: false,
    collapsedSummary: 'countdown',
    collapsedMetrics: [
      { label: 'Next', resolverKey: 'events', format: 'countdown' },
      { label: 'This Week', resolverKey: 'events', format: 'number' },
      { label: 'Warnings', resolverKey: '_critical_count', format: 'number', severity: 'warn' },
      { label: 'Booked', resolverKey: 'revenue-goals', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'inquiries',
    pattern: /^\/inquiries/,
    categories: ['communication', 'time', 'people', 'money', 'actions'],
    primaryCategory: 'communication',
    resolverFilter: [
      'inquiries',
      'messages',
      'communication-feed',
      'payments',
      'followups',
      'cadence-due',
      'intelligence-signals',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'New', resolverKey: 'inquiries', format: 'number' },
      { label: 'Oldest', resolverKey: 'inquiries', format: 'countdown' },
      { label: 'Pipeline', resolverKey: 'payments', format: 'currency' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'recipe-detail',
    pattern: /^\/recipes\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'recipe', id: m[1] }),
    categories: ['readiness', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: ['completion', 'dish-fatigue', 'quality-drift', 'intelligence-signals'],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Complete', resolverKey: 'completion', format: 'percent' },
      { label: 'Quality', resolverKey: 'quality-drift', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 10,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'finance',
    pattern: /^\/finance/,
    categories: ['money', 'risk', 'time'],
    primaryCategory: 'money',
    resolverFilter: [
      'payments',
      'revenue-goals',
      'recurring-invoices',
      'vendor-invoices',
      'receipt-capture',
      'revenue-opportunities',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Outstanding', resolverKey: 'payments', format: 'currency' },
      { label: 'Overdue', resolverKey: 'payments', format: 'currency', severity: 'critical' },
      { label: 'Goal', resolverKey: 'revenue-goals', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'prep-shopping',
    pattern: /^\/(prep|shopping)/,
    categories: ['readiness', 'time', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: ['prep-status', 'shopping-lists', 'packing-status', 'events', 'completion'],
    entityScoped: false,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Items', resolverKey: 'shopping-lists', format: 'number' },
      { label: 'Sourced', resolverKey: 'shopping-lists', format: 'percent' },
      { label: 'Next Event', resolverKey: 'events', format: 'countdown' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 12,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'analytics',
    pattern: /^\/analytics/,
    categories: ['money', 'intelligence'],
    primaryCategory: 'intelligence',
    resolverFilter: [
      'revenue-goals',
      'payments',
      'cil-signals',
      'intelligence-signals',
      'revenue-opportunities',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Revenue', resolverKey: 'revenue-goals', format: 'currency' },
      { label: 'Margin', resolverKey: 'payments', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 10,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'fallback',
    pattern: /.*/,
    categories: ['actions', 'risk'],
    primaryCategory: 'actions',
    resolverFilter: [],
    entityScoped: false,
    collapsedSummary: 'status-ticker',
    collapsedMetrics: [
      { label: 'Critical', resolverKey: '_critical_count', format: 'number', severity: 'critical' },
    ],
    layout: 'stack',
    maxItems: 5,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
]

export function matchRailProfile(pathname: string): RailProfileMatch {
  for (const profile of RAIL_PROFILES) {
    const match = pathname.match(profile.pattern)
    if (match) {
      const entityContext = profile.entityExtract ? profile.entityExtract(match) : null
      return { profile, entityContext }
    }
  }
  const fallback = RAIL_PROFILES[RAIL_PROFILES.length - 1]
  return { profile: fallback, entityContext: null }
}
```

- [ ] **Step 2: Add profile matching tests**

Append to `tests/unit/contextual-rail-profiles.test.ts`:

```ts
import { matchRailProfile } from '@/lib/discovery/rail-profiles'

describe('matchRailProfile', () => {
  it('matches event detail and extracts entity ID', () => {
    const result = matchRailProfile('/events/abc-123')
    expect(result.profile.id).toBe('event-detail')
    expect(result.entityContext).toEqual({ type: 'event', id: 'abc-123' })
  })

  it('matches client detail', () => {
    const result = matchRailProfile('/clients/xyz-456')
    expect(result.profile.id).toBe('client-detail')
    expect(result.entityContext).toEqual({ type: 'client', id: 'xyz-456' })
  })

  it('matches menu detail', () => {
    const result = matchRailProfile('/menus/m-789')
    expect(result.profile.id).toBe('menu-detail')
    expect(result.entityContext).toEqual({ type: 'menu', id: 'm-789' })
  })

  it('matches calendar with no entity', () => {
    const result = matchRailProfile('/calendar')
    expect(result.profile.id).toBe('calendar')
    expect(result.entityContext).toBeNull()
  })

  it('matches inquiries prefix', () => {
    const result = matchRailProfile('/inquiries')
    expect(result.profile.id).toBe('inquiries')
    const result2 = matchRailProfile('/inquiries/some-id')
    expect(result2.profile.id).toBe('inquiries')
  })

  it('matches recipe detail', () => {
    const result = matchRailProfile('/recipes/r-001')
    expect(result.profile.id).toBe('recipe-detail')
    expect(result.entityContext).toEqual({ type: 'recipe', id: 'r-001' })
  })

  it('matches finance prefix', () => {
    const result = matchRailProfile('/finance/invoices')
    expect(result.profile.id).toBe('finance')
  })

  it('matches prep and shopping prefixes', () => {
    expect(matchRailProfile('/prep/upcoming').profile.id).toBe('prep-shopping')
    expect(matchRailProfile('/shopping/lists').profile.id).toBe('prep-shopping')
  })

  it('matches analytics prefix', () => {
    const result = matchRailProfile('/analytics/revenue')
    expect(result.profile.id).toBe('analytics')
  })

  it('falls back to fallback for unknown routes', () => {
    const result = matchRailProfile('/settings/billing')
    expect(result.profile.id).toBe('fallback')
    expect(result.entityContext).toBeNull()
  })

  it('does NOT match event sub-routes as event-detail', () => {
    const result = matchRailProfile('/events/abc-123/edit')
    expect(result.profile.id).not.toBe('event-detail')
  })

  it('every profile has resolverFilter entries matching dispatcher names', () => {
    const { RAIL_PROFILES } = require('@/lib/discovery/rail-profiles')
    for (const profile of RAIL_PROFILES) {
      expect(profile.categories.length).toBeGreaterThan(0)
      expect(profile.collapsedMetrics.length).toBeGreaterThan(0)
      if (profile.id !== 'fallback') {
        expect(profile.resolverFilter.length).toBeGreaterThan(0)
      }
    }
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/unit/contextual-rail-profiles.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git add lib/discovery/rail-profiles.ts tests/unit/contextual-rail-profiles.test.ts
git commit -m "feat(rail): add rail profile registry with 10 profiles and URL matcher"
```

---

### Task 3: Extend GodModeResolverContext + Fix currentPage null

**Files:**

- Modify: `lib/discovery/god-mode-types.ts:87-92`
- Modify: `lib/discovery/rail-tier-assigner.ts:144`

- [ ] **Step 1: Add currentPage and entityContext to GodModeResolverContext**

In `lib/discovery/god-mode-types.ts`, find the interface at line 87-92:

```ts
// BEFORE
export interface GodModeResolverContext {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
}
```

Replace with:

```ts
// AFTER
export interface GodModeResolverContext {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
  currentPage?: string
  entityContext?: { type: string; id: string; parentIds?: Record<string, string> }
}
```

- [ ] **Step 2: Fix the currentPage null hardcode in rail-tier-assigner.ts**

In `lib/discovery/rail-tier-assigner.ts`, find line 144 inside `scoreGodModeItem`:

```ts
// BEFORE (line 144)
    currentPage: null,
```

Replace with:

```ts
// AFTER
    currentPage: ctx?.currentPage ?? null,
```

This requires `scoreGodModeItem` to accept an optional context. Find the function signature at line 87:

```ts
// BEFORE
function scoreGodModeItem(item: GodModeResolvedItem, now: Date): number {
```

Replace with:

```ts
// AFTER
function scoreGodModeItem(item: GodModeResolvedItem, now: Date, ctx?: { currentPage?: string }): number {
```

Then find every call site of `scoreGodModeItem` in that same file and pass the context through. There should be one call in `assembleTieredRail`. Search for `scoreGodModeItem(` in the file. Each call should pass the context:

```ts
// In assembleTieredRail, where items are scored:
const score = scoreGodModeItem(item, now, { currentPage })
```

The `assembleTieredRail` function itself needs a `currentPage` parameter. Find its signature and add it:

```ts
// BEFORE
export async function assembleTieredRail(
  queue: PriorityQueue | null,
  universalItems?: UniversalRailItem[]
): Promise<TieredRailResult> {

// AFTER
export async function assembleTieredRail(
  queue: PriorityQueue | null,
  universalItems?: UniversalRailItem[],
  currentPage?: string
): Promise<TieredRailResult> {
```

- [ ] **Step 3: Verify type check passes**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No new errors from these changes (existing callers pass undefined for the new optional param).

- [ ] **Step 4: Commit**

```
git add lib/discovery/god-mode-types.ts lib/discovery/rail-tier-assigner.ts
git commit -m "feat(rail): extend resolver context with currentPage + entityContext, fix null hardcode"
```

---

### Task 4: Filtered Resolver Dispatch

**Files:**

- Modify: `lib/discovery/god-mode-dispatcher.ts`

- [ ] **Step 1: Add dispatchFilteredResolvers function**

At the bottom of `lib/discovery/god-mode-dispatcher.ts`, before the closing, add:

```ts
/**
 * Filtered resolvers: run only resolvers whose names are in the filter list.
 * Used by Contextual Rail to scope dispatching per-page profile.
 * Empty filter = hot resolvers only (fallback behavior).
 */
export async function dispatchFilteredResolvers(
  ctx: GodModeResolverContext,
  nameFilter: string[]
): Promise<GodModeResolvedItem[]> {
  if (nameFilter.length === 0) {
    return dispatchResolvers(hotResolvers(), ctx)
  }

  const filterSet = new Set(nameFilter)
  const all = [...hotResolvers(), ...warmResolvers()]
  const filtered = all.filter((entry) => filterSet.has(entry.name))
  return dispatchResolvers(filtered, ctx)
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`
Expected: Clean.

- [ ] **Step 3: Commit**

```
git add lib/discovery/god-mode-dispatcher.ts
git commit -m "feat(rail): add dispatchFilteredResolvers for per-page scoping"
```

---

### Task 5: Shell Budget Integration

**Files:**

- Modify: `lib/interface/surface-governance.ts`

- [ ] **Step 1: Add showContextualRail to ChefShellBudget**

In `lib/interface/surface-governance.ts`, find the `ChefShellBudget` type (line 14-26):

```ts
// BEFORE
export type ChefShellBudget = {
  mode: ProductSurfaceMode
  showMarketResearchBanner: boolean
  showFeedbackNudge: boolean
  showDesktopSidebar: boolean
  showMobileNav: boolean
  showBreadcrumbBar: boolean
  showQuickExpenseTrigger: boolean
  showRemy: boolean
  showQuickCapture: boolean
  showLiveAlerts: boolean
  contentWidth: 'constrained' | 'full'
}
```

Replace with:

```ts
// AFTER
export type ChefShellBudget = {
  mode: ProductSurfaceMode
  showMarketResearchBanner: boolean
  showFeedbackNudge: boolean
  showDesktopSidebar: boolean
  showMobileNav: boolean
  showBreadcrumbBar: boolean
  showQuickExpenseTrigger: boolean
  showRemy: boolean
  showQuickCapture: boolean
  showLiveAlerts: boolean
  showContextualRail: boolean
  contentWidth: 'constrained' | 'full'
}
```

- [ ] **Step 2: Set showContextualRail in resolveChefShellBudget**

Find the `resolveChefShellBudget` function that returns the base budget. Add `showContextualRail: true` to the default return. Then set it `false` in immersive modes:

In the `/welcome` override inside `resolveChefShellBudgetWithDensity` (around line 335), add `showContextualRail: false`.

In the `resolveChefShellBudget` function's default return, add `showContextualRail: true`.

For the `editing` mode case where all chrome is stripped (e.g., menu editor, welcome page), add `showContextualRail: false`.

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No new errors (existing spread patterns pick up the new field).

- [ ] **Step 4: Commit**

```
git add lib/interface/surface-governance.ts
git commit -m "feat(rail): add showContextualRail to shell budget"
```

---

### Task 6: Contextual Rail Assembly Pipeline

**Files:**

- Create: `lib/discovery/contextual-rail-assembly.ts`
- Create: `tests/unit/contextual-rail-assembly.test.ts`

- [ ] **Step 1: Create the assembly module**

```ts
// lib/discovery/contextual-rail-assembly.ts

import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'
import type {
  RailProfile,
  EntityContext,
  CategoryGroup,
  ContextualRailData,
  ResolvedCollapsedMetric,
  RailCategory,
} from './contextual-rail-types'
import { RESOLVER_CATEGORY_MAP } from './contextual-rail-types'
import { matchRailProfile } from './rail-profiles'
import { dispatchFilteredResolvers } from './god-mode-dispatcher'

const CATEGORY_ITEM_CAP = 8

function groupByCategory(
  items: GodModeResolvedItem[],
  activeCategories: RailCategory[]
): CategoryGroup[] {
  const groups = new Map<RailCategory, GodModeResolvedItem[]>()
  for (const cat of activeCategories) {
    groups.set(cat, [])
  }

  for (const item of items) {
    const category =
      RESOLVER_CATEGORY_MAP[item.sourceKind ?? ''] ??
      inferCategoryFromDefinitionId(item.definitionId)
    if (category && groups.has(category)) {
      const list = groups.get(category)!
      if (list.length < CATEGORY_ITEM_CAP) {
        list.push(item)
      }
    }
  }

  return activeCategories
    .map((cat) => ({ category: cat, items: groups.get(cat) ?? [] }))
    .filter((g) => g.items.length > 0)
}

function inferCategoryFromDefinitionId(defId: string): RailCategory | null {
  if (!defId) return null
  if (defId.startsWith('chef.inquiry')) return 'communication'
  if (defId.startsWith('chef.event')) return 'time'
  if (defId.startsWith('chef.payment')) return 'money'
  if (defId.startsWith('chef.message')) return 'communication'
  if (defId.startsWith('chef.completion')) return 'readiness'
  if (defId.startsWith('chef.prep')) return 'readiness'
  if (defId.startsWith('chef.weather')) return 'risk'
  if (defId.startsWith('chef.contract')) return 'time'
  if (defId.startsWith('chef.staff')) return 'people'
  if (defId.startsWith('chef.client')) return 'people'
  if (defId.startsWith('chef.lifecycle')) return 'intelligence'
  if (defId.startsWith('chef.cil')) return 'intelligence'
  if (defId.startsWith('chef.revenue')) return 'money'
  if (defId.startsWith('operator.')) return 'actions'
  return null
}

function deriveActionsCategory(groups: CategoryGroup[]): CategoryGroup | null {
  const actionableItems: GodModeResolvedItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.inlineActions && item.inlineActions.length > 0) {
        actionableItems.push(item)
      }
    }
  }
  if (actionableItems.length === 0) return null
  actionableItems.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return { category: 'actions', items: actionableItems.slice(0, 5) }
}

function buildCollapsedMetrics(
  items: GodModeResolvedItem[],
  profile: RailProfile
): ResolvedCollapsedMetric[] {
  const metrics: ResolvedCollapsedMetric[] = []
  for (const metric of profile.collapsedMetrics) {
    if (metric.resolverKey === '_critical_count') {
      const count = items.filter((i) => i.tier === 'p0').length
      metrics.push({
        label: metric.label,
        value: count,
        format: metric.format,
        severity: count > 0 ? 'critical' : 'normal',
      })
      continue
    }

    const resolverItems = items.filter((i) => (i.sourceKind ?? '') === metric.resolverKey)
    if (metric.format === 'number') {
      metrics.push({
        label: metric.label,
        value: resolverItems.length,
        format: metric.format,
        severity: metric.severity ?? 'normal',
      })
    } else {
      metrics.push({
        label: metric.label,
        value: resolverItems.length > 0 ? resolverItems[0].context : null,
        format: metric.format,
        severity: metric.severity ?? 'normal',
      })
    }
  }
  return metrics
}

export async function assembleContextualRail(
  pathname: string,
  userId: string,
  tenantId: string
): Promise<ContextualRailData | null> {
  const { profile, entityContext } = matchRailProfile(pathname)

  const ctx: GodModeResolverContext = {
    userId,
    tenantId,
    role: 'chef',
    now: new Date(),
    currentPage: pathname,
    entityContext: entityContext ?? undefined,
  }

  const rawItems = await dispatchFilteredResolvers(ctx, profile.resolverFilter)

  rawItems.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const capped = rawItems.slice(0, profile.maxItems)

  let groups = groupByCategory(
    capped,
    profile.categories.filter((c) => c !== 'actions')
  )

  if (profile.categories.includes('actions')) {
    const actionsGroup = deriveActionsCategory(groups)
    if (actionsGroup) {
      groups.push(actionsGroup)
    }
  }

  const criticalCount = capped.filter((i) => i.tier === 'p0').length
  const collapsedMetrics = buildCollapsedMetrics(capped, profile)

  return {
    profileId: profile.id,
    categories: groups,
    collapsedMetrics,
    totalItems: capped.length,
    criticalCount,
    layout: profile.layout,
    columnCount: profile.columnCount ?? 2,
    defaultExpanded: profile.defaultExpanded,
    collapsedSummary: profile.collapsedSummary,
    primaryCategory: profile.primaryCategory,
    assembledAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: Write assembly tests**

```ts
// tests/unit/contextual-rail-assembly.test.ts

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/discovery/god-mode-dispatcher', () => ({
  dispatchFilteredResolvers: vi.fn().mockResolvedValue([
    {
      definitionId: 'chef.event_upcoming',
      tier: 'p2',
      label: 'Birthday dinner 12g Sat',
      context: '3 days',
      destination: '/events/e1',
      score: 72,
      sourceKind: 'events',
    },
    {
      definitionId: 'chef.payment_outstanding',
      tier: 'p1',
      label: 'Sarah Chen $650',
      context: '$650 outstanding',
      destination: '/events/e1',
      score: 85,
      sourceKind: 'payments',
    },
    {
      definitionId: 'chef.completion_incomplete',
      tier: 'p0',
      label: 'Menu not attached',
      context: '72%',
      destination: '/events/e1',
      score: 90,
      sourceKind: 'completion',
      inlineActions: [
        { label: 'Attach menu', action: 'attach-menu', params: {}, variant: 'default' },
      ],
    },
    {
      definitionId: 'chef.message_unread',
      tier: 'p1',
      label: '2 unread from Sarah',
      context: '2h ago',
      destination: '/messages',
      score: 78,
      sourceKind: 'messages',
    },
  ]),
}))

import { assembleContextualRail } from '@/lib/discovery/contextual-rail-assembly'

describe('assembleContextualRail', () => {
  it('assembles event detail profile with correct categories', async () => {
    const result = await assembleContextualRail('/events/e1', 'user1', 'tenant1')
    expect(result).not.toBeNull()
    expect(result!.profileId).toBe('event-detail')
    expect(result!.totalItems).toBe(4)
    expect(result!.criticalCount).toBe(1)
  })

  it('groups items by category based on sourceKind', async () => {
    const result = await assembleContextualRail('/events/e1', 'user1', 'tenant1')
    const catNames = result!.categories.map((g) => g.category)
    expect(catNames).toContain('readiness')
    expect(catNames).toContain('money')
    expect(catNames).toContain('communication')
    expect(catNames).toContain('time')
  })

  it('builds collapsed metrics with critical count', async () => {
    const result = await assembleContextualRail('/events/e1', 'user1', 'tenant1')
    const critMetric = result!.collapsedMetrics.find((m) => m.label === 'Critical')
    expect(critMetric).toBeDefined()
    expect(critMetric!.value).toBe(1)
    expect(critMetric!.severity).toBe('critical')
  })

  it('derives actions category from items with inlineActions', async () => {
    const result = await assembleContextualRail('/events/e1', 'user1', 'tenant1')
    const actionsGroup = result!.categories.find((g) => g.category === 'actions')
    expect(actionsGroup).toBeDefined()
    expect(actionsGroup!.items.length).toBe(1)
    expect(actionsGroup!.items[0].definitionId).toBe('chef.completion_incomplete')
  })

  it('returns fallback profile for unknown routes', async () => {
    const result = await assembleContextualRail('/settings/billing', 'user1', 'tenant1')
    expect(result!.profileId).toBe('fallback')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/unit/contextual-rail-assembly.test.ts`
Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```
git add lib/discovery/contextual-rail-assembly.ts tests/unit/contextual-rail-assembly.test.ts
git commit -m "feat(rail): add contextual rail assembly pipeline with category grouping"
```

---

## WAVE 2: Component Shell

### Task 7: RailIntelCard Component

**Files:**

- Create: `components/rail/rail-intel-card.tsx`

- [ ] **Step 1: Create the card component**

```tsx
// components/rail/rail-intel-card.tsx
'use client'

import Link from 'next/link'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import { cn } from '@/lib/utils'

const TIER_INDICATOR: Record<string, string> = {
  p0: 'bg-red-500',
  p1: 'bg-amber-500',
  p2: 'bg-blue-500',
  p3: 'bg-stone-500',
  p4: 'bg-stone-700',
}

export function RailIntelCard({ item }: { item: GodModeResolvedItem }) {
  return (
    <Link
      href={item.destination}
      className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-stone-800/50 transition-colors"
    >
      <span
        className={cn(
          'mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0',
          TIER_INDICATOR[item.tier] ?? 'bg-stone-600'
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-stone-300 group-hover:text-stone-100 truncate leading-tight">
          {item.label}
        </p>
        {item.context && (
          <p className="text-[11px] text-stone-500 truncate leading-tight">{item.context}</p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/rail/rail-intel-card.tsx
git commit -m "feat(rail): add RailIntelCard component"
```

---

### Task 8: CategorySection Component

**Files:**

- Create: `components/rail/category-section.tsx`

- [ ] **Step 1: Create the category section**

```tsx
// components/rail/category-section.tsx
'use client'

import type { CategoryGroup } from '@/lib/discovery/contextual-rail-types'
import { CATEGORY_COLORS } from '@/lib/discovery/contextual-rail-types'
import { RailIntelCard } from './rail-intel-card'
import { cn } from '@/lib/utils'

export function CategorySection({ group }: { group: CategoryGroup }) {
  const colors = CATEGORY_COLORS[group.category]

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-2 py-1">
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.bg.replace('/10', ''))} />
        <span className={cn('text-[10px] font-medium uppercase tracking-wider', colors.text)}>
          {group.category}
        </span>
        <span className="text-[10px] text-stone-600">{group.items.length}</span>
      </div>
      {group.items.map((item) => (
        <RailIntelCard key={`${item.definitionId}-${item.destination}`} item={item} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/rail/category-section.tsx
git commit -m "feat(rail): add CategorySection component"
```

---

### Task 9: CollapsedBar Component

**Files:**

- Create: `components/rail/collapsed-bar.tsx`

- [ ] **Step 1: Create the collapsed bar**

```tsx
// components/rail/collapsed-bar.tsx
'use client'

import type { ContextualRailData } from '@/lib/discovery/contextual-rail-types'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

function MetricChip({
  label,
  value,
  severity,
}: {
  label: string
  value: string | number | null
  severity: string
}) {
  if (value === null || value === 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
        severity === 'critical' && 'bg-red-500/10 text-red-400',
        severity === 'warn' && 'bg-amber-500/10 text-amber-400',
        severity === 'normal' && 'bg-stone-800/60 text-stone-400'
      )}
    >
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function ReadinessBar({ metrics }: { metrics: ContextualRailData['collapsedMetrics'] }) {
  const readyMetric = metrics.find((m) => m.label === 'Ready')
  if (!readyMetric || typeof readyMetric.value !== 'string') return null

  const pctMatch = readyMetric.value.match(/(\d+)/)
  const pct = pctMatch ? parseInt(pctMatch[1], 10) : 0

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-stone-800 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[11px] text-stone-400 font-medium">{pct}%</span>
    </div>
  )
}

export function CollapsedBar({
  data,
  onToggle,
}: {
  data: ContextualRailData
  onToggle: () => void
}) {
  const showReadinessBar = data.collapsedSummary === 'readiness-bar'

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 w-full px-3 h-9 border-b transition-colors cursor-pointer',
        'hover:bg-stone-900/80',
        data.criticalCount > 0
          ? 'bg-red-950/10 border-red-900/20'
          : 'bg-stone-950/80 border-stone-800/50'
      )}
    >
      {showReadinessBar && <ReadinessBar metrics={data.collapsedMetrics} />}

      <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-hide">
        {data.collapsedMetrics
          .filter((m) => m.label !== 'Ready' || !showReadinessBar)
          .map((m) => (
            <MetricChip key={m.label} label={m.label} value={m.value} severity={m.severity} />
          ))}
      </div>

      <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/rail/collapsed-bar.tsx
git commit -m "feat(rail): add CollapsedBar component with readiness bar and metric chips"
```

---

### Task 10: ExpandedPanel Component

**Files:**

- Create: `components/rail/expanded-panel.tsx`

- [ ] **Step 1: Create the expanded panel**

```tsx
// components/rail/expanded-panel.tsx
'use client'

import type { ContextualRailData } from '@/lib/discovery/contextual-rail-types'
import { CategorySection } from './category-section'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExpandedPanel({
  data,
  onToggle,
}: {
  data: ContextualRailData
  onToggle: () => void
}) {
  const cols = data.columnCount

  return (
    <div
      className={cn(
        'border-b bg-stone-950/95 backdrop-blur-md',
        data.criticalCount > 0 ? 'border-red-900/20' : 'border-stone-800/50'
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-800/30">
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
          Contextual Rail
        </span>
        <button onClick={onToggle} className="p-1 rounded hover:bg-stone-800/50 transition-colors">
          <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
        </button>
      </div>

      <div
        className={cn(
          'grid gap-px max-h-[280px] overflow-y-auto',
          cols === 2 && 'grid-cols-1 sm:grid-cols-2',
          cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
          cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {data.categories.map((group) => (
          <div key={group.category} className="p-2">
            <CategorySection group={group} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/rail/expanded-panel.tsx
git commit -m "feat(rail): add ExpandedPanel component with responsive column grid"
```

---

### Task 11: ContextualRailClient Component

**Files:**

- Create: `components/rail/contextual-rail-client.tsx`

- [ ] **Step 1: Create the client orchestrator**

```tsx
// components/rail/contextual-rail-client.tsx
'use client'

import { useCallback, useState } from 'react'
import type { ContextualRailData } from '@/lib/discovery/contextual-rail-types'
import { useSSE } from '@/lib/realtime/sse-client'
import { CollapsedBar } from './collapsed-bar'
import { ExpandedPanel } from './expanded-panel'

const STORAGE_KEY_PREFIX = 'cf-rail-expanded-'

function getStoredExpanded(profileId: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${profileId}`)
  if (stored === null) return defaultValue
  return stored === '1'
}

function setStoredExpanded(profileId: string, expanded: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${profileId}`, expanded ? '1' : '0')
}

export function ContextualRailClient({
  initialData,
  refreshAction,
}: {
  initialData: ContextualRailData | null
  refreshAction: () => Promise<ContextualRailData | null>
}) {
  const [data, setData] = useState(initialData)
  const [expanded, setExpanded] = useState(() =>
    data ? getStoredExpanded(data.profileId, data.defaultExpanded) : false
  )

  useSSE('rail', {
    onMessage: useCallback(() => {
      refreshAction()
        .then((result) => {
          if (result) setData(result)
        })
        .catch(() => {})
    }, [refreshAction]),
  })

  if (!data || data.totalItems === 0) return null

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    setStoredExpanded(data.profileId, next)
  }

  return expanded ? (
    <ExpandedPanel data={data} onToggle={toggle} />
  ) : (
    <CollapsedBar data={data} onToggle={toggle} />
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/rail/contextual-rail-client.tsx
git commit -m "feat(rail): add ContextualRailClient with expand/collapse, SSE, localStorage"
```

---

### Task 12: ContextualRailServer + Server Action

**Files:**

- Create: `components/rail/contextual-rail-server.tsx`
- Modify: `lib/discovery/universal-rail-actions.ts` (add server action)

- [ ] **Step 1: Add the server action to universal-rail-actions.ts**

Find `lib/discovery/universal-rail-actions.ts` and add at the end:

```ts
export async function getContextualRail(): Promise<ContextualRailData | null> {
  'use server'

  const session = await auth()
  if (!session?.user?.id) return null

  const chef = await requireChef()
  const headersList = await headers()
  const pathname = headersList.get(PATHNAME_HEADER) ?? '/dashboard'

  const { assembleContextualRail } = await import('./contextual-rail-assembly')
  return assembleContextualRail(pathname, chef.id, chef.tenantId ?? chef.entityId)
}
```

Add any needed imports at the top of the file (check which are already imported):

- `import type { ContextualRailData } from './contextual-rail-types'`
- `headers` and `PATHNAME_HEADER` and `auth` and `requireChef` (likely already imported for `getRailStrip`)

- [ ] **Step 2: Create the server component wrapper**

```tsx
// components/rail/contextual-rail-server.tsx

import { headers } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { assembleContextualRail } from '@/lib/discovery/contextual-rail-assembly'
import { ContextualRailClient } from './contextual-rail-client'
import { getContextualRail } from '@/lib/discovery/universal-rail-actions'
import { PATHNAME_HEADER } from '@/lib/auth/request-auth-context'

export async function ContextualRailServer() {
  let data
  try {
    const chef = await requireChef()
    const headersList = await headers()
    const pathname = headersList.get(PATHNAME_HEADER) ?? '/dashboard'
    data = await assembleContextualRail(pathname, chef.id, chef.tenantId ?? chef.entityId)
  } catch {
    return null
  }

  return <ContextualRailClient initialData={data} refreshAction={getContextualRail} />
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: Clean.

- [ ] **Step 4: Commit**

```
git add components/rail/contextual-rail-server.tsx lib/discovery/universal-rail-actions.ts
git commit -m "feat(rail): add ContextualRailServer and getContextualRail server action"
```

---

### Task 13: Mount in Layout

**Files:**

- Modify: `app/(chef)/layout.tsx`

- [ ] **Step 1: Add import**

At the top of `app/(chef)/layout.tsx`, add the import near the RailStripWrapper import (line 91):

```ts
import { ContextualRailServer } from '@/components/rail/contextual-rail-server'
```

- [ ] **Step 2: Mount the component**

Find the section where RailStrip and children render (around lines 292-295):

```tsx
// BEFORE
;<Suspense fallback={<RailStripSkeleton />}>
  <RailStripWrapper />
</Suspense>
{
  children
}
```

Replace with:

```tsx
// AFTER
;<Suspense fallback={<RailStripSkeleton />}>
  <RailStripWrapper />
</Suspense>
{
  shellBudget.showContextualRail && (
    <Suspense fallback={null}>
      <ContextualRailServer />
    </Suspense>
  )
}
{
  children
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: Clean.

- [ ] **Step 4: Start dev server and visually verify**

Run: `http://localhost:3100/dashboard`
Expected: Contextual Rail appears between RailStrip and dashboard content. May show as collapsed bar with metric chips, or expanded with category columns depending on resolver data.

Check 2-3 pages:

- `/events/[any-event-id]` should show event-detail profile
- `/calendar` should show calendar profile
- `/settings` should show fallback profile (minimal)

- [ ] **Step 5: Commit**

```
git add app/(chef)/layout.tsx
git commit -m "feat(rail): mount ContextualRail in chef layout between strip and content"
```

---

## WAVE 3: Entity Scoping

### Task 14: Entity-Scope Event Resolver

**Files:**

- Modify: `lib/discovery/resolvers/chef/event-resolver.ts`

- [ ] **Step 1: Read the existing resolveEvents function completely**

Read all of `lib/discovery/resolvers/chef/event-resolver.ts` to understand the current query and return structure.

- [ ] **Step 2: Add entity-scoped branch**

At the top of `resolveEvents`, before the existing query logic, add:

```ts
export async function resolveEvents(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'event') {
    return resolveEntityScopedEvent(ctx, ctx.entityContext.id)
  }

  // ... existing code unchanged ...
}

async function resolveEntityScopedEvent(
  ctx: GodModeResolverContext,
  eventId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db/index')

  let rows: EventRow[]
  try {
    rows = await pgClient<EventRow[]>`
      SELECT
        id, status, event_date, serve_time,
        guest_count, occasion, location_city, location_state,
        (SELECT json_build_object('id', c.id, 'full_name', c.full_name, 'email', c.email)
         FROM clients c WHERE c.id = events.client_id) as client
      FROM events
      WHERE id = ${eventId}
        AND tenant_id = ${ctx.tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  } catch {
    return []
  }

  if (rows.length === 0) return []
  const row = rows[0]
  const now = ctx.now

  const tier = assignEventTier(row, now)
  if (!tier) return []

  const items: GodModeResolvedItem[] = [
    {
      definitionId: `chef.event_context`,
      tier,
      label: buildEventLabel(row, now),
      context: row.guest_count ? `${row.guest_count} guests` : '',
      destination: `/events/${row.id}`,
      icon: 'calendar',
      sourceKind: 'events',
      score: tier === 'p0' ? 95 : tier === 'p1' ? 80 : tier === 'p2' ? 60 : 40,
    },
  ]

  return items
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`
Expected: Clean. The new optional `entityContext` field on `GodModeResolverContext` means existing callers still work.

- [ ] **Step 4: Commit**

```
git add lib/discovery/resolvers/chef/event-resolver.ts
git commit -m "feat(rail): add entity-scoped branch to event resolver"
```

---

### Task 15: Entity-Scope Payment Resolver

**Files:**

- Modify: `lib/discovery/resolvers/chef/payment-resolver.ts`

- [ ] **Step 1: Read the existing resolvePayments function completely**

Read all of `lib/discovery/resolvers/chef/payment-resolver.ts`.

- [ ] **Step 2: Add entity-scoped branch for event and client**

At the top of `resolvePayments`, add:

```ts
export async function resolvePayments(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'event') {
    return resolveEventPayments(ctx, ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'client') {
    return resolveClientPayments(ctx, ctx.entityContext.id)
  }

  // ... existing code unchanged ...
}

async function resolveEventPayments(
  ctx: GodModeResolverContext,
  eventId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: PaymentRow[]
  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.occasion,
        e.event_date as "eventDate",
        COALESCE(e.quoted_price_cents, 0) - COALESCE(
          (SELECT SUM(amount_cents) FROM ledger_entries le WHERE le.event_id = e.id AND le.entry_type = 'payment'),
          0
        ) as "outstandingBalanceCents",
        COALESCE(
          (SELECT SUM(amount_cents) FROM ledger_entries le WHERE le.event_id = e.id AND le.entry_type = 'payment'),
          0
        ) as "totalPaidCents",
        COALESCE(e.quoted_price_cents, 0) as "quotedPriceCents",
        c.full_name as "clientName",
        e.guest_count as "guestCount"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.id = ${eventId}
        AND e.tenant_id = ${ctx.tenantId}
        AND e.deleted_at IS NULL
      LIMIT 1
    `
    rows = result as PaymentRow[]
  } catch {
    return []
  }

  return rows
    .filter((r) => assignPaymentTier(r, ctx.now) !== null)
    .map((r) => ({
      definitionId: `chef.payment_event_${r.eventId}`,
      tier: assignPaymentTier(r, ctx.now)!,
      label: buildPaymentLabel(r),
      context: `Quoted ${formatCents(r.quotedPriceCents)}`,
      destination: `/events/${r.eventId}`,
      icon: 'dollar-sign',
      sourceKind: 'payments' as const,
      score: r.outstandingBalanceCents > 0 ? 85 : 30,
    }))
}

async function resolveClientPayments(
  ctx: GodModeResolverContext,
  clientId: string
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: PaymentRow[]
  try {
    const result = await pgClient`
      SELECT
        e.id as "eventId",
        e.occasion,
        e.event_date as "eventDate",
        COALESCE(e.quoted_price_cents, 0) - COALESCE(
          (SELECT SUM(amount_cents) FROM ledger_entries le WHERE le.event_id = e.id AND le.entry_type = 'payment'),
          0
        ) as "outstandingBalanceCents",
        COALESCE(
          (SELECT SUM(amount_cents) FROM ledger_entries le WHERE le.event_id = e.id AND le.entry_type = 'payment'),
          0
        ) as "totalPaidCents",
        COALESCE(e.quoted_price_cents, 0) as "quotedPriceCents",
        c.full_name as "clientName",
        e.guest_count as "guestCount"
      FROM events e
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.client_id = ${clientId}
        AND e.tenant_id = ${ctx.tenantId}
        AND e.deleted_at IS NULL
        AND e.status NOT IN ('cancelled', 'archived')
      ORDER BY e.event_date DESC NULLS LAST
      LIMIT 5
    `
    rows = result as PaymentRow[]
  } catch {
    return []
  }

  return rows
    .filter((r) => r.outstandingBalanceCents > 0)
    .map((r) => ({
      definitionId: `chef.payment_client_${r.eventId}`,
      tier: assignPaymentTier(r, ctx.now) ?? 'p3',
      label: buildPaymentLabel(r),
      context: r.occasion ?? 'Event',
      destination: `/events/${r.eventId}`,
      icon: 'dollar-sign',
      sourceKind: 'payments' as const,
      score: 75,
    }))
}
```

Note: `formatCents` is already defined in the file (line 31). Reuse it.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`

- [ ] **Step 4: Commit**

```
git add lib/discovery/resolvers/chef/payment-resolver.ts
git commit -m "feat(rail): add entity-scoped branches to payment resolver (event + client)"
```

---

### Task 16: Entity-Scope Completion Resolver

**Files:**

- Modify: `lib/discovery/resolvers/chef/completion-resolver.ts`

- [ ] **Step 1: Read the existing resolver fully**

Read all of `lib/discovery/resolvers/chef/completion-resolver.ts`.

- [ ] **Step 2: Add entity-scoped branch**

At the top of `resolveCompletionItems`:

```ts
export async function resolveCompletionItems(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  if (ctx.entityContext?.type === 'event') {
    return resolveEntityCompletion(ctx, 'event', ctx.entityContext.id)
  }
  if (ctx.entityContext?.type === 'menu') {
    return resolveEntityCompletion(ctx, 'menu', ctx.entityContext.id)
  }

  // ... existing code unchanged ...
}

async function resolveEntityCompletion(
  ctx: GodModeResolverContext,
  entityType: 'event' | 'menu',
  entityId: string
): Promise<GodModeResolvedItem[]> {
  try {
    const { evaluateCompletion } = await import('@/lib/completion/engine')

    const result = await evaluateCompletion(entityType, entityId, ctx.tenantId, { shallow: false })
    if (!result) return []

    const items: GodModeResolvedItem[] = []

    if (result.status !== 'complete') {
      items.push({
        definitionId: `chef.completion_${entityType}_${entityId}`,
        tier: result.status === 'incomplete' ? 'p1' : 'p2',
        label: `${Math.round(result.score * 100)}% complete`,
        context: `${result.blockingRequirements.length} blocking`,
        destination: `/${entityType}s/${entityId}`,
        icon: 'check-circle',
        sourceKind: 'completion',
        score: 95 - Math.round(result.score * 50),
      })
    }

    for (const req of result.blockingRequirements.slice(0, 4)) {
      items.push({
        definitionId: `chef.completion_block_${req.id ?? req.label}`,
        tier: 'p1',
        label: req.label,
        context: 'Missing',
        destination: `/${entityType}s/${entityId}`,
        icon: 'alert-circle',
        sourceKind: 'completion',
        score: 88,
        inlineActions: req.actionHref
          ? [
              {
                label: 'Fix',
                action: 'navigate',
                params: { href: req.actionHref },
                variant: 'default',
              },
            ]
          : undefined,
      })
    }

    return items
  } catch {
    return []
  }
}
```

Note: Adapt the `result.blockingRequirements` field access to match the actual `CompletionResult` type. Read `lib/completion/types.ts` first to verify the exact field names.

- [ ] **Step 3: Type check and commit**

```
git add lib/discovery/resolvers/chef/completion-resolver.ts
git commit -m "feat(rail): add entity-scoped branches to completion resolver (event + menu)"
```

---

### Task 17: Entity-Scope Message Resolver

**Files:**

- Modify: `lib/discovery/resolvers/chef/message-resolver.ts`

- [ ] **Step 1: Read the existing resolver**

Read all of `lib/discovery/resolvers/chef/message-resolver.ts`.

- [ ] **Step 2: Add entity-scoped branch for client**

At the top of the resolve function, add a branch that filters messages to a specific client when `entityContext.type === 'client'`:

```ts
if (ctx.entityContext?.type === 'client') {
  // Filter the existing query to only show messages from/to this client
  // Modify the WHERE clause to add: AND client_id = ${ctx.entityContext.id}
  // Return with sourceKind: 'messages'
}
```

The exact SQL depends on the existing query structure. Follow the same pattern as the payment resolver: copy the query, add the entity filter, reduce the limit.

- [ ] **Step 3: Type check and commit**

```
git add lib/discovery/resolvers/chef/message-resolver.ts
git commit -m "feat(rail): add entity-scoped branch to message resolver (client)"
```

---

### Task 18: Entity-Scope Communication Feed Resolver

**Files:**

- Modify: `lib/discovery/resolvers/chef/communication-feed-resolver.ts`

- [ ] **Step 1: Read the existing resolver**

Read all of `lib/discovery/resolvers/chef/communication-feed-resolver.ts`.

- [ ] **Step 2: Add entity-scoped branch for client**

Same pattern as message resolver: when `entityContext.type === 'client'`, filter communication feed entries to that client. When `entityContext.type === 'event'`, filter to that event's client.

- [ ] **Step 3: Type check and commit**

```
git add lib/discovery/resolvers/chef/communication-feed-resolver.ts
git commit -m "feat(rail): add entity-scoped branch to communication feed resolver"
```

---

## Post-Wave 3 Verification

### Task 19: Integration Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 2: Run all contextual rail tests**

Run: `npx vitest run tests/unit/contextual-rail-profiles.test.ts tests/unit/contextual-rail-assembly.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Visual verification on dev server**

Navigate to each of these pages on `http://localhost:3100` and verify the Contextual Rail renders:

1. `/dashboard` - should show fallback profile (collapsed by default)
2. `/events/[pick-any-event]` - should show event-detail profile (expanded by default, 4 columns)
3. `/clients/[pick-any-client]` - should show client-detail profile (collapsed by default, 3 columns)
4. `/calendar` - should show calendar profile (collapsed by default)
5. `/inquiries` - should show inquiries profile (expanded by default)
6. `/settings` - should show fallback profile (minimal)

Verify:

- Collapsed bar shows metric chips
- Clicking expands to show category columns
- Items link to correct destinations
- No layout shift or visual breakage
- Rail disappears on `/welcome` and immersive editors

- [ ] **Step 4: Commit any fixes found during verification**

```
git add -A
git commit -m "fix(rail): address integration issues found during visual verification"
```

---

## Follow-Up Plans (Not in This Plan)

**Wave 4: Polish** (separate plan)

- Hover popovers on RailIntelCard (Radix Popover)
- Inline actions (check-off, quick compose, payment reminder)
- Keyboard shortcut (`r` to toggle)
- Critical pulse animation on collapsed bar
- Category slide-in transitions on expand
- Empty state "All clear" message

**Wave 5: Phase 2 Parallel Routes** (separate plan)

- `app/(chef)/@rail/` parallel route structure
- Event, client, menu, calendar, inquiries slots
- Full entity context from route params (no URL parsing)
- `default.tsx` fallback to Phase 1 behavior
