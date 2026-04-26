# Spec: Configurable Overhead % and Labor Rate in Plate Cost

> **Status:** ready
> **Priority:** P0 (BLOCKER from Arthur Klein stress test)
> **Estimated effort:** 2-4 hours
> **Risk level:** LOW (additive columns, no existing data changes)

## What This Does (Plain English)

The true plate cost calculation uses hardcoded `DEFAULT_OVERHEAD_PERCENT = 15` and `DEFAULT_HOURLY_RATE_CENTS = 5000` ($50/hr). These should come from the chef's pricing config instead. This spec adds two columns to `chef_pricing_config`, two fields to the settings form, and threads the values through the plate cost calculator.

## Why It Matters

Any chef whose overhead is not exactly 15% or whose hourly rate is not exactly $50/hr sees wrong plate cost numbers. This makes the entire costing pipeline untrustworthy for precision-focused operators.

---

## Step 1: Database Migration

**Create file:** `database/migrations/20260426000005_pricing_config_overhead_labor.sql`

```sql
-- Add configurable overhead % and hourly labor rate to chef pricing config.
-- These were previously hardcoded as 15% overhead and $50/hr (5000 cents).
-- Defaults match the old hardcoded values so existing data is unchanged.

ALTER TABLE chef_pricing_config
  ADD COLUMN IF NOT EXISTS overhead_percent INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER NOT NULL DEFAULT 5000;

COMMENT ON COLUMN chef_pricing_config.overhead_percent IS 'Overhead as % of ingredient cost (e.g. 15 = 15%). Used in true plate cost.';
COMMENT ON COLUMN chef_pricing_config.hourly_rate_cents IS 'Chef hourly labor rate in cents (e.g. 5000 = $50/hr). Used in true plate cost.';
```

**Rules:**

- DO NOT modify any existing columns
- DO NOT drop anything
- Defaults match existing hardcoded values (15 and 5000) so zero data impact

---

## Step 2: Update Zod schema in config-actions.ts

**File:** `lib/pricing/config-actions.ts`

Add these two fields to `pricingConfigSchema` (the `z.object({...})` near the top of the file), next to the existing `mileage_rate_cents` field:

```typescript
overhead_percent: z.number().int().min(0).max(100).optional(),
hourly_rate_cents: z.number().int().min(0).optional(),
```

**Rules:**

- Add ONLY these two lines
- Place them after `mileage_rate_cents` for logical grouping
- Do NOT change any existing schema fields
- Do NOT change any function signatures or logic

---

## Step 3: Update the pricing config form UI

**File:** `components/settings/pricing-config-form.tsx`

**3a.** Add defaults to the DEFAULTS object (find the line `mileage_rate_cents: 70,` and add after it):

```typescript
overhead_percent: 15,
hourly_rate_cents: 5000,
```

**3b.** Add two input fields in the same section as the mileage rate input. Find the mileage rate `<Input>` block and add AFTER its closing `</div>`:

```tsx
<div>
  <Input
    label="Overhead (%)"
    type="number"
    value={config.overhead_percent}
    onChange={(e) => update('overhead_percent', parseInt(e.target.value, 10) || 0)}
    helperText={
      config.overhead_percent === DEFAULTS.overhead_percent
        ? '15% of ingredient cost (industry default)'
        : `System default: ${DEFAULTS.overhead_percent}%`
    }
  />
</div>
<div>
  <Input
    label="Hourly Labor Rate (cents)"
    type="number"
    value={config.hourly_rate_cents}
    onChange={(e) => update('hourly_rate_cents', parseInt(e.target.value, 10) || 0)}
    helperText={
      config.hourly_rate_cents === DEFAULTS.hourly_rate_cents
        ? `$${(DEFAULTS.hourly_rate_cents / 100).toFixed(2)}/hr (default)`
        : `System default: $${(DEFAULTS.hourly_rate_cents / 100).toFixed(2)}/hr`
    }
  />
</div>
```

**Rules:**

- Copy the EXACT pattern used by the mileage_rate_cents input
- Do NOT rewrite or restructure the form
- Do NOT change any existing inputs

---

## Step 4: Thread values through plate-cost-actions.ts

**File:** `lib/pricing/plate-cost-actions.ts`

**4a.** Change the select query (around line 142) from:

```typescript
.select('mileage_rate_cents')
```

to:

```typescript
.select('mileage_rate_cents, overhead_percent, hourly_rate_cents')
```

**4b.** After the existing `if (pricingConfig?.mileage_rate_cents)` block (around line 148), add:

```typescript
let overheadPercent = DEFAULT_OVERHEAD_PERCENT
if (pricingConfig?.overhead_percent != null) {
  overheadPercent = pricingConfig.overhead_percent
}
if (pricingConfig?.hourly_rate_cents) {
  hourlyRateCents = pricingConfig.hourly_rate_cents
}
```

**4c.** In the `calculateTruePlateCost()` call (around line 164), change:

```typescript
overheadPercent: DEFAULT_OVERHEAD_PERCENT,
```

to:

```typescript
overheadPercent,
```

**Rules:**

- Do NOT change the `calculateTruePlateCost` function itself (it already accepts these as parameters)
- Do NOT change the `TruePlateCostInput` type (it already has these fields)
- Do NOT change any other part of plate-cost-actions.ts
- The variable `hourlyRateCents` already exists (line 139), just update its value conditionally

---

## Files Changed (Complete List)

| File                                                                   | Change                                 |
| ---------------------------------------------------------------------- | -------------------------------------- |
| `database/migrations/20260426000005_pricing_config_overhead_labor.sql` | NEW - additive migration               |
| `lib/pricing/config-actions.ts`                                        | ADD 2 fields to Zod schema             |
| `components/settings/pricing-config-form.tsx`                          | ADD 2 defaults + 2 input fields        |
| `lib/pricing/plate-cost-actions.ts`                                    | READ 2 new columns, pass to calculator |

## Files NOT Changed (Do Not Touch)

- `lib/formulas/true-plate-cost.ts` -- already accepts overhead_percent and hourly_rate_cents as parameters
- `components/culinary/true-cost-breakdown.tsx` -- reads from plate-cost-actions, auto-benefits
- `lib/pricing/config-types.ts` -- if it exists and has a type, add the fields there too; if it auto-generates from DB, skip

## Verification

1. Go to `/settings/pricing`
2. Set overhead to 22%, hourly rate to 7500 (=$75/hr)
3. Save
4. Go to any event with a menu and plate cost breakdown
5. Verify overhead line uses 22%, not 15%
6. Verify labor uses $75/hr, not $50/hr

## DO NOT

- Run `drizzle-kit push` -- migration file only, developer applies manually
- Change any existing column defaults
- Add any AI features
- Modify the true-plate-cost.ts pure function
- Touch any other settings page
