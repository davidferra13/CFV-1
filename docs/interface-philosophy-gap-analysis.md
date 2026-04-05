# Interface Philosophy - Compliance Gap Analysis

> **Purpose:** Bridge document between the Universal Interface Philosophy (governance) and the current ChefFlow implementation. Tells builders what is compliant now, what was just corrected, and what still needs monitoring.
>
> **Source of truth:** `docs/specs/universal-interface-philosophy.md`
>
> **Generated:** 2026-04-03
> **Updated:** 2026-04-03

---

## Current Compliance Summary

| Area                             | Status     | Detail                                                                                          |
| -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Primary button discipline        | Compliant  | 1 `gradient-accent` primary per screen on dashboard                                             |
| Dashboard progressive disclosure | Compliant  | `DashboardSecondaryInsights` collapsed by default                                               |
| Command Center card count        | Compliant  | 6 cards (under 7 limit)                                                                         |
| Five mandatory states            | Partial    | Suspense + ErrorBoundary covers Loading/Error, but Empty/Partial handling is still inconsistent |
| Hero metrics                     | Compliant  | 2 hero metrics only; Revenue and Outstanding demoted into supporting tier                       |
| Sidebar standaloneTop items      | Compliant  | Focus Mode default now matches schema default, restoring the intended low-clutter entry posture |
| Action Bar shortcuts             | Compliant  | 7 items; Calendar remains reachable via Events instead of duplicating the shortcut              |
| Dashboard visible sections       | Borderline | ~7 sections before scroll (at the limit)                                                        |
| Nav groups in All Features       | Acceptable | 15 groups, but behind Level 2 disclosure (All Features drawer)                                  |
| MetricsStrip                     | Compliant  | 4-6 contextual metrics, conditional rendering, returns null when empty                          |

---

## Resolved Violations (historical context)

These three measured violations were corrected on the 2026-04-03 preserved dirty checkout and should no longer be treated as active queue items.

### V1. Hero Metrics: resolved

**Rule:** Section 6, Cognitive Load Constraints: "Dashboard hero metrics: maximum 2. When exceeded, demote to supporting tier."

**Current state:** `app/(chef)/dashboard/_sections/hero-metrics.tsx` now promotes only two decision-driving hero metrics: Events this week and Open inquiries. Revenue and Outstanding still exist, but as smaller supporting metrics below the hero tier in `hero-metrics-client.tsx`.

**Disposition:** closed. Builders should preserve the 2-hero / supporting-tier split unless a future UI audit replaces it with a different compliant structure.

---

### V2. Sidebar standaloneTop: resolved

**Rule:** Section 2, Visibility Rules: "Navigation to the user's most-used areas (max 7 top-level items)." Section 6: "Top-level nav items: maximum 7."

**Current state:** `lib/billing/focus-mode-actions.ts` now defaults `isFocusModeEnabled()` to `true` when no `chef_preferences` row exists, which matches the schema default and restores the intended clean first-run sidebar.

**Disposition:** closed. This remains a behavioral invariant: schema default and runtime default must stay aligned.

---

### V3. Action Bar: resolved

**Rule:** Section 6: "Top-level nav items: maximum 7. Overflow into 'More' or grouped submenu."

**Current state:** `components/navigation/nav-config.tsx` now exposes 7 action-bar items. Calendar remains reachable through Events, which removes the redundant top-level shortcut without losing access.

**Disposition:** closed. If future builders add a shortcut back into the action bar, they must remove or regroup something else to stay under the cap.

---

## Borderline (Monitor, Not Blocking)

### B1. Dashboard sections before scroll: ~7

**Current visible sections (default viewport, secondary collapsed):**

1. Hero Metrics
2. Command Center (6 cards)
3. Respond Next
4. Dinner Circles
5. Focus grid (Priority Queue + AAR + Touchpoints)
6. Suggestions (Smart Suggestions + MetricsStrip)
7. Schedule (Today & This Week)

This is at the limit of 7. Any new section added to the default dashboard without removing one would be a violation. Future builders: adding a dashboard section requires removing or collapsing an existing one.

### B2. Nav groups inside All Features: 15 groups

These are behind Level 2 disclosure (the "All Features" drawer), so the philosophy permits them. However, individual groups contain 4-25 items each. Groups over 7 items should use internal sub-grouping per Section 6. This is a polish task, not a blocker.

---

## Already Compliant (No Action Needed)

