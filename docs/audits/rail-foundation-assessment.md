# Rail Foundation Assessment (NAV #2)

**Date:** 2026-05-18
**Verdict:** VERIFY-ONLY

The rail foundation is functionally complete. All code layers exist, are wired end-to-end, and are mounted in the authenticated layout. The BLOCKED status reflects missing runtime proof (Playwright screenshots, console/network checks), not missing code.

## Evidence Summary

The rail system comprises three rendering surfaces, all mounted and wired:

1. **RailStrip** (top bar, every authenticated page): `components/rail/rail-strip-wrapper.tsx` (server) calls `getRailStrip()` which dispatches hot resolvers (inquiries, messages, payments), assembles via god-mode-assembly, and renders `RailStrip` client component with SSE live-refresh.

2. **ContextualRail** (page-aware expandable panel, every authenticated page): `components/rail/contextual-rail-server.tsx` matches the current pathname against 10+ rail profiles (event-detail, client-detail, menu-detail, etc.), dispatches profile-scoped resolvers via `assembleContextualRail()`, and renders `ContextualRailClient` with expand/collapse persistence and keyboard shortcuts.

3. **TieredRail** (dashboard only, 4-tier card layout): `components/rail/tiered-rail.tsx` consumes `assembleTieredRail()` which merges GodMode resolvers + Universal Rail items, applies multiplicative scoring, time-of-day dampening, density caps, and item state filtering.

All three are mounted in `app/(chef)/layout.tsx` (lines 296-303) inside Suspense boundaries with skeleton fallbacks. TieredRail is additionally mounted on the dashboard page (line 63).

## Data Layer Status

**Resolvers: COMPLETE.** 42 chef-specific resolvers registered in `lib/discovery/god-mode-dispatcher.ts`, organized as hot (3: inquiries, messages, payments) and warm (39: events, quotes, contracts, menu-approvals, vendor-invoices, recurring-invoices, revenue-goals, proposal-activity, followups, dormant-clients, client-birthdays, review-requests, prep-status, shopping-lists, packing-status, receipt-capture, hours-logging, staff-issues, PIE attention, intelligence-signals, automation-activity, certifications, insurance, CIL signals, scheduled-messages, communication-feed, onboarding, weather-alerts, network-activity, lifecycle-stages, cadence-due, completion, dish-fatigue, weather-cooking, quality-drift, equipment-conflicts, revenue-opportunities, handoffs, waiting, resume).

**Source adapters (lib/rail/): COMPLETE.** 5 source adapters (CIL, communication, events, finance, intelligence) feed the aggregator. Each queries real database tables with proper error isolation.

**Scoring engine: COMPLETE.** Two scoring pipelines exist and are both wired:

- `lib/rail/scoring.ts`: multiplicative scoring (baseScore _ urgencyMultiplier _ freshnessDecay \* userRelevance), tier assignment (80-100 critical, 50-79 action, 20-49 awareness, 0-19 opportunity), time-of-day dampening, density caps (3/8/12/6).
- `lib/discovery/rail-item-scoring.ts`: spec-aligned scoring engine with time windows, freshness decay, urgency multipliers, and force-promotion logic.

**State persistence: COMPLETE.** Two state systems exist:

- `lib/rail/state.ts`: reads/writes `rail_item_state` table. Supports markSeen, markActed, snoozeItem, resolveItem, expireItem, delegateItem, saveItem, addNote, scheduleFollowUp, cleanupExpired.
- `lib/discovery/universal-rail-state.ts`: reads/writes `rail_impressions`, `rail_dismissals`, `rail_saved_items`, `rail_audit_events`, `rail_user_preferences` tables. Full impression tracking, batch recording, dismissal with snooze durations, save/pin, audit events, user preferences.

**Database tables: COMPLETE.** Migrations exist for all rail tables:

- `20260515000002_universal_rail_state.sql`: rail_impressions, rail_dismissals, rail_saved_items, rail_audit_events, rail_user_preferences (with indexes).
- `20260516100002_rail_item_state.sql`: rail_item_state with composite indexes.
- `20260517100015_rail_item_state.sql`: rail_item_states (seen/snoozed/dismissed/resolved persistence).
- `20260517200225_rail_navigation.sql`: rail_stages, rail_progress, rail_nav_shortcuts (lifecycle navigation).
- `20260517240001_rail_interaction_palette.sql`: delegated_to, note_text, follow_up_at columns.
- `20260517250000_rail_engagement_log.sql`: affinity tracking.
- `20260517260001_rail_engagement_log.sql`: engagement log with source indexes.
- `20260517260003_rail_interaction_palette.sql`: saved_at column, delegate FK.

## Component Layer Status

**Server components: COMPLETE.**

- `contextual-rail-server.tsx`: auth-gated, pathname-aware, profile-matched, data-fetched, skeleton exported.
- `rail-strip-wrapper.tsx`: auth-gated via server action, data-fetched, skeleton exported.
- `tiered-rail.tsx`: async server component, awaits queue data, assembles tiers, renders TierRow components.

**Client components: COMPLETE (13 files).**

