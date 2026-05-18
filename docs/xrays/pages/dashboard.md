# Page X-Ray: `/dashboard`

Scan: `dashboard-S1`  
Mode: full  
Date: 2026-05-18  
Route group: `(chef)`  
Primary domain: dashboard  
Page file: `app/(chef)/dashboard/page.tsx`

## Executive Summary

`/dashboard` is ChefFlow's central chef workspace compositor. It renders a dense operating surface from `app/(chef)/dashboard/page.tsx` and many async server components under `app/(chef)/dashboard/_sections/`. The page is highly useful and resilient: it has a top-level `requireChef()` gate, extensive `Suspense` streaming, compact widget error boundaries, progressive disclosure, workspace-density controls, archetype-specific actions, and broad cross-domain visibility.

The main risks are architectural rather than product-value risks. The dashboard reaches around domain interfaces in key places, has no dedicated Rail Profile, has no dashboard-specific tests or test coverage blueprint entry, and repeats auth/context lookups across many server sections. There are no critical findings in this scan.

Current cohesion score: **0.62**.

## Code Inventory

- `page.tsx` is a layout compositor with `requireChef()`, `getPriorityQueue()`, `getDailyPlanStats()`, `getWeeklyRetroSummary()`, 13+ top-level streamed sections, and 8 compact `WidgetErrorBoundary` wrappers.
- `loading.tsx` and `error.tsx` exist. `not-found.tsx` does not.
- Section inventory is large: the handoff identified 45 section files; current checkout contains 50 files under `_sections/`, with 53 files in the route folder total.
- Major sections: `HeroZone`, `TieredRailSection`, `DailyPlanBanner`, `OnboardingZone`, `AmbientLayer`, `CilSignalSummary`, `ActivityFeedSection`, `WeeklyReflectionLoader`, `ThisWeekSection`, `QuickNotesLoader`, `RevenueGoalSection`, `ChefTipsSection`, `BusinessHealthFullSection`, `OpenClawLiveAlertsSection`.
- Direct DB access appears in key dashboard sections. This report extracts the requested high-severity violations for `hero-zone.tsx` and `onboarding-zone.tsx`; a wider follow-up domain audit should cover remaining direct `createServerClient()` users in dashboard adjunct sections.
- `HealthNarrativeSection` is imported in `page.tsx` but not rendered.
- `CilSignalSummary` is rendered once at page level and again inside `BusinessHealthFullSection`.

## Dimension 0: Page Identity + Domain Wiring

Key findings:

- Answer class: `EXISTS_WIRED`. Route identity is clear: chef portal dashboard, primary domain `dashboard`, route group `(chef)`.
- Answer class: `EXISTS_UNWIRED`. Most widgets use domain actions, but `hero-zone.tsx` and `onboarding-zone.tsx` directly instantiate the DB client.
- Answer class: `FUTURE_BUILD_SIGNAL`. The dashboard is becoming a mega-compositor across 30+ domains and needs stricter owner boundaries.

Findings extracted: `dashboard-S1-F001`, `dashboard-S1-F002`, `dashboard-S1-F021`.

## Dimension 1: Content Inventory

Key findings:

- Answer class: `EXISTS_WIRED`. The page includes operations, scheduling, onboarding, CIL, activity, reflection, weekly planning, notes, revenue, tips, health, and pricing alert surfaces.
- Answer class: `DENSITY_GATED`. Several sections are intentionally hidden for minimal density or brand-new chefs.
- Answer class: `SYSTEM_ONLY`. Some sections return `null` on empty or failed data, which keeps the dashboard clean but can make missing capability hard to distinguish from no data.

Findings extracted: `dashboard-S1-F018`.

## Dimension 2: Route & File Structure

Key findings:

- Answer class: `EXISTS_WIRED`. Route files are decomposed into a compositor page and co-located `_sections`.
- Answer class: `MISSING`. There is no `not-found.tsx` for dashboard-specific missing-state handling.
- Answer class: `EXISTS_UNWIRED`. `HealthNarrativeSection` exists and is imported but does not appear in the page render tree.

