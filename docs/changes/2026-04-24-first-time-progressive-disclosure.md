# First-Time Progressive Disclosure

## What changed

- Added a server-only tenant data presence query in `lib/progressive-disclosure/tenant-data-presence.ts`.
- Added client-safe visibility rules in `lib/progressive-disclosure/nav-visibility.ts`.
- Added `GettingStartedSection` for chefs with minimal data.
- Updated `/dashboard` to hide empty advanced sections until the tenant has relevant data.
- Updated `ChefSidebar` and `ActionBar` to show starter navigation first, reveal advanced chrome from data presence, keep active direct-route destinations visible, and persist "Show all features" in localStorage.
- Admin and privileged users bypass the simplified dashboard and nav chrome.
- Added a CTA to the Event Readiness empty state.
- Added a unit guard for brand-new chef threshold and starter/advanced nav visibility.

## Why

Brand-new chefs were seeing the full power-user dashboard and all sidebar groups before they had any data. The interface now starts with the smallest useful operating surface while preserving direct access to every route.

## Verification

- `graphify update .` completed and refreshed the code graph.
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/run-typecheck.mjs -p tsconfig.ci.json` passes.
- `$env:NEXT_DIST_DIR='.next-progressive-disclosure'; $env:NEXT_BUILD_MAX_OLD_SPACE_SIZE='16384'; npm.cmd run build -- --no-lint` passes with the repo's existing dynamic route warning noise and produced BUILD_ID `c10989402`.
- Browser check on a zero-data chef at `/dashboard` confirmed Getting Started appears, Money and Network are hidden, Event Readiness and Business Overview are hidden, and "Show all features" reveals Money.
- Browser check on `/finance` confirmed direct advanced navigation is not blocked and the active Money shortcut appears while on that route.
