# Codex Build Spec: International Readiness Layer

> **3 independent tasks. Each runs in its own Codex branch. No dependencies between them.**
> **After all 3 merge, a Claude Code session wires the formatting context (Phase 2).**

---

## Context

ChefFlow is hardcoded to US locale (USD, en-US, imperial units). International chef friends cannot use it. The pricing engine (OpenClaw) is US-only and stays US-only for now. This spec adds locale awareness to the 90% of ChefFlow that has zero pricing dependency.

**What already exists:**

- `lib/utils/format.ts` - centralized formatting that ALREADY accepts `{ locale, currency, timezone }` params
- `lib/utils/currency.ts` - competing `formatCurrency()` hardcoded to `en-US`, imported by 284 source files
- `lib/currency/frankfurter.ts` - currency conversion via free ECB API, 8 currencies, DO NOT TOUCH
- `chefs.timezone` column already exists (default `America/New_York`)
- Gift cards and ticket purchases already have `currency_code` columns

---

## TASK 1: Migration - Add Regional Columns to Chefs

**Files to create:**

- `database/migrations/20260426000007_chef_regional_settings.sql`

**Exact SQL:**

```sql
-- Add regional settings to chefs table for international support
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-US';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS measurement_system text NOT NULL DEFAULT 'imperial';

-- Add CHECK constraints
ALTER TABLE chefs ADD CONSTRAINT chk_chefs_currency_code
  CHECK (currency_code IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN'));

ALTER TABLE chefs ADD CONSTRAINT chk_chefs_measurement_system
  CHECK (measurement_system IN ('imperial', 'metric'));
```

**That is the entire task. Do not:**

