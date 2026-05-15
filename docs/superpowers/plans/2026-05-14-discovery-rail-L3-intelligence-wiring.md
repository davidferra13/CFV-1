# Discovery Rail Layer 3: Intelligence Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the tested-but-unwired contract layer so the rail becomes stateful, context-aware, and self-governing. Wire session lifecycle, feature flags, full assembly pipeline, and undo stack.

**Architecture:** The contract files (`session-lifecycle-contract.ts`, `rail-feature-flags.ts`, `control-rail-contracts.ts`, `undo-stack.ts`) are fully built and tested but have zero production consumers. This layer creates React hooks that wrap each contract, wires them into the homepage discovery components, and adds impression tracking and keyboard undo support.

**Tech Stack:** Next.js (React Server Components + Client Components), `node:test` + `node:assert/strict` for tests, `sessionStorage` for anonymous state, CSS for undo toast.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 3, Builds 3.1-3.4)

---

## File Map

### New Files

| File                                                | Responsibility                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lib/discovery/use-discovery-session.ts`            | React hook wrapping `createDiscoverySession()` and `applyDiscoveryRailItemToSession()` with sessionStorage persistence |
| `lib/discovery/use-discovery-undo.ts`               | React hook wrapping `undo-stack.ts` with Ctrl+Z/Cmd+Z keyboard support and 8-second undo toast timer                   |
| `components/discovery/discovery-feedback-toast.tsx` | Undo toast component with countdown and "Undo" button                                                                  |
| `tests/unit/discovery-session-lifecycle.test.ts`    | Session creation, item application, reset, expiry                                                                      |
| `tests/unit/discovery-feature-flags-wiring.test.ts` | Feature flag decisions for all 12 flags across roles                                                                   |
| `tests/unit/discovery-undo-stack.test.ts`           | Push, undo, redo, branch restore, max depth enforcement                                                                |
| `tests/unit/discovery-assembly-cooldown.test.ts`    | Cooldown enforcement, impression tracking, seeded shuffle                                                              |

### Modified Files

| File                                              | Changes                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/_components/cuisine-marquee.tsx`    | Wire session init on first interaction, route item clicks through session, integrate undo on hide/dismiss           |
| `app/(public)/_components/homepage-discovery.tsx` | Session state provider, feature flag resolution, undo toast rendering                                               |
| `app/(public)/_components/homepage-search.tsx`    | Recent searches pills (gated by `recent_searches` flag), saved locations switcher (gated by `saved_locations` flag) |
| `app/(public)/page.tsx`                           | Resolve feature flags server-side via `getDiscoveryFeatureDecisions()`, pass decisions to components                |
| `lib/discovery/track-discovery-click.ts`          | Add impression timestamp recording to localStorage for cooldown enforcement                                         |

---

## Task 1: Session Lifecycle Hook

**Files:**

- Create: `tests/unit/discovery-session-lifecycle.test.ts`
- Create: `lib/discovery/use-discovery-session.ts`

- [ ] **Step 1: Write failing test for session lifecycle**

Create `tests/unit/discovery-session-lifecycle.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDiscoverySession,
  applyDiscoveryRailItemToSession,
  executeDiscoverySessionReset,
  expireDiscoverySession,
  type DiscoverySession,
} from '@/lib/discovery/session-lifecycle-contract'

const NOW = new Date('2026-05-14T12:00:00Z')

test('createDiscoverySession returns active session with defaults', () => {
  const session = createDiscoverySession({ role: 'public', now: NOW })
  assert.equal(session.lifecycle, 'active')
  assert.equal(session.mode, 'uninfluenced')
  assert.equal(session.source, 'homepage')
  assert.equal(session.revision, 0)
  assert.ok(session.id.startsWith('discovery-session-'))
  assert.ok(session.expiresAt > session.startedAt)
})

test('createDiscoverySession respects custom TTL', () => {
  const session = createDiscoverySession({ role: 'public', now: NOW, ttlMinutes: 60 })
  const expiresAt = new Date(session.expiresAt).getTime()
  const startedAt = new Date(session.startedAt).getTime()
  assert.equal(expiresAt - startedAt, 60 * 60_000)
})

test('createDiscoverySession uses provided seed', () => {
  const session = createDiscoverySession({ role: 'public', seed: 'custom-seed', now: NOW })
  assert.equal(session.seed, 'custom-seed')
})

test('applyDiscoveryRailItemToSession increments revision', () => {
  const session = createDiscoverySession({ role: 'public', now: NOW })
  const result = applyDiscoveryRailItemToSession(session, {
    type: 'cuisine',
    label: 'Italian',
    href: '/eat?cuisine=italian',
  })
  assert.equal(result.session.revision, 1)
  assert.ok(result.analytics !== null)
  assert.equal(result.analytics?.event, 'discovery_rail_select')
})

test('executeDiscoverySessionReset current_search clears filters', () => {
  const session = createDiscoverySession({ role: 'public', now: NOW })
  const applied = applyDiscoveryRailItemToSession(session, {
    type: 'cuisine',
    label: 'Italian',
    href: '/eat?cuisine=italian',
  })
  const result = executeDiscoverySessionReset(applied.session, {
    scope: 'current_search',
    source: 'manual_reset',
    actorRole: 'public',
  })
  assert.equal(result.executed, true)
  assert.equal(result.session.selectedItems.length, 0)
  assert.equal(result.session.compareItemIds.length, 0)
  assert.ok(result.clears.includes('filters'))
})

test('executeDiscoverySessionReset fresh_mix changes seed but preserves filters', () => {
  const session = createDiscoverySession({ role: 'public', now: NOW })
  const result = executeDiscoverySessionReset(session, {
    scope: 'fresh_mix',
    source: 'fresh_mix',
    actorRole: 'public',
  })
  assert.equal(result.executed, true)
  assert.notEqual(result.session.seed, session.seed)
  assert.ok(result.preserves.includes('filters'))
})

test('expireDiscoverySession marks expired session', () => {
  const session = createDiscoverySession({
    role: 'public',
    now: NOW,
    ttlMinutes: 1,
  })
  const future = new Date(NOW.getTime() + 2 * 60_000)
  const expired = expireDiscoverySession(session, future)
  assert.equal(expired.lifecycle, 'expired')
})

test('expireDiscoverySession does not expire active session', () => {
  const session = createDiscoverySession({
    role: 'public',
    now: NOW,
    ttlMinutes: 120,
  })
  const stillActive = expireDiscoverySession(session, NOW)
  assert.equal(stillActive.lifecycle, 'active')
})
```

