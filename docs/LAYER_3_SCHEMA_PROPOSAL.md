# LAYER 3 SCHEMA PROPOSAL
## Events, Quotes, Financial Tracking

Version 1.0 — February 15, 2026

---

## OVERVIEW

Layer 3 implements the core operational engine of ChefFlow: events, quotes, financial ledger, expenses, and post-event retrospectives. This layer builds on Layer 1 (identity/auth) and Layer 2 (inquiry/messaging) to create the complete event lifecycle.

**Design Principles:**
- Immutable financial records (ledger append-only)
- State machine enforcement (validated transitions only)
- Tenant isolation (tenant_id scoped everywhere)
- Defense in depth (triggers + RLS + application checks)
- Snapshot pricing at acceptance (frozen quotes)
- Time tracking for all phases (shopping → prep → service → reset)
- Calm-first metrics (calm_rating, preparation_rating)

---

## TABLE 1: `events`

The canonical event record. Every dinner is an event. Links to inquiry (conversion), client (who it's for), and eventually menu (what's being cooked).

### Columns

#### Identity & Relationships
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `client_id` — UUID, NOT NULL, FK to clients.id
- `inquiry_id` — UUID, nullable, FK to inquiries.id (set when converted from inquiry)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Event Details
- `event_date` — date, NOT NULL
- `serve_time` — time, NOT NULL (anchor time for timeline generation)
- `arrival_time` — time, nullable (when chef arrives on site)
- `departure_time` — timestamptz, nullable (when chef left site — captured post-event)
- `guest_count` — integer, NOT NULL
- `guest_count_confirmed` — boolean, NOT NULL, default false (locked or still flexible)
- `occasion` — text, nullable (e.g., "Valentine's Day", "Birthday", "Anniversary")
- `service_style` — event_service_style enum, NOT NULL, default 'plated'

#### Location
- `location_address` — text, NOT NULL
- `location_city` — text, NOT NULL
- `location_state` — text, NOT NULL, default 'MA'
- `location_zip` — text, NOT NULL
- `location_notes` — text, nullable (parking, access instructions)
- `access_instructions` — text, nullable (e.g., "enter through garage")

#### Safety & Preferences
- `dietary_restrictions` — text[], NOT NULL, default '{}' (captured at event level, may differ from client baseline)
- `allergies` — text[], NOT NULL, default '{}' (captured at event level, IMMUTABLE after lock, flagged prominently)
- `cannabis_preference` — boolean, nullable (client preference for cannabis-infused options)
- `special_requests` — text, nullable

#### Kitchen & Site Context
- `kitchen_notes` — text, nullable (size, constraints, equipment available)
- `site_notes` — text, nullable (house rules, "no shoes", fragile items, etc.)

#### State Machine
- `status` — event_status enum, NOT NULL, default 'upcoming'
  - States: upcoming, in_progress, completed, canceled
  - Events only exist once inquiry is confirmed and quote is accepted

#### Pricing & Quote
- `quoted_price_cents` — integer, nullable (total quoted amount)
- `pricing_model` — pricing_model enum, nullable (per_person, flat_rate, custom)
- `pricing_snapshot` — jsonb, nullable (frozen pricing details at acceptance — IMMUTABLE after acceptance)
- `deposit_amount_cents` — integer, nullable
- `pricing_notes` — text, nullable

#### Payment Status
- `payment_status` — payment_status enum, NOT NULL, default 'unpaid'
  - Values: unpaid, deposit_paid, partial, paid, refunded
  - **CRITICAL:** This field is ONLY written by the `update_event_payment_status_on_ledger_insert` trigger. Application code must NEVER set this field directly. It is auto-computed from ledger_entries SUM.
- `payment_method_primary` — payment_method enum, nullable (how client typically pays)
- `tip_amount_cents` — integer, NOT NULL, default 0 (captured separately for statistics)

#### Document Readiness Flags
- `grocery_list_ready` — boolean, NOT NULL, default false
- `prep_list_ready` — boolean, NOT NULL, default false
- `equipment_list_ready` — boolean, NOT NULL, default false
- `packing_list_ready` — boolean, NOT NULL, default false
- `timeline_ready` — boolean, NOT NULL, default false
- `execution_sheet_ready` — boolean, NOT NULL, default false (service execution sheet)
- `non_negotiables_checked` — boolean, NOT NULL, default false (gloves, gum, towels, etc.)

