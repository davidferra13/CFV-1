# Remy Snooze Escalation Spec

## Problem

Chefs snooze items instead of handling them. Remy can draft responses for most snoozeable items, but:

1. No repeat-snooze detection exists. Chef can snooze the same item forever.
2. Reactive handlers (stale inquiry, payment overdue) generate drafts but never save them to `scheduled_messages` or notify the chef. Drafts sit in AI task queue result JSON.

## Solution: Two Workstreams

### Workstream A: Repeat-Snooze Detection (Universal Bridge)

When a chef snoozes the same item 2+ times, offer Remy intervention instead of just hiding it again.

#### A1: Track snooze count in localStorage stores

**`lib/dashboard/snooze.ts`:**

- Add `count: number` to `SnoozeEntry` type
- In `snoozeChip()`: increment count (read existing entry's count, add 1). New items start at 1.
- Add export: `getSnoozeCount(chipId: string): number` - returns count from store, 0 if not found
- Add export: `REPEAT_SNOOZE_THRESHOLD = 2`

**`lib/hooks/use-queue-snooze.ts`:**

- Change `SnoozedMap` value from `string` (ISO date) to `{ until: string; count: number }`
- In `snoozeItem()`: increment count. Preserve count across re-snoozes.
- In `cleanExpiredEntries()`: keep expired entries for count tracking (clean entries older than 7 days)
- Add to return: `getSnoozeCount(itemId: string): number`
- Add to return: `isRepeatSnoozed(itemId: string): boolean` (count >= 2)

#### A2: Remy escalation utility

**New file: `lib/remy/snooze-escalation.ts`:**

```typescript
export type SnoozeEscalation = {
  message: string // "You've snoozed this 3 times. Want Remy to draft a follow-up?"
  remyPrompt: string // Pre-filled prompt for Remy chat
  actionLabel: string // "Let Remy handle it"
}

export function getSnoozeEscalation(
  itemType: 'inquiry' | 'payment' | 'follow-up' | 'thread' | 'reminder' | 'generic',
  context: { clientName?: string; subject?: string; snoozeCount: number }
): SnoozeEscalation
```

Maps item types to Remy prompts:

- `inquiry` -> "Draft a follow-up for {clientName}'s inquiry"
- `payment` -> "Draft a payment reminder for {clientName}"
- `follow-up` -> "Draft a follow-up message for {clientName}"
- `thread` -> "Draft a reply to {clientName}'s message about {subject}"
- `reminder` -> "Help me handle this reminder: {subject}"
- `generic` -> "Help me decide what to do about this"

#### A3: UI integration

**`components/dashboard/attention-rail.tsx`:**

- After snooze action, check `getSnoozeCount()`. If >= REPEAT_SNOOZE_THRESHOLD:
  - Show a subtle banner/toast: "{message}" with "Let Remy handle it" button
  - Button opens Remy chat with pre-filled prompt from `getSnoozeEscalation()`
  - Still allow the snooze (don't block it)

**`components/queue/snooze-popover.tsx`:**

- Accept new prop: `snoozeCount?: number`
- When `snoozeCount >= 2`, add a divider + "Let Remy handle it" option at the bottom of the popover
- This option calls `onRemyEscalation()` callback (new prop)

### Workstream B: Wire Reactive Handler Drafts to Chef

Follow the CIL auto-dispatch pattern from `lib/cil/auto-dispatch.ts`.

**`lib/ai/reactive/handlers.ts` - `handleInquiryStale()`:**
After generating draft text, add:

1. Save draft to `scheduled_messages` table with `status: 'draft'`, `channel: 'email'`, `message_type: 'follow_up'`
2. Call `createNotification()` with title "Remy drafted a follow-up for {clientName}", link to draft review
3. Return the saved draft ID in result

**`lib/ai/reactive/handlers.ts` - `handlePaymentOverdue()`:**
Same pattern:

1. Save draft to `scheduled_messages` with `status: 'draft'`, `channel: 'email'`, `message_type: 'payment_reminder'`
2. Call `createNotification()` with title "Payment reminder drafted for {clientName} - {amount}"
3. Return saved draft ID in result

**Dedup:** Before saving, check if a draft for the same entity already exists in `scheduled_messages` with status `'draft'`. Skip if duplicate.

## Files Modified

| File                                      | Change                                |
| ----------------------------------------- | ------------------------------------- |
| `lib/dashboard/snooze.ts`                 | Add count tracking, exports           |
| `lib/hooks/use-queue-snooze.ts`           | Add count tracking, new return values |
| `lib/remy/snooze-escalation.ts`           | NEW - escalation utility              |
| `components/dashboard/attention-rail.tsx` | Show Remy offer on repeat snooze      |
| `components/queue/snooze-popover.tsx`     | Add Remy option on repeat snooze      |
| `lib/ai/reactive/handlers.ts`             | Wire draft save + notification        |

## Not In Scope

- DB-backed snooze count tracking (notifications, rail items, reminders) - future phase
- Auto-routing captures to Remy - future phase
- Remy auto-triage rules - future phase
- Changing snooze durations or adding new snooze surfaces

## Done When

1. Snooze count tracked in both localStorage stores
2. Repeat-snooze (2+) shows "Let Remy handle it" in dashboard chips and queue popover
3. Stale inquiry handler saves draft to `scheduled_messages` + notifies chef
4. Payment overdue handler saves draft to `scheduled_messages` + notifies chef
5. Tests for snooze count tracking and escalation utility
