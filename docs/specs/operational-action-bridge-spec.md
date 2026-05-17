# Operational Action Bridge Spec

> Status: SPEC-READY
> Date: 2026-05-16
> Priority: P0 (enables entire Operational Copilot philosophy)
> Depends on: None (all prerequisites exist)
> Governed by: `docs/specs/operational-copilot-philosophy.md`

---

## Problem

Three registries exist but don't connect:

1. **Interaction Registry** (`lib/interactions/`) - knows 40 action types, logs them, but doesn't execute
2. **Inline-Action-Registry** (`lib/discovery/inline-action-registry.ts`) - dispatches but only 4 entries, mostly redirects
3. **Circle Notification Types** (`hub_messages.notification_type`) - 15 types displayed as cards, no response buttons

Meanwhile, domain actions (`lib/events/transitions.ts`, `lib/quotes/actions.ts`, etc.) are pure `'use server'` exports callable from anywhere. They just aren't wired to the surfaces where chefs want to act.

---

## Solution: Universal Action Executor

One bridge layer that:

1. Maps action identifiers to actual server action calls
2. Provides a UI primitive for inline execution (no navigation)
3. Works identically in rail items, circle messages, and any future surface

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              UNIVERSAL ACTION REGISTRY               │
│  lib/actions/action-registry.ts                      │
│                                                      │
│  Maps: actionId -> { execute, label, icon,           │
│         requiresConfirm, visibility, domain }        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Rail    │  │  Circle  │  │  Any Future       │  │
│  │  Items   │  │  Cards   │  │  Surface          │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                  │             │
│       └──────────────┼──────────────────┘             │
│                      ▼                                │
│         <InlineActionExecutor                         │
│           actionId="request_deposit"                  │
│           entityId={eventId}                          │
│           context={{ ... }}                           │
│         />                                           │
│                      │                                │
│                      ▼                                │
│         action-registry.ts.execute()                  │
│                      │                                │
│                      ▼                                │
│         Domain Server Action                          │
│         (lib/events/offline-payment-actions.ts)       │
│                      │                                │
│                      ▼                                │
│         Side Effects:                                 │
│         - State transition                            │
│         - Circle notification posted                  │
│         - Rail item updated/dismissed                 │
│         - Interaction logged                          │
│         - Cache invalidated                           │
└─────────────────────────────────────────────────────┘
```

---

## Wave 1: Action Registry + Executor Component (Foundation)

### File: `lib/actions/action-registry.ts`

Central registry mapping action IDs to execution metadata:

```typescript
type ActionDef = {
  id: string
  label: string
  icon: string
  domain: 'events' | 'inquiries' | 'quotes' | 'contracts' | 'menus' | 'payments' | 'communication'
  execute: (entityId: string, context: Record<string, unknown>) => Promise<ActionResult>
  requiresConfirm?: boolean
  confirmMessage?: string
  visibility: 'chef-only' | 'client-visible' | 'guest-visible' | 'internal'
  availableOn: ('rail' | 'circle' | 'page' | 'notification' | 'mobile')[]
}

type ActionResult = {
  success: boolean
  message?: string
  nextAction?: string
  dismiss?: boolean // remove from rail/notification
  circleNotification?: { type: string; data: unknown } // auto-post to circle
}
```

### Initial Action Set (Wave 1 - highest impact)

| Action ID                     | Domain        | Server Action                    | Surfaces           |
| ----------------------------- | ------------- | -------------------------------- | ------------------ |
| `send_payment_reminder`       | payments      | `sendPaymentReminder`            | rail, circle       |
| `request_deposit`             | payments      | `requestDeposit`                 | rail, circle, page |
| `record_offline_payment`      | payments      | `recordOfflinePayment`           | rail, page         |
| `send_quote`                  | quotes        | `sendQuoteToClient`              | rail, circle, page |
| `convert_inquiry_to_proposal` | inquiries     | `transitionInquiry('quoted')`    | rail, page         |
| `mark_inquiry_responded`      | inquiries     | `transitionInquiry('responded')` | rail, page         |
| `send_contract`               | contracts     | `sendContractToClient`           | rail, circle       |
| `confirm_event`               | events        | `transitionEvent('confirmed')`   | rail, circle, page |
| `share_menu`                  | menus         | `shareMenuWithClient`            | rail, circle, page |
| `send_followup`               | communication | `sendFollowUp`                   | rail, circle       |

### File: `components/actions/inline-action-executor.tsx`

Universal UI component (replaces queue-item-inline-action pattern):

```tsx
// Renders: button/chip -> optional confirm -> execute -> success/error feedback -> dismiss
<InlineActionExecutor
  actionId="request_deposit"
  entityId={event.id}
  context={{ amount: event.depositAmount, clientName: event.clientName }}
  variant="chip" | "button" | "card-action"
  onSuccess={() => dismissRailItem()}
