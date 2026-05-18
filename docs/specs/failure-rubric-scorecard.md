# ChefFlow Failure Rubric Scorecard

> Static scorecard against `docs/specs/failure-rubric.md`. This is a product/UX grading pass, not a runtime proof pack.

## Executive Verdict

ChefFlow's biggest failure mode is not "missing pages." It is **claiming whole SaaS categories before every category has the minimum visible loop a consumer expects**.

The strongest surfaces are where data is connected into an operational object: client detail, event detail, finance, inventory, and calendar. The weakest surfaces are where the nav promises a standalone product but the route is only a hub, redirect, roster, template manager, or shallow list.

Overall grade: **C-**

Reason: the app has real depth in several domains, but too many mirrored-company promises still fall into one of the three failure types:

- **The Void:** actions or background states exist without enough visible proof.
- **The Island:** data exists but is not always surfaced at the decision point.
- **The Facade:** a page title implies a full product, but the route delivers only navigation, settings, templates, or a list.

## Domain Grades

| Mirror                                | ChefFlow surface        | Grade | Primary failure                                                                                                                                                      |
| ------------------------------------- | ----------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HoneyBook / HubSpot / Dubsado         | Clients                 |     B | Too much relationship power is buried below the fold, but the data connections are strong.                                                                           |
| Tripleseat / Caterease / Planning Pod | Events                  |     B | Event detail is deeply wired; event list/hub still mixes product navigation with operational execution.                                                              |
| Meez / ChefTec / Galley               | Recipes                 |    B- | Recipe detail appears wired to cost, lifecycle, provenance, photos, events, and completion; must prove scaling/allergen/cost are visible in the first decision view. |
| QuickBooks / FreshBooks / Wave        | Finance                 |     B | Finance has P&L, events, reporting, invoices, payments, and alerts; grade depends on whether invoice/payment truth is trusted end-to-end at runtime.                 |
| Proposify / PandaDoc / HoneyBook      | Proposals / Quotes      |    D+ | Quotes have statuses and insights; proposals are mainly templates/add-ons and do not yet look like a sent/viewed/signed tracking product.                            |
| Meez / Galley / KitchenOS             | Kitchen Ops / Prep      |    C+ | Kitchen mode and prep consolidation exist, but `/prep` has no top-level route and ops feels split across many surfaces.                                              |
| MarketMan / BlueCart / xtraCHEF       | Inventory / Shopping    |    B- | Inventory has demand, par, reorder, PO, usage, and audits; shopping is not a first-class visible route even though logic exists elsewhere.                           |
| 7shifts / Homebase / When I Work      | Staff                   |     D | Staff page is mostly roster + add form. It does not answer "who is working Saturday?" at the top level.                                                              |
| Mailchimp / Constant Contact          | Marketing               |     C | Campaign statuses and counts exist, but consumer-grade open/click/delivery feedback is not visible on the hub.                                                       |
| Pipedrive / HubSpot Sales             | Pipeline                |     F | `/pipeline` redirects to `/quotes`. That is a hard facade: a pipeline promise resolves to quote management.                                                          |
| Calendly / Acuity                     | Calendar / Availability |     B | Unified calendar looks real and consolidated; passing grade requires conflict prevention and availability truth to be visible during booking.                        |
| SevenRooms / Thanx                    | Guests / Loyalty        |    C+ | Loyalty has real program state; guest list is shallow and does not surface dietary/history at the list level.                                                        |

## Top Failures To Fix First

### 1. Pipeline Is A Facade

Evidence: `app/(chef)/pipeline/page.tsx` redirects directly to `/quotes`.

Why this fails: Pipedrive/HubSpot users expect a visual stage board, deal aging, next action, stale warnings, and total weighted value. A redirect to quotes tells the user ChefFlow does not actually have a pipeline surface.

Passing fix: create a real pipeline board that combines inquiries, quotes, proposals, accepted work, stale opportunities, next actions, and forecast value.