- Modify any other file
- Touch types/database.ts (it's auto-generated)
- Run drizzle-kit push
- Add columns to any other table

---

## TASK 2: Consolidate Currency Formatting

**Goal:** Make `lib/utils/currency.ts` a thin re-export shim that delegates to `lib/utils/format.ts`. Zero behavioral change for all 284 importing files.

**File to modify: `lib/utils/currency.ts`**

Replace the ENTIRE contents with:

```ts
// Currency formatting utilities
// Thin re-export from lib/utils/format.ts (the canonical implementation)
// This file exists because 284 files import from this path.
// All formatting logic lives in lib/utils/format.ts.

export { formatCurrency, parseCurrencyToCents, formatCentsToDisplay } from '@/lib/utils/format'
```

**That is the entire task. Do not:**

- Modify lib/utils/format.ts
- Modify lib/currency/frankfurter.ts
- Change any import paths in any other file
- Add new exports or functions

**Verification:** After this change, `formatCurrency(1500)` still returns `"$15.00"` everywhere. The only difference is the implementation now lives in one place.

---

## TASK 3: Regional Settings UI + Server Action

**Goal:** Add a "Regional Settings" section to the chef settings page with currency, locale, and measurement system dropdowns. Add the server action to save them.

### 3A. Server Action

**File to modify: `lib/chef/actions.ts`**

Add this AFTER the existing `updateChefPreferences` function (around line 385+). Do not modify any existing functions.

```ts
// ============================================
// REGIONAL SETTINGS
// ============================================

const regionalSettingsSchema = z.object({
  currencyCode: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN']),
  locale: z.enum(['en-US', 'en-GB', 'en-AU', 'en-CA', 'fr-FR', 'es-MX', 'ja-JP', 'de-CH']),
  measurementSystem: z.enum(['imperial', 'metric']),
})

export type RegionalSettings = z.infer<typeof regionalSettingsSchema>

export async function getRegionalSettings(): Promise<RegionalSettings> {
  const chef = await requireChef()
  const db = createServerClient()
  const rows = await db.execute(
    `SELECT currency_code, locale, measurement_system FROM chefs WHERE id = $1`,
    [chef.tenantId]
  )
  const row = rows[0]
  if (!row) {
    return { currencyCode: 'USD', locale: 'en-US', measurementSystem: 'imperial' }
  }
  return {
    currencyCode: (row.currency_code as string) || 'USD',
    locale: (row.locale as string) || 'en-US',
    measurementSystem: (row.measurement_system as string) || 'imperial',
  }
}

export async function updateRegionalSettings(input: RegionalSettings) {
  const chef = await requireChef()
  const parsed = regionalSettingsSchema.parse(input)
  const db = createServerClient()

  await db.execute(
    `UPDATE chefs
     SET currency_code = $1, locale = $2, measurement_system = $3, updated_at = now()
     WHERE id = $4`,
    [parsed.currencyCode, parsed.locale, parsed.measurementSystem, chef.tenantId]
  )

  revalidatePath('/settings')
  revalidateTag(`chef-${chef.tenantId}`)
  return { success: true }
}
```

### 3B. Settings UI Component

**File to create: `components/settings/regional-settings-form.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateRegionalSettings, type RegionalSettings } from '@/lib/chef/actions'

const CURRENCIES = [
  { code: 'USD', label: 'USD - US Dollar ($)' },
  { code: 'EUR', label: 'EUR - Euro (\u20ac)' },
  { code: 'GBP', label: 'GBP - British Pound (\u00a3)' },
  { code: 'CAD', label: 'CAD - Canadian Dollar (CA$)' },
  { code: 'AUD', label: 'AUD - Australian Dollar (A$)' },
  { code: 'JPY', label: 'JPY - Japanese Yen (\u00a5)' },
  { code: 'CHF', label: 'CHF - Swiss Franc' },
  { code: 'MXN', label: 'MXN - Mexican Peso (MX$)' },
] as const

const LOCALES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'de-CH', label: 'German (Switzerland)' },
] as const

const MEASUREMENT_SYSTEMS = [
  { code: 'imperial', label: 'Imperial (oz, lb, cups, F)' },
  { code: 'metric', label: 'Metric (g, kg, mL, C)' },
] as const

export function RegionalSettingsForm({ initial }: { initial: RegionalSettings }) {
  const [currency, setCurrency] = useState(initial.currencyCode)
  const [locale, setLocale] = useState(initial.locale)
  const [measurement, setMeasurement] = useState(initial.measurementSystem)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(false)
    startTransition(async () => {
      try {
        await updateRegionalSettings({
          currencyCode: currency as RegionalSettings['currencyCode'],
          locale: locale as RegionalSettings['locale'],
          measurementSystem: measurement as RegionalSettings['measurementSystem'],
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        console.error('Failed to save regional settings:', err)
      }
    })
  }

  const hasChanges =
    currency !== initial.currencyCode ||
    locale !== initial.locale ||
    measurement !== initial.measurementSystem

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date and Number Format
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Measurement System</label>
        <select
          value={measurement}
          onChange={(e) => setMeasurement(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {MEASUREMENT_SYSTEMS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || !hasChanges}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : saved ? 'Saved' : 'Save Regional Settings'}
      </button>
    </div>
  )
}
```

### 3C. Wire into Settings Page

**File to modify: `app/(chef)/settings/page.tsx`**

1. Add import at top (with the other imports):

```ts
import { getRegionalSettings } from '@/lib/chef/actions'
import { RegionalSettingsForm } from '@/components/settings/regional-settings-form'
```

2. In the page's server component function, add this data fetch (alongside the other existing fetches):

```ts
const regionalSettings = await getRegionalSettings()
```

3. Add a new `<SettingsCategory>` section. Place it AFTER the "Timezone" or "Preferences" section and BEFORE "Integrations". Use this exact JSX:

```tsx
<SettingsCategory
  label="Regional Settings"
  description="Currency, date format, and measurement units"
>
  <RegionalSettingsForm initial={regionalSettings} />
</SettingsCategory>
```

**Do not:**

- Remove or modify any existing settings sections
- Change any existing imports
- Modify the SettingsCategory component itself
- Add any other UI elements outside the Regional Settings section

---

## What Codex Must NOT Do (All Tasks)

1. Do not modify `lib/currency/frankfurter.ts`
2. Do not modify `types/database.ts`
3. Do not run `drizzle-kit push` or any migration commands
4. Do not modify any test files
5. Do not add em dashes anywhere (use commas, semicolons, or separate sentences)
6. Do not use the word "OpenClaw" in any UI-facing string
7. Do not delete any existing functions or exports
8. Do not modify any file in `obsidian_export/`

---

## Phase 2 (Claude Code, NOT Codex)

After all 3 tasks merge, Claude Code will:

1. Create a `useFormatContext()` hook that reads chef regional settings
2. Wire formatting through key surfaces (incremental, page-by-page)
3. Add `hasPricingCoverage` gating on OpenClaw-dependent surfaces
4. Add unit conversion utilities for metric/imperial display
5. Regenerate `types/database.ts`

Phase 2 requires architectural judgment. Codex should not attempt it.
