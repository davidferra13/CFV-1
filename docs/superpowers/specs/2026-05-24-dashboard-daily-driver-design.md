# Dashboard as Daily Driver

> Design spec for transforming the ChefFlow dashboard from 18 stacked sections into a data-driven daily operations surface with an Attention Rail + Fixed Base architecture.

## Problem

The dashboard has 49 section files and renders up to 19 sections in a vertical scroll (some conditional, some dormant). A chef with 10 active dinners opens the app and faces a wall of widgets: pricing alerts, hero metrics, feature suggestions, chef tips, and ambient layers compete for attention equally. The most urgent item (an unanswered client message) might be buried below the fold.

The dashboard is the hub ("all roads lead to and from it"), but nothing is prioritized. Smart sections expand next to quiet sections. There is no signal about what needs attention NOW.

## Design: Attention Rail + Fixed Base

Two layers:

1. **Attention Rail** (top): compact horizontal strip of action chips showing what is on fire
2. **Fixed Base** (below): all sections in a permanent fixed order, each rendering in one of three modes based on its data

### Attention Rail

A horizontal strip of action chips, always visible, always first on the page.

**Chip anatomy:**

- Icon (contextual)
- Short label: "3 unanswered messages"
- Age or deadline: "2d" or "in 36h"
- Primary action (link or handler)
- Dismissable (snooze, not delete)

**Chip sources (extensible):**

- Unanswered client messages (24h+)
- Events within 48h needing attention (prep, confirm, missing items)
- Unsigned contracts, overdue invoices, missing deposits
- CIL critical signals (severity above threshold)
- Overdue priority queue items
- Any section can register chips via a standard interface

**Sorting:** Chips sort left-to-right by urgency score (highest first).

**Empty state:** Single line: "All clear" with a subtle check mark.

**Key rule:** The rail is a mirror, not a container. Chips point to content in sections below. Dismissing a chip snoozes the promotion; it does not dismiss the underlying item.

**Snooze:** Dismissed chips stored in cookie/localStorage with TTL. Reappear after 4 hours or when urgency score increases by 10+.

### Section Render Modes

Every section renders in one of three modes based on its data:

| Mode         | When                                | What it looks like                                      |
| ------------ | ----------------------------------- | ------------------------------------------------------- |
| **Expanded** | Section has actionable items        | Full content, cards, charts, actions (current behavior) |
| **Compact**  | Section has data but nothing urgent | Key metric + one-line summary                           |
| **Whisper**  | Zero actionable items               | Single line: "Messages: all caught up"                  |

On a quiet day, the dashboard is mostly whispers with strategic sections compact. Fast scan, minimal scroll. On a hot day, top sections expand and the rail is full. Dashboard grows because there is more to do.

### Fixed Section Order

Sections never reorder. Position is permanent for muscle memory.

| #   | Section                 | Layer        | What it answers                           |
| --- | ----------------------- | ------------ | ----------------------------------------- |
| 1   | Command Center          | Urgent       | Unified attention items, inbound messages |
| 2   | Daily Plan              | Tactical     | What am I doing today?                    |
| 3   | This Week               | Tactical     | What is coming up?                        |
| 4   | Schedule                | Tactical     | Calendar view, event timing               |
| 5   | Tiered Rail             | Safety       | Priority queue, overdue tasks             |
| 6   | Pricing Alerts          | Safety       | Price anomalies, PIE signals              |
| 7   | Onboarding              | Safety       | Setup gaps (hides when complete)          |
| 8   | Hero Zone               | Strategic    | Key metrics at a glance                   |
| 9   | Profit at a Glance      | Strategic    | Money snapshot                            |
| 10  | Revenue Goal            | Strategic    | Target tracking                           |
| 11  | Business Health         | Strategic    | Full health assessment                    |
| 12  | Chef Life Synthesis     | Strategic    | Cross-domain narrative                    |
| 13  | Intelligence Digest     | Intelligence | CIL signals, patterns                     |
| 14  | CIL Signal Summary      | Intelligence | System pulse                              |
| 15  | Ambient Layer           | Intelligence | Background intelligence                   |
| 16  | Activity Feed           | Activity     | Recent actions across the system          |
| 17  | Weekly Reflection       | Activity     | End-of-week retro                         |
| 18  | Quick Notes + Chef Tips | Utility      | Notes, tips (side-by-side)                |
| 19  | Feature Suggestions     | Utility      | Product discovery                         |