Findings extracted: `dashboard-S1-F006`, `dashboard-S1-F014`.

## Dimension 3: User Journey (Backward)

Key findings:

- Answer class: `EXISTS_WIRED`. Users arrive from auth redirects, onboarding completion, nav dashboard entry, and route defaults.
- Answer class: `EXISTS_WIRED`. Onboarding state and profile gating help orient new chefs.
- Answer class: `DENSITY_GATED`. Brand-new chefs see a simplified flow through `GettingStartedSection` and onboarding widgets.

Findings extracted: none.

## Dimension 4: User Journey (Forward)

Key findings:

- Answer class: `EXISTS_WIRED`. Quick action links point to Daily Ops, Briefing, Create Menu, Storefront, and archetype-driven primary actions.
- Answer class: `REQUIRES_ACTION`. Quick action bar lacks an explicit keyboard navigation pattern beyond normal link tabbing.
- Answer class: `DENSITY_GATED`. Menu/storefront actions are controlled by data presence and privileged bypass.

Findings extracted: `dashboard-S1-F011`.

## Dimension 5: Temporal Context

Key findings:

- Answer class: `EXISTS_WIRED`. The dashboard is strongly time-aware: daily plan, weekly reflection, weekly scheduling, next event, current feed, payments, and shopping windows.
- Answer class: `MISSING`. `hero-zone.tsx` builds `weekEnd` by adding 7 to `now.getDate()` inside a formatted string, which can produce impossible dates near month boundaries.
- Answer class: `EXISTS_WIRED`. Several sections use cached or domain-level summaries rather than raw full-table reads.

Findings extracted: `dashboard-S1-F007`.

## Dimension 6: Sequential Next Moves

Key findings:

- Answer class: `EXISTS_WIRED`. Priority queue, daily plan banner, primary CTA, and lifecycle sections provide next-step guidance.
- Answer class: `RAIL_VISIBLE`. Sequential next moves should be represented in a dashboard Rail Profile as action queue, readiness, lifecycle, and attention categories.
- Answer class: `REQUIRES_RESOLVER`. The Tiered Rail exists, but there is no dedicated `/dashboard` Rail Profile.

Findings extracted: `dashboard-S1-F004`.

## Dimension 7: Parallel Next Moves & Delegation

Key findings:

- Answer class: `EXISTS_WIRED`. Multiple independent widgets expose parallel work: finance, scheduling, clients, staff, notes, pricing, and intelligence.
- Answer class: `ROLE_GATED`. Staff/admin/privileged concepts exist, but role rationale is not documented in the dashboard surface.
- Answer class: `FUTURE_BUILD_SIGNAL`. Delegation workflows could benefit from role-labeled Rail cards.

Findings extracted: `dashboard-S1-F013`.

## Dimension 8: Environmental Context

Key findings:

- Answer class: `EXISTS_WIRED`. Dashboard adapts to workspace density, archetype, tenant data presence, support status, and demo bypass.
- Answer class: `DENSITY_GATED`. `minimal` density hides substantial business-health and ambient content.
- Answer class: `FUTURE_BUILD_SIGNAL`. Density decisions should be codified in the Rail Profile so hidden content still has explainable triggers.

Findings extracted: `dashboard-S1-F010`.

## Dimension 9: Role Analysis

Key findings:

- Answer class: `EXISTS_WIRED`. The page is protected by `requireChef()`.
- Answer class: `ROLE_GATED`. Pricing admin sections use admin checks, and privileged-user bypass affects progressive disclosure.
- Answer class: `REQUIRES_PERMISSION_REVIEW`. Role rules are spread across sections and lack a route-level role visibility note.

Findings extracted: `dashboard-S1-F013`.

## Dimension 10: Entity Relationships

Key findings:

- Answer class: `EXISTS_WIRED`. The dashboard connects chef, tenant, events, clients, inquiries, payments, schedules, staff, recipes, pricing, CIL signals, and business-health intelligence.
- Answer class: `SYSTEM_ONLY`. Relationships are composed implicitly through many section loaders rather than a single dashboard view model.
- Answer class: `FUTURE_BUILD_SIGNAL`. A typed dashboard aggregate/read model would reduce repeated context loading.

Findings extracted: `dashboard-S1-F009`, `dashboard-S1-F021`.

## Dimension 11: Client Intelligence

Key findings:

- Answer class: `EXISTS_WIRED`. Client intelligence appears through dormant clients, birthdays, client attention, health score, LTV, pipeline, and next-event client join.
- Answer class: `RAIL_VISIBLE`. Client attention and risk should be first-class Rail categories for the dashboard.
- Answer class: `DENSITY_GATED`. Some client intelligence is hidden in lower-density views or deeper business-health surfaces.

Findings extracted: none beyond Rail Profile gap.

## Dimension 12: Intelligence Categories (Rail Mapping)

Key findings:

- Answer class: `EXISTS_WIRED`. CIL signal domains include finance, clients, calendar, inventory, reputation, pipeline, cannabis, commitment, and event debrief.
- Answer class: `RAIL_VISIBLE`. Recommended Rail categories: `action_queue`, `schedule`, `clients`, `finance`, `readiness`, `risk`, `intelligence`, `automation`.
- Answer class: `EXISTS_UNWIRED`. `CilSignalSummary` appears twice, which may double-show intelligence without route-level prioritization.

Findings extracted: `dashboard-S1-F015`, `dashboard-S1-F023`.

## Dimension 13: Data Flow & Performance

Key findings:

- Answer class: `EXISTS_WIRED`. The page uses many `Suspense` boundaries for streaming SSR and error isolation.
- Answer class: `SYSTEM_ONLY`. Sections independently call `requireChef()`, `getCachedIsPrivileged()`, and `getTenantDataPresence()`. These are likely cached, but the pattern still creates data waterfall and duplication risk.
- Answer class: `EXISTS_UNWIRED`. `HeroZone` receives authenticated user props but re-calls `requireChef()`.
- Answer class: `EXISTS_UNWIRED`. The local `safe()` helper is duplicated across multiple section files.

Findings extracted: `dashboard-S1-F005`, `dashboard-S1-F009`, `dashboard-S1-F012`, `dashboard-S1-F023`, `dashboard-S1-F024`.

## Dimension 14: Completion & Gaps

Key findings:

- Answer class: `EXISTS_WIRED`. Most key business domains have some dashboard representation.
- Answer class: `MISSING`. No dashboard test suite or test coverage blueprint entry exists.
- Answer class: `MISSING`. Empty states are inconsistent: several widgets return `null` without explaining whether there is no data, no access, or a loader failure.

Findings extracted: `dashboard-S1-F003`, `dashboard-S1-F018`.

## Dimension 15: Failure Modes

Key findings:

- Answer class: `EXISTS_WIRED`. Error boundaries and `safe()` wrappers provide graceful degradation.
- Answer class: `EXISTS_WIRED`. `error.tsx` and `loading.tsx` exist for route-level failure/loading.
- Answer class: `MISSING`. No route-specific `not-found.tsx`.

Findings extracted: `dashboard-S1-F006`.

## Dimension 16: Security & Data Safety

Key findings:

- Answer class: `EXISTS_WIRED`. The page requires chef auth before rendering.
- Answer class: `EXISTS_WIRED`. Explicit tenant scoping is present in inspected hero/onboarding DB reads.
- Answer class: `REQUIRES_PERMISSION_REVIEW`. Admin-only pricing sections depend on section-local checks and need route-level documentation.
- Answer class: `EXISTS_UNWIRED`. Direct DB access in sections bypasses domain interface expectations and should be centralized behind audited domain reads.

