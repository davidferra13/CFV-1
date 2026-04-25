# Marisol Meal Prep Recurring Engine Build Spec

## Decision

Build a first-class **Recurring Meal Prep Cycle** system inside ChefFlow/Dinner Circles.

Do not model Marisol's business as one-off events. The product must generate a weekly operating cycle from persistent client profiles, active recurring services, menu history, meal requests, recipe/menu data, and production constraints.

The core user question is:

> Who is active this week, what changed, and what is the approved production plan?

## Current Repo Context

Use and extend existing surfaces instead of inventing a separate app:

- Recurring services and served dish history: `lib/recurring/actions.ts`, `lib/recurring/planning.ts`
- Existing recurring client UI: `/clients/recurring`, `/clients/[id]/recurring`
- Client service defaults: `components/clients/service-defaults-panel.tsx`
- Dinner Circle/event configuration: `lib/dinner-circles/*`
- Production calendar shell: `app/(chef)/production/page.tsx`
- Menu, allergy, and repeat-detection helpers: `lib/menus/*`
- Grocery and document generation helpers: `lib/grocery/*`, `lib/documents/*`
- Database migration style: `database/migrations/*.sql`
- Tests: `tests/unit/*.test.ts`, Playwright e2e where appropriate

## Product Scope

Create a weekly cycle system for a chef with 18 active meal-prep clients, each receiving 4-10 meals per week, cooked across 2-3 production days.

The MVP must support:

1. Persistent meal-prep client profiles
2. Weekly cycle generation from active recurring clients
3. Client skips, additions, meal-count changes, and delivery changes
4. Menu assignment with recent-repeat warnings
5. Aggregated dish, portion, ingredient, cost, and margin totals
6. Batch-oriented production plan across clients
7. Delivery snapshot
8. Closeout data: feedback, waste, shortage, and served-dish history updates

## Non-Goals

- Do not build a marketplace, public marketing page, or new consumer Dinner Circle social flow.
- Do not replace the existing event lifecycle.
- Do not depend on AI generation for correctness.
- Do not require perfect route optimization. A grouped delivery list is enough for MVP.
- Do not build a full inventory purchasing system. Aggregate ingredient demand and estimated cost are enough.

## Data Model

Add one migration:

`database/migrations/20260425000012_meal_prep_cycles.sql`

Use stable UUID primary keys, `tenant_id`, timestamps, and indexes. Match existing RLS/policy conventions in nearby migrations.

### `meal_prep_client_profiles`

One profile per tenant/client for recurring meal-prep defaults.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `client_id uuid not null references clients(id) on delete cascade`
- `default_meals_per_week integer not null default 5 check between 1 and 21`
- `portion_multiplier numeric(6,2) not null default 1.00`
- `default_delivery_day integer check between 0 and 6`
- `default_delivery_window text`
- `packaging_notes text`
- `portion_notes text`
- `hard_dietary_rules text[] not null default '{}'`
- `hard_allergens text[] not null default '{}'`
- `disliked_ingredients text[] not null default '{}'`
- `favorite_dishes text[] not null default '{}'`
- `rotation_cooldown_weeks integer not null default 4`
- `target_margin_percent numeric(6,2) not null default 35`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(tenant_id, client_id)`

### `meal_prep_cycles`

One tenant/week operating cycle.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `week_start date not null`
- `status text not null check in ('planning','confirmed','shopping','production','delivered','closed')`
- `production_days date[] not null default '{}'`
- `notes text`
- `generated_from jsonb not null default '{}'`
- `created_by uuid`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(tenant_id, week_start)`

### `meal_prep_cycle_clients`

