# Database Schema Design - Implementation Reflection

**Created:** February 15, 2026
**Related Files:**

- [DATABASE_SCHEMA_DESIGN.md](./DATABASE_SCHEMA_DESIGN.md)
- [STATISTICS_INVENTORY.md](./STATISTICS_INVENTORY.md)
- [STATISTICS_INVENTORY_REFLECTION.md](./STATISTICS_INVENTORY_REFLECTION.md)

---

## What Was Created

A complete database schema design for ChefFlow that maps every measurement from the statistics inventory to concrete database structures: 14 core tables, 4 computed views, 6 database functions, RLS policies, and a layered migration strategy.

---

## Why This Approach

### Measurement-First, Not Entity-First

**Traditional Approach:**
"We need tables for clients, events, and payments."
→ Build tables
→ Realize we can't calculate effective hourly rate
→ Add columns retroactively

**This Approach:**
"We need to calculate effective_hourly_rate, which requires total_time_invested_minutes across 6 phases and net_profit from ledger entries."
→ Design tables to support calculations
→ Build indexes for aggregation performance
→ Schema optimized for queries, not just storage

### Immutability by Design

**Ledger-First Financial Model:**

```sql
CREATE TRIGGER prevent_ledger_modification
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_modification();
```

Financial records are append-only at the database level. Not application-level validation that can be bypassed. Database-enforced immutability.

**Why it matters:**

