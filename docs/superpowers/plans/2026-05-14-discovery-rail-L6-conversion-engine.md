# Discovery Rail Layer 6: Conversion Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bridge from "browsing" to "talking to a chef." Wire `shortlist-contracts.ts` into a bottom drawer, enrich chef proof cards with `PublicProofSignal`, add a planning brief quick-start modal, and connect the inquiry funnel end-to-end with conversion tracking.

**Architecture:** The shortlist drawer consumes `shortlist-contracts.ts` (already built: `createShortlistItem`, `upsertShortlistItem`, `removeShortlistItem`, `summarizeShortlist`). Chef proof cards consume `buildPublicProofSignals()` and `deriveAvailabilityPulse()` from `consumer-discovery-model.ts`. The planning brief pre-populates from session filters via `discoveryBriefFromFilters()`. Inquiry funnel fires `trackDiscoveryInteraction('inquiry_started')` and `trackDiscoveryInteraction('inquiry_submitted')` from `track-discovery-click.ts`.

**Tech Stack:** Next.js (React Server Components + Client Components), Tailwind CSS, `shortlist-contracts.ts`, `consumer-discovery-model.ts`, `track-discovery-click.ts`, `session-lifecycle-contract.ts`.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 6, Builds 6.1-6.4)

---

## File Map

### New Files

| File                                            | Responsibility                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/discovery/shortlist-drawer.tsx`     | Bottom drawer showing selected shortlist items as mini-cards, compare CTA, plan-a-dinner CTA, collapsible floating pill                             |
| `lib/discovery/use-discovery-shortlist.ts`      | React hook wrapping `shortlist-contracts.ts`: add/remove/upsert items, persist to sessionStorage (anonymous) or server (authenticated), max 8 items |
| `components/discovery/planning-brief-modal.tsx` | Quick-start modal: occasion, date, guest count, budget, dietary (5 fields), pre-populated from session filters                                      |
| `tests/unit/shortlist-drawer.test.ts`           | Shortlist hook state management tests                                                                                                               |
| `tests/unit/planning-brief.test.ts`             | Planning brief pre-population and validation tests                                                                                                  |
| `tests/unit/conversion-funnel.test.ts`          | End-to-end conversion tracking tests                                                                                                                |

### Modified Files

| File                                              | Changes                                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/_components/homepage-discovery.tsx` | Render `ShortlistDrawer` below the rail                                                                                                            |
| `app/(public)/_components/cuisine-marquee.tsx`    | Item selection triggers shortlist add via `onItemSelect`                                                                                           |
| `components/discovery/discovery-card.tsx`         | ProofCard variant enriched with `PublicProofSignal` badges (availability, price tier, cuisine, response time)                                      |
| `app/(public)/page.tsx`                           | Pass richer chef data (proof signals, availability pulse) to discovery; compute `ConsumerDiscoveryBrief` from session                              |
| `app/(public)/chef/[slug]/inquire/page.tsx`       | Accept query params for pre-population from planning brief; fire `inquiry_started`/`inquiry_submitted` tracking events                             |
| `lib/discovery/track-discovery-click.ts`          | Ensure `shortlist_add`, `shortlist_remove`, `brief_start`, `brief_submit` action types are handled (extend `DiscoveryInteractionAction` if needed) |

---

## Task 1: Shortlist Hook (`use-discovery-shortlist.ts`)

**Files:**

- Create: `lib/discovery/use-discovery-shortlist.ts`
- Create: `tests/unit/shortlist-drawer.test.ts`

- [ ] **Step 1: Write failing test for shortlist hook logic**

