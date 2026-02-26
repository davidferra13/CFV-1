# Statistics Inventory - Implementation Reflection

**Created:** February 15, 2026
**Related Files:**

- [STATISTICS_INVENTORY.md](./STATISTICS_INVENTORY.md)
- [chefflow-master-document (1).md](<../chefflow-master-document%20(1).md>)

---

## What Was Created

A comprehensive measurement system inventory that defines every raw data point, derived calculation, aggregation, and time-series metric ChefFlow must track. This document serves as the canonical requirements specification for database schema design.

## Why This Was Needed

Before building database tables, we need to know **what to measure** - not just what features to build. The master document describes workflows and pain points, but doesn't explicitly enumerate the hundreds of data points and calculations needed to support those workflows.

This inventory bridges that gap by extracting measurement requirements from:

- Observed workflows (Feb 14, 2026 dinner service)
- Lifecycle stages (18-stage, 137-action model)
- Document types (33 document types across 7 layers)
- Business requirements (revenue tracking, client retention, stress reduction)
- Post-event retrospectives (After Action Reviews)

## What Changed

### From Narrative to Data Model

The master document tells stories: "Michel books every Valentine's Day" and "the chef forgot parchment paper."

The statistics inventory translates those into measurable fields:

- `seasonal_booking_pattern` = MODE(month of event_date) for Michel
- `items_forgotten` array in After Action Review
- `most_commonly_forgotten_items` aggregation to drive non-negotiables checklist

### From Intuition to Calculation

The master document describes desired outcomes: "Did this dinner feel calm?" and "What's my real profit margin?"

The statistics inventory defines how to measure them:

- `calm_rating` (1-5) + `preparation_rating` (1-5) + `forgot_items` boolean
- `gross_margin_percentage` = (gross_profit / total_revenue) \* 100
- `effective_hourly_rate` = net_profit / (total_time_invested_minutes / 60)

### From Scattered Observations to Systematic Tracking

The Feb 14 observation captured: "$220 groceries (mixed business/personal), cognac receipt on phone, amount unknown"

The statistics inventory defines the system to prevent this:

- `grocery_actual_spend` (in cents)
- `additional_expenses` array with `expense_type` (liquor, specialty, etc.)
- `is_business_expense` boolean for separation
- `receipt_photo_url` for every expense
- `card_used` for cash-back optimization tracking

## Key Architectural Decisions Captured

### 1. Ledger-First Financial Model

Not "payment received: $500" (overwritable).
Instead: append-only ledger entries:

- deposit: +$200
- final_payment: +$200
- tip: +$100
- **Computed balance:** $500

This enables:

- Full audit trail (immutable history)
- Refund tracking (negative entries)
- Financial closure verification
- Time-series revenue analysis without fear of data loss

### 2. Event Lifecycle as State Machine

Every event status transition must be timestamped:

- `status_history` array: [{status: 'accepted', timestamp, changed_by}]
- Derived metrics: `days_from_inquiry_to_booking`, `lead_time_days`
- Analytics: conversion velocity, bottleneck identification

### 3. Component-Level Tracking, Not Just Dishes

The chef thinks "steak Diane" but the system must track:

- Steak (component)
- Diane Sauce (component with recipe)
- Roasted Smashed Potatoes (component with recipe)
- Broccoli (component)
- Asparagus (component)

**Why:** Packing verification requires component counts per course. "Course 3 has 5 components → verify 5 containers in cooler."

### 4. Leftover Value Transfer Across Events

Feb 14 observation: cheese, cake, mousse carried to Feb 15 dinner.

Database must track:

- `leftover_value_carried_forward` (from event A to event B)
- `leftover_value_received` (event B receives from event A)
- `adjusted_food_cost` = actual spend - leftover_received

**Impact:** True food cost percentage becomes accurate across multi-event views.

### 5. Time Tracking at Phase Level

Not just "event took 8 hours."
Instead:

