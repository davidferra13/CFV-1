# Orchestration Data Pipeline - Build Spec

> **Status:** ready-to-build
> **Priority:** P1
> **Profile:** Rafael Duarte (high-end tasting menu operator)
> **Problem:** `buildServiceOrchestrationPlan()` in `lib/service-execution/orchestration-core.ts` is a fully working engine that detects dependency risks, resource conflicts, menu flow warnings, and computes complexity scores. But it takes `TastingMenuCourse[]` as input, and NO pipeline transforms real DB data into that shape. The engine exists; the fuel line doesn't.

---

## What Already Exists (DO NOT REBUILD)

| File                                          | What It Does                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/service-execution/orchestration-core.ts` | Pure function engine: `buildServiceOrchestrationPlan()`. Takes `TastingMenuCourse[]`, returns `ServiceOrchestrationPlan` with dependency risks, resource conflicts, menu flow warnings, prep timeline, pricing, complexity score, `serviceReady` boolean. **520+ lines, fully tested.** |
| `lib/service-execution/progress-core.ts`      | Live course tracking types and builders                                                                                                                                                                                                                                                 |
| `lib/service-execution/actions.ts`            | Server actions for course progress (queued/firing/served/skipped)                                                                                                                                                                                                                       |
| `lib/menus/actions.ts`                        | `getMenuById()` returns `{ ...menu, dishes: [{ ...dish, components: [...] }] }`                                                                                                                                                                                                         |
| `lib/prep-timeline/compute-timeline.ts`       | Reverse prep timeline from peak windows                                                                                                                                                                                                                                                 |
| `lib/equipment/actions.ts`                    | Equipment CRUD with categories                                                                                                                                                                                                                                                          |

---

## Scope: 3 Deliverables

### Deliverable 1: Migration - Add Orchestration Columns to `components` Table

**File to create:** `database/migrations/20260425000014_component_orchestration_columns.sql`

The `components` table (created in `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql`) already has these columns: `id`, `tenant_id`, `dish_id`, `recipe_id`, `name`, `category`, `description`, `sort_order`, `is_make_ahead`, `make_ahead_window_hours`, `storage_notes`, `execution_notes`, `scale_factor`, `prep_day_offset`, `prep_time_of_day`, `prep_station`, `portion_quantity`, `portion_unit`.

**Add these columns (ALL nullable, ALL additive):**

```sql
-- Orchestration timing columns for service execution planning
-- These columns feed buildServiceOrchestrationPlan() in lib/service-execution/orchestration-core.ts

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS ready_minute INTEGER;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS needed_minute INTEGER;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS hold_limit_minutes INTEGER;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS labor_minutes INTEGER;

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS depends_on_component_ids UUID[] DEFAULT '{}';

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS required_resources JSONB DEFAULT '[]';

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS component_role TEXT DEFAULT 'other';

ALTER TABLE components
  ADD COLUMN IF NOT EXISTS reusable_key TEXT;

-- Timing columns for dishes (courses) - pacing between courses
ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS target_serve_minute INTEGER;

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS target_pace_minutes INTEGER;

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS service_temperature TEXT;

ALTER TABLE dishes
  ADD COLUMN IF NOT EXISTS narrative_tags TEXT[] DEFAULT '{}';

-- Constraints
ALTER TABLE components
  ADD CONSTRAINT components_ready_minute_positive
  CHECK (ready_minute IS NULL OR ready_minute >= 0);

ALTER TABLE components
  ADD CONSTRAINT components_needed_minute_positive
  CHECK (needed_minute IS NULL OR needed_minute >= 0);

ALTER TABLE components
  ADD CONSTRAINT components_hold_limit_positive
  CHECK (hold_limit_minutes IS NULL OR hold_limit_minutes > 0);

ALTER TABLE components
  ADD CONSTRAINT components_labor_minutes_positive
  CHECK (labor_minutes IS NULL OR labor_minutes > 0);

ALTER TABLE components
  ADD CONSTRAINT components_role_valid
  CHECK (component_role IS NULL OR component_role IN (
    'protein', 'sauce', 'garnish', 'texture', 'vegetable',
    'starch', 'dessert', 'beverage', 'other'
  ));

ALTER TABLE dishes
  ADD CONSTRAINT dishes_target_serve_minute_positive
  CHECK (target_serve_minute IS NULL OR target_serve_minute >= 0);