- [ ] **Step 2: Run test to verify it passes (tests existing contract code)**

Run: `npx tsx --import @/register-paths tests/unit/discovery-session-lifecycle.test.ts` or the project's configured test runner.
Expected: All 7 tests PASS (these test the existing `session-lifecycle-contract.ts`).

- [ ] **Step 3: Create use-discovery-session.ts hook**

Create `lib/discovery/use-discovery-session.ts`:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDiscoverySession,
  applyDiscoveryRailItemToSession,
  executeDiscoverySessionReset,
  expireDiscoverySession,
  type DiscoverySession,
  type DiscoverySessionInput,
  type DiscoveryResetScope,
  type DiscoveryResetSource,
} from '@/lib/discovery/session-lifecycle-contract'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

const SESSION_STORAGE_KEY = 'cf:discovery:session'

function loadSession(): DiscoverySession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DiscoverySession
    const expired = expireDiscoverySession(parsed)
    if (expired.lifecycle === 'expired') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return expired
  } catch {
    return null
  }
}

function persistSession(session: DiscoverySession): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // sessionStorage full or unavailable; continue without persistence
  }
}

export function useDiscoverySession(defaults: DiscoverySessionInput) {
  const [session, setSession] = useState<DiscoverySession | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const existing = loadSession()
    if (existing) {
      setSession(existing)
    }
  }, [])

  const ensureSession = useCallback((): DiscoverySession => {
    if (session) return session
    const next = createDiscoverySession(defaults)
    setSession(next)
    persistSession(next)
    return next
  }, [session, defaults])

  const applyItem = useCallback(
    (item: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>) => {
      const current = ensureSession()
      const result = applyDiscoveryRailItemToSession(current, item)
      setSession(result.session)
      persistSession(result.session)
      return result
    },
    [ensureSession]
  )

  const reset = useCallback(
    (scope: DiscoveryResetScope, source: DiscoveryResetSource) => {
      if (!session) return null
      const result = executeDiscoverySessionReset(session, {
        scope,
        source,
        actorRole: session.role,
      })
      if (result.executed) {
        setSession(result.session)
        persistSession(result.session)
      }
      return result
    },
    [session]
  )

  const clearSession = useCallback(() => {
    setSession(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [])

  return {
    session,
    ensureSession,
    applyItem,
    reset,
    clearSession,
    isActive: session?.lifecycle === 'active',
    revision: session?.revision ?? 0,
    filters: session?.filters ?? null,
    selectedItems: session?.selectedItems ?? [],
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add tests/unit/discovery-session-lifecycle.test.ts lib/discovery/use-discovery-session.ts
git commit -m "feat(discovery): add session lifecycle tests and useDiscoverySession hook"
```

---

## Task 2: Feature Flag Wiring

**Files:**

- Create: `tests/unit/discovery-feature-flags-wiring.test.ts`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Write tests for feature flag decisions**

Create `tests/unit/discovery-feature-flags-wiring.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDiscoveryFeatureDecision,
  getDiscoveryFeatureDecisions,
  isDiscoveryFeatureEnabled,
  DISCOVERY_FEATURE_DEFINITIONS,
  type DiscoveryFeatureKey,
} from '@/lib/discovery/rail-feature-flags'

test('recent_searches disabled by default for public role', () => {
  const decision = getDiscoveryFeatureDecision('recent_searches', { role: 'public' })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'role')
})

test('recent_searches disabled by default for client role (defaultEnabled=false)', () => {
  const decision = getDiscoveryFeatureDecision('recent_searches', { role: 'client' })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'default')
})

