# Discovery Rail Layer 4: Remy Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The search bar becomes Remy-powered with natural language input, intent parsing feedback, silent intelligence badges on cards, and conversational refinement. Users type what they want in plain English; the rail reorders live.

**Architecture:** Replace the location + service type dropdown in `homepage-search.tsx` with a single NLP input. Wire `parseDiscoveryQuery()` from `query-understanding.ts` to extract structured filters from freeform text. Display parsed intent as editable tokens. Add intelligence badges to `DiscoveryCard` sourced from scoring context. Refinement mode allows incremental filter updates without full re-parse.

**Tech Stack:** Next.js (React Server Components + Client Components), Tailwind CSS, CSS custom properties, `parseDiscoveryQuery()` from `query-understanding.ts`, `DiscoveryFilterState` from `filter-state-contract.ts`, `DiscoverySession` from `session-lifecycle-contract.ts`.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 4, Builds 4.1-4.4)

**Dependencies:** Layer 3 (Session Lifecycle, Feature Flags, Control Rail Assembly) must be complete. Specifically: `use-discovery-session.ts` hook, `getDiscoveryFeatureDecision()` wiring, and `assembleDiscoveryRailItems()` full pipeline.

---

## File Map

### New Files

| File                                           | Responsibility                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `components/discovery/remy-parse-tokens.tsx`   | Parsed intent token display with color-coded filter dimensions            |
| `components/discovery/intelligence-badge.tsx`  | Badge component with 5 variants (budget, timing, location, trending, new) |
| `lib/discovery/badge-resolver.ts`              | Determines which badge each rail item gets based on session context       |
| `tests/unit/remy-search-parse.test.ts`         | Tests for search bar NLP parsing integration                              |
| `tests/unit/badge-resolver.test.ts`            | Tests for badge assignment logic                                          |
| `tests/unit/conversational-refinement.test.ts` | Tests for incremental filter updates                                      |

### Modified Files

| File                                              | Changes                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `app/(public)/_components/homepage-search.tsx`    | Replace location + service dropdown with Remy-powered NLP input, add refinement mode |
| `app/(public)/_components/homepage-discovery.tsx` | Connect search output to session filters, pass badge data to marquee                 |
| `components/discovery/discovery-card.tsx`         | Add badge slot for intelligence badges                                               |
| `lib/discovery/use-discovery-session.ts`          | Add incremental filter update methods for refinement                                 |
| `app/(public)/page.tsx`                           | Pass parsed query context and badge data to discovery component                      |

---

## Task 1: Remy-Powered Search Bar (Build 4.1)

**Files:**

- Create: `tests/unit/remy-search-parse.test.ts`
- Modify: `app/(public)/_components/homepage-search.tsx`
- Modify: `app/(public)/_components/homepage-discovery.tsx`

- [ ] **Step 1: Write failing test for search-to-filter pipeline**

Create `tests/unit/remy-search-parse.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { parseDiscoveryQuery, type ParsedDiscoveryQuery } from '@/lib/discovery/query-understanding'

describe('remy search parse integration', () => {
  it('parses cuisine from natural language', () => {
    const result = parseDiscoveryQuery('Italian dinner for 4')
    expect(result.filters.cuisines).toContain('Italian')
    expect(result.filters.partySize).toBe(4)
  })

  it('parses budget constraints', () => {
    const result = parseDiscoveryQuery('dinner under $100 per person')
    expect(result.filters.maxBudgetPerPerson).toBeLessThanOrEqual(100)
  })

  it('parses dietary requirements', () => {
    const result = parseDiscoveryQuery('vegan brunch near me')
    expect(result.filters.dietary).toContain('vegan')
  })

  it('parses occasion type', () => {
    const result = parseDiscoveryQuery('something fancy for our anniversary')
    expect(result.filters.occasion).toBeDefined()
  })

  it('returns unparsed terms for ambiguous input', () => {
    const result = parseDiscoveryQuery('something good')
    expect(result.unparsedTerms.length).toBeGreaterThan(0)
  })

  it('calculates confidence score', () => {
    const specific = parseDiscoveryQuery('Italian dinner for 4 this Saturday')
    const vague = parseDiscoveryQuery('food')
    expect(specific.confidence).toBeGreaterThan(vague.confidence)
  })

  it('converts parsed query to DiscoveryFilterState shape', () => {
    const result = parseDiscoveryQuery('Japanese meal prep')
    expect(result.filters.cuisines).toContain('Japanese')
    expect(result.filters.fulfillment).toBe('meal_prep')
  })
})
```