#### Execution Tracking
- `car_packed` — boolean, NOT NULL, default false
- `car_packed_at` — timestamptz, nullable
- `component_count_total` — integer, nullable (for packing verification — all components across all courses)

#### Time Tracking (all nullable, captured as they happen)
- `shopping_started_at` — timestamptz, nullable
- `shopping_completed_at` — timestamptz, nullable
- `prep_started_at` — timestamptz, nullable
- `prep_completed_at` — timestamptz, nullable
- `travel_started_at` — timestamptz, nullable
- `travel_completed_at` — timestamptz, nullable (arrival_time)
- `service_started_at` — timestamptz, nullable
- `service_completed_at` — timestamptz, nullable
- `reset_started_at` — timestamptz, nullable
- `reset_completed_at` — timestamptz, nullable

#### Derived Time Durations (computed via views or application logic — NOT stored)
- These will be computed, not stored:
  - shopping_duration_minutes = shopping_completed - shopping_started
  - prep_duration_minutes = prep_completed - prep_started
  - travel_duration_minutes = travel_completed - travel_started
  - service_duration_minutes = service_completed - service_started
  - reset_duration_minutes = reset_completed - reset_started
  - total_time_minutes = sum of all durations

#### Leftover Tracking
- `leftover_value_carried_forward_cents` — integer, nullable, default 0 (value of leftovers transferred to next event)
- `leftover_value_received_cents` — integer, nullable, default 0 (value of leftovers received from prior event)
- `leftover_notes` — text, nullable (what was carried forward/received)

#### Post-Event Status
- `follow_up_sent` — boolean, NOT NULL, default false
- `follow_up_sent_at` — timestamptz, nullable
- `review_link_sent` — boolean, NOT NULL, default false
- `reset_complete` — boolean, NOT NULL, default false
- `aar_filed` — boolean, NOT NULL, default false (After Action Review filed)
- `financially_closed` — boolean, NOT NULL, default false
- `archived` — boolean, NOT NULL, default false

#### Cancellation
- `cancelled_at` — timestamptz, nullable
- `cancellation_reason` — text, nullable
- `cancellation_initiated_by` — cancellation_initiator enum, nullable (chef, client, mutual)

#### Audit
- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes
- `idx_events_tenant_id` on (tenant_id)
- `idx_events_client_id` on (client_id)
- `idx_events_inquiry_id` on (inquiry_id)
- `idx_events_status` on (status)
- `idx_events_event_date` on (event_date)
- `idx_events_tenant_date` on (tenant_id, event_date) — for calendar queries
- `idx_events_tenant_status` on (tenant_id, status) — for dashboard queries

### Constraints
- CHECK: event_date >= current_date - interval '1 year' (no events older than 1 year in the past)
- CHECK: guest_count > 0
- CHECK: guest_count <= 200 (sanity check)
- CHECK: quoted_price_cents >= 0 OR quoted_price_cents IS NULL
- CHECK: deposit_amount_cents >= 0 OR deposit_amount_cents IS NULL
- CHECK: deposit_amount_cents <= quoted_price_cents OR deposit_amount_cents IS NULL
- CHECK: tip_amount_cents >= 0

### Triggers
- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `validate_event_state_transition` — before UPDATE, enforce valid state transitions
- `freeze_pricing_snapshot_on_acceptance` — when status changes to 'accepted', snapshot pricing and make immutable
- `update_client_stats_on_event_completion` — after event completes, update client.total_events_count, last_event_date

---

## TABLE 2: `event_state_transitions`

Immutable audit trail of event state changes. Identical pattern to inquiry_state_transitions.

### Columns
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `event_id` — UUID, NOT NULL, FK to events.id ON DELETE CASCADE
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (denormalized for tenant scoping)
- `from_status` — event_status enum, nullable (null for initial state)
- `to_status` — event_status enum, NOT NULL
- `transitioned_at` — timestamptz, NOT NULL, default now()
- `transitioned_by` — UUID, nullable, FK to auth.users.id
- `reason` — text, nullable
- `metadata` — jsonb, nullable

### Indexes
- `idx_event_transitions_event_id` on (event_id)
- `idx_event_transitions_tenant_id` on (tenant_id)

### Constraints
- IMMUTABLE via trigger (no UPDATE/DELETE allowed)

### Triggers
- `prevent_event_transition_mutation` — raise exception on UPDATE or DELETE
- `log_event_transition_to_audit_log` — insert into audit_log on INSERT