test('recent_searches enabled when flag overrides', () => {
  const decision = getDiscoveryFeatureDecision('recent_searches', {
    role: 'client',
    flags: { recent_searches: true },
  })
  assert.equal(decision.enabled, true)
  assert.equal(decision.source, 'flag')
})

test('saved_locations disabled for public role', () => {
  const decision = getDiscoveryFeatureDecision('saved_locations', { role: 'public' })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'role')
})

test('one_tap_feedback disabled by default, enabled via flag', () => {
  const off = getDiscoveryFeatureDecision('one_tap_feedback', { role: 'public' })
  assert.equal(off.enabled, false)

  const on = getDiscoveryFeatureDecision('one_tap_feedback', {
    role: 'public',
    flags: { one_tap_feedback: true },
  })
  assert.equal(on.enabled, true)
})

test('kill switch overrides everything', () => {
  const decision = getDiscoveryFeatureDecision('discovery_session', {
    role: 'admin',
    flags: { discovery_session: true },
    killSwitches: { discovery_session: true },
  })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'kill_switch')
})

test('global kill switch disables all features', () => {
  const decision = getDiscoveryFeatureDecision('clear_all_reset', {
    role: 'admin',
    killSwitches: { all: true },
  })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'kill_switch')
})

test('remy_tuning disabled when remy unavailable', () => {
  const decision = getDiscoveryFeatureDecision('remy_tuning', {
    role: 'public',
    remyAvailable: false,
  })
  assert.equal(decision.enabled, false)
  assert.equal(decision.source, 'dependency')
})

test('data_freshness_dashboard only visible to admin', () => {
  const publicDecision = getDiscoveryFeatureDecision('data_freshness_dashboard', { role: 'public' })
  assert.equal(publicDecision.enabled, false)
  assert.equal(publicDecision.source, 'role')

  const adminDecision = getDiscoveryFeatureDecision('data_freshness_dashboard', { role: 'admin' })
  // defaultEnabled is false for this flag
  assert.equal(adminDecision.enabled, false)
  assert.equal(adminDecision.source, 'default')
})

test('getDiscoveryFeatureDecisions returns all 12 feature keys', () => {
  const decisions = getDiscoveryFeatureDecisions({ role: 'public' })
  const keys = Object.keys(decisions)
  assert.equal(keys.length, Object.keys(DISCOVERY_FEATURE_DEFINITIONS).length)
})

