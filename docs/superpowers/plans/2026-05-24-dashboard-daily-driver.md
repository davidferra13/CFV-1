# Dashboard as Daily Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the ChefFlow dashboard from 18+ stacked sections into a data-driven daily operations surface with an Attention Rail at top and smart expand/compact/whisper section modes.

**Architecture:** Two-layer system. An `AttentionRail` client component at the top renders urgency-sorted chips collected from all sections. Below it, each section is wrapped in a `SectionShell` that renders one of three modes (expanded/compact/whisper) based on data weight. Sections maintain a fixed display order for muscle memory. The existing `DashboardSection` collapsible component is extended (not replaced) to support the three modes.

**Tech Stack:** Next.js 14 (App Router), React Server Components, TypeScript, Tailwind CSS, localStorage (snooze persistence)

**Spec:** `docs/superpowers/specs/2026-05-24-dashboard-daily-driver-design.md`

---

## File Map

### New Files

| File                                                 | Responsibility                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `lib/dashboard/section-types.ts`                     | `SectionMode`, `AttentionChip`, `SectionWeight`, `SECTION_ORDER` constant |
| `lib/dashboard/snooze.ts`                            | Snooze read/write/check helpers (localStorage, TTL)                       |
| `components/dashboard/attention-rail.tsx`            | Client component: renders sorted chips, dismiss/snooze, empty state       |
| `components/dashboard/section-shell.tsx`             | Wrapper component: renders expanded/compact/whisper based on mode prop    |
| `tests/lib/dashboard/section-types.test.ts`          | Type validation and SECTION_ORDER integrity tests                         |
| `tests/lib/dashboard/snooze.test.ts`                 | Snooze TTL logic tests                                                    |
| `tests/components/dashboard/attention-rail.test.tsx` | Rail rendering, sorting, dismiss behavior                                 |
| `tests/components/dashboard/section-shell.test.tsx`  | Three-mode rendering tests                                                |

### Modified Files

| File                                         | Change                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `components/dashboard/dashboard-section.tsx` | Add `mode` prop support alongside existing collapse behavior                 |
| `app/(chef)/dashboard/page.tsx`              | Reorder sections to fixed positions, wrap in SectionShell, add AttentionRail |

---

## Phase 1: Infrastructure

### Task 1: Section Types

**Files:**

- Create: `lib/dashboard/section-types.ts`
- Test: `tests/lib/dashboard/section-types.test.ts`

- [ ] **Step 1: Write the failing test for SectionMode and AttentionChip types**