---

## TABLE 3: `quotes`

Pricing proposals linked to inquiry and/or event. Can exist before event (attached to inquiry) or after event creation.

### Columns

#### Identity & Relationships
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `inquiry_id` — UUID, nullable, FK to inquiries.id (quote may be attached to inquiry)
- `event_id` — UUID, nullable, FK to events.id (quote may be attached to event after conversion)
- `client_id` — UUID, NOT NULL, FK to clients.id (denormalized for easier querying)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Quote Details
- `quote_name` — text, nullable (e.g., "Valentine's Day Dinner - Michel")
- `pricing_model` — pricing_model enum, NOT NULL, default 'per_person'
- `price_per_person_cents` — integer, nullable (if per_person model)
- `guest_count_estimated` — integer, nullable (for per_person calculation)
- `total_quoted_cents` — integer, NOT NULL (final quoted amount)
- `deposit_required` — boolean, NOT NULL, default false
- `deposit_amount_cents` — integer, nullable
- `deposit_percentage` — integer, nullable (if deposit is percentage of total)
- `pricing_notes` — text, nullable (breakdown, explanation)
- `internal_notes` — text, nullable (chef-only notes)

#### State Machine
- `status` — quote_status enum, NOT NULL, default 'draft'
  - States: draft, sent, accepted, rejected, expired
- `sent_at` — timestamptz, nullable
- `accepted_at` — timestamptz, nullable
- `rejected_at` — timestamptz, nullable
- `rejected_reason` — text, nullable
- `expired_at` — timestamptz, nullable
- `valid_until` — date, nullable (quote expiration date)

#### Snapshot (frozen at acceptance)
- `pricing_snapshot` — jsonb, nullable (frozen pricing details at acceptance — IMMUTABLE after acceptance)
- `snapshot_frozen` — boolean, NOT NULL, default false

#### Audit
- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes
- `idx_quotes_tenant_id` on (tenant_id)
- `idx_quotes_inquiry_id` on (inquiry_id)
- `idx_quotes_event_id` on (event_id)
- `idx_quotes_client_id` on (client_id)
- `idx_quotes_status` on (status)

### Constraints
- CHECK: total_quoted_cents > 0
- CHECK: deposit_amount_cents >= 0 OR deposit_amount_cents IS NULL
- CHECK: deposit_amount_cents <= total_quoted_cents OR deposit_amount_cents IS NULL
- CHECK: deposit_percentage >= 0 AND deposit_percentage <= 100 OR deposit_percentage IS NULL
- CHECK: price_per_person_cents > 0 OR price_per_person_cents IS NULL
- CHECK: guest_count_estimated > 0 OR guest_count_estimated IS NULL
- CHECK: inquiry_id IS NOT NULL OR event_id IS NOT NULL (quote must be attached to inquiry or event)

### Triggers
- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `validate_quote_state_transition` — before UPDATE, enforce valid state transitions
- `freeze_quote_snapshot_on_acceptance` — when status changes to 'accepted', snapshot pricing and make immutable
- `prevent_quote_mutation_after_acceptance` — raise exception if attempting to UPDATE frozen quote

---

## TABLE 4: `quote_state_transitions`

Immutable audit trail of quote state changes.

### Columns
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `quote_id` — UUID, NOT NULL, FK to quotes.id ON DELETE CASCADE
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (denormalized for tenant scoping)
- `from_status` — quote_status enum, nullable (null for initial state)
- `to_status` — quote_status enum, NOT NULL
- `transitioned_at` — timestamptz, NOT NULL, default now()
- `transitioned_by` — UUID, nullable, FK to auth.users.id
- `reason` — text, nullable
- `metadata` — jsonb, nullable

### Indexes
- `idx_quote_transitions_quote_id` on (quote_id)
- `idx_quote_transitions_tenant_id` on (tenant_id)

### Constraints
- IMMUTABLE via trigger (no UPDATE/DELETE allowed)

### Triggers
- `prevent_quote_transition_mutation` — raise exception on UPDATE or DELETE
- `log_quote_transition_to_audit_log` — insert into audit_log on INSERT

---

## TABLE 5: `ledger_entries`

Append-only financial ledger. Every payment, tip, refund, adjustment is a separate immutable entry.

**CRITICAL:** This table is NEVER updated or deleted. Only INSERT allowed. Computed balances are derived via SUM queries.

### Columns

