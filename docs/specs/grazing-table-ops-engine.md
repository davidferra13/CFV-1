# Grazing Table Ops Engine: Build Spec

> Senior engineering recommendation for Ava Laurent profile.
> Build this as a Dinner Circles / ChefFlow vertical slice that turns a visual grazing-board idea into a locked operational plan.

## Product Decision

Build a **Grazing Table Ops Engine**, not a generic catering note surface.

The first shippable version must let a chef create a board or grazing table event, choose a visual direction, generate scaled quantities, price it, show the client a clear confirmation, and run prep/sourcing from the same plan.

The winning workflow is:

```text
Inspiration + guest count + table size + budget
-> reusable grazing template
-> scaled component plan
-> quote and margin
-> client confirmation packet
-> sourcing list
-> prep and setup timeline
```

## What Already Exists

Do not rebuild these systems. Compose them.

| Existing System                            | Use It For                                               | Key Files                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Event record and lifecycle                 | Canonical event shell, status, guest count, date, client | `lib/events/actions.ts`, `lib/events/fsm.ts`, `lib/events/operating-spine.ts`, `app/(chef)/events/[id]/`                         |
| Event detail tabs                          | Chef event workspace                                     | `app/(chef)/events/[id]/_components/`                                                                                            |
| Operating spine                            | Readiness and next action                                | `lib/events/operating-spine.ts`, `components/events/event-operating-spine-card.tsx`                                              |
| Menus / recipes / components / ingredients | Ingredient and costing source of truth                   | `lib/menus/`, `lib/recipes/`, `lib/ingredients/`, `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql`         |
| Prep scheduling                            | Existing prep blocks and timeline                        | `lib/scheduling/prep-block-actions.ts`, `components/events/prep-plan-panel.tsx`, `components/events/prep-timeline-view.tsx`      |
| Documents                                  | PDF / packet generation model                            | `lib/documents/`, `app/api/documents/`, `app/(chef)/events/[id]/documents/page.tsx`                                              |
| Vendor and pricing intelligence            | Sourcing, vendor prices, price confidence                | `lib/vendors/`, `components/vendors/`, `lib/openclaw/event-shopping-actions.ts`, `components/pricing/event-shopping-planner.tsx` |
| Proposals / quotes                         | Client-facing proposal patterns                          | `lib/quotes/`, `components/quotes/`, `components/proposals/`                                                                     |
| Dinner Circles config                      | Existing JSONB config and event snapshot patterns        | `lib/dinner-circles/event-circle.ts`, `lib/dinner-circles/types.ts`                                                              |
| Offline grazing packet scripts             | Reference only, not product UI                           | `scripts/create-grazing-event-packet.mjs`, `scripts/export-grazing-proposal-bundle.mjs`                                          |

## Non-Goals

- Do not build a computer-vision model in v1.
- Do not promise exact object detection from Pinterest images.
- Do not create a separate event system.
- Do not make a marketing landing page.
- Do not add fragile free-form AI output as the source of truth.
- Do not replace menus, quotes, documents, prep blocks, vendors, or OpenClaw.

## MVP Scope

Build a deterministic, editable planning layer with optional inspiration images.

### Required Chef Outcomes

1. Create or open an event and mark it as a grazing-board/table event.
2. Enter guest count, table dimensions, density, service style, and budget.
3. Pick a reusable grazing template.
4. Generate exact category quantities for cheese, meat, fruit, crackers/bread, nuts, dips, garnish, and props.
5. Convert the category plan into line items with estimated costs and suggested vendors.
6. See price per guest, cost per guest, gross margin, and quote recommendation.
7. Produce a client-facing confirmation showing aesthetic, included components, substitutions, and scope.
8. Produce an internal build sheet showing layout zones, quantities, vendor sourcing, prep, packing, and setup.
9. See multi-event overlaps across purchasing and prep for the next 14 days.

## Data Model

Create a new additive migration. Do not run it.

Migration path:

```text
database/migrations/20260425000001_grazing_table_ops_engine.sql
```

Use a timestamp higher than the current highest migration if this filename collides.

### Tables

#### `grazing_templates`

