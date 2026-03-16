# ChefFlow UX Refinement Master Plan

> **Created:** 2026-03-15
> **Status:** Research complete, ready for execution
> **Companion docs:** `docs/research/user-centered-research-frameworks.md` (interview guides, survey instruments, testing protocols)

---

## Executive Summary

ChefFlow has ~265 pages, 65+ dashboard widgets, 100+ nav routes, and 13 nav groups. The feature set is comprehensive, but the **user journey needs refinement** to match how private chefs actually work: mobile-first, time-poor, action-oriented, juggling multiple clients at different lifecycle stages.

This plan identifies exactly what to fix, in what order, using what research, without discarding any prior work.

---

## 1. Current State Analysis

### What We Have (Strengths to Preserve)

| Strength                           | Why It Works                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| **Priority Queue system**          | Action-oriented: tells chefs what to do next, not just what exists                    |
| **Widget card architecture**       | Modular, streamable, collapsible, user-reorderable                                    |
| **Focus Mode**                     | Filters sidebar to core features only (already addresses nav overload for some users) |
| **Time-of-day greeting**           | Personal touch, sets context                                                          |
| **4-section streaming dashboard**  | Schedule, Alerts, Business, Intelligence load independently                           |
| **Mobile bottom tabs**             | 5 tabs (Home, Daily Ops, Inbox, Events, Clients) covers the most-used flows           |
| **Customizable sidebar**           | Users can pin/reorder shortcuts via Settings > Navigation                             |
| **Archetype-based primary action** | Dashboard CTA adapts to chef's business stage                                         |

### What Needs Refinement (Pain Points)

| Pain Point                       | Evidence                                                                                                       | Severity |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| **Nav overload**                 | 30 standalone items + 13 groups with 100+ total routes. Even with Focus Mode, new users see too much           | High     |
| **Dashboard widget density**     | 65+ widgets across 4 sections. "Data vomit" risk: chefs can't find signal in noise                             | High     |
| **No command palette**           | Linear, Notion, Figma all prove Cmd+K scales infinitely. Every feature becomes searchable without touching nav | High     |
| **Shortcut strip is static**     | 8 fixed icons (Events, Inquiries, Clients, Remy, Recipes, Analytics, Finance, Settings). Not personalized      | Medium   |
| **Duplicate nav paths**          | "Calendar" appears in standaloneTop AND Events group. "Menus" in standaloneTop AND Culinary group              | Medium   |
| **Mobile bottom tabs are fixed** | 5 tabs can't be customized. A chef who never uses "Daily Ops" but lives in "Menus" can't swap them             | Medium   |
| **Deep nav items are invisible** | Features like "Demand Forecast," "Procurement Hub," or "Crisis Response" are 3+ clicks deep                    | Low      |
| **Settings explosion**           | 30+ settings shortcuts. Settings page itself needs its own IA                                                  | Low      |

---

## 2. Competitive Intelligence

### What Top Platforms Get Right

**Linear (project management):**

- Minimal sidebar with workspace-level grouping
- **Cmd+K command palette as primary navigation** (every action available via search)
- Keyboard-first design, mouse-optional
- Context-sensitive right panel (detail without leaving the list)

**Stripe Dashboard (financial SaaS):**

- **3-5 hero metrics on landing** (not 50)
- "Glimpse" pattern: "6 of 25 payments failed" with one-click drill-down
- Progressive disclosure: summary first, details on demand
- Clean sidebar, never more than 15 items visible at once

**Toast POS (hospitality):**

- Role-based views (owner vs. manager vs. staff see different navs)
- Calendar/timeline as primary organizing metaphor
- **Daily revenue always visible** in header
- Mobile app is a first-class citizen, not a scaled-down desktop

**Square Dashboard (SMB SaaS):**

- **Getting Started checklist** for new users (progressive onboarding)
- Clean 8-item sidebar with expandable sections
- "Items" and "Customers" are top-level; analytics is secondary
- Mobile app mirrors desktop nav exactly

**7shifts (restaurant scheduling):**

- Context-aware dashboard (today's schedule vs. this week's overview)
- Team-oriented nav (who's working, who's off, labor cost)
- Notifications as a first-class nav item

### Key Takeaway

The best SaaS platforms with 50+ features follow one universal pattern: **progressive disclosure with multiple access paths.** Every feature is reachable via (1) sidebar nav, (2) command palette/search, AND (3) contextual links from related pages. No single path has to carry all the weight.

---