#### Identity & Relationships
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `client_id` — UUID, NOT NULL, FK to clients.id
- `event_id` — UUID, nullable, FK to events.id (payment may not be event-specific, e.g., gift card purchase)
- `created_at` — timestamptz, NOT NULL, default now() (IMMUTABLE)

#### Ledger Entry Details
- `entry_type` — ledger_entry_type enum, NOT NULL
  - Values: payment, deposit, installment, final_payment, tip, refund, adjustment, add_on, credit
- `amount_cents` — integer, NOT NULL (positive for revenue, negative for refunds)
- `description` — text, NOT NULL (e.g., "Deposit for Valentine's Day dinner", "Final payment", "Tip", "Refund - event cancelled")
- `internal_notes` — text, nullable (chef-only notes)

#### Payment Method
- `payment_method` — payment_method enum, NOT NULL
- `payment_card_used` — text, nullable (for cash-back tracking, e.g., "Amex Blue Cash 4%", "Chase Sapphire 3%")
- `transaction_reference` — text, nullable (Venmo ID, PayPal transaction ID, check number, etc.)
- `received_at` — timestamptz, nullable (when payment was actually received — may differ from created_at)

#### Refund Details
- `is_refund` — boolean, NOT NULL, default false
- `refund_reason` — text, nullable
- `refunded_entry_id` — UUID, nullable, FK to ledger_entries.id (links refund to original payment)

#### Immutability Enforcement
- `ledger_sequence` — bigserial, NOT NULL (immutable sequence number for audit and ordering)

#### Audit
- `created_by` — UUID, nullable, FK to auth.users.id (who recorded this entry)

### Indexes
- `idx_ledger_entries_tenant_id` on (tenant_id)
- `idx_ledger_entries_client_id` on (client_id)
- `idx_ledger_entries_event_id` on (event_id)
- `idx_ledger_entries_entry_type` on (entry_type)
- `idx_ledger_entries_created_at` on (created_at)
- `idx_ledger_entries_ledger_sequence` on (ledger_sequence) — for ordered queries
- `idx_ledger_entries_tenant_event` on (tenant_id, event_id) — for event financial summary

### Constraints
- CHECK: amount_cents != 0 (no zero-value entries)
- CHECK: (is_refund = true AND amount_cents < 0) OR (is_refund = false AND amount_cents > 0) — refunds are negative, payments are positive
- CHECK: (is_refund = true AND refund_reason IS NOT NULL) OR is_refund = false — refunds must have reason
- CHECK: (entry_type = 'refund' AND is_refund = true) OR entry_type != 'refund'

### Triggers
- `prevent_ledger_mutation` — raise exception on UPDATE or DELETE (append-only enforcement)
- `log_ledger_entry_to_audit_log` — insert into audit_log on INSERT
- `update_client_lifetime_value_on_ledger_insert` — after INSERT, update client.lifetime_value_cents
- `update_event_payment_status_on_ledger_insert` — after INSERT, recompute event.payment_status based on total payments vs quoted_price

---

## TABLE 6: `expenses`

Cost tracking per event. Unlike ledger_entries (revenue side), this tracks the cost side.

### Columns

#### Identity & Relationships
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (tenant scoping)
- `event_id` — UUID, nullable, FK to events.id (expense may not be event-specific, e.g., equipment purchase)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### Expense Details
- `expense_date` — date, NOT NULL (when expense occurred)
- `category` — expense_category enum, NOT NULL
  - Values: groceries, alcohol, specialty_items, gas_mileage, equipment, supplies, other
- `vendor_name` — text, nullable (e.g., "Market Basket", "One Stop Liquor")
- `amount_cents` — integer, NOT NULL
- `description` — text, NOT NULL
- `notes` — text, nullable

#### Payment Method
- `payment_method` — payment_method enum, NOT NULL
- `payment_card_used` — text, nullable (for cash-back tracking)

#### Business vs Personal
- `is_business` — boolean, NOT NULL, default true (business vs personal separation)
- `is_reimbursable` — boolean, NOT NULL, default false

#### Receipt
- `receipt_photo_url` — text, nullable (photo capture of receipt)
- `receipt_uploaded` — boolean, NOT NULL, default false

#### Mileage Tracking (if category = gas_mileage)
- `mileage_miles` — decimal(8,2), nullable
- `mileage_rate_per_mile_cents` — integer, nullable (IRS rate at time of expense, e.g., 67 cents = 67)

