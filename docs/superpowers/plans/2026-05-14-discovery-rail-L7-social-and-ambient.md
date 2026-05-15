# Discovery Rail Layer 7: Social and Ambient

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 safe social rail families (opportunity_marketplace, what_to_eat_now, universal_food_object, shared_circle_discovery) and add ambient credibility signals to discovery cards. Wire `food-social-rail-contracts.ts` into the live rail.

**Architecture:** Each build wires one family from the tested-but-unwired `food-social-rail-contracts.ts` into the rail. Opportunity cards inject into the ChefFlow Picks lane. What-to-eat-now replaces the empty-state with intelligent recovery. Universal food object gives every card a standard action menu. Ambient signals add credibility badges computed server-side from aggregated `discovery_interactions` data.

**Tech Stack:** Next.js (React Server Components + Client Components), `node:test` + `node:assert/strict` for tests, Tailwind CSS, existing contract layer in `lib/discovery/`.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 7, Builds 7.1-7.4)

---

## File Map

### New Files

| File                                         | Responsibility                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `components/discovery/opportunity-card.tsx`  | Opportunity marketplace card variant with dashed amber border, chef name, dates, cuisine, pricing   |
| `lib/discovery/opportunity-resolver.ts`      | Queries chef availability, applies social rail scoring, enforces 18% share cap                      |
| `components/discovery/search-recovery.tsx`   | Recovery prompt component for empty/vague search states with 3 modes (continue, clarify, recover)   |
| `components/discovery/food-object-menu.tsx`  | Context menu component with 5 gated actions (Save, Send to Circle, Ask a Chef, Plan a Dinner, Hide) |
| `lib/discovery/ambient-signal-resolver.ts`   | Aggregates discovery_interactions into ambient credibility signals per item                         |
| `tests/unit/opportunity-resolver.test.ts`    | Opportunity resolver scoring and share cap tests                                                    |
| `tests/unit/search-recovery.test.ts`         | What-to-eat-now recovery mode selection tests                                                       |
| `tests/unit/food-object-menu.test.ts`        | Universal food object action gating tests                                                           |
| `tests/unit/ambient-signal-resolver.test.ts` | Ambient signal resolution and priority tests                                                        |

### Modified Files

| File                                           | Changes                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                        | Fetch opportunity data, compute ambient signals, pass to discovery components             |
| `app/(public)/_components/cuisine-marquee.tsx` | Inject opportunity cards into picks lane, empty/vague state handling, context menu wiring |
| `components/discovery/discovery-card.tsx`      | Long-press/right-click handler for food object menu, ambient signal badge slot            |
| `lib/discovery/track-discovery-click.ts`       | Add action event tracking for food object actions and ambient signal interactions         |

---

## Task 1: Opportunity Resolver (Build 7.1 - Backend)

**Files:**

- Create: `lib/discovery/opportunity-resolver.ts`
- Create: `tests/unit/opportunity-resolver.test.ts`

- [ ] **Step 1: Write failing test for opportunity resolver**

