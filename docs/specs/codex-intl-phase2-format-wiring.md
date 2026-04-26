# International Readiness Phase 2: Format Context Wiring

> **Status:** BUILD SPEC
> **Depends on:** Phase 1 (migration, currency shim, settings UI) - COMPLETE
> **Agent:** Claude Code (NOT Codex - requires multi-file architectural judgment)

---

## What Phase 1 Built

1. **Migration** `database/migrations/20260426000007_chef_regional_settings.sql` - added `currency_code`, `locale`, `measurement_system` to `chefs` table
2. **Currency shim** `lib/utils/currency.ts` - now re-exports from `lib/utils/format.ts` (284 files unchanged, zero regression)
3. **Settings UI** `components/settings/regional-settings-form.tsx` + server actions `getRegionalSettings()` / `updateRegionalSettings()` in `lib/chef/actions.ts`

## What Phase 2 Must Build

### Task A: Format Context Hook

**Create `lib/hooks/use-format-context.ts`**

This hook reads the chef's regional settings and returns formatting options that any component can consume.

```ts
'use client'

import { createContext, useContext } from 'react'

export interface FormatContext {
  locale: string
  currency: string
  timezone: string
  measurementSystem: 'imperial' | 'metric'
}

export const DEFAULT_FORMAT_CONTEXT: FormatContext = {
  locale: 'en-US',
  currency: 'USD',
  timezone: 'America/New_York',
  measurementSystem: 'imperial',
}

const FormatCtx = createContext<FormatContext>(DEFAULT_FORMAT_CONTEXT)

export const FormatProvider = FormatCtx.Provider

export function useFormatContext(): FormatContext {
  return useContext(FormatCtx)
}
```

### Task B: Wire Provider into Chef Layout

**Modify `app/(chef)/layout.tsx`**

The chef layout already fetches chef data. Add the regional settings to what it fetches, and wrap children in `<FormatProvider>`.

1. Import `FormatProvider` from `@/lib/hooks/use-format-context`
2. Import `getRegionalSettings` from `@/lib/chef/actions`
3. Fetch regional settings alongside existing data
4. Build the context value: `{ locale: settings.locale, currency: settings.currencyCode, timezone: chef.timezone, measurementSystem: settings.measurementSystem }`
5. Wrap the existing children render in `<FormatProvider value={contextValue}>`

**Important:** The chef layout is a server component. FormatProvider is a client component. You need a thin client wrapper component (e.g., `components/providers/format-provider-wrapper.tsx`) that accepts the serialized context as props and renders the FormatProvider. This is standard Next.js App Router pattern.

### Task C: Create Locale-Aware Format Helpers

**Modify `lib/utils/format.ts`**

Add a convenience function that accepts `FormatContext` directly:

```ts
/** Format cents using a FormatContext (from useFormatContext hook) */
export function formatCurrencyCtx(
  cents: number,
  ctx: { locale?: string; currency?: string }
): string {
  return formatCurrency(cents, { locale: ctx.locale, currency: ctx.currency })
}

/** Format a date using a FormatContext */
export function formatDateCtx(
  date: string | Date,
  ctx: { locale?: string; timezone?: string }
): string {
  return formatDate(date, { locale: ctx.locale, timezone: ctx.timezone })
}

/** Format a datetime using a FormatContext */
export function formatDateTimeCtx(
  date: string | Date,
  ctx: { locale?: string; timezone?: string }
): string {
  return formatDateTime(date, { locale: ctx.locale, timezone: ctx.timezone })
}
```

These are thin wrappers. The existing `formatCurrency`, `formatDate`, `formatDateTime` already accept these params. The `*Ctx` variants just bridge the hook shape to the function shape.

### Task D: Wire 5 High-Traffic Surfaces (Incremental)

Convert these 5 files to use `useFormatContext()` instead of bare `formatCurrency()`. These are the most-visited chef pages:

1. **`app/(chef)/dashboard/_sections/business-cards.tsx`** - dashboard financial cards
2. **`app/(chef)/events/page.tsx`** - events list with prices
3. **`app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`** - event financial detail
4. **`app/(chef)/finance/page.tsx`** - finance overview
5. **`components/quotes/quote-form.tsx`** - quote creation

**Pattern for each file:**