ALTER TABLE dishes
  ADD CONSTRAINT dishes_target_pace_minutes_positive
  CHECK (target_pace_minutes IS NULL OR target_pace_minutes > 0);

ALTER TABLE dishes
  ADD CONSTRAINT dishes_service_temperature_valid
  CHECK (service_temperature IS NULL OR service_temperature IN (
    'hot', 'cold', 'room_temp', 'frozen'
  ));

-- Comments
COMMENT ON COLUMN components.ready_minute IS 'Minute (relative to service start = 0) when this component will be ready.';
COMMENT ON COLUMN components.needed_minute IS 'Minute when this component must be available for plating/assembly.';
COMMENT ON COLUMN components.hold_limit_minutes IS 'Maximum minutes this component can hold quality after ready_minute.';
COMMENT ON COLUMN components.labor_minutes IS 'Active labor time in minutes for this component.';
COMMENT ON COLUMN components.depends_on_component_ids IS 'UUIDs of other components this one depends on (e.g., a sauce needed for plating).';
COMMENT ON COLUMN components.required_resources IS 'JSON array of {resourceId, label, window: {startMinute, endMinute}, units} for equipment needs.';
COMMENT ON COLUMN components.component_role IS 'Role in the dish: protein, sauce, garnish, texture, vegetable, starch, dessert, beverage, other.';
COMMENT ON COLUMN components.reusable_key IS 'If set, components with the same key across courses are treated as the same prep (e.g., "herb-oil").';
COMMENT ON COLUMN dishes.target_serve_minute IS 'Minute (relative to service start = 0) when this course should be served.';
COMMENT ON COLUMN dishes.target_pace_minutes IS 'Minutes of pacing/rest between this course and the next.';
COMMENT ON COLUMN dishes.service_temperature IS 'Primary serving temperature: hot, cold, room_temp, frozen.';
COMMENT ON COLUMN dishes.narrative_tags IS 'Narrative/thematic tags for menu flow analysis (e.g., "rich", "acidic", "refreshing").';
```

**Rules:**

- ALL columns nullable. Zero breaking changes.
- No data migration needed. Existing rows get NULLs/defaults.
- `required_resources` is JSONB because the shape is complex and varies per component.
- `depends_on_component_ids` is UUID[] (PostgreSQL native array) for fast lookups.

---

### Deliverable 2: Bridge Function - Transform DB Data to Orchestration Types

**File to create:** `lib/service-execution/orchestration-bridge.ts`

This is a pure transformation function. No `'use server'`. No DB calls. It takes the output of `getMenuById()` and returns `TastingMenuCourse[]` that `buildServiceOrchestrationPlan()` expects.

```typescript
// lib/service-execution/orchestration-bridge.ts

import type {
  TastingMenuCourse,
  TastingMenuComponent,
  ComponentRole,
  PrepStage,
  ServiceTemperature,
  ServiceResourceRequirement,
} from '@/lib/service-execution/orchestration-core'

/**
 * Transform raw DB menu data (from getMenuById) into the TastingMenuCourse[]
 * shape expected by buildServiceOrchestrationPlan().
 *
 * This is a pure function - no DB calls, no side effects.
 */
export function bridgeMenuToOrchestration(menu: {
  dishes: Array<{
    id: string
    course_number: number
    course_name: string
    target_serve_minute?: number | null
    target_pace_minutes?: number | null
    service_temperature?: string | null
    narrative_tags?: string[] | null
    components: Array<{
      id: string
      name: string
      category: string
      component_role?: string | null
      prep_day_offset?: number | null
      prep_time_of_day?: string | null
      ready_minute?: number | null
      needed_minute?: number | null
      hold_limit_minutes?: number | null
      labor_minutes?: number | null
      depends_on_component_ids?: string[] | null
      required_resources?: ServiceResourceRequirement[] | null
      reusable_key?: string | null
      // cost comes from recipe linkage, not stored on component
    }>
  }>
}): TastingMenuCourse[] {
  return menu.dishes.map((dish) => ({
    id: dish.id,
    courseNumber: dish.course_number,
    name: dish.course_name,
    targetServeMinute: dish.target_serve_minute ?? dish.course_number * 12,
    targetPaceMinutes: dish.target_pace_minutes ?? null,
    temperature: validTemperature(dish.service_temperature),
    narrativeTags: dish.narrative_tags ?? [],
    components: dish.components.map((comp) => ({
      id: comp.id,
      name: comp.name,
      role: validRole(comp.component_role ?? comp.category),
      prepStage: derivePrepStage(comp.prep_day_offset, comp.prep_time_of_day),
      dependsOnComponentIds: comp.depends_on_component_ids ?? undefined,
      requiredResources: comp.required_resources ?? undefined,
      readyMinute: comp.ready_minute ?? null,
      neededMinute: comp.needed_minute ?? null,
      holdLimitMinutes: comp.hold_limit_minutes ?? null,
      laborMinutes: comp.labor_minutes ?? null,
      reusableKey: comp.reusable_key ?? null,
      // costCents intentionally omitted - comes from recipe cost chain, not component columns
    })),
  }))
}