- `shopping_time_minutes`
- `prep_time_minutes`
- `travel_time_minutes`
- `service_time_minutes`
- `cleanup_time_minutes`
- `reset_time_minutes`
- **Computed:** `total_time_invested_minutes`, `effective_hourly_rate`

**Why:** Chef needs to see where time actually goes, not just total time.

### 6. After Action Review as First-Class Entity

Not optional post-event notes.
Instead: required fields for terminal state:

- `calm_rating` (1-5)
- `preparation_rating` (1-5)
- `items_forgotten` array
- `could_have_been_done_earlier` array
- `what_went_well`, `what_went_wrong`

**Why:** Stress reduction is the real KPI. Must be measurable to be improvable.

### 7. Recipe Bible Builds From Real Events

Not a cookbook written upfront.
Instead:

- `source_event_id` (where recipe was first captured)
- `times_used` (reuse tracking)
- `last_used_at` (recency)
- `client_feedback_rating` (performance)
- **Computed:** `is_signature_dish` (times_used > 10 AND rating >= 4.5)

**Why:** Recipe library grows organically from actual dinners, not from sitting down to write recipes.

### 8. Client Relationship Intelligence

Not CRM fields for "last contact."
Instead:

- `seasonal_booking_pattern` (Michel always books February)
- `personal_milestones` (birthdays, anniversaries - timestamped)
- `relationship_vibe` (free text notes)
- `tipping_pattern` (generous, standard, none)
- `regular_guests` array (Evan and Lindsay always attend)
- **Computed:** `days_since_last_event`, `rebooking_frequency_days`

**Why:** Repeat bookings should feel like the chef remembers everything, because the system does.

### 9. Forgotten Items Drive Non-Negotiables

Not static checklist.
Instead:

- Every packing list has `equipment_item.was_forgotten` boolean
- **Aggregation:** `most_forgotten_items` = GROUP BY item_name WHERE was_forgotten = TRUE, COUNT
- Non-negotiables checklist auto-updates based on actual forget frequency

**Why:** "Always forget parchment paper" becomes data, not just frustration.

### 10. Progressive Document Unlocking

Documents don't exist until prerequisites confirm:

- Menu locked → `grocery_list_ready_at` timestamp unlocks
- Guest count confirmed → grocery quantities can be calculated
- Deposit received → event becomes real, execution planning unlocks

**Database impact:** Timestamp tracking for every document readiness gate.

## What This Enables (Database Schema Design)

### Tables Needed (Preliminary List)

- `clients` (with household, preferences, site_notes as JSONB)
- `events` (with status_history, course_breakdown as JSONB)
- `menus` (with courses as JSONB or separate `menu_courses` table)
- `components` (normalized many-to-many: menu_courses ↔ components ↔ recipes)
- `recipes` (with ingredients as JSONB or separate `recipe_ingredients` table)
- `ledger_entries` (append-only, immutable via trigger)
- `expenses` (linked to events, with line_items as JSONB)
- `inquiries` (with blocking_questions, status_history as JSONB)
- `messages` (polymorphic: event_id OR inquiry_id)
- `grocery_lists` (with items as JSONB or separate `grocery_items` table)
- `packing_lists` (with items as JSONB or separate `packing_items` table)
- `timelines` (one per event, with route_stops as JSONB)
- `after_action_reviews` (one per event, required for terminal state)
- `loyalty_rewards` (client-scoped, with expiry tracking)

### Views/Functions Needed

- `client_lifetime_metrics` (view: aggregates revenue, events, tips per client)
- `event_financial_summary` (view: computes balances from ledger entries)
- `monthly_revenue_summary` (view: revenue vs $10K target)
- `forgotten_items_frequency` (view: top forgotten items across all events)
- `recipe_signature_dishes` (view: times_used > 10 AND rating >= 4.5)
- `preparable_actions` (function: GET_PREPARABLE_ACTIONS(current_state))

### Indexes Needed