The per-client order for one week.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null references meal_prep_cycles(id) on delete cascade`
- `client_id uuid not null references clients(id) on delete cascade`
- `recurring_service_id uuid references recurring_services(id) on delete set null`
- `status text not null check in ('active','skipped','paused','changed','cancelled')`
- `meal_count integer not null check between 0 and 50`
- `portion_multiplier numeric(6,2) not null default 1.00`
- `delivery_date date`
- `delivery_window text`
- `price_cents integer not null default 0`
- `estimated_cost_cents integer not null default 0`
- `target_margin_percent numeric(6,2)`
- `change_note text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(cycle_id, client_id)`

### `meal_prep_cycle_assignments`

The actual dishes assigned to clients for the week.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null references meal_prep_cycles(id) on delete cascade`
- `cycle_client_id uuid not null references meal_prep_cycle_clients(id) on delete cascade`
- `client_id uuid not null references clients(id) on delete cascade`
- `menu_id uuid`
- `recipe_id uuid`
- `dish_name text not null`
- `serving_count integer not null check serving_count >= 0`
- `portion_multiplier numeric(6,2) not null default 1.00`
- `status text not null check in ('proposed','approved','swapped','removed','prepared','delivered')`
- `rotation_warning text`
- `dietary_warning text`
- `estimated_cost_cents integer not null default 0`
- `price_cents integer not null default 0`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `meal_prep_cycle_ingredients`

Aggregated ingredient demand across the cycle.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null references meal_prep_cycles(id) on delete cascade`
- `ingredient_name text not null`
- `normalized_name text not null`
- `quantity numeric(12,3) not null default 0`
- `unit text not null default 'unit'`
- `estimated_cost_cents integer not null default 0`
- `prep_group text`
- `source_assignment_ids uuid[] not null default '{}'`
- `status text not null default 'needed' check in ('needed','ordered','purchased','prepped','omitted')`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(cycle_id, normalized_name, unit)`

### `meal_prep_cycle_tasks`

Batch production timeline.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null references meal_prep_cycles(id) on delete cascade`
- `production_day date`
- `task_type text not null check in ('prep','cook','cool','pack','label','delivery','admin')`
- `title text not null`
- `estimated_minutes integer`
- `position integer not null default 0`
- `source_assignment_ids uuid[] not null default '{}'`
- `status text not null default 'todo' check in ('todo','doing','done','blocked')`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `meal_prep_cycle_closeouts`

Post-week learning records.

Fields:

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null references meal_prep_cycles(id) on delete cascade`
- `client_id uuid references clients(id) on delete set null`
- `assignment_id uuid references meal_prep_cycle_assignments(id) on delete set null`
- `feedback text`
- `reaction text check in ('loved','liked','neutral','disliked')`
- `waste_quantity numeric(12,3)`
- `waste_unit text`
- `shortage boolean not null default false`
- `shortage_notes text`
- `created_at timestamptz not null default now()`

## Domain Code

Create `lib/meal-prep/`:

- `types.ts`: exported domain types and zod schemas.
- `dates.ts`: week normalization helpers.
- `profiles.ts`: fetch/upsert meal-prep profile and merge client defaults.
- `rotation.ts`: repeat and dietary warning engine.
- `planner.ts`: cycle generation and recalculation.
- `quantity.ts`: assignment, portion, ingredient, cost, and margin rollups.
- `schedule.ts`: production-day task generation.
- `closeout.ts`: close week, write closeout rows, append served-dish history.
- `actions.ts`: server actions used by UI.

### Required Server Actions

In `lib/meal-prep/actions.ts`:

- `getMealPrepCycleSnapshot(weekStart?: string)`
- `generateMealPrepCycle(weekStart: string)`
- `updateMealPrepClientProfile(input)`
- `updateCycleClient(input)`
- `upsertCycleAssignment(input)`
- `removeCycleAssignment(id)`
- `recalculateMealPrepCycle(cycleId)`
- `updateMealPrepTaskStatus(input)`
- `closeMealPrepCycle(input)`

All actions must:

- Require chef auth.
- Scope every read/write by tenant.
- Revalidate `/production`, `/production/meal-prep`, `/clients/recurring`, and relevant client detail routes.
- Return typed, UI-ready DTOs rather than raw Supabase rows where possible.

## Planning Logic

### Cycle Generation

`generateMealPrepCycle(weekStart)` must:

1. Normalize `weekStart` to Monday.
2. Upsert a `meal_prep_cycles` row for that week.
3. Load active `recurring_services` where `service_type = 'weekly_meal_prep'` or compatible meal-prep service types.
4. Load matching `meal_prep_client_profiles`, creating default in-memory profile values when missing.
5. Insert or update `meal_prep_cycle_clients` rows with default meal count, portion multiplier, price, and delivery data.
6. Preserve manual changes on existing cycle clients unless the client was newly added.
7. Return a snapshot with metrics and next recommended action.