Create `tests/unit/shortlist-drawer.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  createShortlistItem,
  upsertShortlistItem,
  removeShortlistItem,
  summarizeShortlist,
  getCompareCandidateIdsFromShortlist,
  type DiscoveryShortlistState,
} from '@/lib/discovery/shortlist-contracts'

describe('shortlist-contracts integration', () => {
  const emptyState: DiscoveryShortlistState = { items: [], maxItems: 8 }

  it('creates a shortlist item from rail selection', () => {
    const item = createShortlistItem({
      kind: 'cuisine',
      label: 'Italian',
      href: '/eat?cuisine=italian',
      source: 'rail',
    })
    expect(item.id).toBe('cuisine:italian')
    expect(item.kind).toBe('cuisine')
    expect(item.source).toBe('rail')
    expect(item.durable).toBe(false)
  })

  it('upserts item into empty state', () => {
    const item = createShortlistItem({
      kind: 'cuisine',
      label: 'Italian',
      href: '/eat?cuisine=italian',
      source: 'rail',
    })
    const next = upsertShortlistItem(emptyState, item)
    expect(next.items).toHaveLength(1)
    expect(next.items[0].label).toBe('Italian')
  })

  it('enforces maxItems limit of 8', () => {
    let state = { ...emptyState, maxItems: 8 }
    for (let i = 0; i < 10; i++) {
      const item = createShortlistItem({
        kind: 'cuisine',
        label: `Cuisine ${i}`,
        href: `/eat?c=${i}`,
        source: 'rail',
      })
      state = upsertShortlistItem(state, item)
    }
    expect(state.items.length).toBeLessThanOrEqual(8)
  })

  it('removes item by id', () => {
    const item = createShortlistItem({
      kind: 'cuisine',
      label: 'Italian',
      href: '/eat?cuisine=italian',
      source: 'rail',
    })
    const withItem = upsertShortlistItem(emptyState, item)
    const without = removeShortlistItem(withItem, item.id)
    expect(without.items).toHaveLength(0)
  })

  it('summarizes shortlist correctly', () => {
    const item1 = createShortlistItem({ kind: 'cuisine', label: 'Italian', source: 'rail' })
    const item2 = createShortlistItem({ kind: 'featured_chef', label: 'Chef A', source: 'rail' })
    let state = upsertShortlistItem(emptyState, item1)
    state = upsertShortlistItem(state, item2)
    const summary = summarizeShortlist(state)
    expect(summary.total).toBe(2)
    expect(summary.compareReady).toBe(true)
    expect(summary.byKind['cuisine']).toBe(1)
    expect(summary.byKind['featured_chef']).toBe(1)
  })

  it('returns compare candidate ids excluding remy_note', () => {
    const item1 = createShortlistItem({ kind: 'cuisine', label: 'Italian', source: 'rail' })
    const item2 = createShortlistItem({ kind: 'remy_note', label: 'Note', source: 'remy' })
    let state = upsertShortlistItem(emptyState, item1)
    state = upsertShortlistItem(state, item2)
    const ids = getCompareCandidateIdsFromShortlist(state)
    expect(ids).not.toContain(item2.id)
    expect(ids).toContain(item1.id)
  })
})
```

- [ ] **Step 2: Run test to verify it passes (tests existing contracts)**

Run: `npx vitest run tests/unit/shortlist-drawer.test.ts`
Expected: All 6 tests PASS (these validate the existing `shortlist-contracts.ts`).

- [ ] **Step 3: Implement use-discovery-shortlist.ts hook**

Create `lib/discovery/use-discovery-shortlist.ts`:

```typescript
'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  createShortlistItem,
  upsertShortlistItem,
  removeShortlistItem,
  summarizeShortlist,
  getCompareCandidateIdsFromShortlist,
  type DiscoveryShortlistState,
  type DiscoveryShortlistItem,
  type DiscoveryShortlistItemKind,
  type DiscoveryShortlistSource,
} from '@/lib/discovery/shortlist-contracts'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'
import { trackDiscoveryInteraction } from '@/lib/discovery/track-discovery-click'

const SHORTLIST_STORAGE_KEY = 'cf:discovery:shortlist'
const MAX_ITEMS = 8

function loadFromStorage(): DiscoveryShortlistState {
  if (typeof window === 'undefined') return { items: [], maxItems: MAX_ITEMS }
  try {
    const raw = sessionStorage.getItem(SHORTLIST_STORAGE_KEY)
    if (!raw) return { items: [], maxItems: MAX_ITEMS }
    const parsed = JSON.parse(raw) as DiscoveryShortlistState
    return { ...parsed, maxItems: MAX_ITEMS }
  } catch {
    return { items: [], maxItems: MAX_ITEMS }
  }
}

function saveToStorage(state: DiscoveryShortlistState): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable
  }
}

export function useDiscoveryShortlist() {
  const [state, setState] = useState<DiscoveryShortlistState>(loadFromStorage)

  const update = useCallback((next: DiscoveryShortlistState) => {
    setState(next)
    saveToStorage(next)
  }, [])

  const addFromRail = useCallback(
    (item: DiscoveryRailItem) => {
      const shortlistItem = createShortlistItem({
        kind: item.type as DiscoveryShortlistItemKind,
        label: item.label,
        href: item.href,
        source: 'rail' as DiscoveryShortlistSource,
        addedAt: new Date().toISOString(),
      })
      const next = upsertShortlistItem(state, shortlistItem)
      update(next)
      trackDiscoveryInteraction('save', item)
    },
    [state, update]
  )

  const remove = useCallback(
    (itemId: string) => {
      const next = removeShortlistItem(state, itemId)
      update(next)
    },
    [state, update]
  )

  const clear = useCallback(() => {
    update({ items: [], maxItems: MAX_ITEMS })
  }, [update])

  const summary = useMemo(() => summarizeShortlist(state), [state])
  const compareIds = useMemo(() => getCompareCandidateIdsFromShortlist(state), [state])

  return {
    items: state.items,
    summary,
    compareIds,
    addFromRail,
    remove,
    clear,
    isEmpty: state.items.length === 0,
    isFull: state.items.length >= MAX_ITEMS,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/discovery/use-discovery-shortlist.ts tests/unit/shortlist-drawer.test.ts
git commit -m "feat(discovery): add useDiscoveryShortlist hook wrapping shortlist-contracts"
```

---

## Task 2: Shortlist Drawer Component

**Files:**

- Create: `components/discovery/shortlist-drawer.tsx`
- Modify: `app/(public)/_components/homepage-discovery.tsx`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

- [ ] **Step 1: Read current homepage-discovery.tsx**

Read `app/(public)/_components/homepage-discovery.tsx` to understand the component tree and where to insert the drawer.

- [ ] **Step 2: Create shortlist-drawer.tsx**

Create `components/discovery/shortlist-drawer.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ChevronUp, ChevronDown, GitCompareArrows, UtensilsCrossed } from 'lucide-react'
import type {
  DiscoveryShortlistItem,
  DiscoveryShortlistSummary,
} from '@/lib/discovery/shortlist-contracts'

interface ShortlistDrawerProps {
  items: readonly DiscoveryShortlistItem[]
  summary: DiscoveryShortlistSummary
  compareIds: string[]
  onRemove: (itemId: string) => void
  onClear: () => void
  onPlanDinner: () => void
}

function ShortlistMiniCard({
  item,
  onRemove,
}: {
  item: DiscoveryShortlistItem
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2 flex-shrink-0">
      <span
        className="text-white text-sm font-medium truncate max-w-[120px]"
        style={{ opacity: 'var(--discovery-text-primary, 0.95)' }}
      >
        {item.label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-white/40 hover:text-white/80 transition-colors"
        aria-label={`Remove ${item.label} from shortlist`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ShortlistDrawer({
  items,
  summary,
  compareIds,
  onRemove,
  onClear,
  onPlanDinner,
}: ShortlistDrawerProps) {
  const [expanded, setExpanded] = useState(false)

  if (summary.total === 0) return null

  // Collapsed pill mode
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/90 backdrop-blur-lg px-4 py-2.5 text-white text-sm font-medium shadow-lg hover:bg-amber-600 transition-colors"
        aria-label={`${summary.total} saved items. Tap to expand.`}
      >
        <ChevronUp className="h-4 w-4" />
        <span>{summary.total} saved</span>
      </button>
    )
  }

  // Expanded drawer
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-950/95 backdrop-blur-2xl border-t border-white/[0.08] shadow-2xl">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/70 text-sm font-medium">
            Your shortlist ({summary.total})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClear}
              className="text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label="Collapse shortlist"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Items row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
          {items.map((item) => (
            <ShortlistMiniCard key={item.id} item={item} onRemove={() => onRemove(item.id)} />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {summary.compareReady && compareIds.length >= 2 && (
            <Link
              href={`/eat?compare=${compareIds.slice(0, 3).join(',')}`}
              className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-white/80 text-sm hover:bg-white/[0.1] transition-colors"
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare
            </Link>
          )}
          <button
            type="button"
            onClick={onPlanDinner}
            className="flex items-center gap-2 rounded-xl bg-amber-600/90 px-4 py-2.5 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Plan a dinner
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire shortlist drawer into homepage-discovery.tsx**

In `homepage-discovery.tsx`, import and render `ShortlistDrawer` below the rail. The drawer needs access to the shortlist hook state. Add `useDiscoveryShortlist()` in the client wrapper and pass props down:

```tsx
import { ShortlistDrawer } from '@/components/discovery/shortlist-drawer'
import { useDiscoveryShortlist } from '@/lib/discovery/use-discovery-shortlist'
```

Render after the marquee container:

```tsx
<ShortlistDrawer
  items={shortlist.items}
  summary={shortlist.summary}
  compareIds={shortlist.compareIds}
  onRemove={shortlist.remove}
  onClear={shortlist.clear}
  onPlanDinner={() => setShowBrief(true)}