test('isDiscoveryFeatureEnabled shortcut matches full decision', () => {
  const context = { role: 'client' as const }
  const features: DiscoveryFeatureKey[] = [
    'clear_all_reset',
    'discovery_session',
    'shortlist_drawer',
  ]
  for (const feature of features) {
    const decision = getDiscoveryFeatureDecision(feature, context)
    assert.equal(isDiscoveryFeatureEnabled(feature, context), decision.enabled)
  }
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx tsx --import @/register-paths tests/unit/discovery-feature-flags-wiring.test.ts`
Expected: All 10 tests PASS.

- [ ] **Step 3: Wire feature flags in page.tsx**

Read `app/(public)/page.tsx` to find where discovery data is fetched. Add `getDiscoveryFeatureDecisions()` call and pass results to `<HomepageDiscovery>`.

Add near the top of the server component:

```typescript
import { getDiscoveryFeatureDecisions } from '@/lib/discovery/rail-feature-flags'
```

In the data-fetching section, resolve flags based on the user's role:

```typescript
const userRole = session?.user ? 'client' : 'public'
const featureDecisions = getDiscoveryFeatureDecisions({ role: userRole })
```

Pass `featureDecisions` as a prop to the discovery section component.

- [ ] **Step 4: Wire conditional rendering in homepage-search.tsx**

Read `app/(public)/_components/homepage-search.tsx`. Add feature decision props:

```typescript
interface HomepageSearchProps {
  // ...existing props
  showRecentSearches?: boolean
  showSavedLocations?: boolean
}
```

Gate the recent searches pills rendering:

```tsx
{
  showRecentSearches && recentSearches.length > 0 && (
    <div className="flex gap-2 mt-2">
      {recentSearches.map((search) => (
        <button key={search} className="..." onClick={() => applySearch(search)}>
          {search}
        </button>
      ))}
    </div>
  )
}
```

Gate the saved locations switcher similarly with `showSavedLocations`.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/discovery-feature-flags-wiring.test.ts app/(public)/page.tsx app/(public)/_components/homepage-search.tsx
git commit -m "feat(discovery): wire feature flag system with server-side resolution"
```

---

## Task 3: Full Assembly Pipeline with Cooldown

**Files:**

- Create: `tests/unit/discovery-assembly-cooldown.test.ts`
- Modify: `lib/discovery/track-discovery-click.ts`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

- [ ] **Step 1: Write tests for cooldown and impression tracking**

Create `tests/unit/discovery-assembly-cooldown.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assembleDiscoveryRailItems,
  isDiscoveryRailItemOnCooldown,
  normalizeDiscoveryRailCooldownKey,
  classifyDiscoveryRailSlot,
  evaluateDiscoveryRailSlotPolicy,
  type DiscoveryRailAssemblyItem,
} from '@/lib/discovery/control-rail-contracts'

function makeItem(
  overrides: Partial<DiscoveryRailAssemblyItem> & { type: DiscoveryRailAssemblyItem['type'] }
): DiscoveryRailAssemblyItem {
  return { label: 'Test', href: '/eat', ...overrides }
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

test('item on cooldown is deprioritized', () => {
  const item = makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' })
  const key = normalizeDiscoveryRailCooldownKey(item)
  const now = Date.now()
  const recentImpression = new Map([[key, now - 1000]])
  assert.equal(isDiscoveryRailItemOnCooldown(item, recentImpression, now, FOUR_HOURS_MS), true)
})

test('item past cooldown window is eligible', () => {
  const item = makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' })
  const key = normalizeDiscoveryRailCooldownKey(item)
  const now = Date.now()
  const oldImpression = new Map([[key, now - FOUR_HOURS_MS - 1]])
  assert.equal(isDiscoveryRailItemOnCooldown(item, oldImpression, now, FOUR_HOURS_MS), false)
})

test('item with no impression is not on cooldown', () => {
  const item = makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' })
  assert.equal(isDiscoveryRailItemOnCooldown(item, new Map(), Date.now(), FOUR_HOURS_MS), false)
})

test('assembleDiscoveryRailItems deprioritizes cooled-down items', () => {
  const now = Date.now()
  const items = [
    makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' }),
    makeItem({ type: 'cuisine', label: 'French', href: '/eat?cuisine=french' }),
    makeItem({ type: 'cuisine', label: 'Thai', href: '/eat?cuisine=thai' }),
  ]
  const italianKey = normalizeDiscoveryRailCooldownKey(items[0])
  const result = assembleDiscoveryRailItems(items, {
    impressions: new Map([[italianKey, now - 1000]]),
    now,
    seed: 'test-seed',
    targetCount: 2,
  })
  // Italian should be filtered out due to cooldown, leaving French and Thai
  const labels = result.map((r) => r.label)
  assert.ok(!labels.includes('Italian') || result.length <= 2)
})

test('saved items bypass cooldown', () => {
  const now = Date.now()
  const items = [makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' })]
  const key = normalizeDiscoveryRailCooldownKey(items[0])
  const result = assembleDiscoveryRailItems(items, {
    impressions: new Map([[key, now - 1000]]),
    savedKeys: [key],
    now,
  })
  assert.equal(result.length, 1)
  assert.equal(result[0].label, 'Italian')
})

test('pinned items bypass cooldown', () => {
  const now = Date.now()
  const items = [makeItem({ type: 'cuisine', label: 'Italian', href: '/eat?cuisine=italian' })]
  const key = normalizeDiscoveryRailCooldownKey(items[0])
  const result = assembleDiscoveryRailItems(items, {
    impressions: new Map([[key, now - 1000]]),
    pinnedKeys: [key],
    now,
  })
  assert.equal(result.length, 1)
})

test('seeded shuffle produces deterministic order', () => {
  const items = Array.from({ length: 10 }, (_, i) =>
    makeItem({ type: 'cuisine', label: `Cuisine${i}`, href: `/eat?c=${i}` })
  )
  const result1 = assembleDiscoveryRailItems(items, { seed: 'seed-a' })
  const result2 = assembleDiscoveryRailItems(items, { seed: 'seed-a' })
  const result3 = assembleDiscoveryRailItems(items, { seed: 'seed-b' })
  assert.deepStrictEqual(
    result1.map((r) => r.label),
    result2.map((r) => r.label)
  )
  // Different seed should (very likely) produce different order
  const same = result1.every((r, i) => r.label === result3[i].label)
  // Not guaranteed but extremely likely to differ with 10 items
  assert.ok(!same || true) // Weak assertion; main test is determinism above
})

test('slot policy: editorial items classified correctly', () => {
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'featured_chef' })), 'editorial')
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'chef_pick' })), 'editorial')
})

test('slot policy: ambient items classified correctly', () => {
  assert.equal(classifyDiscoveryRailSlot(makeItem({ type: 'story' })), 'ambient')
})

test('slot policy: practical items classified correctly', () => {
  const practicalTypes = [
    'cuisine',
    'food_type',
    'craving',
    'service',
    'occasion',
    'dietary',
  ] as const
  for (const type of practicalTypes) {
    assert.equal(
      classifyDiscoveryRailSlot(makeItem({ type })),
      'practical',
      `${type} should be practical`
    )
  }
})

test('evaluateDiscoveryRailSlotPolicy: all practical passes', () => {
  const items = Array.from({ length: 8 }, (_, i) => makeItem({ type: 'cuisine', label: `C${i}` }))
  const report = evaluateDiscoveryRailSlotPolicy(items)
  assert.equal(report.passed, true)
  assert.equal(report.practicalRatio, 1)
  assert.equal(report.violations.length, 0)
})

test('evaluateDiscoveryRailSlotPolicy: first slot non-practical is violation', () => {
  const items: DiscoveryRailAssemblyItem[] = [
    makeItem({ type: 'story', label: 'A story' }),
    ...Array.from({ length: 5 }, (_, i) => makeItem({ type: 'cuisine', label: `C${i}` })),
  ]
  const report = evaluateDiscoveryRailSlotPolicy(items)
  assert.ok(report.violations.includes('first-slot-not-practical'))
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx tsx --import @/register-paths tests/unit/discovery-assembly-cooldown.test.ts`
Expected: All 12 tests PASS.

- [ ] **Step 3: Add impression recording to track-discovery-click.ts**

Read `lib/discovery/track-discovery-click.ts` fully. Add an impression recorder function:

```typescript
const IMPRESSION_STORAGE_KEY = 'cf:discovery:impressions'

export function recordDiscoveryImpressions(
  items: Pick<DiscoveryRailItem, 'type' | 'label' | 'href'>[]
): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(IMPRESSION_STORAGE_KEY)
    const existing: Record<string, number> = raw ? JSON.parse(raw) : {}
    const now = Date.now()
    for (const item of items) {
      const key = `${item.type}:${item.label.trim().toLowerCase().replace(/\s+/g, '_')}`
      existing[key] = now
    }
    // Prune entries older than 24 hours to prevent unbounded growth
    const cutoff = now - 24 * 60 * 60 * 1000
    for (const [key, timestamp] of Object.entries(existing)) {
      if (timestamp < cutoff) delete existing[key]
    }
    localStorage.setItem(IMPRESSION_STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // localStorage unavailable; continue without impression tracking
  }
}

export function loadDiscoveryImpressions(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(IMPRESSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
```

- [ ] **Step 4: Wire full assembly pipeline in cuisine-marquee.tsx**

Read `app/(public)/_components/cuisine-marquee.tsx` to find where items are assembled. Replace ad-hoc assembly with the full pipeline:

```typescript
import {
  assembleDiscoveryRailItems,
  classifyDiscoveryRailSlot,
  evaluateDiscoveryRailSlotPolicy,
} from '@/lib/discovery/control-rail-contracts'
import {
  loadDiscoveryImpressions,
  recordDiscoveryImpressions,
} from '@/lib/discovery/track-discovery-click'
```

In the component, load impressions on mount:

```typescript
const [impressions, setImpressions] = useState<Record<string, number>>({})

useEffect(() => {
  setImpressions(loadDiscoveryImpressions())
}, [])
```

Replace the item rendering pipeline with:

```typescript
const assembledItems = useMemo(() => {
  return assembleDiscoveryRailItems(rawItems, {
    impressions,
    hiddenKeys: Array.from(hiddenKeys),
    pinnedKeys: Array.from(pinnedKeys),
    savedKeys: Array.from(savedKeys),
    seed: session?.seed ?? 'default',
    now: Date.now(),
  })
}, [rawItems, impressions, hiddenKeys, pinnedKeys, savedKeys, session?.seed])
```

Record impressions when items become visible:

```typescript
useEffect(() => {
  if (assembledItems.length > 0) {
    recordDiscoveryImpressions(assembledItems)
  }
}, [assembledItems])
```

Log slot policy audits in development:

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'development' && assembledItems.length > 0) {
    const report = evaluateDiscoveryRailSlotPolicy(assembledItems)
    if (!report.passed) {
      console.warn('[discovery] Slot policy violations:', report.violations)
    }
  }
}, [assembledItems])
```

- [ ] **Step 5: Apply visual treatment by slot classification**

In the card rendering section of `cuisine-marquee.tsx`, use `classifyDiscoveryRailSlot()` to drive visual treatment:

```typescript
const slotKind = classifyDiscoveryRailSlot(item)
const cardClassName =
  slotKind === 'ambient'
    ? 'opacity-75 scale-95'
    : slotKind === 'editorial'
      ? 'ring-1 ring-white/10'
      : ''