```typescript
// tests/lib/dashboard/section-types.test.ts
import { describe, it, expect } from 'vitest'
import type { SectionMode, AttentionChip, SectionWeight } from '@/lib/dashboard/section-types'
import { SECTION_ORDER, SECTION_IDS } from '@/lib/dashboard/section-types'

describe('section-types', () => {
  it('SECTION_ORDER has 19 entries', () => {
    expect(SECTION_ORDER).toHaveLength(19)
  })

  it('SECTION_ORDER positions are unique and sequential starting at 1', () => {
    const positions = SECTION_ORDER.map((s) => s.position)
    expect(positions).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
  })

  it('SECTION_IDS contains all section ids', () => {
    expect(SECTION_IDS).toContain('command-center')
    expect(SECTION_IDS).toContain('daily-plan')
    expect(SECTION_IDS).toContain('this-week')
    expect(SECTION_IDS).toContain('feature-suggestions')
  })

  it('SectionWeight shape is valid', () => {
    const weight: SectionWeight = {
      sectionId: 'command-center',
      mode: 'expanded',
      chips: [],
      whisperText: null,
      compactSummary: null,
    }
    expect(weight.sectionId).toBe('command-center')
    expect(weight.mode).toBe('expanded')
  })

  it('AttentionChip shape is valid', () => {
    const chip: AttentionChip = {
      id: 'msg-1',
      icon: 'mail',
      label: '3 unanswered messages',
      age: '2d',
      urgencyScore: 92,
      action: { label: 'View Messages', href: '/messages' },
      sectionId: 'command-center',
      dismissable: true,
    }
    expect(chip.urgencyScore).toBeGreaterThanOrEqual(0)
    expect(chip.urgencyScore).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/dashboard/section-types.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/dashboard/section-types.ts

export type SectionMode = 'expanded' | 'compact' | 'whisper'

export type AttentionChip = {
  id: string
  icon: string
  label: string
  age?: string
  urgencyScore: number
  action: { label: string; href?: string; actionId?: string }
  sectionId: string
  dismissable: boolean
}

export type SectionWeight = {
  sectionId: string
  mode: SectionMode
  chips: AttentionChip[]
  whisperText: string | null
  compactSummary: string | null
}

type SectionOrderEntry = {
  id: string
  position: number
  label: string
  layer: 'urgent' | 'tactical' | 'safety' | 'strategic' | 'intelligence' | 'activity' | 'utility'
}

export const SECTION_ORDER: SectionOrderEntry[] = [
  { id: 'command-center', position: 1, label: 'Command Center', layer: 'urgent' },
  { id: 'daily-plan', position: 2, label: 'Daily Plan', layer: 'tactical' },
  { id: 'this-week', position: 3, label: 'This Week', layer: 'tactical' },
  { id: 'schedule', position: 4, label: 'Schedule', layer: 'tactical' },
  { id: 'tiered-rail', position: 5, label: 'Tiered Rail', layer: 'safety' },
  { id: 'pricing-alerts', position: 6, label: 'Pricing Alerts', layer: 'safety' },
  { id: 'onboarding', position: 7, label: 'Onboarding', layer: 'safety' },
  { id: 'hero-zone', position: 8, label: 'Hero Zone', layer: 'strategic' },
  { id: 'profit-at-a-glance', position: 9, label: 'Profit at a Glance', layer: 'strategic' },
  { id: 'revenue-goal', position: 10, label: 'Revenue Goal', layer: 'strategic' },
  { id: 'business-health', position: 11, label: 'Business Health', layer: 'strategic' },
  { id: 'chef-life-synthesis', position: 12, label: 'Chef Life Synthesis', layer: 'strategic' },
  { id: 'intelligence-digest', position: 13, label: 'Intelligence Digest', layer: 'intelligence' },
  { id: 'cil-signal-summary', position: 14, label: 'CIL Signal Summary', layer: 'intelligence' },
  { id: 'ambient-layer', position: 15, label: 'Ambient Layer', layer: 'intelligence' },
  { id: 'activity-feed', position: 16, label: 'Activity Feed', layer: 'activity' },
  { id: 'weekly-reflection', position: 17, label: 'Weekly Reflection', layer: 'activity' },
  { id: 'quick-notes-tips', position: 18, label: 'Quick Notes & Tips', layer: 'utility' },
  { id: 'feature-suggestions', position: 19, label: 'Feature Suggestions', layer: 'utility' },
] as const

export const SECTION_IDS = SECTION_ORDER.map((s) => s.id)

export function getSectionEntry(id: string): SectionOrderEntry | undefined {
  return SECTION_ORDER.find((s) => s.id === id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/dashboard/section-types.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/section-types.ts tests/lib/dashboard/section-types.test.ts
git commit -m "feat(dashboard): add section types, AttentionChip, and SECTION_ORDER constant"
```

---

### Task 2: Snooze Logic

**Files:**

- Create: `lib/dashboard/snooze.ts`
- Test: `tests/lib/dashboard/snooze.test.ts`

- [ ] **Step 1: Write the failing test for snooze helpers**