/>
```

---

## Wave 2: Rail Integration

Wire `InlineActionExecutor` into existing rail system:

1. **Update `rail-item-row.tsx`** - Replace current `executeInlineAction` dispatch with `<InlineActionExecutor>`
2. **Update `inline-action-registry.ts`** - Point entries to action-registry instead of stubs
3. **Populate resolver `inlineActions[]`** - Each of 35 resolvers that returns actionable items now maps to real action IDs

Result: Chef taps "Request Deposit" on rail card -> executes inline -> item dismissed -> circle notification auto-posted.

---

## Wave 3: Circle Integration

Wire `InlineActionExecutor` into circle notification cards:

1. **Update circle message renderer** - When `notification_type` has a registered response action, render action button
2. **Add response actions to notification types:**
   - `contract_ready` -> "Accept Contract" button
   - `invoice_sent` -> "Mark Paid" button (chef) / "Pay Now" button (client)
   - `menu_shared` -> "Approve" / "Request Changes" buttons
   - `quote_sent` -> "Accept" button (already exists via `circle-approval-actions.ts`)
3. **Bidirectional propagation** - Circle action -> state change -> circle notification of result

Result: Client sees "Contract Ready" card in circle -> taps "Accept" -> contract signed -> event transitions -> "Contract Signed" notification auto-posts.

---

## Wave 4: Progress Signaling

Lightweight client-facing status system:

1. **Event progress signals** - Chef actions auto-generate progress messages
2. **Signal visibility model** - Each action in registry declares what client sees
3. **Circle progress feed** - Filtered view of operational progress (not raw notifications)

Example: Chef records offline payment -> circle auto-posts "Deposit confirmed" -> client sees progress without chef manually messaging.

---

## What NOT To Build

- No new database tables (actions execute against existing schemas)
- No new API routes (server actions are the API)
- No separate "action service" (registry is a map, not a server)
- No duplication of domain logic (registry delegates to existing actions)
- No new notification system (posts to existing circle lifecycle hooks)

---

## Success Criteria

1. Chef can request deposit from rail without navigating to event page
2. Chef can share menu from circle without navigating to menu editor
3. Client can accept contract from circle inline
4. Action executed anywhere propagates to all relevant surfaces
5. No new domain logic written; only wiring existing actions to new surfaces

---

## Files to Create

| File                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `lib/actions/action-registry.ts`                  | Central registry + types                     |
| `lib/actions/action-definitions/payments.ts`      | Payment action wiring                        |
| `lib/actions/action-definitions/inquiries.ts`     | Inquiry action wiring                        |
| `lib/actions/action-definitions/quotes.ts`        | Quote action wiring                          |
| `lib/actions/action-definitions/contracts.ts`     | Contract action wiring                       |
| `lib/actions/action-definitions/events.ts`        | Event action wiring                          |
| `lib/actions/action-definitions/menus.ts`         | Menu action wiring                           |
| `lib/actions/action-definitions/communication.ts` | Communication action wiring                  |
| `components/actions/inline-action-executor.tsx`   | Universal inline executor UI                 |
| `components/actions/action-confirm-dialog.tsx`    | Confirmation overlay for destructive actions |

## Files to Modify

| File                                                     | Change                                                  |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `components/rail/rail-item-row.tsx`                      | Use InlineActionExecutor instead of executeInlineAction |
| `lib/discovery/inline-action-registry.ts`                | Delegate to action-registry                             |
| `components/hub/circle-message-card.tsx` (or equivalent) | Add response action buttons to notification cards       |
| `lib/hub/circle-lifecycle-hooks.ts`                      | Add action result posting                               |

---

## Relationship to Existing Systems

- **Interaction Registry** stays as-is (logging/analytics). Action-registry calls it as a side-effect.
- **Inline-Action-Registry** becomes a thin adapter that calls action-registry.
- **Circle lifecycle hooks** get a new "action completed" posting capability.
- **Queue inline-actions** pattern is extracted and generalized into InlineActionExecutor.
