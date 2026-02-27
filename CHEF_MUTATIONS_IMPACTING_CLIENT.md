# Chef Mutations Impacting Client

## Scope

This inventory lists current mutation paths that can change client-facing projections for:

- events
- menus
- menu state/versioning behavior
- pricing totals and financial summaries
- ledger entries
- lifecycle/status fields
- publish/visibility surfaces used by client-facing pages or documents

## 1) Event writes and lifecycle state changes

### `lib/events/actions.ts`

#### `createEvent(input)`

- Writes:
  - `events` insert (core event fields, initial `status` default `draft`)
  - `event_state_transitions` insert (`null -> draft`)
- Client impact:
  - Determines whether event can later appear in `/my-events` once proposed/accepted/etc.
- Trigger/function involvement:
  - DB trigger logs/validates event transitions on status updates (migration Layer 3)
- Partial-state risk:
  - Medium. Event insert and transition insert are separate statements in app code.

#### `updateEvent(eventId, input)`

- Writes:
  - `events` update (safe editable fields only, restricted to `draft|proposed`)
- Client impact:
  - Changes details shown across `/my-events/[id]`, proposal, countdown, payment-plan.
- Partial-state risk:
  - Low. Single-row update; optimistic concurrency supported via `expected_updated_at`.

#### `deleteEvent(eventId)` / `restoreEvent(eventId)`

- Writes:
  - Soft-delete fields on `events` (`deleted_at`, `deleted_by`) and restore fields
- Client impact:
  - Can remove/re-add event visibility depending on RLS/query filters.

#### `markResetComplete`, `markFollowUpSent`, `startEventActivity`, `stopEventActivity`, `updateEventTimeAndCard`, `setEventFoodCostBudget`

- Writes:
  - Various `events` operational fields
- Client impact:
  - Some fields are indirectly visible in post-event and timeline sections.

### `lib/events/transitions.ts`

#### `transitionEvent({ eventId, toStatus, ... })`

- Writes:
  - Calls RPC `transition_event_atomic` which atomically updates:
    - `events.status`
    - cancellation metadata fields when cancelling
    - `event_state_transitions` append row
- Client impact:
  - Primary source for client lifecycle rendering and available actions.
  - Drives visibility/action gates in event detail/proposal/payment flows.
- Trigger/function involvement:
  - `transition_event_atomic` (migration `20260320000001_atomic_transition_and_dlq.sql`)
  - Layer 3 transition validation/audit functions and immutable transition log triggers.
- Partial-state risk:
  - Low for status + transition log (atomic in DB function).
  - Medium for post-transition side effects (emails, FOH generation, notifications, calendar sync) because they are intentionally non-blocking.

#### Wrappers `proposeEvent`, `confirmEvent`, `startEvent`, `completeEvent`, `cancelEvent`

- Writes:
  - Delegated lifecycle transitions via `transitionEvent`.
- Client impact:
  - Immediate effect on route access and UI states.

## 2) Menu lifecycle and event-menu linkage

### `lib/menus/actions.ts`

#### `createMenu`, `updateMenu`, `deleteMenu`, `restoreMenu`

- Writes:
  - `menus` row lifecycle fields/status
  - `menu_state_transitions` inserts during creation and explicit transitions
- Client impact:
  - Controls menu content shown on event detail/proposal and printable document generation.
- Trigger/function involvement:
  - Layer 4 menu transition validation/log triggers and immutable transition table policies.

#### `attachMenuToEvent(eventId, menuId)` / `detachMenuFromEvent(menuId)`

- Writes:
  - `menus.event_id`
  - `events.menu_id` and `events.course_count` synchronization
- Client impact:
  - Determines which menu appears under client event pages and FOH document pipeline.
- Partial-state risk:
  - Medium. Multi-statement updates across tables without explicit transaction wrapper.

#### `transitionMenu(menuId, toStatus, reason?)`

- Writes:
  - `menus.status`
  - transition audit rows (via trigger/function)
- Client impact:
  - Proposal/event pages display menu status badges; menu availability assumptions depend on status.

#### `applyMenuToEvent`, `duplicateMenu`, `cloneMenu`

- Writes:
  - `menus`, `dishes`, `components`, possible event linkage updates
- Client impact:
  - Can change menu associated with client event and downstream printable output.

### `lib/menus/editor-actions.ts`

#### `updateMenuMeta`, `updateDishEditorContent`, `addEditorCourse`, `deleteEditorCourse`, `reorderEditorCourse`

- Writes:
  - `menus` and `dishes` autosave/editor content
- Client impact:
  - Directly changes what client sees in menu sections and generated PDFs.

## 3) Menu approval workflow mutations

### `lib/events/menu-approval-actions.ts`

#### `sendMenuForApproval(eventId)`

- Writes:
  - `menu_approval_requests` insert with `menu_snapshot`, `status='sent'`
  - `events.menu_approval_status='sent'`, `events.menu_sent_at`
- Client impact:
  - Enables `/my-events/[id]/approve-menu` flow and timeline state.
- Partial-state risk:
  - Medium. Request insert and event update are separate writes.

#### `getMenuApprovalStatus(eventId)` (read path) and client responses (`approveMenu`, `requestMenuRevision`)

- Chef-side mutation relevance:
  - Chef send action drives client-visible approval state.

## 4) Quote and pricing mutations that feed client views

### `lib/quotes/actions.ts`

