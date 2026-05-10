# Hub Consolidation Spec

> Reduce 802 pages and 14 nav groups into 7 workspace hubs. Nothing deleted. Every existing page becomes a tab, panel, or contextual view within its parent hub.

## Principles

1. **Zero deletion** - every feature survives, just relocated
2. **One page per concept** - duplicates merge (winner keeps URL, loser redirects)
3. **Tabs over routes** - sub-pages become tabs within a workspace shell
4. **Filters over pages** - status pages (pending/paid/overdue) become filter states on one table
5. **Panels over navigation** - detail views slide in as panels, not full page transitions
6. **Progressive disclosure** - show 5 tabs by default, overflow into "More" dropdown

## The 7 Hubs

### 1. TODAY (formerly: dashboard, daily, briefing, ops, stations)

**URL:** `/today`
**Purpose:** "What do I need to do right now?"

| Tab      | Absorbs                                                |
| -------- | ------------------------------------------------------ |
| Overview | `/dashboard`, `/briefing`, `/daily`                    |
| Prep     | `/ops/prep`, `/prep-timeline/*`, `/stations/daily-ops` |
| Service  | `/ops/service`, `/ops/stations`, `/stations/*`         |
| Kitchen  | `/ops/inventory`, `/kitchen/*`                         |
| Log      | `/ops/performance`, `/stations/ops-log`                |

**Detail panels:** Event ops (`/events/[id]/ops`) opens as a slide-over from Overview.

---

### 2. PIPELINE (formerly: inquiries, leads, quotes, proposals, contracts, calls, prospecting)

**URL:** `/pipeline`
**Purpose:** "Who's trying to hire me and where are they in the process?"

| Tab       | Absorbs                                          |
| --------- | ------------------------------------------------ |
| Inbox     | `/inquiries/*` (all status pages become filters) |
| Leads     | `/leads/*`, `/guest-leads`, `/prospecting/*`     |
| Quotes    | `/quotes/*`, `/proposals/*`                      |
| Contracts | `/contracts/*`                                   |
| Calls     | `/calls/*`                                       |

**Status pages become filters:** `/inquiries/awaiting-response`, `/inquiries/declined`, etc. become a single table with a status dropdown. Same for `/leads/new`, `/leads/qualified`, `/leads/converted`.

**Detail panels:** Individual inquiry (`/inquiries/[id]`) opens as a slide-over panel.

---

### 3. EVENTS (formerly: events, calendar, scheduling, availability, production)

**URL:** `/events`
**Purpose:** "My upcoming and past dinners"

| Tab        | Absorbs                                            |
| ---------- | -------------------------------------------------- |
| Calendar   | `/calendar/*`, `/availability/*`, `/scheduling/*`  |
| Upcoming   | `/events` list (filtered to future)                |
| Past       | `/events` list (filtered to past)                  |
| Production | `/production/*`, event prep/shopping/packing views |
| Templates  | `/events/templates/*`                              |

**Event detail remains a full page** (`/events/[id]`) because it has its own complex tab structure (menu, guests, timeline, documents, etc.). This is correct - events are deep enough to warrant their own page.

---

### 4. CULINARY (formerly: recipes x2, menus x2, ingredients, dishes, components, costing, food-cost)

**URL:** `/culinary`
**Purpose:** "My food - recipes, menus, ingredients, costs"

| Tab         | Absorbs                                                                               |
| ----------- | ------------------------------------------------------------------------------------- |
| Recipes     | `/recipes/*` + `/culinary/recipes/*` (MERGE - one library)                            |
| Menus       | `/menus/*` + `/culinary/menus/*` (MERGE - one library)                                |
| Ingredients | `/ingredients/*`, `/culinary/ingredients/*`                                           |
| Dishes      | `/dishes/*`, `/culinary/dishes/*`                                                     |
| Costing     | `/culinary/costing/*`, `/food-cost/*`, `/finance/plate-costs`, `/inventory/food-cost` |
| Components  | `/culinary/components/*`, `/culinary/sub-recipes/*`                                   |

**Duplicate resolution:**

