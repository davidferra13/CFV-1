# Exit-Links System Handoff

## What Was Built (commit 487deb502)

A complete 91-scenario exit-link system. When a chef must leave ChefFlow (grocery shopping, government forms, payments, communication), the app provides a direct link with all context pre-filled. One click, zero typing.

### Core System

- `types/exit-links.ts` - Type definitions (ExitLinkDefinition, ExitLinkResult, ExitCategory, SubLinkDefinition)
- `lib/exit-links/registry.ts` - All 91 exit definitions with URL templates, O(1) lookup, category filter
- `lib/exit-links/generate-link.ts` - Placeholder interpolation, carrier auto-detection (exit 52), sublink resolution
- `lib/exit-links/context-helpers.ts` - 9 context extractors (chef, client, event, vendor, staff, ingredient, recipe, menu, profile) + mergeContext()
- `docs/specs/exit-link-registry.md` - Full spec with all 91 URL templates

### UI Components

- `components/exit-links/ExitLinkButton.tsx` - Main button (4 variants: default/ghost/outline/compact), sublink dropdown, inApp badge
- `components/exit-links/ExitLinkPanel.tsx` - Category panel with expand/collapse
- `components/exit-links/QuickExitLink.tsx` - Minimal inline link
- `components/exit-links/ComplianceExitLinks.tsx` - Server component for government/professional links
- `components/exit-links/icon-resolver.tsx` - 50+ Lucide icon string-to-component map

### Wrapper Components

- `components/clients/client-exit-links.tsx` - 7 client contact exits
- `components/finance/finance-exit-links.tsx` - 5 finance exits (bank, accountant, tax, Stripe, Venmo)
- `components/staff/staff-exit-links.tsx` - Staff contact + Venmo pay
- `app/(chef)/events/[id]/_sections/event-exit-links-section.tsx` - 7 event link groups
- `app/(chef)/dashboard/_sections/industry-links-section.tsx` - Industry news/rates

### Pages Wired (17 total)

Event detail, client detail, shopping list (per-ingredient + whole-list), recipe detail (server+client), menu editor, finance (5 pages), staff detail, staff panel, event ops, settings (compliance/insurance/certs), marketing, dashboard, inbox

## What Still Needs Work

### ~20 Exit IDs Not Yet Surfaced on Any Page

Exits 5, 6, 35, 36, 37, 39, 41, 42, 43 (partial), 45, 46, 50, 51, 52, 53, 76, 86, 88, 90. They exist in the registry and resolve correctly; no page currently renders them. Most need new page sections or new pages entirely.

### Profile Settings Fields Needed

These context keys power exit links but have no UI for the chef to enter them yet:

- `bankUrl` - Bank portal URL
- `accountantEmail` - Accountant's email
- `lawyerPhone` / `lawyerEmail` - Attorney contact
- `insurancePortalUrl` - Insurance portal
- `websiteAdminUrl` - Website admin panel
- `commissaryUrl` - Commercial kitchen portal

Without these fields populated, those exit links auto-hide (by design). Add input fields to the appropriate settings pages.

### Mandatory Closeout Not Run

- `npm run regression:firewall` - Required by CLAUDE.md before any build is marked done
- `/wire-audit` - Post-build wiring audit
- `/page-xray` on affected routes
- Browser testing with Playwright - verify exit links render on actual pages

### Known Fix Applied

`ExitLinkButton.tsx` line 120: changed `size="icon"` to `size="sm"` because project's Button component only supports sm/md/lg. Verified via tsc.

## Architecture Notes

- **Auto-hide pattern**: Links return null when required context keys are missing. Components render nothing. No broken links ever shown.
- **Registry is the source of truth**: `lib/exit-links/registry.ts` has all 91 definitions. Add new exits there.
- **Context extractors use optional chaining with multiple field name fallbacks** so they work regardless of which shape the domain object takes.
- **SubLinks pattern**: Some exits have a primary link + dropdown alternatives (e.g., Instacart primary, Amazon Fresh + Google Shopping as sublinks).
- **Categories**: data-gaps, missing-features, channel-lock-in, transaction, external-platform, government, tax-financial, creative, marketing, professional-growth, kitchen-boundary

## TypeScript Status

Clean. `npx tsc --noEmit --skipLibCheck` passes.
