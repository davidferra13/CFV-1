# International Readiness Layer

> **Status:** SPEC
> **Priority:** P1
> **Depends on:** Nothing. Zero coupling to OpenClaw or pricing engine.
> **Goal:** Make ChefFlow usable for international chefs TODAY by adding locale/currency/unit awareness to the tenant profile, without touching the pricing engine.

---

## The Problem

ChefFlow is hardcoded to US assumptions: USD currency, en-US locale, imperial units, America/New_York timezone default. International chef friends can't use it because every financial display, date format, and recipe unit screams "American software."

The pricing engine (OpenClaw) is US-only and broken. That's a separate problem. This spec deliberately avoids it. **90% of ChefFlow's value has zero dependency on the pricing engine** (recipes, events, clients, menus, communication, booking, ledger, surveys, trust loop, prep timelines).

## Current State (What Exists)

**Already built (good news):**

- `lib/utils/format.ts` - centralized formatting with `locale`, `timezone`, and `currency` params already accepted
- `lib/currency/frankfurter.ts` - full currency conversion via free ECB API, 8 supported currencies, `formatCurrency()` that handles JPY correctly
- `chefs.timezone` column exists (default `America/New_York`)
- Gift cards already have `currency_code` column
- Ticket purchases already have `currency_code` column
- `Intl.NumberFormat` and `Intl.DateTimeFormat` already used in the main formatter

**The problems:**

- `lib/utils/currency.ts` has a competing `formatCurrency()` hardcoded to `en-US` with no locale param
- No `currency_code` or `locale` on the `chefs` table
- No `measurement_system` preference anywhere
- ~250 files reference currency formatting, most import from `lib/utils/currency.ts` (the hardcoded one)
- Date formatting defaults to `en-US` / `America/New_York` everywhere
- No i18n framework for UI strings (not needed yet, just English)
- No way to hide pricing-engine features per tenant

---

## The 5 Changes

### 1. Tenant Locale Fields (Migration)

Add three columns to `chefs` table:

```sql
ALTER TABLE chefs ADD COLUMN currency_code text NOT NULL DEFAULT 'USD';
ALTER TABLE chefs ADD COLUMN locale text NOT NULL DEFAULT 'en-US';
ALTER TABLE chefs ADD COLUMN measurement_system text NOT NULL DEFAULT 'imperial';
```

- `currency_code`: ISO 4217 (USD, EUR, GBP, CAD, AUD, JPY, CHF, MXN). Matches `SUPPORTED_CURRENCIES` in frankfurter.ts.
- `locale`: BCP 47 tag (en-US, en-GB, fr-FR, ja-JP, es-MX). Drives date/number formatting.
- `measurement_system`: `imperial` or `metric`. Drives recipe/ingredient display.

**No data migration.** Defaults match current behavior. Existing US chefs see zero change.

### 2. Unify Currency Formatting

**Delete** `lib/utils/currency.ts` (the hardcoded one). Redirect all imports to `lib/utils/format.ts` which already accepts `{ locale, currency }`.

Update `formatCurrency` in `lib/utils/format.ts` to also accept a shorthand:

```ts
export function formatCurrency(cents: number, opts: CurrencyOpts | string = {}): string {
  // Allow formatCurrency(1500, 'GBP') shorthand
  const resolved = typeof opts === 'string' ? { currency: opts } : opts
  const dollars = cents / 100
  return new Intl.NumberFormat(resolved.locale ?? DEFAULT_LOCALE, {
    style: 'currency',
    currency: resolved.currency ?? DEFAULT_CURRENCY,
  }).format(dollars)
}
```

Keep `lib/currency/frankfurter.ts` as-is (it handles conversion, different purpose).

**Migration path:** Find-and-replace imports from `@/lib/utils/currency` to `@/lib/utils/format`. The function signature is compatible.

### 3. Settings UI

Add a "Regional Settings" section to `app/(chef)/settings/page.tsx`:

- **Currency** - dropdown from `SUPPORTED_CURRENCIES`
- **Locale** - dropdown (English US, English UK, French, Spanish, Japanese, etc.)
- **Measurement System** - toggle: Imperial / Metric
- **Timezone** - already exists, just group it here visually

Server action: `updateRegionalSettings()` in `lib/chef/actions.ts`.

### 4. Format Context Provider

Create `lib/hooks/use-format-context.ts`:

```ts
// Reads chef's locale prefs from session/context
// Returns { locale, currency, timezone, measurementSystem }
// All formatting functions can consume this
```

Wire into the existing `useAppContext` or create a lightweight `<FormatProvider>` in the chef layout. Every `formatCurrency()`, `formatDate()`, `formatDateTime()` call in chef-facing pages pulls from this context instead of hardcoded defaults.

**Public pages** (booking, event share, client portal) use the CHEF's locale settings, not the viewer's. The chef's currency is the chef's currency.

### 5. Graceful Pricing Engine Gating

Add a derived boolean: `hasPricingCoverage`. For now, true only if `currency_code === 'USD'` (since OpenClaw is US-only).

Surfaces that depend on OpenClaw data (catalog browser, price suggestions, cost calculations, web sourcing):

- If `hasPricingCoverage` is false, show a clean message: "Manual pricing mode. Enter your costs directly."
- The manual-entry path (which already exists everywhere) becomes the primary path
- No dead ends, no broken AI suggestions, no hallucinated prices

This is NOT a feature gate. It's graceful degradation. US chefs see no change. International chefs skip the parts that would be broken anyway.

---

## What This Does NOT Touch

- OpenClaw / pricing engine (untouched, stays US-only)
- Database schema for financial tables (still cents integers, currency-agnostic)
- Stripe integration (Stripe handles multi-currency natively)
- AI/Remy (no changes needed, Remy doesn't do currency math)
- i18n/translation of UI strings (English only for now, structure for later)

## Unit Conversion Reference

For `measurement_system: 'metric'`:

| Imperial | Metric | Conversion   |
| -------- | ------ | ------------ |
| oz       | g      | x 28.35      |
| lb       | kg     | x 0.4536     |
| fl oz    | mL     | x 29.57      |
| cup      | mL     | x 236.6      |
| gal      | L      | x 3.785      |
| tsp      | mL     | x 4.929      |
| tbsp     | mL     | x 14.79      |
| F        | C      | (F-32) x 5/9 |

Store in canonical units (metric). Display in user preference. Convert on render, not on save.

---

## Build Order

1. **Migration** - add 3 columns to chefs (5 min)
2. **Unify formatCurrency** - delete currency.ts, redirect imports (30 min, mechanical)
3. **Format context** - provider + hook (30 min)
4. **Settings UI** - regional settings section (30 min)
5. **Wire formatting** - update key surfaces to use context instead of hardcoded defaults (2-3 hours, incremental)
6. **Pricing gate** - `hasPricingCoverage` check on OpenClaw surfaces (30 min)
7. **Unit conversion utils** - metric/imperial display toggle (1 hour)

Steps 1-4 are the foundation. Steps 5-7 are incremental and can be done page-by-page over time.

---

## Success Criteria

A chef in London can:

- Sign up, set currency to GBP, locale to en-GB, units to metric
- See all prices in GBP (no $ signs)
- See dates as "26 April 2026" not "April 26, 2026"
- See recipe quantities in grams/mL not oz/cups
- Use recipes, events, clients, menus, booking, communication without hitting any US-only dead end
- NOT see broken pricing suggestions (gracefully hidden)

A US chef sees zero change. Every default matches current behavior.