```typescript
// tests/lib/dashboard/snooze.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isSnoozed,
  snoozeChip,
  clearSnooze,
  getSnoozedIds,
  SNOOZE_TTL_MS,
} from '@/lib/dashboard/snooze'

describe('snooze', () => {
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, val: string) => mockStorage.set(key, val),
      removeItem: (key: string) => mockStorage.delete(key),
    })
  })

  it('snoozeChip stores chip id with timestamp', () => {
    snoozeChip('msg-1', 85)
    expect(isSnoozed('msg-1', 85)).toBe(true)
  })

  it('isSnoozed returns false for unknown chip', () => {
    expect(isSnoozed('unknown', 50)).toBe(false)
  })

  it('isSnoozed returns false after TTL expires', () => {
    snoozeChip('msg-2', 70)
    // Simulate time passing by writing an old timestamp
    const data = JSON.parse(mockStorage.get('cf:dash-snooze') ?? '{}')
    data['msg-2'].snoozedAt = Date.now() - SNOOZE_TTL_MS - 1000
    mockStorage.set('cf:dash-snooze', JSON.stringify(data))
    expect(isSnoozed('msg-2', 70)).toBe(false)
  })

  it('isSnoozed returns false when urgency increases by 10+', () => {
    snoozeChip('msg-3', 60)
    expect(isSnoozed('msg-3', 60)).toBe(true)
    expect(isSnoozed('msg-3', 70)).toBe(false)
  })

  it('clearSnooze removes a specific chip', () => {
    snoozeChip('msg-4', 50)
    expect(isSnoozed('msg-4', 50)).toBe(true)
    clearSnooze('msg-4')
    expect(isSnoozed('msg-4', 50)).toBe(false)
  })

  it('getSnoozedIds returns all snoozed chip ids', () => {
    snoozeChip('a', 80)
    snoozeChip('b', 70)
    const ids = getSnoozedIds()
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/dashboard/snooze.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/dashboard/snooze.ts

const STORAGE_KEY = 'cf:dash-snooze'
export const SNOOZE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours
const URGENCY_BUMP_THRESHOLD = 10

type SnoozeEntry = {
  snoozedAt: number
  urgencyAtSnooze: number
}

type SnoozeMap = Record<string, SnoozeEntry>

function readStore(): SnoozeMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SnoozeMap
  } catch {
    return {}
  }
}

function writeStore(store: SnoozeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage full or unavailable
  }
}

export function snoozeChip(chipId: string, currentUrgency: number): void {
  const store = readStore()
  store[chipId] = { snoozedAt: Date.now(), urgencyAtSnooze: currentUrgency }
  writeStore(store)
}

export function isSnoozed(chipId: string, currentUrgency: number): boolean {
  const store = readStore()
  const entry = store[chipId]
  if (!entry) return false

  const elapsed = Date.now() - entry.snoozedAt
  if (elapsed > SNOOZE_TTL_MS) return false

  const urgencyIncrease = currentUrgency - entry.urgencyAtSnooze
  if (urgencyIncrease >= URGENCY_BUMP_THRESHOLD) return false

  return true
}

export function clearSnooze(chipId: string): void {
  const store = readStore()
  delete store[chipId]
  writeStore(store)
}

export function getSnoozedIds(): string[] {
  return Object.keys(readStore())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/dashboard/snooze.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/snooze.ts tests/lib/dashboard/snooze.test.ts
git commit -m "feat(dashboard): add snooze logic with TTL and urgency-bump override"
```

---

### Task 3: SectionShell Component

**Files:**

- Create: `components/dashboard/section-shell.tsx`
- Test: `tests/components/dashboard/section-shell.test.tsx`

- [ ] **Step 1: Write the failing test for SectionShell**

```typescript
// tests/components/dashboard/section-shell.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionShell } from '@/components/dashboard/section-shell'

describe('SectionShell', () => {
  it('renders children in expanded mode', () => {
    render(
      <SectionShell sectionId="command-center" mode="expanded" label="Command Center">
        <div data-testid="inner">Full content</div>
      </SectionShell>
    )
    expect(screen.getByTestId('inner')).toBeInTheDocument()
    expect(screen.getByText('Full content')).toBeInTheDocument()
  })

  it('renders compact summary in compact mode', () => {
    render(
      <SectionShell
        sectionId="hero-zone"
        mode="compact"
        label="Hero Zone"
        compactSummary="Revenue: $4.2k MTD"
      >
        <div data-testid="inner">Full content</div>
      </SectionShell>
    )
    expect(screen.getByText('Revenue: $4.2k MTD')).toBeInTheDocument()
    expect(screen.queryByTestId('inner')).not.toBeInTheDocument()
  })

  it('renders whisper text in whisper mode', () => {
    render(
      <SectionShell
        sectionId="activity-feed"
        mode="whisper"
        label="Activity Feed"
        whisperText="Activity Feed: all quiet"
      >
        <div data-testid="inner">Full content</div>
      </SectionShell>
    )
    expect(screen.getByText('Activity Feed: all quiet')).toBeInTheDocument()
    expect(screen.queryByTestId('inner')).not.toBeInTheDocument()
  })

  it('compact mode is clickable to expand', () => {
    render(
      <SectionShell
        sectionId="profit"
        mode="compact"
        label="Profit"
        compactSummary="$2.4k MTD"
      >
        <div data-testid="inner">Full content</div>
      </SectionShell>
    )
    const compactEl = screen.getByText('$2.4k MTD')
    expect(compactEl.closest('button, [role="button"]')).toBeTruthy()
  })

  it('whisper mode uses a single-line layout', () => {
    const { container } = render(
      <SectionShell
        sectionId="weekly"
        mode="whisper"
        label="Weekly Reflection"
        whisperText="Weekly Reflection: nothing new"
      >
        <div>Full</div>
      </SectionShell>
    )
    const whisperEl = container.querySelector('[data-section-mode="whisper"]')
    expect(whisperEl).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/dashboard/section-shell.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```tsx
// components/dashboard/section-shell.tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/ui/icons'
import type { SectionMode } from '@/lib/dashboard/section-types'

type SectionShellProps = {
  sectionId: string
  mode: SectionMode
  label: string
  whisperText?: string | null
  compactSummary?: string | null
  badge?: number
  children: React.ReactNode
}