## 3. Prioritized Refinement Roadmap

### Phase 1: Navigation Bar (Highest Impact, Lowest Risk)

**Goal:** Reduce cognitive load without removing features.

#### 1a. Command Palette (Cmd+K / Ctrl+K)

The single highest-leverage UX improvement. Every feature becomes searchable without touching the sidebar.

**Implementation approach:**

- Fuzzy search across all nav items (standaloneTop + navGroups + settings shortcuts)
- Recent actions (last 5 pages visited)
- Quick actions ("Create Event," "Log Expense," "New Quote")
- Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- Mobile: search icon in header or swipe-down gesture

**Why this matters:** Adding new features no longer creates nav debt. The command palette scales infinitely. Linear proved this; Notion proved this; Figma proved this.

**Effort:** Medium (1-2 sessions). Reuse existing `getPrimaryShortcutOptions()` which already aggregates all nav items.

#### 1b. Smart Sidebar Defaults

**Current:** 30 standalone items shown (minus adminOnly, minus Focus Mode filtering).

**Proposed:**

- **Default view (Focus Mode ON by default for new users):** Show only `coreFeature: true` items (13 items). This is already built.
- **Graduated disclosure:** After 2 weeks or 50+ sessions, prompt: "Ready to see more? Turn off Focus Mode to access all features."
- **"Discover" badge:** When a new feature launches, show a subtle dot on the parent nav group. Clicking it reveals the new item with a one-line explainer.

**Effort:** Low (half session). Focus Mode already exists. Just change the default and add the onboarding prompt.

#### 1c. Consolidate Duplicate Nav Paths

Remove items from `standaloneTop` that are already in nav groups, keeping them only in the group:

| Item               | Currently in standaloneTop | Also in navGroup           | Action                    |
| ------------------ | -------------------------- | -------------------------- | ------------------------- |
| Calendar           | Yes (`/schedule`)          | Events group (`/calendar`) | Keep standaloneTop only   |
| Menus              | Yes (`/menus`)             | Culinary group             | Keep standaloneTop only   |
| Rate Card          | Yes (`/rate-card`)         | Sales group                | Remove from standaloneTop |
| Travel             | Yes (`/travel`)            | N/A                        | Keep (no group exists)    |
| Stations           | Yes (`/stations`)          | Operations group           | Remove from standaloneTop |
| Commerce (5 items) | Yes (5 separate items)     | Commerce group             | Remove from standaloneTop |

**Effort:** Low (15 min). Edit `nav-config.tsx`.

#### 1d. Customizable Mobile Bottom Tabs

**Current:** 5 fixed tabs (Home, Daily Ops, Inbox, Events, Clients).

**Proposed:** Let chefs swap tabs via Settings > Navigation. Offer 8-10 options, they pick 5. Default stays the same.

**Effort:** Medium (1 session). Add a setting, read it in the mobile tab renderer.

---

### Phase 2: Dashboard Landing Experience

**Goal:** First thing a chef sees should answer: "What do I need to do right now?"

#### 2a. Reduce Default Widget Count

**Current:** 65+ widgets across 4 sections, all enabled by default.

**Proposed:** Ship with 8-12 "starter" widgets enabled. Everything else available via Dashboard Settings (already built).

**Starter set (covers the daily workflow):**

| Widget             | Why It's Essential                      |
| ------------------ | --------------------------------------- |
| Priority Queue     | "What needs my attention right now"     |
| Today's Schedule   | "What's happening today"                |
| Week Strip         | "What's coming this week"               |
| Response Time      | "Am I falling behind on inquiries"      |
| Revenue Goal       | "Am I on track financially"             |
| Pending Follow-ups | "Who am I forgetting to follow up with" |
| Quick Expense      | "Log that grocery receipt fast"         |
| Payments Due       | "Who owes me money"                     |

**Power users** who want all 65+ widgets can enable them in Settings > Dashboard (already built and working).

**Effort:** Low (30 min). Change default widget visibility in the widget config.

#### 2b. Time-Aware Dashboard Sections

**Current:** Time-of-day greeting exists but doesn't affect what's shown.

**Proposed:**

- **Morning (before noon):** Lead with today's schedule, prep tasks, shopping lists
- **Afternoon (noon-5pm):** Lead with active event status, real-time alerts
- **Evening (after 5pm):** Lead with tomorrow's preview, end-of-day financial summary, inquiry responses

This is a **sort order change**, not a content change. All widgets remain available; the order shifts based on time of day.

