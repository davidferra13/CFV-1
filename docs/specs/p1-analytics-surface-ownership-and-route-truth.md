# Spec: Analytics Surface Ownership and Route Truth

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** medium-large (8-12 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 06:05 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 06:05 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- The phase-shift audit already identified a six-surface overlap around dashboard, briefing, analytics, insights, guest analytics, and intelligence.
- The builder needs route truth and surface ownership, not another vague note that these pages "overlap."
- If a page is real, it should keep a clear job. If a link points to something that does not exist, that needs to be corrected directly.

### Developer Intent

- **Core goal:** stop the chef-facing analytics surfaces from competing with each other by assigning a clear job to each route and fixing the current link drift to non-existent analytics destinations.
- **Key constraints:** do not delete real pages, do not rebuild analytics data logic, do not merge all reporting into one giant rewrite, and do not widen this into the separate events/production or culinary/recipes overlap lanes.
- **Motivation:** the current system already has useful surfaces, but the overlap in naming, nav structure, and links makes the product feel more redundant and more confusing than it actually is.
- **Success from the developer's perspective:** a builder can answer, without guessing, what each of these routes is for: `/dashboard`, `/briefing`, `/analytics`, `/insights`, `/guest-analytics`, and `/intelligence`. Generic analytics links go to one canonical place, focused drill-down links go to real existing pages, and no UI points to non-existent analytics routes.

---

## What This Does (Plain English)

This spec assigns explicit ownership to the chef-facing insight surfaces. `/dashboard` stays the default daily operating home. `/briefing` stays the one-page daily readout. `/analytics` becomes the canonical reporting root for generic "analytics" and "metrics" navigation. `/insights` remains a companion interpretation page for client and history patterns. `/intelligence` remains the deterministic recommendation engine, not a second dashboard. `/guest-analytics` remains a guest-specific relationship view under the guest/client domain, not a peer business analytics root.

This spec also fixes route truth. The current UI contains analytics links that target routes that do not exist, including `/analytics/referrals`, `/analytics/marketing/spend`, and `/analytics/website`. After this spec is built, those links must resolve either to real focused routes or to stable tab deep-links on the canonical `/analytics` surface.

---

## Why It Matters

The product currently has a real overlap problem, but it is not because all six pages do the same thing. The real problem is that the product presents them like competing doors into the same vague category. That creates avoidable confusion for chefs and avoidable implementation drift for builders.

The problem is worsened by route dishonesty: some visible links already point to analytics destinations that do not exist. That means this lane is no longer just a clarity issue. It is also a broken-navigation issue.

---

## Current State (What Already Exists)

### Verified route roles

- `/dashboard` is the chef home and already speaks in "today at a glance" language.
- `/briefing` is a single-scroll morning readout driven by `getMorningBriefing()`.
- `/analytics` is a tabbed "Analytics Hub" with nine metric domains.
- `/insights` is a separate client/history pattern page with tabs for clientele, seasons, client base, operations, and Take a Chef ROI.
- `/intelligence` is a gated deterministic intelligence workspace backed by multiple intelligence engines.
- `/guest-analytics` is a guest-specific page focused on repeat guests, dinner groups, and guest conversion patterns.

### Verified overlap and presentation drift

- The phase-shift audit explicitly flags six overlapping dashboard and analytics pages.
- The route discoverability report confirms all of these surfaces are discoverable.
- The analytics nav group currently mixes these surfaces as peers in ways that blur their jobs:
  - the first analytics item points to `/analytics/benchmarks`, not the `/analytics` hub
  - `/insights` is mixed with children that point back into `/analytics`
  - `/intelligence` is labeled as a hub and then exposes a child called `Full Dashboard`
- `components/dashboard/referral-widget.tsx` links to `/analytics/referrals`, which does not exist.
- `components/analytics/analytics-hub-client.tsx` links to `/analytics/marketing/spend` and `/analytics/website`, which do not exist.

### Verified domain distinctions that must be preserved

- `/dashboard` and `/briefing` are about current operational awareness.
- `/analytics` and its focused `/analytics/*` routes are about reporting and measurement.
- `/insights` is about pattern interpretation across client and event history.
- `/intelligence` is about deterministic recommendations, alerts, and forecasts.
- `/guest-analytics` belongs with guests and clients, not as a second business analytics root.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/analytics/page.tsx`                                            | Accept a `tab` search param and pass a validated initial tab into the analytics client so shared links can deep-link into real built tabs instead of pointing to non-existent routes.                                                                                         |
| `components/analytics/analytics-hub-client.tsx`                            | Support a validated `initialTab` prop, keep tab state aligned with the canonical analytics root, and replace links to non-existent analytics routes with real routes or canonical tab deep-links.                                                                             |
| `app/(chef)/insights/page.tsx`                                             | Accept a `tab` search param and pass a validated initial tab into the insights client.                                                                                                                                                                                        |
| `components/analytics/insights-client.tsx`                                 | Support a validated `initialTab` prop so `/insights` can be linked intentionally without inventing new routes.                                                                                                                                                                |
| `components/navigation/nav-config.tsx`                                     | Rework the analytics group so `/analytics` is the canonical analytics root, `/insights` is clearly labeled as a companion interpretation surface, `/intelligence` is clearly labeled as a recommendation engine, and no nav item implies these are all equivalent dashboards. |
| `app/(chef)/dashboard/page.tsx`                                            | Keep the `/briefing` CTA, but ensure the button text and surrounding copy treat it as the daily briefing, not a second generic dashboard.                                                                                                                                     |
| `components/dashboard/referral-widget.tsx`                                 | Replace the broken `/analytics/referrals` link with the existing focused route for referral analytics.                                                                                                                                                                        |
| `lib/help/page-info-sections/10-chef-portal-analytics.ts`                  | Expand or revise analytics help metadata so `/analytics`, `/insights`, and `/intelligence` have clearly different descriptions and responsibilities.                                                                                                                          |
| `lib/help/page-info-sections/20-chef-portal-miscellaneous.ts`              | Remove stale or misleading wording that describes `/insights` like a generic AI insights page if the route is actually a history-pattern interpretation surface. Keep `/guest-analytics` described as a guest-domain surface.                                                 |
| `docs/app-complete-audit.md`                                               | Update the analytics/dashboard overlap notes so they reflect the new route-ownership model instead of only flagging the redundancy.                                                                                                                                           |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Add this as the analytics-specific consolidation slice under the redundancy lane and execution order.                                                                                                                                                                         |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No schema work is part of this slice.
- Do not create analytics preference tables, route alias tables, or redirect registries just to solve surface ownership.

---

## Data Model

This is a route-ownership and link-truth correction, not a persistence change.

### Canonical route contract

- `canonicalChefHome = '/dashboard'`
- `canonicalDailyBrief = '/briefing'`
- `canonicalAnalyticsRoot = '/analytics'`
- `canonicalInsightsCompanion = '/insights'`
- `canonicalIntelligenceEngineRoot = '/intelligence'`
- `canonicalGuestAnalyticsRoot = '/guest-analytics'`

### Meaning of each surface

- `/dashboard`
  - default chef home
  - cross-domain daily operating surface
  - the place for "what matters now" and next actions
- `/briefing`
  - one-page daily readout
  - current-day awareness and shift context
  - not a generic analytics or reporting hub
- `/analytics`
  - canonical root for generic analytics, metrics, reports, sources, and measurement CTAs
  - parent for canonical tab deep-links such as `?tab=marketing`
- `/analytics/*`
  - focused deep-dive reporting routes that already exist
  - keep these for dedicated reporting views and shareable entrypoints
- `/insights`
  - companion interpretation surface for client and history patterns
  - not the generic analytics home
- `/intelligence`
  - deterministic recommendation and alert engine
  - not a second dashboard and not the generic analytics home
- `/guest-analytics`
  - guest-specific relationship and attendance analytics
  - belongs with guests and clients, not as a peer analytics root

### Allowed analytics tab deep-links

`/analytics` may support:

- `?tab=overview`
- `?tab=revenue`
- `?tab=operations`
- `?tab=pipeline`
- `?tab=clients`
- `?tab=marketing`
- `?tab=social`
- `?tab=culinary`
- `?tab=benchmarks`

`/insights` may support:

- `?tab=clientele`
- `?tab=seasons`
- `?tab=client-base`
- `?tab=operations`
- `?tab=take-a-chef`

### Explicit invariants

- Do not delete or redirect `/briefing`, `/insights`, `/guest-analytics`, or `/intelligence` in this slice.
- Do not collapse all insight surfaces into `/analytics`.
- Do not describe `/intelligence` as a second "dashboard" in nav or help metadata.
- Do not describe `/guest-analytics` as a generic business analytics home.
- Do not leave any user-facing CTA pointing to an analytics route that does not exist.

---

## Server Actions

No new server actions are required.

No analytics query, intelligence engine, or history aggregation changes belong in this slice.

Builder note:

- Query-param parsing for initial tab selection belongs in the route/page layer plus the existing client components.
- Do not introduce new persistence or server actions just to remember a selected analytics tab.

---

## UI / Component Spec

### Page Layout

#### `/dashboard`

- Keep this as the default chef home.
- Keep daily-action language centered on "today," "next," and "needs attention."
- Keep the direct CTA to `/briefing`, but label it as `Morning Briefing` or otherwise clearly as the daily brief, not as a second generic overview.

#### `/briefing`

- Keep this route alive and directly accessible.
- Treat it as a compact daily readout.
- Do not market it as a dashboard replacement, analytics page, or intelligence workspace.

#### `/analytics`

- This is the one canonical root for generic analytics navigation.
- When a card or helper link means "see the analytics area," it goes here.
- Support tab deep-linking through `?tab=...` so UI can reach real built sections without inventing fake child routes.
- Dedicated `/analytics/*` deep dives still remain valid where they already exist.

#### `/insights`

- Keep this route as a companion interpretation surface, not a replacement analytics home.
- Use copy that emphasizes patterns, client behavior, history, and interpretation.
- Support tab deep-linking through `?tab=...` for its existing internal tabs.

#### `/intelligence`

- Keep this route as the recommendation and engine layer.
- Use copy that emphasizes deterministic suggestions, alerts, predictions, and action prompts.
- Do not call it `Full Dashboard`.

#### `/guest-analytics`

- Keep this route nested conceptually under guests/clients.
- Do not promote it as a peer of `/analytics` or `/insights`.

### Navigation and copy rules

- Generic `Analytics` nav points to `/analytics`.
- Analytics group first item must be the real analytics root, not `/analytics/benchmarks`.
- `/insights` nav label should make the companion job obvious, for example `Clientele Insights` or similar concrete language.
- `/intelligence` nav label may stay `Intelligence Hub`, but its child and help text must not call it `Full Dashboard`.
- `Guest Insights` remains reachable from the guest/client area.

### Route-truth fixes

- `components/dashboard/referral-widget.tsx` must point to the existing referral analytics route.
- Any current "marketing spend" or "website stats" helper link inside the analytics hub must resolve to the canonical analytics root with a valid `tab` deep-link, not to non-existent routes.
- Any link or copy that uses `dashboard` to mean `analytics`, or `analytics` to mean `intelligence`, must be corrected to the route that actually owns that job.

### States

- **Loading:** invalid or missing `tab` params fall back to the canonical default tab for the page.
- **Empty:** empty analytics states still stay on the owning surface. Empty does not justify routing users to another overlapping page.
- **Error:** if a deep-linked tab cannot load its data, stay on the owning route and show the existing error or empty behavior. Do not bounce the user to another insight surface.
- **Populated:** populated data does not change route ownership. A useful chart on `/insights` does not make `/insights` the analytics root.

---

## Edge Cases and Error Handling

| Scenario                                                                                                | Correct Behavior                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A builder tries to solve the overlap by redirecting `/insights` or `/intelligence` into `/analytics`    | Do not do that in this slice. These pages have real differentiated jobs and should remain separate.    |
| A builder leaves `/analytics/referrals`, `/analytics/marketing/spend`, or `/analytics/website` in place | That is wrong. Those routes do not exist and must be replaced with real destinations.                  |
| A builder points generic analytics nav to `/analytics/benchmarks` again                                 | That recreates the current confusion. `/analytics` is the canonical analytics home.                    |
| A builder keeps `Full Dashboard` language under `/intelligence`                                         | That recreates the overlap. `/intelligence` is an engine/recommendation layer, not a second dashboard. |
| A builder promotes `/guest-analytics` into the analytics root or analytics nav group                    | That is wrong. Guest analytics belongs under guests/clients.                                           |
| A builder adds query-param deep-links but does not validate bad values                                  | Invalid values must fall back safely to the default tab instead of breaking rendering.                 |

---

## Verification Steps

1. Sign in as a chef and open the analytics navigation group.
2. Verify: the generic analytics entry opens `/analytics`, not `/analytics/benchmarks`.
3. Verify: `/insights` and `/intelligence` are still reachable, but their labels and descriptions make their jobs visibly different from `/analytics`.
4. Open `/dashboard`.
5. Verify: the briefing CTA still exists and reads as a daily briefing, not a second generic dashboard.
6. Navigate to `/analytics?tab=marketing`.
7. Verify: the analytics hub opens successfully on the marketing tab.
8. Navigate to `/insights?tab=operations`.
9. Verify: the insights page opens successfully on the operations tab.
10. Navigate to `/analytics` with an invalid tab value.
11. Verify: it falls back safely to the default tab.
12. Trigger the `Referrals` dashboard widget link.
13. Verify: it lands on a real existing analytics route.
14. Open the marketing or website helper links inside the analytics hub.
15. Verify: they land on real existing destinations, not 404 routes.
16. Open `/guest-analytics`.
17. Verify: the page still works and remains framed as a guest-domain surface rather than a generic analytics hub.
18. Open `/intelligence`.
19. Verify: it still works behind its existing upgrade gate and no longer uses `Full Dashboard` language in nav/help metadata.

---

## Out of Scope

- Rebuilding analytics queries, metrics definitions, or chart logic.
- Rewriting the dashboard architecture beyond copy and route-positioning changes needed for this lane.
- Reworking the separate events/production overlap lane.
- Reworking the separate culinary/recipes overlap lane.
- Changing upgrade-gate behavior for `/intelligence`.
- Deleting analytics, insights, intelligence, or guest analytics routes.
- Building new analytics detail pages for marketing spend or website stats in this slice.

---

## Notes for Builder Agent

1. **This is not a merge-everything spec.** The correct outcome is clearer ownership, not fewer pages at any cost.

2. **Fix route truth first.** Broken links to non-existent analytics routes are objective defects and should be corrected as part of this slice.

3. **Keep the hierarchy honest.** `dashboard` is the home, `briefing` is the daily brief, `analytics` is the reporting root, `insights` is interpretation, `intelligence` is recommendations, and `guest-analytics` is guest-domain analysis.

4. **Use deep-links instead of fake routes.** If a built tab already exists inside `/analytics` or `/insights`, link to that page with a validated `?tab=` parameter rather than inventing another route.

5. **Do not accidentally widen this into a shell redesign.** The shell-clarity spec already owns the broader entry-surface curation pass. This slice is specifically about analytics-surface ownership and route honesty.
