# Service Execution Sheet — Implementation

## What Changed

Enhanced `lib/documents/generate-execution-sheet.ts` to add three spec-required sections that were missing from the original implementation.

## Changes

### 1. Arrival Tasks Section

A new "ON ARRIVAL — START IMMEDIATELY" section is derived automatically from component data — no new DB columns needed. Two criteria trigger a component being included:

- **`make_ahead_window_hours > 0`** — item was prepped at home but needs finishing on-site (re-churn gelato, reheat braise). Sorted by hours descending (longest lead time first).
- **Long-cook keyword match in `execution_notes`** — items cooked on-site that need a long lead time: `sous vide`, `oven`, `slow`, `braise`, `roast`, `bake`, `reheat`, `warm`.

A `make_ahead_window_hours` column was added to the component data query (it existed in the DB already but wasn't being fetched).

### 2. BOH Rename + Component Emphasis

The back-of-house section was renamed from "BACK OF HOUSE — COMPONENT BREAKDOWN" to **"COURSE EXECUTION"**, matching the spec's terminology.

### 3. Clean-As-You-Go Reminder

Added bold text before the summary line:
> `Clean as you go. Kitchen to baseline before dessert.`

### 4. Font Scaling

Density calculation now includes arrival tasks in addition to components:
```typescript
const densityFactor = totalComponentCount + arrivalTasks.length
```

## Files Changed

- `lib/documents/generate-execution-sheet.ts` — data fetch + arrival task derivation + render changes

## No Migration Required

All data used (component names, execution_notes, is_make_ahead, make_ahead_window_hours, course names) was already in the schema. Only the query was expanded to fetch `make_ahead_window_hours`.

## Verification

Navigate to any event with a menu → Documents section → View Execution Sheet PDF. Should now show:
1. Header + FOH courses
2. Allergy warnings
3. "ON ARRIVAL — START IMMEDIATELY" section (if any components qualify)
4. "COURSE EXECUTION" section with numbered components
5. "Clean as you go" bold text
6. Footer