const VALID_ROLES: ComponentRole[] = [
  'protein',
  'sauce',
  'garnish',
  'texture',
  'vegetable',
  'starch',
  'dessert',
  'beverage',
  'other',
]

function validRole(raw: string | null | undefined): ComponentRole {
  if (!raw) return 'other'
  return VALID_ROLES.includes(raw as ComponentRole) ? (raw as ComponentRole) : 'other'
}

const VALID_TEMPS: ServiceTemperature[] = ['hot', 'cold', 'room_temp', 'frozen']

function validTemperature(raw: string | null | undefined): ServiceTemperature | undefined {
  if (!raw) return undefined
  return VALID_TEMPS.includes(raw as ServiceTemperature) ? (raw as ServiceTemperature) : undefined
}

function derivePrepStage(
  dayOffset: number | null | undefined,
  timeOfDay: string | null | undefined
): PrepStage {
  if (dayOffset == null) {
    // No offset set - infer from time of day
    if (timeOfDay === 'service') return 'during_service'
    return 'day_of'
  }
  if (dayOffset <= -2) return 'two_days_before'
  if (dayOffset === -1) return 'day_before'
  // dayOffset === 0
  if (timeOfDay === 'service') return 'during_service'
  return 'day_of'
}
```

**Rules:**

- Pure function. No imports from `'use server'` files.
- Graceful defaults: if `target_serve_minute` is null, use `course_number * 12` (12-min pacing default for tasting menus).
- `derivePrepStage` maps existing `prep_day_offset` + `prep_time_of_day` columns to the `PrepStage` union type.
- `costCents` is intentionally omitted from the bridge. The pricing model comes from the event financial data, not component columns.

---

### Deliverable 3: Server Action + UI Panel

#### 3a. Server Action

**File to modify:** `lib/service-execution/actions.ts`

Add ONE new export at the bottom of the file. Do NOT modify any existing functions.

```typescript
import { bridgeMenuToOrchestration } from '@/lib/service-execution/orchestration-bridge'
import {
  buildServiceOrchestrationPlan,
  type ServiceOrchestrationPlan,
  type ServiceResource,
} from '@/lib/service-execution/orchestration-core'