#### Audit
- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes
- `idx_expenses_tenant_id` on (tenant_id)
- `idx_expenses_event_id` on (event_id)
- `idx_expenses_category` on (category)
- `idx_expenses_expense_date` on (expense_date)
- `idx_expenses_tenant_date` on (tenant_id, expense_date) — for monthly expense queries
- `idx_expenses_is_business` on (is_business) — for tax reporting

### Constraints
- CHECK: amount_cents > 0
- CHECK: (category = 'gas_mileage' AND mileage_miles IS NOT NULL AND mileage_rate_per_mile_cents IS NOT NULL) OR category != 'gas_mileage'
- CHECK: mileage_miles >= 0 OR mileage_miles IS NULL
- CHECK: mileage_rate_per_mile_cents > 0 OR mileage_rate_per_mile_cents IS NULL

### Triggers
- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `log_expense_to_audit_log` — insert into audit_log on INSERT/UPDATE

---

## TABLE 7: `after_action_reviews`

Post-event retrospective. One per event. This is where calm_rating, preparation_rating, and all "what went well/wrong" notes live.

### Columns

#### Identity & Relationships
- `id` — UUID, PRIMARY KEY, default gen_random_uuid()
- `event_id` — UUID, NOT NULL, UNIQUE, FK to events.id ON DELETE CASCADE (one AAR per event)
- `tenant_id` — UUID, NOT NULL, FK to chefs.id (denormalized for tenant scoping)
- `created_at` — timestamptz, NOT NULL, default now()
- `updated_at` — timestamptz, NOT NULL, default now()

#### The Real KPIs
- `calm_rating` — integer, NOT NULL, CHECK (calm_rating >= 1 AND calm_rating <= 5)
- `preparation_rating` — integer, NOT NULL, CHECK (preparation_rating >= 1 AND preparation_rating <= 5)
- `execution_rating` — integer, nullable, CHECK (execution_rating >= 1 AND execution_rating <= 5)

#### Retrospective Questions
- `could_have_done_earlier` — text, nullable (what could have been prepped earlier to reduce stress)
- `forgotten_items` — text[], NOT NULL, default '{}' (list of items forgotten — for pattern detection)
- `what_went_well` — text, nullable
- `what_went_wrong` — text, nullable
- `would_do_differently` — text, nullable

