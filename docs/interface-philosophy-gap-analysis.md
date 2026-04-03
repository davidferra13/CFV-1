# Interface Philosophy - Compliance Gap Analysis

> **Purpose:** Bridge document between the Universal Interface Philosophy (governance) and the current ChefFlow implementation. Tells builders exactly what violates the rules, what's already compliant, and what to fix first.
>
> **Source of truth:** `docs/specs/universal-interface-philosophy.md`
>
> **Generated:** 2026-04-03

---

## Current Compliance Summary

| Area                             | Status        | Detail                                                                                    |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| Primary button discipline        | Compliant     | 1 `gradient-accent` primary per screen on dashboard                                       |
| Dashboard progressive disclosure | Compliant     | `DashboardSecondaryInsights` collapsed by default                                         |
| Command Center card count        | Compliant     | 6 cards (under 7 limit)                                                                   |
| Five mandatory states            | Partial       | Suspense + ErrorBoundary covers Loading/Error, but Empty/Partial handling is inconsistent |
| Hero metrics                     | **Violation** | 4 displayed, max 2 allowed (Section 6)                                                    |
| Sidebar standaloneTop items      | **Violation** | 9 non-admin items, max 7 allowed (Section 2)                                              |
| Action Bar shortcuts             | **Violation** | 8 items, max 7 allowed (Section 6)                                                        |
| Dashboard visible sections       | Borderline    | ~7 sections before scroll (at the limit)                                                  |
| Nav groups in All Features       | Acceptable    | 15 groups, but behind Level 2 disclosure (All Features drawer)                            |
| MetricsStrip                     | Compliant     | 4-6 contextual metrics, conditional rendering, returns null when empty                    |

---

## Violations (ordered by severity)

### V1. Hero Metrics: 4 displayed, max 2 hero allowed

**Rule:** Section 6, Cognitive Load Constraints: "Dashboard hero metrics: maximum 2. When exceeded, demote to supporting tier."

**Current state:** `app/(chef)/dashboard/_sections/hero-metrics.tsx` returns 4 metrics:

1. Revenue (all time)
2. Events this week
3. Open inquiries
4. Outstanding balance

**Fix:** Pick the 2 most decision-driving metrics as hero. Demote the other 2 to a supporting row (smaller text, below the hero pair, or inside the Command Center cards as contextual counts). Apply the vanity metric test to each: "What decision would I make differently based on this number?"

**Recommendation:** "Events this week" and "Open inquiries" are actionable (they drive "what do I do today"). "Revenue (all time)" is a vanity metric (cumulative, never decreases, no comparison context). "Outstanding" is actionable but lower urgency. Promote Events + Inquiries to hero. Demote Revenue and Outstanding to supporting.

---

### V2. Sidebar standaloneTop: 9 items, max 7 allowed

**Rule:** Section 2, Visibility Rules: "Navigation to the user's most-used areas (max 7 top-level items)." Section 6: "Top-level nav items: maximum 7."

**Current state:** `components/navigation/nav-config.tsx` lines 131-238. The 9 non-admin items:

1. Dashboard (primary)
2. Inbox (primary)
3. Events (primary)
4. Clients (primary)
5. Dinner Circles (primary)
6. Culinary (secondary)
7. Finance (secondary)
8. Operations (secondary)
9. Growth (secondary)

**Fix: Make Focus Mode default to ON.** Focus Mode already exists and solves this completely. When active, the sidebar shows 5 primary shortcuts (Dashboard, Inbox, Inquiries, Events, Clients) + 4 nav groups. Both under the 7-item limit. Power users toggle it off in Settings > Modules.

**Implementation (1-line fix):** In `lib/billing/focus-mode-actions.ts` line 27, change `return (data as any)?.focus_mode ?? false` to `return (data as any)?.focus_mode ?? true`. This aligns the runtime default with the schema default (`focus_mode` column in `chef_preferences` already defaults to `true` per `lib/db/schema/schema.ts` line 24154).

**Bug found:** The schema sets `focus_mode` default to `true` but `isFocusModeEnabled()` returns `false` on null. This means new users (no preferences row yet) see the full 9-item sidebar instead of the intended clean default. Fixing this one line resolves both the bug and the violation.