### 2. Proposals Do Not Yet Meet PandaDoc Expectations

Evidence: `app/(chef)/proposals/page.tsx` is a proposal templates/add-ons hub.

Why this fails: a proposal product is judged by the send/view/sign loop. The consumer expects draft, sent, viewed, commented, accepted, declined, last activity, and follow-up state.

Passing fix: make `/proposals` a live proposal tracker first, with templates as a sub-tool. Every proposal card should show linked event, client, amount, status, last activity, and next action.

### 3. Staff Is A Roster, Not An Operations Product

Evidence: `app/(chef)/staff/page.tsx` lists staff members and supports adding/deactivating them.

Why this fails: 7shifts/Homebase are graded by schedule, availability, assignments, hours, labor cost, and shift communication. A roster is only a contact list.

Passing fix: the top of Staff must answer: who is assigned to upcoming events, who is available, who is unconfirmed, and what labor will cost.

### 4. Shopping Is Not First-Class Enough

Evidence: inventory has event usage, demand, par, reorder, and purchase-order wiring, but `/shopping/page.tsx` is absent in the sampled checkout.

Why this fails: MarketMan/BlueCart users judge by "what do I need to buy for the next event?" If that answer is hidden inside inventory, procurement, culinary, or event pages, the chef still has to assemble the list mentally.

Passing fix: a first-class shopping command surface: upcoming-event shopping list, aggregated quantities, inventory subtraction, vendor grouping, purchase order generation, and bought/packed status.

### 5. Guest CRM Is Too Thin At The List Level

Evidence: `app/(chef)/guests/page.tsx` shows search, contact info, tags, active comps, and add form.

Why this fails: SevenRooms users expect visit history, preferences, allergies, spend, and "remember this guest" intelligence. Those cannot be hidden entirely behind a click when menu risk or hospitality value depends on seeing them early.

Passing fix: guest cards should surface visit count, last event, dietary flags, preference flags, spend/tier, and next hospitality action.

## Strongest Surfaces

### Clients

Evidence: `app/(chef)/clients/[id]/page.tsx` pulls stats, events, finance, loyalty, notes, connections, activity, timeline, allergy records, outreach, reviews, profitability, LTV, menu history, tags, next best action, portal link, photos, household, recurring schedules, and menus.

Verdict: this is the best example of ChefFlow behaving like a relationship operating system instead of a contact database. The risk is visual hierarchy: if the page becomes too large, the passing information exists but is not perceivable.

### Events

Evidence: `app/(chef)/events/[id]/page.tsx` composes event intelligence, header, suggestions, spine, schedule, popup, overview, beverage, discovery, money, prep, tickets, ops, departure, and wrap sections.

Verdict: strong wiring. The failure risk is fragmentation: the user must always see current event status, next action, payment/menu/prep readiness, and risk without hunting.

### Finance

Evidence: `app/(chef)/finance/page.tsx` includes recent event financials, current-month P&L snapshot, sections for invoices, expenses, ledger, payments, payouts, reporting, tax, goals, bank feed, recurring invoices, and finance alerts.

Verdict: finance is moving toward a QuickBooks-grade hub. It passes only if payments, invoices, event billing, and expenses reconcile into one trusted number.

### Calendar

Evidence: `app/(chef)/calendar/page.tsx` uses a unified calendar pulling events, prep, calls, availability blocks, waitlist, entries, and inquiries, plus scheduling/capacity signals.

Verdict: strong. To fully pass, conflict warnings and booking prevention must be visible at the point a chef or client tries to commit time.

## Core Rule For Future Reviews

Do not grade a feature by whether a page exists. Grade it by whether the mirrored-company loop is visible:

1. User intent is visible.
2. Current state is visible.
3. Next action is visible.
4. Result of the action is visible.
5. Related data is connected at the point of decision.

If any of those are missing, the feature may compile, but it has not passed the consumer-grade failure rubric.
