# Spec: Prep Timeline Professional Grade Upgrade

> **Status:** ready-to-build
> **Priority:** P0 (culinary school quality bar)
> **Depends on:** recipe-peak-windows (complete)
> **Estimated complexity:** medium (6 files modified, 1 migration, 1 new file, ~15 new tests)

## Timeline

| Event   | Date       | Agent/Session | Commit |
| ------- | ---------- | ------------- | ------ |
| Created | 2026-04-23 | Opus planner  |        |

---

## What This Does (Plain English)

Three critical fixes and two high-value upgrades to make ChefFlow's prep timeline pass the culinary school quality bar. No new pages, no new routes. Extends the existing prep timeline engine and UI with: (1) active vs passive time per task, (2) hold classification per dish, (3) prep tier for dependency ordering, (4) food safety corrections, and (5) station grouping in the timeline UI.

## Why It Matters

The audit scored 65/100. Three findings would make a culinary instructor say "this is wrong":

- `totalPrepMinutes` treats all time as sequential, overstating workload by 2-3x for braise-heavy menus
- The 90F+ ambient / 2-hour FDA rule is missing from the food safety library
- Cold holding displays 40F in one file and 41F in another

Two upgrades cross the threshold from "functional" to "professionally rigorous":

- Hold classification tells the chef whether to plate immediately, hold warm, or hold cold and reheat
- Prep tier ordering ensures stocks are scheduled before sauces, doughs before fillings

---

## Architecture & Integration Points

All changes extend existing files. No new routes, no new pages, no new server actions beyond what exists.

```
Database:  recipes table (4 new nullable columns)
Backend:   lib/prep-timeline/compute-timeline.ts (extend types + computation)
           lib/prep-timeline/peak-defaults.ts (add prep_tier + hold_class defaults)
           lib/prep-timeline/actions.ts (extend updateRecipePeakWindow input)
           lib/constants/food-safety.ts (add HIGH_AMBIENT_RULE, fix nothing else)
           lib/compliance/constants.ts (fix cold_holding 40->41)
           lib/events/fire-order.ts (already has inferStation, no changes needed)
Frontend:  app/(chef)/events/[id]/_components/event-detail-prep-tab.tsx (extend UI)
           lib/ui/symbol-registry.ts (add 3 new symbols)
Tests:     tests/unit/prep-timeline.compute.test.ts (extend with ~15 new tests)
```

**Data flow (unchanged):** `getEventPrepTimeline()` queries DB -> builds `TimelineRecipeInput[]` -> passes to `computePrepTimeline()` pure function -> returns `PrepTimeline` -> rendered by `EventDetailPrepTab`.

**No new server actions.** The existing `updateRecipePeakWindow` action gets 4 new optional fields. The existing `getEventPrepTimeline` query adds 4 columns to its recipe SELECT.

---

## Step-by-Step Build Sequence

### Step 1: Migration (database)

**File:** `database/migrations/20260423000002_prep_timeline_professional.sql`

```sql
-- Prep Timeline Professional Grade Upgrade
-- Adds active/passive time split, hold classification, and prep tier to recipes.
-- Purely additive: new nullable columns. No data loss risk.

-- Active vs passive prep time (split of existing prep_time_minutes)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active_prep_minutes INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS passive_prep_minutes INTEGER;

-- Hold classification: how the finished dish behaves at service
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS hold_class TEXT
  CHECK (hold_class IN ('serve_immediately', 'hold_warm', 'hold_cold_reheat'));

-- Prep tier: dependency ordering for mise en place sequencing
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_tier TEXT
  CHECK (prep_tier IN ('base', 'secondary', 'tertiary', 'finishing'));

-- Constraints
ALTER TABLE recipes ADD CONSTRAINT chk_active_prep_positive
  CHECK (active_prep_minutes >= 0 OR active_prep_minutes IS NULL);
ALTER TABLE recipes ADD CONSTRAINT chk_passive_prep_positive
  CHECK (passive_prep_minutes >= 0 OR passive_prep_minutes IS NULL);

-- Comments
COMMENT ON COLUMN recipes.active_prep_minutes IS 'Hands-on active prep time in minutes (chopping, searing, assembling)';
COMMENT ON COLUMN recipes.passive_prep_minutes IS 'Unattended passive time in minutes (simmering, resting, chilling, proofing)';
COMMENT ON COLUMN recipes.hold_class IS 'Service hold behavior: serve_immediately (plate within minutes), hold_warm (can sit at 135F+), hold_cold_reheat (make ahead, reheat before service)';
COMMENT ON COLUMN recipes.prep_tier IS 'Mise en place dependency tier: base (stocks, blanching liquids), secondary (mother sauces, doughs, marinades), tertiary (filled pastas, compound preps), finishing (garnishes, a la minute)';
```