**Philosophy alignment:** Section 1.5: "Opinionated by default, flexible on demand." Focus Mode ON = opinionated clean sidebar. Toggle OFF = flexible expansion.

---

### V3. Action Bar: 8 shortcuts, max 7 allowed

**Rule:** Section 6: "Top-level nav items: maximum 7. Overflow into 'More' or grouped submenu."

**Current state:** `nav-config.tsx` lines 1927-1936 define 8 action bar items: Inbox, Calendar, Events, Clients, Menus, Money, Prep, Circles.

**Fix: Remove Calendar from Action Bar.** Calendar is already in Events' submenu (`nav-config.tsx` line 148: `{ href: '/calendar', label: 'Calendar' }`). Having it as both a standalone Action Bar item and an Events sub-item is a redundant control (anti-pattern, Section 11). Removing it drops the Action Bar to 7 items and eliminates the redundancy.

**Implementation:** Remove the Calendar entry from the `actionBarItems` array in `nav-config.tsx` (line ~1929). No other files affected.

**Impact:** Minor. Over by 1, and the removed item is already accessible via Events.

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

| Area                          | Why It's Compliant                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Primary button per screen     | Only 1 `gradient-accent` CTA on dashboard header; other buttons use secondary styling                 |
| Secondary insights            | `DashboardSecondaryInsights` is collapsed by default (`useState(true)`) with localStorage persistence |
| Command Center                | 6 cards in responsive grid (under 7 limit)                                                            |
| MetricsStrip                  | Conditional rendering; returns null when empty; 4-6 items only when data exists                       |
| Destructive action separation | Delete/remove actions use `danger` variant, separated from primary CTAs                               |
| Module toggle system          | Inactive modules are invisible; `lib/billing/modules.ts` controls surface visibility                  |

---

## Research Findings Not Yet Applied

The 4 research reports in `docs/research/` contain findings that inform the fix priority but are not yet synthesized into actionable rules:

1. **chef-software-ux-patterns.md**: "4-7 item working memory limit under pressure." Reinforces the 7-item maximum. Also: "glanceable in under 2 seconds" applies to hero metrics (fewer = faster scan).

2. **consumer-platform-interaction-patterns.md**: "10x conversion when options reduced from 24 to 6." Directly supports reducing nav items. "Skeleton screens feel 20-30% faster than spinners" (already implemented via Suspense fallbacks).

3. **interface-philosophy-enforceable-rules.md**: Hick's Law (decision time increases logarithmically with options). Supports demoting hero metrics from 4 to 2. Fitts's Law (larger targets, closer to cursor = faster). Primary action placement already follows this.

4. **operator-interface-philosophy-research.md**: "91% drop off within 14 days." First-impression clutter drives abandonment. "1,100 context switches/day" means every unnecessary element competes for scarce attention. Reinforces aggressive defaults.

---

## Fix Priority for Builder Agent

| Priority | Violation                         | Effort                            | Impact                       | Decision                                               |
| -------- | --------------------------------- | --------------------------------- | ---------------------------- | ------------------------------------------------------ |
| 1        | V1: Hero metrics 4 -> 2           | Small (1 file, hero-metrics.tsx)  | High (first thing users see) | Events + Inquiries hero; Revenue + Outstanding demoted |
| 2        | V2: Sidebar 9 -> 7 items          | Tiny (1 line, focus-mode-actions) | High (every page load)       | Fix runtime default to `true` (match schema)           |
| 3        | V3: Action Bar 8 -> 7             | Tiny (1 line, nav-config)         | Low (over by 1)              | Remove Calendar (already in Events submenu)            |
| 4        | B2: Large nav groups sub-grouping | Medium (nav-config structure)     | Low (behind All Features)    | Sub-group items in groups exceeding 7                  |

**All 3 violations have unambiguous fixes. No decisions needed from the developer.** A builder can execute V1 through V3 sequentially without pausing for input. V2 also fixes a bug (schema/runtime default mismatch).

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
