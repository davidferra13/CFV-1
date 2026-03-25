# Per-Chef Pricing Setup (Guided Wizard with Industry Benchmarks)

**Date:** 2025-03-25
**Status:** Implemented

## Problem

ChefFlow had hardcoded pricing rates from the developer's personal chef business baked into `lib/pricing/constants.ts`. Every chef using the platform would see these rates as defaults: $200/person couples, $155/person groups, $300 minimum, 50% deposit, etc. This is a multi-tenant platform where each chef sets their own prices. Hardcoded values from one person's business have no place in a universal platform.

## What Changed

### 1. Constants Zeroed Out (`lib/pricing/constants.ts`)

All rate/price values in the system defaults file are now zero. These are only used as fallbacks when `chef_pricing_config` has no row for a chef (which should never happen in practice since `getPricingConfig()` auto-creates one).

**Kept as non-zero defaults** (industry standards, not chef-specific):

- `DEPOSIT_PERCENTAGE`: 0.5 (50%, industry standard)
- `BALANCE_DUE_HOURS_BEFORE`: 24 hours
- `IRS_MILEAGE_RATE_CENTS`: 70 ($0.70/mile, federal rate)
- `LARGE_GROUP_MIN_GUESTS`: 8
- `LARGE_GROUP_MAX_GUESTS`: 14
- `WEEKLY_COMMITMENT_MIN_DAYS`: 5
- `HOLIDAY_PROXIMITY_DAYS`: 2

### 2. DB Migration Defaults Zeroed (`20260401000102_pricing_config_zero_defaults.sql`)

New rows in `chef_pricing_config` now default to zero for all rate/price columns. Policy columns retain industry-standard defaults.

### 3. Industry Benchmark Data (`lib/pricing/benchmarks.ts`)

New module with benchmark ranges for all 6 chef archetypes:

- Private Chef, Caterer, Meal Prep Chef, Restaurant, Food Truck, Bakery
- Each has relevant pricing sections with low/mid/high ranges
- Includes contextual tips and industry statistics
- Sources: BLS, industry surveys, marketplace data

### 4. Guided Pricing Setup Wizard (`components/onboarding/onboarding-steps/pricing-step.tsx`)

Completely replaced the old basic 3-field pricing step with a guided experience:

- Shows benchmark ranges for the chef's archetype
- Visual benchmark bar showing where each rate falls
- "Use suggested" buttons for individual fields and whole sections
- Progress indicator (X/Y fields filled)
- Collapsible sections with industry stats
- Writes directly to `chef_pricing_config` on completion

### 5. Settings Page Shows Guided Setup (`app/(chef)/settings/pricing/page.tsx`)

When a chef has no rates configured, `/settings/pricing` shows the guided setup wizard instead of the raw form. After setup, they see the full configuration form for fine-tuning.

### 6. Onboarding Persists to `chef_pricing_config` (`lib/onboarding/onboarding-actions.ts`)

The `completeStep` action now detects the pricing step and persists the config data directly to `chef_pricing_config`, not just to `onboarding_progress`.

### 7. Inquiry Templates Use Per-Chef Rates (`lib/templates/inquiry-first-response.ts`)

- Removed hardcoded `GROUP_RATES[4]` import
- Now accepts `pricingConfig?: PricingConfig` as input
- If no pricing config exists, the pricing paragraph is omitted entirely (no fake rates)
- Both callers updated to fetch and pass the config

### 8. Agent Brain Uses Per-Chef Deposit (`lib/ai/agent-brain.ts`)

`extractBookingRules()` now reads the deposit percentage from the chef's pricing config instead of the hardcoded constant.

## Files Changed

| File                                                                  | Change                                           |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| `lib/pricing/constants.ts`                                            | Zeroed all rates, marked as system defaults only |
| `lib/pricing/benchmarks.ts`                                           | **NEW** - Industry benchmark data by archetype   |
| `components/onboarding/onboarding-steps/pricing-step.tsx`             | Replaced with guided wizard                      |
| `components/settings/guided-pricing-setup.tsx`                        | **NEW** - Settings page wrapper for guided setup |
| `app/(chef)/settings/pricing/page.tsx`                                | Shows guided setup when no rates configured      |
| `lib/onboarding/onboarding-actions.ts`                                | Pricing step persists to `chef_pricing_config`   |
| `lib/templates/inquiry-first-response.ts`                             | Uses per-chef rates, no hardcoded GROUP_RATES    |
| `lib/hub/inquiry-circle-first-message.ts`                             | Fetches and passes pricing config                |
| `lib/ai/agent-actions/inquiry-response-actions.ts`                    | Fetches and passes pricing config                |
| `lib/ai/agent-brain.ts`                                               | Booking rules use per-chef deposit %             |
| `database/migrations/20260401000102_pricing_config_zero_defaults.sql` | Zero defaults for new rows                       |
| `components/pricing/rate-card-view.tsx`                               | Already updated (accepts config prop)            |

## What Was Already Wired (No Changes Needed)

- `lib/pricing/compute.ts` - Already had `resolveConfig(config?)` reading from PricingConfig
- `lib/pricing/evaluate.ts` - Already passed config through to compute engine
- `lib/ai/correspondence.ts` - Already fetched `getPricingConfig()` and passed to agent brain
- `lib/pricing/config-actions.ts` - Server actions for CRUD already existed
- `components/settings/pricing-config-form.tsx` - Full settings form already existed
- `chef_pricing_config` table - Already fully migrated with all fields

## Remaining Work

1. **Your existing config row** needs to be preserved. The migration only changes defaults for NEW rows. Your current rates in the DB are untouched.
2. **Rate card view** - the component accepts a config prop but the page that renders it needs to pass the config from the server. Check where `RateCardView` is used.
3. **Tip suggestions** (`lib/finance/tip-actions.ts`) - Still hardcoded at $15/$20/$25. Could be per-chef.
4. **Take-a-Chef commission** (`lib/integrations/take-a-chef-defaults.ts`) - Still hardcoded at 18/20%. Could be per-chef in integration settings.
5. **Client dormancy thresholds** (`lib/clients/dormancy.ts`, `churn-score.ts`, `cooling-actions.ts`) - Hardcoded at 90/180 days. Could be per-chef.
