# Rail God Mode: Phase 1 (Foundation) + Phase 2 (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the God Mode tier system, 5 hot chef domain resolvers, assembly pipeline, and the RailFull + RailStrip UI components so a chef sees every actionable item organized by urgency tier with inline actions.

**Architecture:** New `GodModeResolvedItem` type with P0-P4 tier assignment. 5 domain resolvers (inquiry, message, payment, event, quote) query DB directly and return pre-hydrated items with tier + inline actions. New assembly function merges resolver output, applies escalation/dismissal, sorts tier-first. Two new components: `RailFull` (dashboard, tier-grouped dense list) and `RailStrip` (persistent compact bar on every chef page). Existing registry/scoring/state tables untouched.

**Tech Stack:** Next.js 15, React 19, TypeScript, node:test, Drizzle/postgres.js, Tailwind, SSE (lib/realtime/sse-server.ts)

**Spec:** `docs/superpowers/specs/2026-05-14-rail-god-mode-design.md`

**Scope:** Phase 1 (Foundation) + Phase 2 (Full Rail + Strip UI). Phases 3-7 (depth resolvers, widgets, all roles, public unification) get separate plans after this proves out.

---

## File Structure

### New Files

| File                                               | Responsibility                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/discovery/god-mode-types.ts`                  | RailTier, GodModeResolvedItem, InlineAction, GodModeResolverContext, GodModeRailResult types |
| `lib/discovery/resolvers/chef/inquiry-resolver.ts` | Inquiry domain: unanswered inquiries with tier assignment                                    |
| `lib/discovery/resolvers/chef/message-resolver.ts` | Chat domain: unread conversations with client/event context                                  |
| `lib/discovery/resolvers/chef/payment-resolver.ts` | Payment domain: overdue invoices, pending deposits                                           |
| `lib/discovery/resolvers/chef/event-resolver.ts`   | Event domain: upcoming events with readiness gaps                                            |
| `lib/discovery/resolvers/chef/quote-resolver.ts`   | Quote domain: drafts, expiring quotes, unviewed sent quotes                                  |
| `lib/discovery/god-mode-dispatcher.ts`             | Orchestrates domain resolvers in parallel, merges results                                    |
| `lib/discovery/god-mode-assembly.ts`               | Tier-first sorting, escalation, dismissal filtering, strip extraction                        |
| `lib/discovery/inline-action-registry.ts`          | Maps action identifiers to server action functions                                           |
| `components/rail/rail-tier-group.tsx`              | Renders one tier section (header + item list), handles collapse                              |
| `components/rail/rail-item-row.tsx`                | Single dense rail item row with inline action buttons                                        |
| `components/rail/rail-full.tsx`                    | Full rail: all tiers stacked, P0/P1 always expanded                                          |
| `components/rail/rail-strip.tsx`                   | Compact persistent strip: P0/P1 items, auto-rotate, SSE                                      |
| `components/rail/rail-strip-wrapper.tsx`           | Server component wrapper for RailStrip (fetches data)                                        |
| `tests/unit/resolvers/inquiry-resolver.test.ts`    | Inquiry resolver tier logic tests                                                            |
| `tests/unit/resolvers/message-resolver.test.ts`    | Message resolver tier logic tests                                                            |
| `tests/unit/resolvers/payment-resolver.test.ts`    | Payment resolver tier logic tests                                                            |
| `tests/unit/resolvers/event-resolver.test.ts`      | Event resolver tier logic tests                                                              |
| `tests/unit/resolvers/quote-resolver.test.ts`      | Quote resolver tier logic tests                                                              |
| `tests/unit/god-mode-assembly.test.ts`             | Assembly pipeline: sorting, escalation, strip extraction                                     |
| `tests/unit/god-mode-dispatcher.test.ts`           | Dispatcher: parallel execution, error isolation                                              |

### Modified Files

| File                                      | Change                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| `lib/discovery/universal-rail-actions.ts` | Add `getGodModeRail()` and `getRailStrip()` server actions |
| `app/(chef)/dashboard/page.tsx`           | Replace current layout with rail-dominant + widget sidebar |
| `app/(chef)/layout.tsx`                   | Add RailStrip between nav and content                      |

---

## Task 1: God Mode Types

**Files:**

- Create: `lib/discovery/god-mode-types.ts`
- Test: `tests/unit/god-mode-types.test.ts`

- [ ] **Step 1: Write type validation test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  RailTier,
  GodModeResolvedItem,
  InlineAction,
  GodModeResolverContext,
  GodModeRailResult,
} from '@/lib/discovery/god-mode-types'
import {
  TIER_ORDER,
  TIER_CONFIG,
  compareTiers,
  isExpandedByDefault,
} from '@/lib/discovery/god-mode-types'

test('TIER_ORDER sorts P0 before P4', () => {
  assert.deepEqual(TIER_ORDER, ['p0', 'p1', 'p2', 'p3', 'p4'])
})

test('TIER_CONFIG has correct names', () => {
  assert.equal(TIER_CONFIG.p0.name, 'Act Now')
  assert.equal(TIER_CONFIG.p1.name, 'Today')
  assert.equal(TIER_CONFIG.p2.name, 'This Week')
  assert.equal(TIER_CONFIG.p3.name, 'On Your Radar')
  assert.equal(TIER_CONFIG.p4.name, 'Ambient')
})

test('TIER_CONFIG has correct colors', () => {
  assert.equal(TIER_CONFIG.p0.color, 'red')
  assert.equal(TIER_CONFIG.p1.color, 'amber')
  assert.equal(TIER_CONFIG.p2.color, 'blue')
  assert.equal(TIER_CONFIG.p3.color, 'gray')
  assert.equal(TIER_CONFIG.p4.color, 'dim')
})

test('P0 and P1 are always expanded', () => {
  assert.equal(TIER_CONFIG.p0.alwaysExpanded, true)
  assert.equal(TIER_CONFIG.p1.alwaysExpanded, true)
  assert.equal(TIER_CONFIG.p2.alwaysExpanded, false)
  assert.equal(TIER_CONFIG.p3.alwaysExpanded, false)
  assert.equal(TIER_CONFIG.p4.alwaysExpanded, false)
})

test('compareTiers sorts P0 before P1', () => {
  assert.ok(compareTiers('p0', 'p1') < 0)
  assert.ok(compareTiers('p4', 'p0') > 0)
  assert.equal(compareTiers('p2', 'p2'), 0)
})

test('isExpandedByDefault matches alwaysExpanded + P2', () => {
  assert.equal(isExpandedByDefault('p0'), true)
  assert.equal(isExpandedByDefault('p1'), true)
  assert.equal(isExpandedByDefault('p2'), true)
  assert.equal(isExpandedByDefault('p3'), false)
  assert.equal(isExpandedByDefault('p4'), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/god-mode-types.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the types module**

```typescript
// God Mode types for the rail tier system.
// Extends the universal rail with priority tiers, rich resolved items,
// and inline action support.

import type { UniversalRailRole } from './universal-rail-types'

// ---------------------------------------------------------------------------
// Tier system
// ---------------------------------------------------------------------------

export type RailTier = 'p0' | 'p1' | 'p2' | 'p3' | 'p4'

export const TIER_ORDER: RailTier[] = ['p0', 'p1', 'p2', 'p3', 'p4']

export interface TierConfig {
  name: string
  color: 'red' | 'amber' | 'blue' | 'gray' | 'dim'
  alwaysExpanded: boolean
  pulses: boolean
}

export const TIER_CONFIG: Record<RailTier, TierConfig> = {
  p0: { name: 'Act Now', color: 'red', alwaysExpanded: true, pulses: true },
  p1: { name: 'Today', color: 'amber', alwaysExpanded: true, pulses: false },
  p2: { name: 'This Week', color: 'blue', alwaysExpanded: false, pulses: false },
  p3: { name: 'On Your Radar', color: 'gray', alwaysExpanded: false, pulses: false },
  p4: { name: 'Ambient', color: 'dim', alwaysExpanded: false, pulses: false },
}

export function compareTiers(a: RailTier, b: RailTier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)
}

export function isExpandedByDefault(tier: RailTier): boolean {
  return tier === 'p0' || tier === 'p1' || tier === 'p2'
}

// ---------------------------------------------------------------------------
// Inline actions
// ---------------------------------------------------------------------------

export type InlineActionVariant = 'default' | 'destructive' | 'success'

export interface InlineAction {
  label: string
  action: string
  params: Record<string, unknown>
  variant: InlineActionVariant
}

// ---------------------------------------------------------------------------
// Resolved item (output of domain resolvers)
// ---------------------------------------------------------------------------

export interface GodModeResolvedItem {
  definitionId: string
  tier: RailTier
  label: string
  context: string
  destination: string
  icon?: string
  inlineActions?: InlineAction[]
  data?: Record<string, unknown>
  expiresAt?: Date
  escalatesAt?: Date
  score?: number
}

// ---------------------------------------------------------------------------
// Resolver contract
// ---------------------------------------------------------------------------

