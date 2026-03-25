# Feature Visibility Changes (Phase 1)

## What Changed

ChefFlow had two layers of feature gating that hid ~60% of the app from chefs:

1. **`advancedOnly: true`** on 5 nav groups (Commerce, Supply Chain, Marketing, Analytics, Protection, Tools) made them completely invisible in the sidebar regardless of any user setting.
2. **Module defaults** only enabled 6 of 11 modules for new signups, requiring chefs to discover Settings > Modules to see the rest.

Both layers have been removed. All features are now visible by default.

## Files Changed

| File                                                                       | Change                                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`                                     | Removed `advancedOnly` from NavGroup type and all 6 group definitions        |
| `components/navigation/chef-nav.tsx`                                       | Removed `.filter((group) => !group.advancedOnly)` from sidebar rendering     |
| `lib/billing/modules.ts`                                                   | Set all 6 extended modules to `defaultEnabled: true`                         |
| `lib/archetypes/presets.ts`                                                | Updated `ALWAYS_ON` to include all 11 module slugs                           |
| `lib/billing/focus-mode.ts`                                                | Added missing `station-ops` and `operations` to `EXTENDED_MODULES` (bug fix) |
| `database/migrations/20260401000099_enable_all_modules_existing_chefs.sql` | Auto-upgrades existing chefs with old defaults to all modules                |

## What Stays the Same

- **`adminOnly` items** (Prospecting, Social Hub, Clover Parity, etc.) remain admin-gated
- **`hidden` items** (Nutritional Analysis, Payroll, YoY Comparison, Post from Event) remain hidden (intentionally incomplete)
- **Focus Mode** still works as opt-in for chefs who want a simplified sidebar
- **Module toggle page** (Settings > Modules) still lets chefs turn things off
- **Games and Cannabis** remain commented out / disabled

## Migration Details

The SQL migration only upgrades chefs whose `enabled_modules` exactly matches the old 6-module default array. Chefs who manually customized their modules (added or removed even one) are untouched.

## If a Chef Feels Overwhelmed

They have two escape hatches:

1. **Focus Mode** (Settings > Modules) strips the sidebar down to core workflows only
2. **Module toggles** (Settings > Modules) let them hide specific groups they don't use
