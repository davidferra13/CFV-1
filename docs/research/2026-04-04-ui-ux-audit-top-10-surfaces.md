# UI/UX Audit: Top 10 ChefFlow Surfaces

> **Date:** 2026-04-04
> **Agent:** Research (Claude Opus 4.6)
> **Method:** Interface Philosophy doc review + Playwright walkthrough with agent account (1280x900 viewport)
> **Reference:** `docs/specs/universal-interface-philosophy.md` (Sections 2, 5, 6, 7, 11)

---

## Executive Summary

ChefFlow's UI is functional and data-rich, but several surfaces violate the Interface Philosophy's core rules. The two most impactful problems are: (1) the event detail page has no visible tab navigation on desktop and extends 8,400px vertically, and (2) the dashboard stacks too many widgets beyond the 7-widget maximum. Settings is the cleanest surface. The quotes page is broken (runtime error). Most surfaces lack a single clear primary action, and zero/empty states are often ambiguous.

**Violation count by severity:** 7 high, 9 medium, 8 low

---

## 1. DASHBOARD (`/dashboard`)

**Screenshots:** `audit-dashboard-top.png`, `audit-dashboard-scroll1.png`, `audit-dashboard-scroll2.png`

### What works

- Primary action ("+ New Event") is correctly placed top-right in orange
- Core Areas grid (6 cards) provides a clear launchpad with live counts
- "Respond Next" card is a strong contextual nudge (waiting 114h is appropriately urgent)
- Sidebar nav is clean: 7 top-level items + "Browse Everything" overflow (compliant with Section 2)

### Findings