export interface GodModeResolverContext {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
}

export type GodModeResolver = (ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>

// ---------------------------------------------------------------------------
// Assembly result
// ---------------------------------------------------------------------------

export interface GodModeRailResult {
  tiers: Record<RailTier, GodModeResolvedItem[]>
  totalItems: number
  assembledAt: string
}

export interface GodModeStripResult {
  items: GodModeResolvedItem[]
  hasP0: boolean
  totalUrgent: number
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/god-mode-types.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/god-mode-types.ts tests/unit/god-mode-types.test.ts
git commit -m "feat(rail): add God Mode tier types and constants"
```

---

## Task 2: Inquiry Resolver

**Files:**

- Create: `lib/discovery/resolvers/chef/inquiry-resolver.ts`
- Test: `tests/unit/resolvers/inquiry-resolver.test.ts`

**Data sources:** `getInquiries()` from `lib/inquiries/actions.ts`. Key fields: `id`, `status`, `created_at`, `last_response_at`, `confirmed_guest_count`, `confirmed_date` (or `confirmed_occasion`), `confirmed_location`, `client_name`, `client` (joined object with `full_name`).

**Tier rules from spec:**

- No response > 48h: P0
- No response > 24h: P1
- New today: P1
- Has response, waiting on client: P2
- Closed/resolved: don't emit

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolverContext } from '@/lib/discovery/god-mode-types'

// We test the pure tier-assignment logic, not DB queries.
// The resolver exports a testable function for this.
import {
  assignInquiryTier,
  buildInquiryLabel,
  type InquiryRow,
} from '@/lib/discovery/resolvers/chef/inquiry-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseInquiry: InquiryRow = {
  id: 'inq-1',
  status: 'new',
  created_at: '2026-05-14T10:00:00.000Z',
  last_response_at: null,
  confirmed_guest_count: 12,
  confirmed_occasion: 'Birthday Dinner',
  confirmed_date: '2026-06-14',
  confirmed_location: 'Cape Cod',
  client_name: 'Sarah B.',
  client: { id: 'c-1', full_name: 'Sarah Brown', email: 'sarah@test.com' },
}

test('new inquiry no response > 48h is P0', () => {
  const old = {
    ...baseInquiry,
    created_at: '2026-05-12T10:00:00.000Z', // 50h ago
  }
  assert.equal(assignInquiryTier(old, now), 'p0')
})

test('new inquiry no response > 24h is P1', () => {
  const dayOld = {
    ...baseInquiry,
    created_at: '2026-05-13T10:00:00.000Z', // 26h ago
  }
  assert.equal(assignInquiryTier(dayOld, now), 'p1')
})

test('new inquiry today is P1', () => {
  assert.equal(assignInquiryTier(baseInquiry, now), 'p1')
})

test('awaiting_client is P2', () => {
  const waiting = {
    ...baseInquiry,
    status: 'awaiting_client' as const,
    last_response_at: '2026-05-14T09:00:00.000Z',
  }
  assert.equal(assignInquiryTier(waiting, now), 'p2')
})

test('awaiting_chef no response > 48h is P0', () => {
  const stale = {
    ...baseInquiry,
    status: 'awaiting_chef' as const,
    created_at: '2026-05-11T10:00:00.000Z',
    last_response_at: null,
  }
  assert.equal(assignInquiryTier(stale, now), 'p0')
})

test('confirmed/declined/expired returns null (no emit)', () => {
  for (const status of ['confirmed', 'declined', 'expired'] as const) {
    const closed = { ...baseInquiry, status }
    assert.equal(assignInquiryTier(closed, now), null)
  }
})

test('buildInquiryLabel creates dense God Mode label', () => {
  const label = buildInquiryLabel(baseInquiry, now)
  assert.ok(label.includes('Sarah B.'))
  assert.ok(label.includes('12'))
  assert.ok(label.includes('Jun 14'))
  assert.ok(label.includes('Cape Cod'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/resolvers/inquiry-resolver.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the inquiry resolver**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

// ---------------------------------------------------------------------------
// Row shape (subset of inquiry table fields we need)
// ---------------------------------------------------------------------------

export interface InquiryRow {
  id: string
  status: string
  created_at: string
  last_response_at: string | null
  confirmed_guest_count: number | null
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_location: string | null
  client_name: string | null
  client: { id: string; full_name: string; email: string | null } | null
}

// ---------------------------------------------------------------------------
// Pure logic (exported for testing)
// ---------------------------------------------------------------------------

const MS_HOUR = 3_600_000
const CLOSED_STATUSES = new Set(['confirmed', 'declined', 'expired'])

export function assignInquiryTier(row: InquiryRow, now: Date): RailTier | null {
  if (CLOSED_STATUSES.has(row.status)) return null

  // Waiting on client response: lower urgency
  if (row.status === 'awaiting_client') return 'p2'

  // For new/awaiting_chef: measure hours since creation with no chef response
  const referenceTime = row.last_response_at ?? row.created_at
  const hoursSince = (now.getTime() - new Date(referenceTime).getTime()) / MS_HOUR

  if (hoursSince > 48) return 'p0'
  if (hoursSince > 24) return 'p1'
  return 'p1' // New today
}

export function buildInquiryLabel(row: InquiryRow, now: Date): string {
  const parts: string[] = []
  const name = row.client_name ?? row.client?.full_name ?? 'Unknown'
  parts.push(name)

  if (row.confirmed_guest_count) {
    parts.push(`${row.confirmed_guest_count}g`)
  }
  if (row.confirmed_date) {
    const d = new Date(row.confirmed_date + 'T00:00:00')
    parts.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  }
  if (row.confirmed_location) {
    parts.push(row.confirmed_location)
  }

  // Add waiting duration
  const referenceTime = row.last_response_at ?? row.created_at
  const hoursWaiting = (now.getTime() - new Date(referenceTime).getTime()) / MS_HOUR
  if (hoursWaiting >= 24) {
    const days = Math.floor(hoursWaiting / 24)
    parts.push(`${days}d waiting`)
  } else if (hoursWaiting >= 1) {
    parts.push(`${Math.floor(hoursWaiting)}h waiting`)
  }

  return parts.join(' ')
}

function buildInquiryContext(row: InquiryRow): string {
  if (row.confirmed_occasion) return row.confirmed_occasion
  return `Inquiry from ${row.client_name ?? row.client?.full_name ?? 'unknown client'}`
}

// ---------------------------------------------------------------------------
// Resolver (queries DB, returns resolved items)
// ---------------------------------------------------------------------------

export async function resolveInquiries(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { getInquiries } = await import('@/lib/inquiries/actions')

  let rows: InquiryRow[]
  try {
    const result = await getInquiries({
      status: ['new', 'awaiting_chef', 'awaiting_client', 'quoted'],
    })
    rows = (result ?? []) as unknown as InquiryRow[]
  } catch (err) {
    console.error('[inquiry-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const tier = assignInquiryTier(row, ctx.now)
    if (!tier) continue

    const escalatesAt =
      tier === 'p1'
        ? new Date(ctx.now.getTime() + 24 * MS_HOUR) // P1 escalates to P0 after 24h
        : undefined

    items.push({
      definitionId: `chef.inquiry_${row.status}`,
      tier,
      label: buildInquiryLabel(row, ctx.now),
      context: buildInquiryContext(row),
      destination: `/chef/inquiries/${row.id}`,
      icon: 'lightning',
      inlineActions:
        tier === 'p0' || tier === 'p1'
          ? [
              {
                label: 'Respond',
                action: 'navigate',
                params: { href: `/chef/inquiries/${row.id}` },
                variant: 'default',
              },
            ]
          : undefined,
      data: {
        inquiryId: row.id,
        clientId: row.client?.id,
        guestCount: row.confirmed_guest_count,
        eventDate: row.confirmed_date,
      },
      escalatesAt,
    })
  }

  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/resolvers/inquiry-resolver.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/resolvers/chef/inquiry-resolver.ts tests/unit/resolvers/inquiry-resolver.test.ts
git commit -m "feat(rail): inquiry domain resolver with tier assignment"
```

---

## Task 3: Message Resolver

**Files:**

- Create: `lib/discovery/resolvers/chef/message-resolver.ts`
- Test: `tests/unit/resolvers/message-resolver.test.ts`

**Data sources:** `getConversationInbox()` from `lib/chat/actions.ts`. Key fields: `id`, `unread_count`, `other_participant_name`, `context_type`, `event_id`, `last_message_at`.

**Tier rules from spec:**

- Unread from client with event this week: P0
- Unread from client: P1
- All read: don't emit

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignMessageTier,
  buildMessageLabel,
  type ConversationRow,
} from '@/lib/discovery/resolvers/chef/message-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseConvo: ConversationRow = {
  id: 'conv-1',
  unread_count: 2,
  other_participant_name: 'Maria',
  context_type: 'event',
  event_id: 'evt-1',
  event_date: '2026-05-17', // Saturday, 3 days away
  last_message_at: '2026-05-14T11:00:00.000Z',
  last_message_preview: 'Updated allergy info',
}