**Validation:** columns are nullable, no data loss, no existing column changes.

---

### Step 2: Food Safety Fixes (constants)

#### 2a. Add HIGH_AMBIENT_RULE to `lib/constants/food-safety.ts`

After the `DANGER_ZONE` constant (line 230), add:

```typescript
export const HIGH_AMBIENT_RULE: DangerZoneRule = {
  id: 'high-ambient',
  label: 'High Ambient Temperature Rule (90F+)',
  rangeFahrenheit: { min: 90, max: 999 },
  rangeCelsius: { min: 32, max: 999 },
  maxDuration: '1 hour',
  action:
    'When ambient temperature exceeds 90F (32C), food in the danger zone must be discarded after 1 hour instead of 4. Applies to outdoor events, hot kitchens without AC, and transport in summer.',
  source: 'FDA Food Code 3-501.19, USDA Food Safety Education',
}
```

Add a helper after `isInDangerZone()`:

```typescript
/**
 * Check if high-ambient rule applies (food must be discarded after 1 hour, not 4).
 */
export function isHighAmbientRisk(ambientTempF: number): boolean {
  return ambientTempF >= 90
}
```

#### 2b. Fix cold holding inconsistency in `lib/compliance/constants.ts`

Change line 7:

- **Old:** `cold_holding: { max: 40, label: '≤ 40°F' },`
- **New:** `cold_holding: { max: 41, label: '≤ 41°F' },`

Also fix line 6 (receiving):

- **Old:** `receiving: { max: 40, label: '≤ 40°F for cold; ≥ 140°F for hot' },`
- **New:** `receiving: { max: 41, label: '≤ 41°F for cold; ≥ 135°F for hot' },`

Rationale: FDA Food Code 2022 uses 41F and 135F. The existing `food-safety.ts` already uses these values. This aligns the compliance display constants.

Also fix hot_holding on line 8:

- **Old:** `hot_holding: { min: 140, label: '≥ 140°F' },`
- **New:** `hot_holding: { min: 135, label: '≥ 135°F' },`

Rationale: FDA says 135F for hot holding, not 140F. The authoritative `food-safety.ts` already has 135F. This file was using the older ServSafe value.

---

### Step 3: Extend peak-defaults.ts

Add default `prepTier` and `holdClass` per category to the existing `CATEGORY_DEFAULTS`. Extend the `PeakWindow` type:

```typescript
export type HoldClass = 'serve_immediately' | 'hold_warm' | 'hold_cold_reheat'
export type PrepTier = 'base' | 'secondary' | 'tertiary' | 'finishing'

export interface PeakWindow {
  peakHoursMin: number
  peakHoursMax: number
  safetyHoursMax: number
  storageMethod: StorageMethod
  freezable: boolean
  holdClass: HoldClass // NEW
  prepTier: PrepTier // NEW
}
```

Category default additions (add `holdClass` and `prepTier` to each entry):