export function SectionShell({
  sectionId,
  mode,
  label,
  whisperText,
  compactSummary,
  badge,
  children,
}: SectionShellProps) {
  const [forceExpanded, setForceExpanded] = useState(false)

  const effectiveMode = forceExpanded ? 'expanded' : mode

  if (effectiveMode === 'whisper' && !forceExpanded) {
    return (
      <div
        data-section-id={sectionId}
        data-section-mode="whisper"
        className="flex items-center gap-2 py-1.5 px-1 text-sm text-stone-500"
      >
        <button
          type="button"
          onClick={() => setForceExpanded(true)}
          className="flex items-center gap-2 hover:text-stone-400 transition-colors w-full text-left"
        >
          <span>{whisperText ?? `${label}: all clear`}</span>
          <ChevronDown className="h-3 w-3 shrink-0 -rotate-90" />
        </button>
      </div>
    )
  }

  if (effectiveMode === 'compact' && !forceExpanded) {
    return (
      <div
        data-section-id={sectionId}
        data-section-mode="compact"
        className="rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-3"
      >
        <button
          type="button"
          onClick={() => setForceExpanded(true)}
          role="button"
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
              {label}
            </span>
            {badge != null && badge > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-brand-950 border border-brand-800/50 px-1.5 py-0.5 text-[10px] font-bold text-brand-400 tabular-nums">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-300">{compactSummary}</span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-500 -rotate-90" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div data-section-id={sectionId} data-section-mode="expanded">
      {forceExpanded && (
        <button
          type="button"
          onClick={() => setForceExpanded(false)}
          className="mb-2 text-xs text-stone-500 hover:text-stone-400"
        >
          Collapse
        </button>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/dashboard/section-shell.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/section-shell.tsx tests/components/dashboard/section-shell.test.tsx
git commit -m "feat(dashboard): add SectionShell with expanded/compact/whisper modes"
```

---

### Task 4: AttentionRail Component

**Files:**

- Create: `components/dashboard/attention-rail.tsx`
- Test: `tests/components/dashboard/attention-rail.test.tsx`

- [ ] **Step 1: Write the failing test for AttentionRail**

```tsx
// tests/components/dashboard/attention-rail.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AttentionRail } from '@/components/dashboard/attention-rail'
import type { AttentionChip } from '@/lib/dashboard/section-types'

const mockChips: AttentionChip[] = [
  {
    id: 'msg-1',
    icon: 'mail',
    label: '3 unanswered messages',
    age: '2d',
    urgencyScore: 92,
    action: { label: 'View', href: '/messages' },
    sectionId: 'command-center',
    dismissable: true,
  },
  {
    id: 'contract-1',
    icon: 'file-text',
    label: 'Unsigned contract: Johnson',
    age: '5d',
    urgencyScore: 75,
    action: { label: 'Review', href: '/events/123' },
    sectionId: 'tiered-rail',
    dismissable: true,
  },
  {
    id: 'event-1',
    icon: 'calendar',
    label: 'Event in 36h',
    urgencyScore: 60,
    action: { label: 'Prep', href: '/events/456' },
    sectionId: 'schedule',
    dismissable: false,
  },
]

describe('AttentionRail', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })
  })

  it('renders chips sorted by urgencyScore descending', () => {
    render(<AttentionRail chips={mockChips} />)
    const labels = screen.getAllByRole('link').map((el) => el.textContent)
    expect(labels[0]).toContain('3 unanswered messages')
    expect(labels[1]).toContain('Unsigned contract: Johnson')
    expect(labels[2]).toContain('Event in 36h')
  })

  it('renders empty state when no chips', () => {
    render(<AttentionRail chips={[]} />)
    expect(screen.getByText(/all clear/i)).toBeInTheDocument()
  })

  it('shows dismiss button only on dismissable chips', () => {
    render(<AttentionRail chips={mockChips} />)
    const dismissButtons = screen.getAllByLabelText(/dismiss/i)
    expect(dismissButtons).toHaveLength(2)
  })

  it('dismissing a chip removes it from view', () => {
    render(<AttentionRail chips={mockChips} />)
    const dismissButtons = screen.getAllByLabelText(/dismiss/i)
    fireEvent.click(dismissButtons[0])
    expect(screen.queryByText('3 unanswered messages')).not.toBeInTheDocument()
  })

  it('shows age badge when age is provided', () => {
    render(<AttentionRail chips={mockChips} />)
    expect(screen.getByText('2d')).toBeInTheDocument()
    expect(screen.getByText('5d')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/dashboard/attention-rail.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```tsx
// components/dashboard/attention-rail.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Check, X } from '@/components/ui/icons'
import { snoozeChip, isSnoozed } from '@/lib/dashboard/snooze'
import type { AttentionChip } from '@/lib/dashboard/section-types'

type AttentionRailProps = {
  chips: AttentionChip[]
}

export function AttentionRail({ chips }: AttentionRailProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleChips = useMemo(() => {
    return chips
      .filter((c) => !dismissedIds.has(c.id))
      .filter((c) => !isSnoozed(c.id, c.urgencyScore))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
  }, [chips, dismissedIds])

  function handleDismiss(chip: AttentionChip) {
    snoozeChip(chip.id, chip.urgencyScore)
    setDismissedIds((prev) => new Set([...prev, chip.id]))
  }

  if (visibleChips.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/30 px-4 py-2.5">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-sm text-stone-400">All clear</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-700">
      {visibleChips.map((chip) => (
        <div
          key={chip.id}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-700 bg-stone-900/60 pl-3 pr-1.5 py-1.5 text-sm transition-colors hover:border-stone-600"
        >
          <Link
            href={chip.action.href ?? '#'}
            className="flex items-center gap-1.5 text-stone-200 hover:text-white"
          >
            <span className="truncate max-w-[200px]">{chip.label}</span>
            {chip.age && (
              <span className="shrink-0 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 tabular-nums">
                {chip.age}
              </span>
            )}
          </Link>
          {chip.dismissable && (
            <button
              type="button"
              onClick={() => handleDismiss(chip)}
              aria-label={`Dismiss ${chip.label}`}
              className="ml-0.5 rounded-full p-1 text-stone-500 hover:bg-stone-800 hover:text-stone-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/dashboard/attention-rail.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/attention-rail.tsx tests/components/dashboard/attention-rail.test.tsx
git commit -m "feat(dashboard): add AttentionRail component with chip sorting and snooze"
```

---

## Phase 2: Wrap and Reorder

### Task 5: Reorder page.tsx and Add Shells

This task modifies the existing `page.tsx` to reorder sections into the fixed position order from the spec, wraps each section in `SectionShell`, and adds the `AttentionRail` at the top. All sections start in `expanded` mode (zero visual change).

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx`

- [ ] **Step 1: Add AttentionRail import and empty chips array**

Add these imports at the top of `page.tsx`:

```typescript
import { AttentionRail } from '@/components/dashboard/attention-rail'
import { SectionShell } from '@/components/dashboard/section-shell'
import type { AttentionChip } from '@/lib/dashboard/section-types'
```

- [ ] **Step 2: Add AttentionRail as the first element inside the dashboard div**

Insert immediately after the opening `<div className="dashboard-page ...">`:

```tsx
{
  /* Attention Rail: urgency chips at top */
}
;<AttentionRail chips={[]} />
```

This renders the "All clear" empty state. Chips will be wired in Phase 4.

- [ ] **Step 3: Wrap each existing section in SectionShell**

Wrap every `WidgetErrorBoundary` block in a `SectionShell`. Each section starts with `mode="expanded"`. Example for Command Center:

```tsx
<SectionShell sectionId="command-center" mode="expanded" label="Command Center">
  <WidgetErrorBoundary name="Command Center" compact>
    <Suspense fallback={<CommandCenterSkeleton />}>
      <CommandCenterLoader />
    </Suspense>
  </WidgetErrorBoundary>
</SectionShell>
```

Apply this pattern to all 18 sections currently in `page.tsx`. Each gets its matching `sectionId` from `SECTION_ORDER`.

- [ ] **Step 4: Reorder sections to match the fixed position table**

Reorder the JSX blocks inside the return to match spec positions 1-19:

1. Command Center
2. Daily Plan Banner
3. This Week
4. Schedule (import ScheduleSection if not already present, or skip if not wired)
5. Tiered Rail
6. Pricing Alerts
7. Onboarding
8. Hero Zone
9. Profit at a Glance
10. Revenue Goal
11. Business Health
12. Chef Life Synthesis
13. Intelligence Digest
14. CIL Signal Summary
15. Ambient Layer
16. Activity Feed
17. Weekly Reflection
18. Quick Notes + Chef Tips (keep the side-by-side grid)
19. Feature Suggestions

- [ ] **Step 5: Verify no visual regression**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

Start the dev server at http://localhost:3100 and load the dashboard. Every section should render identically to before. The only visible addition is the "All clear" rail at the top.

- [ ] **Step 6: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(dashboard): reorder sections to fixed positions, wrap in SectionShell, add AttentionRail"
```

---

## Phase 3: Smart Modes (First 3 Sections)

### Task 6: Command Center Smart Mode

The Command Center already computes attention data via `getCommandCenterData()`. This task adds a mode calculation: if there are zero attention items, render in whisper mode.

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx` (CommandCenterLoader and its SectionShell)

- [ ] **Step 1: Compute mode from command center data**

Update `CommandCenterLoader` to return both the component and the weight data. Create a new wrapper:

```tsx
async function CommandCenterWithWeight() {
  const data = await getCommandCenterData()
  const totalItems = (data.attentionItems?.length ?? 0) + (data.urgentItems?.length ?? 0)
  const mode = totalItems > 0 ? 'expanded' : 'whisper'
  const whisperText = totalItems === 0 ? 'Command Center: all clear' : null

  return (
    <SectionShell
      sectionId="command-center"
      mode={mode}
      label="Command Center"
      whisperText={whisperText}
    >
      <WidgetErrorBoundary name="Command Center" compact>
        <CommandCenterLayout data={data} onRefresh={getCommandCenterData} />
      </WidgetErrorBoundary>
    </SectionShell>
  )
}
```

Note: The `SectionShell` must be inside the `Suspense` boundary since the mode is computed from server data. Restructure the JSX:

```tsx
<Suspense fallback={<CommandCenterSkeleton />}>
  <CommandCenterWithWeight />
</Suspense>
```

- [ ] **Step 2: Verify Command Center whisper mode on empty data**

This is hard to test in production without wiping data. Verify by temporarily hardcoding `mode="whisper"` and confirming the whisper line renders. Then revert to the data-driven logic.

- [ ] **Step 3: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(dashboard): add smart mode for Command Center section"
```

---

### Task 7: Daily Plan Smart Mode

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx` (DailyPlanBannerLoader and its SectionShell)

- [ ] **Step 1: Compute mode from daily plan stats**

The existing `DailyPlanBannerLoader` already returns `null` when no items. Change to use SectionShell:

```tsx
async function DailyPlanWithWeight() {
  const stats = await getDailyPlanStats().catch((err) => {
    console.error('[Dashboard] getDailyPlanStats failed:', err)
    return null
  })

  if (!stats || stats.totalItems <= 0) {
    return (
      <SectionShell
        sectionId="daily-plan"
        mode="whisper"
        label="Daily Plan"
        whisperText="Daily Plan: nothing scheduled"
      >
        <span />
      </SectionShell>
    )
  }

  const completed = stats.completedItems ?? 0
  const total = stats.totalItems
  const mode = total - completed > 0 ? 'expanded' : 'compact'
  const compactSummary = `${completed}/${total} complete`

  return (
    <SectionShell
      sectionId="daily-plan"
      mode={mode}
      label="Daily Plan"
      compactSummary={compactSummary}
    >
      <DailyPlanBanner stats={stats} />
    </SectionShell>
  )
}
```

- [ ] **Step 2: Replace the old DailyPlan section in JSX**

```tsx
<WidgetErrorBoundary name="Daily Plan" compact>
  <Suspense fallback={null}>
    <DailyPlanWithWeight />
  </Suspense>
</WidgetErrorBoundary>
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(dashboard): add smart mode for Daily Plan section"
```

---

### Task 8: This Week Smart Mode

**Files:**

- Modify: `app/(chef)/dashboard/_sections/this-week-section.tsx`

- [ ] **Step 1: Compute mode and wrap in SectionShell**

The `ThisWeekSection` already wraps content in `DashboardSection`. Replace the outer `DashboardSection` with `SectionShell`. Compute mode from data:

At the top of `ThisWeekSection`, after the data fetches:

```tsx
import { SectionShell } from '@/components/dashboard/section-shell'

// After all data is fetched, compute mode
const hasScheduleItems =
  todaysSchedule != null || weekSchedule.days.some((d) => d.events?.length > 0)
const hasOverdueItems = dopTaskDigest.overdueCount > 0
const mode = hasOverdueItems ? 'expanded' : hasScheduleItems ? 'expanded' : 'whisper'
const whisperText = !hasScheduleItems ? 'This Week: clear schedule' : null
```

Replace the outer `<DashboardSection id="this-week" title="This Week">` with:

```tsx
<SectionShell sectionId="this-week" mode={mode} label="This Week" whisperText={whisperText}>
  <div className="space-y-4">{/* existing inner content unchanged */}</div>
</SectionShell>
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add app/(chef)/dashboard/_sections/this-week-section.tsx
git commit -m "feat(dashboard): add smart mode for This Week section"
```

---

## Phase 4: Attention Rail Goes Live

### Task 9: Chip Provider Pattern

Establish the pattern for sections to provide chips. Each section that produces chips exports a `getChips` async function alongside its component.

**Files:**

- Create: `lib/dashboard/chip-providers.ts`
- Test: `tests/lib/dashboard/chip-providers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/dashboard/chip-providers.test.ts
import { describe, it, expect } from 'vitest'
import { mergeChips, filterActiveChips } from '@/lib/dashboard/chip-providers'
import type { AttentionChip } from '@/lib/dashboard/section-types'

describe('chip-providers', () => {
  const chips: AttentionChip[] = [
    {
      id: 'a',
      icon: 'mail',
      label: 'Test A',
      urgencyScore: 90,
      action: { label: 'Go', href: '/a' },
      sectionId: 'command-center',
      dismissable: true,
    },
    {
      id: 'b',
      icon: 'calendar',
      label: 'Test B',
      urgencyScore: 45,
      action: { label: 'Go', href: '/b' },
      sectionId: 'schedule',
      dismissable: false,
    },
    {
      id: 'c',
      icon: 'alert',
      label: 'Test C',
      urgencyScore: 72,
      action: { label: 'Go', href: '/c' },
      sectionId: 'tiered-rail',
      dismissable: true,
    },
  ]

  it('mergeChips concatenates and deduplicates by id', () => {
    const batch1 = [chips[0]]
    const batch2 = [chips[0], chips[1]]
    const merged = mergeChips(batch1, batch2)
    expect(merged).toHaveLength(2)
  })

  it('filterActiveChips removes chips below score 50', () => {
    const active = filterActiveChips(chips)
    expect(active).toHaveLength(2)
    expect(active.find((c) => c.id === 'b')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/dashboard/chip-providers.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/dashboard/chip-providers.ts
import type { AttentionChip } from '@/lib/dashboard/section-types'

const MIN_CHIP_SCORE = 50

export function mergeChips(...batches: AttentionChip[][]): AttentionChip[] {
  const seen = new Set<string>()
  const result: AttentionChip[] = []
  for (const batch of batches) {
    for (const chip of batch) {
      if (!seen.has(chip.id)) {
        seen.add(chip.id)
        result.push(chip)
      }
    }
  }
  return result
}

export function filterActiveChips(chips: AttentionChip[]): AttentionChip[] {
  return chips.filter((c) => c.urgencyScore >= MIN_CHIP_SCORE)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/dashboard/chip-providers.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/chip-providers.ts tests/lib/dashboard/chip-providers.test.ts
git commit -m "feat(dashboard): add chip merge/filter helpers for attention rail"
```

---

### Task 10: Wire Chips Into page.tsx

This task collects chips from section loaders and passes them to the `AttentionRail`. Start with Command Center chips (messages) and Tiered Rail chips (priority queue items).

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx`

- [ ] **Step 1: Create chip extraction functions**

Add chip extraction functions inside `page.tsx` (or as separate server functions). These compute chips from data already fetched by the section loaders.

```typescript
import { mergeChips, filterActiveChips } from '@/lib/dashboard/chip-providers'
import type { AttentionChip } from '@/lib/dashboard/section-types'

function commandCenterChips(
  data: Awaited<ReturnType<typeof getCommandCenterData>>
): AttentionChip[] {
  const chips: AttentionChip[] = []
  const unanswered = data.attentionItems?.filter((i) => i.type === 'unanswered_message') ?? []
  if (unanswered.length > 0) {
    chips.push({
      id: 'cc-unanswered',
      icon: 'mail',
      label: `${unanswered.length} unanswered message${unanswered.length > 1 ? 's' : ''}`,
      age: unanswered[0]?.age,
      urgencyScore: Math.min(50 + unanswered.length * 15, 100),
      action: { label: 'View', href: '/messages' },
      sectionId: 'command-center',
      dismissable: true,
    })
  }
  return chips
}

function queueChips(queue: PriorityQueue): AttentionChip[] {
  if (!queue.nextAction) return []
  const item = queue.nextAction
  const scoreMap = { critical: 95, high: 80, medium: 60, low: 40 } as const
  const score = scoreMap[item.urgency as keyof typeof scoreMap] ?? 50
  if (score < 50) return []
  return [
    {
      id: `queue-${item.id}`,
      icon: 'alert-triangle',
      label: item.title,
      age: item.contextLine ?? undefined,
      urgencyScore: score,
      action: { label: 'Resolve', href: item.href },
      sectionId: 'tiered-rail',
      dismissable: true,
    },
  ]
}
```

- [ ] **Step 2: Collect chips in ChefDashboard and pass to AttentionRail**

In the `ChefDashboard` function, fetch command center data and queue data, extract chips, and pass to the rail. Since the rail is a client component at the top and data comes from server components, use a pattern where chip data is computed at the page level:

```tsx
export default async function ChefDashboard() {
  const user = await requireChef()
  const businessHealthLoaded = cookies().get('cf-dash-bh-loaded')?.value === '1'

  const [queueResult, ccData] = await Promise.all([
    getPriorityQueue().catch(() => EMPTY_PRIORITY_QUEUE),
    getCommandCenterData().catch(() => ({ attentionItems: [], urgentItems: [] })),
  ])

  const allChips = filterActiveChips(
    mergeChips(commandCenterChips(ccData), queueChips(queueResult))
  )

  return (
    <div className="dashboard-page min-h-screen space-y-8 sm:space-y-10">
      <AttentionRail chips={allChips} />
      {/* ... sections ... */}
    </div>
  )
}
```

**Avoiding double-fetch:** `getCommandCenterData` is already called by `CommandCenterLoader`. Fetch once at page level:

1. Remove the internal `getCommandCenterData()` call from `CommandCenterWithWeight`
2. Pass `ccData` as a prop: `<CommandCenterWithWeight data={ccData} />`
3. Update `CommandCenterWithWeight` signature to accept `data` instead of fetching

Same pattern for CIL signals: fetch once, pass to both chip extractor and `CilSignalSummary` (update it to accept signals as a prop).

**Chip sources not yet wired (follow-up tasks):**

- Events within 48h needing attention (requires reading from schedule data)
- Unsigned contracts / overdue invoices (requires reading from queue or finance data)
- These follow the same pattern: extract function + add to `mergeChips()` call

- [ ] **Step 3: Verify typecheck and visual test**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

Load dashboard at http://localhost:3100. If there are unanswered messages or queue items, they should appear as chips in the rail. If everything is quiet, the rail shows "All clear".

- [ ] **Step 4: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(dashboard): wire command center and queue chips into AttentionRail"
```

---

### Task 11: CIL Signal Chips

Wire CIL signals into the attention rail. CIL signals already have `urgency` and `confidence` scores.

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx`

- [ ] **Step 1: Add CIL chip extraction function**

```typescript
import { getSignalsForDisplay } from '@/lib/cil/signal-actions'
import type { ProactiveSignal } from '@/lib/cil/types'

function cilChips(signals: ProactiveSignal[]): AttentionChip[] {
  return signals
    .filter((s) => s.urgency >= 3)
    .slice(0, 3)
    .map((s) => ({
      id: `cil-${s.id}`,
      icon: 'brain',
      label: s.title,
      urgencyScore: Math.min(s.urgency * 20 + s.confidence * 10, 100),
      action: {
        label: 'Review',
        href: s.actionHref ?? '/dashboard#cil-signal-summary',
      },
      sectionId: 'cil-signal-summary',
      dismissable: true,
    }))
}
```

- [ ] **Step 2: Add CIL signals to the chip collection**

In `ChefDashboard`, add to the Promise.all:

```typescript
const [queueResult, ccData, cilSignals] = await Promise.all([
  getPriorityQueue().catch(() => EMPTY_PRIORITY_QUEUE),
  getCommandCenterData().catch(() => ({ attentionItems: [], urgentItems: [] })),
  getSignalsForDisplay().catch(() => []),
])

const allChips = filterActiveChips(
  mergeChips(commandCenterChips(ccData), queueChips(queueResult), cilChips(cilSignals))
)
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(dashboard): wire CIL signal chips into AttentionRail"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full test suite for new files**

Run: `npx vitest run tests/lib/dashboard/ tests/components/dashboard/`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0

- [ ] **Step 3: Visual verification at http://localhost:3100**

Verify:

1. Attention Rail renders at top of dashboard
2. Chips appear for any urgent items (messages, queue, CIL signals)
3. "All clear" shows when nothing is urgent
4. Dismissing a chip removes it; it reappears after 4 hours
5. Sections are in the new fixed order
6. Command Center, Daily Plan, This Week show smart modes
7. All other sections render expanded (identical to before)
8. No console errors

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat(dashboard): complete Dashboard as Daily Driver (phases 1-4)"
```

---

## Remaining Smart Modes (Future Tasks)

After the 4 phases ship, each remaining section (positions 5-19) can independently get smart mode logic. Each follows the same pattern:

1. Wrap server component to compute mode from its data
2. Add whisperText and compactSummary
3. Optionally add `getChips()` for attention rail integration

Priority order for remaining sections:

- Tiered Rail (already produces chips, add compact mode)
- Pricing Alerts (compact when no anomalies)
- Hero Zone (always compact or expanded, never whisper)
- Business Health (compact with key metric)
- Intelligence sections (whisper when no signals)
- Activity Feed (whisper when empty)
- Utility sections (whisper by default)

These are independent tasks that can be dispatched to parallel agents.