test('unread with event this week is P0', () => {
  assert.equal(assignMessageTier(baseConvo, now), 'p0')
})

test('unread with event next month is P1', () => {
  const farEvent = { ...baseConvo, event_date: '2026-06-20' }
  assert.equal(assignMessageTier(farEvent, now), 'p1')
})

test('unread with no event is P1', () => {
  const noEvent = { ...baseConvo, event_id: null, event_date: null }
  assert.equal(assignMessageTier(noEvent, now), 'p1')
})

test('zero unread returns null', () => {
  const read = { ...baseConvo, unread_count: 0 }
  assert.equal(assignMessageTier(read, now), null)
})

test('buildMessageLabel includes count and name', () => {
  const label = buildMessageLabel(baseConvo)
  assert.ok(label.includes('2'))
  assert.ok(label.includes('Maria'))
})

test('buildMessageLabel includes preview snippet', () => {
  const label = buildMessageLabel(baseConvo)
  assert.ok(label.includes('allergy'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/resolvers/message-resolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the message resolver**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

export interface ConversationRow {
  id: string
  unread_count: number
  other_participant_name: string | null
  context_type: string | null
  event_id: string | null
  event_date: string | null
  last_message_at: string | null
  last_message_preview: string | null
}

export function assignMessageTier(row: ConversationRow, now: Date): RailTier | null {
  if (row.unread_count === 0) return null

  // Event this week = P0
  if (row.event_date) {
    const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
    const daysUntil = (eventMs - now.getTime()) / MS_DAY
    if (daysUntil >= 0 && daysUntil <= 7) return 'p0'
  }

  return 'p1'
}

export function buildMessageLabel(row: ConversationRow): string {
  const name = row.other_participant_name ?? 'Unknown'
  const parts = [`${row.unread_count} unread ${name}`]

  if (row.last_message_preview) {
    const snippet =
      row.last_message_preview.length > 30
        ? row.last_message_preview.slice(0, 30) + '...'
        : row.last_message_preview
    parts.push(`re: ${snippet}`)
  }

  return parts.join(' ')
}

export async function resolveMessages(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getConversationInbox } = await import('@/lib/chat/actions')

  let conversations: ConversationRow[]
  try {
    const result = await getConversationInbox()
    conversations = (result ?? []) as unknown as ConversationRow[]
  } catch (err) {
    console.error('[message-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const convo of conversations) {
    const tier = assignMessageTier(convo, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: 'chef.message_new',
      tier,
      label: buildMessageLabel(convo),
      context: convo.last_message_preview ?? 'New message',
      destination: `/chef/messages/${convo.id}`,
      icon: 'chat',
      data: {
        conversationId: convo.id,
        eventId: convo.event_id,
        unreadCount: convo.unread_count,
      },
    })
  }

  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/resolvers/message-resolver.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/resolvers/chef/message-resolver.ts tests/unit/resolvers/message-resolver.test.ts
git commit -m "feat(rail): message domain resolver with tier assignment"
```

---

## Task 4: Payment Resolver

**Files:**

- Create: `lib/discovery/resolvers/chef/payment-resolver.ts`
- Test: `tests/unit/resolvers/payment-resolver.test.ts`

**Data sources:** `getFinancialQueueItems()` from `lib/queue/providers/financial.ts` queries `event_financial_summary` view. Also `getEvents()` for event context. We query events with `outstanding_balance_cents > 0` directly via `createServerClient`.

**Tier rules from spec:**

- Overdue: P0
- Due today: P1
- Deposit sent, waiting: P2
- Collected: don't emit

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignPaymentTier,
  buildPaymentLabel,
  type PaymentRow,
} from '@/lib/discovery/resolvers/chef/payment-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const basePayment: PaymentRow = {
  eventId: 'evt-1',
  occasion: 'Henderson dinner',
  eventDate: '2026-05-10',
  outstandingBalanceCents: 185000,
  totalPaidCents: 0,
  quotedPriceCents: 185000,
  clientName: 'Henderson',
  guestCount: 8,
}

test('past event with balance is P0 (overdue)', () => {
  assert.equal(assignPaymentTier(basePayment, now), 'p0')
})

test('event today with balance is P1', () => {
  const today = { ...basePayment, eventDate: '2026-05-14' }
  assert.equal(assignPaymentTier(today, now), 'p1')
})

test('future event with partial payment is P2', () => {
  const future = {
    ...basePayment,
    eventDate: '2026-05-20',
    totalPaidCents: 50000,
  }
  assert.equal(assignPaymentTier(future, now), 'p2')
})

test('zero balance returns null', () => {
  const paid = { ...basePayment, outstandingBalanceCents: 0 }
  assert.equal(assignPaymentTier(paid, now), null)
})

test('buildPaymentLabel includes amount and client', () => {
  const label = buildPaymentLabel(basePayment)
  assert.ok(label.includes('$1,850'))
  assert.ok(label.includes('Henderson'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/resolvers/payment-resolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the payment resolver**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

export interface PaymentRow {
  eventId: string
  occasion: string | null
  eventDate: string | null
  outstandingBalanceCents: number
  totalPaidCents: number
  quotedPriceCents: number
  clientName: string | null
  guestCount: number | null
}

export function assignPaymentTier(row: PaymentRow, now: Date): RailTier | null {
  if (row.outstandingBalanceCents <= 0) return null

  if (!row.eventDate) return 'p2' // No date, medium urgency

  const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
  const daysUntil = (eventMs - now.getTime()) / MS_DAY

  if (daysUntil < 0) return 'p0' // Past event, overdue
  if (daysUntil < 1) return 'p1' // Event today
  if (daysUntil <= 7) return 'p2' // This week
  return 'p3' // Future
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function buildPaymentLabel(row: PaymentRow): string {
  const parts: string[] = []
  const name = row.clientName ?? row.occasion ?? 'Event'
  parts.push(name)
  parts.push(formatCents(row.outstandingBalanceCents))

  if (row.eventDate) {
    const eventMs = new Date(row.eventDate + 'T00:00:00').getTime()
    const nowMs = Date.now()
    const daysOverdue = Math.floor((nowMs - eventMs) / MS_DAY)
    if (daysOverdue > 0) {
      parts.push(`${daysOverdue}d overdue`)
    }
  }

  return parts.join(' ')
}

export async function resolvePayments(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  // Query events with outstanding balances via financial summary view
  const { createServerClient } = await import('@/lib/db/server')
  const db = createServerClient()

  let rows: PaymentRow[]
  try {
    const result = await db`
      SELECT
        e.id as "eventId",
        e.occasion,
        e.event_date as "eventDate",
        e.guest_count as "guestCount",
        c.full_name as "clientName",
        efs.outstanding_balance_cents as "outstandingBalanceCents",
        efs.total_paid_cents as "totalPaidCents",
        efs.quoted_price_cents as "quotedPriceCents"
      FROM event_financial_summary efs
      JOIN events e ON e.id = efs.event_id
      LEFT JOIN clients c ON c.id = e.client_id
      WHERE e.tenant_id = ${ctx.tenantId}
        AND efs.outstanding_balance_cents > 0
      ORDER BY e.event_date ASC
    `
    rows = result as unknown as PaymentRow[]
  } catch (err) {
    console.error('[payment-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const tier = assignPaymentTier(row, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: tier === 'p0' ? 'chef.payment_overdue' : 'chef.deposit_due',
      tier,
      label: buildPaymentLabel(row),
      context: `${formatCents(row.outstandingBalanceCents)} outstanding of ${formatCents(row.quotedPriceCents)}`,
      destination: `/chef/events/${row.eventId}/financials`,
      icon: 'dollar',
      inlineActions:
        tier === 'p0'
          ? [
              {
                label: 'Send Reminder',
                action: 'send_payment_reminder',
                params: { eventId: row.eventId },
                variant: 'default',
              },
            ]
          : undefined,
      data: {
        eventId: row.eventId,
        outstandingCents: row.outstandingBalanceCents,
        paidCents: row.totalPaidCents,
      },
    })
  }

  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/resolvers/payment-resolver.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/resolvers/chef/payment-resolver.ts tests/unit/resolvers/payment-resolver.test.ts
git commit -m "feat(rail): payment domain resolver with tier assignment"
```

---

## Task 5: Event Resolver

**Files:**

- Create: `lib/discovery/resolvers/chef/event-resolver.ts`
- Test: `tests/unit/resolvers/event-resolver.test.ts`

**Data sources:** `getEvents()` from `lib/events/actions.ts`. Key fields: `id`, `status`, `event_date`, `serve_time`, `guest_count`, `occasion`, `location_city`, `location_state`, `client` (joined).

**Tier rules from spec:**

- Today, not fully ready: P0
- Tomorrow, missing pieces: P1
- This week: P2
- Next week+: P3

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignEventTier,
  buildEventLabel,
  type EventRow,
} from '@/lib/discovery/resolvers/chef/event-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseEvent: EventRow = {
  id: 'evt-1',
  status: 'confirmed',
  event_date: '2026-05-14',
  serve_time: '18:00',
  guest_count: 8,
  occasion: 'Henderson dinner',
  location_city: 'Boston',
  location_state: 'MA',
  client: { id: 'c-1', full_name: 'Henderson', email: 'h@test.com' },
}

test('event today is P0', () => {
  assert.equal(assignEventTier(baseEvent, now), 'p0')
})

test('event tomorrow is P1', () => {
  const tomorrow = { ...baseEvent, event_date: '2026-05-15' }
  assert.equal(assignEventTier(tomorrow, now), 'p1')
})

test('event in 3 days is P2', () => {
  const threeDays = { ...baseEvent, event_date: '2026-05-17' }
  assert.equal(assignEventTier(threeDays, now), 'p2')
})

test('event next week+ is P3', () => {
  const nextWeek = { ...baseEvent, event_date: '2026-05-25' }
  assert.equal(assignEventTier(nextWeek, now), 'p3')
})

test('past event returns null', () => {
  const past = { ...baseEvent, event_date: '2026-05-10' }
  assert.equal(assignEventTier(past, now), null)
})

test('completed event returns null', () => {
  const done = { ...baseEvent, status: 'completed' }
  assert.equal(assignEventTier(done, now), null)
})

test('cancelled event returns null', () => {
  const cancelled = { ...baseEvent, status: 'cancelled' }
  assert.equal(assignEventTier(cancelled, now), null)
})

test('buildEventLabel includes occasion, guests, date', () => {
  const label = buildEventLabel(baseEvent, now)
  assert.ok(label.includes('Henderson'))
  assert.ok(label.includes('8'))
  assert.ok(label.includes('today'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/resolvers/event-resolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the event resolver**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'archived'])

export interface EventRow {
  id: string
  status: string
  event_date: string | null
  serve_time: string | null
  guest_count: number | null
  occasion: string | null
  location_city: string | null
  location_state: string | null
  client: { id: string; full_name: string; email: string | null } | null
}

export function assignEventTier(row: EventRow, now: Date): RailTier | null {
  if (TERMINAL_STATUSES.has(row.status)) return null
  if (!row.event_date) return 'p3'

  const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
  const daysUntil = (eventMs - now.getTime()) / MS_DAY

  if (daysUntil < 0) return null // Past
  if (daysUntil < 1) return 'p0' // Today
  if (daysUntil < 2) return 'p1' // Tomorrow
  if (daysUntil <= 7) return 'p2' // This week
  return 'p3'
}

export function buildEventLabel(row: EventRow, now: Date): string {
  const parts: string[] = []
  parts.push(row.occasion ?? row.client?.full_name ?? 'Event')

  if (row.guest_count) parts.push(`${row.guest_count}g`)

  if (row.event_date) {
    const eventMs = new Date(row.event_date + 'T00:00:00').getTime()
    const daysUntil = Math.floor((eventMs - now.getTime()) / MS_DAY)
    if (daysUntil <= 0) parts.push('today')
    else if (daysUntil === 1) parts.push('tomorrow')
    else {
      const d = new Date(row.event_date + 'T00:00:00')
      parts.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
    }
  }

  if (row.serve_time) parts.push(row.serve_time)

  if (row.location_city) {
    parts.push(row.location_city)
  }

  return parts.join(' ')
}

export async function resolveEvents(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getEvents } = await import('@/lib/events/actions')

  let events: EventRow[]
  try {
    const result = await getEvents()
    events = (result ?? []) as unknown as EventRow[]
  } catch (err) {
    console.error('[event-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const event of events) {
    const tier = assignEventTier(event, ctx.now)
    if (!tier) continue

    items.push({
      definitionId: `chef.event_${tier === 'p0' ? 'today' : tier === 'p1' ? 'tomorrow' : 'this_week'}`,
      tier,
      label: buildEventLabel(event, ctx.now),
      context: `${event.guest_count ?? '?'} guests, ${event.status}`,
      destination: `/chef/events/${event.id}`,
      icon: 'calendar',
      inlineActions:
        tier === 'p0' && event.serve_time
          ? [
              {
                label: 'Checklist',
                action: 'navigate',
                params: { href: `/chef/events/${event.id}/checklist` },
                variant: 'default',
              },
            ]
          : undefined,
      data: {
        eventId: event.id,
        eventDate: event.event_date,
        guestCount: event.guest_count,
        clientId: event.client?.id,
      },
      escalatesAt:
        tier === 'p2'
          ? new Date(new Date(event.event_date + 'T00:00:00').getTime() - MS_DAY) // Escalate to P1 day before
          : undefined,
    })
  }

  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/resolvers/event-resolver.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/resolvers/chef/event-resolver.ts tests/unit/resolvers/event-resolver.test.ts
git commit -m "feat(rail): event domain resolver with tier assignment"
```

---

## Task 6: Quote Resolver

**Files:**

- Create: `lib/discovery/resolvers/chef/quote-resolver.ts`
- Test: `tests/unit/resolvers/quote-resolver.test.ts`

**Data sources:** `getQuotes()` from `lib/quotes/actions.ts`. Key fields: `id`, `status`, `total_quoted_cents`, `valid_until`, `client` (joined), `guest_count_estimated`, `created_at`. `sent_at` comes from `quote_state_transitions`.

**Tier rules (derived from spec Payment/Quote patterns):**

- Draft quote, event this week: P1
- Sent quote expiring within 2 days: P0
- Sent quote expiring within 7 days: P1
- Sent quote, waiting: P2
- Draft quote: P2
- Accepted/rejected/expired: don't emit

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignQuoteTier,
  buildQuoteLabel,
  type QuoteRow,
} from '@/lib/discovery/resolvers/chef/quote-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseQuote: QuoteRow = {
  id: 'q-1',
  status: 'sent',
  total_quoted_cents: 240000,
  valid_until: '2026-05-16', // 2 days away
  guest_count_estimated: 12,
  created_at: '2026-05-10T12:00:00.000Z',
  client: { id: 'c-1', full_name: 'Patel', email: 'patel@test.com' },
}

test('sent quote expiring in 2 days is P0', () => {
  assert.equal(assignQuoteTier(baseQuote, now), 'p0')
})

test('sent quote expiring in 5 days is P1', () => {
  const fiveDays = { ...baseQuote, valid_until: '2026-05-19' }
  assert.equal(assignQuoteTier(fiveDays, now), 'p1')
})

test('sent quote expiring in 14 days is P2', () => {
  const twoWeeks = { ...baseQuote, valid_until: '2026-05-28' }
  assert.equal(assignQuoteTier(twoWeeks, now), 'p2')
})

test('draft quote is P2', () => {
  const draft = { ...baseQuote, status: 'draft' as const, valid_until: null }
  assert.equal(assignQuoteTier(draft, now), 'p2')
})

test('accepted quote returns null', () => {
  const accepted = { ...baseQuote, status: 'accepted' as const }
  assert.equal(assignQuoteTier(accepted, now), null)
})

test('expired quote returns null', () => {
  const expired = { ...baseQuote, status: 'expired' as const }
  assert.equal(assignQuoteTier(expired, now), null)
})

test('sent quote already past valid_until is P0', () => {
  const overdue = { ...baseQuote, valid_until: '2026-05-13' }
  assert.equal(assignQuoteTier(overdue, now), 'p0')
})

test('buildQuoteLabel includes client and amount', () => {
  const label = buildQuoteLabel(baseQuote, now)
  assert.ok(label.includes('Patel'))
  assert.ok(label.includes('$2,400'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/resolvers/quote-resolver.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the quote resolver**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000
const TERMINAL_STATUSES = new Set(['accepted', 'rejected', 'expired'])

export interface QuoteRow {
  id: string
  status: string
  total_quoted_cents: number | null
  valid_until: string | null
  guest_count_estimated: number | null
  created_at: string
  client: { id: string; full_name: string; email: string | null } | null
}

export function assignQuoteTier(row: QuoteRow, now: Date): RailTier | null {
  if (TERMINAL_STATUSES.has(row.status)) return null

  if (row.status === 'draft') return 'p2'

  // Sent quotes: urgency based on expiration
  if (row.status === 'sent' && row.valid_until) {
    const expiresMs = new Date(row.valid_until + 'T23:59:59').getTime()
    const daysUntilExpiry = (expiresMs - now.getTime()) / MS_DAY

    if (daysUntilExpiry <= 2) return 'p0' // Expiring soon or already past
    if (daysUntilExpiry <= 7) return 'p1'
    return 'p2'
  }

  // Sent but no valid_until
  if (row.status === 'sent') return 'p2'

  return 'p3'
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

export function buildQuoteLabel(row: QuoteRow, now: Date): string {
  const parts: string[] = []
  const name = row.client?.full_name ?? 'Client'
  parts.push(`${name} quote`)

  if (row.total_quoted_cents) {
    parts.push(formatCents(row.total_quoted_cents))
  }

  if (row.status === 'sent' && row.valid_until) {
    const expiresMs = new Date(row.valid_until + 'T23:59:59').getTime()
    const daysUntil = Math.ceil((expiresMs - now.getTime()) / MS_DAY)
    if (daysUntil <= 0) {
      parts.push('expired')
    } else if (daysUntil === 1) {
      parts.push('expires tomorrow')
    } else {
      parts.push(`expires ${daysUntil}d`)
    }
  } else if (row.status === 'draft') {
    parts.push('draft')
  }

  return parts.join(' ')
}

export async function resolveQuotes(ctx: GodModeResolverContext): Promise<GodModeResolvedItem[]> {
  const { getQuotes } = await import('@/lib/quotes/actions')

  let quotes: QuoteRow[]
  try {
    const result = await getQuotes({ status: ['draft', 'sent'] })
    quotes = (result ?? []) as unknown as QuoteRow[]
  } catch (err) {
    console.error('[quote-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const quote of quotes) {
    const tier = assignQuoteTier(quote, ctx.now)
    if (!tier) continue

    const escalatesAt =
      tier === 'p1' && quote.valid_until
        ? new Date(new Date(quote.valid_until + 'T00:00:00').getTime() - 2 * MS_DAY)
        : undefined

    items.push({
      definitionId: quote.status === 'draft' ? 'chef.quote_draft' : 'chef.quote_sent',
      tier,
      label: buildQuoteLabel(quote, ctx.now),
      context: quote.guest_count_estimated
        ? `${quote.guest_count_estimated} guests estimated`
        : 'Quote pending',
      destination: `/chef/quotes/${quote.id}`,
      icon: 'document',
      inlineActions:
        quote.status === 'draft'
          ? [
              {
                label: 'Edit',
                action: 'navigate',
                params: { href: `/chef/quotes/${quote.id}/edit` },
                variant: 'default',
              },
            ]
          : tier === 'p0'
            ? [
                {
                  label: 'Nudge',
                  action: 'send_quote_reminder',
                  params: { quoteId: quote.id },
                  variant: 'default',
                },
              ]
            : undefined,
      data: {
        quoteId: quote.id,
        clientId: quote.client?.id,
        amountCents: quote.total_quoted_cents,
        validUntil: quote.valid_until,
      },
      escalatesAt,
    })
  }

  return items
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/resolvers/quote-resolver.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/resolvers/chef/quote-resolver.ts tests/unit/resolvers/quote-resolver.test.ts
git commit -m "feat(rail): quote domain resolver with tier assignment"
```

---

## Task 7: God Mode Dispatcher

**Files:**

- Create: `lib/discovery/god-mode-dispatcher.ts`
- Test: `tests/unit/god-mode-dispatcher.test.ts`

The dispatcher calls all domain resolvers in parallel, isolates failures per domain, and merges results.

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolvedItem, GodModeResolverContext } from '@/lib/discovery/god-mode-types'
import { dispatchResolvers, type ResolverEntry } from '@/lib/discovery/god-mode-dispatcher'

const ctx: GodModeResolverContext = {
  userId: 'u-1',
  tenantId: 't-1',
  role: 'chef',
  now: new Date('2026-05-14T12:00:00.000Z'),
}

const item1: GodModeResolvedItem = {
  definitionId: 'chef.inquiry_new',
  tier: 'p0',
  label: 'Sarah B. 12g Jun 14 3d waiting',
  context: 'Birthday Dinner',
  destination: '/chef/inquiries/1',
}

const item2: GodModeResolvedItem = {
  definitionId: 'chef.message_new',
  tier: 'p1',
  label: '2 unread Maria',
  context: 'Allergy update',
  destination: '/chef/messages/1',
}

test('dispatcher merges results from multiple resolvers', async () => {
  const resolvers: ResolverEntry[] = [
    { name: 'inquiries', resolve: async () => [item1] },
    { name: 'messages', resolve: async () => [item2] },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 2)
  assert.equal(result[0].definitionId, 'chef.inquiry_new')
  assert.equal(result[1].definitionId, 'chef.message_new')
})

test('dispatcher isolates resolver failures', async () => {
  const resolvers: ResolverEntry[] = [
    { name: 'inquiries', resolve: async () => [item1] },
    {
      name: 'broken',
      resolve: async () => {
        throw new Error('DB down')
      },
    },
    { name: 'messages', resolve: async () => [item2] },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 2) // broken resolver didn't kill others
})

test('dispatcher returns empty array when all fail', async () => {
  const resolvers: ResolverEntry[] = [
    {
      name: 'broken1',
      resolve: async () => {
        throw new Error('fail')
      },
    },
  ]
  const result = await dispatchResolvers(resolvers, ctx)
  assert.equal(result.length, 0)
})

test('dispatchHotResolvers only runs hot-tier resolvers', async () => {
  // This tests the exported convenience function
  const { dispatchHotResolvers } = await import('@/lib/discovery/god-mode-dispatcher')
  // dispatchHotResolvers calls inquiry, message, payment resolvers
  // We can't easily mock these in node:test without dependency injection,
  // so this test verifies the function exists and returns an array
  // Full integration testing happens with the real DB
  assert.equal(typeof dispatchHotResolvers, 'function')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/god-mode-dispatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the dispatcher**

```typescript
import type { GodModeResolvedItem, GodModeResolverContext } from './god-mode-types'

export interface ResolverEntry {
  name: string
  resolve: (ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>
}

/**
 * Run resolvers in parallel, isolate failures per domain.
 * Failed resolvers log and return empty, never kill the pipeline.
 */
export async function dispatchResolvers(
  resolvers: ResolverEntry[],
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const results = await Promise.allSettled(
    resolvers.map(async (entry) => {
      try {
        return await entry.resolve(ctx)
      } catch (err) {
        console.error(`[god-mode-dispatcher] ${entry.name} failed:`, err)
        return []
      }
    })
  )

  const items: GodModeResolvedItem[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value)
    }
    // rejected results already logged above
  }

  return items
}

// ---------------------------------------------------------------------------
// Hydration tier convenience functions
// ---------------------------------------------------------------------------

function hotResolvers(): ResolverEntry[] {
  return [
    {
      name: 'inquiries',
      resolve: async (ctx) => {
        const { resolveInquiries } = await import('./resolvers/chef/inquiry-resolver')
        return resolveInquiries(ctx)
      },
    },
    {
      name: 'messages',
      resolve: async (ctx) => {
        const { resolveMessages } = await import('./resolvers/chef/message-resolver')
        return resolveMessages(ctx)
      },
    },
    {
      name: 'payments',
      resolve: async (ctx) => {
        const { resolvePayments } = await import('./resolvers/chef/payment-resolver')
        return resolvePayments(ctx)
      },
    },
  ]
}

function warmResolvers(): ResolverEntry[] {
  return [
    {
      name: 'events',
      resolve: async (ctx) => {
        const { resolveEvents } = await import('./resolvers/chef/event-resolver')
        return resolveEvents(ctx)
      },
    },
    {
      name: 'quotes',
      resolve: async (ctx) => {
        const { resolveQuotes } = await import('./resolvers/chef/quote-resolver')
        return resolveQuotes(ctx)
      },
    },
    // Staff, menus, vendors, clients resolvers will be added in Phase 4
  ]
}

/**
 * Hot resolvers only: inquiries, messages, payments.
 * Used by RailStrip (every page load, must be fast).
 */
export async function dispatchHotResolvers(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  return dispatchResolvers(hotResolvers(), ctx)
}

/**
 * All resolvers: hot + warm.
 * Used by RailFull (dashboard only).
 */
export async function dispatchAllResolvers(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  return dispatchResolvers([...hotResolvers(), ...warmResolvers()], ctx)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/god-mode-dispatcher.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/god-mode-dispatcher.ts tests/unit/god-mode-dispatcher.test.ts
git commit -m "feat(rail): God Mode dispatcher with hydration tiers"
```

---

## Task 8: God Mode Assembly

**Files:**

- Create: `lib/discovery/god-mode-assembly.ts`
- Test: `tests/unit/god-mode-assembly.test.ts`

Assembly takes raw resolver output, applies escalation, checks dismissals, groups by tier, sorts within tier by score.

- [ ] **Step 1: Write the failing test**

```typescript
import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import {
  assembleGodModeRail,
  extractStrip,
  applyEscalation,
} from '@/lib/discovery/god-mode-assembly'

const now = new Date('2026-05-14T12:00:00.000Z')

const items: GodModeResolvedItem[] = [
  {
    definitionId: 'chef.inquiry_new',
    tier: 'p0',
    label: 'Sarah inquiry',
    context: 'Birthday',
    destination: '/chef/inquiries/1',
    score: 90,
  },
  {
    definitionId: 'chef.event_this_week',
    tier: 'p2',
    label: 'Henderson Sat',
    context: '8 guests',
    destination: '/chef/events/1',
    score: 70,
  },
  {
    definitionId: 'chef.message_new',
    tier: 'p1',
    label: '2 unread Maria',
    context: 'Allergy',
    destination: '/chef/messages/1',
    score: 80,
  },
  {
    definitionId: 'chef.quote_sent',
    tier: 'p1',
    label: 'Patel quote',
    context: 'Expiring',
    destination: '/chef/quotes/1',
    score: 60,
  },
]

test('assembleGodModeRail groups items by tier', () => {
  const result = assembleGodModeRail(items, new Set(), now)
  assert.equal(result.tiers.p0.length, 1)
  assert.equal(result.tiers.p1.length, 2)
  assert.equal(result.tiers.p2.length, 1)
  assert.equal(result.tiers.p3.length, 0)
  assert.equal(result.tiers.p4.length, 0)
  assert.equal(result.totalItems, 4)
})

test('assembleGodModeRail sorts within tier by score descending', () => {
  const result = assembleGodModeRail(items, new Set(), now)
  assert.equal(result.tiers.p1[0].label, '2 unread Maria') // score 80
  assert.equal(result.tiers.p1[1].label, 'Patel quote') // score 60
})

test('assembleGodModeRail filters dismissed items', () => {
  const dismissed = new Set(['chef.inquiry_new'])
  const result = assembleGodModeRail(items, dismissed, now)
  assert.equal(result.tiers.p0.length, 0)
  assert.equal(result.totalItems, 3)
})

test('applyEscalation bumps tier when escalatesAt is past', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.quote_sent',
    tier: 'p2',
    label: 'Quote',
    context: 'Expiring',
    destination: '/q/1',
    escalatesAt: new Date('2026-05-14T10:00:00.000Z'), // 2h ago
  }
  const escalated = applyEscalation(item, now)
  assert.equal(escalated.tier, 'p1') // Bumped one level
})

test('applyEscalation does not bump P0 (already highest)', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.inquiry_new',
    tier: 'p0',
    label: 'Urgent',
    context: 'Very urgent',
    destination: '/i/1',
    escalatesAt: new Date('2026-05-13T00:00:00.000Z'),
  }
  const escalated = applyEscalation(item, now)
  assert.equal(escalated.tier, 'p0')
})

test('applyEscalation leaves item unchanged when escalatesAt is future', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.event_this_week',
    tier: 'p2',
    label: 'Event',
    context: 'Upcoming',
    destination: '/e/1',
    escalatesAt: new Date('2026-05-16T00:00:00.000Z'), // 2 days from now
  }
  const result = applyEscalation(item, now)
  assert.equal(result.tier, 'p2')
})

test('extractStrip returns max 5 P0/P1 items', () => {
  const manyItems: GodModeResolvedItem[] = Array.from({ length: 10 }, (_, i) => ({
    definitionId: `chef.item_${i}`,
    tier: 'p1' as const,
    label: `Item ${i}`,
    context: 'ctx',
    destination: `/item/${i}`,
    score: 100 - i,
  }))
  const strip = extractStrip(manyItems, now)
  assert.equal(strip.items.length, 5)
  assert.equal(strip.hasP0, false)
})

test('extractStrip sets hasP0 when P0 items exist', () => {
  const strip = extractStrip(items, now)
  assert.equal(strip.hasP0, true)
  assert.equal(strip.totalUrgent, 3) // 1 P0 + 2 P1
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/unit/god-mode-assembly.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the assembly module**

```typescript
import type {
  GodModeResolvedItem,
  GodModeRailResult,
  GodModeStripResult,
  RailTier,
} from './god-mode-types'
import { TIER_ORDER, compareTiers } from './god-mode-types'

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

const TIER_ABOVE: Record<RailTier, RailTier> = {
  p0: 'p0', // Can't go higher
  p1: 'p0',
  p2: 'p1',
  p3: 'p2',
  p4: 'p3',
}

export function applyEscalation(item: GodModeResolvedItem, now: Date): GodModeResolvedItem {
  if (!item.escalatesAt) return item
  if (item.escalatesAt.getTime() > now.getTime()) return item
  return { ...item, tier: TIER_ABOVE[item.tier] }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function assembleGodModeRail(
  items: GodModeResolvedItem[],
  dismissedIds: Set<string>,
  now: Date
): GodModeRailResult {
  // 1. Filter dismissed
  const active = items.filter((item) => !dismissedIds.has(item.definitionId))

  // 2. Apply escalation
  const escalated = active.map((item) => applyEscalation(item, now))

  // 3. Filter expired
  const unexpired = escalated.filter((item) => {
    if (!item.expiresAt) return true
    return item.expiresAt.getTime() > now.getTime()
  })

  // 4. Group by tier
  const tiers: Record<RailTier, GodModeResolvedItem[]> = {
    p0: [],
    p1: [],
    p2: [],
    p3: [],
    p4: [],
  }

  for (const item of unexpired) {
    tiers[item.tier].push(item)
  }

  // 5. Sort within each tier by score descending (higher = more important)
  for (const tier of TIER_ORDER) {
    tiers[tier].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  return {
    tiers,
    totalItems: unexpired.length,
    assembledAt: now.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Strip extraction (for compact bar)
// ---------------------------------------------------------------------------

export function extractStrip(
  items: GodModeResolvedItem[],
  now: Date,
  maxItems = 5
): GodModeStripResult {
  // Filter to P0 and P1 only
  const urgent = items.filter((item) => item.tier === 'p0' || item.tier === 'p1')

  // Sort: P0 first, then P1, then by score within tier
  urgent.sort((a, b) => {
    const tierDiff = compareTiers(a.tier, b.tier)
    if (tierDiff !== 0) return tierDiff
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return {
    items: urgent.slice(0, maxItems),
    hasP0: urgent.some((item) => item.tier === 'p0'),
    totalUrgent: urgent.length,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/unit/god-mode-assembly.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/discovery/god-mode-assembly.ts tests/unit/god-mode-assembly.test.ts
git commit -m "feat(rail): God Mode assembly pipeline with escalation and strip extraction"
```

---

## Task 9: Server Actions

**Files:**

- Modify: `lib/discovery/universal-rail-actions.ts` (add `getGodModeRail` and `getRailStrip`)

- [ ] **Step 1: Read the current file**

Run: Read `lib/discovery/universal-rail-actions.ts` to see current exports and patterns.

- [ ] **Step 2: Add two new server actions at the end of the file**

Append to `lib/discovery/universal-rail-actions.ts`:

```typescript
// ---------------------------------------------------------------------------
// God Mode actions
// ---------------------------------------------------------------------------

export async function getGodModeRail(): Promise<GodModeRailResult> {
  const user = await requireChef()
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
  }

  const rawItems = await dispatchAllResolvers(ctx)

  // Load dismissals
  const { loadRailUserState } = await import('./universal-rail-state')
  const state = await loadRailUserState(user.id, 'chef')
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  return assembleGodModeRail(rawItems, dismissedIds, now)
}

export async function getRailStrip(): Promise<GodModeStripResult> {
  const user = await requireChef()
  const now = new Date()

  const ctx: GodModeResolverContext = {
    userId: user.id,
    tenantId: user.tenantId ?? '',
    role: 'chef',
    now,
  }

  // Hot resolvers only for speed
  const rawItems = await dispatchHotResolvers(ctx)

  // Load dismissals
  const { loadRailUserState } = await import('./universal-rail-state')
  const state = await loadRailUserState(user.id, 'chef')
  const dismissedIds = new Set(
    Array.from(state?.dismissals.entries() ?? [])
      .filter(([, d]) => isItemDismissed(d, now))
      .map(([id]) => id)
  )

  // Filter dismissed, apply escalation, extract strip
  const active = rawItems.filter((item) => !dismissedIds.has(item.definitionId))
  const escalated = active.map((item) => applyEscalation(item, now))

  return extractStrip(escalated, now, 5)
}
```

Add these imports at the top of the file:

```typescript
import type {
  GodModeResolverContext,
  GodModeRailResult,
  GodModeStripResult,
} from './god-mode-types'
import { dispatchAllResolvers, dispatchHotResolvers } from './god-mode-dispatcher'
import { assembleGodModeRail, extractStrip, applyEscalation } from './god-mode-assembly'
import { requireChef } from '@/lib/auth/get-user'
```

Note: `isItemDismissed` is already imported in this file from `./universal-rail-state`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No errors in `universal-rail-actions.ts`

- [ ] **Step 4: Commit**

```bash
git add lib/discovery/universal-rail-actions.ts
git commit -m "feat(rail): add getGodModeRail and getRailStrip server actions"
```

---

## Task 10: Inline Action Registry

**Files:**

- Create: `lib/discovery/inline-action-registry.ts`

This maps action string identifiers to actual behavior. For Phase 1, most actions are navigation (simple href redirect). Real server-action dispatch (send_payment_reminder, send_quote_reminder) will be wired in Phase 4.

- [ ] **Step 1: Write the inline action registry**

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export type InlineActionResult = {
  success: boolean
  message?: string
  redirect?: string
}

/**
 * Dispatch an inline action from a rail item.
 * Maps action identifiers to server action calls.
 */
export async function executeInlineAction(
  action: string,
  params: Record<string, unknown>
): Promise<InlineActionResult> {
  switch (action) {
    case 'navigate': {
      const href = params.href as string | undefined
      if (!href) return { success: false, message: 'No href provided' }
      return { success: true, redirect: href }
    }

    case 'send_payment_reminder': {
      // Phase 4: wire to actual email/notification action
      // For now, navigate to the event financials page
      const eventId = params.eventId as string | undefined
      if (!eventId) return { success: false, message: 'No eventId' }
      return { success: true, redirect: `/chef/events/${eventId}/financials` }
    }

    case 'send_quote_reminder': {
      // Phase 4: wire to actual follow-up action
      const quoteId = params.quoteId as string | undefined
      if (!quoteId) return { success: false, message: 'No quoteId' }
      return { success: true, redirect: `/chef/quotes/${quoteId}` }
    }

    default:
      return { success: false, message: `Unknown action: ${action}` }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/discovery/inline-action-registry.ts
git commit -m "feat(rail): inline action registry for rail item dispatch"
```

---

## Task 11: RailItemRow Component

**Files:**

- Create: `components/rail/rail-item-row.tsx`

Single dense rail item. One line. Icon + label + context + inline actions + navigate arrow.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { InlineAction } from '@/lib/discovery/god-mode-types'
import { executeInlineAction } from '@/lib/discovery/inline-action-registry'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, string> = {
  lightning: '\u26a1',
  chat: '\ud83d\udcac',
  dollar: '\ud83d\udcb0',
  calendar: '\ud83d\udcc5',
  document: '\ud83d\udcc4',
}

const ACTION_VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-stone-800 hover:bg-stone-700 text-stone-200',
  destructive: 'bg-red-900/50 hover:bg-red-900/70 text-red-200',
  success: 'bg-green-900/50 hover:bg-green-900/70 text-green-200',
}

function InlineActionButton({
  action,
  onComplete,
}: {
  action: InlineAction
  onComplete?: (redirect?: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await executeInlineAction(action.action, action.params)
        if (result.success && result.redirect) {
          onComplete?.(result.redirect)
        }
      } catch {
        // Non-critical inline action failure
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'px-2 py-0.5 text-xs font-medium rounded transition-colors',
        ACTION_VARIANT_CLASSES[action.variant] ?? ACTION_VARIANT_CLASSES.default,
        isPending && 'opacity-50'
      )}
    >
      {action.label}
    </button>
  )
}

export function RailItemRow({
  item,
  className,
}: {
  item: GodModeResolvedItem
  className?: string
}) {
  const router = useRouter()
  const icon = item.icon ? (ICON_MAP[item.icon] ?? item.icon) : null
  const hasDestination = !!item.destination

  const handleActionComplete = (redirect?: string) => {
    if (redirect) router.push(redirect)
  }

  const content = (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors group min-h-[32px]',
        hasDestination && 'hover:bg-stone-800/60 cursor-pointer',
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <span className="text-sm flex-shrink-0 w-5 text-center" aria-hidden>
          {icon}
        </span>
      )}

      {/* Label + context (dense, single line) */}
      <span className="text-sm text-stone-200 truncate flex-1 min-w-0">{item.label}</span>

      {/* Inline actions */}
      {item.inlineActions && item.inlineActions.length > 0 && (
        <span className="flex gap-1 flex-shrink-0">
          {item.inlineActions.map((action) => (
            <InlineActionButton
              key={action.label}
              action={action}
              onComplete={handleActionComplete}
            />
          ))}
        </span>
      )}

      {/* Navigate arrow */}
      {hasDestination && (
        <span className="text-stone-600 group-hover:text-stone-400 transition-colors flex-shrink-0">
          {'\u2192'}
        </span>
      )}
    </div>
  )

  if (hasDestination) {
    return (
      <Link href={item.destination} className="no-underline block">
        {content}
      </Link>
    )
  }

  return content
}
```

- [ ] **Step 2: Commit**

```bash
git add components/rail/rail-item-row.tsx
git commit -m "feat(rail): RailItemRow dense single-line component"
```

---

## Task 12: RailTierGroup Component

**Files:**

- Create: `components/rail/rail-tier-group.tsx`

Renders one tier section: colored left border, header with name + count, collapsible body (P0/P1 always expanded).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import type { GodModeResolvedItem, RailTier } from '@/lib/discovery/god-mode-types'
import { TIER_CONFIG, isExpandedByDefault } from '@/lib/discovery/god-mode-types'
import { RailItemRow } from './rail-item-row'
import { cn } from '@/lib/utils'

const TIER_BORDER_COLORS: Record<RailTier, string> = {
  p0: 'border-l-red-500',
  p1: 'border-l-amber-500',
  p2: 'border-l-blue-500',
  p3: 'border-l-stone-600',
  p4: 'border-l-stone-700',
}

const TIER_DOT_COLORS: Record<RailTier, string> = {
  p0: 'bg-red-500',
  p1: 'bg-amber-500',
  p2: 'bg-blue-500',
  p3: 'bg-stone-500',
  p4: 'bg-stone-600',
}

export function RailTierGroup({
  tier,
  items,
  className,
}: {
  tier: RailTier
  items: GodModeResolvedItem[]
  className?: string
}) {
  const config = TIER_CONFIG[tier]
  const [expanded, setExpanded] = useState(isExpandedByDefault(tier))

  if (items.length === 0) return null

  const canCollapse = !config.alwaysExpanded

  return (
    <div
      className={cn(
        'border-l-2 rounded-r-lg',
        TIER_BORDER_COLORS[tier],
        config.pulses && 'animate-pulse-subtle',
        className
      )}
    >
      {/* Tier header */}
      <button
        onClick={() => canCollapse && setExpanded(!expanded)}
        disabled={!canCollapse}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-left',
          canCollapse && 'hover:bg-stone-900/40 cursor-pointer',
          !canCollapse && 'cursor-default'
        )}
      >
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', TIER_DOT_COLORS[tier])} />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex-1">
          {config.name}
        </span>
        <span className="text-xs text-stone-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        {canCollapse && (
          <span className="text-xs text-stone-600 ml-1">{expanded ? '\u25b4' : '\u25be'}</span>
        )}
      </button>

      {/* Items */}
      {expanded && (
        <div className="space-y-0.5 pb-1">
          {items.map((item) => (
            <RailItemRow key={`${item.definitionId}-${item.destination}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/rail/rail-tier-group.tsx
git commit -m "feat(rail): RailTierGroup collapsible tier section component"
```

---

## Task 13: RailFull Component

**Files:**

- Create: `components/rail/rail-full.tsx`

Full rail: all tiers stacked vertically. Server component wrapper fetches data. Client component renders tier groups.

- [ ] **Step 1: Write the component**

```tsx
import type { GodModeRailResult } from '@/lib/discovery/god-mode-types'
import { TIER_ORDER } from '@/lib/discovery/god-mode-types'
import { RailTierGroup } from './rail-tier-group'
import { cn } from '@/lib/utils'

export function RailFull({ result, className }: { result: GodModeRailResult; className?: string }) {
  const nonEmptyTiers = TIER_ORDER.filter((tier) => result.tiers[tier].length > 0)

  if (nonEmptyTiers.length === 0) {
    return (
      <div className={cn('px-4 py-8 text-center', className)}>
        <p className="text-sm text-stone-400">All clear. Nothing needs attention.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {nonEmptyTiers.map((tier) => (
        <RailTierGroup key={tier} tier={tier} items={result.tiers[tier]} />
      ))}
    </div>
  )
}

export function RailFullSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-red-500/30" />
      <div className="h-24 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-amber-500/30" />
      <div className="h-16 rounded-r-lg loading-bone loading-bone-muted border-l-2 border-l-blue-500/30" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/rail/rail-full.tsx
git commit -m "feat(rail): RailFull tier-grouped dashboard component"
```

---

## Task 14: RailStrip Component

**Files:**

- Create: `components/rail/rail-strip.tsx`
- Create: `components/rail/rail-strip-wrapper.tsx`

Persistent compact bar on every chef page. Shows P0/P1 items. Auto-rotates. SSE subscription.

- [ ] **Step 1: Write the RailStrip client component**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { GodModeResolvedItem, GodModeStripResult } from '@/lib/discovery/god-mode-types'
import { useSSE } from '@/lib/realtime/sse-client'
import { getRailStrip } from '@/lib/discovery/universal-rail-actions'
import { cn } from '@/lib/utils'

const TIER_DOT_CLASSES: Record<string, string> = {
  p0: 'bg-red-500 animate-pulse',
  p1: 'bg-amber-500',
}

const MAX_VISIBLE = 5
const ROTATE_INTERVAL_MS = 8000

function StripItem({ item }: { item: GodModeResolvedItem }) {
  return (
    <Link
      href={item.destination}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-stone-800/60 transition-colors whitespace-nowrap no-underline"
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          TIER_DOT_CLASSES[item.tier] ?? 'bg-stone-500'
        )}
      />
      <span className="text-xs text-stone-300 truncate max-w-[200px]">{item.label}</span>
    </Link>
  )
}

export function RailStrip({ initialData }: { initialData: GodModeStripResult }) {
  const [data, setData] = useState(initialData)
  const [offset, setOffset] = useState(0)

  // SSE: refresh strip when rail data changes
  useSSE('rail', {
    onMessage: useCallback(() => {
      // Refetch strip data on any rail event
      getRailStrip()
        .then(setData)
        .catch(() => {
          // Non-critical refresh failure
        })
    }, []),
  })

  // Auto-rotate when more items than visible slots
  useEffect(() => {
    if (data.items.length <= MAX_VISIBLE) return
    const timer = setInterval(() => {
      setOffset((prev) => (prev + 1) % data.items.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [data.items.length])

  if (data.items.length === 0) {
    return (
      <div className="flex items-center px-4 h-8 bg-stone-950/80 border-b border-stone-800/50">
        <span className="text-xs text-stone-600">No urgent items</span>
      </div>
    )
  }

  // Visible window
  const visible: GodModeResolvedItem[] = []
  for (let i = 0; i < Math.min(MAX_VISIBLE, data.items.length); i++) {
    visible.push(data.items[(offset + i) % data.items.length])
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 h-8 border-b overflow-hidden transition-colors',
        data.hasP0 ? 'bg-red-950/20 border-red-900/30' : 'bg-stone-950/80 border-stone-800/50'
      )}
    >
      {visible.map((item) => (
        <StripItem key={`${item.definitionId}-${item.destination}`} item={item} />
      ))}
      {data.totalUrgent > MAX_VISIBLE && (
        <span className="text-[10px] text-stone-600 ml-1">+{data.totalUrgent - MAX_VISIBLE}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the server wrapper**

```tsx
import { getRailStrip } from '@/lib/discovery/universal-rail-actions'
import { RailStrip } from './rail-strip'

export async function RailStripWrapper() {
  let data
  try {
    data = await getRailStrip()
  } catch {
    // Strip failure is non-critical; don't break the layout
    return null
  }

  return <RailStrip initialData={data} />
}

export function RailStripSkeleton() {
  return <div className="h-8 bg-stone-950/80 border-b border-stone-800/50" />
}
```

- [ ] **Step 3: Commit**

```bash
git add components/rail/rail-strip.tsx components/rail/rail-strip-wrapper.tsx
git commit -m "feat(rail): RailStrip persistent compact bar with SSE and auto-rotate"
```

---

## Task 15: Dashboard Layout Overhaul

**Files:**

- Modify: `app/(chef)/dashboard/page.tsx`

Replace current layout with rail-dominant left (65-70%) + widget sidebar right (30-35%). Existing dashboard sections become widgets.

- [ ] **Step 1: Read current dashboard page.tsx fully**

Read `app/(chef)/dashboard/page.tsx` to understand current section rendering and layout.

- [ ] **Step 2: Add God Mode rail imports and restructure the layout**

At the top of the file, add:

```typescript
import { Suspense } from 'react'
import { getGodModeRail } from '@/lib/discovery/universal-rail-actions'
import { RailFull, RailFullSkeleton } from '@/components/rail/rail-full'
```

Restructure the main return JSX to use a two-column layout:

```tsx
<div className="flex gap-6 min-h-[calc(100vh-4rem)]">
  {/* PRIMARY: God Mode Rail (65-70%) */}
  <div className="flex-[2] min-w-0 space-y-2">
    <Suspense fallback={<RailFullSkeleton />}>
      <GodModeRailSection />
    </Suspense>
  </div>

  {/* SECONDARY: Widget Sidebar (30-35%) */}
  <div className="flex-1 min-w-[280px] max-w-[400px] space-y-4 hidden lg:block">
    {/* Existing sections become widgets here */}
    <Suspense fallback={<WidgetCardSkeleton />}>
      <HeroMetrics ... />
    </Suspense>
    <Suspense fallback={<WidgetCardSkeleton />}>
      <ScheduleCards ... />
    </Suspense>
    <Suspense fallback={<WidgetCardSkeleton />}>
      <BusinessCards ... />
    </Suspense>
    {/* ... other existing sections as widgets */}
  </div>
</div>
```

Add the server component that fetches God Mode data:

```tsx
async function GodModeRailSection() {
  const result = await getGodModeRail()
  return <RailFull result={result} />
}
```

**Important:** Keep all existing dashboard sections. Move them to the widget sidebar. The rail replaces the ChefOperatorRail and UniversalRailSection. All other sections (HeroMetrics, ScheduleCards, PrepPressureCard, etc.) become sidebar widgets.

On mobile (< lg breakpoint), rail takes full width, widgets stack below.

- [ ] **Step 3: Verify the page renders**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/(chef)/dashboard/page.tsx
git commit -m "feat(rail): dashboard layout overhaul - rail-dominant with widget sidebar"
```

---

## Task 16: Integrate RailStrip into Chef Layout

**Files:**

- Modify: `app/(chef)/layout.tsx`

Add RailStripWrapper between navigation and content.

- [ ] **Step 1: Read current layout to find the insertion point**

Read `app/(chef)/layout.tsx` to find where content renders after nav.

- [ ] **Step 2: Add RailStrip import and render**

Add import:

```typescript
import { Suspense } from 'react'
import { RailStripWrapper, RailStripSkeleton } from '@/components/rail/rail-strip-wrapper'
```

Insert the strip between the nav/sidebar and the main content area. Find the `<ChefMainContent>` or equivalent wrapper and add the strip just before `{children}`:

```tsx
;<Suspense fallback={<RailStripSkeleton />}>
  <RailStripWrapper />
</Suspense>
{
  children
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`

- [ ] **Step 4: Visual verification**

Start dev server if not running. Navigate to chef dashboard. Verify:

1. RailStrip appears as thin bar below nav on every chef page
2. RailFull appears as primary content on dashboard with widgets on right
3. Tier groups render with correct colors (red P0, amber P1, blue P2)

- [ ] **Step 5: Commit**

```bash
git add app/(chef)/layout.tsx
git commit -m "feat(rail): integrate RailStrip into chef layout"
```

---

## Task 17: Tailwind Pulse Animation

**Files:**

- Modify: `tailwind.config.ts` (or `app/globals.css`)

Add `animate-pulse-subtle` class for P0 tier pulsing.

- [ ] **Step 1: Add the animation**

In `tailwind.config.ts`, extend the animation config:

```typescript
animation: {
  'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
},
keyframes: {
  'pulse-subtle': {
    '0%, 100%': { borderLeftColor: 'rgb(239 68 68)' },
    '50%': { borderLeftColor: 'rgb(239 68 68 / 0.4)' },
  },
},
```

If Tailwind config already has animation extensions, merge into existing.

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(rail): subtle pulse animation for P0 tier"
```

---

## Task 18: Health Check

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0

- [ ] **Step 2: Run all new tests**

Run: `npx tsx --test tests/unit/god-mode-types.test.ts tests/unit/resolvers/*.test.ts tests/unit/god-mode-assembly.test.ts tests/unit/god-mode-dispatcher.test.ts`
Expected: All tests pass

- [ ] **Step 3: Build check**

Run: `npx next build --no-lint`
Expected: Exit 0

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix(rail): health check fixes for God Mode Phase 1+2"
```

---

## Dependency Graph

```
Task 1 (types)
  |
  +---> Task 2 (inquiry resolver)
  +---> Task 3 (message resolver)
  +---> Task 4 (payment resolver)
  +---> Task 5 (event resolver)
  +---> Task 6 (quote resolver)
  |       |
  |       v
  +---> Task 7 (dispatcher) -- depends on Tasks 2-6
          |
          v
        Task 8 (assembly)
          |
          v
        Task 9 (server actions) -- depends on Tasks 7, 8
          |
          +---> Task 10 (inline action registry)
          +---> Task 11 (RailItemRow) -- depends on Task 10
          +---> Task 12 (RailTierGroup) -- depends on Task 11
          +---> Task 13 (RailFull) -- depends on Task 12
          +---> Task 14 (RailStrip) -- depends on Task 9
          |
          v
        Task 15 (dashboard layout) -- depends on Tasks 13, 9
        Task 16 (layout integration) -- depends on Task 14
        Task 17 (animation) -- independent
        Task 18 (health check) -- depends on all
```

Tasks 2-6 can run in parallel. Tasks 10-14 can run in parallel. Task 17 is independent.

---

## What Comes Next (Separate Plans)

After Phase 1+2 is proven:

- **Phase 3 plan:** RailStrip mobile adaptation, CNN-crawl animation polish
- **Phase 4 plan:** 9 warm/cool chef domain resolvers (staff, menus, recipes, prep, vendors, clients, equipment, weather, financial)
- **Phase 5 plan:** Widget system (configurable sidebar, 5 default widgets, cross-referencing)
- **Phase 6 plan:** Resolvers for client, staff, partner, admin, guest roles
- **Phase 7 plan:** Public homepage unification (feature-flagged migration)