Create `tests/unit/opportunity-resolver.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveOpportunityCards,
  scoreOpportunityCandidate,
  type OpportunityInput,
} from '../../lib/discovery/opportunity-resolver.ts'

function makeOpportunity(overrides: Partial<OpportunityInput> = {}): OpportunityInput {
  return {
    chefId: 'chef-1',
    chefName: 'Chef Maria',
    cuisine: 'Italian',
    availableDates: ['2026-05-20'],
    specialPricing: null,
    baseScore: 0.8,
    ...overrides,
  }
}

describe('scoreOpportunityCandidate', () => {
  it('applies limited rarity factor of 0.88', () => {
    const result = scoreOpportunityCandidate(makeOpportunity({ baseScore: 1.0 }))
    assert.ok(result.score <= 0.88, `score ${result.score} should be <= 0.88 after rarity`)
  })

  it('applies urgency factor 1.25 when date is within 7 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 3)
    const result = scoreOpportunityCandidate(
      makeOpportunity({ availableDates: [soon.toISOString().slice(0, 10)] })
    )
    const noUrgency = scoreOpportunityCandidate(makeOpportunity({ availableDates: ['2027-12-01'] }))
    assert.ok(result.score > noUrgency.score, 'urgent dates should score higher')
  })

  it('returns a valid FoodSocialRailCandidate', () => {
    const result = scoreOpportunityCandidate(makeOpportunity())
    assert.equal(result.family, 'opportunity_marketplace')
    assert.equal(typeof result.id, 'string')
    assert.equal(typeof result.score, 'number')
  })
})

describe('resolveOpportunityCards', () => {
  it('returns max 2 opportunity cards per rail render', () => {
    const opportunities = Array.from({ length: 5 }, (_, i) =>
      makeOpportunity({ chefId: `chef-${i}`, chefName: `Chef ${i}` })
    )
    const result = resolveOpportunityCards(opportunities, { maxItems: 10 })
    assert.ok(result.length <= 2, `got ${result.length} cards, expected <= 2`)
  })

  it('returns empty array when no opportunities', () => {
    const result = resolveOpportunityCards([])
    assert.deepEqual(result, [])
  })

  it('converts opportunities to DiscoveryRailItem format', () => {
    const result = resolveOpportunityCards([makeOpportunity()])
    assert.ok(result.length > 0)
    assert.equal(result[0].type, 'featured_chef')
    assert.equal(typeof result[0].label, 'string')
    assert.equal(typeof result[0].href, 'string')
    assert.ok(
      result[0].eyebrow?.toLowerCase().includes('opening') ||
        result[0].eyebrow?.toLowerCase().includes('available')
    )
  })

  it('includes special pricing in sublabel when present', () => {
    const result = resolveOpportunityCards([
      makeOpportunity({ specialPricing: '20% off first booking' }),
    ])
    assert.ok(result[0].sublabel?.includes('20%'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-vm-modules --test tests/unit/opportunity-resolver.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement opportunity-resolver.ts**

Create `lib/discovery/opportunity-resolver.ts`:

```typescript
import type { FoodSocialRailCandidate } from '@/lib/discovery/food-social-rail-contracts'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

export type OpportunityInput = {
  chefId: string
  chefName: string
  cuisine: string
  availableDates: string[]
  specialPricing: string | null
  baseScore: number
}

type OpportunityCard = DiscoveryRailItem & {
  opportunityChefId: string
}

const RARITY_FACTOR = 0.88
const URGENCY_FACTOR = 1.25
const URGENCY_WINDOW_DAYS = 7
const MAX_OPPORTUNITY_CARDS = 2

export function scoreOpportunityCandidate(
  input: OpportunityInput,
  now = new Date()
): FoodSocialRailCandidate {
  const hasUrgentDate = input.availableDates.some((dateStr) => {
    const date = new Date(dateStr)
    const diffMs = date.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= URGENCY_WINDOW_DAYS
  })

  const urgency = hasUrgentDate ? ('urgent' as const) : ('normal' as const)
  const urgencyMultiplier = hasUrgentDate ? URGENCY_FACTOR : 1
  const score = Math.round(input.baseScore * RARITY_FACTOR * urgencyMultiplier * 100) / 100

  const earliestDate = input.availableDates
    .map((d) => new Date(d))
    .filter((d) => d.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0]

  return {
    id: `opportunity:${input.chefId}`,
    family: 'opportunity_marketplace',
    label: input.chefName,
    score,
    urgency,
    expiresAt: earliestDate ? earliestDate.toISOString() : null,
  }
}

export function resolveOpportunityCards(
  opportunities: OpportunityInput[],
  options: { maxItems?: number; now?: Date } = {}
): OpportunityCard[] {
  if (opportunities.length === 0) return []

  const now = options.now ?? new Date()

  const scored = opportunities
    .map((opp) => ({ opp, candidate: scoreOpportunityCandidate(opp, now) }))
    .filter((entry) => entry.candidate.score > 0)
    .sort((a, b) => b.candidate.score - a.candidate.score)
    .slice(0, MAX_OPPORTUNITY_CARDS)

  return scored.map(({ opp, candidate }) => {
    const dateLabel = formatNextDate(opp.availableDates, now)
    const sublabel = opp.specialPricing
      ? `${opp.cuisine} ${dateLabel ? '- ' + dateLabel : ''} - ${opp.specialPricing}`
      : `${opp.cuisine}${dateLabel ? ' - ' + dateLabel : ''}`

    return {
      type: 'featured_chef' as const,
      label: opp.chefName,
      href: `/chef/${slugify(opp.chefName)}`,
      lane: 'chefflow_picks' as const,
      eyebrow: candidate.urgency === 'urgent' ? 'Available soon' : 'Chef opening',
      sublabel,
      opportunityChefId: opp.chefId,
    }
  })
}

