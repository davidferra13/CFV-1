# End-to-End Chain Integrity: Answers & Verdicts

> **Date:** 2026-04-17
> **Investigator:** Claude Opus 4.6 (main session, direct code tracing)
> **Method:** Source code tracing, grep, file reads. No runtime testing.
> **Gap prefix:** EC-G (End-to-end Chain Gap)

---

## Chain 1: Money Chain (EC1-EC5)

| Q   | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC1 | **FAIL**    | `projectedFoodCostCents` hardcoded `null` at `lib/events/financial-summary-actions.ts:235`. DB function `compute_projected_food_cost_cents` EXISTS and is called in `transitions.ts:336` during state changes, but the financial summary page never invokes it. Dashboard reads from financial-summary-actions, so projected cost is always null. Downstream profit margin calc uses actual grocery spend instead, but projected food cost (from recipe book) is a dead chain.                  |
| EC2 | **FAIL**    | `recordPayment()` at `lib/commerce/payment-actions.ts:161` calls ONLY `revalidatePath('/commerce')`. Missing: `/events/${eventId}`, `/events`, `/dashboard`, `/my-events`, client portal paths. Event detail, dashboard, client spending page all serve stale payment data until next full navigation. DB trigger creates ledger entry correctly; the view recomputes. But client-side cache is stale.                                                                                          |
| EC3 | **PARTIAL** | `createExpense` writes to expenses table. `event_financial_summary` view includes expenses (verified via financial-summary-actions.ts:actualGrocerySpendCents, additionalExpensesCents). CPA export reads from same view. BUT: completion contract (`evaluateCompletion`) checks menu/recipe/ingredient completeness, NOT financial readiness (no "payment received" or "expenses logged" check found).                                                                                         |
| EC4 | **PARTIAL** | Recipe ingredient update in `lib/recipes/actions.ts` revalidates `/recipes` and `/recipes/${recipeId}` (line 690-691). Shopping list `generateShoppingList()` queries `recipe_ingredients` live on each call (no cache). BUT: recipe changes do NOT revalidate shopping list page path (`/culinary/shopping-list` or `/events/[id]/shopping`). Chef must navigate away and back, or regenerate. Cost calc: event_financial_summary uses ledger entries (actual spend), not recipe-derived cost. |
| EC5 | **FAIL**    | `subcontract_agreements` table exists in schema with `event_id`, `rate_type`, `rate_cents`. BUT: grep for `getSubcontractCosts`, `subcontract` in `lib/` returns zero matches in server actions. No function reads subcontract costs into `event_financial_summary`. `getCoHostFinancialSummary` not found in lib. Collaborator costs are schema-only; the financial pipeline ignores them.                                                                                                     |

**Gaps Found:**

- **EC-G1** (EC1): projectedFoodCostCents hardcoded null. DB function exists but financial summary page never calls it. CRITICAL: chef has no recipe-based cost projection.
- **EC-G2** (EC2): recordPayment only revalidates /commerce. 5+ stale surfaces.
- **EC-G3** (EC3): Completion contract has no financial readiness check.
- **EC-G4** (EC4): Recipe changes don't revalidate shopping list page.
- **EC-G5** (EC5): Subcontract/collaborator costs exist in schema but zero server actions consume them.

**Score: 0 PASS, 2 PARTIAL, 3 FAIL**

---