```tsx
// Before:
import { formatCurrency } from '@/lib/utils/currency'
// ... later:
formatCurrency(amount)

// After:
import { formatCurrencyCtx } from '@/lib/utils/format'
import { useFormatContext } from '@/lib/hooks/use-format-context'
// ... inside the component:
const fmt = useFormatContext()
// ... later:
formatCurrencyCtx(amount, fmt)
```

**Only convert files that are already client components** (`'use client'`). If a file is a server component, skip it for now (server components need a different pattern using `getRegionalSettings()` directly).

For server components in this list, use this pattern instead:

```tsx
import { getRegionalSettings } from '@/lib/chef/actions'
import { formatCurrency } from '@/lib/utils/format'
// ... inside the async server function:
const regional = await getRegionalSettings()
// ... later:
formatCurrency(amount, { locale: regional.locale, currency: regional.currencyCode })
```

### Task E: Pricing Engine Graceful Gate

**Create `lib/pricing/coverage-check.ts`**

```ts
/** Check if pricing intelligence is available for a chef's region */
export function hasPricingCoverage(currencyCode: string): boolean {
  // OpenClaw is US-only. Expand this list as coverage grows.
  return currencyCode === 'USD'
}
```

**Modify `app/(chef)/culinary/price-catalog/catalog-browser.tsx`**

At the top of the component, check coverage. If false, show a clean fallback:

```tsx
import { hasPricingCoverage } from '@/lib/pricing/coverage-check'
import { useFormatContext } from '@/lib/hooks/use-format-context'

// Inside the component:
const fmt = useFormatContext()
if (!hasPricingCoverage(fmt.currency)) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
      <p className="text-sm text-gray-600">
        Automated pricing is available for USD regions. Enter your ingredient costs manually on each
        recipe.
      </p>
    </div>
  )
}
```

Apply the same pattern to:

- `components/pricing/bulk-price-checker.tsx`
- `components/events/grocery-live-pricing-sidebar.tsx`

### Task F: Unit Conversion Utility

**Create `lib/utils/units.ts`**

```ts
export type MeasurementSystem = 'imperial' | 'metric'

const CONVERSIONS: Record<string, { metric: string; factor: number }> = {
  oz: { metric: 'g', factor: 28.3495 },
  lb: { metric: 'kg', factor: 0.453592 },
  'fl oz': { metric: 'mL', factor: 29.5735 },
  cup: { metric: 'mL', factor: 236.588 },
  gal: { metric: 'L', factor: 3.78541 },
  tsp: { metric: 'mL', factor: 4.92892 },
  tbsp: { metric: 'mL', factor: 14.7868 },
}

/** Convert a quantity for display in the user's preferred system */
export function displayQuantity(
  amount: number,
  unit: string,
  system: MeasurementSystem
): { amount: number; unit: string } {
  if (system === 'imperial') return { amount, unit }

  const conv = CONVERSIONS[unit.toLowerCase()]
  if (!conv) return { amount, unit } // unknown unit, pass through

  return {
    amount: Math.round(amount * conv.factor * 100) / 100,
    unit: conv.metric,
  }
}

/** Convert temperature for display */
export function displayTemp(
  fahrenheit: number,
  system: MeasurementSystem
): { value: number; unit: string } {
  if (system === 'imperial') return { value: fahrenheit, unit: 'F' }
  return { value: Math.round(((fahrenheit - 32) * 5) / 9), unit: 'C' }
}
```

This is a pure utility. No files need to consume it yet. It exists for future recipe/ingredient display work.

---

## Build Order

1. Task A (hook) + Task F (units utility) - independent, no dependencies
2. Task B (provider in layout) - depends on A
3. Task C (format helpers) - independent
4. Task D (wire 5 surfaces) - depends on B and C
5. Task E (pricing gate) - depends on B

## Do NOT

- Modify `lib/currency/frankfurter.ts`
- Modify `types/database.ts`
- Run `drizzle-kit push`
- Convert all 284 files (only the 5 listed in Task D)
- Add em dashes
- Use "OpenClaw" in any UI-facing string
- Delete any existing functions

## Success Test

After Phase 2, sign in as chef-bob (agent account). Go to Settings, change currency to GBP and locale to en-GB. Navigate to dashboard, events list, and finance page. All monetary values should display with the pound sign. Dates should show day-first format. The price catalog should show the graceful fallback message.