Findings extracted: `dashboard-S1-F001`, `dashboard-S1-F002`, `dashboard-S1-F013`.

## Dimension 17: Accessibility & Responsiveness

Key findings:

- Answer class: `EXISTS_WIRED`. Quick action links are semantic links and wrap responsively.
- Answer class: `REQUIRES_UI`. There is no explicit keyboard roving/focus management for the quick action bar, and focus styling should be verified.
- Answer class: `LOW`. Hardcoded stone-heavy colors need theme/contrast review.

Findings extracted: `dashboard-S1-F011`, `dashboard-S1-F017`.

## Dimension 18: Domain Interface Compliance

Key findings:

- Answer class: `EXISTS_UNWIRED`. `hero-zone.tsx` queries events, inquiries, financial summaries, and client joins directly.
- Answer class: `EXISTS_UNWIRED`. `onboarding-zone.tsx` queries chef profile fields directly.
- Answer class: `FUTURE_BUILD_SIGNAL`. A broader dashboard domain-interface audit should inspect every dashboard section that imports `createServerClient()`.

Findings extracted: `dashboard-S1-F001`, `dashboard-S1-F002`, `dashboard-S1-F019`.

## Dimension 19: Competitive Positioning

Key findings:

- Answer class: `EXISTS_WIRED`. The dashboard is operationally rich: it combines scheduling, finance, client risk, intelligence, staff, pricing, and business health.
- Answer class: `USER_VISIBLE`. Current feed and CIL concepts are differentiated product surfaces.
- Answer class: `FUTURE_BUILD_SIGNAL`. Better Rail structure would make the density feel intentional rather than overwhelming.

Findings extracted: `dashboard-S1-F025`.

## Dimension 20: Monetization & Business Value

Key findings:

- Answer class: `EXISTS_WIRED`. Revenue goal, outstanding balances, support badge, pricing alerts, pipeline status, and business health all support revenue outcomes.
- Answer class: `ROLE_GATED`. Admin-only pricing sections should document who sees pricing infrastructure data and why.
- Answer class: `USER_VISIBLE`. The page saves time by bringing cross-domain next actions into one workspace.

Findings extracted: `dashboard-S1-F013`.

## Dimension 21: Emotional & Professional Context

Key findings:

- Answer class: `EXISTS_WIRED`. Greeting, daily overview, onboarding guardrails, and business-health sections support calm operator awareness.
- Answer class: `LOW`. Greeting personalization stops at fragile first-name extraction and does not use loaded archetype context.
- Answer class: `DENSITY_GATED`. Minimal density is helpful for overload reduction but can hide high-value sections.

Findings extracted: `dashboard-S1-F008`, `dashboard-S1-F016`.

## Dimension 22: Cross-Page Cohesion

Key findings:

- Answer class: `EXISTS_WIRED`. Dashboard links into daily ops, briefing, menus, storefront, events, settings profile, and many domain surfaces.
- Answer class: `EXISTS_UNWIRED`. Some imported or duplicate intelligence components indicate cross-page/surface cohesion needs cleanup.
- Answer class: `FUTURE_BUILD_SIGNAL`. A dashboard route contract should define which surfaces belong on the dashboard vs. business-health vs. Rail.

Findings extracted: `dashboard-S1-F014`, `dashboard-S1-F015`.

## Dimension 23: Rail Profile Design

Key findings:

- Answer class: `MISSING`. No dedicated Rail Profile is configured for `/dashboard`.
- Answer class: `EXISTS_WIRED`. `TieredRailSection` already assembles rail data using `assembleRailForPage()` and `injectRailLifecycleItems()`.
- Answer class: `REQUIRES_RESOLVER`. The page needs route-specific category selection, resolver priorities, collapsed metrics, role gates, and density rules.

Findings extracted: `dashboard-S1-F004`.

Recommended Rail Profile:

- Route: `/dashboard`
- Entity scope: `tenant`
- Primary categories: `action_queue`, `schedule`, `clients`, `finance`, `risk`, `readiness`, `intelligence`, `automation`
- Collapsed metrics: open priority items, next event days, outstanding balance, CIL urgent count, overdue touchpoints, draft count
- Role rules: chef default; privileged/admin reveals pricing pipeline, coverage, OpenClaw, and system-health rails
- Density rules: minimal shows only action queue, schedule, urgent finance/client risk; standard/full adds intelligence, automation, business health, network/circles
- Missing resolver work: dashboard profile registry entry, density-aware category filter, CIL de-duplication strategy, admin pricing rail documentation

## Dimension 24: Testing & Verification

Key findings:

- Answer class: `MISSING`. No dashboard-specific tests were found.
- Answer class: `MISSING`. No `docs/test-coverage-blueprint.md` dashboard entry was found.
- Answer class: `FUTURE_BUILD_SIGNAL`. The dashboard needs smoke coverage for auth, empty states, density modes, archetype quick actions, duplicate CIL, and hero date logic.

Findings extracted: `dashboard-S1-F003`.

## Dimension 25: Build Opportunity Mining

Key build opportunities:

1. `BO-dashboard-001`: Move HeroZone data reads behind dashboard/domain actions and fix week-end date calculation. Tier: `CODEX`. Effort: small.
2. `BO-dashboard-002`: Move OnboardingZone profile-gated read behind chef/onboarding domain API. Tier: `CODEX`. Effort: small.
3. `BO-dashboard-003`: Add `/dashboard` Rail Profile with density-aware categories and admin gates. Tier: `CLAUDE`. Effort: medium.
4. `BO-dashboard-004`: Add focused dashboard smoke/unit tests for auth rendering, hero data boundaries, density gating, and duplicate CIL prevention. Tier: `CODEX`. Effort: medium.
5. `BO-dashboard-005`: Shared dashboard `safe()` utility or section loader pattern. Tier: `CODEX`. Effort: small.
6. `BO-dashboard-006`: Restore or remove `HealthNarrativeSection` import and decide whether health narrative belongs in the primary dashboard, business health, or Rail. Tier: `CLAUDE`. Effort: small.
7. `BO-dashboard-007`: Normalize dashboard empty-state strategy for sections currently returning `null`. Tier: `CLAUDE`. Effort: medium.

Findings extracted: all high and medium findings map to build opportunities.

## Dimension 26: Developer Notes & Agent Briefing

Summary:

`/dashboard` is not a normal page. Treat it as a streaming dashboard shell whose job is to coordinate many domains without becoming their data layer. Before changing it, read `page.tsx`, the section being modified, the domain action it should use, `lib/auth/get-user.ts`, progressive disclosure helpers, and Rail registry/resolver files.

Before modifying:

- Keep `requireChef()` and tenant scoping intact.
- Prefer domain action/barrel imports over `createServerClient()` inside dashboard sections.
- Preserve `Suspense` and widget-level failure isolation.
- Check density and privileged behavior for every added surface.
- Verify admin-only sections with explicit server-side checks, not nav visibility.
- Avoid adding more top-level sections until the Rail Profile and section ownership are clearer.

Test after modification:

- Run focused unit/smoke tests for touched domain actions and dashboard sections.
- Hard-refresh `http://localhost:3100/dashboard` if app work is fired later.
- Check console/server logs for section failures hidden by `safe()`.
- Verify minimal and standard density, brand-new chef state, privileged/admin gates, and populated tenant state.

Findings extracted: developer-note content is reflected in build opportunities and findings.

## Meta-Questions

- Scan count: 1
- Scan mode: full
- Questions represented: 1,261-question survey condensed across all 27 dimensions plus meta.
- Critical findings: 0
- High findings: 5
- Medium findings: 10
- Low findings: 5
- Info findings: 5
- Current highest-leverage fix: add `/dashboard` Rail Profile and refactor direct dashboard DB reads behind domain actions.