- `events.chef_id, events.event_date` (time-series queries)
- `events.client_id` (client event history)
- `ledger_entries.event_id, ledger_entries.created_at` (ledger append order)
- `inquiries.chef_id, inquiries.status` (pipeline views)
- `recipes.chef_id, recipes.times_used DESC` (most-used recipes)
- `clients.chef_id, clients.status` (active clients)

### Triggers Needed

- `ledger_entries` INSERT-only trigger (prevent UPDATE/DELETE)
- `event_transitions` audit log trigger (log all status changes)
- `client.loyalty_tier` auto-update trigger (when total_guests changes)
- `menu.locked_at` trigger → cascade to `event.grocery_list_ready_at`

### JSONB vs Normalized Tables

**Use JSONB for:**

- `status_history` (append-only arrays, not queried frequently)
- `dietary_restrictions`, `allergies`, `allergen_flags` (arrays)
- `household.children_names`, `regular_guests` (small arrays)
- `blocking_questions`, `items_forgotten` (event-specific lists)

**Use normalized tables for:**

- Recipes ↔ Ingredients (need to query ingredient costs, update prices)
- Menus ↔ Components (need component-level aggregations)
- Clients ↔ Events (one-to-many, heavily queried)

## Metrics That Matter Most (Top 10)

From the 670+ measurements defined, these are the most critical:

1. **Calm rating trend** (last 10 events) - primary KPI
2. **Revenue this month vs $10K target** - financial survival
3. **Conversion rate (inquiry → booking)** - pipeline health
4. **Effective hourly rate** - profitability reality check
5. **Food cost percentage** - margin protection
6. **Repeat client percentage** - business sustainability
7. **Most commonly forgotten items** - stress reduction feedback loop
8. **Days from menu locked to event** - preparation window visibility
9. **Terminal state percentage** - operational completeness
10. **Recipe coverage rate** - system maturity

## What This Changes About Schema Design

### Before This Inventory

Schema design would have started with entities: "We need a clients table, events table, payments table..."

### After This Inventory

Schema design starts with **measurements**: "We need to calculate `effective_hourly_rate`, which requires `total_time_invested_minutes` across 6 phases and `net_profit` from ledger entries minus expenses..."

**Result:** The schema will be designed to make queries efficient, not just to store data.

## Next Steps

1. **Database Schema Design** - Create migration files with:
   - Table definitions (with comments explaining which metrics they support)
   - Indexes (optimized for the most frequent aggregations)
   - Views (pre-computed aggregations for dashboard queries)
   - Functions (complex calculations like preparable_actions)
   - Triggers (immutability, audit logging, auto-calculations)

2. **Type Generation** - Generate TypeScript types from schema:
   - Raw table types
   - View types (computed fields)
   - Function return types
   - Ledger entry discriminated unions (deposit | tip | refund)

3. **Dashboard Query Planning** - Map each dashboard metric to:
   - Direct table query
   - View query
   - Function call
   - Application-layer aggregation

4. **Testing Strategy** - Verify:
   - Ledger immutability (cannot UPDATE/DELETE)
   - Status transition audit logs (every change captured)
   - Computed metrics accuracy (test cases from Feb 14 observation)
   - Multi-tenant isolation (chef A cannot see chef B's data)

## Alignment with System Laws

This inventory upholds ChefFlow's core principles:

✅ **Truth-based workflow** - Every metric derived from confirmed facts (timestamps, ledger entries)
✅ **Ledger-first financial model** - Append-only, immutable, auditable
✅ **Stress reduction measurable** - Calm rating, preparation rating, forgotten items tracked
✅ **Progressive preparation visible** - Document readiness timestamps unlock next actions
✅ **Multi-tenant from day one** - Every table scoped by chef_id
✅ **No silent overwrites** - Status changes logged, ledger immutable
✅ **Recipe bible builds over time** - source_event_id, times_used, organic growth

---

**This document serves as the bridge between narrative requirements (master document) and technical implementation (database schema).**
