# Discovery Rail Layer 5: Personalization Surface

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the scoring intelligence visible to users. "Why This?" tooltips explain card placement, a Taste Passport strip surfaces learned preferences, a debug scoring overlay helps admins tune the algorithm, and a preference learning feedback loop closes the personalization cycle.

**Architecture:** Layer 5 reads from the existing scoring engine (`discovery-rail-scoring.ts`), user scroll signals (`user-scroll-signals.ts`), feature flags (`rail-feature-flags.ts`), and click tracking (`track-discovery-click.ts`). The `debugScore.reason` field already attached to every scored item powers the "Why This?" tooltip. The `UserScrollSignals` type already carries `boostedCuisines`, `boostedServiceTypes`, `rankedPreferences`, and `hasHistory`, which power the Taste Passport. The `data_freshness_dashboard` feature flag (admin-only) gates the scoring transparency overlay. Interaction counts from `trackDiscoveryInteraction()` drive the learning feedback loop indicators.

**Tech Stack:** Next.js (React Server Components + Client Components), Tailwind CSS, CSS custom properties, `node:test` + `node:assert/strict` for tests.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 5, Builds 5.1-5.4)

**Dependencies:** Layer 4 Build 15 (Silent Intelligence Badges) for Builds 5.1 and 5.3. Layer 3 Build 10 (Feature Flag System) for Build 5.2. Builds 5.1 + 5.2 for Build 5.4.

---

## File Map

### New Files

| File                                            | Responsibility                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `components/discovery/why-this-tooltip.tsx`     | Tooltip component showing scoring reason on hover/long-press           |
| `components/discovery/taste-passport-strip.tsx` | Compact preference summary strip above the rail                        |
| `lib/discovery/reason-humanizer.ts`             | Translates `debugScore.reason` strings into user-friendly explanations |
| `lib/discovery/interaction-counter.ts`          | Counts session/cross-session interactions for learning indicators      |
| `tests/unit/reason-humanizer.test.ts`           | Reason humanizer coverage                                              |
| `tests/unit/interaction-counter.test.ts`        | Interaction counter thresholds                                         |
| `tests/unit/taste-passport-strip.test.ts`       | Taste passport data shaping                                            |
| `tests/unit/scoring-transparency.test.ts`       | Debug score overlay logic                                              |

### Modified Files

| File                                              | Changes                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `components/discovery/discovery-card.tsx`         | Add info icon trigger for WhyThisTooltip, add debug score overlay slot, add learning reorder animation class |
| `app/(public)/_components/homepage-discovery.tsx` | Render TastePassportStrip between search and rail, render learning indicators on rail header                 |
| `app/(public)/page.tsx`                           | Pass `userScrollSignals` and interaction count to discovery components                                       |
| `app/(public)/_components/cuisine-marquee.tsx`    | Wire live reordering on love/hate feedback, wire learning indicators                                         |
| `lib/discovery/rail-feature-flags.ts`             | No changes needed; `data_freshness_dashboard` already defined as admin-only                                  |

---

## Task 1: Reason Humanizer

**Files:**

- Create: `lib/discovery/reason-humanizer.ts`
- Create: `tests/unit/reason-humanizer.test.ts`

This task translates the internal `debugScore.reason` strings from `discovery-rail-scoring.ts` into friendly, user-facing explanations for the "Why This?" tooltip.

- [ ] **Step 1: Write failing test**