| #   | Finding                                                                                                                                                                                                                   | Severity | Philosophy Violation                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| 1.1 | **4 hero metrics visible** (Events This Week, Open Inquiries, Revenue All Time, Outstanding). Philosophy allows max 2 hero metrics (Section 6). Revenue $0 and Outstanding $0 deliver no decision value for this account. | HIGH     | Section 6: max 2 hero metrics, Section 11: vanity metric test                       |
| 1.2 | **"Open Inquiries: 0" with "2 new this week" subtext** is contradictory. If 0 are open, the "2 new" were closed. Without explanation, this reads as a data error.                                                         | MEDIUM   | Section 1.4: honest over smooth                                                     |
| 1.3 | **Survey banner** persists on every page, consuming 40px of vertical space above content. Competes with actual operational banners.                                                                                       | MEDIUM   | Section 9: no banners/announcements by default, Section 11: forced onboarding gates |
| 1.4 | **Page extends to 2,335px.** At least 12+ widgets visible with scrolling (Priority Queue, Suggestions, Today's Schedule, Week Strip, Tasks, Business Health, Pricing, Dinner Circles). Well beyond the 7-widget max.      | HIGH     | Section 6: max 7 dashboard cards without scrolling                                  |
| 1.5 | **Core Areas cards truncate text** at the right edge ("Notificatio..." on Inbox card). Quick links are cut off without ellipsis.                                                                                          | LOW      | Section 12: no layout shifts, predictable rendering                                 |
| 1.6 | **Three header actions compete**: Briefing, Create Menu, + New Event. Only one should be primary. "Briefing" and "Create Menu" should be secondary or ghost.                                                              | MEDIUM   | Section 5: one primary button per view                                              |

### Recommended changes

- **Before:** 4 hero metrics (Events, Inquiries, Revenue, Outstanding) all at equal weight
- **After:** 2 hero metrics (Events This Week, Open Inquiries). Revenue and Outstanding move to a "Business Snapshot" supporting section below the fold.
- **Before:** 12+ widgets all rendered and visible
- **After:** Show max 7 widgets above the fold based on contextual relevance (if no events today, collapse Today's Schedule to a single line). Remaining widgets behind "Show more" or on dedicated pages.
- **Before:** Three header buttons at near-equal weight
- **After:** One primary ("+ New Event"), two ghost/secondary ("Briefing", "Create Menu")

---

## 2. EVENT DETAIL (`/events/[id]`)

**Screenshots:** `audit-event-tab-overview-desktop.png`, `audit-event-tab-money-desktop.png`, `audit-event-tab-ops-desktop.png`, `audit-event-tab-wrap-desktop.png`

### What works

- Breadcrumb navigation (Dashboard / Events / Event) is clear
- Status badge ("Draft") is prominent and accurate
- Service Lifecycle progress indicator is a strong concept

### Findings

| #   | Finding                                                                                                                                                                                                                                                                                              | Severity | Philosophy Violation                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| 2.1 | **Tab navigation is invisible on desktop.** The Overview/Money/Ops/Wrap tabs use `md:hidden` (mobile-only sticky nav). On desktop at 1280px, there is zero visible affordance to switch tabs. Users can only switch by editing the URL query param. This is the single most critical UX issue found. | HIGH     | Section 11: hidden critical actions, Section 4: explicit trigger with descriptive label |
| 2.2 | **Page is 8,401px tall.** The Service Lifecycle checklist alone (10 stages, 16 items each) dominates the page. For a new draft event with 0% completion, all 160 checkpoints are expanded.                                                                                                           | HIGH     | Section 6: cognitive load, Section 4: completed steps collapse                          |
| 2.3 | **No clear primary action.** Four buttons compete in the header: Edit Event, Schedule, Documents, Travel Plan. For a Draft event, the primary action should be "Propose to Client" (the FSM transition), but it's buried below 8,000px of content.                                                   | HIGH     | Section 5: one primary action per screen                                                |
| 2.4 | **Persistent "2 errors" toast** on every event page load (red, bottom-left). Related to 401/403 background API failures. Users see an error indicator with no actionable information.                                                                                                                | MEDIUM   | Section 10: specific error messages, not "something went wrong"                         |
| 2.5 | **"Propose to Client" and "Cancel Event" have equal visual weight.** Both are full-width colored buttons at the bottom. The destructive action should be visually separated and de-emphasized.                                                                                                       | MEDIUM   | Section 5: destructive actions separated by 16px+ or opposite side                      |
| 2.6 | **"Loading travel ingredients..." hangs indefinitely** at page bottom. Never resolves after 8+ seconds.                                                                                                                                                                                              | LOW      | Section 7: loading > 10s should become background task                                  |

### Recommended changes

- **Before:** No tab bar on desktop. Mobile-only sticky nav hidden at md breakpoint.
- **After:** Always-visible horizontal tab bar (Overview | Money | Ops | Wrap) below the event header on all viewports. Active tab visually distinct.
- **Before:** Service Lifecycle shows all 10 stages expanded with 160 checkpoints on first render.
- **After:** Only the current stage is expanded. Completed stages show a collapsed green checkmark. Future stages show as collapsed grey pills. Total visible items: 16 (one stage) instead of 160.
- **Before:** Four equal-weight action buttons in header. FSM transition buried at bottom.
- **After:** Primary action = the next FSM transition ("Propose to Client" for Draft). Promote it to the header as the primary orange button. Move Edit/Schedule/Documents/Travel to secondary or "More" overflow.

---

## 3. CLIENT DIRECTORY (`/clients`)

**Screenshots:** `audit-clients-list.png`

### What works

- Primary action ("+ Add Client") is clear, orange, top-right
- Empty state for pending invitations is honest text
- Sidebar "Clients" is highlighted as active nav

### Findings

| #   | Finding                                                                                                                                                                                                                                                    | Severity | Philosophy Violation                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| 3.1 | **6 feature shortcut cards above the client list** (Client Insights, Loyalty, Follow-Ups, Dietary, Recurring, Partners) push the actual client data below the fold. The thing the user came here for (their client list) is not visible without scrolling. | MEDIUM   | Section 1.1: interface serves the work, Section 3: active task takes priority |
| 3.2 | **Inline invitation form always visible.** The "Send Client Invitation" form is permanently expanded on the page body. This is a secondary action (most visits are to browse clients, not send invitations). It should be behind a button or modal.        | MEDIUM   | Section 4: progressive disclosure, Level 1 is the 20% used 80% of the time    |
| 3.3 | **15+ interactive elements above the fold** before the client list: survey banner, 2 header buttons, 6 shortcut cards, 2 form fields, checkbox, submit button, "Pending Invitations" section.                                                              | LOW      | Section 6: cognitive load constraints                                         |

### Recommended changes

- **Before:** 6 shortcut cards + invitation form + pending invitations section, then client list
- **After:** Client list immediately below header. Shortcut cards collapse into a "Tools" row (small pills or a single expandable section). Invitation form behind "+ Add Client" button (modal or drawer).

---

## 4. CLIENT DETAIL (`/clients/[id]`)

**Screenshots:** `audit-client-detail.png`, `audit-client-detail-scrolled.png`

### What works

- Primary action ("Create Event for Client") is clear
- Profile completeness meter (8%, red) is appropriately prominent
- Financial metrics show $0.00 honestly (not hidden, not disguised)

### Findings

| #   | Finding                                                                                                                                                                                 | Severity | Philosophy Violation                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| 4.1 | **31 panels on one page** (per the app audit). Even with scrolling, this is extreme density. No tabbed or sectioned organization visible from the screenshots.                          | HIGH     | Section 6: form fields per section max 7, Section 4: max two levels of disclosure |
| 4.2 | **Empty panels render fully.** Demographics, Culinary History, and many other panels show "Click Edit to add details" with full section chrome. Empty feature shells should not render. | MEDIUM   | Section 2: empty feature shells hide, Section 9: no empty feature sections        |
| 4.3 | **Hydration mismatch warning** on EntityPhotoUpload (React server/client attribute mismatch). Not user-visible but indicates a rendering inconsistency.                                 | LOW      | Technical debt                                                                    |

### Recommended changes

- **Before:** 31 panels in a single vertical scroll, all rendered regardless of data
- **After:** Group into 4-5 tabs or collapsible sections (Profile, Financial, Culinary, Communication, Operations). Empty sections render as a single collapsed line ("Demographics: not filled in") or are hidden entirely. Only sections with data expand by default.

---

## 5. QUOTES (`/quotes`)

**Screenshots:** `audit-quotes.png`

### What works

- Error boundary catches the crash and shows a recovery UI with "Try Again" and "Go to Dashboard"

### Findings

| #   | Finding                                                                                                                                                                           | Severity | Philosophy Violation                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| 5.1 | **Page is completely broken.** `getQuotes()` throws because an FK hint (`!quotes_event_id_fkey`) generates an invalid SQL column reference. The page renders only an error state. | HIGH     | Functional bug, not UX. But worth noting: the error message "Failed to fetch quotes / Error ID: 2090535025" is generic. |
| 5.2 | **Error message is not actionable.** "Error ID: 2090535025" means nothing to a chef.                                                                                              | LOW      | Section 10: plain language, no error codes                                                                              |

### Recommended changes

- **Before:** "Failed to fetch quotes / Error ID: 2090535025"
- **After:** Fix the FK hint in the query. For the error message: "Could not load your quotes. Please try again, or contact support if this continues."

---

## 6. RECIPES (`/recipes`)

**Screenshots:** `audit-recipes-list.png`

### What works

- Empty state illustration is inviting with clear guidance ("Start by importing recipes...")
- Category/cuisine/meal type filters are present and organized
- "New Recipe" primary CTA is correct

### Findings

| #   | Finding                                                                                                                                                                                                    | Severity | Philosophy Violation                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| 6.1 | **3 rows of controls for 0 content.** Tabs (Production Log, Ingredients, Import Hub, Photo Import, URL Import) + filter row (search, 3 dropdowns) + sort/view row. All visible when the recipe count is 0. | MEDIUM   | Section 3: empty-state features hide advanced controls                              |
| 6.2 | **Two competing orange primary CTAs in empty state.** "Recipe Dump" (orange) and "Create Recipe" (outlined) both appear, plus "New Recipe" in the header. Three entry points for creating a recipe.        | LOW      | Section 5: one primary action per screen, Section 11: two primary buttons violation |
| 6.3 | **5 tabs visible in header** (Production Log, Ingredients, Import Hub, Photo Import, URL Import). For a user with 0 recipes, Import Hub / Photo Import / URL Import are premature.                         | LOW      | Section 2: features user has never used are hidden by default                       |

### Recommended changes

- **Before:** Full filter/sort/tab toolbar visible at 0 recipes
- **After:** When recipe count is 0, show only the empty state with one primary CTA ("Create Your First Recipe"). Filter bar and tabs appear once the user has 3+ recipes.

---

## 7. CALENDAR (`/calendar`)

**Screenshots:** `audit-calendar.png`

### What works

- Month grid renders correctly
- Primary action ("1 New Entry") is orange, top-right
- Color legend is available

### Findings

| #   | Finding                                                                                                                                                                                                                   | Severity | Philosophy Violation                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| 7.1 | **Seasonal Palate side panel** competes for attention on a calendar page. It shows ingredient tags (Rhubarb, Fiddleheads, Sugar Snap Peas) which are culinary data, not scheduling data. This is a different task domain. | MEDIUM   | Section 3: features outside current task domain are suppressed |
| 7.2 | **6 filter chips at equal weight** (Full View, Prep, Events, Planning, Opening Hours, Closing Hours). No default-on indicator. Not clear which filters are active.                                                        | LOW      | Section 12: active item always visually distinct               |
| 7.3 | **No empty state for the month.** April 2026 shows all empty day cells with no guidance ("No events scheduled this month. Create your first event.").                                                                     | LOW      | Section 7: empty state requires illustration + text + CTA      |

### Recommended changes

- **Before:** Seasonal Palate panel visible by default on the calendar
- **After:** Move Seasonal Palate to Culinary section or make it a collapsible panel hidden by default on Calendar. Calendar stays focused on time.
- **Before:** Empty month with no explanation
- **After:** Subtle inline message in the calendar body: "No events this month" with a "Create Event" link.

---

## 8. INBOX (`/inbox`)

**Screenshots:** `audit-inbox.png`

### What works

- Gmail disconnected warning is prominent and actionable
- Empty state is well-designed with clear explanation
- "Smart Inbox" / "Raw Feed" tabs are a clean two-option split

### Findings

| #   | Finding                                                                                                                                                                                               | Severity | Philosophy Violation                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| 8.1 | **Three equal-weight CTAs in empty state** ("Connect Gmail" orange, "Log a Phone Call" outlined, "Log a Message" outlined). For a disconnected user, "Connect Gmail" should be clearly dominant.      | LOW      | Section 5: one primary, others secondary       |
| 8.2 | **Three feature explanation cards** (Auto-detected, Cross-channel merge, Noise filtered) are onboarding copy inside a working page. Fine for first visit but should disappear after Gmail connection. | LOW      | Section 9: no banners/announcements by default |
| 8.3 | **"Calendar" button in top-right** is an out-of-context navigation shortcut. Not related to inbox function.                                                                                           | LOW      | Section 11: redundant controls                 |

### Recommended changes

- **Before:** Three CTAs at near-equal weight + explanation cards
- **After:** "Connect Gmail" as sole primary CTA (large, centered). "Log a Phone Call" and "Log a Message" as text links below. Feature explanation cards shown only on first visit (dismissible), or removed entirely.

---

## 9. SETTINGS (`/settings`)

**Screenshots:** `audit-settings.png`

### What works

- Cleanest surface in the audit. 5 cards with 2 links each.
- Clear grouping (Daily workflow, Your business, Client-facing, Integrations, AI and system)
- "Advanced settings directory" as a catch-all overflow
- No competing actions, no unnecessary elements

### Findings

| #   | Finding                                                                                                                                          | Severity | Philosophy Violation |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------- |
| 9.1 | **No issues found.** This page is compliant with the Interface Philosophy. Clean hub navigation, within cognitive limits, no competing elements. | NONE     | Compliant            |

### Recommended changes

None. This is the reference pattern for how hub pages should look across the app.

---

## 10. DOCUMENTS (`/documents`)

**Screenshots:** `audit-documents.png`

### What works

- Document type buttons are clearly labeled
- Event-First workspace shows real data counts

### Findings

| #    | Finding                                                                                                                                                                                                                  | Severity | Philosophy Violation                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------- |
| 10.1 | **Three competing sections with no primary action.** Document Search (top), Private Chef Event Pack (middle), Event-First Workspace (bottom) are three different entry points with three different interaction patterns. | MEDIUM   | Section 5: one primary action, Section 11: competing UI elements |
| 10.2 | **"Grab Anything Documents" heading** is unclear copy. It tries to be clever but doesn't communicate what the page does.                                                                                                 | LOW      | Section 1.1: interface serves the work                           |
| 10.3 | **10 document type buttons at equal visual weight** in the Event Pack section. No hierarchy, no most-used indicator.                                                                                                     | LOW      | Section 6: max 7 items in any group without sub-grouping         |

### Recommended changes

- **Before:** Three stacked sections (Search, Event Pack, Workspace) all competing for attention
- **After:** Lead with the Event-First Workspace (most common use case: "I have an event, generate its documents"). Document Search becomes a search bar within the workspace. Event Pack document types become a secondary section or a modal triggered from the workspace.
- **Before:** "Grab Anything Documents"
- **After:** "Documents" (plain, functional)

---

## GLOBAL FINDINGS (All Surfaces)

| #   | Finding                                                                                                                                                                                                         | Severity | Philosophy Violation                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------- |
| G.1 | **Survey banner on every page** consumes 40px, adds visual noise, competes with operational banners.                                                                                                            | MEDIUM   | Section 9: no announcements by default |
| G.2 | **Cookie consent banner overlaps content** on every page until dismissed. Standard behavior, but should be bottom-fixed and not overlay content.                                                                | LOW      | N/A (legal requirement)                |
| G.3 | **Background 401/403 errors on 8 of 10 pages.** SSE and analytics endpoints fail for the agent account. While not user-visible as errors (except event detail "2 errors" toast), they indicate silent failures. | LOW      | Technical debt                         |

---

## PRIORITY RANKING

### High Impact (fix first)

1. **Event detail: invisible tab navigation on desktop** (2.1) - Users literally cannot navigate the page's primary organization structure
2. **Event detail: 8,400px page with no collapse** (2.2) - Lifecycle checklist overwhelms; next action is buried
3. **Event detail: no clear primary action** (2.3) - FSM transition should be promoted to header
4. **Dashboard: 12+ widgets exceeding 7-max** (1.4) - Information overload on the most-visited page
5. **Dashboard: 4 hero metrics instead of 2** (1.1) - Dilutes focus; zero-value metrics waste space
6. **Client detail: 31 panels in one scroll** (4.1) - Needs tabbed organization
7. **Quotes page: broken** (5.1) - Functional failure; FK hint bug in query

### Medium Impact (fix second)

8. **Client directory: 6 shortcut cards above client list** (3.1) - Primary content below fold
9. **Client directory: inline invitation form always visible** (3.2) - Should be behind progressive disclosure
10. **Recipes: 3 rows of controls for 0 content** (6.1) - Advanced controls visible at empty state
11. **Calendar: Seasonal Palate side panel** (7.1) - Wrong task domain on calendar
12. **Documents: three competing sections** (10.1) - No clear entry point
13. **Dashboard: competing header actions** (1.6) - Three buttons instead of one primary
14. **Dashboard: contradictory inquiry metric** (1.2) - "0 open" + "2 new this week" confuses
15. **Event detail: equal-weight Propose/Cancel buttons** (2.5) - Destructive action not separated
16. **Survey banner on all pages** (G.1) - Persistent distraction

### Low Impact (fix when convenient)

17. **Client detail: empty panels render fully** (4.2)
18. **Recipes: two competing orange CTAs** (6.2)
19. **Recipes: 5 tabs visible at 0 content** (6.3)
20. **Calendar: no empty month state** (7.3)
21. **Calendar: filter chips lack active state** (7.2)
22. **Inbox: three equal-weight CTAs** (8.1)
23. **Documents: "Grab Anything" heading** (10.2)
24. **Documents: 10 equal-weight buttons** (10.3)

---

## Reference: Anti-Pattern Checklist (Section 11) Results

| Anti-Pattern                          | Found On                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| More than 2 hero metrics              | Dashboard (4 hero metrics)                                                        |
| More than 7 widgets without scrolling | Dashboard (12+)                                                                   |
| Metrics without context               | Dashboard (Revenue $0 with no comparison)                                         |
| Two primary buttons same screen       | Recipes (empty state), Dashboard (header)                                         |
| Hidden critical actions               | Event detail (tab nav invisible on desktop), Event detail (FSM transition buried) |
| Empty feature shells rendered         | Client detail (empty Demographics, Culinary History panels)                       |
| Redundant controls                    | Inbox ("Calendar" button), Recipes (3 recipe creation entry points)               |
| Competing UI elements                 | Documents (3 sections), Event detail (4 equal header buttons)                     |

---

## Model Surface: Settings

The Settings page (`/settings`) is the one surface that fully complies with the Interface Philosophy. Use it as the template for redesigning hub pages: 5 grouped cards, 2 links each, clean overflow, zero clutter. Apply this pattern to Clients, Documents, and Culinary hub pages.