Reusable build archetypes.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references chefs(id) on delete cascade`
- `name text not null`
- `format text not null check (format in ('small_board','mid_spread','large_table'))`
- `service_style text not null check (service_style in ('light_snack','standard_grazing','heavy_grazing','meal_replacement'))`
- `aesthetic_tags text[] not null default '{}'`
- `default_density text not null default 'standard' check (default_density in ('light','standard','abundant'))`
- `layout_zones jsonb not null default '[]'::jsonb`
- `component_mix jsonb not null`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

`component_mix` example:

```json
{
  "cheese": 0.28,
  "charcuterie": 0.2,
  "fruit": 0.18,
  "crackers_bread": 0.16,
  "nuts": 0.06,
  "dips_spreads": 0.07,
  "garnish": 0.05
}
```

#### `grazing_components`

Reusable catalog items for boards and tables.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references chefs(id) on delete cascade`
- `name text not null`
- `category text not null check (category in ('cheese','charcuterie','fruit','cracker_bread','nut','dip_spread','pickle_olive','garnish','sweet','prop'))`
- `aesthetic_tags text[] not null default '{}'`
- `season_tags text[] not null default '{}'`
- `dietary_tags text[] not null default '{}'`
- `default_unit text not null default 'oz'`
- `default_vendor_id uuid null`
- `cost_per_unit_cents integer null`
- `client_description text null`
- `prep_notes text null`
- `storage_notes text null`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `event_grazing_plans`

One locked/current plan per event.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `event_id uuid not null references events(id) on delete cascade`
- `tenant_id uuid not null references chefs(id) on delete cascade`
- `template_id uuid null references grazing_templates(id) on delete set null`
- `status text not null default 'draft' check (status in ('draft','client_sent','client_approved','locked'))`
- `event_format text not null check (event_format in ('small_board','mid_spread','large_table'))`
- `service_style text not null check (service_style in ('light_snack','standard_grazing','heavy_grazing','meal_replacement'))`
- `guest_count integer not null`
- `table_length_ft numeric(6,2) null`
- `table_width_ft numeric(6,2) null`
- `density text not null check (density in ('light','standard','abundant'))`
- `budget_cents integer null`
- `target_margin_percent numeric(5,2) not null default 65`
- `aesthetic_tags text[] not null default '{}'`
- `inspiration_notes text null`
- `inspiration_assets jsonb not null default '[]'::jsonb`
- `layout_plan jsonb not null default '{}'::jsonb`
- `quantity_plan jsonb not null default '{}'::jsonb`
- `pricing_snapshot jsonb not null default '{}'::jsonb`
- `sourcing_snapshot jsonb not null default '{}'::jsonb`
- `client_confirmation_snapshot jsonb not null default '{}'::jsonb`
- `locked_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_grazing_plans_event_id
ON event_grazing_plans(event_id);
```

#### `event_grazing_items`