## Score Computations

| Score             | Value | Rationale                                                                                                                           |
| ----------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Domain wiring     |  0.55 | Most widgets use domain actions, but key dashboard sections bypass domain boundaries with direct DB reads.                          |
| Security          |  0.82 | Chef auth gate exists and inspected queries are tenant-scoped; admin role documentation and section-local direct reads need review. |
| Rail readiness    |  0.25 | Tiered Rail exists, but `/dashboard` has no dedicated Rail Profile or route-specific resolver priorities.                           |
| Role clarity      |  0.70 | Admin and privileged gates exist, but visibility rules are scattered and under-documented.                                          |
| Data completeness |  0.60 | Broad data coverage exists; empty states, hero date logic, and duplicated context reads reduce confidence.                          |
| Page usefulness   |  0.85 | Strong operational value, clear primary actions, significant time savings, and broad cross-domain visibility.                       |
| Cohesion          |  0.62 | Weighted score is held down by Rail/profile absence, domain boundary issues, and test gaps despite high usefulness.                 |

Weighted rubric baseline:

`(0.55 * 0.20) + (0.82 * 0.20) + (0.70 * 0.15) + (0.25 * 0.15) + (0.60 * 0.15) + (0.85 * 0.15) = 0.63`; scan-normalized cohesion recorded as `0.62`.

## Findings

### Critical

None.

### High

- `dashboard-S1-F001`: `hero-zone.tsx` uses `createServerClient()` directly instead of a dashboard/domain data interface.
- `dashboard-S1-F002`: `onboarding-zone.tsx` uses `createServerClient()` directly for chef profile gating.
- `dashboard-S1-F003`: No dashboard-specific tests or test coverage blueprint entry exist.
- `dashboard-S1-F004`: No Rail Profile is configured for `/dashboard`.
- `dashboard-S1-F005`: `HeroZone` re-calls `requireChef()` despite receiving user props from the authenticated page.

### Medium

- `dashboard-S1-F006`: No dashboard `not-found.tsx`.
- `dashboard-S1-F007`: Hero week-end calculation can produce invalid dates across month boundaries.
- `dashboard-S1-F008`: `firstName` extraction from email is fragile.
- `dashboard-S1-F009`: Multiple sections independently load auth, privileged access, and tenant presence.
- `dashboard-S1-F010`: Business health is collapsed/hidden for new or minimal users, reducing discoverability.
- `dashboard-S1-F011`: Quick action bar lacks an explicit keyboard navigation/focus pattern.
- `dashboard-S1-F012`: `safe()` helper is duplicated across many section files.
- `dashboard-S1-F013`: Admin-only pricing sections lack explicit role documentation.
- `dashboard-S1-F014`: `HealthNarrativeSection` is imported but not rendered.
- `dashboard-S1-F015`: `CilSignalSummary` is rendered twice.

### Low

- `dashboard-S1-F016`: Hero greeting does not use loaded archetype for deeper personalization.
- `dashboard-S1-F017`: Theme handling appears hardcoded around stone colors.
- `dashboard-S1-F018`: Some sections return `null` without empty-state messaging.
- `dashboard-S1-F019`: Direct `db.from()` reads use a Supabase-style query builder on a project that otherwise commonly uses typed domain layers.
- `dashboard-S1-F020`: Dashboard metadata only sets title; no description or OG metadata.

### Info

- `dashboard-S1-F021`: Dashboard touches 30+ domains and is the most interconnected page in the app.
- `dashboard-S1-F022`: Progressive disclosure is sophisticated: presence, privileged access, density, and archetype.
- `dashboard-S1-F023`: 60+ Suspense boundaries provide strong streaming SSR posture.
- `dashboard-S1-F024`: Widget error boundaries provide good per-widget graceful degradation.
- `dashboard-S1-F025`: The Current feed is an operational real-time feed concept worth preserving.