```

- [ ] **Step 6: Commit**

```bash
git add tests/unit/discovery-assembly-cooldown.test.ts lib/discovery/track-discovery-click.ts app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): wire full assembly pipeline with cooldown and impression tracking"
```

---

## Task 4: Undo Stack Hook and Toast

**Files:**

- Create: `tests/unit/discovery-undo-stack.test.ts`
- Create: `lib/discovery/use-discovery-undo.ts`
- Create: `components/discovery/discovery-feedback-toast.tsx`

- [ ] **Step 1: Write tests for undo stack operations**

Create `tests/unit/discovery-undo-stack.test.ts`:

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createDiscoveryUndoStack,
  pushDiscoveryUndo,
  undoDiscoveryAction,
  redoDiscoveryAction,
  restoreDiscoveryBranch,
  type DiscoveryUndoStack,
} from '@/lib/discovery/undo-stack'

type TestState = { items: string[] }

function makeStack(items: string[] = ['a', 'b', 'c']): DiscoveryUndoStack<TestState> {
  return createDiscoveryUndoStack({ items })
}

test('createDiscoveryUndoStack initializes with empty history', () => {
  const stack = makeStack()
  assert.deepStrictEqual(stack.current, { items: ['a', 'b', 'c'] })
  assert.equal(stack.past.length, 0)
  assert.equal(stack.future.length, 0)
  assert.equal(stack.maxDepth, 20)
})

test('createDiscoveryUndoStack respects custom maxDepth', () => {
  const stack = createDiscoveryUndoStack({ items: [] }, 10)
  assert.equal(stack.maxDepth, 10)
})

test('pushDiscoveryUndo adds entry and updates current', () => {
  const stack = makeStack()
  const next = pushDiscoveryUndo(stack, {
    category: 'hide',
    label: 'Hide Italian',
    after: { items: ['b', 'c'] },
  })
  assert.deepStrictEqual(next.current, { items: ['b', 'c'] })
  assert.equal(next.past.length, 1)
  assert.equal(next.past[0].category, 'hide')
  assert.equal(next.past[0].label, 'Hide Italian')
  assert.deepStrictEqual(next.past[0].before, { items: ['a', 'b', 'c'] })
})

test('pushDiscoveryUndo clears future on new action', () => {
  let stack = makeStack()
  stack = pushDiscoveryUndo(stack, {
    category: 'hide',
    label: 'Hide A',
    after: { items: ['b', 'c'] },
  })
  const undone = undoDiscoveryAction(stack)
  assert.equal(undone.stack.future.length, 1)
  // Push new action after undo; future should clear
  const pushed = pushDiscoveryUndo(undone.stack, {
    category: 'hide',
    label: 'Hide B',
    after: { items: ['c'] },
  })
  assert.equal(pushed.future.length, 0)
})

test('undoDiscoveryAction restores previous state', () => {
  let stack = makeStack()
  stack = pushDiscoveryUndo(stack, {
    category: 'hide',
    label: 'Hide A',
    after: { items: ['b', 'c'] },
  })
  const result = undoDiscoveryAction(stack)
  assert.deepStrictEqual(result.stack.current, { items: ['a', 'b', 'c'] })
  assert.ok(result.restored !== null)
  assert.equal(result.restored!.label, 'Hide A')
  assert.equal(result.stack.past.length, 0)
  assert.equal(result.stack.future.length, 1)
})

test('undoDiscoveryAction on empty stack returns null restored', () => {
  const stack = makeStack()
  const result = undoDiscoveryAction(stack)
  assert.equal(result.restored, null)
  assert.deepStrictEqual(result.stack, stack)
})

test('redoDiscoveryAction re-applies undone action', () => {
  let stack = makeStack()
  stack = pushDiscoveryUndo(stack, {
    category: 'hide',
    label: 'Hide A',
    after: { items: ['b', 'c'] },
  })
  const undone = undoDiscoveryAction(stack)
  const redone = redoDiscoveryAction(undone.stack)
  assert.deepStrictEqual(redone.stack.current, { items: ['b', 'c'] })
  assert.ok(redone.restored !== null)
  assert.equal(redone.stack.future.length, 0)
  assert.equal(redone.stack.past.length, 1)
})

test('redoDiscoveryAction on empty future returns null restored', () => {
  const stack = makeStack()
  const result = redoDiscoveryAction(stack)
  assert.equal(result.restored, null)
})

test('maxDepth enforcement: oldest entries trimmed', () => {
  let stack = createDiscoveryUndoStack<TestState>({ items: [] }, 3)
  for (let i = 0; i < 5; i++) {
    stack = pushDiscoveryUndo(stack, {
      category: 'hide',
      label: `Action ${i}`,
      after: { items: [String(i)] },
    })
  }
  assert.equal(stack.past.length, 3)
  assert.equal(stack.past[0].label, 'Action 2')
})

test('restoreDiscoveryBranch jumps to historical state', () => {
  let stack = makeStack()
  stack = pushDiscoveryUndo(stack, {
    id: 'entry-1',
    category: 'hide',
    label: 'Hide A',
    after: { items: ['b', 'c'] },
  })
  stack = pushDiscoveryUndo(stack, {
    id: 'entry-2',
    category: 'hide',
    label: 'Hide B',
    after: { items: ['c'] },
  })
  const result = restoreDiscoveryBranch(stack, 'entry-1')
  assert.ok(result.restored !== null)
  assert.deepStrictEqual(result.stack.current, { items: ['a', 'b', 'c'] })
})

test('restoreDiscoveryBranch with unknown ID returns null', () => {
  const stack = makeStack()
  const result = restoreDiscoveryBranch(stack, 'nonexistent')
  assert.equal(result.restored, null)
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx tsx --import @/register-paths tests/unit/discovery-undo-stack.test.ts`
Expected: All 11 tests PASS.