### Section Weight Contract

The interface every dashboard section implements.

```typescript
type SectionMode = 'expanded' | 'compact' | 'whisper'

type AttentionChip = {
  id: string
  icon: string
  label: string
  age?: string
  urgencyScore: number // 0-100
  action: { label: string; href?: string; actionId?: string }
  sectionId: string
  dismissable: boolean
}

interface DashboardSection {
  id: string
  position: number
  getMode(): SectionMode
  getChips(): AttentionChip[]
}
```

**Urgency score guidelines:**

| Score    | Meaning                   | Example                                           |
| -------- | ------------------------- | ------------------------------------------------- |
| 90-100   | Act now or lose something | Client waiting 3+ days, event tomorrow unprepared |
| 70-89    | Needs attention today     | Unsigned contract (5d), deposit overdue           |
| 50-69    | Worth noting              | Event in 4 days, CIL anomaly detected             |
| Below 50 | No chip generated         | Quiet sections produce no chips                   |

### Data Flow

1. Dashboard page loads all sections in parallel (Suspense boundaries, same as today)
2. Each section's server component fetches its data and computes mode + chips
3. Attention Rail collects all chips, sorts by urgencyScore, renders the strip
4. Each section renders itself in its computed mode via SectionShell wrapper
5. Whisper sections render a single `<div>` with text (near-zero render cost)

## Transition Strategy

Four phases. Each ships independently. No big bang.

### Phase 1: Infrastructure (no visible change)

- Add `DashboardSection` interface and `AttentionChip` type to `lib/dashboard/types.ts`
- Build `AttentionRail` component (renders chips, handles dismiss/snooze)
- Build `SectionShell` wrapper component that handles expanded/compact/whisper rendering
- Each shell wraps existing section components without rewriting them

### Phase 2: Wrap and reorder (looks the same)

- Each of the 19 sections gets wrapped in `SectionShell`
- Initial mode: all sections return `expanded` (identical to current dashboard)
- Reorder sections in `page.tsx` to match the fixed position table
- Ship. Dashboard looks the same but architecture is in place.

### Phase 3: Smart modes (sections start breathing)

- One section at a time, implement `getMode()` logic
- Start with highest-value: Command Center, Daily Plan, This Week
- Each section gets compact and whisper variants
- Ship incrementally. Dashboard gets smarter with each section.

### Phase 4: Attention Rail goes live

- Implement `getChips()` for each section
- Wire chips into the Attention Rail
- Add snooze/dismiss behavior (cookie/localStorage with TTL)
- CIL signals produce chips via existing scoring infrastructure

### What stays untouched

- All 49 section files remain. No deletions.
- All data fetching logic unchanged.
- All existing components render inside expanded mode (current behavior preserved).
- Error boundaries and Suspense wrappers stay.
- Command Center remains the primary unified component.

### What changes

- Section render order in `page.tsx`
- Each section wrapped in `SectionShell`
- New: `AttentionRail` component at top of dashboard
- New: `getMode()` and `getChips()` per section (added incrementally)
- New: compact and whisper variants per section (added incrementally)

## Success Criteria

1. Chef opens dashboard and knows what needs attention in under 5 seconds (via Attention Rail)
2. On a quiet day, dashboard fits on one screen (mostly whispers)
3. On a hot day, urgent items are above the fold, strategic items compress
4. Section positions never change between visits (muscle memory preserved)
5. Zero data fetching changes required (same server components, same queries)
6. Phase 2 ships with zero visual regression from current dashboard

## Non-Goals

- Not redesigning individual section internals (they keep their current UI)
- Not adding new data sources (uses existing queries and CIL signals)
- Not building a drag-and-drop customization system
- Not changing mobile layout (responsive behavior handled by SectionShell)