#### Menu & Client Performance
- `menu_performance_notes` — text, nullable (how did the menu perform, what worked, what didn't)
- `client_behavior_notes` — text, nullable (client vibe, generosity, feedback, etc.)
- `site_notes` — text, nullable (kitchen notes, house rules discovered, equipment issues)

#### General Notes
- `general_notes` — text, nullable (anything else worth recording)

#### Audit
- `created_by` — UUID, nullable, FK to auth.users.id
- `updated_by` — UUID, nullable, FK to auth.users.id

### Indexes
- `idx_aar_event_id` on (event_id)
- `idx_aar_tenant_id` on (tenant_id)
- `idx_aar_calm_rating` on (calm_rating) — for aggregation queries
- `idx_aar_preparation_rating` on (preparation_rating) — for aggregation queries

### Constraints
- UNIQUE: one AAR per event (enforced via event_id UNIQUE constraint)

### Triggers
- `update_updated_at_timestamp` — set updated_at = now() on UPDATE
- `mark_event_aar_filed_on_insert` — after INSERT, set events.aar_filed = true
- `log_aar_to_audit_log` — insert into audit_log on INSERT/UPDATE

---

## ENUMS

### `event_status`
```
upcoming
in_progress
completed
canceled
```

**Valid Transitions:**
- upcoming → in_progress (chef arrives on site)
- upcoming → canceled (event cancelled before execution)
- in_progress → completed (service done)
- completed → (terminal, no transitions)
- canceled → (terminal, no transitions)

**Note:** Events only exist in the database once the inquiry is confirmed and quote is accepted. All pre-confirmation complexity is handled by the inquiry pipeline and quotes table. By the time something becomes an event, it's real and scheduled.

### `payment_status`
```
unpaid
deposit_paid
partial
paid
refunded
```

**Computed, not transitioned directly. Derived from ledger_entries SUM.**

### `pricing_model`
```
per_person
flat_rate
custom
```

### `event_service_style`
```
plated
family_style
buffet
cocktail
tasting_menu
other
```

### `payment_method`
```
cash
venmo
paypal
zelle
card
check
other
```

### `cancellation_initiator`
```
chef
client
mutual
```

### `quote_status`
```
draft
sent
accepted
rejected
expired
```

**Valid Transitions:**
- draft → sent
- sent → accepted, rejected, expired
- accepted → (terminal, no transitions)
- rejected → (terminal, no transitions)
- expired → (terminal, no transitions)

### `ledger_entry_type`
```
payment
deposit
installment
final_payment
tip
refund
adjustment
add_on
credit
```

### `expense_category`
```
groceries
alcohol
specialty_items
gas_mileage
equipment
supplies
other
```

---

## FOREIGN KEY ADDITIONS TO LAYER 2

### `inquiries` table
Add FK constraint (deferred from Layer 2):
- `converted_to_event_id` — UUID, nullable, FK to events.id
  - Set when inquiry converts to event
  - Allows reverse lookup: "which inquiry created this event"

### `messages` table
Add FK constraint (deferred from Layer 2):
- `event_id` — UUID, nullable, FK to events.id
  - Allows messages to be linked to events (in addition to inquiries)
  - Message can be linked to inquiry OR event OR both

---

## TRIGGERS

### 1. `update_updated_at_timestamp`
**Tables:** events, quotes, expenses, after_action_reviews
**Action:** BEFORE UPDATE, set NEW.updated_at = now()

### 2. `validate_event_state_transition`
**Table:** events
**Action:** BEFORE UPDATE on status column
**Logic:**
- Check if OLD.status → NEW.status is a valid transition (see event_status enum transitions)
- Raise exception if invalid transition attempted
- Allow same-state (no-op)

### 3. `freeze_pricing_snapshot_on_creation`
**Table:** events
**Action:** BEFORE INSERT
**Logic:**
- Snapshot current pricing into pricing_snapshot jsonb on event creation
- Set pricing_snapshot = jsonb_build_object('quoted_price_cents', quoted_price_cents, 'pricing_model', pricing_model, 'deposit_amount_cents', deposit_amount_cents, 'frozen_at', now())
- Pricing snapshot is IMMUTABLE after event creation (since event only exists after quote acceptance)

### 4. `log_event_state_transition`
**Table:** events
**Action:** AFTER UPDATE on status column
**Logic:**
- Insert into event_state_transitions (event_id, tenant_id, from_status, to_status, transitioned_at, transitioned_by)

### 5. `validate_quote_state_transition`
**Table:** quotes
**Action:** BEFORE UPDATE on status column
**Logic:**
- Check if OLD.status → NEW.status is a valid transition (see quote_status enum transitions)
- Raise exception if invalid transition attempted

### 6. `freeze_quote_snapshot_on_acceptance`
**Table:** quotes
**Action:** BEFORE UPDATE when status changes to 'accepted'
**Logic:**
- Snapshot current pricing into pricing_snapshot jsonb
- Set snapshot_frozen = true
- Make pricing_snapshot IMMUTABLE

### 7. `prevent_quote_mutation_after_acceptance`
**Table:** quotes
**Action:** BEFORE UPDATE
**Logic:**
- If snapshot_frozen = true, raise exception on any UPDATE except status transitions
- Prevents changing pricing after acceptance

### 8. `log_quote_state_transition`
**Table:** quotes
**Action:** AFTER UPDATE on status column
**Logic:**
- Insert into quote_state_transitions (quote_id, tenant_id, from_status, to_status, transitioned_at, transitioned_by)

### 9. `prevent_ledger_mutation`
**Table:** ledger_entries
**Action:** BEFORE UPDATE or DELETE
**Logic:**
- Raise exception: "Ledger entries are immutable. Only INSERT allowed."
- Enforce append-only ledger

### 10. `prevent_event_transition_mutation`
**Table:** event_state_transitions
**Action:** BEFORE UPDATE or DELETE
**Logic:**
- Raise exception: "State transitions are immutable audit records."

### 11. `prevent_quote_transition_mutation`
**Table:** quote_state_transitions
**Action:** BEFORE UPDATE or DELETE
**Logic:**
- Raise exception: "State transitions are immutable audit records."

### 12. `update_client_lifetime_value_on_ledger_insert`
**Table:** ledger_entries
**Action:** AFTER INSERT
**Logic:**
- Recompute client.lifetime_value_cents = SUM(amount_cents) from ledger_entries where client_id = NEW.client_id AND is_refund = false
- Recompute client.total_payments_received_cents = SUM(amount_cents) from ledger_entries where client_id = NEW.client_id
- Update client record

### 13. `update_event_payment_status_on_ledger_insert`
**Table:** ledger_entries
**Action:** AFTER INSERT where event_id IS NOT NULL
**Logic:**
- Compute total_paid = SUM(amount_cents) from ledger_entries where event_id = NEW.event_id AND is_refund = false
- Compute quoted = events.quoted_price_cents where id = NEW.event_id
- Update events.payment_status:
  - If total_paid = 0 → 'unpaid'
  - If total_paid > 0 AND total_paid < deposit_amount_cents → 'deposit_paid'
  - If total_paid >= deposit_amount_cents AND total_paid < quoted → 'partial'
  - If total_paid >= quoted → 'paid'
  - If any refund exists → 'refunded' (partial refund state may need refinement)

### 14. `update_client_stats_on_event_completion`
**Table:** events
**Action:** AFTER UPDATE when status changes to 'completed'
**Logic:**
- Increment client.total_events_count
- Set client.last_event_date = NEW.event_date
- If first event: set client.first_event_date = NEW.event_date

### 15. `mark_event_aar_filed_on_insert`
**Table:** after_action_reviews
**Action:** AFTER INSERT
**Logic:**
- Update events set aar_filed = true where id = NEW.event_id

### 16. `log_to_audit_log` (multiple tables)
**Tables:** events, quotes, ledger_entries, expenses, after_action_reviews, event_state_transitions, quote_state_transitions
**Action:** AFTER INSERT/UPDATE/DELETE (except where DELETE is prevented)
**Logic:**
- Insert into audit_log (table_name, record_id, action, old_data, new_data, changed_by, changed_at)

---

## RLS POLICIES

All tables follow the same tenant isolation pattern established in Layer 1 and Layer 2 using the `get_current_user_role()` and `get_current_tenant_id()` helper functions.

### General Pattern (applied to all Layer 3 tables)

**Policy Name:** `tenant_isolation_select`
**Action:** SELECT
**Using:** `tenant_id = get_current_tenant_id()`

**Policy Name:** `tenant_isolation_insert`
**Action:** INSERT
**With Check:** `tenant_id = get_current_tenant_id()`

**Policy Name:** `tenant_isolation_update`
**Action:** UPDATE
**Using:** `tenant_id = get_current_tenant_id()`
**With Check:** `tenant_id = get_current_tenant_id()`

### Specific Tables with RLS

1. **events** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, records are never hard-deleted)
2. **event_state_transitions** — tenant isolation via tenant_id, SELECT/INSERT only (no UPDATE/DELETE)
3. **quotes** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, records are never hard-deleted)
4. **quote_state_transitions** — tenant isolation via tenant_id, SELECT/INSERT only (no UPDATE/DELETE)
5. **ledger_entries** — tenant isolation via tenant_id, SELECT/INSERT only (no UPDATE/DELETE, append-only ledger)
6. **expenses** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, records are never hard-deleted)
7. **after_action_reviews** — tenant isolation via tenant_id, SELECT/INSERT/UPDATE only (no DELETE, records are never hard-deleted)