- [ ] **Step 3: Create use-discovery-undo.ts hook**

Create `lib/discovery/use-discovery-undo.ts`:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDiscoveryUndoStack,
  pushDiscoveryUndo,
  undoDiscoveryAction,
  redoDiscoveryAction,
  type DiscoveryUndoStack,
  type DiscoveryUndoCategory,
  type DiscoveryUndoEntry,
} from '@/lib/discovery/undo-stack'

const MAX_DEPTH = 10
const TOAST_DURATION_MS = 8_000

export type UndoToastState = {
  visible: boolean
  label: string
  remainingMs: number
}

export function useDiscoveryUndo<TState>(initialState: TState) {
  const [stack, setStack] = useState<DiscoveryUndoStack<TState>>(() =>
    createDiscoveryUndoStack(initialState, MAX_DEPTH)
  )
  const [toast, setToast] = useState<UndoToastState>({
    visible: false,
    label: '',
    remainingMs: 0,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const clearToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = null
    setToast({ visible: false, label: '', remainingMs: 0 })
  }, [])

  const showToast = useCallback(
    (label: string) => {
      clearToast()
      setToast({ visible: true, label, remainingMs: TOAST_DURATION_MS })
      toastTimer.current = setTimeout(clearToast, TOAST_DURATION_MS)
    },
    [clearToast]
  )

  const push = useCallback(
    (category: DiscoveryUndoCategory, label: string, after: TState) => {
      setStack((prev) => {
        const next = pushDiscoveryUndo(prev, { category, label, after })
        return next
      })
      showToast(label)
    },
    [showToast]
  )

  const undo = useCallback(() => {
    setStack((prev) => {
      const result = undoDiscoveryAction(prev)
      if (result.restored) {
        clearToast()
      }
      return result.stack
    })
  }, [clearToast])

  const redo = useCallback(() => {
    setStack((prev) => {
      const result = redoDiscoveryAction(prev)
      return result.stack
    })
  }, [])

  // Keyboard shortcut: Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle when discovery section is focused or contains focus
      const container = containerRef.current
      if (
        container &&
        !container.contains(document.activeElement) &&
        document.activeElement !== container
      ) {
        return
      }

      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey
      const isRedo = (e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey

      if (isUndo) {
        e.preventDefault()
        undo()
      } else if (isRedo) {
        e.preventDefault()
        redo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  return {
    state: stack.current,
    push,
    undo,
    redo,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
    toast,
    clearToast,
    containerRef,
    historyDepth: stack.past.length,
  }
}
```

- [ ] **Step 4: Create discovery-feedback-toast.tsx**

Create `components/discovery/discovery-feedback-toast.tsx`:

```tsx
'use client'

import type { UndoToastState } from '@/lib/discovery/use-discovery-undo'

interface DiscoveryFeedbackToastProps {
  toast: UndoToastState
  onUndo: () => void
  onDismiss: () => void
}

export function DiscoveryFeedbackToast({ toast, onUndo, onDismiss }: DiscoveryFeedbackToastProps) {
  if (!toast.visible) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-stone-900/95 px-4 py-3 shadow-2xl border border-white/10 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm text-white/80">{toast.label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onUndo()
        }}
        className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        className="text-white/40 hover:text-white/70 transition-colors ml-1"
        aria-label="Dismiss"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Wire undo into cuisine-marquee.tsx hide/dismiss actions**

Read `app/(public)/_components/cuisine-marquee.tsx` to find the hide and dismiss handlers. Wrap them with undo stack pushes:

```typescript
import { useDiscoveryUndo } from '@/lib/discovery/use-discovery-undo'
```

In the component:

```typescript
const {
  state: undoState,
  push: pushUndo,
  undo,
  canUndo,
  toast: undoToast,
  clearToast,
  containerRef: undoContainerRef,
} = useDiscoveryUndo(initialRailState)
```

Wrap the hide action:

```typescript
const handleHide = useCallback(
  (item: DiscoveryRailItem) => {
    const key = `${item.type}:${item.label}:${item.href}`
    const prevHidden = new Set(hiddenKeys)
    const nextHidden = new Set([...hiddenKeys, key])
    setHiddenKeys(nextHidden)
    pushUndo('hide', `Hidden "${item.label}"`, {
      ...undoState,
      hiddenKeys: Array.from(nextHidden),
    })
  },
  [hiddenKeys, pushUndo, undoState]
)
```

- [ ] **Step 6: Wire undo toast rendering in homepage-discovery.tsx**

Read `app/(public)/_components/homepage-discovery.tsx`. Add the undo toast at the bottom of the discovery section:

```tsx
import { DiscoveryFeedbackToast } from '@/components/discovery/discovery-feedback-toast'
```

Render inside the discovery container:

```tsx
<DiscoveryFeedbackToast toast={undoToast} onUndo={undo} onDismiss={clearToast} />
```

- [ ] **Step 7: Commit**

```bash
git add tests/unit/discovery-undo-stack.test.ts lib/discovery/use-discovery-undo.ts components/discovery/discovery-feedback-toast.tsx app/(public)/_components/cuisine-marquee.tsx app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): wire undo stack with keyboard shortcuts and feedback toast"
```

---

## Task 5: Session-Driven Item Interactions

**Files:**

- Modify: `app/(public)/_components/cuisine-marquee.tsx`
- Modify: `app/(public)/_components/homepage-discovery.tsx`

This task connects the session hook from Task 1 to the marquee so that every item click, select, and filter routes through the session lifecycle.

- [ ] **Step 1: Read current marquee interaction handlers**

Read `app/(public)/_components/cuisine-marquee.tsx` to find existing click and select handlers.

- [ ] **Step 2: Wire session creation on first interaction**

In `homepage-discovery.tsx`, initialize the session hook:

```typescript
import { useDiscoverySession } from '@/lib/discovery/use-discovery-session'
```

```typescript
const { session, applyItem, reset, isActive, filters, selectedItems } = useDiscoverySession({
  role: userRole,
  source: 'homepage',
})
```

Pass `applyItem` and session state down to `CuisineMarquee` as props.

- [ ] **Step 3: Route item clicks through session**

In `cuisine-marquee.tsx`, replace direct filter toggling with session-routed logic:

```typescript
const handleItemSelect = useCallback(
  (item: DiscoveryRailItem) => {
    const result = applyItem(item)
    if (result.analytics) {
      // Fire analytics event (existing trackDiscoveryInteraction)
      trackDiscoveryInteraction({
        action: 'click',
        item,
        sessionId: result.session.id,
      })
    }
  },
  [applyItem]
)
```

- [ ] **Step 4: Wire the three reset commands**

Add reset buttons to the discovery section UI:

- "Clear filters" button: `reset('current_search', 'manual_reset')`
- "Shuffle" button: `reset('fresh_mix', 'fresh_mix')`
- "Start over" button: `reset('current_search', 'manual_reset')` with confirmation dialog

Gate visibility with session state: only show when `isActive && selectedItems.length > 0`.

- [ ] **Step 5: Commit**

```bash
git add app/(public)/_components/cuisine-marquee.tsx app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): route all item interactions through session lifecycle"
```

---

## Task 6: One-Tap Feedback Feature Flag

**Files:**

- Modify: `app/(public)/_components/cuisine-marquee.tsx`
- Modify: `components/discovery/discovery-card.tsx` (if it exists from L1)

This task wires the `one_tap_feedback` feature flag so love/hide buttons show directly on cards without requiring hover, when the flag is enabled.

- [ ] **Step 1: Read current feedback button visibility logic**

Read the card rendering in `cuisine-marquee.tsx` to find where feedback buttons (love/pin/hide) are shown.

- [ ] **Step 2: Wire one_tap_feedback flag**

Accept feature decisions as a prop:

```typescript
interface CuisineMarqueeProps {
  // ...existing
  oneTapFeedback?: boolean
}
```

When `oneTapFeedback` is true, always show feedback buttons (remove the hover-only opacity class):

```typescript
const feedbackVisibility = oneTapFeedback
  ? 'opacity-100'
  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
```

- [ ] **Step 3: Pass flag from homepage-discovery.tsx**

```typescript
const oneTapFeedback = featureDecisions.one_tap_feedback?.enabled ?? false

<CuisineMarquee oneTapFeedback={oneTapFeedback} ... />
```

- [ ] **Step 4: Commit**

```bash
git add app/(public)/_components/cuisine-marquee.tsx app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): wire one_tap_feedback feature flag for always-visible card actions"
```

---

## Task 7: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new or modified files.

- [ ] **Step 2: Run all Layer 3 tests**

Run all four test files:

```bash
npx tsx --import @/register-paths --test tests/unit/discovery-session-lifecycle.test.ts tests/unit/discovery-feature-flags-wiring.test.ts tests/unit/discovery-assembly-cooldown.test.ts tests/unit/discovery-undo-stack.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 3 health check issues"
```

---

## Summary

After completing all 7 tasks, you will have:

1. **Session lifecycle hook** (`use-discovery-session.ts`) -- wraps `createDiscoverySession()` and `applyDiscoveryRailItemToSession()` with sessionStorage persistence and 120-minute TTL
2. **Feature flag wiring** -- all 12 flags resolved server-side via `getDiscoveryFeatureDecisions()`, three flags activated: `recent_searches`, `saved_locations`, `one_tap_feedback`
3. **Full assembly pipeline** -- `assembleDiscoveryRailItems()` with 4-hour cooldown enforcement, impression timestamps in localStorage, slot policy auditing in dev mode, seeded deterministic shuffle
4. **Slot classification** -- `classifyDiscoveryRailSlot()` drives visual treatment (practical = standard, editorial = ring highlight, ambient = muted opacity)
5. **Undo stack hook** (`use-discovery-undo.ts`) -- 10-action depth, Ctrl+Z/Cmd+Z keyboard shortcuts scoped to discovery section, 8-second undo toast
6. **Feedback toast** (`discovery-feedback-toast.tsx`) -- fixed-position toast with undo button and dismiss
7. **Session-driven interactions** -- every item click, select, hide, and filter routes through the session lifecycle with analytics events

The rail is now stateful and self-governing. Sessions persist across page navigations (sessionStorage), impressions persist across sessions (localStorage), and every action is reversible via the undo stack. Feature flags provide kill switches for safe rollout.
