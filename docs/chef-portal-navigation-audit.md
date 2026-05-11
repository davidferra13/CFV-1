# Chef Portal Navigation Graph Audit

**Date:** 2026-05-10
**Scope:** Complete forensic inventory of every reachable surface in the Chef Portal (`app/(chef)/`)
**Method:** Code-verified extraction from route definitions, nav configs, component imports, server actions, and UI primitives
**Auditor:** Claude Code (Opus 4.6) via 6 parallel exploration agents + direct codebase analysis

---

## 1. Executive Overview

The Chef Portal contains **663 distinct page routes** under `app/(chef)/`, making it one of the largest Next.js route trees I have encountered. The navigation system defines **455 unique href entries** across primary nav, nav groups, settings shortcuts, mobile tabs, and the create dropdown.

**Key structural findings:**

- **101 non-dynamic routes exist as pages but have NO entry in the nav config** (orphaned or only reachable via direct URL / internal links)
- **~60 pages are status/filter variants** that should probably be tabs or filtered states rather than standalone pages (quotes, invoices, leads, inquiries, events, clients, partners)
- **Multiple domain overlaps**: `/social/*` duplicates `/marketing/social/*`; `/safety/*` duplicates `/settings/compliance/*`; `/chef/cannabis/*` duplicates `/cannabis/*`
- **55+ modal/dialog/drawer components** create secondary interaction surfaces beyond the page layer
- **33 tabbed interfaces** exist within pages, creating sub-views not visible in the route tree
- **250+ server action files** power the backend, with **194+ form components** and **51 forms directly in page files**
- **Command palette** exists (`components/search/command-palette.tsx`) and is loaded in the chef layout
- **16 items in the + Create dropdown** providing quick-create shortcuts

**Navigation architecture:**

- 6 primary sidebar links (Today, Inbox, Events, Culinary, Clients, Circles, Finance)
- 11 nav groups in All Features (Analytics, Clients, Commerce, Culinary, Events, Finance, Marketing, Network, Locations, Operations, Pipeline, Protection, Supply Chain, Tools)
- 5 core groups shown by default in sidebar (Pipeline, Events, Clients, Culinary, Finance)
- Settings hub with 5 groups and 10 consolidated pages (plus 94 individual settings routes)
- Customizable mobile tab bar (5 slots from 18 options)
- Customizable primary nav shortcuts

---

## 2. Navigation Surface Count Summary

| Surface Type                                   | Count |
| ---------------------------------------------- | ----- |
| Total routes/pages                             | 663   |
| Routes in nav config                           | 455   |
| Orphaned routes (non-dynamic, no nav entry)    | 101   |
| Orphaned routes (including dynamic [id] pages) | 211   |
| Total modals/dialogs (UI primitives)           | 9     |
| Components using dialogs/sheets/drawers        | 55+   |
| In-page dialog/sheet usage in app/(chef)/      | 21    |
| Tabbed interfaces                              | 33    |
| URL-param filtered views                       | 7     |
| Form components                                | 194+  |
| Forms directly in page files                   | 51    |
| Server action files                            | 250+  |
| Create dropdown items                          | 16    |
| Command palette                                | 1     |
| Primary nav links                              | 6     |
| Nav groups (All Features)                      | 11    |
| Settings hub pages                             | 94    |
| Admin pages (separate portal)                  | ~30   |
| Mobile tab options                             | 18    |
| Status-as-page surfaces (should be filters)    | ~60   |
| Duplicate/overlapping surface clusters         | 8     |

---

## 3. Numbered Master Inventory

Each entry: `#. Name | Route | Type | Access Path | Domain | Status`

Dynamic routes (`[id]`) are reachable from their parent list page unless noted otherwise.

### Dashboard & Daily (2 pages)

| #   | Name            | Route        | Type | Access                  | Status   |
| --- | --------------- | ------------ | ---- | ----------------------- | -------- |
| 1   | Today Dashboard | `/dashboard` | page | Primary nav "Today"     | complete |
| 2   | Daily Ops View  | `/daily`     | page | Operations > Daily View | complete |

### Inbox & Triage (4 pages)

| #   | Name                 | Route                      | Type | Access                              | Status   |
| --- | -------------------- | -------------------------- | ---- | ----------------------------------- | -------- |
| 3   | Inbox                | `/inbox`                   | page | Primary nav "Inbox"                 | complete |
| 4   | Inbox History Scan   | `/inbox/history-scan`      | page | Tools > Inbox Tools                 | complete |
| 5   | Inbox Triage         | `/inbox/triage`            | page | Tools > Inbox Tools > Sort Messages | complete |
| 6   | Triage Thread Detail | `/inbox/triage/[threadId]` | page | Click thread in triage              | complete |

### Events (56 pages + 7 tabs)

