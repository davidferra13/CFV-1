# System Integrity Question Set: Operational Pressure Test

> **Date:** 2026-04-18
> **Purpose:** Test whether the system survives real-world chef operations without corrupting state, losing data, or displaying wrong information. Existing question sets test data flow at rest. This set tests temporal resilience: what happens when data changes AFTER downstream systems have already consumed it.
> **Method:** Each question describes a real scenario a busy private chef encounters weekly. Named systems, concrete PASS criteria, business-impact justification.
> **Gap prefix:** OP-G (Operational Pressure Gap)
> **Scope:** Only features that exist today. No aspirational surfaces.

---

## A. Late-Stage Mutation Integrity (Guest count, menu, date changes after confirmation)

The most common "oh no" moments in private chef work. Client confirms, then changes their mind. Does the system propagate the change without leaving stale data anywhere?

### OP1: Guest count increases 48 hours before event (confirmed status, menu assigned, shopping list generated)

**Systems:** Event editor, recipe scaling, shopping list, grocery list, prep timeline, event costing, client portal, Remy context
**Scenario:** Event is `confirmed` with 10 guests. Shopping list already generated. Chef changes guest count to 20. Then checks every downstream surface.
**PASS:** (a) Shopping list quantities double on regeneration, (b) grocery list quantities double, (c) prep timeline component counts adjust, (d) event cost projection updates, (e) client portal shows 20 guests, (f) Remy asked "how many guests for Saturday?" says 20, (g) no cached "10 guests" visible anywhere.
**Why:** This happens weekly. A chef who shops for 10 when hosting 20 runs out of food mid-service. Most embarrassing failure mode in the industry.

### OP2: Menu swap on a confirmed event with existing shopping list

**Systems:** Menu assignment, shopping list, grocery list, prep timeline, event costing, client portal, staff briefing
**Scenario:** Confirmed event has Menu A (Italian). Chef swaps to Menu B (French). Shopping list was generated from Menu A.
**PASS:** (a) Old shopping list is stale-marked or regenerated, (b) prep timeline shows Menu B components, (c) event cost reflects Menu B recipes, (d) client portal menu section shows Menu B, (e) staff briefing reflects new menu, (f) no Italian ingredients remain in any active list.
**Why:** Menu changes happen when the client changes preferences. Leftover ingredients from the old menu = wasted money and wrong prep.

### OP3: Event date moves from Saturday to Sunday after staff have been assigned and prep timeline computed

**Systems:** Event editor, calendar, staff assignments, prep timeline, shopping deadline computation, client notification, Remy
**Scenario:** Confirmed event for Saturday moves to Sunday. Staff assignments, prep deadlines, and shopping deadlines were computed for Saturday.
**PASS:** (a) Calendar shows Sunday, not Saturday, (b) prep timeline deadlines shift by 1 day, (c) shopping deadline shifts, (d) staff availability conflicts re-evaluated, (e) client gets notified of date change, (f) Remy reports correct date.
**Why:** Date changes are the second most common late-stage mutation. A shifted prep timeline that still says "buy by Thursday" when it should now say "buy by Friday" causes unnecessary urgency or missed deadlines.

### OP4: Client adds a severe allergy (e.g., "tree nuts") after menu is finalized and shopping list generated

**Systems:** Client record, dietary conflict detector, menu allergy audit, shopping list allergen warnings, Remy, email templates
**Scenario:** Event confirmed, menu finalized (contains pine nut pesto). Client reports tree nut allergy.
**PASS:** (a) Dietary conflict detector fires immediately and flags pine nut pesto as dangerous, (b) shopping list shows allergen warning on pine nuts, (c) Remy asked about allergies reports tree nuts, (d) next email to client acknowledges dietary restriction, (e) event detail page shows allergy badge/warning.
**Why:** This is a life-safety scenario. A single missed allergy propagation can hospitalize someone. The system must treat allergy updates as highest-priority mutations.

### OP5: Client cancels 24 hours before event (ingredients already purchased, staff assigned, prep started)

**Systems:** Event FSM, financial summary (sunk costs), staff notifications, calendar, shopping list, prep timeline, client portal, cancellation policy, refund calculation
**Scenario:** Chef has spent $800 on groceries. Event is `confirmed`. Client cancels. Chef initiates cancellation flow.
**PASS:** (a) Event transitions to `cancelled`, (b) financial summary shows $800 in sunk expenses (not zeroed out), (c) revenue side shows cancellation fee if policy exists, (d) staff get notified, (e) calendar removes event, (f) shopping list marks items as "for cancelled event", (g) client portal shows cancelled status, (h) cancellation email sent.
**Why:** Late cancellations are the #1 financial risk. If expenses disappear from the summary, the chef can't prove their loss or enforce their cancellation policy.

---

## B. Multi-Event Resource Contention (Overlapping events sharing ingredients, staff, time)

Private chefs often have 2-3 events in a single week. These events share the chef's time, inventory, staff pool, and sometimes ingredients.

### OP6: Two events on the same weekend share an ingredient. Shopping list shows combined total, not per-event.

**Systems:** Shopping list generator, grocery list consolidation, event costing (per-event allocation)
**Scenario:** Event A (Saturday, 10 guests) needs 2 lbs butter. Event B (Sunday, 8 guests) needs 1.5 lbs butter. Chef generates a combined shopping list for the week.
**PASS:** (a) Combined shopping list shows 3.5 lbs butter (not 2 or 1.5), (b) per-event cost allocation still attributes 2 lbs to Event A and 1.5 lbs to Event B, (c) if chef marks butter as purchased for 3.5 lbs, both events show their portion as purchased.
**Why:** Under-buying = running out mid-service. Over-attributing cost = wrong profit calculation. Both events need accurate individual allocation from a shared purchase.

### OP7: Same staff member assigned to two events on the same day. System detects conflict.

**Systems:** Staff assignment, scheduling, availability calendar
**Scenario:** Chef assigns Staff Member X to Saturday lunch event (11am-3pm) and Saturday dinner event (5pm-10pm). Then tries to assign X to a third event overlapping dinner (4pm-9pm).
**PASS:** (a) First two assignments succeed (no overlap), (b) third assignment shows a conflict warning with the specific overlapping event and times, (c) conflict doesn't silently overwrite the existing assignment.
**Why:** Double-booking staff means either an event is understaffed (service quality drops) or the chef pays for coverage they already committed. Financial and reputational risk.

