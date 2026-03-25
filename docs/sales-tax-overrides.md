# Per-Chef Sales Tax Rate Overrides

Phase 9, External Directory feature.

## What Changed

Added per-chef, per-state sales tax rate overrides. Previously, tax rates were hardcoded in `lib/finance/sales-tax-constants.ts` with no way for individual chefs to customize them. Now chefs can set their own state + local rates that persist across sessions and events.

## Architecture

### Resolution Order

When a tax rate is needed for a given state:

1. Check `chef_tax_config` table for a per-chef override for that state
2. If no override exists, fall back to the hardcoded constant in `COMMON_STATE_RATES_BPS`

This means the constants file (`sales-tax-constants.ts`) remains the universal fallback. No existing behavior changes unless a chef explicitly sets an override.

### New Database Table

`chef_tax_config` stores per-chef, per-state overrides:

| Column         | Type        | Notes                                    |
| -------------- | ----------- | ---------------------------------------- |
| id             | UUID        | Primary key                              |
| chef_id        | UUID        | References chefs(id)                     |
| state_code     | TEXT        | e.g. "MA", "NY"                          |
| rate_bps       | INT         | State rate in basis points (625 = 6.25%) |
| local_rate_bps | INT         | Local/county rate in basis points        |
| description    | TEXT        | Optional note                            |
| created_at     | TIMESTAMPTZ | Auto                                     |
| updated_at     | TIMESTAMPTZ | Auto, trigger-maintained                 |

Unique constraint on `(chef_id, state_code)`. RLS enabled, scoped to chef's own rows.

### New Files

| File                                                     | Purpose                                        |
| -------------------------------------------------------- | ---------------------------------------------- |
| `database/migrations/20260320000013_chef_tax_config.sql` | Migration for the new table                    |
| `lib/finance/chef-tax-config-actions.ts`                 | Server actions: CRUD + resolution functions    |
| `app/api/v2/settings/tax-rates/route.ts`                 | REST API (GET/PATCH) for external integrations |

### Modified Files

| File                                             | Change                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/finance/sales-tax/settings/page.tsx` | State selector now checks chef overrides first; saves override on settings save; shows badge when using custom rate |

### API Endpoint

`GET /api/v2/settings/tax-rates` - List all overrides for the authenticated chef
`GET /api/v2/settings/tax-rates?state=MA` - Resolve effective rate for a single state (override or default)
`PATCH /api/v2/settings/tax-rates` - Upsert or delete a state override

Request body for PATCH (upsert):

```json
{
  "state_code": "MA",
  "rate_bps": 625,
  "local_rate_bps": 0,
  "description": "Massachusetts standard rate"
}
```

Request body for PATCH (delete, reverts to default):

```json
{
  "state_code": "MA",
  "rate_bps": 0,
  "delete": true
}
```

### Key Functions

- `resolveEffectiveTaxRate(stateCode)` - Returns the effective rate for one state (checks override, falls back to constant)
- `resolveAllEffectiveTaxRates()` - Returns merged map of all states with overrides applied
- `getChefTaxRates()` - Lists all overrides for the current chef
- `updateChefTaxRate(input)` - Creates or updates an override
- `deleteChefTaxRate(stateCode)` - Removes an override (reverts to default)

## Integration Points

The settings page now automatically syncs its state/local rate to `chef_tax_config` when the chef saves settings. This means:

- Existing behavior preserved: `sales_tax_settings` table still holds the primary config
- New behavior: the rate is also saved as a `chef_tax_config` override
- Event-level tax form (`event-sales-tax-form.tsx`) continues to work as before, pulling from `sales_tax_settings`
- Future enhancement: the event form could use `resolveEffectiveTaxRate()` to auto-populate based on event state

## Backward Compatibility

- No existing tables modified
- No existing columns changed
- Constants file unchanged (still serves as fallback)
- All existing sales tax flows work identically for chefs who have not set overrides