- [ ] **Step 2: Run test to verify it passes (tests existing parser)**

Run: `npx vitest run tests/unit/remy-search-parse.test.ts`
Expected: Most tests PASS (testing existing `parseDiscoveryQuery`). Fix any that fail due to parser behavior differences.

- [ ] **Step 3: Read current homepage-search.tsx**

Read `app/(public)/_components/homepage-search.tsx` to understand the current search bar structure, the `HomepageSearchProps` interface, the `useTypingPlaceholder` hook, and the form submission handler.

- [ ] **Step 4: Rewrite homepage-search.tsx for Remy NLP input**

Replace the current search bar implementation. Key changes:

- Remove the service type `<select>` dropdown
- Replace with a single `<input>` that accepts natural language
- On submit: call `parseDiscoveryQuery(inputValue)` from `@/lib/discovery/query-understanding`
- Pass `ParsedDiscoveryQuery` result up via a new `onQueryParsed` callback prop
- Update the typewriter placeholder to cycle through NLP examples:
  - "Romantic dinner for two..."
  - "Vegan catering for 20..."
  - "Quick weeknight meal..."
  - "Italian dinner this Saturday under $100..."
  - "Something fancy for our anniversary..."
- Preserve location input as a secondary field (keep `LocationAutocomplete`)
- Show parsed filter tokens below the input (delegate to `RemyParseTokens` component in Task 2)

Updated interface:

```typescript
interface HomepageSearchProps {
  onContextChange?: (ctx: HomepageLocationContext) => void
  onQueryParsed?: (parsed: ParsedDiscoveryQuery) => void
  parsedQuery?: ParsedDiscoveryQuery | null
  isRefinementMode?: boolean
}
```

Form submit handler:

```typescript
function handleSearch(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  if (!searchInput.trim()) return

  const parsed = parseDiscoveryQuery(searchInput)

  if (onQueryParsed) {
    onQueryParsed(parsed)
  }

  // If confidence is high enough, also navigate to /eat with params
  if (parsed.confidence >= 0.6) {
    const params = discoveryQueryToSearchParams(parsed)
    // Location context merged separately
    if (locationCtx?.location) {
      params.set('location', locationCtx.location)
    }
    router.push(`/eat?${params.toString()}`)
  }
}
```

- [ ] **Step 5: Wire homepage-discovery.tsx to receive parsed query**

In `homepage-discovery.tsx`, add `parsedQuery` state and pass it through:

```typescript
const [parsedQuery, setParsedQuery] = useState<ParsedDiscoveryQuery | null>(null)
```

Pass `onQueryParsed={setParsedQuery}` to `<HomepageSearch>` and `parsedQuery` to `<CuisineMarquee>` for live rail reordering.

- [ ] **Step 6: Commit**

```bash
git add app/(public)/_components/homepage-search.tsx app/(public)/_components/homepage-discovery.tsx tests/unit/remy-search-parse.test.ts
git commit -m "feat(discovery): replace search bar with Remy-powered NLP input"
```

---

## Task 2: Intent Parsing Feedback (Build 4.2)

**Files:**

- Create: `components/discovery/remy-parse-tokens.tsx`
- Modify: `app/(public)/_components/homepage-search.tsx`

- [ ] **Step 1: Create remy-parse-tokens.tsx**

Create `components/discovery/remy-parse-tokens.tsx`:

```tsx
'use client'

import { X } from 'lucide-react'
import type {
  DiscoveryQuerySignal,
  ParsedDiscoveryQuery,
} from '@/lib/discovery/query-understanding'

const SIGNAL_COLORS: Record<string, string> = {
  occasion: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  craving: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  dish: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  budget: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  party_size: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  date_window: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  location: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  dietary: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  fulfillment: 'bg-stone-500/20 text-stone-300 border-stone-500/30',
}

interface RemyParseTokensProps {
  parsed: ParsedDiscoveryQuery
  onRemoveSignal?: (signal: DiscoveryQuerySignal) => void
  onClickUnparsed?: (term: string) => void
}

function tokenLabel(signal: DiscoveryQuerySignal): string {
  if (signal.kind === 'party_size') return `${signal.value} guests`
  if (signal.kind === 'budget') return signal.text
  return String(signal.value)
}

export function RemyParseTokens({ parsed, onRemoveSignal, onClickUnparsed }: RemyParseTokensProps) {
  if (parsed.signals.length === 0 && parsed.unparsedTerms.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
      {parsed.signals.map((signal, i) => {
        const colorClass = SIGNAL_COLORS[signal.kind] ?? SIGNAL_COLORS.fulfillment
        return (
          <span
            key={`${signal.kind}-${i}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colorClass}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {tokenLabel(signal)}
            {signal.confidence < 0.5 && (
              <span className="text-white/40 ml-0.5" title="Low confidence parse">
                ?
              </span>
            )}
            {onRemoveSignal && (
              <button
                type="button"
                onClick={() => onRemoveSignal(signal)}
                className="ml-0.5 hover:text-white transition-colors"
                aria-label={`Remove ${tokenLabel(signal)} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        )
      })}
      {parsed.unparsedTerms.map((term, i) => (
        <span
          key={`unparsed-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-white/10 bg-white/5 text-white/50 cursor-pointer hover:text-white/70"
          onClick={() => onClickUnparsed?.(term)}
          title="Click to refine"
        >
          {term}
          <span className="text-white/30">?</span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire parse tokens into homepage-search.tsx**

In `homepage-search.tsx`, below the search input, add:

```tsx
{
  parsedQuery && (
    <RemyParseTokens
      parsed={parsedQuery}
      onRemoveSignal={handleRemoveSignal}
      onClickUnparsed={handleClickUnparsed}
    />
  )
}
```

Where `parsedQuery` comes from the parent via props (set after form submit), and:

```typescript
function handleRemoveSignal(signal: DiscoveryQuerySignal) {
  if (!parsedQuery) return
  const updated = {
    ...parsedQuery,
    signals: parsedQuery.signals.filter((s) => s !== signal),
    filters: rebuildFiltersWithoutSignal(parsedQuery.filters, signal),
  }
  onQueryParsed?.(updated)
}
```

- [ ] **Step 3: Add disambiguation prompt for low-confidence parses**

When `parsed.confidence < 0.4`, show a disambiguation prompt below the tokens:

```tsx
{
  parsed.confidence < 0.4 && parsed.unparsedTerms.length > 0 && (
    <p className="text-xs text-white/40 mt-1.5">
      Not sure what you mean. Try being more specific, like "Italian dinner for 4 this Saturday."
    </p>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/discovery/remy-parse-tokens.tsx app/(public)/_components/homepage-search.tsx
git commit -m "feat(discovery): add intent parsing feedback with editable tokens"
```

---

## Task 3: Silent Intelligence Badges (Build 4.3)

**Files:**

- Create: `lib/discovery/badge-resolver.ts`
- Create: `components/discovery/intelligence-badge.tsx`
- Create: `tests/unit/badge-resolver.test.ts`
- Modify: `components/discovery/discovery-card.tsx`

- [ ] **Step 1: Write failing test for badge resolver**

Create `tests/unit/badge-resolver.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  resolveIntelligenceBadge,
  type IntelligenceBadgeKind,
  type BadgeResolverContext,
} from '@/lib/discovery/badge-resolver'
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'

function makeItem(
  overrides: Partial<DiscoveryRailItem> & { type: DiscoveryRailItem['type'] }
): DiscoveryRailItem {
  return { label: 'Test', href: '/eat', ...overrides }
}

describe('resolveIntelligenceBadge', () => {
  it('returns budget_match when item price tier fits parsed budget', () => {
    const ctx: BadgeResolverContext = {
      parsedBudgetLabel: 'moderate',
      itemPriceTier: 'moderate',
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'cuisine' }), ctx)
    expect(result).toBe('budget_match')
  })

  it('returns timing_match when date window matches', () => {
    const ctx: BadgeResolverContext = {
      parsedDateWindow: 'this_weekend',
      itemAvailability: 'this_weekend',
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'occasion' }), ctx)
    expect(result).toBe('timing_match')
  })

  it('returns near_you when location context matches', () => {
    const ctx: BadgeResolverContext = {
      hasLocationMatch: true,
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'cuisine' }), ctx)
    expect(result).toBe('near_you')
  })

  it('returns trending when item has high engagement', () => {
    const ctx: BadgeResolverContext = {
      itemEngagementTier: 'high',
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'cuisine' }), ctx)
    expect(result).toBe('trending')
  })

  it('returns new_to_chefflow for recently added items', () => {
    const ctx: BadgeResolverContext = {
      isRecentlyAdded: true,
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'featured_chef' }), ctx)
    expect(result).toBe('new_to_chefflow')
  })

  it('returns null when no badge applies', () => {
    const ctx: BadgeResolverContext = {}
    const result = resolveIntelligenceBadge(makeItem({ type: 'cuisine' }), ctx)
    expect(result).toBeNull()
  })

  it('returns highest priority badge when multiple match', () => {
    const ctx: BadgeResolverContext = {
      parsedBudgetLabel: 'moderate',
      itemPriceTier: 'moderate',
      isRecentlyAdded: true,
    }
    const result = resolveIntelligenceBadge(makeItem({ type: 'cuisine' }), ctx)
    // budget_match is higher priority than new_to_chefflow
    expect(result).toBe('budget_match')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/badge-resolver.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement badge-resolver.ts**

Create `lib/discovery/badge-resolver.ts`:

```typescript
import type { DiscoveryRailItem } from '@/lib/discovery/homepage-discovery-rail'
import type { DiscoveryQueryBudgetLabel } from '@/lib/discovery/query-understanding'

export type IntelligenceBadgeKind =
  | 'budget_match'
  | 'timing_match'
  | 'near_you'
  | 'trending'
  | 'new_to_chefflow'

export type BadgeResolverContext = {
  parsedBudgetLabel?: DiscoveryQueryBudgetLabel
  itemPriceTier?: string
  parsedDateWindow?: string
  itemAvailability?: string
  hasLocationMatch?: boolean
  itemEngagementTier?: 'high' | 'medium' | 'low'
  isRecentlyAdded?: boolean
}

/** Priority order: first match wins. Max 1 badge per item. */
const BADGE_CHECKS: Array<{
  kind: IntelligenceBadgeKind
  test: (item: DiscoveryRailItem, ctx: BadgeResolverContext) => boolean
}> = [
  {
    kind: 'budget_match',
    test: (_item, ctx) =>
      Boolean(
        ctx.parsedBudgetLabel && ctx.itemPriceTier && ctx.parsedBudgetLabel === ctx.itemPriceTier
      ),
  },
  {
    kind: 'timing_match',
    test: (_item, ctx) =>
      Boolean(
        ctx.parsedDateWindow &&
        ctx.itemAvailability &&
        ctx.parsedDateWindow === ctx.itemAvailability
      ),
  },
  {
    kind: 'near_you',
    test: (_item, ctx) => Boolean(ctx.hasLocationMatch),
  },
  {
    kind: 'trending',
    test: (_item, ctx) => ctx.itemEngagementTier === 'high',
  },
  {
    kind: 'new_to_chefflow',
    test: (_item, ctx) => Boolean(ctx.isRecentlyAdded),
  },
]

export function resolveIntelligenceBadge(
  item: DiscoveryRailItem,
  ctx: BadgeResolverContext
): IntelligenceBadgeKind | null {
  for (const check of BADGE_CHECKS) {
    if (check.test(item, ctx)) return check.kind
  }
  return null
}

export function resolveIntelligenceBadges(
  items: DiscoveryRailItem[],
  ctx: BadgeResolverContext
): Map<string, IntelligenceBadgeKind> {
  const result = new Map<string, IntelligenceBadgeKind>()
  for (const item of items) {
    const badge = resolveIntelligenceBadge(item, ctx)
    if (badge) {
      result.set(`${item.type}:${item.label}:${item.href}`, badge)
    }
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/badge-resolver.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Create intelligence-badge.tsx component**

Create `components/discovery/intelligence-badge.tsx`:

```tsx
'use client'

import { Check, Calendar, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import type { IntelligenceBadgeKind } from '@/lib/discovery/badge-resolver'

const BADGE_CONFIG: Record<
  IntelligenceBadgeKind,
  {
    icon: typeof Check
    label: string
    className: string
  }
> = {
  budget_match: {
    icon: Check,
    label: 'Matches your budget',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  timing_match: {
    icon: Calendar,
    label: 'Available this weekend',
    className: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  near_you: {
    icon: MapPin,
    label: 'Near you',
    className: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  trending: {
    icon: TrendingUp,
    label: 'Popular choice',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  new_to_chefflow: {
    icon: Sparkles,
    label: 'New to ChefFlow',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
}

interface IntelligenceBadgeProps {
  kind: IntelligenceBadgeKind
}

export function IntelligenceBadge({ kind }: IntelligenceBadgeProps) {
  const config = BADGE_CONFIG[kind]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${config.className} animate-in fade-in duration-200`}
      title={config.label}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="sr-only">{config.label}</span>
    </span>
  )
}
```

- [ ] **Step 6: Add badge slot to discovery-card.tsx**

In `components/discovery/discovery-card.tsx`, add a `badge` prop to `DiscoveryCardProps`:

```typescript
interface DiscoveryCardProps {
  item: DiscoveryRailItem
  lane: HomepageDiscoveryLane
  isPinned?: boolean
  isSelected?: boolean
  badge?: IntelligenceBadgeKind | null
  onLove?: () => void
  onPin?: () => void
  onHide?: () => void
  onSelect?: () => void
}
```

In the `DiscoveryCard` render, add the badge in the top-left corner (opposite the feedback buttons):

```tsx
{
  badge && (
    <div className="absolute top-1.5 left-1.5 z-10" style={{ animationDelay: '200ms' }}>
      <IntelligenceBadge kind={badge} />
    </div>
  )
}
```

Import `IntelligenceBadge` and `IntelligenceBadgeKind`:

```typescript
import { IntelligenceBadge } from '@/components/discovery/intelligence-badge'
import type { IntelligenceBadgeKind } from '@/lib/discovery/badge-resolver'
```

- [ ] **Step 7: Commit**

```bash
git add lib/discovery/badge-resolver.ts components/discovery/intelligence-badge.tsx tests/unit/badge-resolver.test.ts components/discovery/discovery-card.tsx
git commit -m "feat(discovery): add silent intelligence badges with 5 variants"
```

---

## Task 4: Conversational Refinement (Build 4.4)

**Files:**

- Create: `tests/unit/conversational-refinement.test.ts`
- Modify: `app/(public)/_components/homepage-search.tsx`
- Modify: `lib/discovery/use-discovery-session.ts`

- [ ] **Step 1: Write failing test for incremental filter updates**

Create `tests/unit/conversational-refinement.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  parseDiscoveryQuery,
  type ParsedDiscoveryQuery,
  type DiscoveryQueryFilters,
} from '@/lib/discovery/query-understanding'

function mergeRefinement(
  base: DiscoveryQueryFilters,
  refinement: ParsedDiscoveryQuery
): DiscoveryQueryFilters {
  return {
    ...base,
    cuisines: [...new Set([...base.cuisines, ...refinement.filters.cuisines])],
    dishes: [...new Set([...base.dishes, ...refinement.filters.dishes])],
    dietary: [...new Set([...base.dietary, ...refinement.filters.dietary])],
    neighborhoods: [...new Set([...base.neighborhoods, ...refinement.filters.neighborhoods])],
    terms: [...new Set([...base.terms, ...refinement.filters.terms])],
    occasion: refinement.filters.occasion ?? base.occasion,
    partySize: refinement.filters.partySize ?? base.partySize,
    maxBudgetPerPerson: refinement.filters.maxBudgetPerPerson ?? base.maxBudgetPerPerson,
    budgetLabel: refinement.filters.budgetLabel ?? base.budgetLabel,
    dateWindow: refinement.filters.dateWindow ?? base.dateWindow,
    location: refinement.filters.location ?? base.location,
    fulfillment:
      refinement.filters.fulfillment !== 'any' ? refinement.filters.fulfillment : base.fulfillment,
    resultTypes: base.resultTypes,
  }
}

describe('conversational refinement', () => {
  it('adds cuisine to existing filters', () => {
    const base = parseDiscoveryQuery('Italian dinner for 4')
    const refinement = parseDiscoveryQuery('also vegan')
    const merged = mergeRefinement(base.filters, refinement)
    expect(merged.cuisines).toContain('Italian')
    expect(merged.dietary).toContain('vegan')
    expect(merged.partySize).toBe(4)
  })

  it('overrides party size on refinement', () => {
    const base = parseDiscoveryQuery('dinner for 4')
    const refinement = parseDiscoveryQuery('for 6 instead')
    const merged = mergeRefinement(base.filters, refinement)
    expect(merged.partySize).toBe(6)
  })

  it('preserves base filters when refinement is vague', () => {
    const base = parseDiscoveryQuery('Japanese dinner')
    const refinement = parseDiscoveryQuery('but cheaper')
    const merged = mergeRefinement(base.filters, refinement)
    expect(merged.cuisines).toContain('Japanese')
  })
})
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npx vitest run tests/unit/conversational-refinement.test.ts`
Expected: Tests PASS (testing pure merge logic).

- [ ] **Step 3: Add mergeRefinement to use-discovery-session.ts**

In `lib/discovery/use-discovery-session.ts`, add a `refineSessionFilters` function that:

- Takes the current session's `DiscoveryFilterState` and a new `ParsedDiscoveryQuery`
- Merges additively (new cuisines added, new dietary added)
- Overrides scalars (partySize, budget, dateWindow) only when the refinement provides them
- Returns the updated `DiscoveryFilterState`

```typescript
export function mergeDiscoveryRefinement(
  base: DiscoveryFilterState,
  refinement: ParsedDiscoveryQuery
): DiscoveryFilterState {
  return {
    ...base,
    cuisines: [...new Set([...base.cuisines, ...refinement.filters.cuisines])],
    cravings: [...new Set([...base.cravings, ...refinement.filters.dishes])],
    dietary: [...new Set([...base.dietary, ...refinement.filters.dietary])],
    moods: base.moods,
    ingredients: base.ingredients,
    resultTypes: base.resultTypes,
    selectedRailItems: base.selectedRailItems,
    occasion: refinement.filters.occasion
      ? (refinement.filters.occasion as DiscoveryFilterState['occasion'])
      : base.occasion,
    partySize: refinement.filters.partySize ?? base.partySize,
    budget: refinement.filters.budgetLabel ?? base.budget,
    dateWindow: refinement.filters.dateWindow ?? base.dateWindow,
    location: refinement.filters.location ?? base.location,
    fulfillment:
      refinement.filters.fulfillment !== 'any'
        ? (refinement.filters.fulfillment as DiscoveryFilterState['fulfillment'])
        : base.fulfillment,
  }
}
```

- [ ] **Step 4: Add refinement mode to homepage-search.tsx**

After initial search, transform the search bar into refinement mode:

- Change placeholder to: "Refine: try 'but cheaper' or 'add seafood' or 'this Friday instead'"
- On refinement submit: call `parseDiscoveryQuery()` on the new input, then merge with existing session filters via `mergeDiscoveryRefinement()`
- Show refinement history as a breadcrumb trail above the tokens

```tsx
{
  isRefinementMode && refinementHistory.length > 0 && (
    <div className="flex items-center gap-1.5 text-xs text-white/30 mt-1">
      {refinementHistory.map((query, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-white/15">/</span>}
          <span className="text-white/40">{query}</span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Handle undo commands in refinement**

Check the refinement input for undo keywords. If the input matches "undo", "go back", or "remove the X filter", use `parseRemyUndoCommand()` pattern:

```typescript
const UNDO_PATTERNS = [/^undo$/i, /^go back$/i, /^remove the .+ filter$/i, /^clear (.+)$/i]

function isUndoCommand(input: string): boolean {
  return UNDO_PATTERNS.some((pattern) => pattern.test(input.trim()))
}

function extractFilterToRemove(input: string): string | null {
  const removeMatch = input.match(/^remove the (.+) filter$/i)
  if (removeMatch) return removeMatch[1]
  const clearMatch = input.match(/^clear (.+)$/i)
  if (clearMatch) return clearMatch[1]
  return null
}
```

- [ ] **Step 6: Commit**

```bash
git add tests/unit/conversational-refinement.test.ts app/(public)/_components/homepage-search.tsx lib/discovery/use-discovery-session.ts
git commit -m "feat(discovery): add conversational refinement with incremental filter updates"
```

---

## Task 5: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new files.

- [ ] **Step 2: Run all Layer 4 tests**

Run: `npx vitest run tests/unit/remy-search-parse.test.ts tests/unit/badge-resolver.test.ts tests/unit/conversational-refinement.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 4 health check issues"
```

---

## Summary

After completing all 5 tasks, you will have:

1. **Remy-powered search bar** -- single NLP input replacing location + service dropdown, powered by `parseDiscoveryQuery()` from `query-understanding.ts`
2. **Intent parsing feedback** -- parsed tokens displayed below input, color-coded by dimension (`DiscoveryQuerySignalKind`), removable, with disambiguation for low-confidence parses
3. **Intelligence badges** -- 5 badge variants (budget_match, timing_match, near_you, trending, new_to_chefflow) resolved per-item via `badge-resolver.ts`, max 1 per card
4. **Badge component** -- `IntelligenceBadge` with icon + tooltip for each variant, wired into `DiscoveryCard` top-left slot
5. **Conversational refinement** -- refinement mode after initial search, incremental filter merging via `mergeDiscoveryRefinement()`, undo command detection, breadcrumb history

The search bar now accepts natural language ("Italian dinner for 4 this Saturday under $100"), parses it into structured filters, displays editable tokens, and allows incremental refinement ("but cheaper", "also vegan"). Cards show ambient intelligence badges based on how well they match the user's parsed intent.