### OP8: Chef cancels one of two weekend events. Combined shopping list updates to reflect only the remaining event.

**Systems:** Event cancellation, shopping list, grocery list, prep timeline
**Scenario:** Combined shopping list generated for Event A + Event B. Chef cancels Event A. Regenerates shopping list.
**PASS:** (a) Shopping list shows only Event B quantities, (b) items unique to Event A disappear, (c) shared ingredients reduce to Event B amounts, (d) prep timeline drops Event A components, (e) cost allocation removes Event A.
**Why:** Shopping for a cancelled event = pure waste. The chef must know exactly what to buy for what's still happening.

---

## C. Financial Integrity Under Real Scenarios (Partial payments, deposits, tips, refunds, multi-item)

Money is where errors hurt most. These test every branch of the financial system under real operational conditions.

### OP9: Client pays 50% deposit, then pays remaining balance. Ledger shows two entries, financial summary shows correct total.

**Systems:** Stripe checkout, ledger, event financial summary, client portal balance, CPA export
**Scenario:** Event quoted at $5,000. Client pays $2,500 deposit. Later pays remaining $2,500. Chef checks ledger and financial summary.
**PASS:** (a) Two ledger entries: $2,500 + $2,500, (b) event financial summary shows $5,000 total revenue, (c) client portal shows $0 balance due, (d) CPA export shows both transactions with correct dates, (e) event status transitions correctly (accepted -> paid on first payment, or after full payment per policy).
**Why:** Split payments are the norm for private dining ($5K+ events). If the ledger shows one payment, the chef's books are wrong and tax filing is inaccurate.

### OP10: Chef logs $300 in expenses across 3 receipts for one event. Each expense correctly allocated to the event.

**Systems:** Expense tracker, event financial summary, profit calculation, dashboard, CPA export
**Scenario:** Chef logs: (a) $150 grocery receipt, (b) $80 specialty items, (c) $70 rentals. All tagged to Event X.
**PASS:** (a) Event X financial summary shows $300 total expenses, (b) profit = revenue - $300 (not revenue alone), (c) dashboard financial widget reflects reduced profit, (d) CPA export shows 3 separate expense entries with correct categories, (e) each expense editable/deletable independently.
**Why:** Real events have 3-8 expense receipts. If any are lost or mis-allocated, the profit figure is wrong, and the chef makes bad pricing decisions for future events.

### OP11: Tip received after event completion flows into correct ledger category and financial summary

**Systems:** Tip page, Stripe payment, ledger, event financial summary, CPA export
**Scenario:** Event completed. Client clicks tip link, leaves $200 tip via Stripe. Chef checks financials.
**PASS:** (a) Ledger entry created with type `tip` (not `payment`), (b) event financial summary shows tip separately from base payment, (c) CPA export categorizes tips correctly (different tax treatment), (d) dashboard revenue widget includes tip, (e) Remy asked "how much did I make on Saturday's dinner?" includes the tip.
**Why:** Tips have different tax treatment than service revenue in many jurisdictions. Mixing them up = wrong tax filing.

### OP12: Partial refund issued. Ledger negative entry, client portal updated, net revenue correct.

**Systems:** Stripe refund, ledger, event financial summary, client portal, CPA export
**Scenario:** Client paid $5,000. Chef issues $500 refund (service issue). Checks all financial surfaces.
**PASS:** (a) Ledger shows negative $500 entry, (b) event financial summary shows $4,500 net revenue, (c) client portal shows $4,500 paid (or $500 refunded), (d) CPA export includes both the payment and refund as separate line items, (e) profit calculation uses $4,500 net revenue against expenses.
**Why:** Refunds happen. If the system still shows $5,000 revenue with a $500 refund somewhere else, the chef overpays taxes.

### OP13: Event with zero revenue (comp'd dinner for friend) still tracks expenses correctly

**Systems:** Event creation, expense tracking, financial summary, dashboard
**Scenario:** Chef creates event with $0 quote (complimentary). Logs $400 in expenses. Checks financials.
**PASS:** (a) Event financial summary shows -$400 profit (not $0), (b) dashboard includes this loss in overall metrics, (c) expense entries are correctly linked to event, (d) CPA export includes expenses even with $0 revenue.
**Why:** Comp events still cost money. If the system hides losses from zero-revenue events, the chef doesn't realize how much they're spending on free work.

---

## D. Operational Recovery (Undo, correction, mistake handling)

Chefs make mistakes under pressure. The system must allow correction without data loss or corruption.

### OP14: Chef accidentally marks event as completed (still in_progress). Can they revert?

**Systems:** Event FSM, transition history, side effects (AAR prompt, completion email, loyalty points)
**Scenario:** Chef fat-fingers "Mark Complete" on an in_progress event. Completion email fires, AAR prompt appears, loyalty points awarded.
**PASS:** (a) Transition to completed is logged in audit trail, (b) if reversion exists, completion side effects are either reversed or flagged, (c) if no reversion, the system clearly states the event is completed and the chef can contact support. (d) At minimum, transition is recorded for accountability.
**Why:** Premature completion triggers client-facing actions (feedback request, tip link). Once the client gets those emails, they think the event is over. Correction must be possible or the damage is visible.

### OP15: Chef enters wrong payment amount ($500 instead of $5,000). Can they delete and re-enter?

**Systems:** Ledger immutability, manual payment entry, event financial summary
**Scenario:** Chef records offline payment of $500 (should be $5,000). Realizes the mistake. Tries to correct.
**PASS:** (a) Ledger entry exists for $500, (b) chef can void/reverse the entry (new negative entry, not delete), (c) re-enter $5,000 as new entry, (d) net ledger shows $5,000, (e) financial summary correct, (f) audit trail shows the correction sequence.
**Why:** Manual payment entry is error-prone. If the ledger is truly immutable (as designed), the correction path must be append-only: reverse + re-enter. Deleting ledger entries would break the audit trail.

### OP16: Chef deletes a recipe that is currently assigned to an active event's menu

