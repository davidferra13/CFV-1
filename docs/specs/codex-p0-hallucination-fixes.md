# Codex Build Spec: P0 Hallucination Fixes

> Priority: P0 (highest). These are live violations of ChefFlow's Zero Hallucination rule.
> Risk: LOW. All changes are isolated, no new tables, no migrations, no architectural changes.

---

## Task 1: Fix carry-forward savings showing $0 on error

**File:** `app/(chef)/finance/page.tsx`
**Line:** 171
**Current:** `getYtdCarryForwardSavings().catch(() => 0)`
**Problem:** If the query fails, the user sees `$0.00` for carry-forward savings. This looks like real data (zero savings), not an error. This is a Zero Hallucination violation.

**Fix:**
Change line 171 from:

```ts
getYtdCarryForwardSavings().catch(() => 0),
```

to:

```ts
getYtdCarryForwardSavings().catch(() => null),
```

Then update every place in the same file where `carryForwardSavings` is rendered. Instead of displaying the number directly, add a null check:

- If `carryForwardSavings === null`, display `--` (two dashes) instead of a dollar amount
- If `carryForwardSavings === 0`, display `$0.00` (this is a real value)

**DO NOT** change any other file. Only `app/(chef)/finance/page.tsx`.

**Verification:** Search the file for `carryForwardSavings` and make sure every render path handles `null`.

---

## Task 2: Fix runwayMonths returning 0 instead of computing

**File:** `lib/intelligence/cashflow-projections.ts`
**Lines:** 135-138
**Current:**

```ts
let runwayMonths: number | null = null
if (avgNet < 0) {
  runwayMonths = 0 // can't calculate without cash balance, but flag the warning
}
```

**Problem:** When a chef is losing money (`avgNet < 0`), the system sets runway to 0 months instead of estimating how long they can sustain. The comment says "can't calculate without cash balance" but we CAN estimate from income vs burn rate.

**Fix:** Replace lines 135-138 with:

```ts
let runwayMonths: number | null = null
if (avgNet < 0) {
  // Estimate runway: how many months of income remain at current burn rate?
  // Use average monthly income as proxy for available cash (conservative)
  const avgIncome =
    historical.slice(-6).reduce((s, m) => s + m.incomeCents, 0) /
    Math.max(historical.slice(-6).length, 1)
  const monthlyLoss = Math.abs(avgNet)
  if (monthlyLoss > 0 && avgIncome > 0) {
    runwayMonths = Math.round((avgIncome / monthlyLoss) * 10) / 10
  } else {
    runwayMonths = 0
  }
}
```

**DO NOT** change the type signature. `runwayMonths` is already `number | null`. Do not change any other file.

---

## Task 3: Add row cap warning to financial queries

**File:** `lib/finance/tenant-financial-summary.ts` (or wherever `getTenantFinancialSummary` is defined)
**Problem:** Queries cap at 50,000 rows with `.limit(50_000)` but never warn the user if the cap is hit.

**Fix:** After the query runs, check if the returned row count equals the limit. If so, add a `truncated: true` field to the return value.

Find the function `getTenantFinancialSummary`. After the query that uses `.limit(50_000)`:

1. Check: `const truncated = (rows?.length ?? 0) >= 50_000`
2. Add `truncated` to the return object
3. In `app/(chef)/finance/page.tsx`, if `summary.truncated === true`, render a small amber warning banner: "Financial data may be incomplete. Contact support if you have over 50,000 transactions."

**If you cannot find the `.limit(50_000)` call or the function structure is unclear, SKIP this task entirely. Do not guess.**

---

## Rules for this spec

- DO NOT create new files
- DO NOT modify database schema
- DO NOT change any imports unless strictly necessary
- DO NOT touch any other financial logic
- Run `npx tsc --noEmit --skipLibCheck` after changes to verify no type errors
- Each task is independent. If one task is unclear, skip it and do the others