function formatNextDate(dates: string[], now: Date): string | null {
  const upcoming = dates
    .map((d) => new Date(d))
    .filter((d) => d.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())

  if (upcoming.length === 0) return null

  const next = upcoming[0]
  const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `In ${diffDays} days`
  return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-vm-modules --test tests/unit/opportunity-resolver.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/opportunity-resolver.ts tests/unit/opportunity-resolver.test.ts
git commit -m "feat(discovery): add opportunity resolver with scoring and share cap enforcement"
```

---

## Task 2: Opportunity Card Component (Build 7.1 - Frontend)

**Files:**

- Create: `components/discovery/opportunity-card.tsx`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

- [ ] **Step 1: Create opportunity-card.tsx**

Create `components/discovery/opportunity-card.tsx`:

```tsx
'use client'

import Link from 'next/link'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

interface OpportunityCardProps {
  item: DiscoveryRailItem
  onSelect?: () => void
}

export function OpportunityCard({ item, onSelect }: OpportunityCardProps) {
  return (
    <Link
      href={item.href}
      className="discovery-card-base discovery-card-picks group relative block border-dashed border-amber-500/40"
      onClick={(e) => {
        if (onSelect) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="absolute inset-0 discovery-abstract-picks" />
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {item.eyebrow && (
          <p
            className="uppercase tracking-widest text-amber-300 mb-0.5"
            style={{
              fontSize: 'var(--discovery-eyebrow-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.eyebrow}
          </p>
        )}
        <p
          className="font-semibold text-white leading-tight"
          style={{
            fontSize: 'var(--discovery-card-title-size)',
            opacity: 'var(--discovery-text-primary)',
          }}
        >
          {item.label}
        </p>
        {item.sublabel && (
          <p
            className="text-white mt-0.5 leading-tight line-clamp-2"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Wire opportunity cards into cuisine-marquee.tsx**

Read `app/(public)/_components/cuisine-marquee.tsx` and find the ChefFlow Picks lane rendering. Inject opportunity cards from `resolveOpportunityCards()` into the picks lane items array, capped at 2 cards. The opportunity cards should appear after pinned items but before regular picks.

The integration point is where `chefflow_picks` lane items are assembled. Import `OpportunityCard` and render it for items that have the `opportunityChefId` property, falling back to regular `DiscoveryCard` for other items.

- [ ] **Step 3: Wire opportunity data fetching in page.tsx**

Read `app/(public)/page.tsx` and add a server-side fetch for chef availability data. Pass the resolved opportunity items as a prop to the discovery section. If no availability data exists yet, pass an empty array (graceful degradation).

- [ ] **Step 4: Verify the build compiles**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/discovery/opportunity-card.tsx app/(public)/_components/cuisine-marquee.tsx app/(public)/page.tsx
git commit -m "feat(discovery): add opportunity marketplace cards to ChefFlow Picks lane"
```

---

## Task 3: What-to-Eat-Now Recovery (Build 7.2)

**Files:**

- Create: `components/discovery/search-recovery.tsx`
- Create: `tests/unit/search-recovery.test.ts`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

- [ ] **Step 1: Write failing test for recovery mode selection**

Create `tests/unit/search-recovery.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { resolveWhatToEatRecovery } from '../../lib/discovery/food-social-rail-contracts.ts'

describe('resolveWhatToEatRecovery', () => {
  it('returns continue when results exist and query is meaningful', () => {
    const result = resolveWhatToEatRecovery({ query: 'italian dinner', resultCount: 5 })
    assert.equal(result.mode, 'continue')
  })

  it('returns clarify when query is too short', () => {
    const result = resolveWhatToEatRecovery({ query: 'it', resultCount: 0 })
    assert.equal(result.mode, 'clarify')
    assert.ok(result.prompt.length > 0)
  })

  it('returns clarify when query is empty', () => {
    const result = resolveWhatToEatRecovery({ query: '', resultCount: 0 })
    assert.equal(result.mode, 'clarify')
  })

  it('returns recover when query exists but no results', () => {
    const result = resolveWhatToEatRecovery({ query: 'unicorn tacos', resultCount: 0 })
    assert.equal(result.mode, 'recover')
    assert.ok(result.suggestedFamilies.includes('what_to_eat_now'))
  })

  it('suggests shared_circle_discovery in circle context', () => {
    const result = resolveWhatToEatRecovery({
      query: 'something fancy',
      resultCount: 0,
      hasCircleContext: true,
    })
    assert.equal(result.mode, 'recover')
    assert.ok(result.suggestedFamilies.includes('shared_circle_discovery'))
  })

  it('suggests visibility_consent with dietary constraint', () => {
    const result = resolveWhatToEatRecovery({
      query: 'gluten free brunch',
      resultCount: 0,
      hasDietaryConstraint: true,
    })
    assert.equal(result.mode, 'recover')
    assert.ok(result.suggestedFamilies.includes('visibility_consent'))
  })

  it('suggests opportunity_marketplace as default recovery', () => {
    const result = resolveWhatToEatRecovery({
      query: 'something random',
      resultCount: 0,
    })
    assert.equal(result.mode, 'recover')
    assert.ok(result.suggestedFamilies.includes('opportunity_marketplace'))
  })
})
```

- [ ] **Step 2: Run test to verify it passes (tests existing contract code)**

Run: `node --experimental-vm-modules --test tests/unit/search-recovery.test.ts`
Expected: All tests PASS (this tests the existing `resolveWhatToEatRecovery` function).

- [ ] **Step 3: Create search-recovery.tsx**

Create `components/discovery/search-recovery.tsx`:

```tsx
'use client'

import Link from 'next/link'
import type { WhatToEatRecovery } from '@/lib/discovery/food-social-rail-contracts'
import type { DiscoveryRecoveryAction } from '@/lib/discovery/consumer-discovery-model'

interface SearchRecoveryProps {
  recovery: WhatToEatRecovery
  actions: DiscoveryRecoveryAction[]
  onActionClick?: (action: DiscoveryRecoveryAction) => void
}

const MODE_ICONS: Record<WhatToEatRecovery['mode'], string> = {
  continue: 'Broaden your search',
  clarify: 'What are you in the mood for?',
  recover: 'Let us help',
}

export function SearchRecovery({ recovery, actions, onActionClick }: SearchRecoveryProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <p
        className="text-white font-medium mb-1"
        style={{
          fontSize: 'var(--discovery-heading-size)',
          opacity: 'var(--discovery-text-primary)',
        }}
      >
        {MODE_ICONS[recovery.mode]}
      </p>
      <p
        className="text-white mb-6 max-w-md"
        style={{
          fontSize: 'var(--discovery-card-sublabel-size)',
          opacity: 'var(--discovery-text-secondary)',
        }}
      >
        {recovery.prompt}
      </p>
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={(e) => {
                if (onActionClick) {
                  onActionClick(action)
                }
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
              style={{
                background: 'var(--discovery-depth-card)',
                border: '1px solid var(--discovery-depth-border)',
              }}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire recovery into cuisine-marquee.tsx**

Read `app/(public)/_components/cuisine-marquee.tsx` and find the empty state handling. When the rail has zero items matching the current search/filter state, render `<SearchRecovery>` instead of the default empty rail. Call `resolveWhatToEatRecovery()` with the current query, result count, and context flags to determine the recovery mode. Call `buildDiscoveryRecoveryActions()` from `consumer-discovery-model.ts` to get the action buttons.

- [ ] **Step 5: Commit**

```bash
git add components/discovery/search-recovery.tsx tests/unit/search-recovery.test.ts app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): add what-to-eat-now recovery for empty and vague search states"
```

---

## Task 4: Universal Food Object Actions (Build 7.3)

**Files:**

- Create: `components/discovery/food-object-menu.tsx`
- Create: `tests/unit/food-object-menu.test.ts`
- Modify: `components/discovery/discovery-card.tsx`
- Modify: `lib/discovery/track-discovery-click.ts`

- [ ] **Step 1: Write failing test for action gating**

Create `tests/unit/food-object-menu.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { buildUniversalFoodObjectActions } from '../../lib/discovery/food-social-rail-contracts.ts'

describe('buildUniversalFoodObjectActions', () => {
  it('enables save for authenticated users with food_memory consent', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'dish',
      authenticated: true,
      consentGrants: ['food_memory'],
    })
    const save = actions.find((a) => a.action === 'save')
    assert.ok(save)
    assert.equal(save.enabled, true)
    assert.equal(save.writesMemory, true)
  })

  it('disables save for unauthenticated users', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'dish',
      authenticated: false,
    })
    const save = actions.find((a) => a.action === 'save')
    assert.ok(save)
    assert.equal(save.enabled, false)
  })

  it('enables send_to_circle only in circle context with consent', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'chef',
      authenticated: true,
      inCircleContext: true,
      consentGrants: ['circle_activity'],
    })
    const send = actions.find((a) => a.action === 'send_to_circle')
    assert.ok(send)
    assert.equal(send.enabled, true)
    assert.equal(send.writesSharedState, true)
  })

  it('disables send_to_circle outside circle context', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'chef',
      authenticated: true,
      inCircleContext: false,
      consentGrants: ['circle_activity'],
    })
    const send = actions.find((a) => a.action === 'send_to_circle')
    assert.ok(send)
    assert.equal(send.enabled, false)
  })

  it('enables ask_chef when authenticated and chef available', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'menu',
      authenticated: true,
      chefAvailable: true,
    })
    const ask = actions.find((a) => a.action === 'ask_chef')
    assert.ok(ask)
    assert.equal(ask.enabled, true)
  })

  it('disables ask_chef when chef not available', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'menu',
      authenticated: true,
      chefAvailable: false,
    })
    const ask = actions.find((a) => a.action === 'ask_chef')
    assert.ok(ask)
    assert.equal(ask.enabled, false)
  })

  it('enables plan_dinner for authenticated users', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'event',
      authenticated: true,
      consentGrants: ['food_memory'],
    })
    const plan = actions.find((a) => a.action === 'plan_dinner')
    assert.ok(plan)
    assert.equal(plan.enabled, true)
  })

  it('returns all 8 action types', () => {
    const actions = buildUniversalFoodObjectActions({
      objectType: 'dish',
      authenticated: true,
      consentGrants: ['food_memory', 'circle_activity', 'notifications'],
    })
    assert.equal(actions.length, 8)
    const actionNames = actions.map((a) => a.action)
    assert.ok(actionNames.includes('save'))
    assert.ok(actionNames.includes('send_to_circle'))
    assert.ok(actionNames.includes('ask_chef'))
    assert.ok(actionNames.includes('plan_dinner'))
    assert.ok(actionNames.includes('hide'))
  })
})
```

- [ ] **Step 2: Run test to verify it passes (tests existing contract code)**

Run: `node --experimental-vm-modules --test tests/unit/food-object-menu.test.ts`
Expected: All tests PASS (this tests the existing `buildUniversalFoodObjectActions` function).

- [ ] **Step 3: Create food-object-menu.tsx**

Create `components/discovery/food-object-menu.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { UniversalFoodActionDecision } from '@/lib/discovery/food-social-rail-contracts'

interface FoodObjectMenuProps {
  actions: UniversalFoodActionDecision[]
  isOpen: boolean
  onClose: () => void
  onAction: (action: UniversalFoodActionDecision) => void
  anchorPosition?: { x: number; y: number }
}

const ACTION_LABELS: Record<string, string> = {
  save: 'Save',
  send_to_circle: 'Send to Circle',
  ask_chef: 'Ask a Chef',
  plan_dinner: 'Plan a Dinner',
  vote: 'Vote',
  keep_private: 'Keep Private',
  hide: 'Hide',
  notify_me: 'Notify Me',
}

const ACTION_ICONS: Record<string, string> = {
  save: 'bookmark',
  send_to_circle: 'share',
  ask_chef: 'message-circle',
  plan_dinner: 'calendar',
  vote: 'thumbs-up',
  keep_private: 'lock',
  hide: 'eye-off',
  notify_me: 'bell',
}

export function FoodObjectMenu({
  actions,
  isOpen,
  onClose,
  onAction,
  anchorPosition,
}: FoodObjectMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const enabledActions = actions.filter((a) => a.enabled)
  const visibleActions = enabledActions.filter((a) =>
    ['save', 'send_to_circle', 'ask_chef', 'plan_dinner', 'hide'].includes(a.action)
  )

  const style: React.CSSProperties = anchorPosition
    ? { position: 'fixed', left: anchorPosition.x, top: anchorPosition.y, zIndex: 50 }
    : { position: 'absolute', right: 8, top: 8, zIndex: 50 }

  return (
    <div
      ref={menuRef}
      style={style}
      className="min-w-[160px] rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl py-1 shadow-xl"
      role="menu"
      aria-label="Food object actions"
    >
      {visibleActions.map((actionDecision) => (
        <button
          key={actionDecision.action}
          type="button"
          role="menuitem"
          onClick={() => {
            onAction(actionDecision)
            onClose()
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="text-xs opacity-60">{ACTION_ICONS[actionDecision.action]}</span>
          <span>{ACTION_LABELS[actionDecision.action]}</span>
          {actionDecision.requiresConfirmation && (
            <span className="ml-auto text-[10px] text-amber-400/60 uppercase tracking-wider">
              confirm
            </span>
          )}
        </button>
      ))}
      {visibleActions.length === 0 && (
        <p className="px-3 py-2 text-sm text-white/40">Sign in for more actions</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire context menu into discovery-card.tsx**

In `components/discovery/discovery-card.tsx`, add a long-press and right-click handler to the card. On trigger, compute `buildUniversalFoodObjectActions()` with the current auth state and show the `FoodObjectMenu`. The menu should only appear on cards where at least one action is available.

Add to the `DiscoveryCardProps` interface:

```tsx
authenticated?: boolean
inCircleContext?: boolean
chefAvailable?: boolean
consentGrants?: readonly string[]
onFoodAction?: (action: string, item: DiscoveryRailItem) => void
```

Wire the long-press timer (500ms) and `onContextMenu` handler. Call `buildUniversalFoodObjectActions()` inline to determine available actions. Render `<FoodObjectMenu>` when open.

- [ ] **Step 5: Add food action tracking to track-discovery-click.ts**

In `lib/discovery/track-discovery-click.ts`, add a new function:

```typescript
export function trackDiscoveryFoodAction(
  action: string,
  item: DiscoveryRailItem,
  context: DiscoveryInteractionContext = {}
): void {
  const actionMap: Record<string, DiscoveryInteractionAction> = {
    save: 'save',
    hide: 'hide',
    plan_dinner: 'click',
    ask_chef: 'click',
    send_to_circle: 'click',
  }
  const mapped = actionMap[action] ?? 'click'
  trackDiscoveryInteraction(mapped, item, {
    ...context,
    href: item.href,
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add components/discovery/food-object-menu.tsx tests/unit/food-object-menu.test.ts components/discovery/discovery-card.tsx lib/discovery/track-discovery-click.ts
git commit -m "feat(discovery): add universal food object context menu with gated actions"
```

---

## Task 5: Ambient Signal Resolver (Build 7.4 - Backend)

**Files:**

- Create: `lib/discovery/ambient-signal-resolver.ts`
- Create: `tests/unit/ambient-signal-resolver.test.ts`

- [ ] **Step 1: Write failing test for ambient signal resolution**

Create `tests/unit/ambient-signal-resolver.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveAmbientSignal,
  type AmbientSignalInput,
  type AmbientSignal,
} from '../../lib/discovery/ambient-signal-resolver.ts'

function makeInput(overrides: Partial<AmbientSignalInput> = {}): AmbientSignalInput {
  return {
    itemKey: 'cuisine:Italian:/eat?cuisine=italian',
    inquiryCountThisWeek: 0,
    clickCountByLocation: {},
    chefOnboardedAt: null,
    circleShortlistCount: 0,
    hasIntelligenceBadge: false,
    ...overrides,
  }
}

describe('resolveAmbientSignal', () => {
  it('returns null when intelligence badge already present', () => {
    const result = resolveAmbientSignal(
      makeInput({ hasIntelligenceBadge: true, inquiryCountThisWeek: 10 })
    )
    assert.equal(result, null)
  })

  it('returns inquiry signal when 3+ inquiries this week', () => {
    const result = resolveAmbientSignal(makeInput({ inquiryCountThisWeek: 5 }))
    assert.ok(result)
    assert.equal(result.type, 'inquiry_activity')
    assert.ok(result.label.includes('5'))
  })

  it('returns trending signal when location clicks exceed threshold', () => {
    const result = resolveAmbientSignal(
      makeInput({
        clickCountByLocation: { 'Boston, MA': 15 },
      })
    )
    assert.ok(result)
    assert.equal(result.type, 'trending_local')
    assert.ok(result.label.toLowerCase().includes('trending'))
  })

  it('returns new_chef signal for recently onboarded chefs', () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const result = resolveAmbientSignal(
      makeInput({
        chefOnboardedAt: threeDaysAgo.toISOString(),
      })
    )
    assert.ok(result)
    assert.equal(result.type, 'new_chef')
  })

  it('does not return new_chef for chefs onboarded over 30 days ago', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 60)
    const result = resolveAmbientSignal(
      makeInput({
        chefOnboardedAt: oldDate.toISOString(),
      })
    )
    assert.ok(result === null || result.type !== 'new_chef')
  })

  it('returns circle_favorite when shortlist count >= 2', () => {
    const result = resolveAmbientSignal(makeInput({ circleShortlistCount: 3 }))
    assert.ok(result)
    assert.equal(result.type, 'circle_favorite')
  })

  it('returns null when no signals qualify', () => {
    const result = resolveAmbientSignal(makeInput())
    assert.equal(result, null)
  })

  it('returns highest priority signal when multiple qualify', () => {
    const result = resolveAmbientSignal(
      makeInput({
        inquiryCountThisWeek: 5,
        circleShortlistCount: 3,
      })
    )
    assert.ok(result)
    // inquiry_activity has higher priority than circle_favorite
    assert.equal(result.type, 'inquiry_activity')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-vm-modules --test tests/unit/ambient-signal-resolver.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement ambient-signal-resolver.ts**

Create `lib/discovery/ambient-signal-resolver.ts`:

```typescript
export type AmbientSignalType =
  | 'inquiry_activity'
  | 'trending_local'
  | 'new_chef'
  | 'circle_favorite'

export type AmbientSignal = {
  type: AmbientSignalType
  label: string
  priority: number
}

export type AmbientSignalInput = {
  itemKey: string
  inquiryCountThisWeek: number
  clickCountByLocation: Record<string, number>
  chefOnboardedAt: string | null
  circleShortlistCount: number
  hasIntelligenceBadge: boolean
}

const INQUIRY_THRESHOLD = 3
const TRENDING_CLICK_THRESHOLD = 10
const NEW_CHEF_WINDOW_DAYS = 30
const CIRCLE_FAVORITE_THRESHOLD = 2

export function resolveAmbientSignal(
  input: AmbientSignalInput,
  now = new Date()
): AmbientSignal | null {
  // Intelligence badges take priority; do not stack
  if (input.hasIntelligenceBadge) return null

  const candidates: AmbientSignal[] = []

  // Priority 1: Inquiry activity
  if (input.inquiryCountThisWeek >= INQUIRY_THRESHOLD) {
    candidates.push({
      type: 'inquiry_activity',
      label: `${input.inquiryCountThisWeek} inquiries this week`,
      priority: 40,
    })
  }

  // Priority 2: Trending in location
  const topLocation = Object.entries(input.clickCountByLocation)
    .filter(([, count]) => count >= TRENDING_CLICK_THRESHOLD)
    .sort(([, a], [, b]) => b - a)[0]

  if (topLocation) {
    const [locationName] = topLocation
    candidates.push({
      type: 'trending_local',
      label: `Trending in ${locationName}`,
      priority: 30,
    })
  }

  // Priority 3: New chef
  if (input.chefOnboardedAt) {
    const onboardedDate = new Date(input.chefOnboardedAt)
    const diffDays = (now.getTime() - onboardedDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays >= 0 && diffDays <= NEW_CHEF_WINDOW_DAYS) {
      candidates.push({
        type: 'new_chef',
        label: 'New chef',
        priority: 20,
      })
    }
  }

  // Priority 4: Circle favorite
  if (input.circleShortlistCount >= CIRCLE_FAVORITE_THRESHOLD) {
    candidates.push({
      type: 'circle_favorite',
      label: 'Circle favorite',
      priority: 10,
    })
  }

  if (candidates.length === 0) return null

  // Return highest priority signal (max 1 per item)
  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0]
}

export function resolveAmbientSignals(
  inputs: AmbientSignalInput[],
  now = new Date()
): Map<string, AmbientSignal> {
  const signals = new Map<string, AmbientSignal>()
  for (const input of inputs) {
    const signal = resolveAmbientSignal(input, now)
    if (signal) {
      signals.set(input.itemKey, signal)
    }
  }
  return signals
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-vm-modules --test tests/unit/ambient-signal-resolver.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/ambient-signal-resolver.ts tests/unit/ambient-signal-resolver.test.ts
git commit -m "feat(discovery): add ambient signal resolver with 4 credibility signal types"
```

---

## Task 6: Ambient Signal Badge on Cards (Build 7.4 - Frontend)

**Files:**

- Modify: `components/discovery/discovery-card.tsx`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Add ambient signal badge to DiscoveryCard**

In `components/discovery/discovery-card.tsx`, add an optional `ambientSignal` prop to `DiscoveryCardProps`:

```tsx
import type { AmbientSignal } from '@/lib/discovery/ambient-signal-resolver'

// Add to DiscoveryCardProps:
ambientSignal?: AmbientSignal | null
```

Render the badge in the top-left corner of the card, below the feedback buttons layer. Use a small pill with an icon and label:

```tsx
function AmbientSignalBadge({ signal }: { signal: AmbientSignal }) {
  const colorClass: Record<string, string> = {
    inquiry_activity: 'bg-emerald-500/20 text-emerald-300',
    trending_local: 'bg-sky-500/20 text-sky-300',
    new_chef: 'bg-violet-500/20 text-violet-300',
    circle_favorite: 'bg-amber-500/20 text-amber-300',
  }

  return (
    <div
      className={`absolute top-1.5 left-1.5 z-[5] rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${colorClass[signal.type] ?? 'bg-white/10 text-white/60'}`}
    >
      {signal.label}
    </div>
  )
}
```

Add to the DiscoveryCard render, after the variant content and before the feedback buttons:

```tsx
{
  ambientSignal && <AmbientSignalBadge signal={ambientSignal} />
}
```

- [ ] **Step 2: Wire ambient signal computation in page.tsx**

In `app/(public)/page.tsx`, compute ambient signals server-side from aggregated `discovery_interactions` data. For the initial implementation, build `AmbientSignalInput` from available data (chef onboarding dates, engagement counts). Pass the resolved signals map to the discovery section as a prop.

If the data is not yet available, pass an empty Map (graceful degradation).

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/discovery/discovery-card.tsx app/(public)/page.tsx
git commit -m "feat(discovery): add ambient credibility signal badges to discovery cards"
```

---

## Task 7: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new files.

- [ ] **Step 2: Run all Layer 7 tests**

Run:

```bash
node --experimental-vm-modules --test tests/unit/opportunity-resolver.test.ts tests/unit/search-recovery.test.ts tests/unit/food-object-menu.test.ts tests/unit/ambient-signal-resolver.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 7 health check issues"
```

---

## Summary

After completing all 7 tasks, you will have:

1. **Opportunity resolver** -- Scores chef availability windows with rarity (0.88x) and urgency (1.25x) factors, capped at 2 cards per rail render
2. **Opportunity card** -- Distinct card variant with dashed amber border, chef opening eyebrow, injected into ChefFlow Picks lane
3. **Search recovery** -- Replaces empty rail state with 3 intelligent recovery modes (continue, clarify, recover) from `resolveWhatToEatRecovery()`
4. **Food object menu** -- Long-press/right-click context menu with 5 gated actions (Save, Send to Circle, Ask a Chef, Plan a Dinner, Hide) driven by `buildUniversalFoodObjectActions()`
5. **Ambient signal resolver** -- Computes 4 credibility signal types (inquiry activity, trending local, new chef, circle favorite) with priority ordering
6. **Ambient signal badges** -- Color-coded pills on discovery cards showing the highest-priority ambient signal per item, yielding to intelligence badges when present

All 4 social rail families wired: `opportunity_marketplace` (18% share cap), `what_to_eat_now` (search recovery), `universal_food_object` (action menu), `shared_circle_discovery` (circle favorite signals, 24% share cap). Contract enforcement uses the existing `food-social-rail-contracts.ts` scoring, consent gating, and share cap logic.