**Systems:** Recipe deletion, menu integrity, shopping list, prep timeline, event costing
**Scenario:** Recipe "Lobster Bisque" is on Menu A, assigned to a confirmed event. Chef deletes the recipe from their recipe book.
**PASS:** (a) Either deletion is blocked with a warning ("used in active event"), OR (b) recipe is soft-deleted but menu retains reference (graceful degradation), OR (c) menu shows "Recipe removed" placeholder. (d) In no case does the menu silently show a blank slot or crash.
**Why:** Recipes are intellectual property. Deleting one shouldn't silently break an active event's menu and shopping list. The chef must know the downstream impact.

### OP17: Chef creates a quote, client accepts, then chef realizes the quote was too low. Can they amend?

**Systems:** Quote builder, contract, event pricing, ledger, client portal
**Scenario:** Chef quoted $3,000 (should have been $5,000). Client already accepted and paid. Chef wants to charge the difference.
**PASS:** (a) Original quote is immutable (audit trail), (b) chef can create a supplemental quote/invoice for $2,000, (c) supplemental appears in event financial summary, (d) client portal shows additional balance due, (e) Stripe checkout available for the supplement.
**Why:** Underquoting happens, especially for new chefs. The system must support price corrections without rewriting history. Amending the original quote would be dishonest and legally risky.

---

## E. Communication Reliability Under Operational Pressure

When things change fast, the client must hear about it correctly and exactly once.

### OP18: Event details change 3 times in 2 hours. Client receives updates without spam.

**Systems:** Event editor, notification pipeline, dedup guard, email service, client portal
**Scenario:** Chef updates: (a) guest count 10->12, (b) serve time 7pm->7:30pm, (c) menu swap. All within 2 hours.
**PASS:** (a) Client does NOT receive 3 separate emails, (b) either batched into one summary update or latest state only, (c) client portal always shows current state, (d) notification dedup prevents spam, (e) if individual notifications sent, they're clearly labeled (not confusing).
**Why:** Notification spam during planning phase makes the chef look disorganized. Clients want to know the final state, not every intermediate change.

### OP19: Email fails to send for a critical notification (proposal to client). Chef is alerted, client isn't left in the dark.

**Systems:** Email service, dead letter queue, notification dashboard, circuit breaker
**Scenario:** Chef sends proposal. Resend API is temporarily down. Email fails.
**PASS:** (a) Proposal send action succeeds (email is non-blocking), (b) failed email enters dead letter queue, (c) chef sees a warning somewhere (notification center, dashboard, or toast), (d) retry cron attempts re-send, (e) proposal is still accessible via client portal link regardless of email delivery.
**Why:** A proposal that never arrives means a lost client. The chef must know when critical emails fail so they can follow up manually.

### OP20: Client portal link in email points to current data, not stale snapshot

**Systems:** Email template, client portal, proposal viewer, contract viewer
**Scenario:** Chef sends proposal email with portal link. Then updates the proposal (adds a course, adjusts price). Client clicks the link 2 hours later.
**PASS:** (a) Client sees the UPDATED proposal (not the version at email-send time), (b) if proposal was auto-snapshot'd in email body, the portal link overrides with current data, (c) no scenario where client sees old price in portal.
**Why:** Stale portal data is worse than no portal. If the client accepts a $3,000 quote but the chef updated it to $3,500, there's a contract dispute.

---

## F. Safety-Critical Data Under Pressure (Allergies, dietary, temperature)

Allergy data is life-safety. Every propagation must be tested under mutation pressure.

### OP21: Allergy added to client AFTER event is confirmed but BEFORE shopping. Does every surface reflect it?

**Systems:** Client record, event dietary detection, menu allergen audit, shopping list warnings, Remy, staff briefing
**Scenario:** Client mentions "actually, I'm allergic to shellfish" 3 days before the event. Chef updates client record.
**PASS:** (a) Event detail page shows shellfish allergy badge, (b) menu items containing shellfish are flagged, (c) shopping list shows allergen warning, (d) Remy reports the allergy, (e) staff briefing includes dietary restrictions, (f) if menu has shellfish dishes, conflict alert fires.
**Why:** This WILL happen. Clients forget to mention allergies until reminded. The system must treat every allergy update as a cascade event that touches every downstream consumer.

### OP22: Two guests at the same event have conflicting dietary restrictions (vegan + keto). System surfaces the conflict.

**Systems:** Event dietary conflict detector, menu planner, shopping list, Remy
**Scenario:** Guest A is vegan (no animal products). Guest B is keto (high fat, low carb, meat-heavy). Both attending same event.
**PASS:** (a) Dietary conflict detector notes the challenge and surfaces it to chef, (b) menu planner can show which dishes satisfy which guests, (c) shopping list correctly includes both vegan and keto ingredients, (d) Remy can answer "any dietary conflicts for this event?" with specifics.
**Why:** Conflicting diets are the hardest menu planning challenge. If the system doesn't surface the conflict, the chef discovers it while shopping and has to re-plan from scratch.

### OP23: Allergen removed from client (was "dairy free", now "no restrictions"). Does the system stop showing warnings?

**Systems:** Client record, dietary warnings, shopping list, Remy
**Scenario:** Client was marked dairy-free. Chef updates to "no restrictions."
**PASS:** (a) Event page no longer shows dairy-free badge, (b) shopping list stops flagging dairy ingredients, (c) Remy no longer mentions dairy restriction, (d) no stale cache shows old restriction.
**Why:** False positives waste the chef's time and limit menu options. Removing a restriction must propagate as reliably as adding one.

---

## G. Prep Timeline and Shopping List Resilience

The prep timeline and shopping list are the chef's daily operational tools. They must survive mutations and reflect reality.

### OP24: Recipe yield changed after shopping list generated. Shopping list reflects new yield.

**Systems:** Recipe editor, shopping list generator, grocery list, event costing
**Scenario:** Recipe "Tomato Sauce" yields 4 servings. Shopping list calculated for 10 guests (2.5x recipe). Chef edits yield to 2 servings (now 5x recipe). Shopping list regenerated.
**PASS:** (a) New shopping list shows 5x ingredient quantities (not 2.5x), (b) event cost reflects updated quantities, (c) grocery list matches, (d) no cached 2.5x quantities visible.
**Why:** Yield is the multiplier. A wrong yield = buying half as much food. This is a common entry error when chefs first input recipes.

### OP25: Ingredient price changes in catalog. Event cost projection updates for all future events using that ingredient.