Editable line items generated from the plan.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `plan_id uuid not null references event_grazing_plans(id) on delete cascade`
- `tenant_id uuid not null references chefs(id) on delete cascade`
- `component_id uuid null references grazing_components(id) on delete set null`
- `category text not null`
- `name text not null`
- `quantity numeric(10,2) not null`
- `unit text not null`
- `estimated_cost_cents integer not null default 0`
- `vendor_id uuid null`
- `display_order integer not null default 0`
- `client_visible boolean not null default true`
- `substitution_allowed boolean not null default true`
- `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### RLS and Indexes

Follow existing tenant-scoped patterns.

Indexes:

- `grazing_templates(tenant_id, active)`
- `grazing_components(tenant_id, category, active)`
- `event_grazing_plans(tenant_id, status)`
- `event_grazing_items(plan_id, display_order)`
- `event_grazing_items(tenant_id, category)`

Enable RLS on all new tables with chef tenant policies. Use `tenant_id` matching the authenticated chef tenant.

## Deterministic Scaling Engine

Create:

```text
lib/grazing/scaling-engine.ts
lib/grazing/types.ts
```

The engine must be pure. No DB calls.

### Input

```ts
export type GrazingPlanInput = {
  guestCount: number
  eventFormat: 'small_board' | 'mid_spread' | 'large_table'
  serviceStyle: 'light_snack' | 'standard_grazing' | 'heavy_grazing' | 'meal_replacement'
  density: 'light' | 'standard' | 'abundant'
  tableLengthFt?: number | null
  tableWidthFt?: number | null
  budgetCents?: number | null
  targetMarginPercent?: number
  componentMix?: Partial<Record<GrazingCategory, number>>
}
```

### Portion Formula

Base edible ounces per guest:

| Service Style      | Oz / Guest |
| ------------------ | ---------: |
| `light_snack`      |          5 |
| `standard_grazing` |          8 |
| `heavy_grazing`    |         11 |
| `meal_replacement` |         14 |

Density multiplier:

| Density    | Multiplier |
| ---------- | ---------: |
| `light`    |       0.88 |
| `standard` |          1 |
| `abundant` |       1.18 |

Format minimums:

| Format        | Minimum Edible Oz |
| ------------- | ----------------: |
| `small_board` |                48 |
| `mid_spread`  |               180 |
| `large_table` |               850 |

Default mix:

```ts
{
  cheese: 0.28,
  charcuterie: 0.2,
  fruit: 0.18,
  crackers_bread: 0.16,
  nuts: 0.06,
  dips_spreads: 0.07,
  garnish: 0.05,
}
```

Rules:

- Normalize custom mix to 1.0.
- Total edible oz = max(format minimum, guestCount _ base oz _ density multiplier).
- Category oz = total edible oz \* category mix.
- Convert cheese, charcuterie, fruit, crackers/bread, nuts, garnish to ounces.
- Convert dips/spreads to cups using 8 oz per cup.
- Props are not edible and are estimated from format/table size.
- Round category quantities up to operational increments:
  - cheese: 4 oz
  - charcuterie: 4 oz
  - fruit: 8 oz
  - crackers/bread: 8 oz
  - nuts: 4 oz
  - dips/spreads: 0.5 cup
  - garnish: 2 oz

### Layout Formula

If table dimensions exist:

- `surfaceSqFt = tableLengthFt * tableWidthFt`
- Suggested density:
  - less than 0.65 sq ft / guest: show layout warning "tight"
  - 0.65 to 1.1 sq ft / guest: "standard"
  - above 1.1 sq ft / guest: "spacious"

Generate layout zones:

- anchor cheese clusters
- charcuterie ribbons
- fruit color blocks
- cracker/bread perimeter
- dip bowls
- garnish finish
- service flow notes

Return:

```ts
export type GrazingPlanOutput = {
  totalEdibleOz: number
  perGuestOz: number
  quantityPlan: GrazingQuantityLine[]
  layoutPlan: GrazingLayoutPlan
  warnings: string[]
}
```

### Tests

Create:

```text
tests/unit/grazing.scaling-engine.test.ts
```

Cover:

- 8 guest small board
- 40 guest mid spread
- 100 guest large table
- density changes
- budget warning when estimated food cost exceeds budget
- layout warning when table area is tight

## Server Actions

Create:

```text
lib/grazing/actions.ts
```

Server actions:

- `getGrazingPlan(eventId: string)`
- `upsertGrazingPlan(input)`
- `regenerateGrazingPlan(eventId: string)`
- `listGrazingTemplates()`
- `createGrazingTemplate(input)`
- `listGrazingComponents(filters?)`
- `createGrazingComponent(input)`
- `updateGrazingItem(input)`
- `lockGrazingPlan(eventId: string)`
- `buildGrazingClientConfirmation(eventId: string)`
- `buildGrazingSourcingPlan(eventId: string)`
- `getGrazingMultiEventSnapshot(input?: { from?: string; to?: string })`

Action requirements:

- Use `requireChef()`.
- Scope every read/write by `tenant_id`.
- Validate inputs with `zod`.
- Call the pure scaling engine; do not duplicate formula math in actions.
- Use existing vendor price helpers when available.
- Revalidate `/events/${eventId}` and `/events/${eventId}?tab=grazing`.
- Return typed objects, not raw DB rows.

## Chef Event Workspace

Add a new event detail tab: **Grazing**.

Modify:

```text
app/(chef)/events/[id]/page.tsx
app/(chef)/events/[id]/_components/event-detail-grazing-tab.tsx
components/events/event-detail-mobile-nav.tsx
```

If the event detail tab architecture is centralized elsewhere, follow the existing pattern and keep changes minimal.

### Grazing Tab Layout

Build:

```text
components/grazing/grazing-plan-workbench.tsx
components/grazing/grazing-plan-form.tsx
components/grazing/grazing-quantity-table.tsx
components/grazing/grazing-layout-preview.tsx
components/grazing/grazing-pricing-summary.tsx
components/grazing/grazing-client-confirmation.tsx
components/grazing/grazing-sourcing-panel.tsx
```

The first viewport should be the actual workbench, not explanation.

Sections:

1. Plan controls
   - Format segmented control
   - Guest count input
   - Table length/width inputs
   - Density segmented control
   - Service style select
   - Budget input
   - Target margin input
   - Aesthetic tag input
   - Inspiration notes textarea

2. Generated plan
   - Quantity table by category and line item
   - Editable quantities and cost overrides
   - Client-visible toggles
   - Substitution allowed toggles

3. Layout preview
   - Simple non-drag visual map
   - Show zones as labeled bands/clusters
   - Show warnings for tight table area
   - No canvas required; use responsive HTML/CSS

4. Pricing summary
   - Estimated ingredient cost
   - Cost per guest
   - Suggested quote
   - Quote per guest
   - Gross margin dollars and percent
   - Budget warning if plan exceeds budget at target margin

5. Client confirmation
   - Mood/aesthetic tags
   - Included components
   - Not-included or substitution notes
   - Button to build confirmation snapshot
   - Button/link to proposal or document surface if available

6. Sourcing and prep
   - Vendor grouped shopping list
   - Freshness deadlines
   - Prep/setup checklist
   - Link to existing prep and documents pages

Design:

- Operational SaaS surface: dense, quiet, scannable.
- Use existing `components/ui` primitives where this repo already does.
- Avoid cards inside cards.
- Use icons from existing icon system if present.
- Mobile must stack without text overlap.

## Client Confirmation Output

Build a client-facing confirmation page or document snapshot, using existing sharing/document patterns.

Preferred v1:

```text
app/(chef)/events/[id]/grazing-confirmation/page.tsx
components/grazing/grazing-confirmation-preview.tsx
```

If there is an existing client proposal/share architecture that fits better, use it instead and document the choice in the final response.

Client output must show:

- Event name/date/guest count
- Visual direction/aesthetic tags
- Board/table format
- Included categories and representative components
- Dietary/allergen disclaimer using existing safety language if available
- Substitution rules
- Setup/table assumptions
- Price summary if the existing quote flow exposes price
- Approval status if plan is `client_sent`, `client_approved`, or `locked`

Do not show internal vendor costs or margin.

## Sourcing and Multi-Event Ops

Create:

```text
components/grazing/grazing-multi-event-board.tsx
app/(chef)/events/grazing/page.tsx
```

Purpose:

- Show all grazing events in the next 14 days.
- Show overlapping ingredients by category.
- Show vendor-grouped quantities across events.
- Show prep collision warnings when multiple events have same-day prep/setup.

Data from:

- `event_grazing_plans`
- `event_grazing_items`
- `events`
- vendor data if linked

Board columns:

- Upcoming grazing events
- Shared purchasing
- Prep pressure
- Locked/client-approved plans

This page is the answer to "I have 5 upcoming events this month and everything is in my head."

## Prep and Execution Timeline

Do not create a separate prep engine. Feed grazing plan outputs into existing prep concepts.

In `lib/grazing/actions.ts`, generate checklist groups:

- T-7: confirm final guest count, table size, rental/prop needs
- T-5: order specialty cheese/charcuterie
- T-3: dry goods, crackers, nuts, shelf-stable props
- T-2: produce order and floral/garnish sourcing
- T-1: wash/prep fruit, portion dips, pack props, label containers
- Day-of: pickup fresh items, transport, setup, quality check, client handoff

Expose these in the Grazing tab and link to existing prep pages.

If it is easy and safe to create actual `event_prep_blocks`, add an explicit button:

```text
Create prep blocks from grazing plan
```

Do not auto-create prep blocks silently.

## Inspiration Images

V1 does not need AI image extraction.

Implement:

- `inspiration_assets` JSONB with URL/name/type if existing storage upload helpers are easy to reuse.
- If upload plumbing is unclear, implement inspiration notes and external reference URL fields first.
- Aesthetic tags are chef-selected and deterministic.

Important: visual inspiration informs the plan, but the source of truth is the editable structured plan.

## Operating Spine Integration

Modify `lib/events/operating-spine.ts` minimally so grazing events can surface readiness.

Rules:

- If event has a grazing plan and plan is unlocked, prep lane next step can mention "Lock grazing plan".
- If event format/status indicates grazing but no plan exists, prep/menu lane should mention "Build grazing plan".
- Do not disrupt existing non-grazing event behavior.

If detecting grazing event type requires a marker, use presence of `event_grazing_plans` in the event detail page instead of adding a broad event status change.

## Seed Data

Create:

```text
lib/grazing/seed-data.ts
```

Include defaults for Ava-style business:

Templates:

- Small Classic Cheese Board, 6-10 guests
- Seasonal Brunch Board, 10-20 guests
- Mid-Size Cocktail Spread, 20-40 guests
- Abundant Celebration Table, 40-75 guests
- Large Grazing Table, 75-120 guests

Components:

- 8 cheeses
- 5 charcuterie items
- 8 fruits
- 6 crackers/breads
- 6 accompaniments
- 6 garnishes/props

Add a server action or script only if the repo already has a demo/seed pattern that fits. Otherwise use the seed file as defaults in the UI when DB has no templates/components.

## Agent Work Split

Use four agents if running in parallel. Each agent must stay inside its ownership area and not revert others' changes.

### Agent 1: Core Data and Engine

Owns:

- `database/migrations/*grazing_table_ops_engine.sql`
- `lib/grazing/types.ts`
- `lib/grazing/scaling-engine.ts`
- `lib/grazing/seed-data.ts`
- `lib/grazing/actions.ts`
- `tests/unit/grazing.scaling-engine.test.ts`

Must deliver:

- Migration file created but not run.
- Pure scaling engine with tests.
- Tenant-scoped server actions.
- Seed defaults.

Do not modify event detail UI.

### Agent 2: Chef Event Grazing Workbench

Owns:

- `app/(chef)/events/[id]/_components/event-detail-grazing-tab.tsx`
- Event detail tab wiring files under `app/(chef)/events/[id]/`
- `components/grazing/grazing-plan-workbench.tsx`
- `components/grazing/grazing-plan-form.tsx`
- `components/grazing/grazing-quantity-table.tsx`
- `components/grazing/grazing-layout-preview.tsx`
- `components/grazing/grazing-pricing-summary.tsx`
- `components/grazing/grazing-sourcing-panel.tsx`

Must deliver:

- Grazing tab available from event detail.
- Plan form regenerates deterministic quantities.
- Editable item table.
- Pricing summary.
- Layout preview.

Do not create migrations or change the scaling formulas.

### Agent 3: Client Confirmation Output

Owns:

- `components/grazing/grazing-client-confirmation.tsx`
- `components/grazing/grazing-confirmation-preview.tsx`
- `app/(chef)/events/[id]/grazing-confirmation/page.tsx`
- Any minimal document/proposal integration needed for confirmation links

Must deliver:

- Internal preview for chef.
- Client-safe confirmation output.
- No internal costs/margins shown to client.
- Uses snapshots from Agent 1 actions.

Do not modify core scaling math or event tab wiring except for adding links/buttons if required.

### Agent 4: Multi-Event Sourcing and Prep Board

Owns:

- `app/(chef)/events/grazing/page.tsx`
- `components/grazing/grazing-multi-event-board.tsx`
- Any small additions in `lib/grazing/actions.ts` needed for `getGrazingMultiEventSnapshot`
- Optional prep-block creation button/component if straightforward

Must deliver:

- Next-14-days grazing board.
- Shared purchasing rollup.
- Prep collision warnings.
- Locked/client-approved plan list.

Coordinate with Agent 1 if `getGrazingMultiEventSnapshot` is not yet implemented. Do not alter scaling formulas.

## Verification

Minimum commands:

```bash
node --test --import tsx tests/unit/grazing.scaling-engine.test.ts
npm run typecheck
```

If UI changes are implemented:

```bash
npm run build
```

Manual verification:

1. Create or open an event for 8 guests, small board.
2. Build a grazing plan and verify cheese/meat/fruit/cracker quantities are nonzero and rounded.
3. Change guest count to 40 and verify quantities scale.
4. Change density from light to abundant and verify total edible ounces increases.
5. Enter tight table dimensions and verify layout warning appears.
6. Add/edit an item cost and verify margin changes.
7. Build client confirmation and verify internal costs are hidden.
8. Create a 100 guest large table plan and verify large format minimums are respected.
9. Open `/events/grazing` and verify multiple grazing events aggregate purchasing and prep pressure.

## Acceptance Criteria

- A chef can generate a grazing plan from guest count/table/budget in under one minute.
- The plan has structured quantities, costs, pricing, layout notes, sourcing, and prep steps.
- The client can see a clear confirmation without internal margin data.
- Multi-event overlap is visible in one place.
- Existing non-grazing event behavior still works.
- No AI output is required for operational truth.

## Senior Engineering Notes

- Keep formulas deterministic and visible in code. This feature becomes trusted only if the chef can understand and override it.
- Treat `event_grazing_plans` as the structured planning contract. Everything else reads from it.
- Use JSONB snapshots for fast v1 iteration, but keep line items normalized in `event_grazing_items` because pricing, sourcing, and multi-event rollups need queryable rows.
- Do not let inspiration images become the product. The product is the translation from visual taste into quantities, vendor lists, price, and execution.
- Prefer adding one strong workflow over many thin tabs.