| Category  | holdClass         | prepTier  | Rationale                                                      |
| --------- | ----------------- | --------- | -------------------------------------------------------------- |
| sauce     | hold_warm         | secondary | Mother sauces hold well; depend on stock (base)                |
| protein   | serve_immediately | finishing | Most proteins plate within minutes of cooking                  |
| starch    | hold_warm         | tertiary  | Potatoes, rice hold warm; filled pasta is compound             |
| vegetable | serve_immediately | tertiary  | Best fresh; compound preps from bases                          |
| fruit     | hold_cold_reheat  | tertiary  | Compotes, garnishes; prepped from base syrups                  |
| dessert   | hold_cold_reheat  | tertiary  | Most desserts hold cold, reheat/temper before service          |
| bread     | hold_warm         | secondary | Doughs are secondary; hold warm at service                     |
| pasta     | hold_cold_reheat  | secondary | Doughs/fresh pasta is secondary tier                           |
| soup      | hold_warm         | secondary | Soups hold warm; built from stock (base)                       |
| salad     | serve_immediately | finishing | Dressed salads die fast                                        |
| appetizer | serve_immediately | tertiary  | Composed; plate fresh                                          |
| condiment | hold_cold_reheat  | base      | Pickles, vinaigrettes are base-tier (made first, last forever) |
| beverage  | hold_cold_reheat  | base      | Syrups, infusions made far in advance                          |
| other     | serve_immediately | tertiary  | Conservative default                                           |

Update `FALLBACK_DEFAULT` with `holdClass: 'serve_immediately'` and `prepTier: 'tertiary'`.

Update `resolvePeakWindow()` to resolve `holdClass` and `prepTier` from recipe fields or category defaults, same pattern as existing fields.

---

### Step 4: Extend compute-timeline.ts

#### 4a. Extend types

Add to `TimelineRecipeInput`:

```typescript
activeMinutes: number | null
passiveMinutes: number | null
holdClass: string | null
prepTier: string | null
```

Add to `PrepItem`:

```typescript
activeMinutes: number // hands-on time (fallback: prepTimeMinutes)
passiveMinutes: number // passive time (fallback: 0)
holdClass: HoldClass
prepTier: PrepTier
```

Add new symbol values to `PrepSymbol`:

```typescript
export type PrepSymbol =
  | 'freezable'
  | 'day_of'
  | 'fresh'
  | 'safety_warning'
  | 'allergen'
  | 'serve_immediately'
  | 'hold_warm' // NEW hold class symbols
```

Add to `PrepDay`:

```typescript
activeMinutes: number // NEW: sum of active time only
passiveMinutes: number // NEW: sum of passive time only
```

#### 4b. Update computation

In the `prepItems.map()` block (around line 128), resolve the new fields:

```typescript
activeMinutes: item.activeMinutes ?? item.prepTimeMinutes,
passiveMinutes: item.passiveMinutes ?? 0,
holdClass: (item.holdClass as HoldClass) ?? resolved.holdClass,
prepTier: (item.prepTier as PrepTier) ?? resolved.prepTier,
```

Add hold class symbols (after allergen check, around line 126):

```typescript
if (resolved.holdClass === 'serve_immediately') symbols.push('serve_immediately')
else if (resolved.holdClass === 'hold_warm') symbols.push('hold_warm')
```

#### 4c. Sort by prep tier within each day

Replace the current sort (line 217):

```typescript
// OLD: items: dayItems.sort((a, b) => b.prepTimeMinutes - a.prepTimeMinutes)
```

With tier-aware sort:

```typescript
const TIER_ORDER: Record<PrepTier, number> = {
  base: 0,
  secondary: 1,
  tertiary: 2,
  finishing: 3,
}

items: dayItems.sort((a, b) => {
  // Primary: prep tier (base first)
  const tierDiff = TIER_ORDER[a.prepTier] - TIER_ORDER[b.prepTier]
  if (tierDiff !== 0) return tierDiff
  // Secondary: longest active time first
  return b.activeMinutes - a.activeMinutes
}),
```

#### 4d. Compute active/passive totals per day

In the `PrepDay` construction (around line 218):

```typescript
totalPrepMinutes: dayItems.reduce((sum, i) => sum + i.prepTimeMinutes, 0),
activeMinutes: dayItems.reduce((sum, i) => sum + i.activeMinutes, 0),
passiveMinutes: dayItems.reduce((sum, i) => sum + i.passiveMinutes, 0),
```