**Systems:** Price catalog, event costing, recipe cost, dashboard financial projections
**Scenario:** Butter was $4/lb. Price updated to $6/lb. Chef has 3 upcoming events using butter.
**PASS:** (a) All 3 event cost projections reflect $6/lb, not $4/lb, (b) recipe cost in recipe detail page updates, (c) dashboard financial projections use new price, (d) past events retain historical price (not retroactively updated).
**Why:** Ingredient prices change weekly. If projections use stale prices, the chef undercharges clients.

### OP26: Chef marks shopping list items as purchased, then guest count changes. Purchased quantities flagged as insufficient.

**Systems:** Shopping list, event editor, purchase tracking
**Scenario:** Chef bought 2 lbs butter (for 10 guests). Guest count changes to 20 (needs 4 lbs). Shopping list updates.
**PASS:** (a) Shopping list shows 4 lbs needed, 2 lbs purchased, 2 lbs still to buy, (b) purchased items are NOT cleared (the 2 lbs were actually bought), (c) deficit is clearly visible, (d) grocery list shows only the 2 lbs deficit.
**Why:** Clearing purchased status on a guest count change means the chef re-buys what they already have. Showing the deficit is the correct behavior.

---

## H. Admin and Multi-Tenant Edge Cases

Admin operations that cross tenant boundaries must be safe.

### OP27: Admin views Chef A's data, then navigates to Chef B. Zero data bleed between tenants.

**Systems:** Admin panel, tenant scoping, admin context switching
**Scenario:** Admin views Chef A's events, clients, financials. Clicks to Chef B's admin view.
**PASS:** (a) Chef B's view shows ONLY Chef B's data, (b) no Chef A event/client/financial visible, (c) browser back button to Chef A's page still shows Chef A's data (no cross-contamination from navigation cache).
**Why:** Admin context switching is the highest-risk multi-tenant operation. A single query without tenant scoping leaks production data.

### OP28: Admin impersonation ends cleanly. No chef-level actions persist under admin identity.

**Systems:** Admin impersonation, session management, audit trail
**Scenario:** Admin enters "view as Chef X" mode. Views data. Exits impersonation. Creates something in admin panel.
**PASS:** (a) Anything viewed during impersonation is attributed to admin (not Chef X), (b) exiting impersonation fully restores admin identity, (c) no "created_by" or "updated_by" fields contain Chef X's ID from the admin session, (d) audit trail clearly marks impersonation boundaries.
**Why:** Impersonation bugs are the most common source of data corruption in multi-tenant systems. Actions taken as admin must never accidentally modify the chef's data under the chef's identity.

---

## I. Remy Context Freshness (AI operating on stale data = hallucination)

Remy's value depends on accurate context. Stale context = wrong answers = worse than no AI.

### OP29: Chef updates event guest count. Remy asked 30 seconds later reports the NEW count.

**Systems:** Remy context loader, context cache, event editor
**Scenario:** Chef changes guest count from 10 to 25. Within 30 seconds, asks Remy "how many guests for the Saturday dinner?"
**PASS:** Remy says 25 (not 10). Context cache busted by the mutation.
**Why:** If Remy says 10 when the chef just changed it to 25, the chef loses trust in the AI and stops using it. Stale context is the #1 Remy trust killer.

### OP30: Chef cancels an event. Remy no longer counts it in "how many events this month?" or "what's my revenue this month?"

**Systems:** Remy context loader, event financial context, event status awareness
**Scenario:** 5 events this month, one cancelled. Chef asks Remy "how many events do I have this month?" and "what's my revenue this month?"
**PASS:** (a) Remy says 4 events (excludes cancelled), (b) revenue excludes the cancelled event's quoted price, (c) if cancellation fee was charged, Remy includes that in revenue.
**Why:** Remy reporting cancelled events as active gives the chef a false sense of workload. Wrong revenue figures lead to bad financial decisions.

### OP31: Client dietary restriction updated. Remy asked about allergies for that client's event gives current answer.

**Systems:** Remy context loader, client dietary data, context cache
**Scenario:** Client allergy updated from "none" to "shellfish". Chef asks Remy "any allergies for the Johnson dinner?"
**PASS:** Remy mentions shellfish. No stale "no known allergies" response.
**Why:** Remy is the chef's quick-reference tool. Wrong allergy data from Remy is a safety hazard.

---

## J. Calendar and Scheduling Truth

Calendar is the chef's daily view. It must be a perfect mirror of reality.

### OP32: Event rescheduled. Calendar shows new date only. Old date slot is empty.

**Systems:** Calendar, event editor, staff assignments, client portal
**Scenario:** Event moves from April 25 to April 27. Chef opens calendar.
**PASS:** (a) April 25 shows no event, (b) April 27 shows the event, (c) no ghost event on April 25, (d) iCal feed (if subscribed) reflects the change.
**Why:** A ghost event on the old date means the chef blocks out a day unnecessarily, potentially turning away new business.

### OP33: Three events in one day. Calendar shows all three with correct times and no overlap rendering bugs.

**Systems:** Calendar view, event time slots
**Scenario:** Chef has: brunch (9am-1pm), afternoon tea (2pm-4pm), dinner (6pm-10pm). All on the same day.
**PASS:** (a) All 3 events visible, (b) times accurate, (c) no visual overlap or truncation, (d) clicking each navigates to correct event.
**Why:** Multi-event days are the norm for busy chefs. If the calendar can't display them clearly, the chef misses transitions between events.

### OP34: iCal feed subscription reflects all event mutations (date change, cancellation, new event) within reasonable delay.

**Systems:** iCal feed route, event mutations, cache
**Scenario:** Chef subscribes to iCal feed in Google Calendar. Makes changes: new event, date change, cancellation.
**PASS:** (a) New event appears in Google Calendar on next sync, (b) date change reflected, (c) cancelled event removed, (d) no stale events persist.
**Why:** Many chefs use Google Calendar as their primary view. If the iCal feed is stale, they operate on wrong information.

---

## K. Edge Cases That Cause Data Corruption

Scenarios that should never corrupt data but are rarely tested.

### OP35: Rapid double-click on "Accept Proposal" button. Only one transition occurs.