export async function getEventOrchestrationPlan(
  eventId: string
): Promise<ServiceOrchestrationPlan | null> {
  const user = await requireChef()
  const db = createServerClient()
  const tenantId = user.tenantId!

  // 1. Get event with its menu
  const { data: event } = await db
    .from('events')
    .select('id, menu_id, guest_count, total_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event?.menu_id) return null

  // 2. Get menu with dishes and components
  const { data: menu } = await db
    .from('menus')
    .select('id, price_per_person_cents')
    .eq('id', event.menu_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!menu) return null

  const { data: dishes } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  const dishIds = dishes.map((d: any) => d.id)
  const { data: componentRows } = await db
    .from('components')
    .select('*')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  // Group components by dish_id
  const componentsByDish = new Map<string, any[]>()
  for (const comp of componentRows ?? []) {
    const existing = componentsByDish.get(comp.dish_id) ?? []
    existing.push(comp)
    componentsByDish.set(comp.dish_id, existing)
  }

  const menuWithDishes = {
    dishes: dishes.map((dish: any) => ({
      ...dish,
      components: componentsByDish.get(dish.id) ?? [],
    })),
  }

  // 3. Bridge DB shape to orchestration types
  const courses = bridgeMenuToOrchestration(menuWithDishes)

  // 4. Build equipment resource list from chef's inventory
  const { data: equipmentRows } = await db
    .from('equipment_inventory')
    .select('id, name, category')
    .eq('chef_id', tenantId)

  const resources: ServiceResource[] = (equipmentRows ?? []).map((eq: any) => ({
    id: eq.id,
    label: eq.name,
    capacity: 1,
  }))

  // 5. Build pricing model from event data
  const guestCount = (event as any).guest_count ?? 0
  const quotedPriceCents = (event as any).total_price_cents ?? 0
  const pricing =
    guestCount > 0
      ? {
          guestCount,
          quotedPriceCents,
          targetMarginPercent: 65,
        }
      : null

  // 6. Run the engine
  return buildServiceOrchestrationPlan({ courses, resources, pricing })
}
```

#### 3b. UI Panel

**File to create:** `components/events/orchestration-plan-panel.tsx`

A client component that displays the `ServiceOrchestrationPlan`. Renders:

1. **Service Ready badge** - green "Ready" or amber "Not Ready" based on `plan.serviceReady`
2. **Complexity score** - single number with breakdown tooltip
3. **Course timeline** - ordered list showing course name, target serve minute, component count, planned fire minute
4. **Dependency risks** - red cards if any exist. Each shows component name, type, and detail string
5. **Resource conflicts** - amber cards if any exist. Each shows resource label, time window, component names
6. **Menu flow warnings** - yellow cards if any exist. Each shows type and detail
7. **Prep timeline groups** - collapsible sections by stage (two_days_before, day_before, day_of, during_service) with task list and total labor minutes
8. **Reusable components** - list of shared components across courses
9. **Pricing summary** - if available: food cost, labor cost, margin %, status badge

**Implementation requirements:**

- `'use client'` directive
- Props: `eventId: string`
- Uses `useEffect` + `useState` to call `getEventOrchestrationPlan(eventId)` on mount
- Loading state with spinner
- Null state: "Add a menu with dishes and components to see the orchestration plan."
- Empty risks/conflicts/warnings sections should NOT render (don't show "0 issues" noise)
- Use existing `Card` from `@/components/ui/card`
- Use existing `Badge` from `@/components/ui/badge` (variants: `default`, `success`, `warning`, `error`, `info`)
- Use existing `Button` from `@/components/ui/button`
- Colors: green for ready/good, amber for warnings, red for risks/errors
- NO Tailwind classes beyond what the project already uses
- NO new dependencies

#### 3c. Wire Into Ops Tab

**File to modify:** `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`

Add the panel AFTER `ServiceSimulationPanel` and BEFORE the "Event Staff" card. This is a simple insertion.

1. Add import at top: `import { OrchestrationPlanPanel } from '@/components/events/orchestration-plan-panel'`
2. Add the component between line 153 (closing `/>` of ServiceSimulationPanel) and line 156 (Event Staff section):

```tsx
{
  event.status !== 'cancelled' && <OrchestrationPlanPanel eventId={event.id} />
}
```

That is the ONLY change to this file. Do not modify anything else.

---

## What NOT To Do

- Do NOT modify `orchestration-core.ts`. It is complete and tested.
- Do NOT modify `getMenuById()` in `lib/menus/actions.ts`.
- Do NOT modify any existing server actions or components.
- Do NOT add `'use server'` to the bridge file.
- Do NOT run `drizzle-kit push` or apply the migration.
- Do NOT add any new npm dependencies.
- Do NOT create test files (tests exist for orchestration-core already).
- Do NOT touch the menu editor UI. Component field editing is a separate spec.

---

## Verification

After building, these should be true:

1. `npx tsc --noEmit --skipLibCheck` passes
2. `npx next build --no-lint` passes
3. The migration file exists at `database/migrations/20260425000014_component_orchestration_columns.sql`
4. The bridge file exists at `lib/service-execution/orchestration-bridge.ts`
5. The panel component exists at `components/events/orchestration-plan-panel.tsx`
6. The ops tab imports and renders `OrchestrationPlanPanel`
7. `getEventOrchestrationPlan` is exported from `lib/service-execution/actions.ts`

---

## Files Created (3)

1. `database/migrations/20260425000014_component_orchestration_columns.sql`
2. `lib/service-execution/orchestration-bridge.ts`
3. `components/events/orchestration-plan-panel.tsx`

## Files Modified (1)

1. `lib/service-execution/actions.ts` - add `getEventOrchestrationPlan()` export at bottom
2. `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` - add import + render `OrchestrationPlanPanel`