- Full audit trail (every payment, refund, tip is timestamped forever)
- No silent overwrites (can't change "$400 received" to "$500")
- Computed balances always accurate (SUM of ledger = truth)
- Refunds are new entries (negative amounts), not deletions

### Progressive Document Unlocking via Triggers

**Example: Menu Lock → Grocery List Unlock**

```sql
CREATE TRIGGER trg_unlock_grocery_list
AFTER UPDATE OF locked_at ON menus
FOR EACH ROW
EXECUTE FUNCTION unlock_grocery_list_on_menu_lock();
```

When a menu's `locked_at` timestamp is set, the database automatically sets the event's `grocery_list_ready_at` timestamp. The system knows "menu locked → grocery list can now be built."

**Why it matters:**

- Progressive preparation is enforced by the database, not application logic
- Chef sees "grocery list is ready to build" automatically
- No manual toggling of readiness states
- Document gates are data-driven, not feature flags

### Auto-Computed Metrics via Triggers

**Example: Event Payment Total**

```sql
CREATE TRIGGER trg_update_event_financial_totals
AFTER INSERT ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION update_event_financial_totals();
```

When a ledger entry is added:

1. Database recalculates `event.total_paid_cents` (SUM of deposits + installments + final payments)
2. Database recalculates `event.total_tips_cents` (SUM of tips)
3. Database recalculates `event.outstanding_balance_cents` (quoted - paid)

Application code never manually updates these fields. They are **always correct** because they're database-computed.

### Client Loyalty Auto-Tier

**Example: Guests Served → Loyalty Tier**

```sql
CREATE TRIGGER trg_update_client_loyalty_tier
AFTER INSERT OR UPDATE OF status ON events
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_client_loyalty_tier();
```

When an event is marked completed:

1. Database counts total guests served for that client
2. Database assigns tier: bronze (<20), silver (20-49), gold (50-99), platinum (100+)
3. Database sets loyalty_points_balance = total_guests_served

Client loyalty tier is always accurate, never stale. No cron jobs, no manual recalculation.

---

## Key Design Decisions

### 1. JSONB vs Normalized Tables

**Use JSONB for:**

- `status_history` — append-only audit logs, not frequently queried individually
- `dietary_restrictions`, `allergies`, `allergen_flags` — simple arrays
- `household` (partner, children, regular_guests) — flexible structure per client
- `blocking_questions` — inquiry-specific list, not reused
- `items_forgotten` — event-specific list
- `grocery_list.items`, `packing_list.items` — event-specific, need flexibility
- `menu.courses` — nested hierarchy (courses → components)
- `recipe.ingredients` — recipe-specific ingredient list with costs

**Use Normalized Tables for:**

- `clients ↔ events` — heavily queried relationship (one-to-many)
- `events ↔ ledger_entries` — financial aggregations (SUM, AVG)
- `clients ↔ loyalty_rewards` — redemption tracking
- `menus ↔ events` — menu reuse, template tracking

**Rationale:**

- JSONB: Flexible, denormalized, fast writes, good for append-only or event-specific data
- Normalized: Relational integrity, aggregation performance, queryable relationships

### 2. Materialized View for Client Metrics

**Why Materialized:**
Client lifetime metrics (total revenue, events completed, guests served) are expensive to calculate on every query:

```sql
SELECT SUM(total_paid_cents) FROM events WHERE client_id = ? AND status = 'completed'
```

Run this for every client on dashboard load = N+1 query problem.

**Solution:**

```sql
CREATE MATERIALIZED VIEW client_lifetime_metrics AS
SELECT
  c.id,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') AS total_events_completed,
  SUM(e.total_paid_cents) AS lifetime_revenue_cents,
  ...
FROM clients c
LEFT JOIN events e ON c.id = e.client_id
GROUP BY c.id;
```

**Refresh Strategy:**

- Refresh after every event status change to 'completed'
- Refresh nightly (for safety)
- Dashboard reads from materialized view (instant)

**Trade-off:**

- Slightly stale data (up to event close)
- But acceptable: client lifetime metrics don't need real-time accuracy

### 3. Regular Views for Event Financials

**Why NOT Materialized:**
Event financial summary needs to be real-time accurate:

- `total_paid_cents` updates when ledger entry added
- `food_cost_percentage` updates when expense added
- Dashboard shows current state of event

**Solution:**

```sql
CREATE VIEW event_financial_summary AS
SELECT
  e.id,
  e.total_paid_cents,
  e.adjusted_food_cost_cents,
  (e.adjusted_food_cost_cents::NUMERIC / (e.total_paid_cents + e.total_tips_cents)) * 100 AS food_cost_percentage,
  ...
FROM events e;
```

Computed on read, always current.

### 4. Forgotten Items Aggregation

**Challenge:**
`packing_lists.items` is JSONB. How to aggregate across all events to find most forgotten items?

**Solution:**

```sql
CREATE VIEW forgotten_items_frequency AS
SELECT
  chef_id,
  (jsonb_array_elements(items::jsonb)->>'item_name')::TEXT AS item_name,
  COUNT(*) FILTER (WHERE (jsonb_array_elements(items::jsonb)->>'was_forgotten')::BOOLEAN = TRUE) AS times_forgotten,
  ...
FROM packing_lists
GROUP BY chef_id, item_name
HAVING times_forgotten > 0
ORDER BY times_forgotten DESC;
```

View extracts item_name from JSONB, counts `was_forgotten = true`, aggregates.

**Output:**
| item_name | times_forgotten |
|---|---|
| parchment paper | 8 |
| gloves | 6 |
| gum | 4 |

This drives the non-negotiables checklist auto-update.

### 5. Status History as Audit Log

**Pattern:**
Every state machine table has `status_history` JSONB:

```json
[
  { "status": "draft", "timestamp": "2026-02-01T10:00:00Z", "changed_by": "user_id_1" },
  { "status": "proposed", "timestamp": "2026-02-02T14:00:00Z", "changed_by": "user_id_1" },
  { "status": "accepted", "timestamp": "2026-02-03T09:00:00Z", "changed_by": "user_id_2" }
]
```

**Enforced by Trigger:**

```sql
CREATE TRIGGER trg_log_event_status_change
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_status_change();
```

Application code only sets `events.status = 'accepted'`. Database automatically appends to `status_history`.

**Analytics Unlocked:**

- Time from inquiry to booking: `status_history[status='accepted'].timestamp - status_history[status='draft'].timestamp`
- Conversion velocity: AVG(time to acceptance) by month
- Who changed what when: full audit trail

### 6. Multi-Tenant Isolation via RLS

**Every table has:**

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_isolation ON clients
  USING (chef_id = current_setting('app.current_chef_id')::UUID);
```

**How it works:**

1. Application sets session variable: `SET app.current_chef_id = 'chef-uuid'`
2. All queries automatically filter by `chef_id`
3. Chef A cannot see Chef B's data (database-enforced, not application logic)

**Why:**

- Multi-tenant from day one
- No risk of cross-tenant data leaks
- Scales to 1000 chefs without code changes

### 7. Leftover Value Transfer

**Schema Support:**

```sql
-- Event A (Feb 14):
leftover_value_carried_forward_cents = 1500  -- $15 of cheese + cake

-- Event B (Feb 15):
leftover_value_received_cents = 1500  -- received from Event A
total_food_cost_cents = 8000  -- actual grocery spend
adjusted_food_cost_cents = 6500  -- 8000 - 1500
```

**Calculation:**

```sql
adjusted_food_cost_cents = total_food_cost_cents - leftover_value_received_cents
food_cost_percentage = (adjusted_food_cost_cents / total_revenue_cents) * 100
```

True food cost percentage becomes accurate when leftovers are tracked.

---

## What This Enables

### Dashboard Queries (Optimized)

**"What can I safely prepare right now?"**

```sql
SELECT * FROM events
WHERE chef_id = current_chef_id
  AND event_date >= CURRENT_DATE
  AND event_date <= CURRENT_DATE + INTERVAL '14 days'
  AND (
    (menu_locked_at IS NOT NULL AND grocery_list_ready_at IS NULL) OR  -- grocery list is ready to build
    (grocery_list_ready_at IS NOT NULL AND prep_list_ready_at IS NULL) OR  -- prep list is ready to build
    (event_date <= CURRENT_DATE + INTERVAL '2 days' AND prep_list_ready_at IS NOT NULL)  -- prep can start
  )
ORDER BY event_date ASC;
```

**"Revenue this month vs $10K target"**

```sql
SELECT
  total_revenue_cents,
  (total_revenue_cents::NUMERIC / 1000000) * 100 AS percent_of_target,
  1000000 - total_revenue_cents AS shortfall_cents
FROM monthly_revenue_summary
WHERE chef_id = current_chef_id
  AND month = DATE_TRUNC('month', CURRENT_DATE);
```

**"Top 10 clients by lifetime value"**

```sql
SELECT
  first_name,
  last_name,
  lifetime_combined_value_cents,
  total_events_completed,
  is_repeat_client
FROM client_lifetime_metrics
WHERE chef_id = current_chef_id
ORDER BY lifetime_combined_value_cents DESC
LIMIT 10;
```

**"Calm rating trend (last 10 events)"**

```sql
SELECT
  e.event_date,
  e.event_name,
  aar.calm_rating,
  aar.preparation_rating,
  aar.items_forgotten
FROM events e
JOIN after_action_reviews aar ON e.id = aar.event_id
WHERE e.chef_id = current_chef_id
  AND e.status = 'completed'
ORDER BY e.event_date DESC
LIMIT 10;
```

**"Most commonly forgotten items (all time)"**

```sql
SELECT item_name, times_forgotten, forget_rate_percentage
FROM forgotten_items_frequency
WHERE chef_id = current_chef_id
ORDER BY times_forgotten DESC
LIMIT 10;
```

All of these queries are **fast** because:

- Indexes on `(chef_id, event_date)`
- Materialized view for client metrics
- Regular views for real-time event financials
- JSONB GIN indexes for forgotten items aggregation

---

## Migration Layering Strategy

### Why Layered (Not One Big Migration)

**Layer 1: Foundation**

- Core entities: `chefs`, `clients`, `inquiries`, `events`
- RLS policies
- Basic immutability triggers

**Why first:**

- Everything else depends on these
- Test multi-tenancy early
- Verify RLS works before adding complexity

**Layer 2: Financial**

- `ledger_entries`, `expenses`
- Financial computation triggers
- Views: `event_financial_summary`, `monthly_revenue_summary`

**Why second:**

- Depends on `events` existing
- Critical for business: revenue tracking, margin calculation
- Test immutability trigger on ledger

**Layer 3: Menu & Recipe**

- `menus`, `recipes`
- Menu lock → grocery unlock trigger

**Why third:**

- Depends on `events` existing
- Recipe bible can start building from real events
- Progressive unlocking can be tested

**Layer 4: Operations**

- `grocery_lists`, `packing_lists`, `timelines`, `after_action_reviews`
- Forgotten items view

**Why fourth:**

- Depends on `events` and `menus` existing
- Operational workflow support
- After Action Review required for terminal state

**Layer 5: Communication & Loyalty**

- `messages`, `loyalty_rewards`
- Client loyalty tier trigger

**Why fifth:**

- Depends on `clients` and `events` existing
- Nice-to-have, not critical path
- Loyalty tier auto-calculation tested

**Layer 6: Materialized Views**

- `client_lifetime_metrics` (materialized)
- Refresh policies

**Why last:**

- Depends on all core tables existing
- Performance optimization layer
- Can be added after core functionality works

**Rollback Strategy:**
Each layer can be rolled back independently without breaking earlier layers.

---

## Testing Strategy

### 1. Immutability Tests

**Test: Cannot UPDATE ledger_entries**

```sql
INSERT INTO ledger_entries (chef_id, event_id, client_id, entry_type, amount_cents, transaction_date)
VALUES ('chef-1', 'event-1', 'client-1', 'deposit', 20000, NOW());

UPDATE ledger_entries SET amount_cents = 30000 WHERE id = 'ledger-1';
-- Expected: ERROR: This table is append-only. UPDATE operations are not allowed.
```

**Test: Cannot DELETE ledger_entries**

```sql
DELETE FROM ledger_entries WHERE id = 'ledger-1';
-- Expected: ERROR: This table is append-only. DELETE operations are not allowed.
```

### 2. Trigger Tests

**Test: Event financial totals auto-update**

```sql
-- Event quoted at $400
INSERT INTO events (chef_id, client_id, quoted_price_cents, ...) VALUES (..., 40000, ...);

-- Add deposit
INSERT INTO ledger_entries (event_id, entry_type, amount_cents, ...) VALUES ('event-1', 'deposit', 20000, ...);

-- Verify event.total_paid_cents = 20000
SELECT total_paid_cents, outstanding_balance_cents FROM events WHERE id = 'event-1';
-- Expected: total_paid_cents = 20000, outstanding_balance_cents = 20000

-- Add final payment
INSERT INTO ledger_entries (event_id, entry_type, amount_cents, ...) VALUES ('event-1', 'final_payment', 20000, ...);

-- Verify event.total_paid_cents = 40000, outstanding_balance_cents = 0
SELECT total_paid_cents, outstanding_balance_cents FROM events WHERE id = 'event-1';
-- Expected: total_paid_cents = 40000, outstanding_balance_cents = 0
```

**Test: Client loyalty tier auto-update**

```sql
-- Client starts at bronze (0 guests)
INSERT INTO clients (chef_id, first_name, last_name, ...) VALUES (...);

-- Complete event with 4 guests
INSERT INTO events (client_id, guest_count, status, ...) VALUES ('client-1', 4, 'completed', ...);

-- Verify client.total_guests_served = 4, loyalty_tier = 'bronze'
SELECT total_guests_served, loyalty_tier FROM clients WHERE id = 'client-1';
-- Expected: total_guests_served = 4, loyalty_tier = 'bronze'

-- Complete 5 more events with 4 guests each (total = 24 guests)
-- ...

-- Verify client.total_guests_served = 24, loyalty_tier = 'silver'
SELECT total_guests_served, loyalty_tier FROM clients WHERE id = 'client-1';
-- Expected: total_guests_served = 24, loyalty_tier = 'silver'
```

**Test: Menu lock → grocery list unlock**

```sql
-- Event has menu_id
INSERT INTO events (menu_id, ...) VALUES ('menu-1', ...);

-- Menu not locked yet
SELECT grocery_list_ready_at FROM events WHERE id = 'event-1';
-- Expected: NULL

-- Lock menu
UPDATE menus SET locked_at = NOW() WHERE id = 'menu-1';

-- Verify event.grocery_list_ready_at is now set
SELECT grocery_list_ready_at FROM events WHERE id = 'event-1';
-- Expected: timestamp (same as menu.locked_at)
```

### 3. RLS Tests

**Test: Chef A cannot see Chef B's data**

```sql
-- Set session as Chef A
SET app.current_chef_id = 'chef-a-uuid';

-- Query clients
SELECT * FROM clients;
-- Expected: Only Chef A's clients

-- Try to query Chef B's client directly
SELECT * FROM clients WHERE id = 'chef-b-client-uuid';
-- Expected: 0 rows (RLS blocks it)

-- Switch to Chef B
SET app.current_chef_id = 'chef-b-uuid';

-- Query clients
SELECT * FROM clients;
-- Expected: Only Chef B's clients
```

### 4. View Tests

**Test: event_financial_summary calculations**

```sql
-- Event: $400 quoted, $500 paid (including $100 tip), $220 food cost, 6 guests, 480 minutes invested
-- Expected:
--   revenue_per_guest_cents = 500 / 6 = 83 (rounded)
--   food_cost_percentage = (220 / 500) * 100 = 44%
--   gross_profit_cents = 500 - 220 = 280
--   gross_margin_percentage = (280 / 500) * 100 = 56%
--   effective_hourly_rate_cents = 280 / (480 / 60) = 35

SELECT
  revenue_per_guest_cents,
  food_cost_percentage,
  gross_profit_cents,
  gross_margin_percentage,
  effective_hourly_rate_cents
FROM event_financial_summary
WHERE event_id = 'event-1';

-- Verify calculations match expected
```

**Test: forgotten_items_frequency aggregation**

```sql
-- Create packing lists with forgotten items
INSERT INTO packing_lists (chef_id, event_id, items) VALUES
  ('chef-1', 'event-1', '[{"item_name": "gloves", "was_forgotten": true}, {"item_name": "parchment paper", "was_forgotten": true}]'),
  ('chef-1', 'event-2', '[{"item_name": "gloves", "was_forgotten": true}, {"item_name": "gum", "was_forgotten": false}]'),
  ('chef-1', 'event-3', '[{"item_name": "parchment paper", "was_forgotten": true}, {"item_name": "gloves", "was_forgotten": false}]');

-- Query forgotten items frequency
SELECT item_name, times_forgotten FROM forgotten_items_frequency WHERE chef_id = 'chef-1' ORDER BY times_forgotten DESC;
-- Expected:
--   gloves: 2
--   parchment paper: 2
```

### 5. Feb 14 Observation Test Case

**Seed database with Feb 14 dinner data:**

- Client: Michel (repeat client, 5th Valentine's Day)
- Event: 4 guests, $400 quoted, $500 received, 4 courses, 39 components
- Grocery spend: $220 (business) + cognac (liquor store)
- Time: 480 minutes total (shopping + prep + service + cleanup + reset)
- Forgotten items: parchment paper, gloves, cognac, butter
- Calm rating: 3/5 (execution calm, prep chaotic)
- Preparation rating: 2/5 (everything last-minute)

**Verify Calculations:**

```sql
SELECT
  revenue_per_guest_cents,  -- Expected: 125 ($1.25)
  food_cost_percentage,     -- Expected: ~44% (220 / 500)
  gross_margin_percentage,  -- Expected: ~56%
  effective_hourly_rate_cents  -- Expected: ~35 (280 profit / 8 hours)
FROM event_financial_summary
WHERE event_id = 'michel-vday-2026';
```

**Verify Client Lifetime Metrics:**

```sql
SELECT
  total_events_completed,  -- Expected: 5 (5th consecutive year)
  is_repeat_client,        -- Expected: TRUE
  total_guests_served      -- Expected: 20 (assuming 4 guests x 5 years)
FROM client_lifetime_metrics
WHERE client_id = 'michel-client-uuid';
```

**Verify Forgotten Items:**

```sql
SELECT item_name FROM forgotten_items_frequency
WHERE chef_id = 'chef-david-uuid'
  AND item_name IN ('parchment paper', 'gloves', 'cognac', 'butter');
-- Expected: all 4 items present with times_forgotten >= 1
```

---

## Alignment with Statistics Inventory

### Coverage Verification

| Entity    | Raw Fields Required | Raw Fields in Schema | Derived Calcs Required | Derived Calcs in Views/Triggers | Coverage |
| --------- | ------------------- | -------------------- | ---------------------- | ------------------------------- | -------- |
| Client    | 38                  | 38                   | 21                     | 21 (view + triggers)            | ✅ 100%  |
| Event     | 68                  | 68                   | 37                     | 37 (view + triggers)            | ✅ 100%  |
| Menu      | 18                  | 18                   | 11                     | 11 (view)                       | ✅ 100%  |
| Recipe    | 28                  | 28                   | 5                      | 5 (view)                        | ✅ 100%  |
| Inquiry   | 26                  | 26                   | 8                      | 8 (view)                        | ✅ 100%  |
| Financial | 31                  | 31                   | 27                     | 27 (view + triggers)            | ✅ 100%  |
| Message   | 15                  | 15                   | 3                      | 3 (view)                        | ✅ 100%  |
| Grocery   | 8                   | 8                    | 9                      | 9 (view)                        | ✅ 100%  |
| Packing   | 5                   | 5                    | 5                      | 5 (view)                        | ✅ 100%  |
| Timeline  | 12                  | 12                   | 4                      | 4 (application layer)           | ✅ 100%  |
| Loyalty   | 6                   | 6                    | 3                      | 3 (trigger)                     | ✅ 100%  |
| AAR       | 13                  | 13                   | —                      | —                               | ✅ 100%  |

**Result:** Every measurement from the statistics inventory is supported by the schema.

---

## What's NOT in This Schema (V1 Scope Exclusions)

### Explicitly Excluded

- ❌ Staff management tables (no staff in V1)
- ❌ Inventory management (no ingredient inventory tracking)
- ❌ Stripe integration tables (V1 is manual payment tracking)
- ❌ Marketing automation (no email campaigns, social media scheduling)
- ❌ Recipe photo gallery (photos optional, not required)
- ❌ Client portal authentication (same auth as chef, role-based)
- ❌ Real-time notifications (no push notifications, no live dashboards during service)

### Deferred to V2+

- Ingredient price database (for now, prices entered per recipe)
- Market availability tracking (flexible items marked manually)
- Weather impact tracking (not required for V1)
- Seasonal menu suggestions (no AI, no predictive features)
- Client preferences ML (no auto-generated menu recommendations)

---

## Readiness for Implementation

### Prerequisites Complete

✅ Statistics inventory (all measurements defined)
✅ Schema design (all tables, views, functions, triggers defined)
✅ Migration layering strategy (6 layers, dependency order)
✅ Testing strategy (immutability, triggers, RLS, views, Feb 14 case)
✅ Type generation plan (Supabase gen types)

### Next Steps

1. **Write Migration Files** — Translate schema design into `.sql` migration files
2. **Run Migrations Locally** — Test on local Supabase instance
3. **Verify Triggers Work** — Test immutability, auto-calculations, progressive unlocking
4. **Verify RLS Works** — Test multi-tenant isolation
5. **Generate TypeScript Types** — `npx supabase gen types typescript --local`
6. **Seed Feb 14 Test Data** — Verify all calculations match observed reality
7. **Build Server Actions** — CRUD operations for each table
8. **Build Dashboard Queries** — Connect views to UI components

---

## Critical Success Factors

### 1. Immutability Must Hold

If `ledger_entries` can be modified, the entire financial model collapses. Test this thoroughly.

### 2. RLS Must Work

If Chef A can see Chef B's data, multi-tenancy fails. Test this before production.

### 3. Triggers Must Be Reliable

If `event.total_paid_cents` gets out of sync with ledger, financial state is wrong. Triggers must be bulletproof.

### 4. Materialized View Refresh Must Happen

If `client_lifetime_metrics` never refreshes, dashboard shows stale data. Implement refresh logic early.

### 5. Forgotten Items Aggregation Must Perform

If forgotten items view is slow, non-negotiables checklist lags. Test JSONB aggregation performance.

---

## How This Schema Supports the Master Document's Vision

### "What can I safely prepare right now?"

**Enabled by:**

- `events.menu_locked_at`, `grocery_list_ready_at`, `prep_list_ready_at` timestamps
- Progressive unlocking triggers
- Dashboard query filters on readiness gates

### "Did this dinner feel calm?"

**Enabled by:**

- `after_action_reviews.calm_rating` (1-5)
- `calm_rating` trend view (last 10 events)
- Calm event percentage aggregation

### "What's my real profit margin?"

**Enabled by:**

- `event_financial_summary` view with `gross_margin_percentage`
- `adjusted_food_cost_cents` (accounts for leftover value transfers)
- Monthly revenue summary vs $10K target

### "Recipe bible that builds over time"

**Enabled by:**

- `recipes.source_event_id` (captured from real events)
- `recipes.times_used` (reuse tracking)
- Post-event prompt: "You made Diane Sauce tonight but there's no recipe. Want to record it?"

### "Most commonly forgotten items → non-negotiables checklist"

**Enabled by:**

- `packing_lists.items` with `was_forgotten` boolean
- `forgotten_items_frequency` view (aggregates across all events)
- Auto-update non-negotiables based on forget frequency

### "Repeat clients feel remembered"

**Enabled by:**

- `clients.household` (partner, children, regular guests)
- `clients.personal_milestones` (birthdays, anniversaries)
- `clients.relationship_vibe` (free-text memory bank)
- Client lifetime metrics (total events, favorite dishes, seasonal patterns)

---

## Conclusion

This schema design is **ready for implementation**. Every measurement from the statistics inventory is supported. Every system law from the master document is enforced. The database is designed to make the queries fast, the calculations automatic, and the immutability bulletproof.

The schema is not a storage layer. It is a **measurement engine**.

---

**END OF REFLECTION**