Create `tests/unit/reason-humanizer.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { humanizeScoreReason } from '@/lib/discovery/reason-humanizer'

describe('humanizeScoreReason', () => {
  it('translates learned cuisine signal', () => {
    const result = humanizeScoreReason('Matched learned cuisine signal', 'Italian')
    assert.equal(result, 'Based on your Italian cuisine interest')
  })

  it('translates learned service signal', () => {
    const result = humanizeScoreReason('Matched learned service signal', 'Meal Prep')
    assert.equal(result, 'Based on your Meal Prep service interest')
  })

  it('translates seasonal discovery boost', () => {
    const result = humanizeScoreReason('Boosted by seasonal discovery', 'Spring Vegetables')
    assert.equal(result, 'Seasonal peak: these ingredients are at their best right now')
  })

  it('translates location boost', () => {
    const result = humanizeScoreReason('Boosted by current location', 'Near Me')
    assert.equal(result, 'Trending in your area this week')
  })

  it('translates social dining boost', () => {
    const result = humanizeScoreReason('Boosted as social dining discovery', 'Dinner Circle')
    assert.equal(result, 'Popular with diners like you')
  })

  it('translates suppressed feedback', () => {
    const result = humanizeScoreReason('Suppressed by less-like-this feedback', 'Sushi')
    assert.equal(result, 'Showing less of this based on your feedback')
  })

  it('translates negative learned signal', () => {
    const result = humanizeScoreReason('Demoted by learned cuisine signal', 'Thai')
    assert.equal(result, 'Ranked lower based on your past preferences')
  })

  it('falls back to discovery mix for editorial', () => {
    const result = humanizeScoreReason('Editorial discovery mix', 'Random Item')
    assert.equal(result, 'Random discovery pick')
  })

  it('handles unknown reason gracefully', () => {
    const result = humanizeScoreReason('Some unknown internal reason', 'Item')
    assert.equal(result, 'Recommended for you')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/reason-humanizer.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement reason-humanizer.ts**

Create `lib/discovery/reason-humanizer.ts`:

```typescript
/**
 * Translates internal debugScore.reason strings from the scoring engine
 * into user-friendly explanations for the "Why This?" tooltip.
 *
 * Source reasons come from buildReason() in discovery-rail-scoring.ts.
 */

const REASON_PATTERNS: Array<{
  match: RegExp | string
  humanize: (label: string, matchGroups?: RegExpMatchArray) => string
}> = [
  {
    match: /^Matched learned (\w+) signal$/,
    humanize: (label, groups) => {
      const signalType = groups?.[1] ?? 'discovery'
      return `Based on your ${label} ${signalType} interest`
    },
  },
  {
    match: 'Boosted by seasonal discovery',
    humanize: () => 'Seasonal peak: these ingredients are at their best right now',
  },
  {
    match: 'Boosted by current location',
    humanize: () => 'Trending in your area this week',
  },
  {
    match: 'Boosted as social dining discovery',
    humanize: () => 'Popular with diners like you',
  },
  {
    match: 'Suppressed by less-like-this feedback',
    humanize: () => 'Showing less of this based on your feedback',
  },
  {
    match: /^Demoted by learned/,
    humanize: () => 'Ranked lower based on your past preferences',
  },
  {
    match: 'Editorial discovery mix',
    humanize: () => 'Random discovery pick',
  },
]

const DEFAULT_REASON = 'Recommended for you'

export function humanizeScoreReason(internalReason: string, itemLabel: string): string {
  for (const pattern of REASON_PATTERNS) {
    if (typeof pattern.match === 'string') {
      if (internalReason === pattern.match) {
        return pattern.humanize(itemLabel)
      }
    } else {
      const groups = internalReason.match(pattern.match)
      if (groups) {
        return pattern.humanize(itemLabel, groups)
      }
    }
  }
  return DEFAULT_REASON
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test tests/unit/reason-humanizer.test.ts`
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/reason-humanizer.ts tests/unit/reason-humanizer.test.ts
git commit -m "feat(discovery): add reason humanizer for Why This tooltips"
```

---

## Task 2: "Why This?" Tooltip Component

**Files:**

- Create: `components/discovery/why-this-tooltip.tsx`
- Modify: `components/discovery/discovery-card.tsx`

- [ ] **Step 1: Create why-this-tooltip.tsx**

Create `components/discovery/why-this-tooltip.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import type { HomepageDiscoveryLane } from '@/lib/discovery/homepage-discovery-rail'
import type { DiscoveryRailDebugScore } from '@/lib/discovery/discovery-rail-scoring'
import { humanizeScoreReason } from '@/lib/discovery/reason-humanizer'

const LANE_TOOLTIP_BORDER: Record<HomepageDiscoveryLane, string> = {
  taste: 'border-amber-500/40',
  occasion: 'border-emerald-500/40',
  chefflow_picks: 'border-violet-500/40',
}

const LANE_TOOLTIP_BG: Record<HomepageDiscoveryLane, string> = {
  taste: 'bg-amber-950/90',
  occasion: 'bg-emerald-950/90',
  chefflow_picks: 'bg-violet-950/90',
}

interface WhyThisTooltipProps {
  debugScore: DiscoveryRailDebugScore | undefined
  itemLabel: string
  lane: HomepageDiscoveryLane
}

export function WhyThisTooltip({ debugScore, itemLabel, lane }: WhyThisTooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!debugScore) return null

  const reason = humanizeScoreReason(debugScore.reason, itemLabel)
  const borderClass = LANE_TOOLTIP_BORDER[lane]
  const bgClass = LANE_TOOLTIP_BG[lane]

  return (
    <div className="absolute top-1.5 left-1.5 z-10">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white/50 hover:text-white/80 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="Why this recommendation?"
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <div
          ref={tooltipRef}
          className={`absolute top-7 left-0 w-48 rounded-lg border ${borderClass} ${bgClass} backdrop-blur-md p-2.5 shadow-xl`}
          role="tooltip"
        >
          <p className="text-xs text-white/90 leading-relaxed">{reason}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire tooltip into DiscoveryCard**

In `components/discovery/discovery-card.tsx`, add the tooltip import and render it inside the card.

Add import at the top:

```tsx
import { WhyThisTooltip } from '@/components/discovery/why-this-tooltip'
```

In the `DiscoveryCard` component, after the `DiscoveryCardFeedback` element, add:

```tsx
<WhyThisTooltip debugScore={item.debugScore} itemLabel={item.label} lane={lane} />
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/discovery/why-this-tooltip.tsx components/discovery/discovery-card.tsx
git commit -m "feat(discovery): add Why This tooltip to discovery cards"
```

---

## Task 3: Interaction Counter

**Files:**

- Create: `lib/discovery/interaction-counter.ts`
- Create: `tests/unit/interaction-counter.test.ts`

This task provides the logic for determining when to show "Getting to know you" (5+ session interactions) and "Personalized for you" (20+ cross-session interactions) indicators.

- [ ] **Step 1: Write failing test**

Create `tests/unit/interaction-counter.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolvePersonalizationStage,
  type PersonalizationStage,
} from '@/lib/discovery/interaction-counter'

