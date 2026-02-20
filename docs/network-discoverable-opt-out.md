# Network Discovery: Opt-In → Opt-Out

**Date:** 2026-02-18
**Migration:** `20260221000021_network_discoverable_default_true.sql`

## What Changed

The chef network discovery model was flipped from **opt-in** (hidden by default) to **opt-out** (visible by default).

### Problem

When a chef created their network profile and searched for other chefs, nobody appeared in the directory. This is because `chef_preferences.network_discoverable` defaulted to `false`, meaning every chef was hidden until they explicitly toggled the setting on. Since nobody had done that, the directory was empty.

### Solution

1. **Database migration** — Changed the column default from `false` to `true`, and updated all existing rows to `true`. This means:
   - All current chefs are now discoverable immediately
   - All new chefs will be discoverable by default
   - Chefs who want privacy can toggle the setting off (opt-out)

2. **UI text updates** — Adjusted the language in two places to reflect the opt-out model:
   - **Discoverability toggle** (`components/network/discoverability-toggle.tsx`): The disabled state now says "You have opted out" instead of "You are hidden"
   - **Network page banner** (`app/(chef)/network/page.tsx`): The warning says "You have opted out of the network" with language about re-enabling rather than enabling for the first time

### What Didn't Change

- **RLS policies** — The existing policies on `chefs` and `chef_preferences` already filter on `network_discoverable = true`. They work correctly with either default.
- **Search query** — `searchChefs()` in `lib/network/actions.ts` already filters `.eq('chef_preferences.network_discoverable', true)`. No changes needed.
- **Connection request guard** — `sendConnectionRequest()` still checks that the addressee is discoverable before allowing a request. If someone opts out, they can't receive requests.
- **Toggle action** — `toggleNetworkDiscoverable()` works identically in both directions.

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/20260221000021_...sql` | New migration: default → true, existing rows → true |
| `components/network/discoverability-toggle.tsx` | Updated disabled-state text |
| `app/(chef)/network/page.tsx` | Updated privacy banner text |

### Deployment Note

Run `supabase db push --linked` to apply the migration. No backup needed — this migration only changes a boolean default and flips existing `false` values to `true`. No data is deleted or structurally altered.