---

### Step 5: Extend actions.ts

#### 5a. Extend `updateRecipePeakWindow` input type

Add 4 optional fields:

```typescript
activeMinutes: number | null
passiveMinutes: number | null
holdClass: string | null
prepTier: string | null
```

Add to the `.update()` call:

```typescript
active_prep_minutes: input.activeMinutes,
passive_prep_minutes: input.passiveMinutes,
hold_class: input.holdClass,
prep_tier: input.prepTier,
```

Add validation:

```typescript
if (
  input.holdClass != null &&
  !['serve_immediately', 'hold_warm', 'hold_cold_reheat'].includes(input.holdClass)
) {
  return { success: false, error: 'Invalid hold class.' }
}
if (
  input.prepTier != null &&
  !['base', 'secondary', 'tertiary', 'finishing'].includes(input.prepTier)
) {
  return { success: false, error: 'Invalid prep tier.' }
}
```

#### 5b. Extend `getEventPrepTimeline` recipe SELECT

Change the recipe select (line 154) to include 4 new columns:

```
'id, name, category, peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, frozen_extends_hours, prep_time_minutes, dietary_tags, active_prep_minutes, passive_prep_minutes, hold_class, prep_tier'
```

In the `timelineItems` mapping (line 196), add:

```typescript
activeMinutes: recipe?.active_prep_minutes ?? null,
passiveMinutes: recipe?.passive_prep_minutes ?? null,
holdClass: recipe?.hold_class ?? null,
prepTier: recipe?.prep_tier ?? null,
```

---

### Step 6: Extend symbol-registry.ts

Add to the 'Timeline' category:

```typescript
{
  id: 'serve_immediately',
  label: 'Serve immediately',
  description: 'Must be plated within minutes of cooking',
  icon: 'Flame',
  color: 'text-red-400',
},
{
  id: 'hold_warm',
  label: 'Can hold warm',
  description: 'Holds safely at 135F+ for service',
  icon: 'Thermometer',
  color: 'text-amber-400',
},
{
  id: 'prep_tier_base',
  label: 'Base prep',
  description: 'Stocks, blanching liquids, base preparations (prep first)',
  icon: 'Layers',
  color: 'text-violet-400',
},
```

---

### Step 7: Extend event-detail-prep-tab.tsx

#### 7a. Add SymbolIcon cases for new symbols

```typescript
case 'serve_immediately':
  return (
    <span title="Serve immediately">
      <Flame className="h-3.5 w-3.5 text-red-400" />
    </span>
  )
case 'hold_warm':
  return (
    <span title="Can hold warm">
      <Thermometer className="h-3.5 w-3.5 text-amber-400" />
    </span>
  )
```

Import `Thermometer` from `@/components/ui/icons`.

#### 7b. Show active/passive time split in PrepItemRow

Replace the time display (currently just `formatPrepTime(item.prepTimeMinutes)`) with:

```typescript
<div className="flex items-center gap-1 text-xs text-stone-500 flex-shrink-0">
  <Clock className="h-3 w-3" />
  {item.passiveMinutes > 0 ? (
    <span title={`${formatPrepTime(item.activeMinutes)} active + ${formatPrepTime(item.passiveMinutes)} passive`}>
      {formatPrepTime(item.activeMinutes)}
      <span className="text-stone-600"> + {formatPrepTime(item.passiveMinutes)}</span>
    </span>
  ) : (
    formatPrepTime(item.prepTimeMinutes)
  )}
</div>
```

#### 7c. Show active/passive totals in DayCard header

Replace `formatPrepTime(day.totalPrepMinutes) total` with:

```typescript
{day.activeMinutes > 0 && day.passiveMinutes > 0 ? (
  <span title={`${formatPrepTime(day.activeMinutes)} hands-on, ${formatPrepTime(day.passiveMinutes)} passive`}>
    {formatPrepTime(day.activeMinutes)} active
  </span>
) : (
  <span>{formatPrepTime(day.totalPrepMinutes)} total</span>
)}
```