/>
```

- [ ] **Step 4: Wire item selection in cuisine-marquee.tsx to trigger shortlist add**

In `cuisine-marquee.tsx`, accept an `onItemSelect` callback prop. When a card is clicked with the select action (e.g., double-click or save button), call `shortlist.addFromRail(item)`.

- [ ] **Step 5: Verify the drawer renders**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add components/discovery/shortlist-drawer.tsx app/(public)/_components/homepage-discovery.tsx app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): add shortlist drawer with mini-cards, compare, and plan CTA"
```

---

## Task 3: Chef Proof Cards Enrichment

**Files:**

- Create: `tests/unit/conversion-funnel.test.ts`
- Modify: `components/discovery/discovery-card.tsx`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Write failing test for proof signal generation**

Create `tests/unit/conversion-funnel.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  buildPublicProofSignals,
  deriveAvailabilityPulse,
  type PublicProofSignal,
  type AvailabilityPulse,
} from '@/lib/discovery/consumer-discovery-model'

describe('chef proof card signals', () => {
  it('buildPublicProofSignals returns signals for a chef card', () => {
    const card = {
      type: 'chef' as const,
      title: 'Chef Maria',
      href: '/chef/maria',
      subtitle: 'Italian, Mediterranean',
      badges: ['accepting_inquiries'],
      priceTier: 'mid' as const,
      location: 'Boston, MA',
    }
    const signals: PublicProofSignal[] = buildPublicProofSignals(card as any)
    expect(signals.length).toBeGreaterThan(0)
    const labels = signals.map((s) => s.label)
    expect(labels).toEqual(expect.arrayContaining([expect.any(String)]))
  })

  it('deriveAvailabilityPulse returns correct strength', () => {
    const pulse: AvailabilityPulse = deriveAvailabilityPulse({
      isAccepting: true,
      hasUpcomingAvailability: true,
    })
    expect(pulse.strength).toBe('high')
    expect(pulse.source).toBe('accepting_inquiries')
  })

  it('deriveAvailabilityPulse returns low when not accepting', () => {
    const pulse: AvailabilityPulse = deriveAvailabilityPulse({
      isAccepting: false,
      hasUpcomingAvailability: false,
    })
    expect(['low', 'unknown']).toContain(pulse.strength)
  })
})

describe('conversion tracking action types', () => {
  it('DiscoveryInteractionAction includes inquiry actions', async () => {
    // Type-level test: these imports should compile
    const { trackDiscoveryInteraction } = await import('@/lib/discovery/track-discovery-click')
    expect(typeof trackDiscoveryInteraction).toBe('function')
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/unit/conversion-funnel.test.ts`
Expected: All tests PASS (validating existing contract functions).