#### `createQuote`, `updateQuote`, `deleteQuote`, `restoreQuote`, `reviseQuote`

- Writes:
  - `quotes` fields including pricing and version lineage flags
- Client impact:
  - Drives `/my-quotes` and `/my-quotes/[id]` content availability.

#### `transitionQuote(id, newStatus)`

- Writes:
  - `quotes.status` and status timestamps (`sent_at`, etc.)
  - `snapshot_frozen` / `pricing_snapshot` when accepted
- Trigger/function involvement:
  - Layer 3 quote state validation + audit triggers:
    - `validate_quote_state_transition`
    - `log_quote_state_transition`
    - `freeze_quote_snapshot_on_acceptance`
- Client impact:
  - `status='sent'` is the gate that makes a quote visible and actionable for client.

## 5) Contract lifecycle mutations affecting client contract pages

### `lib/contracts/actions.ts`

#### `generateEventContract(eventId, templateId?)`

- Writes:
  - Voids prior unsigned contracts (`event_contracts.status='voided'`)
  - Inserts fresh `event_contracts` row (`status='draft'`, body snapshot)
- Client impact:
  - Determines contract body/status shown in proposal and signing pages.
- Partial-state risk:
  - Medium. Void-old + insert-new are separate statements.

#### `sendContractToClient(contractId)`

- Writes:
  - `event_contracts.status='sent'`, `sent_at`
- Client impact:
  - Unlocks client signing flow.

#### `voidContract(contractId, reason?)`

- Writes:
  - `event_contracts.status='voided'`, `voided_at`, `void_reason`
- Client impact:
  - Client signing page becomes non-actionable with voided message.

## 6) Financial and ledger mutations

### `lib/events/offline-payment-actions.ts`

#### `recordOfflinePayment(input)`

- Writes:
  - `ledger_entries` insert (`deposit` or `payment`)
  - optional event transition `accepted -> paid` through `transitionEvent(systemTransition=true)`
- Trigger/function involvement:
  - `update_event_payment_status_on_ledger_insert`
  - `update_client_lifetime_value_on_ledger_insert`
  - ledger immutability triggers (no update/delete)
- Client impact:
  - Updates payment history, outstanding balances, status badges, pay CTA behavior.
- Partial-state risk:
  - Medium. Ledger append succeeds even if downstream transition or notifications fail.

### `app/api/webhooks/stripe/route.ts` (system mutation path heavily tied to chef/client contract)

#### `handlePaymentSucceeded`

- Writes:
  - `ledger_entries` append via `appendLedgerEntryFromWebhook`
  - event transition to `paid` via `transitionEvent(systemTransition=true)`
  - invoice numbering via `assignInvoiceNumber` (events.invoice_number / invoice_issued_at)
- Client impact:
  - Payment completion across event detail, invoice, spending, payment status.

#### `handlePaymentFailed`, `handlePaymentCanceled`, `handleRefund`, `handleDispute*`

- Writes:
  - `ledger_entries` append adjustment/refund rows
- Client impact:
  - Affects financial projections and balances in client-visible summaries.

## 7) Invoice numbering mutation

### `lib/events/invoice-actions.ts`

#### `assignInvoiceNumber(eventId)`

- Writes:
  - `events.invoice_number`, `events.invoice_issued_at`
- Client impact:
  - Invoice PDF reference identity.

## 8) Client visibility flag mutations controlled by chef

### `lib/sharing/actions.ts`

#### `updateGuestVisibility(eventShareId, settings)`

- Writes:
  - `event_shares.visibility_settings` JSON
- Client impact:
  - Controls what guest-share portal can reveal (occasion/date/location/menu/guest-list/etc).

## 9) DB-level contracts and triggers used by client projections

### Financial

- View: `event_financial_summary` (Layer 3)
- Function/trigger: `update_event_payment_status_on_ledger_insert` (AFTER INSERT on `ledger_entries`)
- Function/trigger: `prevent_ledger_mutation` (immutability of financial log)

### Event state

- Function/trigger: `validate_event_state_transition`
- Function/trigger: `log_event_state_transition`
- Transition log immutability triggers on `event_state_transitions`
- RPC: `transition_event_atomic` (atomic status+audit write)

### Quote state

- Function/trigger: `validate_quote_state_transition`
- Function/trigger: `freeze_quote_snapshot_on_acceptance`
- Function/trigger: `log_quote_state_transition`
- Transition log immutability triggers on `quote_state_transitions`

### Menu state

- Function/trigger: `validate_menu_state_transition`
- Function/trigger: `log_menu_state_transition`
- Transition log immutability triggers on `menu_state_transitions`

## 10) Menu versions note (explicit finding)

- No active runtime mutations were found against a `menu_versions` table in the current code paths.
- Current effective versioning/audit behavior is implemented via:
  - `menus` current row
  - `menu_state_transitions` audit trail
  - `menu_approval_requests.menu_snapshot` per send cycle
  - `front_of_house_menus` saved rendered outputs (template generation history)

## 11) Known high-risk partial-state seams

- `sendMenuForApproval`: request insert then event status update (not wrapped in explicit transaction).
- `generateEventContract`: void-old then insert-new contract (not wrapped in explicit transaction).
- `attachMenuToEvent` / detach paths: cross-table sync (`menus` + `events`) is multi-step.
- Stripe/offline payment flows: ledger write is source-of-truth and may succeed while non-blocking side effects fail.