**IMPORTANT:** No DELETE policies exist for events, ledger_entries, expenses, or after_action_reviews. These records are never hard-deleted. Use soft-delete patterns (archived flags, cancelled status) instead.

### Client Portal Policies (for ledger_entries only)

**Policy Name:** `client_can_view_own_ledger_entries`
**Action:** SELECT
**Using:**
```sql
get_current_user_role() = 'client' AND client_id IN (
  SELECT client_id FROM user_roles WHERE user_id = auth.uid()
)
```

---

## VIEWS (for derived metrics)

### 1. `event_financial_summary`
Per-event financial summary (revenue, expenses, profit, margin).

**Columns:**
- event_id
- tenant_id
- quoted_price_cents
- total_paid_cents (SUM from ledger_entries)
- total_refunded_cents (SUM from ledger_entries where is_refund = true)
- net_revenue_cents (total_paid - total_refunded)
- total_expenses_cents (SUM from expenses)
- tip_amount_cents (from events table OR SUM from ledger_entries where entry_type = 'tip')
- profit_cents (net_revenue - total_expenses)
- profit_margin (profit / net_revenue)
- food_cost_percentage (total_expenses / net_revenue) — rough approximation, refined in Layer 4
- outstanding_balance_cents (quoted - total_paid)
- payment_status (from events table)