**Systems:** Proposal acceptance, event FSM, ledger, notification pipeline
**Scenario:** Client double-clicks Accept. Two requests hit the server nearly simultaneously.
**PASS:** (a) Only one transition (proposed -> accepted), (b) one ledger entry (if deposit auto-charged), (c) one notification to chef, (d) second request returns success (idempotent) or conflict error, (e) no duplicate data anywhere.
**Why:** Double-click is the most common accidental user action. It must not double-charge, double-transition, or double-notify.

### OP36: Browser tab left open for 24 hours. Chef submits form with stale CSRF/session. Graceful error, no data loss.

**Systems:** Auth session, form submission, error handling
**Scenario:** Chef fills out event creation form, leaves for 24 hours, comes back and clicks Submit. Session may have expired.
**PASS:** (a) If session expired, redirect to login with form data preserved (or clear message), (b) no silent data loss, (c) no 500 error, (d) after re-auth, chef can re-submit.
**Why:** Chefs fill forms between cooking sessions. A 24-hour old tab is normal. Losing their input is unacceptable.

### OP37: Two chefs in the network both deep-copy the same shared recipe simultaneously. No data corruption.

**Systems:** Recipe sharing, deep copy, concurrent writes
**Scenario:** Chef A shares a recipe. Chef B and Chef C both accept the share at the same time. Deep copy runs for both.
**PASS:** (a) Both get independent copies, (b) no shared IDs, (c) no partial copies (one chef gets full recipe, other gets half), (d) original unchanged.
**Why:** Network recipe sharing must be safe under concurrency. A corrupted deep copy means a chef has a broken recipe they can't use.

---

## Summary: 37 Questions, 11 Domains

| Domain                       | Questions | What It Tests                               |
| ---------------------------- | --------- | ------------------------------------------- |
| A: Late-Stage Mutations      | OP1-OP5   | Data integrity when confirmed events change |
| B: Multi-Event Contention    | OP6-OP8   | Resource sharing across concurrent events   |
| C: Financial Edge Cases      | OP9-OP13  | Every branch of the money system            |
| D: Operational Recovery      | OP14-OP17 | Undo, correction, mistake handling          |
| E: Communication Reliability | OP18-OP20 | Notifications under rapid change            |
| F: Safety-Critical Data      | OP21-OP23 | Allergy/dietary mutation propagation        |
| G: Prep/Shopping Resilience  | OP24-OP26 | Operational tools under data mutation       |
| H: Admin Edge Cases          | OP27-OP28 | Multi-tenant safety                         |
| I: Remy Context Freshness    | OP29-OP31 | AI accuracy after mutations                 |
| J: Calendar Truth            | OP32-OP34 | Calendar reflects reality                   |
| K: Data Corruption Guards    | OP35-OP37 | Concurrency and stale state                 |

---

## How to Use This Question Set

1. **Each question is independently verifiable** via code trace, Playwright test, or manual test
2. **PASS/PARTIAL/FAIL verdicts** with cited evidence (file paths + line numbers)
3. **Gap prefix OP-G** for identified issues
4. **Priority order:** Domain A (late-stage mutations) and F (safety-critical) are highest leverage; they affect every chef on every event
5. **Fixes should be built during investigation**, not deferred

---

## Verdicts: Domains A, C, D, F, G (Investigated 2026-04-18)

### Domain A: Late-Stage Mutation Integrity

| Q   | Verdict     | Summary                                                                                                                                                                                                        | Gaps                                                                                                                                                                                                                                      |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP1 | **PARTIAL** | `requestGuestCountChange()` updates `events.guest_count` and adjusts pricing for confirmed events. Shopping/grocery/costing query DB live.                                                                     | OP-G1: Remy cache not busted. OP-G2: Shopping list reads `menus.target_guest_count` (not updated). OP-G3: Missing `/dashboard`, `/calendar`, `/my-events` revalidation.                                                                   |
| OP2 | **PARTIAL** | Menu attach/detach revalidates paths + busts Remy cache (SC-G2 fix verified). Grocery list generated on-demand from live DB, so next access reflects new menu.                                                 | OP-G4: No auto-regeneration or staleness signal for existing grocery list views after menu swap.                                                                                                                                          |
| OP3 | **PARTIAL** | `updateEvent()` blocks all changes on confirmed events (only draft/proposed). Date change revalidates calendar (SC-G5 fix). Prep timeline recomputes from new date.                                            | OP-G5: No staff conflict re-evaluation on date change. OP-G6: No client notification on date change (only collaborator chefs notified). OP-G7: Date changes blocked entirely on confirmed events; no dedicated date-change action exists. |
| OP4 | **PASS**    | Full 5-hop propagation: allergy sync -> dietary change log -> retroactive menu recheck -> event propagation -> Remy cache bust. Grocery list shows allergen warnings from both client record and event record. | None                                                                                                                                                                                                                                      |
| OP5 | **PASS**    | Cancellation RPC only touches status fields. Expenses table untouched. Financial summary view includes cancelled events. Post-cancellation notifies chef of sunk costs and surplus ingredients.                | None                                                                                                                                                                                                                                      |

### Domain C: Financial Edge Cases

| Q    | Verdict     | Summary                                                                                                                                                | Gaps                                                                                                                 |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| OP9  | **PASS**    | Deposit-first flow in `checkout.ts:51-67`. Separate ledger entries for deposit and balance. DB view sums all entries. Client portal shows balance due. | None                                                                                                                 |
| OP10 | **PASS**    | Multiple expenses link to one event via `event_id`. DB view sums `SUM(amount_cents)`. CPA export has per-expense granularity.                          | None                                                                                                                 |
| OP11 | **PARTIAL** | Tip request system and close-out wizard create ledger entries with `entry_type: 'tip'`. Quick-add `addTip()` writes only to `event_tips` table.        | OP-G11: `addTip()` does not create ledger entry. Tips via this path invisible to financial summary, P&L, CPA export. |
| OP12 | **PASS**    | `createStripeRefund()` supports partial. Webhook creates negative ledger entry. DB view handles negatives. Outstanding balance recalculated.           | None                                                                                                                 |
| OP13 | **PARTIAL** | $0 events can exist. Expenses attach freely. Profit goes negative correctly.                                                                           | OP-G13: `food_cost_percentage` and `profit_margin` show 0% instead of meaningful value for zero-revenue events.      |

### Domain D: Operational Recovery