| #   | Name                             | Route                        | Type           | Access                              | Status   |
| --- | -------------------------------- | ---------------------------- | -------------- | ----------------------------------- | -------- |
| 7   | Events Hub                       | `/events`                    | page           | Primary nav "Events"                | complete |
| 8   | Event Detail                     | `/events/[id]`               | page           | Click event row                     | complete |
| 9   | Event Detail: Overview Tab       | (tab within #8)              | tab            | Default tab on event detail         | complete |
| 10  | Event Detail: Prep Tab           | (tab within #8)              | tab            | Tab in event detail                 | complete |
| 11  | Event Detail: Ops Tab            | (tab within #8)              | tab            | Tab in event detail                 | complete |
| 12  | Event Detail: Money Tab          | (tab within #8)              | tab            | Tab in event detail                 | complete |
| 13  | Event Detail: Wrap Tab           | (tab within #8)              | tab            | Tab in event detail                 | complete |
| 14  | Event Detail: Tickets Tab        | (tab within #8)              | tab            | Tab in event detail                 | complete |
| 15  | Event Edit                       | `/events/[id]/edit`          | page           | Edit button on event                | complete |
| 16  | Event AAR (After-Action Review)  | `/events/[id]/aar`           | page           | Internal link from event            | complete |
| 17  | Event Billing                    | `/events/[id]/billing`       | page           | Money tab or direct link            | complete |
| 18  | Event Briefing                   | `/events/[id]/briefing`      | page           | Pre-event preparation               | complete |
| 19  | Event Cannabis                   | `/events/[id]/cannabis`      | page           | Cannabis event link                 | partial  |
| 20  | Event Close-Out                  | `/events/[id]/close-out`     | page           | Post-event workflow                 | complete |
| 21  | Event Debrief                    | `/events/[id]/debrief`       | page           | Post-event workflow                 | complete |
| 22  | Event Documents                  | `/events/[id]/documents`     | page           | Document generation                 | complete |
| 23  | Event Day-of-Production (Mobile) | `/events/[id]/dop/mobile`    | page           | Mobile day-of view                  | complete |
| 24  | Event Execution                  | `/events/[id]/execution`     | page           | Service day execution               | complete |
| 25  | Event Financial                  | `/events/[id]/financial`     | page           | Financial summary                   | complete |
| 26  | Event Follow-Up                  | `/events/[id]/follow-up`     | page           | Post-event follow-up                | complete |
| 27  | Event Gear                       | `/events/[id]/gear`          | page           | Equipment checklist                 | complete |
| 28  | Event Grocery Quote              | `/events/[id]/grocery-quote` | page           | Grocery cost estimation             | complete |
| 29  | Event Grocery Run                | `/events/[id]/grocery-run`   | page           | Shopping execution                  | complete |
| 30  | Event Guest Card                 | `/events/[id]/guest-card`    | page           | Guest dietary/info card             | complete |
| 31  | Event Interactive                | `/events/[id]/interactive`   | page           | Interactive menu/polling            | partial  |
| 32  | Event Invoice                    | `/events/[id]/invoice`       | page           | Invoice generation                  | complete |
| 33  | Event KDS                        | `/events/[id]/kds`           | page           | Kitchen Display System              | partial  |
| 34  | Event Menu Approval              | `/events/[id]/menu-approval` | page           | Client menu approval                | complete |
| 35  | Event Menu Polling               | `/events/[id]/menu-polling`  | page           | Guest menu selection                | partial  |
| 36  | Event Ops                        | `/events/[id]/ops`           | page           | Operational overview                | complete |
| 37  | Event Outcome                    | `/events/[id]/outcome`       | page           | Post-event outcome log              | complete |
| 38  | Event Pack                       | `/events/[id]/pack`          | page           | Packing checklist                   | complete |
| 39  | Event Pack (Mobile)              | `/events/[id]/pack/mobile`   | page           | Mobile packing view                 | complete |
| 40  | Event Prep Plan                  | `/events/[id]/prep-plan`     | page           | Prep timeline                       | complete |
| 41  | Event Procurement                | `/events/[id]/procurement`   | page           | Ingredient procurement              | complete |
| 42  | Event Receipts                   | `/events/[id]/receipts`      | page           | Receipt attachment                  | complete |
| 43  | Event Replay                     | `/events/[id]/replay`        | page           | Intelligence replay                 | partial  |
| 44  | Event Report                     | `/events/[id]/report`        | page           | Event summary report                | complete |
| 45  | Event Reset                      | `/events/[id]/reset`         | page           | Post-service reset checklist        | complete |
| 46  | Event Safety                     | `/events/[id]/safety`        | page           | Safety compliance                   | complete |
| 47  | Event Schedule                   | `/events/[id]/schedule`      | page           | Timeline/schedule                   | complete |
| 48  | Event Service                    | `/events/[id]/service`       | page           | Service execution                   | complete |
| 49  | Event Split Billing              | `/events/[id]/split-billing` | page           | Split payment between parties       | complete |
| 50  | Event Staff                      | `/events/[id]/staff`         | page           | Staff assignment                    | complete |
| 51  | Event Story                      | `/events/[id]/story`         | page           | Event story/content                 | partial  |
| 52  | Event Travel                     | `/events/[id]/travel`        | page           | Travel planning                     | complete |
| 53  | Events: Awaiting Deposit         | `/events/awaiting-deposit`   | filtered-state | Events > Event Status               | complete |
| 54  | Events: Board (Kanban)           | `/events/board`              | page           | Events > Kanban Board               | complete |
| 55  | Events: Cancelled                | `/events/cancelled`          | filtered-state | Events > Event Status               | complete |
| 56  | Events: Completed                | `/events/completed`          | filtered-state | Events > Event Status               | complete |
| 57  | Events: Confirmed                | `/events/confirmed`          | filtered-state | Events > Event Status               | complete |
| 58  | Events: Equipment Check          | `/events/equipment-check`    | page           | Not in nav                          | orphaned |
| 59  | Events: Timeline                 | `/events/timeline`           | page           | Events > Timeline                   | complete |
| 60  | Events: Travel                   | `/events/travel`             | page           | Operations > Travel Planning        | complete |
| 61  | Events: Upcoming                 | `/events/upcoming`           | filtered-state | Events > Event Status               | complete |
| 62  | New Event                        | `/events/new`                | form           | Events > Create Event / + Create    | complete |
| 63  | New Event from Text              | `/events/new/from-text`      | form           | Events > Create from Text           | complete |
| 64  | New Event Wizard                 | `/events/new/wizard`         | form           | Events > Event Wizard               | complete |
| 65  | Events: Cannabis                 | `/events/cannabis`           | page           | Not in main nav                     | partial  |
| 66  | Events: Cannabis Ledger          | `/events/cannabis/ledger`    | page           | Not in main nav                     | partial  |
| 67  | Events: Charity                  | `/events/charity`            | page           | Network > Community Impact (hidden) | hidden   |
| 68  | Events: Charity Hours            | `/events/charity/hours`      | page           | Community Impact > Volunteer Hours  | hidden   |

### Calendar (7 pages)

| #   | Name                   | Route              | Type | Access                       | Status   |
| --- | ---------------------- | ------------------ | ---- | ---------------------------- | -------- |
| 69  | Calendar               | `/calendar`        | page | Events > Calendar / + Create | complete |
| 70  | Calendar: Day View     | `/calendar/day`    | page | Calendar > Day View          | complete |
| 71  | Calendar: Load View    | `/calendar/load`   | page | Not in nav                   | orphaned |
| 72  | Calendar: Share        | `/calendar/share`  | page | Calendar > Share Calendar    | complete |
| 73  | Calendar: Travel       | `/calendar/travel` | page | Not in nav                   | orphaned |
| 74  | Calendar: Week Planner | `/calendar/week`   | page | Calendar > Week Planner      | complete |
| 75  | Calendar: Year View    | `/calendar/year`   | page | Calendar > Year View         | complete |

### Clients (38 pages)

| #   | Name                        | Route                                         | Type           | Access                             | Status   |
| --- | --------------------------- | --------------------------------------------- | -------------- | ---------------------------------- | -------- |
| 76  | Client Directory            | `/clients`                                    | page           | Primary nav "Clients"              | complete |
| 77  | Client Detail               | `/clients/[id]`                               | page           | Click client row                   | complete |
| 78  | Client Preferences          | `/clients/[id]/preferences`                   | page           | Client detail link                 | complete |
| 79  | Client Recurring Services   | `/clients/[id]/recurring`                     | page           | Client detail link                 | complete |
| 80  | Client Relationship         | `/clients/[id]/relationship`                  | page           | Client detail link                 | complete |
| 81  | Client Summary              | `/clients/[id]/summary`                       | page           | Client detail link                 | complete |
| 82  | Active Clients              | `/clients/active`                             | filtered-state | Clients > Active                   | complete |
| 83  | Communication Hub           | `/clients/communication`                      | page           | Clients submenu                    | complete |
| 84  | Follow-Ups                  | `/clients/communication/follow-ups`           | page           | Clients submenu                    | complete |
| 85  | Client Notes                | `/clients/communication/notes`                | page           | Communication > Client Notes       | complete |
| 86  | Upcoming Touchpoints        | `/clients/communication/upcoming-touchpoints` | page           | Clients submenu                    | complete |
| 87  | Client Duplicates           | `/clients/duplicates`                         | page           | Clients > Duplicates               | complete |
| 88  | Gift Cards                  | `/clients/gift-cards`                         | page           | Clients > Gift Cards               | complete |
| 89  | Client History              | `/clients/history`                            | page           | Clients > Client History           | complete |
| 90  | Event History               | `/clients/history/event-history`              | page           | Client History > Event History     | complete |
| 91  | Past Menus                  | `/clients/history/past-menus`                 | page           | Client History > Past Menus        | complete |
| 92  | Spending History            | `/clients/history/spending-history`           | page           | Client History > Payment History   | complete |
| 93  | Inactive Clients            | `/clients/inactive`                           | filtered-state | Clients > Inactive                 | complete |
| 94  | Client Insights             | `/clients/insights`                           | page           | Clients > Client Insights          | complete |
| 95  | At-Risk Clients             | `/clients/insights/at-risk`                   | page           | Client Insights > At Risk          | complete |
| 96  | Most Frequent Clients       | `/clients/insights/most-frequent`             | page           | Client Insights > Most Frequent    | complete |
| 97  | Retention Insights          | `/clients/insights/retention`                 | page           | Guests > Guest Insights            | complete |
| 98  | Top Clients                 | `/clients/insights/top-clients`               | page           | Client Insights > Top Clients      | complete |
| 99  | Client Intake               | `/clients/intake`                             | page           | Clients > Client Intake            | complete |
| 100 | Loyalty Overview            | `/clients/loyalty`                            | page           | Clients submenu                    | complete |
| 101 | Loyalty Points              | `/clients/loyalty/points`                     | page           | Loyalty > Points                   | complete |
| 102 | Loyalty Referrals           | `/clients/loyalty/referrals`                  | page           | Loyalty > Referrals                | complete |
| 103 | Loyalty Rewards             | `/clients/loyalty/rewards`                    | page           | Loyalty > Rewards                  | complete |
| 104 | New Client                  | `/clients/new`                                | form           | Clients submenu / + Create         | complete |
| 105 | Client Preferences (Global) | `/clients/preferences`                        | page           | Clients > Preferences & Dietary    | complete |
| 106 | Allergies                   | `/clients/preferences/allergies`              | page           | Preferences > Allergies            | complete |
| 107 | Dietary Restrictions        | `/clients/preferences/dietary-restrictions`   | page           | Preferences > Dietary Restrictions | complete |
| 108 | Dislikes                    | `/clients/preferences/dislikes`               | page           | Preferences > Dislikes             | complete |
| 109 | Favorite Dishes             | `/clients/preferences/favorite-dishes`        | page           | Preferences > Favorite Dishes      | complete |
| 110 | Client Presence             | `/clients/presence`                           | page           | Clients > Client Presence          | complete |
| 111 | Recurring Clients           | `/clients/recurring`                          | page           | Clients > Recurring Clients        | complete |
| 112 | Client Segments             | `/clients/segments`                           | page           | Clients > Segments                 | complete |
| 113 | VIP Clients                 | `/clients/vip`                                | filtered-state | Clients > VIP                      | complete |

### Circles (3 pages + drawer)

| #   | Name               | Route                | Type   | Access                             | Status   |
| --- | ------------------ | -------------------- | ------ | ---------------------------------- | -------- |
| 114 | Circles Hub        | `/circles`           | page   | Primary nav "Circles"              | complete |
| 115 | Circle Detail      | `/circles/[id]`      | page   | Click circle                       | complete |
| 116 | Circle Admin       | `/circles/admin`     | page   | Marketing > Dinner Circle Overview | complete |
| 117 | Remy Circle Drawer | (drawer within #115) | drawer | Circle detail button               | complete |

### Culinary (46 pages)

| #   | Name                         | Route                                         | Type           | Access                              | Status   |
| --- | ---------------------------- | --------------------------------------------- | -------------- | ----------------------------------- | -------- |
| 118 | Culinary Hub                 | `/culinary`                                   | page           | Primary nav "Culinary"              | complete |
| 119 | Culinary Board               | `/culinary-board`                             | page           | Culinary > Culinary Board           | complete |
| 120 | Voice Hub (Call Sheet)       | `/culinary/call-sheet`                        | page           | Culinary > Voice Hub                | complete |
| 121 | ChefNotes                    | `/culinary/chefnotes`                         | page           | Not in nav (orphaned)               | orphaned |
| 122 | ChefTips                     | `/culinary/cheftips`                          | page           | Culinary > ChefTips                 | complete |
| 123 | Components Hub               | `/culinary/components`                        | page           | Culinary > Components               | complete |
| 124 | Ferments                     | `/culinary/components/ferments`               | page           | Components > Ferments               | complete |
| 125 | Garnishes                    | `/culinary/components/garnishes`              | page           | Components > Garnishes              | complete |
| 126 | Sauces                       | `/culinary/components/sauces`                 | page           | Components > Sauces                 | complete |
| 127 | Shared Elements              | `/culinary/components/shared-elements`        | page           | Components > Shared Elements        | complete |
| 128 | Stocks                       | `/culinary/components/stocks`                 | page           | Components > Stocks                 | complete |
| 129 | Costing Hub                  | `/culinary/costing`                           | page           | Culinary > Costing                  | complete |
| 130 | Food Cost Analysis           | `/culinary/costing/food-cost`                 | page           | Costing > Food Cost Analysis        | complete |
| 131 | Menu Costs                   | `/culinary/costing/menu`                      | page           | Costing > Menu Costs                | complete |
| 132 | Recipe Costs                 | `/culinary/costing/recipe`                    | page           | Costing > Recipe Costs              | complete |
| 133 | On Sale This Week            | `/culinary/costing/sales`                     | page           | Costing > On Sale This Week         | complete |
| 134 | Dish Index                   | `/culinary/dish-index`                        | page           | Menus > Dish Index                  | complete |
| 135 | Dish Detail                  | `/culinary/dish-index/[id]`                   | page           | Click dish                          | complete |
| 136 | Dish Insights                | `/culinary/dish-index/insights`               | page           | Menus > Dish Insights               | complete |
| 137 | Ingredients Database         | `/culinary/ingredients`                       | page           | Culinary > Ingredients Database     | complete |
| 138 | Receipt Scanner              | `/culinary/ingredients/receipt-scan`          | page           | Ingredients > Receipt Scanner       | complete |
| 139 | Seasonal Availability        | `/culinary/ingredients/seasonal-availability` | page           | Ingredients > Seasonal Availability | complete |
| 140 | Vendor Notes                 | `/culinary/ingredients/vendor-notes`          | page           | Ingredients > Vendor Notes          | complete |
| 141 | Culinary Menus               | `/culinary/menus`                             | page           | Menus > All Menus                   | complete |
| 142 | Menu Detail (Culinary)       | `/culinary/menus/[id]`                        | page           | Click menu                          | complete |
| 143 | Menu Nutrition               | `/culinary/menus/[id]/nutrition`              | page           | Menu detail link                    | complete |
| 144 | Approved Menus               | `/culinary/menus/approved`                    | filtered-state | Menus > Approved                    | complete |
| 145 | Draft Menus                  | `/culinary/menus/drafts`                      | filtered-state | Menus > Drafts                      | complete |
| 146 | Menu Engineering             | `/culinary/menus/engineering`                 | page           | Menus > Menu Engineering            | complete |
| 147 | Menu Scaling                 | `/culinary/menus/scaling`                     | page           | Menus > Scaling                     | complete |
| 148 | Menu Substitutions           | `/culinary/menus/substitutions`               | page           | Menus > Substitutions               | complete |
| 149 | Menu Templates               | `/culinary/menus/templates`                   | page           | Menus > Templates                   | complete |
| 150 | My Kitchen                   | `/culinary/my-kitchen`                        | page           | Culinary > My Kitchen               | complete |
| 151 | Prep Workspace               | `/culinary/prep`                              | page           | Culinary > Prep Workspace           | complete |
| 152 | Shopping Lists               | `/culinary/prep/shopping`                     | page           | Prep > Shopping Lists               | complete |
| 153 | Prep Timeline                | `/culinary/prep/timeline`                     | page           | Prep > Prep Timeline                | complete |
| 154 | Food Catalog (Price Catalog) | `/culinary/price-catalog`                     | page           | Culinary > Food Catalog             | complete |
| 155 | Recipe Library (Culinary)    | `/culinary/recipes`                           | page           | Recipes > Recipe Library            | complete |
| 156 | Recipe Detail (Culinary)     | `/culinary/recipes/[id]`                      | page           | Click recipe                        | complete |
| 157 | Dietary Flags                | `/culinary/recipes/dietary-flags`             | page           | Recipes > By Dietary Flags          | complete |
| 158 | Recipe Drafts                | `/culinary/recipes/drafts`                    | filtered-state | Recipes > Drafts                    | complete |
| 159 | Seasonal Notes               | `/culinary/recipes/seasonal-notes`            | page           | Recipes > Seasonal Notes            | complete |
| 160 | Recipe Tags                  | `/culinary/recipes/tags`                      | page           | Recipes > Tags                      | complete |
| 161 | Seasonal Calendar            | `/culinary/seasonal-calendar`                 | page           | Culinary > Seasonal Calendar        | complete |
| 162 | Substitutions                | `/culinary/substitutions`                     | page           | Culinary > Substitutions            | complete |
| 163 | Supplier Calls               | `/culinary/supplier-calls`                    | page           | Not in nav                          | orphaned |
| 164 | Culinary Vendors             | `/culinary/vendors`                           | page           | Not in nav                          | orphaned |

### Recipes (10 pages)

| #   | Name               | Route                     | Type | Access                          | Status   |
| --- | ------------------ | ------------------------- | ---- | ------------------------------- | -------- |
| 165 | Recipes Hub        | `/recipes`                | page | Culinary > Recipes              | complete |
| 166 | Recipe Detail      | `/recipes/[id]`           | page | Click recipe                    | complete |
| 167 | Recipe Edit        | `/recipes/[id]/edit`      | page | Edit button                     | complete |
| 168 | Recipe Brain Dump  | `/recipes/dump`           | page | Recipes > Brain Dump            | complete |
| 169 | Recipe Import      | `/recipes/import`         | page | Culinary > Recipe Import Hub    | complete |
| 170 | Recipe Ingredients | `/recipes/ingredients`    | page | Culinary > Ingredients          | complete |
| 171 | New Recipe         | `/recipes/new`            | form | Recipes > New Recipe / + Create | complete |
| 172 | Recipe Photos      | `/recipes/photos`         | page | Recipes > Step Photos           | complete |
| 173 | Production Log     | `/recipes/production-log` | page | Recipes > Production Log        | complete |
| 174 | Recipe Sprint      | `/recipes/sprint`         | page | Culinary > Recipe Sprint        | complete |

### Menus (10 pages)

| #   | Name            | Route                | Type | Access                         | Status   |
| --- | --------------- | -------------------- | ---- | ------------------------------ | -------- |
| 175 | Menus Hub       | `/menus`             | page | Culinary > Menus               | complete |
| 176 | Menu Detail     | `/menus/[id]`        | page | Click menu                     | complete |
| 177 | Menu Editor     | `/menus/[id]/editor` | page | Edit button on menu            | complete |
| 178 | Dishes          | `/menus/dishes`      | page | Menus > Dishes                 | complete |
| 179 | Menu Estimate   | `/menus/estimate`    | page | Menus > Estimate               | complete |
| 180 | New Menu        | `/menus/new`         | form | Menus > New Menu / + Create    | complete |
| 181 | Seasonal Menus  | `/menus/seasonal`    | page | Not in nav                     | orphaned |
| 182 | Menu Selections | `/menus/selections`  | page | Not in nav                     | orphaned |
| 183 | Tasting Menus   | `/menus/tasting`     | page | Menus > Tasting Menus          | complete |
| 184 | Menu Upload     | `/menus/upload`      | page | Menus > Menu Upload / + Create | complete |

### Finance (72 pages)

| #   | Name                       | Route                                     | Type           | Access                           | Status   |
| --- | -------------------------- | ----------------------------------------- | -------------- | -------------------------------- | -------- |
| 185 | Finance Hub                | `/finance`                                | page           | Primary nav "Finance"            | complete |
| 186 | Bank Feed                  | `/finance/bank-feed`                      | page           | Payouts > Bank Feed (hidden)     | hidden   |
| 187 | Cash Flow Forecast         | `/finance/cash-flow`                      | page           | Forecasting > Cash Flow (hidden) | hidden   |
| 188 | Contractors (1099)         | `/finance/contractors`                    | page           | Finance > 1099 Contractors       | complete |
| 189 | Disputes                   | `/finance/disputes`                       | page           | Payments > Disputes              | complete |
| 190 | Expenses by Category       | `/finance/expenses`                       | page           | Expenses > By Category           | complete |
| 191 | Food & Ingredients         | `/finance/expenses/food-ingredients`      | page           | Expenses > Food & Ingredients    | complete |
| 192 | Labor                      | `/finance/expenses/labor`                 | page           | Expenses > Labor                 | complete |
| 193 | Marketing Expenses         | `/finance/expenses/marketing`             | page           | Expenses > Marketing             | complete |
| 194 | Miscellaneous              | `/finance/expenses/miscellaneous`         | page           | Expenses > Miscellaneous         | complete |
| 195 | Rentals & Equipment        | `/finance/expenses/rentals-equipment`     | page           | Expenses > Rentals & Equipment   | complete |
| 196 | Software                   | `/finance/expenses/software`              | page           | Expenses > Software              | complete |
| 197 | Travel Expenses            | `/finance/expenses/travel`                | page           | Expenses > Travel                | complete |
| 198 | Forecast                   | `/finance/forecast`                       | page           | Finance > Forecasting            | complete |
| 199 | Financial Goals            | `/finance/goals`                          | page           | Finance > Financial Goals        | complete |
| 200 | Invoices                   | `/finance/invoices`                       | page           | Finance > Invoices               | complete |
| 201 | Cancelled Invoices         | `/finance/invoices/cancelled`             | filtered-state | Invoices > Cancelled             | complete |
| 202 | Draft Invoices             | `/finance/invoices/draft`                 | filtered-state | Invoices > Draft                 | complete |
| 203 | Overdue Invoices           | `/finance/invoices/overdue`               | filtered-state | Invoices > Overdue               | complete |
| 204 | Paid Invoices              | `/finance/invoices/paid`                  | filtered-state | Invoices > Paid                  | complete |
| 205 | Refunded Invoices          | `/finance/invoices/refunded`              | filtered-state | Invoices > Refunded              | complete |
| 206 | Sent Invoices              | `/finance/invoices/sent`                  | filtered-state | Invoices > Sent                  | complete |
| 207 | Ledger                     | `/finance/ledger`                         | page           | Finance > Ledger                 | complete |
| 208 | Ledger Adjustments         | `/finance/ledger/adjustments`             | page           | Ledger > Adjustments             | complete |
| 209 | Owner Draws                | `/finance/ledger/owner-draws`             | page           | Not directly in nav              | orphaned |
| 210 | Transaction Log            | `/finance/ledger/transaction-log`         | page           | Ledger > Transaction Log         | complete |
| 211 | Overview                   | `/finance/overview`                       | page           | Finance > Overview               | complete |
| 212 | Overview: Cash Flow        | `/finance/overview/cash-flow`             | page           | Finance > Cash Flow (hidden)     | hidden   |
| 213 | Outstanding Payments       | `/finance/overview/outstanding-payments`  | page           | Finance > Outstanding Payments   | complete |
| 214 | Revenue Summary            | `/finance/overview/revenue-summary`       | page           | Finance > Revenue Summary        | complete |
| 215 | Payments Hub               | `/finance/payments`                       | page           | Finance > Payments               | complete |
| 216 | Deposits                   | `/finance/payments/deposits`              | page           | Payments > Deposits              | complete |
| 217 | Failed Payments            | `/finance/payments/failed`                | page           | Payments > Failed Payments       | complete |
| 218 | Installments               | `/finance/payments/installments`          | page           | Payments > Installments          | complete |
| 219 | Refunds                    | `/finance/payments/refunds`               | page           | Payments > Refunds               | complete |
| 220 | Payouts                    | `/finance/payouts`                        | page           | Finance > Payouts                | complete |
| 221 | Manual Payments            | `/finance/payouts/manual-payments`        | page           | Payouts > Manual Payments        | complete |
| 222 | Payout Reconciliation      | `/finance/payouts/reconciliation`         | page           | Payouts > Reconciliation         | complete |
| 223 | Stripe Payouts             | `/finance/payouts/stripe-payouts`         | page           | Payouts > Stripe Payouts         | complete |
| 224 | Payroll                    | `/finance/payroll`                        | page           | Finance > Payroll                | complete |
| 225 | 941 Filing                 | `/finance/payroll/941`                    | page           | Payroll > 941 Filing             | complete |
| 226 | Employees                  | `/finance/payroll/employees`              | page           | Payroll > Employees              | complete |
| 227 | Run Payroll                | `/finance/payroll/run`                    | page           | Payroll > Run Payroll            | complete |
| 228 | W-2 Forms                  | `/finance/payroll/w2`                     | page           | Payroll > W-2 Forms              | complete |
| 229 | Break-Even Analysis        | `/finance/planning/break-even`            | page           | Finance > Break-Even Analysis    | complete |
| 230 | Plate Costs                | `/finance/plate-costs`                    | page           | Expenses > Plate Costs           | complete |
| 231 | Recurring Invoices         | `/finance/recurring`                      | page           | Invoices > Recurring Invoices    | complete |
| 232 | Financial Reports Hub      | `/finance/reporting`                      | page           | Finance > Reports                | complete |
| 233 | Expense by Category Report | `/finance/reporting/expense-by-category`  | page           | Reports > Expense by Category    | complete |
| 234 | Profit & Loss              | `/finance/reporting/profit-loss`          | page           | Reports > Profit & Loss          | complete |
| 235 | Profit by Event            | `/finance/reporting/profit-by-event`      | page           | Reports > Profit by Event        | complete |
| 236 | Revenue by Client          | `/finance/reporting/revenue-by-client`    | page           | Reports > Revenue by Client      | complete |
| 237 | Revenue by Event           | `/finance/reporting/revenue-by-event`     | page           | Reports > Revenue by Event       | complete |
| 238 | Revenue by Month           | `/finance/reporting/revenue-by-month`     | page           | Reports > Revenue by Month       | complete |
| 239 | Tax Summary Report         | `/finance/reporting/tax-summary`          | page           | Tax > Tax Summary                | complete |
| 240 | Year-to-Date Summary       | `/finance/reporting/year-to-date-summary` | page           | Reports > Year-to-Date Summary   | complete |
| 241 | Year-over-Year             | `/finance/reporting/yoy-comparison`       | page           | Reports > Year-over-Year         | complete |
| 242 | Retainers                  | `/finance/retainers`                      | page           | Payments > Retainers             | complete |
| 243 | Retainer Detail            | `/finance/retainers/[id]`                 | page           | Click retainer                   | complete |
| 244 | New Retainer               | `/finance/retainers/new`                  | form           | Payments > New Retainer          | complete |
| 245 | Sales Tax                  | `/finance/sales-tax`                      | page           | Finance > Sales Tax              | complete |
| 246 | Tax Remittances            | `/finance/sales-tax/remittances`          | page           | Sales Tax > Remittances          | complete |
| 247 | Tax Settings               | `/finance/sales-tax/settings`             | page           | Sales Tax > Tax Settings         | complete |
| 248 | Tax Prep                   | `/finance/tax-prep`                       | page           | Finance > Tax Prep               | complete |
| 249 | Tax Center                 | `/finance/tax`                            | page           | Finance > Tax Center             | complete |
| 250 | 1099-NEC                   | `/finance/tax/1099-nec`                   | page           | Tax > 1099-NEC                   | complete |
| 251 | Depreciation               | `/finance/tax/depreciation`               | page           | Tax > Depreciation               | complete |
| 252 | Home Office                | `/finance/tax/home-office`                | page           | Tax > Home Office                | complete |
| 253 | Quarterly Estimates        | `/finance/tax/quarterly`                  | page           | Tax > Quarterly Estimates        | complete |
| 254 | Retirement                 | `/finance/tax/retirement`                 | page           | Tax > Retirement                 | complete |
| 255 | Year-End Package           | `/finance/tax/year-end`                   | page           | Tax > Year-End Package           | complete |
| 256 | Year-End Close             | `/finance/year-end`                       | page           | Finance > Year-End Close         | complete |

### Expenses (3 pages)

| #   | Name           | Route            | Type | Access                            | Status   |
| --- | -------------- | ---------------- | ---- | --------------------------------- | -------- |
| 257 | Expenses Hub   | `/expenses`      | page | Finance > Expenses                | complete |
| 258 | Expense Detail | `/expenses/[id]` | page | Click expense row                 | complete |
| 259 | New Expense    | `/expenses/new`  | form | Expenses > Add Expense / + Create | complete |

### Quotes (11 pages)

| #   | Name             | Route                | Type           | Access                        | Status   |
| --- | ---------------- | -------------------- | -------------- | ----------------------------- | -------- |
| 260 | Quotes Hub       | `/quotes`            | page           | Pipeline > Quotes             | complete |
| 261 | Quote Detail     | `/quotes/[id]`       | page           | Click quote                   | complete |
| 262 | Quote Edit       | `/quotes/[id]/edit`  | page           | Edit button                   | complete |
| 263 | Accepted Quotes  | `/quotes/accepted`   | filtered-state | Quotes > Accepted             | complete |
| 264 | Quote Calculator | `/quotes/calculator` | page           | Pipeline > Consulting Hub     | complete |
| 265 | Draft Quotes     | `/quotes/draft`      | filtered-state | Quotes > Draft                | complete |
| 266 | Expired Quotes   | `/quotes/expired`    | filtered-state | Quotes > Expired              | complete |
| 267 | New Quote        | `/quotes/new`        | form           | Quotes > New Quote / + Create | complete |
| 268 | Rejected Quotes  | `/quotes/rejected`   | filtered-state | Quotes > Rejected             | complete |
| 269 | Sent Quotes      | `/quotes/sent`       | filtered-state | Quotes > Sent                 | complete |
| 270 | Viewed Quotes    | `/quotes/viewed`     | filtered-state | Quotes > Viewed               | complete |

### Inquiries (8 pages)

| #   | Name                  | Route                              | Type           | Access                             | Status   |
| --- | --------------------- | ---------------------------------- | -------------- | ---------------------------------- | -------- |
| 271 | Inquiries Hub         | `/inquiries`                       | page           | Pipeline > Inquiries               | complete |
| 272 | Inquiry Detail        | `/inquiries/[id]`                  | page           | Click inquiry                      | complete |
| 273 | Awaiting Client Reply | `/inquiries/awaiting-client-reply` | filtered-state | Inquiries > Client Reply           | complete |
| 274 | Awaiting Response     | `/inquiries/awaiting-response`     | filtered-state | Inquiries > Awaiting Response      | complete |
| 275 | Declined              | `/inquiries/declined`              | filtered-state | Inquiries > Declined               | complete |
| 276 | Menu Drafting         | `/inquiries/menu-drafting`         | filtered-state | Inquiries > Menu Drafting          | complete |
| 277 | New Inquiry           | `/inquiries/new`                   | form           | Inquiries > New Inquiry / + Create | complete |
| 278 | Sent to Client        | `/inquiries/sent-to-client`        | filtered-state | Inquiries > Sent to Client         | complete |

### Pipeline & Leads (7 pages)

| #   | Name              | Route              | Type           | Access                | Status   |
| --- | ----------------- | ------------------ | -------------- | --------------------- | -------- |
| 279 | Pipeline Overview | `/pipeline`        | page           | Not in nav (orphaned) | orphaned |
| 280 | Leads Hub         | `/leads`           | page           | Pipeline > Leads      | complete |
| 281 | Archived Leads    | `/leads/archived`  | filtered-state | Leads > Archived      | complete |
| 282 | Contacted Leads   | `/leads/contacted` | filtered-state | Leads > Contacted     | complete |
| 283 | Converted Leads   | `/leads/converted` | filtered-state | Leads > Converted     | complete |
| 284 | New Leads         | `/leads/new`       | filtered-state | Leads > New           | complete |
| 285 | Qualified Leads   | `/leads/qualified` | filtered-state | Leads > Qualified     | complete |

### Contracts (3 pages)

| #   | Name             | Route                     | Type | Access               | Status   |
| --- | ---------------- | ------------------------- | ---- | -------------------- | -------- |
| 286 | Contracts Hub    | `/contracts`              | page | Pipeline > Contracts | complete |
| 287 | Contract History | `/contracts/[id]/history` | page | Click contract       | complete |
| 288 | New Contract     | `/contracts/new`          | form | Not in nav           | orphaned |

### Proposals (4 pages)

| #   | Name               | Route                  | Type | Access                       | Status   |
| --- | ------------------ | ---------------------- | ---- | ---------------------------- | -------- |
| 289 | Proposals Hub      | `/proposals`           | page | Pipeline > Proposals         | complete |
| 290 | Proposal Add-Ons   | `/proposals/addons`    | page | Proposals > Add-Ons          | complete |
| 291 | Proposal Builder   | `/proposals/builder`   | page | Proposals > Proposal Builder | complete |
| 292 | Proposal Templates | `/proposals/templates` | page | Proposals > Templates        | complete |

### Prospecting (9 pages)

| #   | Name                      | Route                   | Type | Access                             | Status   |
| --- | ------------------------- | ----------------------- | ---- | ---------------------------------- | -------- |
| 293 | Prospecting Hub           | `/prospecting`          | page | Pipeline > Prospecting (adminOnly) | complete |
| 294 | Prospect Detail (Dossier) | `/prospecting/[id]`     | page | Click prospect                     | complete |
| 295 | Clusters                  | `/prospecting/clusters` | page | Prospecting > Clusters             | complete |
| 296 | Import Leads              | `/prospecting/import`   | page | Prospecting > Import Leads         | complete |
| 297 | OpenClaw Integration      | `/prospecting/openclaw` | page | Not in nav                         | orphaned |
| 298 | Prospecting Pipeline      | `/prospecting/pipeline` | page | Prospecting > Pipeline             | complete |
| 299 | Call Queue                | `/prospecting/queue`    | page | Prospecting > Call Queue           | complete |
| 300 | Call Scripts              | `/prospecting/scripts`  | page | Prospecting > Call Scripts         | complete |
| 301 | AI Scrub                  | `/prospecting/scrub`    | page | Prospecting > AI Scrub             | complete |

### Calls (4 pages)

| #   | Name        | Route              | Type | Access                      | Status   |
| --- | ----------- | ------------------ | ---- | --------------------------- | -------- |
| 302 | Calls Hub   | `/calls`           | page | Pipeline > Calls & Meetings | complete |
| 303 | Call Detail | `/calls/[id]`      | page | Click call                  | complete |
| 304 | Call Edit   | `/calls/[id]/edit` | page | Edit button                 | complete |
| 305 | New Call    | `/calls/new`       | form | Calls > Schedule Call       | complete |

### Commerce (21 pages)

| #   | Name                  | Route                           | Type | Access                               | Status   |
| --- | --------------------- | ------------------------------- | ---- | ------------------------------------ | -------- |
| 306 | Commerce Hub          | `/commerce`                     | page | Commerce > Commerce Hub              | complete |
| 307 | Observability         | `/commerce/observability`       | page | Commerce > Observability (adminOnly) | complete |
| 308 | Order Queue           | `/commerce/orders`              | page | Commerce > Order Queue               | complete |
| 309 | Clover Parity         | `/commerce/parity`              | page | Commerce > Clover Parity (adminOnly) | complete |
| 310 | Products              | `/commerce/products`            | page | Commerce > Products                  | complete |
| 311 | Product Detail        | `/commerce/products/[id]`       | page | Click product                        | complete |
| 312 | New Product           | `/commerce/products/new`        | form | Products > New Product               | complete |
| 313 | Promotions            | `/commerce/promotions`          | page | Commerce > Promotions                | complete |
| 314 | Reconciliation        | `/commerce/reconciliation`      | page | Commerce > Reconciliation            | complete |
| 315 | Reconciliation Detail | `/commerce/reconciliation/[id]` | page | Click reconciliation                 | complete |
| 316 | POS Register          | `/commerce/register`            | page | Commerce > POS Register              | complete |
| 317 | Commerce Reports      | `/commerce/reports`             | page | Commerce > Reports                   | complete |
| 318 | Shift Reports         | `/commerce/reports/shifts`      | page | Reports > Shift Reports              | complete |
| 319 | Sales History         | `/commerce/sales`               | page | Commerce > Sales History             | complete |
| 320 | Sale Detail           | `/commerce/sales/[id]`          | page | Click sale                           | complete |
| 321 | Payment Schedules     | `/commerce/schedules`           | page | Commerce > Payment Schedules         | complete |
| 322 | Settlements           | `/commerce/settlements`         | page | Commerce > Settlements               | complete |
| 323 | Settlement Detail     | `/commerce/settlements/[id]`    | page | Click settlement                     | complete |
| 324 | Passive Storefront    | `/commerce/storefront`          | page | Commerce > Passive Storefront        | complete |
| 325 | Table Service         | `/commerce/table-service`       | page | Commerce > Table Service             | complete |
| 326 | Virtual Terminal      | `/commerce/virtual-terminal`    | page | Commerce > Virtual Terminal          | complete |

### Analytics (22 pages)

| #   | Name                     | Route                                 | Type | Access                                 | Status   |
| --- | ------------------------ | ------------------------------------- | ---- | -------------------------------------- | -------- |
| 327 | Source Analytics         | `/analytics`                          | page | Insights > Source Analytics            | complete |
| 328 | Benchmarks               | `/analytics/benchmarks`               | page | Analytics > Business Analytics         | complete |
| 329 | Client LTV               | `/analytics/client-ltv`               | page | Business Analytics > Client Value      | complete |
| 330 | Daily Report             | `/analytics/daily-report`             | page | Insights > Daily Report                | complete |
| 331 | Demand Heatmap           | `/analytics/demand`                   | page | Business Analytics > Demand Heatmap    | complete |
| 332 | Demand: Ingredients      | `/analytics/demand/ingredients`       | page | Not in nav                             | orphaned |
| 333 | Revenue Forecast         | `/analytics/forecast`                 | page | Analytics > Revenue Forecast           | complete |
| 334 | Conversion Funnel        | `/analytics/funnel`                   | page | Analytics > Conversion Funnel          | complete |
| 335 | Goals                    | `/analytics/goals`                    | page | Analytics > Goals                      | complete |
| 336 | Goal History             | `/analytics/goals/[id]/history`       | page | Click goal                             | complete |
| 337 | Revenue Path             | `/analytics/goals/revenue-path`       | page | Goals > Revenue Path                   | complete |
| 338 | Goal Setup               | `/analytics/goals/setup`              | page | Goals > Goal Setup                     | complete |
| 339 | Analytics Health         | `/analytics/health`                   | page | Not in nav                             | orphaned |
| 340 | Intelligence Hub         | `/analytics/intelligence`             | page | Analytics > Intelligence Hub           | complete |
| 341 | Client Risk Radar        | `/analytics/intelligence/client-risk` | page | Intelligence > Client Risk Radar       | complete |
| 342 | Marketing Spend          | `/analytics/marketing/spend`          | page | Not in nav                             | orphaned |
| 343 | Pipeline Forecast        | `/analytics/pipeline`                 | page | Business Analytics > Pipeline Forecast | complete |
| 344 | Reconciliation Analytics | `/analytics/reconciliation`           | page | Not in nav                             | orphaned |
| 345 | Referral Sources         | `/analytics/referral-sources`         | page | Business Analytics > Referral Sources  | complete |
| 346 | Custom Reports           | `/analytics/reports`                  | page | Insights > Custom Reports              | complete |
| 347 | Vendor Analytics         | `/analytics/vendors`                  | page | Analytics > Vendor Analytics           | complete |
| 348 | Weekly Summary           | `/analytics/weekly`                   | page | Analytics > Weekly Summary             | complete |

### Inventory & Supply Chain (19 pages)

| #   | Name               | Route                             | Type | Access                            | Status   |
| --- | ------------------ | --------------------------------- | ---- | --------------------------------- | -------- |
| 349 | Inventory Hub      | `/inventory`                      | page | Supply Chain > Inventory Hub      | complete |
| 350 | Physical Audits    | `/inventory/audits`               | page | Supply Chain > Physical Audits    | complete |
| 351 | Audit Detail       | `/inventory/audits/[id]`          | page | Click audit                       | complete |
| 352 | New Audit          | `/inventory/audits/new`           | form | Physical Audits > New Audit       | complete |
| 353 | Inventory Counts   | `/inventory/counts`               | page | Supply Chain > Inventory Counts   | complete |
| 354 | Demand Forecast    | `/inventory/demand`               | page | Supply Chain > Demand Forecast    | complete |
| 355 | Expiry Alerts      | `/inventory/expiry`               | page | Supply Chain > Expiry Alerts      | complete |
| 356 | Food Cost Analysis | `/inventory/food-cost`            | page | Supply Chain > Food Cost Analysis | complete |
| 357 | Ingredient Detail  | `/inventory/ingredients/[id]`     | page | Click ingredient                  | complete |
| 358 | Storage Locations  | `/inventory/locations`            | page | Supply Chain > Storage Locations  | complete |
| 359 | Procurement Hub    | `/inventory/procurement`          | page | Supply Chain > Procurement Hub    | complete |
| 360 | Purchase Orders    | `/inventory/purchase-orders`      | page | Supply Chain > Purchase Orders    | complete |
| 361 | PO Detail          | `/inventory/purchase-orders/[id]` | page | Click PO                          | complete |
| 362 | New PO             | `/inventory/purchase-orders/new`  | form | Purchase Orders > New PO          | complete |
| 363 | Reorder Settings   | `/inventory/reorder`              | page | Supply Chain > Reorder Settings   | complete |
| 364 | Staff Meals        | `/inventory/staff-meals`          | page | Supply Chain > Staff Meals        | complete |
| 365 | Transaction Ledger | `/inventory/transactions`         | page | Supply Chain > Transaction Ledger | complete |
| 366 | Vendor Invoices    | `/inventory/vendor-invoices`      | page | Supply Chain > Vendor Invoices    | complete |
| 367 | Waste Tracking     | `/inventory/waste`                | page | Supply Chain > Waste Tracking     | complete |

### Vendors (4 pages)

| #   | Name             | Route                       | Type | Access                       | Status   |
| --- | ---------------- | --------------------------- | ---- | ---------------------------- | -------- |
| 368 | Purveyors Hub    | `/vendors`                  | page | Supply Chain > Purveyors     | complete |
| 369 | Vendor Detail    | `/vendors/[id]`             | page | Click vendor                 | complete |
| 370 | Vendor Invoices  | `/vendors/invoices`         | page | Purveyors > Invoices         | complete |
| 371 | Price Comparison | `/vendors/price-comparison` | page | Purveyors > Price Comparison | complete |

### Staff (11 pages)

| #   | Name               | Route                 | Type | Access                  | Status   |
| --- | ------------------ | --------------------- | ---- | ----------------------- | -------- |
| 372 | Staff Hub          | `/staff`              | page | Operations > Staff      | complete |
| 373 | Staff Detail       | `/staff/[id]`         | page | Click staff member      | complete |
| 374 | Staff Availability | `/staff/availability` | page | Staff > Availability    | complete |
| 375 | Clock In/Out       | `/staff/clock`        | page | Staff > Clock In/Out    | complete |
| 376 | Labor Dashboard    | `/staff/labor`        | page | Staff > Labor Dashboard | complete |
| 377 | Live Activity      | `/staff/live`         | page | Staff > Live Activity   | complete |
| 378 | Staff Optimization | `/staff/optimization` | page | Not in nav              | orphaned |
| 379 | Staff Performance  | `/staff/performance`  | page | Staff > Performance     | complete |
| 380 | Staff Permissions  | `/staff/permissions`  | page | Staff > Permissions     | complete |
| 381 | Location Roster    | `/staff/roster`       | page | Staff > Location Roster | complete |
| 382 | Staff Schedule     | `/staff/schedule`     | page | Staff > Schedule        | complete |

### Stations (19 pages)

| #   | Name               | Route                              | Type | Access                          | Status   |
| --- | ------------------ | ---------------------------------- | ---- | ------------------------------- | -------- |
| 383 | Station Clipboards | `/stations`                        | page | Operations > Station Clipboards | complete |
| 384 | Station Detail     | `/stations/[id]`                   | page | Click station                   | complete |
| 385 | Station Clipboard  | `/stations/[id]/clipboard`         | page | Station detail link             | complete |
| 386 | Clipboard Print    | `/stations/[id]/clipboard/print`   | page | Print button                    | complete |
| 387 | Shift History      | `/stations/[id]/shift-history`     | page | Station detail link             | complete |
| 388 | Daily Ops          | `/stations/daily-ops`              | page | Operations > Daily Ops          | complete |
| 389 | Knowledge Base     | `/stations/knowledge`              | page | Not in nav                      | orphaned |
| 390 | Menu Board         | `/stations/menu-board`             | page | Not in nav                      | orphaned |
| 391 | Menu Performance   | `/stations/menu-performance`       | page | Not in nav                      | orphaned |
| 392 | Ops Log            | `/stations/ops-log`                | page | Stations > Ops Log              | complete |
| 393 | Order Sheet        | `/stations/orders`                 | page | Stations > Order Sheet          | complete |
| 394 | Order Print        | `/stations/orders/print`           | page | Not in nav                      | orphaned |
| 395 | Service Log        | `/stations/service-log`            | page | Not in nav                      | orphaned |
| 396 | Service Log Detail | `/stations/service-log/[id]`       | page | Click service log               | complete |
| 397 | Service Log: Prep  | `/stations/service-log/[id]/prep`  | page | Service log tab                 | complete |
| 398 | Service Log: Sales | `/stations/service-log/[id]/sales` | page | Service log tab                 | complete |
| 399 | New Service Log    | `/stations/service-log/new`        | form | Not in nav                      | orphaned |
| 400 | Waste Log          | `/stations/waste`                  | page | Stations > Waste Log            | complete |
| 401 | Waste Patterns     | `/stations/waste/patterns`         | page | Not in nav                      | orphaned |

### Marketing (15 pages)

| #   | Name                      | Route                                 | Type | Access                             | Status   |
| --- | ------------------------- | ------------------------------------- | ---- | ---------------------------------- | -------- |
| 402 | Email Campaigns           | `/marketing`                          | page | Marketing > Email Campaigns        | complete |
| 403 | Campaign Detail           | `/marketing/[id]`                     | page | Click campaign                     | complete |
| 404 | Campaign Content Pipeline | `/marketing/content-pipeline`         | page | Marketing > Campaign Content       | complete |
| 405 | Push Dinners Hub          | `/marketing/push-dinners`             | page | Marketing > Push Events            | complete |
| 406 | Push Dinner Detail        | `/marketing/push-dinners/[id]`        | page | Click push dinner                  | complete |
| 407 | New Push Dinner           | `/marketing/push-dinners/new`         | form | Marketing > New Push Event         | complete |
| 408 | Email Sequences           | `/marketing/sequences`                | page | Marketing > Sequences              | complete |
| 409 | Social Content Planner    | `/marketing/social`                   | page | Marketing > Content Planner        | complete |
| 410 | Social Monthly View       | `/marketing/social/[month]`           | page | Click month on calendar            | complete |
| 411 | Social Compose            | `/marketing/social/compose/[eventId]` | page | Create post from event             | complete |
| 412 | Social Connections        | `/marketing/social/connections`       | page | Content Planner > Connections      | complete |
| 413 | Social Post Detail        | `/marketing/social/posts/[id]`        | page | Click post                         | complete |
| 414 | Social Queue Settings     | `/marketing/social/settings`          | page | Content Planner > Queue Settings   | complete |
| 415 | Social Templates          | `/marketing/social/templates`         | page | Content Planner > Social Templates | complete |
| 416 | Email Templates           | `/marketing/templates`                | page | Email Campaigns > Templates        | complete |

### Social (11 pages - DUPLICATE DOMAIN)

| #   | Name                   | Route                       | Type | Access                                      | Status        |
| --- | ---------------------- | --------------------------- | ---- | ------------------------------------------- | ------------- |
| 417 | Social Hub             | `/social`                   | page | Not in nav (duplicate of /marketing/social) | **duplicate** |
| 418 | Social Calendar        | `/social/calendar`          | page | Not in nav                                  | **duplicate** |
| 419 | Social Compose         | `/social/compose/[eventId]` | page | Not in nav                                  | **duplicate** |
| 420 | Social Connections     | `/social/connections`       | page | Not in nav                                  | **duplicate** |
| 421 | Social Hub Overview    | `/social/hub-overview`      | page | Not in nav                                  | **duplicate** |
| 422 | Social Planner         | `/social/planner`           | page | Not in nav                                  | **duplicate** |
| 423 | Social Planner Monthly | `/social/planner/[month]`   | page | Not in nav                                  | **duplicate** |
| 424 | Social Post Detail     | `/social/posts/[id]`        | page | Not in nav                                  | **duplicate** |
| 425 | Social Settings        | `/social/settings`          | page | Not in nav                                  | **duplicate** |
| 426 | Social Templates       | `/social/templates`         | page | Not in nav                                  | **duplicate** |
| 427 | Social Vault           | `/social/vault`             | page | Not in nav                                  | **duplicate** |

### Cannabis (14 pages)

| #   | Name                    | Route                                  | Type | Access                    | Status  |
| --- | ----------------------- | -------------------------------------- | ---- | ------------------------- | ------- |
| 428 | Cannabis Hub            | `/cannabis`                            | page | Not in nav (module-gated) | partial |
| 429 | Cannabis About          | `/cannabis/about`                      | page | Cannabis internal         | partial |
| 430 | Cannabis Agreement      | `/cannabis/agreement`                  | page | Cannabis internal         | partial |
| 431 | Cannabis Batches        | `/cannabis/batches`                    | page | Cannabis internal         | partial |
| 432 | Cannabis Compliance     | `/cannabis/compliance`                 | page | Cannabis internal         | partial |
| 433 | Control Packet Template | `/cannabis/control-packet/template`    | page | Cannabis internal         | partial |
| 434 | Cannabis Events         | `/cannabis/events`                     | page | Cannabis internal         | partial |
| 435 | Event Control Packet    | `/cannabis/events/[id]/control-packet` | page | Cannabis event link       | partial |
| 436 | Cannabis Handbook       | `/cannabis/handbook`                   | page | Cannabis internal         | partial |
| 437 | Cannabis Circle Hub     | `/cannabis/hub`                        | page | Cannabis internal         | partial |
| 438 | Cannabis Invite         | `/cannabis/invite`                     | page | Cannabis internal         | partial |
| 439 | Cannabis Ledger         | `/cannabis/ledger`                     | page | Cannabis internal         | partial |
| 440 | Cannabis RSVPs          | `/cannabis/rsvps`                      | page | Cannabis internal         | partial |
| 441 | Cannabis Unlock         | `/cannabis/unlock`                     | page | Cannabis internal         | partial |

### Operations & Ops (8 pages)

| #   | Name                 | Route                  | Type | Access                         | Status   |
| --- | -------------------- | ---------------------- | ---- | ------------------------------ | -------- |
| 442 | Ops Hub              | `/ops`                 | page | Operations > Ops Hub           | complete |
| 443 | Equipment Inventory  | `/ops/equipment`       | page | Operations > Equipment         | complete |
| 444 | Ops Inventory        | `/ops/inventory`       | page | Ops Hub > Inventory Status     | complete |
| 445 | Kitchen Rentals      | `/ops/kitchen-rentals` | page | Operations > Kitchen Rentals   | complete |
| 446 | Ops Performance      | `/ops/performance`     | page | Ops Hub > Menu Performance     | complete |
| 447 | Prep Board           | `/ops/prep`            | page | Ops Hub > Prep Board           | complete |
| 448 | Service Day          | `/ops/service`         | page | Ops Hub > Service Day          | complete |
| 449 | Station Coordination | `/ops/stations`        | page | Ops Hub > Station Coordination | complete |

### Network & Community (17 pages)

| #   | Name                       | Route                         | Type | Access                     | Status   |
| --- | -------------------------- | ----------------------------- | ---- | -------------------------- | -------- |
| 450 | Chef Network               | `/network`                    | page | Network > Chef Network     | complete |
| 451 | Chef Profile               | `/network/[chefId]`           | page | Click chef                 | complete |
| 452 | Bridge Detail              | `/network/bridges/[bridgeId]` | page | Click bridge               | complete |
| 453 | Channel Detail             | `/network/channels/[slug]`    | page | Click channel              | complete |
| 454 | Collaboration Space Detail | `/network/collabs/[spaceId]`  | page | Click collab               | complete |
| 455 | Collaborations             | `/network/collabs`            | page | Network > Collaborations   | complete |
| 456 | Network Notifications      | `/network/notifications`      | page | Network > Notifications    | complete |
| 457 | Saved Chefs                | `/network/saved`              | page | Network > Saved Chefs      | complete |
| 458 | Community Hub              | `/community`                  | page | Network > Community        | complete |
| 459 | Community Benchmarks       | `/community/benchmarks`       | page | Community > Benchmarks     | complete |
| 460 | Chef Directory             | `/community/directory`        | page | Community > Chef Directory | complete |
| 461 | Mentorship                 | `/community/mentorship`       | page | Community > Mentorship     | complete |
| 462 | Community Messaging        | `/community/messaging`        | page | Community > Messaging      | complete |
| 463 | Community Profile          | `/community/profile`          | page | Community > My Profile     | complete |
| 464 | Feature Board              | `/community/roadmap`          | page | Community > Feature Board  | complete |
| 465 | Subcontracts               | `/community/subcontracts`     | page | Community > Subcontracts   | complete |
| 466 | Community Templates        | `/community/templates`        | page | Community > Templates      | complete |

### Partners (9 pages)

| #   | Name                 | Route                            | Type           | Access                          | Status   |
| --- | -------------------- | -------------------------------- | -------------- | ------------------------------- | -------- |
| 467 | Partners Hub         | `/partners`                      | page           | Clients > Partners & Referrals  | complete |
| 468 | Partner Detail       | `/partners/[id]`                 | page           | Click partner                   | complete |
| 469 | Partner Edit         | `/partners/[id]/edit`            | page           | Edit button                     | complete |
| 470 | Partner Report       | `/partners/[id]/report`          | page           | Partner detail link             | complete |
| 471 | Active Partners      | `/partners/active`               | filtered-state | Partners > Active               | complete |
| 472 | Events Generated     | `/partners/events-generated`     | page           | Partners > Events Generated     | complete |
| 473 | Inactive Partners    | `/partners/inactive`             | filtered-state | Partners > Inactive             | complete |
| 474 | New Partner          | `/partners/new`                  | form           | Partners > Add Partner          | complete |
| 475 | Referral Performance | `/partners/referral-performance` | page           | Partners > Referral Performance | complete |

### Loyalty (6 pages)

| #   | Name                | Route                  | Type | Access                        | Status   |
| --- | ------------------- | ---------------------- | ---- | ----------------------------- | -------- |
| 476 | Loyalty Hub         | `/loyalty`             | page | Clients > Loyalty & Rewards   | complete |
| 477 | Learn About Loyalty | `/loyalty/learn`       | page | Loyalty > Learn About Loyalty | complete |
| 478 | Raffle Hub          | `/loyalty/raffle`      | page | Loyalty > Raffle              | complete |
| 479 | Raffle Detail       | `/loyalty/raffle/[id]` | page | Click raffle                  | complete |
| 480 | New Reward          | `/loyalty/rewards/new` | form | Loyalty > Create Reward       | complete |
| 481 | Loyalty Settings    | `/loyalty/settings`    | page | Loyalty > Program Settings    | complete |

### Remy AI (4 pages + drawer)

| #   | Name          | Route               | Type   | Access                          | Status   |
| --- | ------------- | ------------------- | ------ | ------------------------------- | -------- |
| 482 | Remy Hub      | `/remy`             | page   | Tools > Remy Hub                | complete |
| 483 | Remy History  | `/remy/history`     | page   | Not in nav                      | orphaned |
| 484 | Remy Settings | `/remy/settings`    | page   | Not in nav                      | orphaned |
| 485 | Remy Signals  | `/remy/signals`     | page   | Not in nav                      | orphaned |
| 486 | Remy Drawer   | (component overlay) | drawer | Floating button / circle detail | complete |

### Chat & Messaging (2 pages)

| #   | Name        | Route        | Type | Access                       | Status   |
| --- | ----------- | ------------ | ---- | ---------------------------- | -------- |
| 487 | Chat Hub    | `/chat`      | page | Tools > Messaging / + Create | complete |
| 488 | Chat Thread | `/chat/[id]` | page | Click conversation           | complete |

### Guests (3 pages)

| #   | Name            | Route                  | Type | Access                    | Status   |
| --- | --------------- | ---------------------- | ---- | ------------------------- | -------- |
| 489 | Guest Directory | `/guests`              | page | Clients > Guest Directory | complete |
| 490 | Guest Detail    | `/guests/[id]`         | page | Click guest               | complete |
| 491 | Reservations    | `/guests/reservations` | page | Guests > Reservations     | complete |

### Safety & Protection (7 pages)

| #   | Name             | Route                      | Type | Access                             | Status        |
| --- | ---------------- | -------------------------- | ---- | ---------------------------------- | ------------- |
| 492 | Backup Chef      | `/safety/backup-chef`      | page | Not in nav                         | orphaned      |
| 493 | Insurance Claims | `/safety/claims`           | page | Not in nav (duplicate of settings) | **duplicate** |
| 494 | Claim Documents  | `/safety/claims/documents` | page | Not in nav                         | **duplicate** |
| 495 | New Claim        | `/safety/claims/new`       | form | Not in nav                         | **duplicate** |
| 496 | Incidents        | `/safety/incidents`        | page | Not in nav (duplicate of settings) | **duplicate** |
| 497 | Incident Detail  | `/safety/incidents/[id]`   | page | Not in nav                         | **duplicate** |
| 498 | New Incident     | `/safety/incidents/new`    | form | Not in nav                         | **duplicate** |

### Settings (94 pages)

| #   | Name                     | Route                                    | Type | Access                                | Status   |
| --- | ------------------------ | ---------------------------------------- | ---- | ------------------------------------- | -------- |
| 499 | Settings Hub             | `/settings`                              | page | Bottom nav "Settings"                 | complete |
| 500 | Account                  | `/settings/account`                      | page | Settings internal                     | complete |
| 501 | AI & Privacy             | `/settings/ai-privacy`                   | page | Settings > AI & Privacy               | complete |
| 502 | AI Settings              | `/settings/ai`                           | page | Settings > AI                         | complete |
| 503 | API Keys                 | `/settings/api-keys`                     | page | Integrations > API Keys (hidden)      | hidden   |
| 504 | Appearance               | `/settings/appearance`                   | page | Settings shortcuts                    | complete |
| 505 | Automations              | `/settings/automations`                  | page | Integrations > Automations            | complete |
| 506 | Billing                  | `/settings/billing`                      | page | Settings > Support ChefFlow           | complete |
| 507 | Business                 | `/settings/business`                     | page | Settings > Business                   | complete |
| 508 | Calendar Sync            | `/settings/calendar-sync`                | page | Integrations > Calendar Sync          | complete |
| 509 | Change Password          | `/settings/change-password`              | page | Settings shortcuts                    | complete |
| 510 | Client Preview           | `/settings/client-preview`               | page | Settings shortcuts                    | complete |
| 511 | Communication            | `/settings/communication`                | page | Settings shortcuts                    | complete |
| 512 | Communications (Hub)     | `/settings/communications`               | page | Settings > Communications             | complete |
| 513 | Compliance Hub           | `/settings/compliance`                   | page | Settings shortcuts                    | complete |
| 514 | Compliance Backup        | `/settings/compliance/backup`            | page | Protection > Backup Coverage          | complete |
| 515 | Compliance Claims        | `/settings/compliance/claims`            | page | Protection > Insurance Claims         | complete |
| 516 | Claim Documents          | `/settings/compliance/claims/documents`  | page | Insurance Claims > Documents          | complete |
| 517 | New Claim                | `/settings/compliance/claims/new`        | form | Insurance Claims > New Claim (hidden) | hidden   |
| 518 | GDPR                     | `/settings/compliance/gdpr`              | page | Settings shortcuts                    | complete |
| 519 | HACCP                    | `/settings/compliance/haccp`             | page | Settings shortcuts                    | complete |
| 520 | Incidents                | `/settings/compliance/incidents`         | page | Protection > Incidents                | complete |
| 521 | Incident Detail          | `/settings/compliance/incidents/[id]`    | page | Click incident                        | complete |
| 522 | New Incident             | `/settings/compliance/incidents/new`     | form | Incidents > Report Incident           | complete |
| 523 | Connections              | `/settings/connections`                  | page | Settings > Integrations               | complete |
| 524 | Contract Templates       | `/settings/contracts`                    | page | Contracts > Templates                 | complete |
| 525 | Credentials              | `/settings/credentials`                  | page | Settings shortcuts                    | complete |
| 526 | Culinary Profile         | `/settings/culinary-profile`             | page | Settings shortcuts                    | complete |
| 527 | Custom Fields            | `/settings/custom-fields`                | page | Integrations > Custom Fields          | complete |
| 528 | Dashboard Widgets        | `/settings/dashboard`                    | page | Settings shortcuts                    | complete |
| 529 | Data Export              | `/settings/data-export`                  | page | Settings shortcuts                    | complete |
| 530 | Data Quality             | `/settings/data-quality`                 | page | Settings > Data Quality               | complete |
| 531 | Delete Account           | `/settings/delete-account`               | page | Settings shortcuts                    | complete |
| 532 | Developer                | `/settings/developer`                    | page | Settings > Developer                  | complete |
| 533 | Devices                  | `/settings/devices`                      | page | Settings shortcuts                    | complete |
| 534 | Embed Widget             | `/settings/embed`                        | page | Integrations > Embed Widget           | complete |
| 535 | Emergency Contacts       | `/settings/emergency`                    | page | Settings shortcuts                    | complete |
| 536 | Event Type Labels        | `/settings/event-types`                  | page | Settings shortcuts                    | complete |
| 537 | Inspiration Board        | `/settings/favorite-chefs`               | page | Settings shortcuts                    | complete |
| 538 | Health & Wellness        | `/settings/health`                       | page | Settings shortcuts                    | complete |
| 539 | Profile Highlights       | `/settings/highlights`                   | page | Settings shortcuts                    | complete |
| 540 | Incidents (Settings)     | `/settings/incidents`                    | page | Settings shortcuts                    | complete |
| 541 | Integrations             | `/settings/integrations`                 | page | Tools > Integrations                  | complete |
| 542 | Chef Journal             | `/settings/journal`                      | page | Settings shortcuts                    | complete |
| 543 | Journal Entry            | `/settings/journal/[id]`                 | page | Click entry                           | complete |
| 544 | Chef Journey             | `/settings/journey`                      | page | Not in nav                            | orphaned |
| 545 | Journey Entry            | `/settings/journey/[id]`                 | page | Click entry                           | complete |
| 546 | Legal & Protection       | `/settings/legal-protection`             | page | Settings > Legal & Protection         | complete |
| 547 | Menu Engine              | `/settings/menu-engine`                  | page | Culinary > Menu Engine Settings       | complete |
| 548 | Menu Templates           | `/settings/menu-templates`               | page | Settings shortcuts                    | complete |
| 549 | Modules                  | `/settings/modules`                      | page | Settings shortcuts                    | complete |
| 550 | My Profile               | `/settings/my-profile`                   | page | Settings shortcuts                    | complete |
| 551 | My Services              | `/settings/my-services`                  | page | Settings shortcuts                    | complete |
| 552 | Navigation               | `/settings/navigation`                   | page | Settings shortcuts                    | complete |
| 553 | Notifications            | `/settings/notifications`                | page | Settings shortcuts                    | complete |
| 554 | Payment Methods          | `/settings/payment-methods`              | page | Settings shortcuts                    | complete |
| 555 | Payments                 | `/settings/payments`                     | page | Settings > Payments                   | complete |
| 556 | Platform Connections     | `/settings/platform-connections`         | page | Integrations > Platform Connections   | complete |
| 557 | Portfolio                | `/settings/portfolio`                    | page | Settings shortcuts                    | complete |
| 558 | Pricing                  | `/settings/pricing`                      | page | Settings shortcuts                    | complete |
| 559 | Print Settings           | `/settings/print`                        | page | Settings shortcuts                    | complete |
| 560 | Professional Development | `/settings/professional`                 | page | Settings shortcuts                    | complete |
| 561 | Career Momentum          | `/settings/professional/momentum`        | page | Settings shortcuts                    | complete |
| 562 | Skills & Certifications  | `/settings/professional/skills`          | page | Settings shortcuts                    | complete |
| 563 | Profile & Branding       | `/settings/profile-branding`             | page | Settings > Profile & Branding         | complete |
| 564 | Network Profile          | `/settings/profile`                      | page | Settings shortcuts                    | complete |
| 565 | Protection Hub           | `/settings/protection`                   | page | Protection nav                        | complete |
| 566 | Business Health          | `/settings/protection/business-health`   | page | Protection > Business Health          | complete |
| 567 | Certifications           | `/settings/protection/certifications`    | page | Protection > Certifications           | complete |
| 568 | Business Continuity      | `/settings/protection/continuity`        | page | Protection > Business Continuity      | complete |
| 569 | Crisis Response          | `/settings/protection/crisis`            | page | Protection > Crisis Response          | complete |
| 570 | Insurance                | `/settings/protection/insurance`         | page | Protection > Insurance                | complete |
| 571 | NDA & Permissions        | `/settings/protection/nda`               | page | Protection > NDA & Permissions        | complete |
| 572 | Portfolio Removal        | `/settings/protection/portfolio-removal` | page | Protection > Portfolio Removal        | complete |
| 573 | Public Profile           | `/settings/public-profile`               | page | Settings shortcuts                    | complete |
| 574 | Remy Settings            | `/settings/remy`                         | page | Settings shortcuts                    | complete |
| 575 | Seasonal Palettes        | `/settings/repertoire`                   | page | Culinary > Seasonal Palettes          | complete |
| 576 | Palette Detail           | `/settings/repertoire/[id]`              | page | Click palette                         | complete |
| 577 | My Restaurants           | `/settings/restaurants`                  | page | Settings shortcuts                    | complete |
| 578 | Schedule Settings        | `/settings/schedule`                     | page | Not in nav (orphaned)                 | orphaned |
| 579 | Scheduling               | `/settings/scheduling`                   | page | Settings > Scheduling                 | complete |
| 580 | Security Hub             | `/settings/security`                     | page | Not in nav (orphaned)                 | orphaned |
| 581 | Audit Trail              | `/settings/security/audit-trail`         | page | Protection > Audit Trail              | complete |
| 582 | MFA Settings             | `/settings/security/mfa`                 | page | Not in nav                            | orphaned |
| 583 | Store Preferences        | `/settings/store-preferences`            | page | Not in nav                            | orphaned |
| 584 | Stripe Connect           | `/settings/stripe-connect`               | page | Integrations > Stripe Connect         | complete |
| 585 | Support                  | `/settings/support`                      | page | Not in nav                            | orphaned |
| 586 | System & Account         | `/settings/system`                       | page | Settings > System & Account           | complete |
| 587 | Custom Lists             | `/settings/taxonomy`                     | page | Settings shortcuts                    | complete |
| 588 | Response Templates       | `/settings/templates`                    | page | Settings shortcuts                    | complete |
| 589 | Touchpoint Rules         | `/settings/touchpoints`                  | page | Settings shortcuts                    | complete |
| 590 | Webhooks                 | `/settings/webhooks`                     | page | Integrations > Webhooks (hidden)      | hidden   |
| 591 | Yelp                     | `/settings/yelp`                         | page | Integrations > Yelp                   | complete |
| 592 | Zapier                   | `/settings/zapier`                       | page | Integrations > Zapier (hidden)        | hidden   |

### Remaining Domains (70+ pages)

| #       | Name                     | Route                     | Type | Access                                      | Status        |
| ------- | ------------------------ | ------------------------- | ---- | ------------------------------------------- | ------------- |
| 593     | Availability Broadcaster | `/availability`           | page | Pipeline > Marketplace > Availability       | complete      |
| 594     | Morning Briefing         | `/briefing`               | page | Tools > Morning Briefing                    | complete      |
| 595     | Quick Capture            | `/capture`                | page | Tools > Quick Capture                       | complete      |
| 596     | Charity                  | `/charity`                | page | Not in nav                                  | orphaned      |
| 597     | Charity Hours            | `/charity/hours`          | page | Not in nav                                  | orphaned      |
| 598     | Chef Cannabis Handbook   | `/chef/cannabis/handbook` | page | **Duplicate** of /cannabis/handbook         | **duplicate** |
| 599     | Chef Cannabis RSVPs      | `/chef/cannabis/rsvps`    | page | **Duplicate** of /cannabis/rsvps            | **duplicate** |
| 600     | Consulting               | `/consulting`             | page | Not in nav                                  | orphaned      |
| 601     | Content Pipeline         | `/content`                | page | Marketing > Content Pipeline                | complete      |
| 602     | Content Vault            | `/content/vault`          | page | Content Planner > Media Vault               | complete      |
| 603     | Dev Simulate             | `/dev/simulate`           | page | Developer tool                              | hidden        |
| 604     | Documents                | `/documents`              | page | Operations > Documents                      | complete      |
| 605     | All Features Gateway     | `/features`               | page | Bottom nav "All Features"                   | complete      |
| 606     | Food Cost                | `/food-cost`              | page | Supply Chain > Food Cost                    | complete      |
| 607     | Food Cost Revenue        | `/food-cost/revenue`      | page | Food Cost > Daily Revenue                   | complete      |
| 608     | Guest Analytics          | `/guest-analytics`        | page | Not in nav                                  | orphaned      |
| 609     | Guest Leads              | `/guest-leads`            | page | Not in nav                                  | orphaned      |
| 610     | Help Center              | `/help`                   | page | Tools > Help Center                         | complete      |
| 611     | Help Article             | `/help/[slug]`            | page | Click help article                          | complete      |
| 612     | Food Costing Guide       | `/help/food-costing`      | page | Help > Food Costing Guide                   | complete      |
| 613     | Data Import              | `/import`                 | page | Tools > Data Import / Events > Smart Import | complete      |
| 614     | CSV Import               | `/import/csv`             | page | Import > CSV Import                         | complete      |
| 615     | Import History           | `/import/history`         | page | Import > Import History                     | complete      |
| 616     | MasterCook Import        | `/import/mxp`             | page | Import > MasterCook Import                  | complete      |
| 617     | Insights Hub             | `/insights`               | page | Analytics > Insights                        | complete      |
| 618     | Time Analysis            | `/insights/time-analysis` | page | Insights > Time Analysis                    | complete      |
| 619     | Kitchen Mode             | `/kitchen`                | page | Operations > Kitchen Mode                   | complete      |
| 620     | Locations Hub            | `/locations`              | page | Locations > Command Center                  | complete      |
| 621     | Location Detail          | `/locations/[id]`         | page | Click location                              | complete      |
| 622     | Location Compliance      | `/locations/compliance`   | page | Locations > Recipe Compliance               | complete      |
| 623     | Centralized Purchasing   | `/locations/purchasing`   | page | Locations > Centralized Purchasing          | complete      |
| 624     | Marketplace              | `/marketplace`            | page | Pipeline > Marketplace                      | complete      |
| 625     | Marketplace Capture      | `/marketplace/capture`    | page | Marketplace > Capture Live Page             | complete      |
| 626     | Meal Prep Dashboard      | `/meal-prep`              | page | Operations > Meal Prep                      | complete      |
| 627     | Meal Prep Program        | `/meal-prep/[programId]`  | page | Click program                               | complete      |
| 628     | Meal Prep Batch          | `/meal-prep/batch`        | page | Not in nav                                  | orphaned      |
| 629     | Meal Prep Retro          | `/meal-prep/retro`        | page | Not in nav                                  | orphaned      |
| 630     | Notifications            | `/notifications`          | page | Tools > Notifications                       | complete      |
| 631     | Menu Nutrition           | `/nutrition/[menuId]`     | page | Menu detail link                            | complete      |
| 632     | Onboarding Hub           | `/onboarding`             | page | Not in nav (first-run flow)                 | hidden        |
| 633-638 | Onboarding Steps (6)     | `/onboarding/*`           | form | Sequential onboarding flow                  | hidden        |
| 639     | Payments Hub             | `/payments`               | page | Not in nav (orphaned)                       | orphaned      |
| 640     | Payment Splitting        | `/payments/splitting`     | page | Finance > Payment Splitting                 | complete      |
| 641     | Portfolio                | `/portfolio`              | page | Marketing > Event Portfolio                 | complete      |
| 642     | Prep Consolidation       | `/prep/consolidation`     | page | Not in nav                                  | orphaned      |
| 643     | Prices Hub               | `/prices`                 | page | Not in nav                                  | orphaned      |
| 644     | Store Prices             | `/prices/store/[storeId]` | page | Not in nav                                  | orphaned      |
| 645     | Production Calendar      | `/production`             | page | Events > Event Calendar                     | complete      |
| 646     | Pulse (Who's Waiting)    | `/pulse`                  | page | Clients > Who's Waiting                     | complete      |
| 647     | Priority Queue           | `/queue`                  | page | Operations > Priority Queue                 | complete      |
| 648     | Quick Log                | `/quick-log`              | page | Not in nav                                  | orphaned      |
| 649     | Rate Card                | `/rate-card`              | page | Pipeline > Rate Card                        | complete      |
| 650     | Receipts                 | `/receipts`               | page | Expenses > Receipt Library / + Create       | complete      |
| 651     | Reminders                | `/reminders`              | page | Operations > Reminders                      | complete      |
| 652     | Reputation Hub           | `/reputation`             | page | Not in nav                                  | orphaned      |
| 653     | Brand Mentions           | `/reputation/mentions`    | page | Marketing > Brand Mentions                  | complete      |
| 654     | Reviews                  | `/reviews`                | page | Events > Reviews / Pipeline > Reviews       | complete      |
| 655     | Shopping Bulk Buy        | `/shopping/bulk`          | page | Not in nav                                  | orphaned      |
| 656     | Surveys                  | `/surveys`                | page | Analytics > Surveys                         | complete      |
| 657     | Tasks Hub                | `/tasks`                  | page | Operations > Tasks                          | complete      |
| 658     | Gantt Chart              | `/tasks/gantt`            | page | Tasks > Gantt Chart                         | complete      |
| 659     | Task Templates           | `/tasks/templates`        | page | Tasks > Task Templates                      | complete      |
| 660     | VA Tasks                 | `/tasks/va`               | page | Tasks > VA Tasks                            | complete      |
| 661     | Team Management          | `/team`                   | page | Operations > Team Management                | complete      |
| 662     | Travel Planning          | `/travel`                 | page | Not in nav (orphaned)                       | orphaned      |
| 663     | Waitlist                 | `/waitlist`               | page | Calendar > Waitlist                         | complete      |
| 664     | Welcome                  | `/welcome`                | page | Not in nav (first-run)                      | hidden        |
| 665     | Wix Submissions          | `/wix-submissions`        | page | Network > Wix Submissions                   | complete      |
| 666     | Wix Submission Detail    | `/wix-submissions/[id]`   | page | Click submission                            | complete      |

### Modals, Drawers & Overlay Surfaces (key instances)

| #   | Name                       | Type            | Trigger                         | Domain       | File                                               |
| --- | -------------------------- | --------------- | ------------------------------- | ------------ | -------------------------------------------------- |
| 667 | Command Palette            | command-palette | Keyboard shortcut (Cmd+K)       | global       | `components/search/command-palette.tsx`            |
| 668 | Remy Drawer                | drawer          | Floating button / circle detail | AI           | `components/ai/remy-drawer.tsx`                    |
| 669 | Event Packet Drawer        | drawer          | Document generation button      | events       | `components/documents/event-packet-drawer.tsx`     |
| 670 | Welcome Modal              | modal           | First login                     | onboarding   | `components/onboarding/welcome-modal.tsx`          |
| 671 | Tour Spotlight             | modal           | Onboarding tour                 | onboarding   | `components/onboarding/tour-spotlight.tsx`         |
| 672 | Cancellation Dialog        | modal           | Cancel event button             | events       | `components/events/cancellation-dialog.tsx`        |
| 673 | Serving Labels Dialog      | modal           | Print serving labels            | events       | `components/events/serving-labels-dialog.tsx`      |
| 674 | Report Issue Dialog        | modal           | Report issue button             | feedback     | `components/feedback/report-issue-dialog.tsx`      |
| 675 | Smart Fill Modal           | modal           | Import smart fill               | import       | `components/import/smart-fill-modal.tsx`           |
| 676 | Merge Dialog               | modal           | Merge duplicates                | data-quality | `components/data-quality/merge-dialog.tsx`         |
| 677 | Save as Template Button    | modal           | Save menu as template           | menus        | `components/menus/save-as-template-button.tsx`     |
| 678 | Confirm Modal (generic)    | modal           | Various destructive actions     | global       | `components/ui/confirm-modal.tsx`                  |
| 679 | Confirm Destructive Dialog | modal           | Delete/destructive actions      | global       | `components/ui/confirm-destructive-dialog.tsx`     |
| 680 | Confirm Policy Dialog      | modal           | Policy acceptance               | global       | `components/ui/confirm-policy-dialog.tsx`          |
| 681 | Unsaved Changes Dialog     | modal           | Navigate away with changes      | global       | `components/ui/unsaved-changes-dialog.tsx`         |
| 682 | Draft Restore Prompt       | modal           | Restore unsaved draft           | global       | `components/ui/draft-restore-prompt.tsx`           |
| 683 | Conflict Resolution Dialog | modal           | Data conflicts                  | global       | `components/ui/conflict-resolution-dialog.tsx`     |
| 684 | Quote Transitions          | modal           | Quote state changes             | quotes       | `components/quotes/quote-transitions.tsx`          |
| 685 | Event Transitions          | modal           | Event state changes             | events       | `components/events/event-transitions.tsx`          |
| 686 | Inquiry Transitions        | modal           | Inquiry state changes           | inquiries    | `components/inquiries/inquiry-transitions.tsx`     |
| 687 | Notification Panel         | drawer/panel    | Bell icon in header             | global       | `components/notifications/notification-panel.tsx`  |
| 688 | Onboarding Accelerator     | panel           | Dashboard widget                | onboarding   | `components/dashboard/onboarding-accelerator.tsx`  |
| 689 | Record Payment Modal       | modal           | Record payment button           | events       | `components/events/record-payment-modal.tsx`       |
| 690 | Initiate Refund Modal      | modal           | Refund button                   | events       | `components/events/initiate-refund-modal.tsx`      |
| 691 | Calendar Entry Modal       | modal           | Click calendar date             | calendar     | `components/calendar/calendar-entry-modal.tsx`     |
| 692 | POS Register               | embedded        | Commerce page                   | commerce     | `components/commerce/pos-register.tsx`             |
| 693 | Social Post Composer       | modal/form      | Create social post              | marketing    | `components/social/social-post-composer.tsx`       |
| 694 | Recipe CSV Import          | modal           | Import recipes from CSV         | recipes      | `components/recipes/recipe-csv-import.tsx`         |
| 695 | Create Device Modal        | modal           | Add device                      | settings     | `components/devices/create-device-modal.tsx`       |
| 696 | Growth Check-In Modal      | modal           | Professional development        | settings     | `components/professional/growth-checkin-modal.tsx` |
| 697 | + Create Dropdown          | dropdown        | + button in header              | global       | nav-config.tsx `createDropdownItems`               |

---

## 4. Unreachable / Orphaned Surfaces

**101 non-dynamic routes** exist as `page.tsx` files but have no entry in the navigation configuration. Many are reachable only via direct URL or internal links within other pages.

### Clearly Orphaned (no obvious access path)

| Route                           | Why Orphaned                        | Disposition                                |
| ------------------------------- | ----------------------------------- | ------------------------------------------ |
| `/activity/audit`               | No nav entry, child of activity log | Probably should be tab on /activity        |
| `/analytics/demand/ingredients` | No nav entry                        | Should be tab within /analytics/demand     |
| `/analytics/health`             | No nav entry                        | Internal health check?                     |
| `/analytics/marketing/spend`    | No nav entry                        | Should be under marketing analytics        |
| `/analytics/reconciliation`     | No nav entry                        | Unclear purpose                            |
| `/calendar/load`                | No nav entry                        | Capacity load view; should be calendar tab |
| `/calendar/travel`              | No nav entry                        | Should be calendar tab or part of travel   |
| `/consulting`                   | No nav entry                        | Appears to be dead page                    |
| `/culinary/chefnotes`           | No nav entry                        | Should be under Culinary                   |
| `/culinary/supplier-calls`      | No nav entry                        | Should be under Culinary > Voice Hub       |
| `/culinary/vendors`             | No nav entry                        | Duplicate of /vendors?                     |
| `/dev/simulate`                 | Developer-only tool                 | Intentionally hidden                       |
| `/events/equipment-check`       | No nav entry                        | Should be event detail tab                 |
| `/finance/ledger/owner-draws`   | No nav entry                        | Should be ledger tab                       |
| `/guest-analytics`              | No nav entry                        | Should merge into client insights          |
| `/guest-leads`                  | No nav entry                        | Overlaps /leads                            |
| `/meal-prep/batch`              | No nav entry                        | Should be meal-prep tab                    |
| `/meal-prep/retro`              | No nav entry                        | Should be meal-prep tab                    |
| `/menus/seasonal`               | No nav entry                        | Should be menus filter                     |
| `/menus/selections`             | No nav entry                        | Client menu selections                     |
| `/payments`                     | No nav entry                        | Overlaps /finance/payments                 |
| `/pipeline`                     | No nav entry                        | Overlaps Pipeline nav group                |
| `/prep/consolidation`           | No nav entry                        | Overlaps culinary prep                     |
| `/prices`                       | No nav entry                        | PIE price browser                          |
| `/prices/store/[storeId]`       | No nav entry                        | PIE store prices                           |
| `/prospecting/openclaw`         | No nav entry                        | Admin-only OpenClaw integration            |
| `/quick-log`                    | No nav entry                        | Mobile quick log                           |
| `/remy/history`                 | No nav entry                        | Should be Remy tab                         |
| `/remy/settings`                | No nav entry                        | Should be Remy tab or Settings             |
| `/remy/signals`                 | No nav entry                        | Should be Remy tab                         |
| `/reputation`                   | No nav entry                        | Only /reputation/mentions is linked        |
| `/shopping/bulk`                | No nav entry                        | Bulk buy tool                              |
| `/staff/optimization`           | No nav entry                        | Should be staff tab                        |
| `/stations/knowledge`           | No nav entry                        | Station knowledge base                     |
| `/stations/menu-board`          | No nav entry                        | Display board                              |
| `/stations/menu-performance`    | No nav entry                        | Should merge into ops/performance          |
| `/stations/service-log`         | No nav entry                        | Service log hub                            |
| `/stations/service-log/new`     | No nav entry                        | New service log form                       |
| `/stations/waste/patterns`      | No nav entry                        | Waste analysis                             |
| `/travel`                       | No nav entry                        | Overlaps /events/travel                    |
| `/welcome`                      | First-run page                      | Intentionally hidden                       |

### Module-Gated (intentionally hidden until enabled)

All 14 cannabis pages, 7 onboarding pages, and the welcome page are intentionally gated by module activation or first-run detection.

---

## 5. Duplicate / Overlapping Surfaces

| Cluster              | Surfaces                                                                     | Overlap                             | Canonical                         | Redundant                    |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------------- | --------------------------------- | ---------------------------- |
| **Social Media**     | `/social/*` (11 pages) vs `/marketing/social/*` (8 pages)                    | Complete domain duplication         | `/marketing/social/*` (in nav)    | `/social/*` (orphaned)       |
| **Cannabis**         | `/cannabis/*` vs `/chef/cannabis/*` vs `/events/cannabis/*`                  | 3 route trees for same domain       | `/cannabis/*`                     | `/chef/cannabis/*` (2 pages) |
| **Safety/Incidents** | `/safety/*` (7 pages) vs `/settings/compliance/*`                            | Same claims + incidents workflow    | `/settings/compliance/*` (in nav) | `/safety/*` (orphaned)       |
| **Charity**          | `/charity/*` (2 pages) vs `/events/charity/*` (2 pages)                      | Same volunteer/charity workflow     | `/events/charity/*`               | `/charity/*`                 |
| **Food Cost**        | `/food-cost/*` vs `/culinary/costing/food-cost` vs `/inventory/food-cost`    | 3 separate food cost pages          | Unclear; needs consolidation      | All three exist              |
| **Payments**         | `/payments/*` vs `/finance/payments/*`                                       | Same payment workflows              | `/finance/payments/*`             | `/payments`                  |
| **Travel**           | `/travel` vs `/events/travel` vs `/calendar/travel` vs `/events/[id]/travel` | 4 travel surfaces                   | `/events/[id]/travel` (per-event) | Top-level `/travel`          |
| **Communication**    | `/settings/communication` vs `/settings/communications`                      | Two nearly identical settings pages | `/settings/communications`        | `/settings/communication`    |

---

## 6. State-vs-Page Findings

These pages are effectively filtered views of their parent list and should be tabs, URL-param filters, or saved views rather than standalone routes:

### Quotes (7 status pages that should be filters on `/quotes`)

- `/quotes/accepted`, `/quotes/draft`, `/quotes/expired`, `/quotes/rejected`, `/quotes/sent`, `/quotes/viewed`

### Invoices (6 status pages that should be filters on `/finance/invoices`)

- `/finance/invoices/cancelled`, `/draft`, `/overdue`, `/paid`, `/refunded`, `/sent`

### Leads (5 status pages that should be filters on `/leads`)

- `/leads/archived`, `/contacted`, `/converted`, `/new`, `/qualified`

### Inquiries (5 status pages that should be filters on `/inquiries`)

- `/inquiries/awaiting-client-reply`, `/awaiting-response`, `/declined`, `/menu-drafting`, `/sent-to-client`

### Events (5 status pages that should be filters on `/events`)

- `/events/awaiting-deposit`, `/cancelled`, `/completed`, `/confirmed`, `/upcoming`

### Clients (4 filter pages that should be filters on `/clients`)

- `/clients/active`, `/inactive`, `/vip`, `/segments`

### Partners (2 filter pages)

- `/partners/active`, `/partners/inactive`

### Menus (2 filter pages)

- `/culinary/menus/approved`, `/culinary/menus/drafts`

### Recipes (1 filter page)

- `/culinary/recipes/drafts`

### Expense Categories (7 sub-pages of `/finance/expenses`)

- All of `/finance/expenses/food-ingredients`, `/labor`, `/marketing`, `/miscellaneous`, `/rentals-equipment`, `/software`, `/travel` are category filters

**Total: ~60 pages that are really filtered states of parent pages.** This is a significant source of navigation bloat. Converting these to URL-param filters (e.g., `/quotes?status=draft`) would eliminate ~60 routes while preserving deep-linkability.

---

## 7. Security and Role Boundary Concerns

| Surface                      | Concern                                                            | Severity |
| ---------------------------- | ------------------------------------------------------------------ | -------- |
| `/prospecting/*`             | Marked `adminOnly` but 9 pages deep; verify middleware enforcement | Medium   |
| `/commerce/parity`           | Marked `adminOnly`; Clover parity dashboard                        | Low      |
| `/commerce/observability`    | Marked `adminOnly`; internal observability                         | Low      |
| `/dev/simulate`              | Developer simulation tool; no visible auth gate in nav             | **High** |
| `/settings/api-keys`         | Hidden but exists; API key management                              | Medium   |
| `/settings/webhooks`         | Hidden but exists; webhook config                                  | Medium   |
| `/settings/zapier`           | Hidden but exists; Zapier integration                              | Low      |
| `/settings/delete-account`   | Account deletion; must have confirmation gates                     | Medium   |
| `/cannabis/*`                | 14 pages; module-gated but verify enforcement                      | Medium   |
| `/settings/developer`        | Developer tools exposed to all chefs                               | Medium   |
| `/admin/*` (separate portal) | 30 admin pages; verify middleware blocks non-admin access          | **High** |
| `/prices/*`                  | PIE price data; internal intelligence tool                         | Low      |

**Recommendation:** Verify that middleware.ts enforces role checks for all `adminOnly` nav items and module-gated pages. Check that `/dev/simulate` is not accessible in production.

---

## 8. Mobile and Responsive Risk

| Category                   | Surfaces at Risk                                                                                                                 | Risk Level                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Wide data tables**       | Client directory, events list, quotes list, invoices, all analytics, commerce sales, inventory, staff roster, station clipboards | **High**                            |
| **Dense dashboards**       | `/dashboard`, `/analytics/intelligence`, `/finance/overview`, `/commerce`, `/ops`                                                | **High**                            |
| **Multi-column forms**     | Event form, quote form, client create form, menu editor, recipe editor                                                           | Medium                              |
| **Kanban boards**          | `/events/board`, marketing pipeline                                                                                              | **High**                            |
| **Calendar views**         | `/calendar/week`, `/calendar/year`, `/calendar/load`                                                                             | Medium                              |
| **Gantt charts**           | `/tasks/gantt`                                                                                                                   | **High**                            |
| **POS Register**           | `/commerce/register`                                                                                                             | **High** (critical for mobile use)  |
| **Kitchen Display System** | `/events/[id]/kds`                                                                                                               | Medium (designed for fixed screens) |
| **Print-oriented pages**   | `/stations/[id]/clipboard/print`, `/stations/orders/print`                                                                       | Low (designed for print)            |
| **Deep nested navigation** | Settings with 94 sub-pages, Finance with 72 sub-pages                                                                            | Medium                              |

**Mobile tab bar** offers 5 customizable slots from 18 options, which is well-designed. However, the 663-page depth means most features are 3-4 taps deep on mobile.

---

## 9. Data Dependency Notes

| Category                      | Surfaces                                                                                  | Dependency                             |
| ----------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| **Fully production-wired**    | Events, Clients, Quotes, Inquiries, Contracts, Recipes, Menus, Finance/Invoices, Calendar | Real database + server actions         |
| **PIE-dependent**             | `/prices/*`, `/culinary/price-catalog`, `/culinary/costing/*`                             | Pi Price Bridge (port 7700)            |
| **Commerce/Stripe-dependent** | `/commerce/*`, `/finance/payments/*`, `/settings/stripe-connect`                          | Stripe API integration                 |
| **AI-dependent**              | `/remy/*`, Remy Drawer, AI parse actions                                                  | Local Ollama (Gemma 4)                 |
| **CIL-dependent**             | Intelligence surfaces, signal pages                                                       | SQLite per-tenant CIL database         |
| **Onboarding-dependent**      | `/onboarding/*`, Welcome Modal, Accelerator                                               | First-run detection + demo data        |
| **Module-gated**              | Cannabis (14 pages), Commerce (21 pages), Locations (4 pages)                             | Module activation in settings          |
| **OpenClaw-dependent**        | `/prospecting/openclaw`, brand mentions                                                   | External data engine                   |
| **Mock/partial data**         | Community benchmarks, mentorship, subcontracts, chef directory                            | Likely placeholder or limited          |
| **Social platform OAuth**     | `/marketing/social/*`, `/social/*`                                                        | Platform connections (Instagram, etc.) |

---

## 10. Immediate Findings

### Obvious Duplicates (fix first)

1. **`/social/*` (11 pages)** is a complete orphaned duplicate of `/marketing/social/*`. Should be deleted or redirected.
2. **`/safety/*` (7 pages)** duplicates `/settings/compliance/*`. Should be redirected.
3. **`/chef/cannabis/*` (2 pages)** duplicates `/cannabis/*`. Should be deleted.
4. **`/charity/*` (2 pages)** duplicates `/events/charity/*`. Should be redirected.
5. **`/payments`** overlaps `/finance/payments`. Should be redirected.

### Navigation Bloat (critical)

6. **~60 status-as-page routes** should become URL-param filters. Quotes alone has 7 status pages.
7. **94 settings pages** is excessive; the consolidated hub (10 pages) is the right direction but many leaf pages are still individual routes.
8. **72 finance pages** spread across overview, invoices, payments, payouts, payroll, reporting, tax, sales-tax, ledger, retainers, expenses, forecasting, goals, break-even, plate-costs, recurring, year-end. Some consolidation warranted.

### Hidden but Important

9. **`/remy/history`**, **`/remy/settings`**, **`/remy/signals`** are orphaned; should be tabs on `/remy`.
10. **`/prices/*`** (PIE price browser) has no nav entry. May be intentionally hidden or may need exposure.
11. **`/quick-log`** (mobile quick-log) has no nav entry. Should be in mobile tab options.

### Overexposed

12. **Prospecting** (9 pages) is `adminOnly` but deeply built out. Verify middleware enforcement.
13. **Cannabis** (14 pages) is module-gated but all routes exist and could be accessed by URL.

### Difficult to Reach

14. **Event sub-pages** (37 pages per event) are only reachable from the event detail page. No way to see "all invoices across events" or "all grocery runs this week" without visiting each event.
15. **Station service logs** have no nav entry.
16. **Calendar load and travel views** have no nav entry.

### Mobile Risk

17. **POS Register**, **Kanban Board**, **Gantt Chart**, **Week Planner** are all likely mobile-broken.
18. **663 pages with 3-4 tap depth** means most features are unreachable on mobile without search/command palette.

### Security Risk

19. **`/dev/simulate`** must not be accessible in production.
20. **`/settings/api-keys`** and **`/settings/webhooks`** are hidden but routable.

### Not Production-Wired

21. **Community features** (benchmarks, mentorship, subcontracts, messaging, templates) appear to be placeholder/aspirational.
22. **Social OAuth integration** depends on platform connections that may not be configured.

---

## End of Audit

This document is the ground-truth navigation map of the Chef Portal as of 2026-05-10. It should be used as the basis for any structural, UX, security, or navigation decisions going forward.

**Total surfaces inventoried:** 697 (663 pages + 7 event detail tabs + 27 modal/drawer/overlay surfaces)