### 2. `event_time_summary`
Per-event time tracking summary.

**Columns:**
- event_id
- tenant_id
- shopping_duration_minutes
- prep_duration_minutes
- travel_duration_minutes
- service_duration_minutes
- reset_duration_minutes
- total_time_minutes
- total_time_hours
- effective_hourly_rate (profit_cents / total_time_hours)

### 3. `client_financial_summary`
Per-client lifetime financial summary.

**Columns:**
- client_id
- tenant_id
- lifetime_value_cents (SUM from ledger_entries)
- total_events_count (from clients table)
- total_events_completed (COUNT from events where status = completed)
- total_events_cancelled (COUNT from events where status = cancelled)
- average_spend_per_event (lifetime_value / total_events_completed)
- total_tips_given_cents (SUM from ledger_entries where entry_type = 'tip')
- average_tip_percentage (total_tips / lifetime_value)
- outstanding_balance_cents (SUM from events where payment_status != 'paid')
- last_event_date (from clients table)
- first_event_date (from clients table)
- days_since_last_event
- is_dormant (days_since_last_event > 180)

---

## HELPER FUNCTIONS

### 1. `compute_event_payment_status(event_id UUID)`
Returns payment_status enum based on ledger_entries SUM.

### 2. `compute_event_profit_margin(event_id UUID)`
Returns profit_margin decimal based on ledger_entries and expenses.

### 3. `compute_client_lifetime_value(client_id UUID)`
Returns lifetime_value_cents based on ledger_entries SUM.

### 4. `get_preparable_actions(tenant_id UUID)`
Returns list of preparable actions based on current event states, confirmed facts, and blocking dependencies.
(Full logic to be defined in separate document — this is the Preparable Work Engine)

---

## DATA INTEGRITY RULES

### Immutability Enforcement
1. **ledger_entries** — NO UPDATE, NO DELETE (trigger enforced)
2. **event_state_transitions** — NO UPDATE, NO DELETE (trigger enforced)
3. **quote_state_transitions** — NO UPDATE, NO DELETE (trigger enforced)
4. **events.pricing_snapshot** — IMMUTABLE after event creation (trigger enforced)
5. **quotes.pricing_snapshot** — IMMUTABLE after status = 'accepted' (trigger enforced)
6. **events.allergies** — IMMUTABLE after event creation (to prevent accidental changes to safety-critical data)

### State Machine Enforcement
1. **events.status** — only valid transitions allowed (trigger enforced)
2. **quotes.status** — only valid transitions allowed (trigger enforced)

### Financial Reconciliation
1. **events.payment_status** — auto-computed from ledger_entries SUM (trigger maintained)
2. **client.lifetime_value_cents** — auto-computed from ledger_entries SUM (trigger maintained)
3. **Outstanding balances** — always derived, never stored

---

## MIGRATION DEPENDENCIES

Layer 3 depends on:
- Layer 1: profiles, user_roles, auth schema
- Layer 2: inquiries, clients, messages

Layer 3 adds FK constraints back to Layer 2:
- inquiries.converted_to_event_id → events.id
- messages.event_id → events.id

---

## VALIDATION AGAINST STATISTICS INVENTORY

This schema captures ALL raw data points from the statistics inventory for:
- ✅ Event entity (62 raw fields) — all captured
- ✅ Payment entity (14 raw fields) — all captured in ledger_entries
- ✅ Expense entity (14 raw fields) — all captured
- ✅ Quote entity (implied in master document) — fully defined here
- ✅ After Action Review entity (implied in Part 15) — fully defined here

All derived calculations, cross-entity aggregations, and time-series insights listed in the statistics inventory can be computed from these raw data points.

---

## NEXT STEPS (NOT in Layer 3)

**Layer 4: Menus, Recipes, Ingredients, Costing**
- menus table
- dishes table (courses)
- components table
- recipes table
- recipe_ingredients table (junction)
- ingredients table
- ingredient_prices table (time-series pricing)

**Layer 5: Planning & Production Documents**
- grocery_lists table
- grocery_list_items table
- prep_lists table
- prep_list_items table
- equipment_lists table
- packing_lists table
- timelines table
- execution_sheets table

**Layer 6: Loyalty & Referrals**
- loyalty_points_ledger table (append-only like ledger_entries)
- loyalty_rewards table
- referrals table

---

## END OF PROPOSAL

This is the complete schema for Layer 3. Ready for SQL implementation once approved.