### Dynamic Changes

Changing any cycle client must trigger recalculation:

- `status = skipped` sets effective meal count to 0 and removes active production demand.
- Meal-count changes update serving totals.
- Price changes update weekly revenue and margin.
- Delivery changes update the delivery snapshot.

Do not delete historical rows for skipped clients. Mark them skipped so weekly analytics retain truth.

### Menu Rotation

`rotation.ts` must evaluate each assignment against:

- `served_dish_history`
- `client_meal_requests`
- `client_allergy_records`
- `meal_prep_client_profiles`
- existing `clients.favorite_dishes` where available

Rules:

- Hard allergens produce `dietary_warning`.
- Disliked ingredients produce `dietary_warning`.
- A dish served inside `rotation_cooldown_weeks` produces `rotation_warning`.
- A requested repeat dish may override repeat warning only if explicitly marked as repeat request.
- Liked/loved dishes older than cooldown should be suggested as safe repeats.

### Quantity Rollup

`quantity.ts` must:

- Aggregate total servings by dish.
- Aggregate total ingredients by normalized ingredient and unit.
- Calculate estimated cost and margin at cycle, client, and assignment level.
- Tolerate missing recipe ingredient data by keeping assignments visible with `estimated_cost_cents = 0` and a warning in the snapshot.

Use existing recipe/menu ingredient data if available. Do not block the feature if some menus are not fully costed.

### Batch Optimization

The MVP optimization is deterministic grouping:

- Group identical dish assignments into batch rows.
- Group shared ingredients across assignments.
- Assign prep groups by normalized ingredient category when known; otherwise use `general`.
- Generate task ordering: prep shared ingredients, cook highest-overlap dishes, cool/pack, label, delivery.

This is not mathematical optimization. It must be predictable and explainable.

### Closeout

Closing a cycle must:

1. Require cycle status not already closed.
2. Insert closeout rows from feedback/waste/shortage input.
3. For delivered assignments, append `served_dish_history`.
4. Mark assignment status `delivered`.
5. Mark cycle `closed`.
6. Recalculate analytics fields.

## UI Scope

Create a new chef route:

`app/(chef)/production/meal-prep/page.tsx`

Optional detail route if simpler for state:

`app/(chef)/production/meal-prep/[weekStart]/page.tsx`

Create `components/meal-prep/`:

- `meal-prep-week-switcher.tsx`
- `meal-prep-snapshot-cards.tsx`
- `meal-prep-cycle-client-table.tsx`
- `meal-prep-menu-assignment-board.tsx`
- `meal-prep-production-plan.tsx`
- `meal-prep-ingredient-rollup.tsx`
- `meal-prep-delivery-list.tsx`
- `meal-prep-closeout-panel.tsx`

### Page Layout

The first viewport must be operational, not explanatory.

Top controls:

- Week selector
- Generate/recalculate button
- Status badge
- Production day selector

Snapshot metrics:

- Active clients
- Total meals
- Skips/changes
- Total servings
- Estimated ingredient cost
- Revenue
- Margin
- Delivery count

Main tabs:

- Clients
- Menu
- Ingredients
- Production
- Delivery
- Closeout

### Client Profile UI

Extend `components/clients/service-defaults-panel.tsx` or add a sibling panel on client detail:

- Default meals per week
- Portion multiplier
- Delivery day/window
- Packaging notes
- Portion notes
- Hard dietary rules
- Hard allergens
- Disliked ingredients
- Favorite dishes
- Rotation cooldown
- Target margin

Use the new `meal_prep_client_profiles` table rather than overloading general client fields.

### Production Calendar Link

Add a clear link from `app/(chef)/production/page.tsx` to `/production/meal-prep`.

Keep the existing monthly event calendar intact.

## UX Requirements

- The UI must show the weekly snapshot in one place.
- Skipping a client must immediately update total meals, ingredients, revenue, and tasks after recalculation.
- Warnings must be visible but not blocking unless there is a hard allergen warning.
- Empty states must be action-oriented: generate cycle, add recurring meal-prep service, add client defaults, assign menu.
- Avoid marketing copy and feature explanations.
- Use existing UI components and ChefFlow styling.

