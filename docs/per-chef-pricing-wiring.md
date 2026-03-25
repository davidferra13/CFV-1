# Per-Chef Pricing: Wiring Up the Config

**Date:** 2026-03-25
**Status:** Implemented

## What Changed

The `chef_pricing_config` database table, settings UI, and server actions already existed but were not connected to the pricing engine. All pricing computations used hardcoded constants from `lib/pricing/constants.ts`. This change wires everything together so each chef's configured rates are actually used.

## Problem

1. Every chef saw the same rates (David's personal rates hardcoded as constants)
2. New chefs had no way to set their own pricing before it was used
3. The rate card displayed hardcoded values regardless of settings
4. Remy AI used hardcoded rate card text in email drafts

## Changes Made

### Core Wiring (config flows through computation)

- **`lib/pricing/evaluate.ts`** - Added `config?: PricingConfig` to `PricingEvaluationInput`, passes it to `computePricing()`
- **`lib/pricing/compute.ts`** - `generateQuoteFromPricing()` now accepts optional `config` parameter
- **`components/quotes/quote-form.tsx`** - Fetches chef's pricing config on mount via `getPricingConfig()`, passes to `computePricing()`
- **`lib/ai/correspondence.ts`** - Fetches pricing config and passes to `getAgentBrainForState()`
- **`lib/ai/agent-brain.ts`** - Accepts `pricingConfig` parameter, uses `generateRateCardFromConfig()` instead of `generateRateCardString()`

### Rate Card UI (reads from DB)

- **`components/pricing/rate-card-view.tsx`** - Accepts `config` prop, resolves values from DB config or system defaults. Shows "No pricing configured yet" with link to settings when rates are all zero.
- **`app/(chef)/rate-card/page.tsx`** - Fetches config and passes as prop

### New Chef Experience (start empty)

- **Migration `20260401000102`** - Changes all rate column defaults to 0 (new chefs start with empty pricing)
- **`components/settings/pricing-config-form.tsx`** - Updated DEFAULTS to zero, improved helper text

## How It Works Now

1. Chef signs up, gets a `chef_pricing_config` row with all rates at 0
2. Rate card shows "No pricing configured yet" with a link to Settings > Pricing
3. Chef fills in their rates at `/settings/pricing`
4. All pricing computations (quotes, Remy AI emails, rate card) read from the chef's config
5. If a chef hasn't set rates, the system falls back to constants (backward compatible)

## Files Modified

| File                                          | Change                                     |
| --------------------------------------------- | ------------------------------------------ |
| `lib/pricing/evaluate.ts`                     | Added config to input type and computation |
| `lib/pricing/compute.ts`                      | generateQuoteFromPricing accepts config    |
| `components/quotes/quote-form.tsx`            | Fetches and passes config                  |
| `lib/ai/correspondence.ts`                    | Fetches config for AI brain                |
| `lib/ai/agent-brain.ts`                       | Uses config-aware rate card                |
| `components/pricing/rate-card-view.tsx`       | Config prop, empty state                   |
| `app/(chef)/rate-card/page.tsx`               | Fetches and passes config                  |
| `components/settings/pricing-config-form.tsx` | Zero defaults, better UX                   |
| `database/migrations/20260401000102`          | Zero defaults for new rows                 |