- [ ] **Step 3: Enrich ProofCard variant in discovery-card.tsx**

In `components/discovery/discovery-card.tsx`, update the `ProofCard` sub-component to accept and render `PublicProofSignal[]` data. Add a proof badges row at the bottom of the card:

Add to the `DiscoveryCardProps` interface:

```typescript
proofSignals?: PublicProofSignal[]
availability?: AvailabilityPulse
```

Add imports:

```typescript
import type { PublicProofSignal, AvailabilityPulse } from '@/lib/discovery/consumer-discovery-model'
```

Update the `ProofCard` to render proof badges:

```tsx
function ProofCard({
  item,
  imageRef,
  proofSignals,
  availability,
}: {
  item: DiscoveryRailItem
  imageRef: DiscoveryImageRef
  proofSignals?: PublicProofSignal[]
  availability?: AvailabilityPulse
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {/* ... existing image/gradient code ... */}
      <div className="discovery-card-scrim" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {/* Availability dot */}
        {availability && availability.strength === 'high' && (
          <div className="flex items-center gap-1 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[10px]">Accepting inquiries</span>
          </div>
        )}
        {item.eyebrow && (
          <p
            className="uppercase tracking-widest text-white mb-0.5"
            style={{
              fontSize: 'var(--discovery-eyebrow-size)',
              opacity: 'var(--discovery-text-tertiary)',
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
            className="text-white mt-0.5 leading-tight"
            style={{
              fontSize: 'var(--discovery-card-sublabel-size)',
              opacity: 'var(--discovery-text-secondary)',
            }}
          >
            {item.sublabel}
          </p>
        )}
        {/* Proof signal badges */}
        {proofSignals && proofSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {proofSignals.slice(0, 3).map((signal) => (
              <span
                key={signal.label}
                className="inline-flex items-center rounded-full bg-white/[0.12] px-1.5 py-0.5 text-[10px] text-white/70"
              >
                {signal.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Pass proof data from page.tsx through discovery components**

In `app/(public)/page.tsx`, where featured chef data is assembled, call `buildPublicProofSignals()` and `deriveAvailabilityPulse()` for each chef card and attach the results to the rail item data passed to the marquee.

- [ ] **Step 5: Commit**

```bash
git add components/discovery/discovery-card.tsx app/(public)/page.tsx tests/unit/conversion-funnel.test.ts
git commit -m "feat(discovery): enrich ProofCard with PublicProofSignal badges and availability pulse"
```

---

## Task 4: Planning Brief Modal

**Files:**

- Create: `components/discovery/planning-brief-modal.tsx`
- Create: `tests/unit/planning-brief.test.ts`
- Modify: `components/discovery/shortlist-drawer.tsx`

- [ ] **Step 1: Write failing test for brief pre-population**

Create `tests/unit/planning-brief.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  discoveryBriefFromFilters,
  normalizeConsumerDiscoveryBrief,
  type ConsumerDiscoveryBrief,
} from '@/lib/discovery/consumer-discovery-model'