**Effort:** Low-Medium (1 session). Modify section ordering logic in the dashboard page.

#### 2c. Hero Metrics Row

Add a fixed 3-4 stat row at the top of the dashboard (above the priority banner):

| Metric               | Source                         |
| -------------------- | ------------------------------ |
| This month's revenue | `event_financial_summary` view |
| Events this week     | Calendar query                 |
| Open inquiries       | Inquiry count query            |
| Outstanding balance  | Ledger computation             |

These are always visible, never collapsible. The "at a glance" numbers a chef checks 10x/day.

**Effort:** Medium (1 session). New component, 4 parallel data fetches.

---

### Phase 3: Tab-by-Tab Refinement

After nav and dashboard, systematically improve each major section. Priority order based on usage frequency:

#### 3a. Inquiries (most used daily)

- **First-click test:** Can chefs find "respond to inquiry" in under 2 taps?
- **Mobile optimization:** Inquiry list + quick-reply must work one-handed
- **Status badges:** Make inquiry lifecycle stages visually distinct (awaiting response = red, sent to client = blue, etc.)

#### 3b. Events (core workflow)

- **Kanban board refinement:** Is drag-and-drop intuitive? Do status columns match mental models?
- **Event detail page:** Tab order should match workflow (Details > Menu > Quote > Payments, not alphabetical)

#### 3c. Clients (relationship hub)

- **Client profile consolidation:** Dietary, history, spending, communication all on one scrollable page (not 4 separate sub-pages)
- **Quick actions from client card:** "Send message," "Create event," "View history"

#### 3d. Finance (weekly check-in)

- **P&L at a glance:** Revenue vs. expenses for current month, right on the financial hub
- **Invoice status pipeline:** Visual funnel (draft > sent > viewed > paid > overdue)

#### 3e. Recipes & Menus (creative space)

- **Visual menu builder:** Drag recipes onto a menu, see pricing update in real-time
- **Recipe card gallery view** (photos, not just a list)

---

## 4. User Research Execution Plan

### Who to Research

**Target:** 4 beta testers (active users) + 8-12 additional private chefs (non-users for unbiased perspective).

**Segments to cover:**

1. Solo starters (1-3 events/week)
2. Established operators (4-8 events/week)
3. Premium/team chefs (8+ events/week, have staff)

### Research Methods (in order)

| Method                                | What It Tells Us                                   | When     | Participants     |
| ------------------------------------- | -------------------------------------------------- | -------- | ---------------- |
| **User interviews**                   | Workflows, pain points, mental models              | Week 1-2 | 8-12 chefs       |
| **Card sorting**                      | How chefs group features (validates nav structure) | Week 3   | 15-20 chefs      |
| **Tree testing**                      | Can chefs find features in our nav hierarchy?      | Week 3-4 | 30-50 chefs      |
| **First-click testing**               | Do dashboard/nav labels match expectations?        | Week 4   | 20-30 chefs      |
| **Moderated usability testing**       | End-to-end task completion, mobile performance     | Week 5-6 | 5-8 chefs        |
| **SUS + NPS + feature matrix survey** | Quantitative baseline for tracking improvement     | Week 7   | All active users |

### Interview Questions (Top 10 for Nav/Dashboard Focus)

1. "Walk me through yesterday from when you woke up to when you were done working."
2. "What's the first thing you check on your phone in the morning related to work?"
3. "When you open ChefFlow, where do you go first? Why?"
4. "Have you ever known a feature existed but couldn't find it?"
5. "Do you ever feel overwhelmed by how many options or screens there are?"
6. "What features do you use every day vs. once a month vs. never?"
7. "What percentage of your work-related app usage is on your phone vs. computer?"
8. "When you're at a client's home or at the market, what do you need to look up?"
9. "What's the most tedious task you do every week that you wish would just disappear?"
10. "If you could wave a magic wand and fix one thing about how you manage your business, what would it be?"

Full interview guide with all 22 questions: `docs/research/user-centered-research-frameworks.md`

### Usability Test Tasks (Core 8)

| Task                                           | Tests                 | Success =                  |
| ---------------------------------------------- | --------------------- | -------------------------- |
| Create inquiry for a new client dinner         | Inquiry creation flow | Done in <3 min             |
| Find client's allergies, add shellfish allergy | Client navigation     | Found in <2 min            |
| Create a quote: $150/person, 8 guests          | Quote flow            | Correct total in <3 min    |
| Check last month's total revenue               | Financial navigation  | Correct screen in <30 sec  |
| Find all events next week                      | Calendar navigation   | Correct view in <20 sec    |
| Record a $600 payment                          | Payment flow          | Logged correctly in <2 min |
| Start adding a new recipe                      | Recipe creation       | Form opened in <30 sec     |
| Send follow-up to a client                     | Communication         | Message sent in <2 min     |