#### 7d. Show prep tier labels on base-tier items

For items with `prepTier === 'base'`, add a small badge:

```typescript
{item.prepTier === 'base' && (
  <Badge variant="default" className="text-[10px] px-1 py-0">base</Badge>
)}
```

This visually communicates "do this first" without cluttering non-base items.

---

### Step 8: Tests

Add to `tests/unit/prep-timeline.compute.test.ts`:

```
1.  active/passive minutes resolve from input (active=20, passive=120 -> activeMinutes=20, passiveMinutes=120)
2.  active/passive fallback (null -> activeMinutes = prepTimeMinutes, passiveMinutes = 0)
3.  PrepDay.activeMinutes sums active time only
4.  PrepDay.passiveMinutes sums passive time only
5.  holdClass resolves from input
6.  holdClass falls back to category default
7.  serve_immediately symbol added for serve_immediately holdClass
8.  hold_warm symbol added for hold_warm holdClass
9.  hold_cold_reheat gets no hold symbol (it's the quiet default)
10. prepTier resolves from input
11. prepTier falls back to category default
12. items sorted by tier within a day (base before secondary before tertiary)
13. within same tier, sorted by active minutes descending
14. condiment category defaults to prepTier=base
15. protein category defaults to prepTier=finishing
```

---

## Validation Criteria

Each criterion is binary pass/fail:

1. **Migration applies cleanly.** `psql -f database/migrations/20260423000002_prep_timeline_professional.sql` exits 0 on existing DB.
2. **Type check passes.** `npx tsc --noEmit --skipLibCheck` exits 0.
3. **All 20 existing prep timeline tests pass.** No regressions.
4. **All ~15 new tests pass.**
5. **Food safety constants consistent.** `grep -r "max: 40" lib/compliance/` returns 0 results. `grep -r "min: 140" lib/compliance/` returns 0 results.
6. **HIGH_AMBIENT_RULE exported and findable.** `grep "HIGH_AMBIENT_RULE" lib/constants/food-safety.ts` returns a match.
7. **Active/passive time displays correctly** in the prep tab when a recipe has both fields set. When neither is set, shows total time (backward compatible).
8. **Prep tier ordering visible.** Base-tier items appear above secondary-tier items on the same day card.
9. **Hold class symbols render.** Items with `serve_immediately` show red flame; items with `hold_warm` show amber thermometer.
10. **Next build succeeds.** `npx next build --no-lint` exits 0.

---

## What This Does NOT Do

- No new pages or routes
- No new server actions (extends existing one)
- No schema changes to components table (all new fields on recipes)
- No cooking timers (separate feature, out of scope)
- No Gantt chart or parallel task visualization (separate feature)
- No station grouping filter in UI (data exists via `inferStation()` but activating it requires the fire order system which is deferred pending `menu_sections` table)
- No changes to the older `lib/events/prep-timeline.ts` system (it will continue to work as-is)

---

## Edge Cases & Failure States

| Scenario                                            | Behavior                                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Recipe has no active/passive minutes set            | Falls back to `prepTimeMinutes` as all-active, 0 passive. Backward compatible.                                        |
| Recipe has no hold_class set                        | Falls back to category default from `peak-defaults.ts`.                                                               |
| Recipe has no prep_tier set                         | Falls back to category default.                                                                                       |
| active + passive != prep_time_minutes               | No constraint enforced. Chef may set them independently. Display uses active/passive when available, total otherwise. |
| Unknown hold_class value in DB                      | Server action rejects with error. UI treats as no symbol.                                                             |
| Unknown prep_tier value in DB                       | Server action rejects with error. Sort treats as tertiary (safe middle-ground).                                       |
| Recipe with prep_tier=base on same day as finishing | Base sorts first. Correct behavior.                                                                                   |
| All items on a day are passive-heavy (braising day) | activeMinutes shows low number, communicating "easy day."                                                             |