## Chain 2: Dietary Safety Chain (EC6-EC10)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC6  | **PARTIAL** | Client form saves to `clients.dietary_restrictions` + `clients.allergies`. Remy context loads both (`remy-context.ts:564,1677-1679,1719-1722`). Event dietary conflict detection exists (`lib/events/dietary-conflict-actions.ts`). Prep timeline carries `allergenFlags` per item (`compute-timeline.ts:35`). Staff briefing (`generateStaffBriefing`) loads client data. BUT: shopping list has NO allergen annotation; it returns quantities only (`shopping-list-actions.ts:141`). Kiosk catalog has no dietary flag system. 7/9 hops connected, 2 broken. |
| EC7  | **FAIL**    | `updateClientDietary()` at `lib/clients/dietary-dashboard-actions.ts:247` revalidates only `/clients/${clientId}`. Does NOT trigger re-evaluation of existing events. Events store `dietary_restrictions` as a copied array (set at inquiry conversion, `convertInquiryToEvent:1668`). Client profile update = event dietary data stale. Life-safety gap.                                                                                                                                                                                                      |
| EC8  | **PARTIAL** | `createNetworkContactShare()` includes `details` field in share. On acceptance, client auto-creation uses name/email/phone from share. `client_context` in handoffs preserves dietary data. But the acceptance path for contact shares: need to verify the auto-created client copies dietary from the `details` JSON. Not confirmed end-to-end.                                                                                                                                                                                                               |
| EC9  | **PASS**    | Remy context loads client dietary (`remy-context.ts:1719-1722`) and event dietary (`remy-context.ts:1677-1679`). Recipe allergen flags loaded and marked `[SAFETY]` (`remy-context.ts:2374-2376`). Menu allergens consolidated with cross-reference warning (`remy-context.ts:2682`). Remy has dietary data AND flags conflicts proactively.                                                                                                                                                                                                                   |
| EC10 | **FAIL**    | `generateShoppingList()` returns `ShoppingListItem[]` with quantity, unit, cost fields only. No allergen flag field. No client/event dietary cross-reference. Shopping list is purely a quantity aggregator. Chef sees "buy 3 lbs peanut butter" with no warning that Event B has a peanut allergy guest.                                                                                                                                                                                                                                                      |

**Gaps Found:**

- **EC-G6** (EC6): Shopping list has zero allergen annotations. Kiosk has no dietary flags.
- **EC-G7** (EC7): Client dietary update doesn't propagate to existing events. LIFE-SAFETY gap.
- **EC-G8** (EC10): Consolidated shopping list has no allergen cross-reference. LIFE-SAFETY gap.

**Score: 1 PASS, 2 PARTIAL, 2 FAIL**

---

## Chain 3: Time Cascade Chain (EC11-EC15)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC11 | **FAIL**    | `updateEvent()` at `lib/events/actions.ts:547-551` calls: `revalidatePath('/events')`, `revalidatePath('/events/${eventId}')`, `revalidatePath('/my-events')`, `revalidatePath('/my-events/${eventId}')`, `invalidateRemyContextCache()`. NO cascade to: prep blocks (no recompute trigger), reminder emails (lifecycle cron reads event_date live, but existing scheduled notifications aren't rescheduled), calendar sync (no call), staff notifications (no call), collaborator notifications (no call), shopping list deadlines (no call). |
| EC12 | **PARTIAL** | `computePrepTimeline()` is a pure function that takes `serviceDateTime` as input (`compute-timeline.ts:82`). Prep timeline is recomputed on every page render (not cached). So when event_date changes and chef views prep tab, timeline reflects new date. BUT: existing `prep_blocks` in DB store absolute timestamps, not relative offsets. If chef created manual prep blocks for "Monday at 2PM" and event moves from Wednesday to Friday, those blocks still say Monday. No auto-shift.                                                  |
| EC13 | **FAIL**    | `updateEvent()` has no collaborator awareness. No query to `event_collaborators`. No notification sent to co-hosts. Co-host's calendar (which reads from `getCollaboratingOnEvents()`) would eventually show new date (reads event_date live), but co-host is never notified of the change. Prep blocks owned by co-host are not recomputed.                                                                                                                                                                                                   |
| EC14 | **PASS**    | Lifecycle cron at `app/api/scheduled/lifecycle/route.ts` queries events with status filters. Cancelled events are excluded from reminder queries because reminders target `status IN ('confirmed', 'accepted', 'paid')`. Cancellation also sends `sendEventCancelledEmail` (transitions.ts:871). No stale reminders fire for cancelled events.                                                                                                                                                                                                 |
| EC15 | **FAIL**    | `updateEvent()` has no conflict detection. No check against other events for same date. The scheduling system has `getCalendarEvents()` but it's read-only display. Event edit form submits directly without overlap validation. Chef discovers double-booking only when viewing calendar.                                                                                                                                                                                                                                                     |

**Gaps Found:**

