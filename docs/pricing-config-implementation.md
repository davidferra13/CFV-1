# Pricing Config Implementation

## What Changed

Added per-chef pricing configuration so chefs can customize their own rates instead of using hardcoded system defaults.

## New Files

- `supabase/migrations/20260401000087_chef_pricing_config.sql` - Database table with RLS, auto-update trigger, and all pricing fields with sensible defaults
- `lib/pricing/config-types.ts` - TypeScript types for PricingConfig and PricingConfigInput
- `lib/pricing/config-actions.ts` - Server actions: getPricingConfig() (upsert pattern) and updatePricingConfig() (Zod-validated partial updates)
- `app/(chef)/settings/pricing/page.tsx` - Settings page for pricing configuration
- `components/settings/pricing-config-form.tsx` - Client form component with all pricing fields organized by section

## Modified Files

- `lib/pricing/compute.ts` - computePricing() now accepts optional PricingConfig as second parameter. Uses ResolvedConfig pattern to map DB config to runtime values. All constant references replaced with config-derived values. Added generateRateCardFromConfig() for config-aware rate card generation. Non-breaking: existing callers without the second parameter continue to work with system defaults.
- `components/navigation/nav-config.tsx` - Added "Pricing" entry to settingsShortcutOptions

## How It Works

1. Each chef gets a row in chef_pricing_config (created on first access via upsert)
2. All columns have defaults matching the existing constants in lib/pricing/constants.ts
3. The pricing engine resolves config values through resolveConfig(): if a PricingConfig is provided, it maps DB columns to the runtime structure; if not, it uses the hardcoded constants directly
4. The constants file is unchanged and remains the source of default values
5. The settings page at /settings/pricing shows all configurable fields organized into sections (Base Rates, Weekly, Policies, Premiums, Thresholds) with system defaults shown for reference

## Non-Breaking Guarantee

The computePricing() function signature adds an optional second parameter. All existing callers that pass only PricingInput continue to work exactly as before, using system defaults from constants.ts.