- `contextual-rail-client.tsx`: expand/collapse with localStorage persistence, SSE subscription, keyboard shortcut ('r').
- `rail-strip.tsx`: horizontal scroll strip with SSE live-refresh, tier-colored dots.
- `collapsed-bar.tsx`: metric chips, readiness bar, critical badge with pulse animation.
- `expanded-panel.tsx`: multi-column layout with category sections, action bar.
- `category-section.tsx`: category header with icon, item list capped at 8.
- `tier-row.tsx`: glass card design, tier-specific glow gradients, orb shadows, horizontal scroll on mobile, flex-wrap on desktop, CSS stagger animations.
- `rail-item-row.tsx`: glass card items with tier accent lines, icon backgrounds, evidence pills, inline action buttons, memory lines, chevron hover animation.
- `rail-intel-card.tsx`: compact intel card with dot color, icon, label, context, critical indicator, inline actions.
- `interaction-menu.tsx`: 6-action menu (Act, Snooze, Delegate, Save, Note, Follow Up) with overflow dropdown. Each action calls `lib/rail/state.ts` functions.
- `use-auto-scroll.ts`: auto-scroll hook with tier-based speed, pause on hover/touch/wheel, reduced motion support.

**Layout mounting: COMPLETE.**

- `app/(chef)/layout.tsx` line 296-298: RailStripWrapper in Suspense.
- `app/(chef)/layout.tsx` line 299-302: ContextualRailServer in Suspense, conditionally shown via shellBudget.
- `app/(chef)/dashboard/page.tsx` line 62-66: TieredRailSection in Suspense + WidgetErrorBoundary.

## Multi-Portal Readiness

**Registry infrastructure: COMPLETE.** 7 role-specific registries exist in `lib/discovery/registries/`:

- `admin-rail-registry.ts` (large, 50K+ tokens)
- `chef-rail-registry.ts` (large, 63K+ tokens)
- `client-rail-registry.ts` (large, 47K+ tokens)
- `staff-rail-registry.ts`
- `partner-rail-registry.ts`
- `guest-rail-registry.ts`
- `public-rail-registry.ts`

Lazy-loaded via `registries/index.ts` with caching. `loadRoleRegistry(role)` returns the correct registry per role.

**Resolver routing: PARTIAL but functional.** `lib/discovery/resolvers/index.ts` routes to `chef-resolver.ts` and `client-resolver.ts`. Staff, partner, and admin resolvers return empty (graceful degradation with static labels). This is expected; NAV #3-7 items will add portal-specific resolver wiring.

**Role transitions: COMPLETE.** `lib/discovery/universal-rail-connections.ts` defines role transitions (guest->client, chef->client toggle, public->guest) with carry-over categories.

**Universal types: COMPLETE.** 7 roles defined in `UniversalRailRole`. Assembly options support role, userId, tenantId, pageContext, filters, debug scores. Slot policy controls promotional/editorial ratios.

## Gaps Found

No code gaps. The system is functionally complete for the "foundation" scope. The items that are absent (staff/partner/admin resolvers returning real data) are explicitly scoped to NAV #3-7, not NAV #2.

One minor observation: the `resolveRailData()` function in `lib/discovery/resolvers/index.ts` has a comment "Staff, partner, admin: resolvers not yet built." This is by design; those are downstream items, not foundation work.

## Verification Checklist

Steps to prove the rail foundation works at runtime and unblock NAV #2:

1. **Start dev server** at `http://localhost:3100`
2. **Authenticate** using agent credentials (`.auth/agent.json`), POST to `/api/e2e/auth`
3. **Navigate to /dashboard**:
   - [ ] Screenshot: RailStrip visible at top of main content area
   - [ ] Screenshot: TieredRail section visible with tier cards (or "All clear" if no active items)
   - [ ] Console: no rail-related errors
   - [ ] Network: verify server action calls to `getRailStrip()` and `assembleTieredRail()` complete
4. **Navigate to /events/[any-event-id]** (or create a test event):
   - [ ] Screenshot: ContextualRail collapsed bar visible with metric chips
   - [ ] Click collapsed bar: expanded panel opens with category columns
   - [ ] Press 'r' key: rail toggles expand/collapse
   - [ ] Console: no errors from contextual-rail-assembly
5. **Navigate to /clients/[any-client-id]**:
   - [ ] Screenshot: ContextualRail shows client-detail profile (people, money, communication categories)
6. **Test interaction menu** on any TieredRail item:
   - [ ] Click "Snooze": item disappears (state written to rail_item_state)
   - [ ] Refresh: snoozed item stays hidden
7. **Verify SSE live-refresh**:
   - [ ] Open Network tab, filter for SSE
   - [ ] Confirm 'rail' channel subscription is active
8. **Database verification**:
   - [ ] Query `SELECT count(*) FROM rail_item_state` (should have rows after interactions)
   - [ ] Query `SELECT count(*) FROM rail_impressions` (populated if impression tracking fires)

## Recommendation

**Unblock NAV #2 immediately.** Mark status as `VERIFY-ONLY` (not BLOCKED). The "partial" assessment from 2026-05-16 was based on missing runtime proof, not missing code. All 9 `lib/rail/` files, 13 `components/rail/` files, 42 chef resolvers, 7 role registries, 8 database migrations, and 3 layout mount points are present and wired.

Run the verification checklist above with Playwright. If all screenshots and checks pass, mark NAV #2 as DONE. This unblocks NAV #3-7 (portal-specific rail prominence) which only need to add resolvers and tweak registries for their respective portals.