- **EC-G9** (EC11): Event date change has zero downstream cascade. 6 systems not notified.
- **EC-G10** (EC12): Manual prep blocks store absolute times; no auto-shift on date change.
- **EC-G11** (EC13): Collaborators not notified of event date changes.
- **EC-G12** (EC15): No double-booking detection on event date change.

**Score: 1 PASS, 1 PARTIAL, 3 FAIL**

---

## Chain 4: Inquiry-to-Completion Pipeline (EC16-EC20)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC16 | **PARTIAL** | `convertInquiryToEvent()` at `lib/inquiries/actions.ts:1553` carries: confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_dietary_restrictions, confirmed_service_expectations, confirmed_budget_cents (via accepted quote), cannabis_preference, referral_partner_id. `source_message` is used for conversation text extraction (line 1602) but NOT stored on event. `channel`, `service_style`, `unknown_fields` are NOT transferred to event record. Event has `inquiry_id` FK so original data is queryable, but not directly on event. |
| EC17 | **FAIL**    | Gmail sync creates inquiry with `source: 'email'` and `source_message` from email body. `convertInquiryToEvent()` does NOT transfer email thread ID, Gmail message ID, or sender metadata to event. Event has `inquiry_id` FK for back-reference, but no direct email thread link. Chef must navigate back to inquiry to find original email.                                                                                                                                                                                                                                    |
| EC18 | **PARTIAL** | Client record is NOT auto-created during conversion; `convertInquiryToEvent()` requires `inquiry.client_id` to already exist (line 1581). Client was created earlier in the inquiry lifecycle. The client record created at inquiry intake includes: name, email, phone. Dietary restrictions from inquiry go to EVENT record (line 1668), not client record. Budget goes to event `quoted_price_cents`. Guest count goes to event. Inquiry source is on inquiry, not client.                                                                                                    |
| EC19 | **PARTIAL** | AAR generator (`lib/ai/aar-generator.ts`) receives event data including financials. It queries the event, client, menu, and financial summary. Original inquiry data is accessible via `event.inquiry_id` but the AAR generator would need to explicitly query the inquiry. Dietary incidents: no structured incident tracking found. Communications: AAR queries messages for the event.                                                                                                                                                                                        |
| EC20 | **PARTIAL** | Payment completion in `lib/commerce/payment-actions.ts` does NOT trigger FSM transition. `updateSaleStatusAfterPayment` updates SALE status, not EVENT status. Client receives no automatic confirmation email on payment. Revenue dashboard: `recordPayment` only revalidates `/commerce` (EC-G2). Completion contract has no financial check (EC-G3). Payment is recorded correctly in ledger, but 3/4 downstream effects are missing.                                                                                                                                         |

**Gaps Found:**

- **EC-G13** (EC16): source_message, channel, service_style, unknown_fields not on event record.
- **EC-G14** (EC17): Email thread metadata lost on conversion. No email thread link on event.
- **EC-G15** (EC20): Payment completion doesn't trigger FSM transition or confirmation email.

**Score: 0 PASS, 4 PARTIAL, 1 FAIL**

---