| Q    | Verdict  | Summary                                                                                                                                                                                         | Gaps                                                                                                     |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| OP14 | **FAIL** | FSM: `completed: []` is terminal. No transitions allowed. Completion triggers irreversible side effects (loyalty, emails, inventory deductions, surveys, follow-up sequences, circle archival). | OP-G14: No revert from completed. No grace window. Accidental completion is permanent with no undo path. |
| OP15 | **PASS** | Ledger truly immutable (DB triggers prevent UPDATE/DELETE). `createAdjustment()` supports negative corrections. Append-only correction: reverse + re-enter.                                     | None                                                                                                     |
| OP16 | **PASS** | `deleteRecipe()` guards against active event links (SQL check for non-completed/cancelled events). Throws error with clear message. Force flag not exposed in UI.                               | None                                                                                                     |
| OP17 | **PASS** | `reviseQuote()` creates versioned copy (v2, v3...). Original marked `is_superseded`. Version history tracked via `previous_version_id`. Price syncs to event.                                   | None                                                                                                     |

### Domain F: Safety-Critical Data

| Q    | Verdict     | Summary                                                                                                                                               | Gaps                                                                                                                                                                                                                                                 |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP21 | **PARTIAL** | Full propagation chain exists (allergy sync, menu recheck, event propagation, Remy bust). Staff briefing reads live from client join.                 | OP-G21a: Propagation to events is non-blocking (no retry on failure). OP-G21b: `syncFlatToStructured` non-blocking. OP-G21c: `recheckUpcomingMenusForClient` non-blocking. OP-G21d: No `revalidatePath` for affected event pages during propagation. |
| OP22 | **PARTIAL** | Dietary conflict detector checks guest-diet-vs-menu, not guest-vs-guest. Remy can surface menu-level conflicts via `event.dietary_conflicts` command. | OP-G22a: No inter-guest conflict detection (vegan + keto not flagged). OP-G22b: No automatic conflict scan on guest RSVP submission.                                                                                                                 |
| OP23 | **PARTIAL** | Removal propagates to events and busts Remy cache. But `syncFlatToStructured` never deletes records from `client_allergy_records`.                    | OP-G23a: Removed allergens persist in `client_allergy_records`; menu-recheck reads stale data. OP-G23b: Change type always logged as `allergy_added` even for removals.                                                                              |

### Domain G: Prep/Shopping Resilience

| Q    | Verdict     | Summary                                                                                                                                                                    | Gaps                                                                                                                                                                               |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP24 | **PASS**    | Recipe yield queried live from DB at generation time. Shopping lists generated on-demand. `updateRecipe` revalidates `/culinary`.                                          | None                                                                                                                                                                               |
| OP25 | **PARTIAL** | Projected cost uses current ingredient prices (live query). Actual cost uses expenses (frozen).                                                                            | OP-G25: No price snapshot at event confirmation. Past event projected cost changes with current prices.                                                                            |
| OP26 | **FAIL**    | Purchase tracking is boolean-only (`is_checked`). No `purchased_quantity`. Guest count change does not trigger shopping list update. Check-off state lost on regeneration. | OP-G26a: No purchased quantity tracking. OP-G26b: Guest count change doesn't touch shopping lists. OP-G26c: No deficit calculation. OP-G26d: Check-off state lost on regeneration. |

### Domain B: Multi-Event Resource Contention

| Q   | Verdict     | Summary                                                                                                                                                                                                          | Gaps                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP6 | **PARTIAL** | `generateShoppingList()` correctly aggregates across multiple events in date range (sums quantities with unit conversion). Consolidated grocery PDF has `eventBreakdown` per item.                               | OP-G6A: Interactive shopping list UI shows no per-event breakdown (only `eventCount`). OP-G6B: Purchase orders link to at most one `eventId`; multi-event purchases have no per-event attribution. OP-G6C: `shopping_lists` table has single `event_id` FK, not a junction table.                                                                                                         |
| OP7 | **PARTIAL** | `checkAssignmentConflict()` detects same-day assignments and blocks them. DB unique constraint prevents duplicate same-event assignment.                                                                         | OP-G7A: Conflict check blocks ALL same-day assignments, not just time-overlapping ones (no `start_time`/`end_time` on `event_staff_assignments`). OP-G7B: `staff_schedules` table (which HAS time fields) performs zero conflict detection on `createShift`. OP-G7C: Two scheduling systems (`event_staff_assignments` and `staff_schedules`) are disconnected; neither checks the other. |
| OP8 | **PARTIAL** | Shopping list query filters `status IN ('confirmed','accepted','paid')`, so cancelled events excluded on regeneration. Cancellation cleans up prep_blocks and travel_legs. Surplus ingredient notification sent. | OP-G8A: Shopping list requires manual regeneration after cancellation; no reactive push. OP-G8B: Staff assignments (`event_staff_assignments`) not cleaned on cancellation (event not deleted, only status changed). OP-G8C: Persisted `shopping_lists` JSONB items not updated when linked event is cancelled.                                                                           |

### Domain E: Communication Reliability

| Q    | Verdict     | Summary                                                                                                                                                                           | Gaps                                                                                                                                                                                                                                                                                                                                |
| ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP18 | **PARTIAL** | `updateEvent()` does not send client-facing emails on field changes (only on status transitions). In-app notification dedup guard exists (60s window). Client portal revalidated. | OP-G18a: No email-level dedup or batching mechanism exists. OP-G18b: No "event details changed" notification sent to client; client must visit portal to discover changes.                                                                                                                                                          |
| OP19 | **PARTIAL** | `sendEmail()` is non-blocking, returns false on failure. Dead letter queue exists. Circuit breaker on Resend with developer alerts.                                               | OP-G19a: Chef receives no warning when email to client fails; no in-app notification created. OP-G19b: Email retry cron cannot re-render React templates (acknowledged in code comment); retry is observability-only. OP-G19c: No chef-facing UI surfaces delivery failures (`notification_delivery_log` never read by chef pages). |
| OP20 | **PASS**    | All email templates link to live portal pages (no snapshot). `getClientEventById`, `getPublicProposal`, `getClientQuoteById` all query DB live. No caching layer.                 | OP-G20a (minor): Email body embeds point-in-time price/date, but CTA button always links to current data.                                                                                                                                                                                                                           |

### Domain H: Admin and Multi-Tenant Edge Cases