describe('resolvePersonalizationStage', () => {
  it('returns "anonymous" when no interactions', () => {
    const result = resolvePersonalizationStage(0, 0)
    assert.equal(result.stage, 'anonymous')
    assert.equal(result.showIndicator, false)
  })

  it('returns "anonymous" for low session count without history', () => {
    const result = resolvePersonalizationStage(3, 0)
    assert.equal(result.stage, 'anonymous')
    assert.equal(result.showIndicator, false)
  })

  it('returns "learning" at 5 session interactions', () => {
    const result = resolvePersonalizationStage(5, 2)
    assert.equal(result.stage, 'learning')
    assert.equal(result.showIndicator, true)
    assert.equal(result.label, 'Getting to know you')
  })

  it('returns "learning" at 10 session interactions with low cross-session', () => {
    const result = resolvePersonalizationStage(10, 15)
    assert.equal(result.stage, 'learning')
    assert.equal(result.showIndicator, true)
  })

  it('returns "personalized" at 20+ cross-session interactions', () => {
    const result = resolvePersonalizationStage(3, 20)
    assert.equal(result.stage, 'personalized')
    assert.equal(result.showIndicator, true)
    assert.equal(result.label, 'Personalized for you')
  })

  it('returns "personalized" at high cross-session even with low session count', () => {
    const result = resolvePersonalizationStage(1, 50)
    assert.equal(result.stage, 'personalized')
    assert.equal(result.showIndicator, true)
  })

  it('cross-session threshold takes priority over session threshold', () => {
    const result = resolvePersonalizationStage(8, 25)
    assert.equal(result.stage, 'personalized')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/interaction-counter.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement interaction-counter.ts**

Create `lib/discovery/interaction-counter.ts`:

```typescript
/**
 * Determines the personalization stage based on interaction counts.
 *
 * Thresholds:
 * - 5+ interactions in current session: "Getting to know you"
 * - 20+ interactions across sessions: "Personalized for you"
 *
 * Session interactions come from sessionStorage click count.
 * Cross-session interactions come from the server (discovery_interactions table row count).
 */

const SESSION_LEARNING_THRESHOLD = 5
const CROSS_SESSION_PERSONALIZED_THRESHOLD = 20

export type PersonalizationStage = 'anonymous' | 'learning' | 'personalized'

export type PersonalizationStageResult = {
  stage: PersonalizationStage
  showIndicator: boolean
  label: string | null
}

export function resolvePersonalizationStage(
  sessionInteractionCount: number,
  crossSessionInteractionCount: number
): PersonalizationStageResult {
  if (crossSessionInteractionCount >= CROSS_SESSION_PERSONALIZED_THRESHOLD) {
    return {
      stage: 'personalized',
      showIndicator: true,
      label: 'Personalized for you',
    }
  }

  if (sessionInteractionCount >= SESSION_LEARNING_THRESHOLD) {
    return {
      stage: 'learning',
      showIndicator: true,
      label: 'Getting to know you',
    }
  }

  return {
    stage: 'anonymous',
    showIndicator: false,
    label: null,
  }
}

const SESSION_INTERACTION_COUNT_KEY = 'cf:discovery:session-interaction-count'

/**
 * Increment session interaction count in sessionStorage.
 * Returns the new count. Safe to call in browser only.
 */
export function incrementSessionInteractionCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const current = parseInt(
      window.sessionStorage.getItem(SESSION_INTERACTION_COUNT_KEY) ?? '0',
      10
    )
    const next = current + 1
    window.sessionStorage.setItem(SESSION_INTERACTION_COUNT_KEY, String(next))
    return next
  } catch {
    return 0
  }
}

/**
 * Read the current session interaction count without incrementing.
 */
export function getSessionInteractionCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(window.sessionStorage.getItem(SESSION_INTERACTION_COUNT_KEY) ?? '0', 10)
  } catch {
    return 0
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test tests/unit/interaction-counter.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/interaction-counter.ts tests/unit/interaction-counter.test.ts
git commit -m "feat(discovery): add interaction counter for personalization stage detection"
```

---

## Task 4: Taste Passport Strip

**Files:**

- Create: `components/discovery/taste-passport-strip.tsx`
- Create: `tests/unit/taste-passport-strip.test.ts`

- [ ] **Step 1: Write failing test for data shaping**

Create `tests/unit/taste-passport-strip.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTastePassportData,
  type TastePassportData,
} from '@/components/discovery/taste-passport-strip'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'

function makeSignals(overrides: Partial<UserScrollSignals> = {}): UserScrollSignals {
  return {
    boostedCuisines: [],
    boostedServiceTypes: [],
    rankedPreferences: [],
    rankedPreferencesByType: {},
    suppressedItems: [],
    savedLocation: null,
    hasHistory: false,
    ...overrides,
  }
}

describe('buildTastePassportData', () => {
  it('returns null for null signals', () => {
    const result = buildTastePassportData(null)
    assert.equal(result, null)
  })

  it('returns null when no history', () => {
    const result = buildTastePassportData(makeSignals({ hasHistory: false }))
    assert.equal(result, null)
  })

  it('extracts top cuisines', () => {
    const result = buildTastePassportData(
      makeSignals({
        hasHistory: true,
        boostedCuisines: ['italian', 'japanese', 'mexican'],
      })
    )
    assert.ok(result)
    assert.deepEqual(result.topCuisines, ['italian', 'japanese', 'mexican'])
  })

  it('caps cuisines at 3', () => {
    const result = buildTastePassportData(
      makeSignals({
        hasHistory: true,
        boostedCuisines: ['a', 'b', 'c', 'd', 'e'],
      })
    )
    assert.ok(result)
    assert.equal(result.topCuisines.length, 3)
  })

  it('includes location when available', () => {
    const result = buildTastePassportData(
      makeSignals({
        hasHistory: true,
        boostedCuisines: ['italian'],
        savedLocation: {
          location: 'Boston, MA',
          lat: 42.36,
          lng: -71.06,
          radiusMiles: 25,
        },
      })
    )
    assert.ok(result)
    assert.equal(result.location, 'Boston, MA')
  })

  it('extracts dietary preferences from ranked preferences', () => {
    const result = buildTastePassportData(
      makeSignals({
        hasHistory: true,
        boostedCuisines: ['italian'],
        rankedPreferencesByType: {
          dietary: [
            {
              itemType: 'dietary',
              itemValue: 'vegan',
              score: 3,
              rank: 1,
              interactionCount: 5,
              lastSeen: '2026-05-14',
            },
          ],
        },
      })
    )
    assert.ok(result)
    assert.deepEqual(result.dietaryTags, ['vegan'])
  })

  it('returns empty dietary tags when none exist', () => {
    const result = buildTastePassportData(
      makeSignals({
        hasHistory: true,
        boostedCuisines: ['italian'],
      })
    )
    assert.ok(result)
    assert.deepEqual(result.dietaryTags, [])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/taste-passport-strip.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Create taste-passport-strip.tsx**

Create `components/discovery/taste-passport-strip.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { MapPin, Leaf, Sparkles } from 'lucide-react'
import type { UserScrollSignals } from '@/lib/discovery/user-scroll-signals'
import type { PersonalizationStageResult } from '@/lib/discovery/interaction-counter'
import { getDiscoveryCuisineImage } from '@/lib/discovery/image-map'

export type TastePassportData = {
  topCuisines: string[]
  dietaryTags: string[]
  location: string | null
}

export function buildTastePassportData(
  signals: UserScrollSignals | null
): TastePassportData | null {
  if (!signals || !signals.hasHistory) return null

  const topCuisines = signals.boostedCuisines.slice(0, 3)

  const dietaryPreferences = signals.rankedPreferencesByType?.dietary ?? []
  const dietaryTags = dietaryPreferences
    .filter((p) => p.score > 0)
    .slice(0, 3)
    .map((p) => p.itemValue)

  return {
    topCuisines,
    dietaryTags,
    location: signals.savedLocation?.location ?? null,
  }
}

function CuisineChip({ cuisine, onClick }: { cuisine: string; onClick?: () => void }) {
  const imageRef = getDiscoveryCuisineImage(cuisine)
  const displayName = cuisine.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-xs text-white/80 hover:bg-white/[0.1] hover:text-white transition-colors"
    >
      <span
        className="h-4 w-4 rounded-full flex-shrink-0"
        style={{ background: imageRef.fallbackGradient }}
      />
      <span>{displayName}</span>
    </button>
  )
}

interface TastePassportStripProps {
  signals: UserScrollSignals | null
  isAuthenticated: boolean
  personalizationStage: PersonalizationStageResult
  onCuisineFilter?: (cuisine: string) => void
  onResetPreferences?: () => void
}

export function TastePassportStrip({
  signals,
  isAuthenticated,
  personalizationStage,
  onCuisineFilter,
  onResetPreferences,
}: TastePassportStripProps) {
  const data = buildTastePassportData(signals)

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 px-4">
        <Sparkles className="h-3.5 w-3.5 text-amber-400/60" />
        <Link
          href="/sign-in"
          className="text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          Sign in to personalize your discovery
        </Link>
      </div>
    )
  }

  if (!data) return null

  const hasCuisines = data.topCuisines.length > 0
  const hasDietary = data.dietaryTags.length > 0
  const hasLocation = data.location !== null

  if (!hasCuisines && !hasDietary && !hasLocation) return null

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-4">
      {/* Personalization indicator */}
      {personalizationStage.showIndicator && personalizationStage.label && (
        <span className="text-[10px] uppercase tracking-widest text-amber-400/60 mr-1">
          {personalizationStage.label}
        </span>
      )}

      {/* Heading */}
      <span
        className="text-xs font-medium text-white/50 mr-1"
        style={{ opacity: 'var(--discovery-text-secondary)' }}
      >
        Your Taste
      </span>

      {/* Cuisine chips */}
      {data.topCuisines.map((cuisine) => (
        <CuisineChip
          key={cuisine}
          cuisine={cuisine}
          onClick={onCuisineFilter ? () => onCuisineFilter(cuisine) : undefined}
        />
      ))}

      {/* Dietary tags */}
      {data.dietaryTags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400/80"
        >
          <Leaf className="h-2.5 w-2.5" />
          {tag}
        </span>
      ))}

      {/* Location */}
      {hasLocation && (
        <span className="flex items-center gap-1 text-xs text-white/40">
          <MapPin className="h-3 w-3" />
          {data.location}
        </span>
      )}

      {/* Edit link */}
      <Link
        href="/my-preferences/discovery"
        className="ml-auto text-[10px] text-white/30 hover:text-white/50 transition-colors"
      >
        Edit preferences
      </Link>

      {/* Reset option (only when personalized) */}
      {onResetPreferences && personalizationStage.stage === 'personalized' && (
        <button
          type="button"
          onClick={onResetPreferences}
          className="text-[10px] text-white/20 hover:text-red-400/60 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test tests/unit/taste-passport-strip.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/discovery/taste-passport-strip.tsx tests/unit/taste-passport-strip.test.ts
git commit -m "feat(discovery): add Taste Passport strip for preference display"
```

---

## Task 5: Wire Taste Passport into Homepage Discovery

**Files:**

- Modify: `app/(public)/_components/homepage-discovery.tsx`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Read current homepage-discovery.tsx**

Read `app/(public)/_components/homepage-discovery.tsx` to understand the existing structure between the search bar and the marquee.

- [ ] **Step 2: Read current page.tsx discovery data passing**

Read `app/(public)/page.tsx` to find where `userScrollSignals` is fetched and passed to the discovery component.

- [ ] **Step 3: Pass userScrollSignals and auth status to HomepageDiscovery**

In `app/(public)/page.tsx`, ensure `userScrollSignals` and `isAuthenticated` are passed as props to the `HomepageDiscovery` component.

- [ ] **Step 4: Render TastePassportStrip in HomepageDiscovery**

In `homepage-discovery.tsx`, import and render `TastePassportStrip` between the search bar and the marquee container:

```tsx
import { TastePassportStrip } from '@/components/discovery/taste-passport-strip'
import { resolvePersonalizationStage } from '@/lib/discovery/interaction-counter'
```

Add inside the component, after the search section and before the marquee:

```tsx
<TastePassportStrip
  signals={userScrollSignals}
  isAuthenticated={isAuthenticated}
  personalizationStage={resolvePersonalizationStage(
    0,
    userScrollSignals?.rankedPreferences?.length ?? 0
  )}
/>
```

The `sessionInteractionCount` starts at 0 on server render and updates client-side.

- [ ] **Step 5: Verify the page renders**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/(public)/_components/homepage-discovery.tsx app/(public)/page.tsx
git commit -m "feat(discovery): wire Taste Passport strip into homepage discovery"
```

---

## Task 6: Scoring Transparency Overlay

**Files:**

- Create: `tests/unit/scoring-transparency.test.ts`
- Modify: `components/discovery/discovery-card.tsx`

- [ ] **Step 1: Write failing test for debug overlay logic**

Create `tests/unit/scoring-transparency.test.ts`:

```typescript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildScoreOverlayData, type ScoreOverlayData } from '@/components/discovery/discovery-card'
import type { DiscoveryRailDebugScore } from '@/lib/discovery/discovery-rail-scoring'

describe('buildScoreOverlayData', () => {
  it('returns null when debug score is undefined', () => {
    assert.equal(buildScoreOverlayData(undefined), null)
  })

  it('returns formatted data for positive preference score', () => {
    const debug: DiscoveryRailDebugScore = {
      score: 5.2,
      preferenceScore: 3.0,
      editorialScore: 2.2,
      reason: 'Matched learned cuisine signal',
    }
    const result = buildScoreOverlayData(debug)
    assert.ok(result)
    assert.equal(result.total, '5.2')
    assert.equal(result.preference, '3.0')
    assert.equal(result.editorial, '2.2')
    assert.equal(result.barColor, 'bg-emerald-400')
  })

  it('returns amber bar for editorial-dominant scores', () => {
    const debug: DiscoveryRailDebugScore = {
      score: 2.8,
      preferenceScore: 0,
      editorialScore: 2.8,
      reason: 'Editorial discovery mix',
    }
    const result = buildScoreOverlayData(debug)
    assert.ok(result)
    assert.equal(result.barColor, 'bg-amber-400')
  })

  it('returns red bar for negative preference scores', () => {
    const debug: DiscoveryRailDebugScore = {
      score: -1.5,
      preferenceScore: -4.0,
      editorialScore: 2.5,
      reason: 'Demoted by learned cuisine signal',
    }
    const result = buildScoreOverlayData(debug)
    assert.ok(result)
    assert.equal(result.barColor, 'bg-red-400')
  })

  it('clamps bar width between 0 and 100', () => {
    const debug: DiscoveryRailDebugScore = {
      score: 15.0,
      preferenceScore: 10.0,
      editorialScore: 5.0,
      reason: 'Matched learned cuisine signal',
    }
    const result = buildScoreOverlayData(debug)
    assert.ok(result)
    assert.ok(result.barWidthPct >= 0 && result.barWidthPct <= 100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/scoring-transparency.test.ts`
Expected: FAIL -- `buildScoreOverlayData` not found.

- [ ] **Step 3: Add buildScoreOverlayData and debug overlay to discovery-card.tsx**

In `components/discovery/discovery-card.tsx`, add the exported helper function:

```typescript
export type ScoreOverlayData = {
  total: string
  preference: string
  editorial: string
  barColor: string
  barWidthPct: number
}

export function buildScoreOverlayData(
  debug: DiscoveryRailDebugScore | undefined
): ScoreOverlayData | null {
  if (!debug) return null

  const barColor =
    debug.preferenceScore > 0
      ? 'bg-emerald-400'
      : debug.preferenceScore < 0
        ? 'bg-red-400'
        : 'bg-amber-400'

  const maxScore = 10
  const barWidthPct = Math.max(0, Math.min(100, ((debug.score + maxScore) / (maxScore * 2)) * 100))

  return {
    total: String(debug.score),
    preference: String(debug.preferenceScore),
    editorial: String(debug.editorialScore),
    barColor,
    barWidthPct,
  }
}
```

Add a new internal component for the overlay:

```tsx
function ScoreDebugOverlay({ debug }: { debug: DiscoveryRailDebugScore | undefined }) {
  const data = buildScoreOverlayData(debug)
  if (!data) return null

  return (
    <div className="absolute inset-x-0 top-0 bg-black/80 px-1.5 py-1 z-20 pointer-events-none">
      <div className="flex items-center gap-1 text-[9px] font-mono text-white/80">
        <span>{data.total}</span>
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${data.barColor}`}
            style={{ width: `${data.barWidthPct}%` }}
          />
        </div>
      </div>
      <div className="flex gap-2 text-[8px] text-white/50 font-mono">
        <span>pref:{data.preference}</span>
        <span>edit:{data.editorial}</span>
      </div>
    </div>
  )
}
```

In the `DiscoveryCard` component, add a `showDebugScore` prop:

```typescript
interface DiscoveryCardProps {
  // ... existing props
  showDebugScore?: boolean
}
```

Render the overlay conditionally inside the card Link, before the variant renderers:

```tsx
{
  showDebugScore && <ScoreDebugOverlay debug={item.debugScore} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test tests/unit/scoring-transparency.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/discovery/discovery-card.tsx tests/unit/scoring-transparency.test.ts
git commit -m "feat(discovery): add scoring transparency debug overlay for admin mode"
```

---

## Task 7: Gate Debug Overlay with Feature Flag

**Files:**

- Modify: `app/(public)/_components/cuisine-marquee.tsx`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Read how feature flags are currently resolved**

Read `app/(public)/page.tsx` to find if `getDiscoveryFeatureDecision` or `isDiscoveryFeatureEnabled` is already called. Read `cuisine-marquee.tsx` to find where `DiscoveryCard` is rendered.

- [ ] **Step 2: Resolve the data_freshness_dashboard flag server-side**

In `app/(public)/page.tsx`, resolve the `data_freshness_dashboard` feature flag using the user's role. Pass the result as a prop to the discovery section.

```typescript
import { isDiscoveryFeatureEnabled } from '@/lib/discovery/rail-feature-flags'

// Inside the page component, after auth check:
const showDebugScores = isDiscoveryFeatureEnabled('data_freshness_dashboard', {
  role: userRole, // 'admin', 'chef', 'client', 'guest', or 'public'
})
```

- [ ] **Step 3: Thread showDebugScores through to DiscoveryCard**

Pass `showDebugScores` from `page.tsx` through `homepage-discovery.tsx` and `cuisine-marquee.tsx` to the `DiscoveryCard` component's `showDebugScore` prop.

- [ ] **Step 4: Verify production users see no overlay**

The `data_freshness_dashboard` flag has `defaultEnabled: false` and `roles: ['admin']` in `rail-feature-flags.ts`. Non-admin users will never see the score overlay.

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/(public)/page.tsx app/(public)/_components/homepage-discovery.tsx app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): gate scoring debug overlay behind admin-only feature flag"
```

---

## Task 8: Preference Learning Feedback Loop

**Files:**

- Modify: `app/(public)/_components/cuisine-marquee.tsx`
- Modify: `components/discovery/taste-passport-strip.tsx`

This task wires love/hate feedback into live rail reordering and renders the learning stage indicators.

- [ ] **Step 1: Wire incrementSessionInteractionCount into click tracking**

In `cuisine-marquee.tsx`, import and call `incrementSessionInteractionCount` from `lib/discovery/interaction-counter.ts` whenever `trackDiscoveryInteraction` is called with a feedback action (`love`, `hate`, `hide`, `save`, `pin`).

```typescript
import {
  incrementSessionInteractionCount,
  getSessionInteractionCount,
} from '@/lib/discovery/interaction-counter'
import { resolvePersonalizationStage } from '@/lib/discovery/interaction-counter'
```

After calling `trackDiscoveryInteraction(action, item)`:

```typescript
const newCount = incrementSessionInteractionCount()
// Update local state to trigger personalization stage re-evaluation
setSessionInteractionCount(newCount)
```

- [ ] **Step 2: Add live reorder on love/hate feedback**

When a user loves an item, the item should visually animate to a higher position. When a user hides an item, it should fade out. This is handled through local state in `cuisine-marquee.tsx`:

- On `love`: Add the item to a local `lovedItems` set. Boosted items sort earlier in the visible list.
- On `hate`/`hide`: Add to a local `hiddenItems` set. Hidden items fade out with a 300ms transition and are removed from the rendered list.

Add CSS class for reorder animation to the card wrapper:

```tsx
className={`transition-all duration-300 ${isHiding ? 'opacity-0 scale-95' : 'opacity-100'}`}
```

- [ ] **Step 3: Wire personalization stage into rail header**

Add a personalization stage indicator to the rail header in `cuisine-marquee.tsx`:

```tsx
const stage = resolvePersonalizationStage(sessionInteractionCount, crossSessionInteractionCount)

// In the header area:
{
  stage.showIndicator && stage.label && (
    <span className="text-[10px] uppercase tracking-widest text-amber-400/50 animate-pulse">
      {stage.label}
    </span>
  )
}
```

The `crossSessionInteractionCount` comes from the server (length of `rankedPreferences` from `userScrollSignals`).

- [ ] **Step 4: Add reset preferences to TastePassportStrip**

In `taste-passport-strip.tsx`, the reset button is already rendered when `onResetPreferences` is provided. Wire it in `homepage-discovery.tsx`:

```tsx
onResetPreferences={async () => {
  // Clear discovery_interactions for this user via server action
  await resetDiscoveryPreferences()
  // Refresh the page to reload signals
  window.location.reload()
}}
```

Create the server action `resetDiscoveryPreferences` in an appropriate server action file under `lib/discovery/` or reuse an existing actions file. The action should delete rows from `discovery_interactions` for the authenticated user.

- [ ] **Step 5: Verify no type errors**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/(public)/_components/cuisine-marquee.tsx components/discovery/taste-passport-strip.tsx app/(public)/_components/homepage-discovery.tsx
git commit -m "feat(discovery): wire preference learning feedback loop with live reordering"
```

---

## Task 9: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new or modified files.

- [ ] **Step 2: Run all Layer 5 tests**

Run:

```bash
npx tsx --test tests/unit/reason-humanizer.test.ts tests/unit/interaction-counter.test.ts tests/unit/taste-passport-strip.test.ts tests/unit/scoring-transparency.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 5 health check issues"
```

---

## Summary

After completing all 9 tasks, you will have:

1. **Reason Humanizer** -- Translates internal scoring reasons (`debugScore.reason`) into user-friendly explanations like "Based on your Italian cuisine interest" or "Seasonal peak"
2. **"Why This?" Tooltip** -- Info icon on each card (top-left, visible on hover) that opens a lane-colored tooltip showing the humanized reason
3. **Interaction Counter** -- Tracks session and cross-session interaction counts, resolves personalization stage ("anonymous", "learning", "personalized")
4. **Taste Passport Strip** -- Compact strip between search and rail showing top 3 cuisine chips, dietary tags, location, with filter-on-click and reset option
5. **Scoring Transparency Overlay** -- Admin-only debug overlay showing composite score, preference/editorial breakdown, and colored score bar on every card
6. **Feature Flag Gating** -- Debug overlay gated behind `data_freshness_dashboard` flag (admin role only, `defaultEnabled: false`)
7. **Preference Learning Feedback Loop** -- Session interaction counting, "Getting to know you" / "Personalized for you" indicators, live reorder on love/fade on hide, reset preferences option
8. **4 test suites** -- reason-humanizer (9 tests), interaction-counter (7 tests), taste-passport-strip (7 tests), scoring-transparency (5 tests)

Data flows: `discovery-rail-scoring.ts` attaches `debugScore` -> `reason-humanizer.ts` translates for tooltip -> `why-this-tooltip.tsx` renders. `user-scroll-signals.ts` provides `UserScrollSignals` -> `taste-passport-strip.tsx` displays top preferences. `track-discovery-click.ts` records interactions -> `interaction-counter.ts` counts -> `resolvePersonalizationStage()` drives indicators. `rail-feature-flags.ts` gates debug overlay via `data_freshness_dashboard`.