## Chain 5: Recipe-to-Plate Chain (EC21-EC25)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC21 | **PARTIAL** | Recipe fields consumed by downstream systems: Menu display reads `name, description, category` (dish references recipe_id). Shopping list reads `recipe_ingredients` (quantity, unit, ingredient_id, yield_pct). Cost calc: via `compute_projected_food_cost_cents` DB function (but unused in financial summary, EC-G1). Prep timeline reads peak windows + allergen flags. Staff briefing reads recipe name + ingredients. Client-facing menu reads dish name (not recipe directly). Public profile: no recipe detail exposure. Dead data: `adaptations`, `method_detailed`, `notes` fields exist but most downstream consumers don't read them. |
| EC22 | **PARTIAL** | Recipe update revalidates `/recipes` paths only. Shopping list queries `recipe_ingredients` live (no cache), so data is current when list is generated. BUT: shopping list PAGE is not revalidated. Prep timeline: `computePrepTimeline` is pure function called on render; reads live peak window data. Event cost: uses ledger/expenses, not recipe cost (separate chain). Client menu: reads dish name, not recipe content. Net: data is live at query time, but page caches may serve stale views.                                                                                                                                             |
| EC23 | **PARTIAL** | Recipe ingredients are live-queried. Catalog price lookup: `ingredient_prices` table exists, queried at recipe view time for cost display. Menu cost: `compute_menu_cost_cents` DB function exists and aggregates per-dish costs. Event food cost: `compute_projected_food_cost_cents` calls `compute_menu_cost_cents`. Chain EXISTS in DB functions. But `financial-summary-actions.ts` hardcodes null instead of calling the function (EC-G1). So the chain is built but the last hop is disconnected.                                                                                                                                           |
| EC24 | **PARTIAL** | `deepCopyRecipe()` at `lib/collaboration/actions.ts:656` copies: recipe record (name, category, method, description, notes, times, yield, dietary_tags) + recipe_ingredients (quantity, unit, sort_order, is_optional, prep_notes, substitution_notes). Peak windows: cohesion checklist says "Fixed 2026-04-17" at `lib/collaboration/actions.ts:690-695`. Still missing: step photos, sub-recipe links. Production logs and nutrition data intentionally NOT copied (they're chef-specific history).                                                                                                                                             |
| EC25 | **PASS**    | `computePrepTimeline()` at `compute-timeline.ts:82` takes peak window data per recipe item. `resolvePeakWindow()` computes effective ceiling = min(peakHoursMax, safetyHoursMax). Timeline assigns items to prep days based on reverse-calculated start times from service date. Prep prompts (`lib/scheduling/prep-prompts.ts`) generate urgency-based alerts. Prep push system warns when chef is behind based on `daysUntilDate()` thresholds. Full chain works.                                                                                                                                                                                |

**Gaps Found:**

- **EC-G16** (EC21): Recipe `adaptations`, `method_detailed`, `notes` are stored but underconsumed.
- **EC-G17** (EC23): Recipe->menu->event cost chain built in DB functions but disconnected at financial summary level (overlaps EC-G1).
- **EC-G18** (EC24): deepCopyRecipe still missing step photos and sub-recipe links.

**Score: 1 PASS, 4 PARTIAL, 0 FAIL**

---

## Chain 6: Notification Guarantee Chain (EC26-EC30)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EC26 | **PARTIAL** | `transitions.ts` on proposed->accepted: sends `sendEventConfirmedEmail` to client (line 668). Creates chef notification (line 405-450). Passes `coHostNames` to email (from prior session fix). BUT: no explicit notification to collaborators beyond email name inclusion. No staff notification on acceptance. SSE broadcast: grep for `broadcast(` in lib/ returns ZERO matches. No SSE push on transitions. Chef gets DB notification; client gets email. Collaborators get name in email. Staff gets nothing. |
| EC27 | **FAIL**    | Menu mutation functions (`lib/menus/actions.ts`) revalidate menu paths. No collaborator query. No notification to co-hosts on menu changes. Co-host discovers menu change only when viewing the event.                                                                                                                                                                                                                                                                                                             |
| EC28 | **PARTIAL** | Client message creation triggers notification via `createClientNotification`. Chef gets DB notification. Email notification depends on channel-router preferences. SSE: grep shows zero `broadcast()` calls in chat/message actions. Real-time via SSE is wired at the chat component level (`lib/chat/realtime.ts`), but message creation server action doesn't call broadcast. Push notifications: depends on notification preferences. Unread count: computed on page render, not pushed.                       |
| EC29 | **PARTIAL** | Lifecycle cron detects overdue payments by checking event financial state. It sends reminder emails to clients for upcoming events. But explicit "overdue invoice" detection with chef notification: not verified as a distinct cron task. The lifecycle cron focuses on event dates (reminders), not payment due dates.                                                                                                                                                                                           |
| EC30 | **PARTIAL** | `OllamaOfflineError` class at `lib/ai/ollama-errors.ts`. 68 files reference it. `lib/ai/parse-ollama.ts` throws it on connection failure. Callers that catch errors MUST re-throw it per CLAUDE.md. Remy shows error via `remy-actions.ts` error handling. Developer alerts: `developer-alerts.ts` exists with circuit breaker. BUT: not all AI entry points verified for consistent OllamaOfflineError propagation. Some may catch generically and return empty results.                                          |

**Gaps Found:**

- **EC-G19** (EC26): No SSE broadcast on event transitions. No staff notification on acceptance.
- **EC-G20** (EC27): Co-hosts not notified of menu changes. OPERATIONAL gap.
- **EC-G21** (EC28): Message creation doesn't call broadcast(). Real-time may be component-level only.
- **EC-G22** (EC29): No explicit overdue invoice detection with chef notification.

**Score: 0 PASS, 4 PARTIAL, 1 FAIL**

---

## Chain 7: Cache Consistency Chain (EC31-EC35)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC31 | **FAIL**    | Known breaks confirmed: `recordPayment` revalidates only `/commerce` (missing 5+ paths). Recipe actions revalidate `/recipes` only (missing shopping list, events). `updateEvent` revalidates event paths but NOT prep blocks, calendar, or collaborator paths. `updateClientDietary` revalidates only `/clients/${id}` (missing event pages showing dietary). `createExpense` path needs verification. Pattern: mutations revalidate their OWN domain but not CONSUMING domains.                                                                                             |
| EC32 | **PARTIAL** | `unstable_cache` usage in: `lib/chef/layout-cache.ts` (tags: `chef-layout-{id}`, `is-admin-{id}`), `lib/chef/layout-data-cache.ts` (4 cached functions), `lib/beta-survey/survey-cache.ts`, `lib/menus/menu-intelligence-actions.ts` (4 instances), `lib/prospecting/openclaw-import.ts`, `app/book/[chefSlug]/page.tsx`. Q83 automated test (`tests/system-integrity/q83-unstable-cache-tag-pairing.spec.ts`) verifies tag pairing. Layout cache tags have matching `revalidateTag` calls (confirmed in zero-hallucination-audit). Menu intelligence tags need verification. |
| EC33 | **FAIL**    | Grep for `broadcast(` in `lib/**/*.ts` returns ZERO matches. No server action calls SSE broadcast after mutations. Real-time updates rely on component-level polling or page navigation. Two tabs = tab B is stale until refresh.                                                                                                                                                                                                                                                                                                                                             |
| EC34 | **PARTIAL** | Client portal pages are server components (dynamic rendering, no ISR). They query DB on each request. Chef mutations that revalidate client paths (e.g., Stripe webhook revalidates `/my-events/${id}`) trigger fresh renders. But mutations that ONLY revalidate chef paths (e.g., `updateEvent` revalidates `/events/${id}` but also `/my-events/${id}`) are partially covered. Payment mutations (EC-G2) don't revalidate client paths at all.                                                                                                                             |
| EC35 | **PARTIAL** | Event cancellation in `transitions.ts` revalidates event paths. Dashboard widgets query events by status (cancelled excluded from most widgets). Calendar reads live. Search queries DB live. BUT: analytics summaries may include cancelled events in historical aggregations (intentional for reporting). Daily report: lifecycle cron filters by status. Net: cancelled events properly excluded from operational views, included in historical analytics.                                                                                                                 |

**Gaps Found:**

- **EC-G23** (EC31): Systematic cross-domain revalidation gap. Mutations bust own domain only.
- **EC-G24** (EC33): Zero SSE broadcast calls in server actions. Multi-tab is broken.

**Score: 0 PASS, 3 PARTIAL, 2 FAIL**

---

## Chain 8: Client Experience Chain (EC36-EC40)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC36 | **PARTIAL** | Client journey pages exist: portal onboarding (token-based), event detail with journey stepper (`EventJourneyStepper`), proposal view (token-gated), menu approval, contract signing, payment, countdown, feedback. Navigation between steps uses back-navigation; no sequential wizard. Dead end risk: if client has no event yet but has portal access, the events page is empty with no guidance.                                                            |
| EC37 | **PASS**    | Proposal page at `app/(public)/proposal/[token]/page.tsx` is token-gated (public, no auth required). Validates token, checks expiry, renders proposal with accept/decline. If client doesn't have an account, they can still view and respond. Account creation is separate (invitation flow). No login wall on proposal view.                                                                                                                                  |
| EC38 | **PARTIAL** | Client spending page reads from `event_financial_summary` view (ledger-derived). Event detail financial section also reads from ledger. Consistency: both derive from same source. BUT: `recordPayment` doesn't revalidate client paths (EC-G2), so client portal may show stale balance until next navigation. The numbers WILL match once cache refreshes, but there's a staleness window.                                                                    |
| EC39 | **PARTIAL** | Proposal email now includes `coHostNames` (from prior session fix). Contract generator: `lib/ai/contract-generator.ts` uses Ollama with event/client context; collaborator data not explicitly included. Client event detail: `EventJourneyStepper` and event view don't show collaborator names. Staff briefing for client: not applicable (staff briefing is chef-side). Net: proposal email has co-host names; other client surfaces don't.                  |
| EC40 | **PARTIAL** | Public Remy concierge widget (`components/public/remy-concierge-widget.tsx`) exists. It handles basic chat interactions. Inquiry creation from widget: widget can trigger the public inquiry form. Availability checking: depends on Remy's task types and whether the public widget has access to scheduling data (limited context for unauthenticated users). Hand-off to human: chat messages can be forwarded. Full capability audit needs runtime testing. |

**Gaps Found:**

- **EC-G25** (EC36): Client journey has no sequential wizard; requires back-navigation between steps.
- **EC-G26** (EC39): Co-host names in email only; contract, event detail, other client surfaces don't show collaborators.

**Score: 1 PASS, 4 PARTIAL, 0 FAIL**

---

## Chain 9: Analytics Truth Chain (EC41-EC45)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EC41 | **PASS**    | Dashboard revenue reads from `ledger_entries` via financial summary functions. `getTenantFinancialSummary` queries `ledger_entries` with `is_refund=false, entry_type != tip`. CPA export reads from same ledger entries. Daily report aggregates from same source. Client spending reads `event_financial_summary` view (ledger-derived). All 5 surfaces read from ledger as single source of truth. Confirmed in prior financial integrity audit (system-integrity-question-set-financials.md: I1 FIXED).                                                              |
| EC42 | **PASS**    | Events completed count: analytics queries `events` table with `status = 'completed'` filter. Event list filters by status. CPA export counts events by status. All read from same `events` table with same status column. No materialized view or separate counter.                                                                                                                                                                                                                                                                                                      |
| EC43 | **PARTIAL** | `event_financial_summary` view computes from current ledger entries. Ledger entries capture actual amounts paid at transaction time (immutable, append-only). Recipe costs: `compute_projected_food_cost_cents` would compute from CURRENT ingredient prices (not historical). So projected food cost retroactively updates. BUT: actual costs (grocery receipts, expenses) are frozen at entry time. Net: actual financials are point-in-time (correct), projected costs are retroactive (potentially misleading). Moot since projected cost is hardcoded null (EC-G1). |
| EC44 | **PARTIAL** | Financial summary at `lib/events/financial-summary-actions.ts` includes: totalReceivedCents (revenue), actualGrocerySpendCents, leftoverCredits, additionalExpensesCents. Profit = revenue - costs. Missing: subcontractor costs (EC-G5), collaborator splits (no function), refunds (included in ledger as separate entry_type), tips (separated), discounts (loyalty redemptions don't create ledger entries per FC-G10). Average margin would miss subcontractor costs and loyalty discounts.                                                                         |
| EC45 | **PARTIAL** | CPA export reads from same data sources as dashboard. But the export function may format differently (date ranges, aggregation). Whether exported CSV exactly matches dashboard moment-in-time depends on whether the export runs the same queries with same filters. Likely aligned but not guaranteed identical since dashboard shows aggregate totals and export shows per-event rows.                                                                                                                                                                                |

**Gaps Found:**

- **EC-G27** (EC44): Profit margin excludes subcontractor costs and loyalty discounts. Overlaps EC-G5 and FC-G10.

**Score: 2 PASS, 3 PARTIAL, 0 FAIL**

---

## Chain 10: Collaboration Integrity Chain (EC46-EC50)

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC46 | **PARTIAL** | Chef B sees event on dashboard via `getCollaboratingOnEvents()` (alerts section only, `dashboard/_sections/alerts-section.tsx:14`). Calendar: `getCalendarEvents()` filters by tenant_id; collaborating events NOT merged (known gap G6 in cross-system set). Menu: Chef B can view via event detail if `can_view_menu` permission. Dietary: reads from event record (accessible if Chef B can view event). Prep timeline: Chef A's blocks visible to Chef B (Q28 fix). Shopping list: `generateShoppingList` filters by `tenant_id`, so Chef B's shopping list won't include Chef A's event ingredients. Financial split: no per-collaborator financial view exists. Score: 3/6 surfaces accessible. |
| EC47 | **FAIL**    | Recipe data is tenant-scoped. Chef A's recipe lives in Chef A's tenant. Chef B's prep timeline reads recipes via event->menu->dish->component->recipe chain, scoped to Chef A's tenant for the shared event. BUT: `fetchPrepBlocks` and timeline computation read from the event's data. If Chef A modifies recipe, the timeline recomputes on next view (data is live). Shopping list: Chef B's `generateShoppingList` filters by `tenant_id` = Chef B, so Chef A's event and recipes are excluded. Chef B cannot generate a shopping list for the co-hosted event.                                                                                                                                  |
| EC48 | **PASS**    | `getEventPrepBlocks()` in `lib/scheduling/prep-block-actions.ts` was fixed (Q28 from prior session) to fetch collaborator chef blocks via `event_collaborators` query. Chef A sees Chef B's prep blocks. Bidirectional visibility confirmed.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| EC49 | **PARTIAL** | `transitions.ts` sends emails with `coHostNames` included (prior session fix). Chef notification created for primary chef. BUT: no explicit notification INSERT for collaborator chefs on state transitions. Collaborator notification is limited to name inclusion in client-facing emails. Chef B's dashboard: `getCollaboratingOnEvents()` reads live status, so state change is visible on next page load. But no push notification to Chef B.                                                                                                                                                                                                                                                    |
| EC50 | **FAIL**    | No per-collaborator financial view exists. `getCoHostFinancialSummary` not found in codebase. `event_financial_summary` is per-event, scoped to primary tenant. Chef B has no view of: their own costs on the event, Chef A's costs, revenue split, or individual profit. Financial collaboration is structurally absent from the codebase.                                                                                                                                                                                                                                                                                                                                                           |

**Gaps Found:**

- **EC-G28** (EC46): Collaborator excluded from calendar, shopping list, financial view.
- **EC-G29** (EC47): Shopping list generation excludes collaborating events for Chef B.
- **EC-G30** (EC49): No push notification to collaborators on state transitions.
- **EC-G31** (EC50): No per-collaborator financial view. Collaboration financials structurally absent.

**Score: 1 PASS, 2 PARTIAL, 2 FAIL**

---

## GRAND SCORECARD

| Chain                | PASS  | PARTIAL | FAIL   | Gaps   |
| -------------------- | ----- | ------- | ------ | ------ |
| 1. Money             | 0     | 2       | 3      | 5      |
| 2. Dietary Safety    | 1     | 2       | 2      | 3      |
| 3. Time Cascade      | 1     | 1       | 3      | 4      |
| 4. Inquiry Pipeline  | 0     | 4       | 1      | 3      |
| 5. Recipe-to-Plate   | 1     | 4       | 0      | 3      |
| 6. Notification      | 0     | 4       | 1      | 4      |
| 7. Cache Consistency | 0     | 3       | 2      | 2      |
| 8. Client Experience | 1     | 4       | 0      | 2      |
| 9. Analytics Truth   | 2     | 3       | 0      | 1      |
| 10. Collaboration    | 1     | 2       | 2      | 4      |
| **TOTAL**            | **7** | **29**  | **14** | **31** |

**Overall: 14% PASS, 58% PARTIAL, 28% FAIL**

---

## Priority Gaps (31 Total)

### CRITICAL (Life-Safety / Data Integrity) - 4 gaps

| Gap       | Q    | Issue                                                                    | Impact                                                                |
| --------- | ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **EC-G7** | EC7  | Client dietary update doesn't propagate to existing events               | Guest with new allergy could be served allergen. LIFE-SAFETY.         |
| **EC-G8** | EC10 | Shopping list has no allergen cross-reference                            | Chef buys allergen ingredients without warning. LIFE-SAFETY.          |
| **EC-G1** | EC1  | projectedFoodCostCents hardcoded null; recipe-based cost projection dead | Chef has no projected food cost before shopping. Financial blindness. |
| **EC-G2** | EC2  | recordPayment only revalidates /commerce                                 | 5+ surfaces show stale payment data. Client thinks they haven't paid. |

### HIGH (Operational Breakage) - 11 gaps

| Gap    | Q    | Issue                                                                        |
| ------ | ---- | ---------------------------------------------------------------------------- |
| EC-G5  | EC5  | Subcontractor/collaborator costs structurally absent from financial pipeline |
| EC-G9  | EC11 | Event date change has zero downstream cascade (6 systems)                    |
| EC-G11 | EC13 | Collaborators not notified of event date changes                             |
| EC-G15 | EC20 | Payment completion doesn't trigger FSM transition or confirmation email      |
| EC-G20 | EC27 | Co-hosts not notified of menu changes                                        |
| EC-G23 | EC31 | Cross-domain revalidation gap (mutations bust own domain only)               |
| EC-G24 | EC33 | Zero SSE broadcast in server actions; multi-tab broken                       |
| EC-G28 | EC46 | Collaborator excluded from calendar, shopping list, financial view           |
| EC-G29 | EC47 | Shopping list excludes collaborating events for Chef B                       |
| EC-G31 | EC50 | No per-collaborator financial view                                           |
| EC-G12 | EC15 | No double-booking detection on event date change                             |

### MEDIUM (UX / Completeness) - 12 gaps

| Gap    | Q    | Issue                                                                  |
| ------ | ---- | ---------------------------------------------------------------------- |
| EC-G3  | EC3  | Completion contract has no financial readiness check                   |
| EC-G4  | EC4  | Recipe changes don't revalidate shopping list page                     |
| EC-G6  | EC6  | Shopping list missing allergen annotations; kiosk has no dietary flags |
| EC-G10 | EC12 | Manual prep blocks store absolute times; no auto-shift on date change  |
| EC-G13 | EC16 | source_message, channel, service_style lost on inquiry conversion      |
| EC-G14 | EC17 | Email thread metadata lost on conversion                               |
| EC-G19 | EC26 | No SSE broadcast on transitions; no staff notification on acceptance   |
| EC-G21 | EC28 | Message creation doesn't call broadcast()                              |
| EC-G22 | EC29 | No overdue invoice detection with chef notification                    |
| EC-G25 | EC36 | Client journey has no sequential wizard                                |
| EC-G26 | EC39 | Co-host names only in email; missing from contract, event detail       |
| EC-G30 | EC49 | No push notification to collaborators on transitions                   |

### LOW (Polish / Edge Cases) - 4 gaps

| Gap    | Q    | Issue                                                                         |
| ------ | ---- | ----------------------------------------------------------------------------- |
| EC-G16 | EC21 | Recipe fields (adaptations, method_detailed) underconsumed                    |
| EC-G17 | EC23 | Cost chain built in DB but disconnected at financial summary (overlaps EC-G1) |
| EC-G18 | EC24 | deepCopyRecipe missing step photos and sub-recipe links                       |
| EC-G27 | EC44 | Profit margin excludes subcontractor costs and loyalty discounts              |

---

## Key Insight: The Three Structural Failures

1. **No cross-domain cache busting.** Every mutation revalidates its own domain but NOT consuming domains. This causes systemic staleness across the app.

2. **No SSE broadcast in server actions.** Zero `broadcast()` calls found. Real-time is component-level illusion, not mutation-driven. Multi-tab and multi-user are broken.

3. **Collaboration is structurally single-tenant.** Financial summary, shopping list, calendar, and completion contract all filter by `tenant_id`. Collaborating chefs are invisible to these systems. The collaboration feature bolts onto display layers but doesn't penetrate operational logic.