## Tests

Add unit tests:

- `tests/unit/meal-prep-cycle-generation.test.ts`
- `tests/unit/meal-prep-rotation.test.ts`
- `tests/unit/meal-prep-quantity-rollup.test.ts`
- `tests/unit/meal-prep-closeout.test.ts`

Required cases:

1. Generate a week with 18 active clients and default meal counts.
2. Skip one client and verify totals decrease without deleting the client row.
3. Add meals for one client and verify totals increase.
4. Detect repeat within cooldown from `served_dish_history`.
5. Allow requested repeat dish override.
6. Flag hard allergen conflict.
7. Aggregate shared ingredients across clients.
8. Calculate client and cycle margin.
9. Close cycle and write served-dish history.

Add one smoke/e2e test if the route can be tested with existing auth helpers:

- Generate cycle
- Edit a client meal count
- Add an assignment
- Recalculate
- Verify snapshot numbers changed

## Verification Commands

Run at minimum:

```bash
npm run test:unit -- tests/unit/meal-prep-cycle-generation.test.ts tests/unit/meal-prep-rotation.test.ts tests/unit/meal-prep-quantity-rollup.test.ts tests/unit/meal-prep-closeout.test.ts
npm run typecheck
```

If the route is wired:

```bash
npm run test:e2e:chef -- tests/e2e/20-meal-prep-cycle.spec.ts
```

## Parallel Agent Workstreams

Use these if multiple Codex agents are available. Agents must not overwrite unrelated dirty files.

### Agent 1: Schema and Server Actions

Owns:

- `database/migrations/20260425000012_meal_prep_cycles.sql`
- `lib/meal-prep/types.ts`
- `lib/meal-prep/dates.ts`
- `lib/meal-prep/profiles.ts`
- `lib/meal-prep/actions.ts`

Deliver:

- Migration
- Typed action contracts
- Snapshot DTO
- CRUD for profiles, cycle clients, assignments, tasks, and closeout entry points

### Agent 2: Planning Engine

Owns:

- `lib/meal-prep/rotation.ts`
- `lib/meal-prep/planner.ts`
- `lib/meal-prep/quantity.ts`
- `lib/meal-prep/schedule.ts`
- `lib/meal-prep/closeout.ts`
- Unit tests for these files

Deliver:

- Deterministic cycle generation
- Dynamic recalculation
- Rotation warnings
- Ingredient rollup
- Batch task generation
- Closeout writeback behavior

### Agent 3: Chef UI

Owns:

- `app/(chef)/production/meal-prep/page.tsx`
- Optional `app/(chef)/production/meal-prep/[weekStart]/page.tsx`
- `components/meal-prep/*`
- Meal-prep profile panel on client detail
- Link from `app/(chef)/production/page.tsx`

Deliver:

- Operational weekly snapshot
- Client/order adjustment table
- Menu assignment board
- Ingredient rollup
- Production tasks
- Delivery list
- Closeout panel

### Agent 4: Integration and Verification

Owns:

- `tests/unit/meal-prep-*.test.ts` not already covered
- Optional `tests/e2e/20-meal-prep-cycle.spec.ts`
- Typecheck and route integration fixes
- Minimal docs update in `docs/USER_MANUAL.md` if needed

Deliver:

- Passing focused unit tests
- Passing typecheck or documented blockers
- E2E smoke if auth helpers support it

## Acceptance Criteria

This passes when a chef can:

1. Create/generate a week from recurring meal-prep clients.
2. See active clients, skipped clients, meal counts, revenue, costs, margin, ingredients, production tasks, and deliveries in one weekly screen.
3. Change a client from active to skipped and see the cycle recalculate.
4. Add or swap a menu assignment and see rotation/dietary warnings.
5. View total ingredient demand across all clients.
6. View a batch production plan grouped by shared prep/cook/pack tasks.
7. Close the week and preserve feedback, waste, shortages, and served-dish history.

This fails if the implementation only adds another notes page, another event view, or a static checklist that still requires the chef to manually rebuild the week.
