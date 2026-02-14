# Event Status Enum Lock (V1)

This document defines the **exact** event status enum values for ChefFlow V1. These values are immutable and cannot be changed without a migration. This is the canonical reference for all event lifecycle states.

---

## Canonical Status Values

The event status enum has **exactly 9 values** in V1:

```typescript
type EventStatus =
  | 'draft'
  | 'proposed'
  | 'deposit_pending'
  | 'confirmed'
  | 'menu_in_progress'
  | 'menu_locked'
  | 'executed'
  | 'closed'
  | 'canceled';
```

---

## Status Definitions

### `draft`
- **Meaning**: Event is being created; incomplete data allowed
- **Client Visibility**: No
- **Financial Lock**: No
- **Calendar Reservation**: No (soft hold only)
- **Next States**: `proposed`, `canceled`

### `proposed`
- **Meaning**: Chef has created complete proposal; awaiting client response
- **Client Visibility**: Yes (via invite/link)
- **Financial Lock**: No (terms can be edited)
- **Calendar Reservation**: Soft (other events can overlap if flagged)
- **Next States**: `deposit_pending`, `draft`, `canceled`

### `deposit_pending`
- **Meaning**: Payment intent created; awaiting deposit payment
- **Client Visibility**: Yes (payment UI shown)
- **Financial Lock**: Partial (total_amount_cents locked, no changes without new proposal)
- **Calendar Reservation**: Hard (no overlap allowed)
- **Next States**: `confirmed`, `canceled`

### `confirmed`
- **Meaning**: Deposit received and confirmed via Stripe webhook
- **Client Visibility**: Yes
- **Financial Lock**: Yes (financial terms locked)
- **Calendar Reservation**: Hard
- **Next States**: `menu_in_progress`, `canceled`

### `menu_in_progress`
- **Meaning**: Menu drafting/refinement underway
- **Client Visibility**: Yes (may see draft menu if shared)
- **Financial Lock**: Yes
- **Calendar Reservation**: Hard
- **Next States**: `menu_locked`, `canceled`

### `menu_locked`
- **Meaning**: Menu finalized and locked; event ready for execution
- **Client Visibility**: Yes (locked menu visible)
- **Financial Lock**: Yes
- **Calendar Reservation**: Hard
- **Next States**: `executed`, `canceled`

### `executed`
- **Meaning**: Event has occurred; awaiting final reconciliation
- **Client Visibility**: Yes
- **Financial Lock**: Yes (balance reconciliation may occur)
- **Calendar Reservation**: Hard (historical)
- **Next States**: `closed`

### `closed`
- **Meaning**: Event fully complete; financial reconciliation done; terminal state
- **Client Visibility**: Yes (read-only)
- **Financial Lock**: Yes (immutable)
- **Calendar Reservation**: Hard (historical)
- **Next States**: None (terminal)

### `canceled`
- **Meaning**: Event canceled; refund processing may be required; terminal state
- **Client Visibility**: Yes (with cancellation reason)
- **Financial Lock**: Yes (refund ledger entries append-only)
- **Calendar Reservation**: Released
- **Next States**: None (terminal)

---

## Database Enum Definition

```sql
CREATE TYPE event_status AS ENUM (
  'draft',
  'proposed',
  'deposit_pending',
  'confirmed',
  'menu_in_progress',
  'menu_locked',
  'executed',
  'closed',
  'canceled'
);

ALTER TABLE events
ADD COLUMN status event_status NOT NULL DEFAULT 'draft';
```

---

## TypeScript Type Definition

```typescript
// types/database.ts
export type EventStatus =
  | 'draft'
  | 'proposed'
  | 'deposit_pending'
  | 'confirmed'
  | 'menu_in_progress'
  | 'menu_locked'
  | 'executed'
  | 'closed'
  | 'canceled';

export const EVENT_STATUSES: readonly EventStatus[] = [
  'draft',
  'proposed',
  'deposit_pending',
  'confirmed',
  'menu_in_progress',
  'menu_locked',
  'executed',
  'closed',
  'canceled',
] as const;

export const TERMINAL_STATUSES: readonly EventStatus[] = [
  'closed',
  'canceled',
] as const;

export const ACTIVE_STATUSES: readonly EventStatus[] = [
  'draft',
  'proposed',
  'deposit_pending',
  'confirmed',
  'menu_in_progress',
  'menu_locked',
  'executed',
] as const;
```

---

## Status Categories

### Terminal States
States that cannot transition further:
- `closed`
- `canceled`

### Pre-Confirmation States
States before deposit confirmed:
- `draft`
- `proposed`
- `deposit_pending`

### Post-Confirmation States
States after deposit confirmed:
- `confirmed`
- `menu_in_progress`
- `menu_locked`
- `executed`
- `closed`

### Cancellable States
States from which cancellation is allowed:
- `draft`
- `proposed`
- `deposit_pending`
- `confirmed`
- `menu_in_progress`
- `menu_locked`

(Note: `executed` typically cannot be canceled; refund handling occurs in `closed` state)

---

## Rules and Constraints

### Rule 1: Enum is Immutable
Once deployed, enum values cannot be:
- Renamed
- Removed
- Reordered (without migration)

New states can be added only via migration and transition map update.

### Rule 2: Default State
New events MUST default to `draft` status.

### Rule 3: Terminal States Cannot Change
Once an event reaches `closed` or `canceled`, its status is **final**. No transitions are allowed from terminal states.

### Rule 4: Status Must Match Transition Map
Every status change must be validated against the transition map (see `06_EVENT_TRANSITION_MAP.md`).

### Rule 5: Database and TypeScript Must Match
The database enum and TypeScript types must remain synchronized. Migrations must update both.

---

## UI Display Strings

```typescript
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  deposit_pending: 'Awaiting Deposit',
  confirmed: 'Confirmed',
  menu_in_progress: 'Menu in Progress',
  menu_locked: 'Menu Locked',
  executed: 'Executed',
  closed: 'Closed',
  canceled: 'Canceled',
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'gray',
  proposed: 'blue',
  deposit_pending: 'yellow',
  confirmed: 'green',
  menu_in_progress: 'purple',
  menu_locked: 'indigo',
  executed: 'teal',
  closed: 'gray',
  canceled: 'red',
};
```

---

## V1 Scope Boundaries

### Included in V1
- All 9 states defined above
- Terminal state enforcement
- Status validation against transition map

### Excluded from V1
- Dynamic status creation (statuses are locked)
- Multi-path workflows (single linear flow with cancellation option)
- Sub-statuses or status modifiers (e.g., "confirmed_pending_reschedule")
- Custom status labels per tenant

---

## Verification

To verify enum integrity:

```sql
-- Check that all events have valid status
SELECT status, COUNT(*)
FROM events
GROUP BY status
ORDER BY status;

-- Verify no NULL statuses exist
SELECT COUNT(*)
FROM events
WHERE status IS NULL;
-- Should return 0
```

---

## Migration Considerations

If a new status is added in V2:

1. Add to database enum via migration
2. Update TypeScript types
3. Update transition map
4. Update UI labels and colors
5. Add RLS policy considerations
6. Update audit/reporting queries

**Do not modify existing status values. Append only.**

---

**End of Event Status Enum Lock**