| Area                          | Why It's Compliant                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Primary button per screen     | Only 1 `gradient-accent` CTA on dashboard header; other buttons use secondary styling                          |
| Secondary insights            | `DashboardSecondaryInsights` is collapsed by default (`useState(true)`) with localStorage persistence          |
| Command Center                | 6 cards in responsive grid (under 7 limit)                                                                     |
| Hero metrics                  | Dashboard hero tier is capped at 2, with lower-urgency metrics demoted into a smaller supporting row           |
| Sidebar entry posture         | Focus Mode default now aligns with the DB default, restoring the intended opinionated low-clutter sidebar path |
| Action Bar                    | Reduced to 7 shortcuts with no redundant Calendar entry                                                        |
| MetricsStrip                  | Conditional rendering; returns null when empty; 4-6 items only when data exists                                |
| Destructive action separation | Delete/remove actions use `danger` variant, separated from primary CTAs                                        |
| Module toggle system          | Inactive modules are invisible; `lib/billing/modules.ts` controls surface visibility                           |

---

## Research Findings Not Yet Applied

The 4 research reports in `docs/research/` still contain findings that inform follow-up work:

1. **chef-software-ux-patterns.md**: "4-7 item working memory limit under pressure." Reinforces the 7-item maximum. Also: "glanceable in under 2 seconds" applies to hero metrics.
2. **consumer-platform-interaction-patterns.md**: "10x conversion when options reduced from 24 to 6." Directly supports reduced top-level choice density.
3. **interface-philosophy-enforceable-rules.md**: Hick's Law and Fitts's Law still matter for remaining dashboard and nav grouping work.
4. **operator-interface-philosophy-research.md**: "91% drop off within 14 days" and "1,100 context switches/day" reinforce aggressive clean defaults.

---

## Remaining Builder Priority

| Priority | Remaining item                    | Effort        | Impact                    | Decision                                                            |
| -------- | --------------------------------- | ------------- | ------------------------- | ------------------------------------------------------------------- |
| 1        | Five mandatory state consistency  | Medium        | Medium                    | Normalize Empty / Partial state handling before adding dashboard UI |
| 2        | B2: Large nav groups sub-grouping | Medium        | Low (behind All Features) | Sub-group items in groups exceeding 7                               |
| 3        | B1: Dashboard section count drift | Ongoing watch | Medium                    | Do not add a default-visible dashboard section without removing one |

**No active release-blocking violations remain in this measured slice.** Future UI work should treat the resolved items above as preserved baseline, not as open queue work.

---

## April 5 Violations (Resolved)

Three additional violations found April 5 and fixed in the same session:

### V4. Inquiries Filter Tabs: resolved

**Rule:** Section 6: "Tabs on a single page: maximum 6. Use dropdown for overflow."

**Was:** 7 status tabs + up to 4 platform buttons + 5 budget mode buttons = 12-16 visible controls.

**Fix:** Replaced 5 budget mode buttons with a `<select>` dropdown, matching the existing pattern for platform overflow. Now: 7 status tabs + platform buttons + 1 budget dropdown.

**File:** `components/inquiries/inquiries-filter-tabs.tsx`

### V5. Event Detail Header: resolved

**Rule:** Section 5: "Every screen has exactly one primary action." Section 11 anti-pattern: "Competing UI elements."

**Was:** 8-10 equally-weighted secondary buttons in the header (Edit Event, Schedule, Documents, Packing List, Grocery Quote, Travel Plan, Create Story, Back to Events).

**Fix:** Kept 3 primary actions visible (Edit Event, Schedule, Documents). Moved context-dependent actions (Packing List, Grocery Quote, Travel Plan, Create Story) into a "More" dropdown menu.

**Files:** `app/(chef)/events/[id]/page.tsx`, `components/events/event-actions-overflow.tsx` (new)

### V6. Quotes Intelligence Panels: resolved

**Rule:** Section 6 cognitive load. Section 11 anti-pattern: "Unnecessary metrics - the vanity metric test."

**Was:** 3 intelligence panels (Quote Intelligence Bar, Pricing Intelligence Bar, Quote Acceptance Insights) all expanded by default above the filter tabs and quote list.

**Fix:** Wrapped all 3 panels in a collapsed `<details>` disclosure ("Quote Insights"), hidden by default. Chef can expand when needed. Primary focus goes to the filter tabs and quote list.

**File:** `app/(chef)/quotes/page.tsx`

---

## Governing References

- **Philosophy spec:** `docs/specs/universal-interface-philosophy.md`
- **Definition of done (compliance section):** `docs/definition-of-done.md` > "Interface Philosophy Compliance"
- **CLAUDE.md quick reference:** Line 28 (mandatory read for builders)
- **Research reports:** `docs/research/chef-software-ux-patterns.md`, `docs/research/consumer-platform-interaction-patterns.md`, `docs/research/interface-philosophy-enforceable-rules.md`, `docs/research/operator-interface-philosophy-research.md`
- **UX master plan (historical):** `docs/research/ux-refinement-master-plan.md`
- **Nav config:** `components/navigation/nav-config.tsx`
- **Dashboard layout:** `app/(chef)/dashboard/page.tsx`
- **Hero metrics:** `app/(chef)/dashboard/_sections/hero-metrics.tsx`