| Q    | Verdict     | Summary                                                                                                                                                                                                                                 | Gaps                                                                                                                            |
| ---- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OP27 | **PASS**    | Admin pages derive `chefId` from URL params, not session. Every query scoped to `params.chefId`. No ambient state, no client-side chef context, no localStorage. Each navigation is a fresh server render.                              | None (data integrity). OP-G27 (audit): `admin_viewed_chef` action type defined but never invoked; admin read access not logged. |
| OP28 | **PARTIAL** | No traditional impersonation. "Admin Preview" mode only affects UI-level admin checks on admin's own chef view. All mutations correctly attributed to admin identity via `logAdminAction()`. Exit: cookie delete + layout revalidation. | OP-G27: Admin read access to per-chef detail pages not audit-logged. OP-G28: Admin preview mode toggles not audit-logged.       |

### Domain I: Remy Context Freshness

| Q    | Verdict  | Summary                                                                                                                                                                                                                         | Gaps |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| OP29 | **PASS** | `requestGuestCountChange()` and `updateEvent()` both call `invalidateRemyContextCache()`. Tier 1 counts always fresh (no cache). Tier 2 busted. Tier 3 live DB query.                                                           | None |
| OP30 | **PASS** | `transitionEvent()` calls `invalidateRemyContextCache()` on any status change. Tier 1 and Tier 2 queries exclude cancelled events via `.not('status', 'in', ...)`. Revenue is ledger-based, correct.                            | None |
| OP31 | **PASS** | `updateClient()` calls `invalidateRemyContextCache()`. `clientVibeNotes` query includes `dietary_restrictions` and `allergies`. Tier 3 page entity uses live join. Updated client bubbles to top of `ORDER BY updated_at DESC`. | None |

### Domain J: Calendar and Scheduling Truth

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                 | Gaps                                                                                                                                                                                                    |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP32 | **PASS**    | Calendar queries `event_date` live from DB (no `unstable_cache`). Cancelled events excluded via `.not('status','eq','cancelled')`. `updateEvent` and `rescheduleEvent` both call `revalidatePath('/calendar')`. Prep blocks shift with event. No ghost events possible. | None                                                                                                                                                                                                    |
| OP33 | **PARTIAL** | FullCalendar handles multi-event days natively. `dayMaxEvents={4}` in month view (3 events visible). Week/day time grid renders side-by-side. Event click navigates to correct detail page.                                                                             | OP-G33a: Standalone day view (`day-view-client.tsx`) stacks same-slot events vertically instead of side-by-side. Minor (main calendar handles it correctly). OP-G33b: No automated visual overlap test. |
| OP34 | **PARTIAL** | iCal feed queries live DB, excludes cancelled events, reflects date changes. HTTP `Cache-Control: private, max-age=300`. No server-side cache.                                                                                                                          | OP-G34a: VEVENT entries lack `SEQUENCE` property (RFC 5545); some calendar clients may not detect rescheduled events. OP-G34b: VEVENT entries lack `LAST-MODIFIED` property.                            |

### Domain K: Data Corruption Guards

| Q    | Verdict     | Summary                                                                                                                                                                                                                                                                                                                    | Gaps                                                                                                                                                                                                                       |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OP35 | **PASS**    | Triple protection: (1) UI `disabled={loading}` + ConfirmModal, (2) app-layer `if (fromStatus === toStatus) return`, (3) DB CAS guard `WHERE status = p_from_status` + `pg_advisory_xact_lock`. Post-transition race detection skips side effects on loss. Ledger dedup via unique `transaction_reference` + `23505` catch. | None                                                                                                                                                                                                                       |
| OP36 | **PARTIAL** | JWT `maxAge: 7 days`, so 24-hour tab is within session lifetime. `requireChef()` redirects to `/auth/signin` with message on expired session (no 500). Middleware preserves path via `redirect` query param.                                                                                                               | OP-G36a: No client-side form draft persistence (sessionStorage/localStorage); form data lost on session expiry redirect. OP-G36b: No automatic re-submission after re-auth; user must re-enter.                            |
| OP37 | **PARTIAL** | `deepCopyRecipe` creates independent copy with new UUID in target tenant. Original recipe read-only (SELECT only). Each chef gets separate copy.                                                                                                                                                                           | OP-G37a: `deepCopyRecipe` not wrapped in DB transaction; mid-copy failure leaves partial recipe. OP-G37b: Ingredient find-or-create has TOCTOU race; concurrent copies to same tenant can duplicate or violate constraint. |

---

## All Gaps