### Measurement Baseline (Current State)

Before making changes, measure:

- **SUS score** (target: 68+ for first measurement, 80+ after refinements)
- **NPS** (target: 30+ for B2B SaaS)
- **Feature importance/satisfaction matrix** (identifies "fix these first" quadrant)
- **Task frequency distribution** (confirms which features belong in primary nav)

---

## 5. Principles for Refinement

These principles guide every decision. They are not suggestions.

### P1: Progressive Disclosure Over Feature Hiding

Never remove a feature. Instead, layer access: essential features visible by default, everything else one search/click away. The command palette (Cmd+K) is the safety net that makes progressive disclosure work.

### P2: Action Over Information

Every dashboard element should either (a) tell the chef what to do next, or (b) let them do it right there. Passive information ("you have 12 clients") without an action ("send a campaign to inactive ones") is wasted screen space.

### P3: Mobile is Primary, Desktop is Power Mode

Core actions (check schedule, respond to inquiry, view client, record payment) must be completable in 3 taps on a phone. Desktop adds power features (financial reports, menu builder, recipe entry) but is never required for daily operations.

### P4: Personalization Over One-Size-Fits-All

Different chefs need different things visible. A solo starter doesn't need the inventory module. A team chef doesn't need onboarding. Let the system adapt via usage patterns, archetype detection (already built), and explicit preferences.

### P5: Consistency Over Cleverness

Labels should match mental models. "Inquiries" not "Pipeline." "Calendar" not "Schedule." "Payments" not "Financial Transactions." If tree testing shows <60% agreement on a label, rename it.

### P6: Speed is a Feature

Every dashboard load, every nav click, every search result must feel instant. Streaming sections (already built) help. But if a widget takes 3 seconds to render, it should show a meaningful skeleton, not a spinner.

---

## 6. What We Are NOT Doing

- **Not rebuilding the dashboard.** The widget card architecture is solid. We're curating defaults and adding hero metrics.
- **Not removing features from nav.** We're adding progressive disclosure (Focus Mode default, command palette) so features are discoverable without overwhelming.
- **Not changing the sidebar layout.** Vertical collapsible sidebar is the industry standard. We're refining what's in it, not how it works.
- **Not redesigning the mobile app.** The 5 bottom tabs are correct for the core workflow. We're making them customizable.
- **Not discarding research.** All existing docs, audits, and architecture decisions remain canonical.

---

## 7. Success Metrics

| Metric                       | Current (Estimated)         | Target                             | How to Measure                    |
| ---------------------------- | --------------------------- | ---------------------------------- | --------------------------------- |
| SUS score                    | Unknown (first measurement) | 75+                                | SUS survey after 2 weeks of use   |
| NPS                          | Unknown                     | 30+                                | In-app survey quarterly           |
| Time to find "check revenue" | ~30 sec (estimated)         | <10 sec                            | Usability testing                 |
| Time to respond to inquiry   | ~3 min (estimated)          | <90 sec                            | Usability testing                 |
| Feature discoverability      | Unknown                     | 80%+ features found in first click | First-click testing               |
| Dashboard load time          | ~2 sec (streaming)          | <1.5 sec                           | Lighthouse / real user monitoring |
| Mobile task completion rate  | Unknown                     | 90%+ for core 5 tasks              | Usability testing                 |

---

## Appendix: File References

| File                                                 | Role                                                    |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `components/navigation/nav-config.tsx`               | Single source of truth for all navigation               |
| `app/(chef)/dashboard/page.tsx`                      | Dashboard page layout                                   |
| `app/(chef)/dashboard/_sections/`                    | 4 streaming dashboard sections                          |
| `components/dashboard/`                              | 65+ widget components                                   |
| `lib/scheduling/types.ts`                            | Widget IDs, grid sizing, icons                          |
| `lib/dashboard/widget-actions.ts`                    | Dashboard data queries                                  |
| `docs/app-complete-audit.md`                         | Master registry of all pages/buttons/forms              |
| `docs/research/user-centered-research-frameworks.md` | Interview guides, survey instruments, testing protocols |