- `/recipes` wins over `/culinary/recipes` (shorter URL, more intuitive)
- `/menus` wins over `/culinary/menus`
- `/culinary/costing` wins (it's the most complete)

**Recipe/Menu detail remains full page** - these have edit modes, complex forms.

---

### 5. PEOPLE (formerly: clients, guests, guest-leads, guest-analytics, staff, team, circles, contacts)

**URL:** `/people`
**Purpose:** "Everyone I work with or for"

| Tab      | Absorbs                                               |
| -------- | ----------------------------------------------------- |
| Clients  | `/clients/*` (all 36 sub-pages become filters/panels) |
| Guests   | `/guests/*`, `/guest-analytics`                       |
| Staff    | `/staff/*`, `/team/*`                                 |
| Circles  | `/dinner-circles/*`, `/community/*`                   |
| Contacts | `/contacts/*`, `/connections/*`                       |

**Client sub-page consolidation:** The 36 client sub-pages collapse dramatically:

- `/clients/active`, `/clients/inactive`, `/clients/vip` = filter states on one table
- `/clients/insights/*` = panel within client detail
- `/clients/communication/*` = tab on client detail page
- `/clients/preferences/*` = tab on client detail page
- `/clients/loyalty/*` = tab on client detail page
- `/clients/history/*` = tab on client detail page

**Client detail remains full page** (`/people/clients/[id]`) with its own tabs: Overview | Preferences | History | Communication | Loyalty

---

### 6. MONEY (formerly: finance, expenses, payments, invoices, commerce, billing, tax)

**URL:** `/money`
**Purpose:** "Cash in, cash out, what do I owe, what am I owed"

| Tab      | Absorbs                                                            |
| -------- | ------------------------------------------------------------------ |
| Overview | `/finance/overview/*`, `/finance/page`, `/finance/cash-flow`       |
| Invoices | `/finance/invoices/*` (7 status pages become filters)              |
| Expenses | `/finance/expenses/*` (7 category pages become filters)            |
| Payments | `/finance/payments/*`, `/finance/payouts/*`                        |
| Reports  | `/finance/reporting/*` (9 report types become a selector)          |
| Tax      | `/finance/tax/*`, `/finance/sales-tax/*`, `/finance/year-end`      |
| More     | Payroll, Retainers, Ledger, Contractors, Disputes, Forecast, Goals |

**67 finance pages collapse to 7 tabs** with filters and panels. Individual invoices/expenses open as panels.

---

### 7. GROW (formerly: marketing, social, reviews, reputation, testimonials, portfolio, network)

**URL:** `/grow`
**Purpose:** "Getting more clients and building reputation"

| Tab       | Absorbs                                                        |
| --------- | -------------------------------------------------------------- |
| Marketing | `/marketing/*` (campaigns, sequences, templates, push-dinners) |
| Social    | `/social/*` (posts, planner, vault, calendar)                  |
| Reviews   | `/reviews/*`, `/reputation/*`, `/testimonials/*`               |
| Portfolio | `/portfolio/*`                                                 |
| Network   | `/network/*`, `/community/*` (professional connections)        |

---

## Navigation Structure

### Sidebar (Primary Nav)

```
[Chef Avatar]
─────────────
⚡ Today
📋 Pipeline
🍽️ Events
🧑‍🍳 Culinary
👥 People
💰 Money
📈 Grow
─────────────
⚙️ Settings
❓ Help
```

**That's it.** 7 items + 2 utility. Down from 200+ navigable items.

### Secondary Nav (Within Each Hub)

Horizontal tab bar at top of each hub page. Max 5-6 visible tabs, overflow into "More" dropdown.

### Tertiary Nav (Filters)

Within a tab, status/category filtering via dropdown or pill buttons. NOT separate pages.

---

## Redirects Strategy

Every old URL gets a permanent redirect to its new location. Examples:

| Old URL                        | New URL                               |
| ------------------------------ | ------------------------------------- |
| `/dashboard`                   | `/today`                              |
| `/briefing`                    | `/today`                              |
| `/daily`                       | `/today`                              |
| `/inquiries`                   | `/pipeline?tab=inbox`                 |
| `/inquiries/awaiting-response` | `/pipeline?tab=inbox&status=awaiting` |
| `/leads`                       | `/pipeline?tab=leads`                 |
| `/culinary/recipes`            | `/culinary?tab=recipes`               |
| `/finance`                     | `/money`                              |
| `/finance/invoices/overdue`    | `/money?tab=invoices&status=overdue`  |
| `/clients`                     | `/people?tab=clients`                 |
| `/marketing`                   | `/grow?tab=marketing`                 |
| `/social`                      | `/grow?tab=social`                    |

Bookmarks and shared links continue working forever.

---

## Workspace Shell Component

Each hub uses a shared `<WorkspaceShell>` component:

```tsx
<WorkspaceShell
  hub="money"
  tabs={[
    { id: 'overview', label: 'Overview', component: MoneyOverview },
    { id: 'invoices', label: 'Invoices', component: InvoicesTab },
    // ...
  ]}
  defaultTab="overview"
/>
```

Features:

- URL state via `?tab=` query param (shareable, bookmarkable)
- Keyboard navigation between tabs (arrow keys)
- Slide-over panel system for detail views
- Persists last-viewed tab per hub in localStorage

---

## Implementation Phases

### Phase 1: Shell + Nav (Week 1)

- Build `WorkspaceShell` component
- Build `SlideOverPanel` component
- Replace sidebar nav with 7 hubs
- Wire up redirects from old URLs

### Phase 2: Today + Pipeline (Week 2)

- Consolidate Today hub (5 tabs)
- Consolidate Pipeline hub (5 tabs)
- Convert status pages to filters

### Phase 3: Culinary + People (Week 3)

- Merge duplicate recipe libraries
- Merge duplicate menu libraries
- Consolidate People hub
- Collapse 36 client sub-pages into filters/panels

### Phase 4: Money + Grow + Events (Week 4)

- Consolidate 67 finance pages into Money hub
- Consolidate Grow hub
- Wire Events hub (lightest touch - mostly tab relabeling)

### Phase 5: Polish (Week 5)

- Test all redirects
- Verify no broken links
- Mobile responsive tabs
- Keyboard shortcuts for hub switching

---

## Orphan Assignment (Routes Not in Primary Tabs)

These top-level routes don't get their own hub but absorb into existing ones:

| Route                                                  | Assigned To                             | How                                                                                            |
| ------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/chat`, `/inbox`, `/notifications`, `/remy`           | **Today** (overflow tab: "Messages")    | Single unified inbox panel                                                                     |
| `/inventory`, `/vendors`, `/prices`                    | **Culinary** (overflow tab: "Sourcing") | Where ingredients come from                                                                    |
| `/documents`, `/receipts`, `/capture`                  | **Money** (overflow tab: "Documents")   | Financial paperwork                                                                            |
| `/analytics`, `/insights`, `/intelligence`, `/reports` | **Contextual**                          | Analytics tab within each hub (Money has financial reports, Culinary has menu analytics, etc.) |
| `/tasks`, `/reminders`, `/queue`                       | **Today** (overflow tab: "Tasks")       | Action items                                                                                   |
| `/goals`                                               | **Money** (within Overview)             | Revenue/business goals                                                                         |
| `/cannabis`, `/meal-prep`, `/consulting`, `/charity`   | **Specialty modules**                   | Hidden behind "More" in relevant hub; cannabis behind feature flag                             |
| `/locations`, `/travel`, `/safety`                     | **Events** (overflow tab: "Logistics")  | Event-day logistics                                                                            |
| `/wix-submissions`, `/import`                          | **Pipeline** (within Leads tab)         | Inbound sources                                                                                |
| `/rate-card`, `/packages`                              | **Pipeline** (within Quotes tab)        | Pricing tools for proposals                                                                    |
| `/marketplace`, `/partners`                            | **Grow** (overflow tab: "Partners")     | B2B connections                                                                                |
| `/surveys`, `/feedback`                                | **People** (overflow tab: "Feedback")   | Client sentiment                                                                               |
| `/settings`, `/help`, `/onboarding`, `/welcome`        | **Utility nav** (bottom of sidebar)     | Not a hub                                                                                      |
| `/commands`, `/dev`, `/features`, `/pulse`             | **Admin-only**                          | Hidden from chef nav entirely                                                                  |

---

## What Does NOT Change

- Event detail page (`/events/[id]`) - already a good workspace
- Recipe/Menu editors - complex forms stay as full pages
- Settings page structure - already tabbed
- Print layouts - separate concern
- API routes - backend unchanged
- Client portal (`/my/*`) - separate product surface
- Admin panel - separate audience

---

## Success Criteria

1. Chef can reach any feature within 2 clicks (hub -> tab -> optional filter)
2. Sidebar has exactly 7 + 2 items
3. Zero features deleted or hidden
4. All old URLs redirect correctly
5. New chef can understand the whole product by reading 7 words