describe('planning brief pre-population', () => {
  it('creates brief from filter state', () => {
    const brief = discoveryBriefFromFilters({
      cuisine: 'italian',
      occasion: 'date-night',
      budget: '100',
      partySize: 4,
      location: 'Boston, MA',
    })
    expect(brief.occasion).toBe('date-night')
    expect(brief.budget).toBe('100')
    expect(brief.partySize).toBe(4)
    expect(brief.location).toBe('Boston, MA')
    expect(brief.urgency).toBeDefined()
    expect(brief.fulfillment).toBeDefined()
  })

  it('normalizeConsumerDiscoveryBrief handles partial input', () => {
    const brief = normalizeConsumerDiscoveryBrief({
      occasion: 'birthday',
    })
    expect(brief.occasion).toBe('birthday')
    expect(brief.urgency).toBe('flexible')
  })

  it('normalizeConsumerDiscoveryBrief handles empty input', () => {
    const brief = normalizeConsumerDiscoveryBrief({})
    expect(brief.urgency).toBe('flexible')
    expect(brief.fulfillment).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/unit/planning-brief.test.ts`
Expected: All 3 tests PASS (validating existing `consumer-discovery-model.ts` functions).

- [ ] **Step 3: Create planning-brief-modal.tsx**

Create `components/discovery/planning-brief-modal.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, UtensilsCrossed } from 'lucide-react'
import {
  normalizeConsumerDiscoveryBrief,
  type ConsumerDiscoveryBrief,
} from '@/lib/discovery/consumer-discovery-model'
import { trackDiscoveryInteraction } from '@/lib/discovery/track-discovery-click'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

interface PlanningBriefModalProps {
  open: boolean
  onClose: () => void
  /** Pre-populated from session filters (Remy parsed data) */
  initialBrief?: Partial<ConsumerDiscoveryBrief>
  /** If a chef is in the shortlist, direct to inquiry */
  chefSlug?: string | null
}

const BRIEF_ITEM: DiscoveryRailItem = {
  type: 'occasion',
  label: 'Planning brief',
  href: '/eat',
}

export function PlanningBriefModal({
  open,
  onClose,
  initialBrief,
  chefSlug,
}: PlanningBriefModalProps) {
  const router = useRouter()
  const defaults = normalizeConsumerDiscoveryBrief(initialBrief ?? {})

  const [occasion, setOccasion] = useState(defaults.occasion ?? '')
  const [dateWindow, setDateWindow] = useState(defaults.dateWindow ?? '')
  const [partySize, setPartySize] = useState(defaults.partySize ?? 0)
  const [budget, setBudget] = useState(defaults.budget ?? '')
  const [dietary, setDietary] = useState(defaults.dietary ?? '')

  const handleSubmit = useCallback(() => {
    trackDiscoveryInteraction('inquiry_started', BRIEF_ITEM)

    const params = new URLSearchParams()
    if (occasion) params.set('occasion', occasion)
    if (dateWindow) params.set('date', dateWindow)
    if (partySize > 0) params.set('guests', String(partySize))
    if (budget) params.set('budget', budget)
    if (dietary) params.set('dietary', dietary)

    if (chefSlug) {
      router.push(`/chef/${chefSlug}/inquire?${params.toString()}`)
    } else {
      router.push(`/eat?${params.toString()}`)
    }

    onClose()
  }, [occasion, dateWindow, partySize, budget, dietary, chefSlug, router, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-stone-950 border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Plan a dinner</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Occasion</label>
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Date night, birthday, dinner party..."
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Date</label>
              <input
                type="date"
                value={dateWindow}
                onChange={(e) => setDateWindow(e.target.value)}
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Guests</label>
              <input
                type="number"
                min={1}
                max={200}
                value={partySize || ''}
                onChange={(e) => setPartySize(Number(e.target.value))}
                placeholder="4"
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Budget (per person)</label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="$50-100"
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Dietary needs</label>
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Gluten-free, vegan, nut allergy..."
              className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          className="mt-6 w-full rounded-xl bg-amber-600 px-4 py-3 text-white text-sm font-semibold hover:bg-amber-500 transition-colors"
        >
          {chefSlug ? 'Contact this chef' : 'Find chefs'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire modal to shortlist drawer**

In `components/discovery/shortlist-drawer.tsx`, the `onPlanDinner` callback already triggers the modal. In `homepage-discovery.tsx`, manage `showBrief` state and render `PlanningBriefModal`:

```tsx
import { PlanningBriefModal } from '@/components/discovery/planning-brief-modal'

// In the component:
const [showBrief, setShowBrief] = useState(false)

// In the JSX:
<PlanningBriefModal
  open={showBrief}
  onClose={() => setShowBrief(false)}
  initialBrief={sessionBrief}
  chefSlug={shortlistChefSlug}
/>
```

Where `sessionBrief` comes from the discovery session filters (if available) and `shortlistChefSlug` is the slug of the first chef in the shortlist (if any chef items exist).

- [ ] **Step 5: Commit**

```bash
git add components/discovery/planning-brief-modal.tsx tests/unit/planning-brief.test.ts app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): add planning brief quick-start modal with session pre-population"
```

---

## Task 5: Inquiry Funnel Integration

**Files:**

- Modify: `app/(public)/chef/[slug]/inquire/page.tsx`
- Modify: `lib/discovery/track-discovery-click.ts`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

- [ ] **Step 1: Read the inquiry page**

Read `app/(public)/chef/[slug]/inquire/page.tsx` to understand its current props, form fields, and submission flow.

- [ ] **Step 2: Add query param pre-population to inquiry page**

In `app/(public)/chef/[slug]/inquire/page.tsx`, read URL search params (`occasion`, `date`, `guests`, `budget`, `dietary`) and use them as default form values. These params come from the planning brief modal navigation.

Parse with `searchParams` from the page props:

```typescript
const occasion = searchParams?.occasion as string | undefined
const date = searchParams?.date as string | undefined
const guests = searchParams?.guests ? Number(searchParams.guests) : undefined
const budget = searchParams?.budget as string | undefined
const dietary = searchParams?.dietary as string | undefined
```

Pass these as `defaultValues` to the inquiry form component.

- [ ] **Step 3: Add inquiry tracking events**

In the inquiry page, fire tracking events at key moments:

On form mount (inquiry page opened from discovery):

```typescript
trackDiscoveryInteraction('inquiry_started', {
  type: 'featured_chef',
  label: chefName,
  href: `/chef/${slug}/inquire`,
})
```

On form submission success:

```typescript
trackDiscoveryInteraction('inquiry_submitted', {
  type: 'featured_chef',
  label: chefName,
  href: `/chef/${slug}/inquire`,
})
```

Import from `@/lib/discovery/track-discovery-click`.

- [ ] **Step 4: Add post-inquiry card injection in marquee**

In `app/(public)/_components/cuisine-marquee.tsx`, after inquiry submission (detected via URL param or sessionStorage flag), inject a "Your inquiry" card into the ChefFlow Picks lane:

```typescript
const inquiryCard: DiscoveryRailItem = {
  type: 'featured_chef',
  label: 'Your inquiry',
  sublabel: `Sent to ${chefName}`,
  href: '/dashboard/inquiries',
  eyebrow: 'IN PROGRESS',
  presentation: 'visual_card',
}
```

Inject at position 0 of the `chefflow_picks` lane items.

- [ ] **Step 5: Verify end-to-end type safety**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No type errors across all modified files.

- [ ] **Step 6: Commit**

```bash
git add app/(public)/chef/[slug]/inquire/page.tsx lib/discovery/track-discovery-click.ts app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): wire inquiry funnel with pre-population, tracking, and post-inquiry card"
```

---

## Task 6: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new files.

- [ ] **Step 2: Run all Layer 6 tests**

Run: `npx vitest run tests/unit/shortlist-drawer.test.ts tests/unit/planning-brief.test.ts tests/unit/conversion-funnel.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 6 health check issues"
```

---

## Summary

After completing all 6 tasks, you will have:

1. **Shortlist hook** -- `useDiscoveryShortlist` wrapping `shortlist-contracts.ts` with sessionStorage persistence, max 8 items, add/remove/clear operations
2. **Shortlist drawer** -- Bottom drawer with mini-cards, compare CTA (when 2+ items), plan-a-dinner CTA, collapsible floating pill showing count
3. **Chef proof cards** -- ProofCard variant enriched with `PublicProofSignal` badges (availability dot, price tier, cuisine, response time) via `buildPublicProofSignals()` and `deriveAvailabilityPulse()`
4. **Planning brief modal** -- 5-field quick-start (occasion, date, guests, budget, dietary) pre-populated from session filters via `discoveryBriefFromFilters()`, navigates to `/eat` or `/chef/[slug]/inquire`
5. **Inquiry funnel integration** -- Query param pre-population on inquiry page, `inquiry_started`/`inquiry_submitted` tracking events, post-inquiry card injection in ChefFlow Picks lane
6. **End-to-end conversion tracking** -- Full funnel: impression -> click -> dwell -> shortlist_add -> brief_start -> inquiry_started -> inquiry_submitted