| Gap     | Severity | Issue                                                                                                           | Status                                                            |
| ------- | -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| OP-G1   | Fixed    | `requestGuestCountChange()` missing `invalidateRemyContextCache()`                                              | Fixed in `lib/guests/count-changes.ts`                            |
| OP-G2   | Medium   | Shopping list reads `menus.target_guest_count` not `events.guest_count`; not updated on late-stage count change | Open                                                              |
| OP-G3   | Fixed    | `requestGuestCountChange()` missing `/dashboard`, `/calendar`, `/my-events` revalidation                        | Fixed in `lib/guests/count-changes.ts`                            |
| OP-G4   | Low      | No auto-regeneration or staleness signal for grocery list after menu swap                                       | Open                                                              |
| OP-G5   | Low      | No staff conflict re-evaluation when event date changes                                                         | Open                                                              |
| OP-G6   | Medium   | No client notification when event date changes (only collaborator chefs)                                        | Open                                                              |
| OP-G6A  | Low      | Interactive shopping list UI shows no per-event quantity breakdown                                              | Open                                                              |
| OP-G6B  | Medium   | Multi-event purchases have no per-event cost attribution                                                        | Open                                                              |
| OP-G6C  | Low      | `shopping_lists` table single `event_id` FK; cannot formally span multiple events                               | Open                                                              |
| OP-G7   | High     | Date changes blocked entirely on confirmed events; no dedicated action                                          | Open                                                              |
| OP-G7A  | Fixed    | `checkAssignmentConflict` blocks ALL same-day assignments, not just time-overlapping                            | Fixed in `lib/staff/actions.ts` + `lib/staff/staffing-actions.ts` |
| OP-G7B  | Medium   | `staff_schedules` system performs zero conflict detection on `createShift`                                      | Open                                                              |
| OP-G7C  | Low      | Two scheduling systems disconnected; neither checks the other                                                   | Open                                                              |
| OP-G8A  | Low      | Shopping list no reactive update on cancellation; requires manual regeneration                                  | Open                                                              |
| OP-G8B  | Fixed    | Staff assignments not cleaned up on event cancellation (status change, not delete)                              | Fixed in `lib/events/transitions.ts`                              |
| OP-G8C  | Low      | Persisted `shopping_lists` JSONB items not updated on cancellation                                              | Open                                                              |
| OP-G11  | Fixed    | `addTip()` writes to `event_tips` only, not ledger. Tips invisible to financial summary                         | Fixed in `lib/finance/tip-actions.ts`                             |
| OP-G13  | Low      | Food cost % and profit margin show 0% for zero-revenue events                                                   | Open                                                              |
| OP-G14  | High     | No revert from `completed` state. Accidental completion irreversible. No grace window                           | Open                                                              |
| OP-G18a | Low      | No email-level dedup or batching mechanism                                                                      | Open                                                              |
| OP-G18b | Medium   | No "event details changed" notification to client; portal-only discovery                                        | Open                                                              |
| OP-G19a | Medium   | Chef not alerted when email to client fails; no in-app notification                                             | Open                                                              |
| OP-G19b | Medium   | Email retry cron cannot re-render React templates; observability-only                                           | Open                                                              |
| OP-G19c | Low      | No chef-facing UI for email delivery failures                                                                   | Open                                                              |
| OP-G20a | Low      | Email body embeds point-in-time price/date (cosmetic; CTA links to live data)                                   | Open                                                              |
| OP-G21a | Low      | Allergy propagation to events is non-blocking with no retry                                                     | Open                                                              |
| OP-G21d | Fixed    | No event page revalidation during allergy propagation                                                           | Fixed in `lib/clients/actions.ts`                                 |
| OP-G22a | Medium   | No inter-guest dietary conflict detection (vegan + keto not flagged)                                            | Open                                                              |
| OP-G22b | Low      | No automatic conflict scan on guest RSVP submission                                                             | Open                                                              |
| OP-G23a | Fixed    | Removed allergens persist in `client_allergy_records`; menu-recheck reads stale data                            | Fixed in `lib/dietary/allergy-sync.ts`                            |
| OP-G23b | Fixed    | Dietary change type always logged as `allergy_added` even for removals                                          | Fixed in `lib/clients/actions.ts`                                 |
| OP-G25  | Low      | No price snapshot at event confirmation; past projected costs shift with current prices                         | Open                                                              |
| OP-G26a | High     | No purchased quantity tracking (boolean only)                                                                   | Open                                                              |
| OP-G26b | Medium   | Guest count change doesn't trigger shopping list update or revalidation                                         | Open                                                              |
| OP-G26c | Medium   | No deficit calculation comparing purchased vs needed                                                            | Open                                                              |
| OP-G26d | Medium   | Check-off state lost when shopping list regenerates                                                             | Open                                                              |
| OP-G27  | Fixed    | `admin_viewed_chef` audit action defined but never invoked; admin reads not logged                              | Fixed in `app/(admin)/admin/users/[chefId]/page.tsx`              |
| OP-G28  | Fixed    | Admin preview mode toggles not audit-logged                                                                     | Fixed in `lib/auth/admin-preview-actions.ts`                      |
| OP-G33a | Low      | Standalone day view stacks same-slot events vertically instead of side-by-side                                  | Open                                                              |
| OP-G33b | Low      | No automated visual overlap test for multi-event day rendering                                                  | Open                                                              |
| OP-G34a | Fixed    | iCal VEVENT entries lack `SEQUENCE` property (RFC 5545); calendar clients may miss rescheduled events           | Fixed in `app/api/feeds/calendar/[token]/route.ts`                |
| OP-G34b | Fixed    | iCal VEVENT entries lack `LAST-MODIFIED` property                                                               | Fixed in `app/api/feeds/calendar/[token]/route.ts`                |
| OP-G36a | Low      | No client-side form draft persistence; form data lost on session expiry redirect                                | Open                                                              |
| OP-G36b | Low      | No automatic re-submission after re-auth                                                                        | Open                                                              |
| OP-G37a | Fixed    | `deepCopyRecipe` not wrapped in DB transaction; mid-copy failure leaves partial recipe                          | Fixed in `lib/collaboration/actions.ts` (cleanup on failure)      |
| OP-G37b | Low      | Ingredient find-or-create TOCTOU race on concurrent deep copies to same tenant                                  | Open                                                              |

---

## Scorecard (All Domains)

| Domain                       | Questions | PASS   | PARTIAL | FAIL  | Score   |
| ---------------------------- | --------- | ------ | ------- | ----- | ------- |
| A: Late-Stage Mutations      | 5         | 2      | 3       | 0     | 70%     |
| B: Multi-Event Contention    | 3         | 0      | 3       | 0     | 50%     |
| C: Financial Edge Cases      | 5         | 3      | 2       | 0     | 80%     |
| D: Operational Recovery      | 4         | 3      | 0       | 1     | 75%     |
| E: Communication Reliability | 3         | 1      | 2       | 0     | 67%     |
| F: Safety-Critical Data      | 3         | 0      | 3       | 0     | 50%     |
| G: Prep/Shopping Resilience  | 3         | 1      | 1       | 1     | 50%     |
| H: Admin Edge Cases          | 2         | 1      | 1       | 0     | 75%     |
| I: Remy Context Freshness    | 3         | 3      | 0       | 0     | 100%    |
| J: Calendar Truth            | 3         | 1      | 2       | 0     | 67%     |
| K: Data Corruption Guards    | 3         | 1      | 2       | 0     | 67%     |
| **TOTAL**                    | **37**    | **16** | **19**  | **2** | **69%** |

**37 of 37 investigated. 16 PASS, 19 PARTIAL, 2 FAIL. 46 gaps identified (13 fixed during audit). Highest-leverage open gaps: OP-G7 (date changes blocked on confirmed), OP-G14 (no revert from completed), OP-G26a (no purchased quantity tracking). Strongest domains: I (Remy, 100%), C (Financial, 80%). Weakest: B (Multi-Event, 50%), F (Safety-Critical, 50%), G (Prep/Shopping, 50%).**
