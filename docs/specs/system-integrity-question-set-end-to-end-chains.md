# System Integrity Question Set: End-to-End Data Chains

> **Purpose:** Every prior question set tested WITHIN domains (75Q core, 128Q prep, 83Q network, 70Q financials, 82Q circles, 130Q full-cohesion) or across 2-3 boundaries (31Q cross-system). Real failures happen across 5-6 hop chains where no single domain owner catches the break. This set traces data from ORIGIN to FINAL CONSUMER across every system it touches. A chain PASSES only if the data arrives intact, current, and actionable at the end.
>
> **What makes this different:** Prior sets ask "does system X work?" This set asks "when data enters at point A, does it arrive correctly at points B, C, D, E, and F?" One broken hop = entire chain FAIL.
>
> **6 known chain breaks** (identified pre-investigation):
>
> 1. Price catalog -> recipe cost -> event profit chain (projectedFoodCostCents hardcoded null)
> 2. Client dietary info copied at inquiry conversion, never updated on existing events
> 3. Event date change doesn't cascade to reminders, calendar sync, staff tokens
> 4. Inquiry conversion loses source_message, channel, notes, service_style, unknown_fields
> 5. Commerce recordPayment only revalidates /commerce, not /events or /dashboard
> 6. Recipe change doesn't revalidate shopping list page path
>
> **Scoring:** Each chain question gets PASS (data flows unbroken from origin to all consumers), PARTIAL (data reaches some consumers but not all), FAIL (chain is broken at one or more hops), or N/A. Every answer MUST trace the full hop path with `file:line` citations at each hop.

---

## Chain 1: Money Chain (Price -> Cost -> Profit -> Tax -> Export)

> A price enters the system. It must flow through recipe costing, event budgeting, profit calculation, tax reporting, and financial export without drift, loss, or staleness.

**EC1. When an ingredient price is updated in the price catalog, does the recipe food cost recalculate, the event projected cost update, the profit margin adjust, and the dashboard financial summary reflect the change?**
Hop path: `price_catalog.price_per_unit` -> `recipe_ingredients` cost calc -> `event_financial_summary.food_cost_cents` -> `event_financial_summary.profit_cents` -> `getTenantFinancialSummary()` -> dashboard widget.
Known break: `projectedFoodCostCents` is hardcoded null in `financial-summary-actions.ts`. Does this mean the entire downstream chain is dead?

**EC2. When a chef records a payment from a client, does the payment flow through: ledger entry creation -> event balance update -> client spending page -> dashboard revenue widget -> CPA export -> daily report email?**
Hop path: `recordPayment()` -> `ledger_entries` INSERT -> `event_financial_summary` view recalc -> `getClientSpendingSummary()` -> `getTenantFinancialSummary()` -> `exportCPAPackage()` -> daily report template.
Known break: `recordPayment` only calls `revalidatePath('/commerce')`. Does the event detail page, dashboard, and client portal show stale payment data?

**EC3. When a chef adds an expense to an event (ingredient purchase, equipment rental, venue fee), does the expense reduce: the event profit, the monthly P&L, the tax-year summary, the CPA export, and the event completion contract's financial readiness check?**
Hop path: `createExpense()` -> `expenses` table -> `event_financial_summary` view -> `getTenantFinancialSummary()` -> `evaluateCompletion('event', eventId)` -> tax center -> CPA export.

**EC4. When a recipe ingredient quantity changes (chef adjusts from 2 cups to 3 cups of cream), does the change cascade to: recipe food cost -> all events using that recipe (menu dish cost) -> shopping list quantities -> event profit projections?**
Hop path: `updateIngredient()` -> `recipe_ingredients` row update -> `getRecipeFoodCost()` recalc -> `getMenuCostSummary()` -> `generateShoppingList()` -> `event_financial_summary`.
This is the most common chef action. If the chain breaks, every cost number in the app is wrong.

**EC5. When a subcontractor or co-host submits costs for their portion of a shared event, do those costs appear in: the primary chef's event total cost, the profit calculation, the client's invoice, and the CPA export?**
Hop path: `event_collaborators.cost_cents` or `getSubcontractCosts()` -> `event_financial_summary` aggregation -> invoice generation -> CPA export.
Tests whether multi-party financials are integrated, not siloed.

---

## Chain 2: Dietary Safety Chain (Client Input -> Every Operational Surface)

> Dietary restrictions and allergies are life-safety data. If a client says "peanut allergy" and any downstream system fails to display it, someone could die. Every hop must be verified.

**EC6. When a client enters dietary restrictions during portal onboarding, does that data reach: the event dietary summary, the recipe allergen flags, the shopping list allergen markers, the prep timeline allergen notes, the staff briefing sheet, Remy's context, and the kiosk order register?**
Hop path: `client_onboarding` form -> `clients.dietary_restrictions` + `clients.allergies` -> `getDietaryConflicts()` -> recipe ingredient allergen cross-ref -> shopping list annotations -> prep timeline markers -> `generateStaffBriefing()` -> `remy-context.ts` -> kiosk catalog flags.
This is a 9-hop chain. Even one broken hop is a safety failure.

**EC7. When a client UPDATES their dietary restrictions (adds a new allergy after initial booking), does the update propagate to all existing events for that client, not just future events?**
Known break: dietary info is copied at inquiry conversion. If the client updates their profile after booking, existing events may still have stale dietary data. Does `updateClientProfile()` trigger a re-evaluation of all active events for that client?

**EC8. When a handoff or contact share transfers client data to another chef, do dietary restrictions and allergies survive the transfer intact?**
Hop path: Chef A's `clients.dietary_restrictions` -> `createNetworkContactShare()` -> share acceptance -> Chef B's new `clients` record.
Does the dietary data make it through `client_context` in the share, or is only name/email/phone transferred?

**EC9. When Remy drafts a menu suggestion or answers a question about a client's event, does Remy have the client's dietary restrictions in context, and does it flag conflicts between the proposed menu and the client's restrictions?**
Tests whether the AI has safety-critical data and uses it proactively, not just when asked.

**EC10. When the consolidated shopping list merges ingredients across multiple events, and one event has a guest with a nut allergy, does the shopping list flag ALL nut-containing ingredients across ALL events on that list, or only the specific event's items?**
Cross-contamination scenario: shared kitchen, consolidated shopping. Allergen flags must be global when events share prep time/space.

---

## Chain 3: Time Cascade Chain (Date Change -> Every Downstream System)

> When an event date changes, every time-dependent system must update. Missing one means the chef prepares on the wrong day, sends reminders at the wrong time, or shows up at the wrong place.

**EC11. When a chef changes an event date, does the change cascade to: prep timeline recalculation, prep block rescheduling, reminder emails (1-week, 3-day, day-of), calendar sync, staff assignment notifications, shopping list deadlines, and collaborator notifications?**
Known break: `updateEvent()` only calls `revalidatePath`. No downstream cascade to prep blocks, reminders, calendar entries, or staff tokens.
Hop path: `updateEvent()` -> `events.event_date` -> `computeTimeline()` recalc? -> `scheduled_reminders` reschedule? -> `calendar_events` update? -> `staff_assignments` notification? -> collaborator SSE?

**EC12. When a prep block has a computed start time based on "event date minus X hours" (reverse timeline), and the event date moves forward by 2 days, do all prep blocks shift forward automatically?**
The prep timeline engine computes start times relative to event date. If event date changes but prep blocks don't recompute, the chef preps on the wrong day.

**EC13. When event_date changes AND the event has a co-host (collaborator), does the co-host's calendar, prep blocks, and reminder schedule also update?**
Cross-tenant cascade. Chef A changes the date. Chef B (co-host) needs to see the new date on their calendar, their prep blocks need to shift, and their reminder emails need to reschedule. Does this happen?

**EC14. When an event is cancelled (status -> cancelled), do all scheduled emails (reminders, follow-ups, review requests) for that event get cancelled, or do they fire into the void?**
The lifecycle cron (`api/scheduled/lifecycle/route.ts`) sends reminders based on event_date proximity. Does it check `event.status !== 'cancelled'` before sending?

**EC15. When a chef reschedules an event to a date that conflicts with another event, does any surface warn about the double-booking before confirming the change?**
The scheduling system knows about events. The event edit form may not check for conflicts. If no warning fires, the chef discovers the double-booking on event day.

---

## Chain 4: Inquiry-to-Completion Pipeline (First Contact -> Final Payment)

> The full lifecycle of a client engagement. Every stage must hand off cleanly to the next. Data lost at any stage means the chef asks the client to repeat themselves, or worse, delivers the wrong service.

**EC16. When a public inquiry arrives (web form on chef profile), trace the complete data path: inquiry record creation -> chef notification (email + SSE + push) -> inquiry detail page -> "Convert to Event" -> event record with all inquiry data preserved -> proposal generation -> client approval -> payment -> event execution.**
Known break: `convertInquiryToEvent` loses `source_message`, `channel`, `notes`, `service_style`, `unknown_fields`. The chef's first contact context vanishes.

**EC17. When an inquiry arrives via email (Gmail sync) and the chef converts it to an event, does the email thread ID, sender address, and original message body persist on the event record for future reference?**
Email-originated inquiries have richer context than form submissions. Does the conversion preserve the email thread link so the chef can reference original client correspondence?

**EC18. When an inquiry is converted to an event AND a client record is auto-created, does the client record include: name, email, phone, dietary restrictions, guest count, budget, preferred cuisine, and the inquiry source (web form, email, kiosk, referral)?**
All of this data exists on the inquiry. If the client record is created with just name + email, the chef re-enters everything.

**EC19. After the event is complete and the chef creates an After Action Report (AAR), does the AAR have access to: the original inquiry data, all client communications, the final menu, actual costs vs quoted costs, and any dietary incidents?**
The AAR is the retrospective. If it can't reference the full history, the chef loses institutional knowledge.

**EC20. When a client completes payment (final balance = $0), does the event automatically transition to the correct FSM state, the client receive a confirmation email, the chef's revenue dashboard update, and the completion contract reflect "paid" status?**
Four systems respond to full payment: FSM transition, email, financials, completion contract. If any lag or miss, the chef's state of the world is wrong.

---

## Chain 5: Recipe-to-Plate Chain (Recipe Entry -> Operational Execution)

> A recipe is entered once but consumed by 10+ systems. If any system reads stale or partial recipe data, the chef's operational reality diverges from what the app shows.

**EC21. When a chef creates a recipe with 12 ingredients, 6 steps, photos, peak windows, and yield data, which of these survive into: menu display, shopping list, cost calculation, prep timeline, staff briefing, client-facing menu, and the public chef profile?**
Not all recipe fields are consumed by all systems. Map exactly which fields each consumer reads. Identify fields that are stored but never consumed (dead data).

**EC22. When a chef modifies a recipe (adds an ingredient, changes a step, updates yield), does the change propagate to: the shopping list for upcoming events using this recipe, the event cost calculation, the prep timeline steps, and the client-facing menu description?**
Known break: recipe changes don't `revalidatePath` the shopping list page. The shopping list shows stale quantities until the chef explicitly regenerates.

**EC23. When a recipe is added to a menu and the menu is assigned to an event, is the cost chain: recipe ingredients -> catalog price lookup -> recipe food cost -> menu cost -> event food cost -> event profit margin all live-computed, or are any intermediate values cached/stale?**
Each hop in the cost chain could be live-computed or cached. If menu cost is cached and recipe ingredients change, the menu cost is stale.

**EC24. When a shared recipe (from another chef) is used in an event, does the deep copy include: all ingredients with quantities and units, all steps with photos, peak window settings, yield data, and allergen flags? Or does the copy lose data?**
Known partial: `deepCopyRecipe` may miss step photos, sub-recipes, and peak windows. The receiving chef's event operates on an incomplete recipe.

**EC25. When a recipe has peak windows (hold time, safety ceiling) and is assigned to an event with a specific service time, does the prep timeline reverse-calculate the start time correctly, and does the prep push system warn when the chef is behind schedule?**
Peak windows are quality/safety data. If the prep timeline ignores them, food quality degrades or safety ceilings are breached. The chain: `recipe.peak_windows` -> `computeTimeline()` reverse calc -> `prep_block.start_time` -> prep push notification.

---

## Chain 6: Notification Guarantee Chain (Mutation -> Every Stakeholder Notified)

> When something changes, everyone who needs to know MUST be notified. Missing a notification means someone operates on stale information.

**EC26. When an event transitions from "proposed" to "accepted" (client accepts proposal), who gets notified? Verify: chef (email + SSE + push), all collaborators (email), all assigned staff (email or push), and the client (confirmation email). Trace each notification path.**
The event FSM transition is the trigger. `lib/events/transitions.ts` handles the state change. Does it fire notifications to ALL four stakeholder groups?

**EC27. When a chef modifies a menu for an event that has a co-host, does the co-host receive a notification about the menu change?**
Menu changes affect the co-host's prep, shopping, and planning. If they're not notified, they show up with the wrong ingredients.

**EC28. When a client sends a message via the portal chat, does the chef see it in real-time (SSE), get an email notification (if offline), get a push notification (if mobile), AND does the unread count on the dashboard update?**
Four notification channels for one message. If SSE is working but email fails, the chef misses messages when away from the app.

**EC29. When a cron job detects an overdue invoice (payment past due), does it: create a notification for the chef, optionally send a reminder to the client, update the event's financial status indicator, and flag the event in the dashboard?**
Overdue invoices are a cash flow issue. If the cron detects it but only logs a row without notifying, the chef doesn't follow up.

**EC30. When the AI runtime (Ollama) goes offline, does the developer alert fire, the Remy chat surface show a graceful error, and all AI-dependent features (brain dump, recipe parsing, email drafting) fail with clear messages instead of silent zeros?**
The `OllamaOfflineError` class exists. Is it caught and surfaced correctly at every AI entry point? Or do some entry points catch it and return empty results that look like "no data" rather than "AI unavailable"?

---

## Chain 7: Cache Consistency Chain (Mutation -> Every Cache Busted)

> Every mutation must bust every cache that reads the mutated data. Missing one cache = stale UI somewhere.

**EC31. Map every `revalidatePath` and `revalidateTag` call in the codebase. For each mutation that writes to the DB, does it bust ALL caches that could serve the written data?**
Known breaks: `recordPayment` only revalidates `/commerce`. Recipe changes don't revalidate shopping list. What other mutations have incomplete cache busting?

**EC32. When `unstable_cache` is used with a tag, and the underlying data changes, is `revalidateTag` called with the correct tag? List every `unstable_cache` usage and its corresponding invalidation point.**
`revalidatePath` does NOT bust `unstable_cache`. Only `revalidateTag` does. If any cached function uses `unstable_cache` but its mutation only calls `revalidatePath`, the cache is permanently stale until TTL expires.

**EC33. When a chef has the app open in two browser tabs, and makes a change in tab A, does tab B reflect the change without a manual refresh?**
SSE broadcast should push updates. But do all mutations call `broadcast()` after writing? If some mutations skip the broadcast, tab B is stale.

**EC34. When the client portal displays event data that the chef just modified (menu change, date change, status change), how long before the client sees the update? Is it instant (SSE), delayed (cache TTL), or manual (client must refresh)?**
Cross-portal cache consistency. Chef acts, client sees. What's the actual delay?

**EC35. When an event is deleted or cancelled, do all cached views (dashboard widgets, calendar, search results, analytics summaries, daily report) stop showing it? Or does it ghost in cached aggregations until the cache expires?**
Deletion must propagate to ALL cached surfaces. One missed cache = phantom event showing in a dashboard widget.

---

## Chain 8: Client Experience Chain (Client's Full Journey Without Dead Ends)

> The client interacts with 5+ surfaces: emails, portal, proposal pages, payment pages, chat. The journey must be seamless. One dead end = the chef looks unprofessional.

**EC36. Trace a client's complete journey from receiving the first email to leaving a post-event review. At each step, can the client proceed to the next step without hitting a dead end, login wall, or confusing navigation?**
Steps: invitation email -> portal setup -> event detail -> proposal review -> menu approval -> contract signing -> payment -> event day countdown -> post-event feedback -> review submission.

**EC37. When a client receives a proposal email and clicks "View Proposal," does the link work regardless of whether the client has a portal account? Does the proposal page provide a path to create an account if they don't have one?**
Token-gated pages and authenticated portal pages serve different audiences. The client shouldn't need to understand the distinction.

**EC38. When a client makes a partial payment, does every surface they can see (portal, email receipt, payment history, event status) show consistent, correct remaining balance?**
Partial payments create a state where balance is non-zero. If any surface computes the balance differently (e.g., one reads ledger, another reads a cached total), the client sees conflicting numbers.

**EC39. When a client's event is co-hosted by two chefs, does the client see both chefs' information in: the proposal, the menu, the contract, the event detail page, and the staff briefing?**
The client doesn't care about the chefs' internal collaboration structure. They need to know who's cooking their food.

**EC40. When a client interacts with Remy (the AI concierge on the public chef profile), can Remy: answer questions about the chef's services, check availability for a date, start an inquiry, and hand off to a human, all without the client leaving the page?**
Remy on the public profile is the first AI touchpoint. If it can't complete basic tasks, it's a gimmick, not a feature.

---

## Chain 9: Analytics Truth Chain (Raw Data -> Dashboard Numbers -> Export)

> Every number on the dashboard must trace back to verifiable raw data. If analytics compute differently from financial reports, the chef trusts neither.

**EC41. Does the dashboard's "total revenue" match the sum of all payment ledger entries, the client spending totals, the CPA export revenue line, and the daily report revenue figure?**
Five surfaces show revenue. If any two disagree, the chef loses trust in all of them.

**EC42. Does the "events completed" count on the analytics page match: the count of events with status "completed" in the DB, the event list filtered by status, and the CPA export event count?**
A simple count. But if analytics caches an old count or uses a different status filter, the numbers diverge.

**EC43. When a recipe's food cost changes (ingredient price update), do the analytics historical charts retroactively update, or do they preserve the point-in-time cost?**
Historical analytics should show what the cost WAS, not what it IS now. If charts retroactively update, historical trends are meaningless.

**EC44. Does the "average event profit margin" statistic account for: recipe food costs, expenses, subcontractor costs, collaborator splits, refunds, discounts, and tips? Or does it only count revenue minus a subset of costs?**
Profit margin is the most important business metric. If it excludes cost categories, the chef overestimates profitability.

**EC45. When a chef exports analytics data (CSV, PDF report), do the exported numbers match exactly what the dashboard shows at that moment?**
Export-dashboard parity. If the export queries differently (different date range, different aggregation), the export contradicts what the chef just saw.

---

## Chain 10: Collaboration Integrity Chain (Multi-Chef Operations)

> When two chefs work together on an event, every system must handle the multi-tenant reality. Data must be visible to both, editable by the right one, and never leak to the wrong one.

**EC46. When Chef A invites Chef B as co-host, and Chef B accepts, can Chef B see: the event on their calendar, the menu, the guest list dietary data, the prep timeline, the shopping list, and the financial split?**
This is the master collaboration chain. Every operational surface for the event must include the collaborator's view. Prior cross-system fixes added some visibility (prep blocks Q28, staff briefing Q25, staff portal Q26). What surfaces still exclude collaborators?

**EC47. When Chef A (primary) modifies a recipe used in the co-hosted event, does Chef B see the updated recipe data in their prep timeline, shopping list, and menu view?**
Cross-tenant recipe visibility. Chef B's operational systems must read Chef A's recipe data. If Chef B only sees a snapshot from invitation time, their operations diverge.

**EC48. When Chef B (collaborator) adds a prep block for their courses, does Chef A see Chef B's prep blocks on the event's prep timeline?**
Bidirectional prep visibility. Prior fix (Q28) added fetching of collaborator prep blocks in `getEventPrepBlocks`. Verify the data flows through to the UI and Chef A actually sees them.

**EC49. When a shared event transitions states (proposed -> accepted -> paid), do both chefs receive the transition notification, and do both chefs' dashboards reflect the new state?**
FSM transitions are tenant-scoped. The transition fires for the primary chef's tenant. Does it also notify and update the collaborator?

**EC50. When the event completes and financials are settled, can each chef see: their own costs, the other chef's costs (if permitted), the revenue split, and their individual profit from the collaboration?**
Financial settlement of a collaboration. If each chef only sees their own ledger, the collaboration's financial reality is invisible.

---

## Scoring Template

| Chain                | Q Range   | PASS | PARTIAL | FAIL | Gaps |
| -------------------- | --------- | ---- | ------- | ---- | ---- |
| 1. Money             | EC1-EC5   |      |         |      |      |
| 2. Dietary Safety    | EC6-EC10  |      |         |      |      |
| 3. Time Cascade      | EC11-EC15 |      |         |      |      |
| 4. Inquiry Pipeline  | EC16-EC20 |      |         |      |      |
| 5. Recipe-to-Plate   | EC21-EC25 |      |         |      |      |
| 6. Notification      | EC26-EC30 |      |         |      |      |
| 7. Cache Consistency | EC31-EC35 |      |         |      |      |
| 8. Client Experience | EC36-EC40 |      |         |      |      |
| 9. Analytics Truth   | EC41-EC45 |      |         |      |      |
| 10. Collaboration    | EC46-EC50 |      |         |      |      |
| **TOTAL**            | **50**    |      |         |      |      |

---

## Relationship to Prior Work

| Question Set      | Questions | What It Tests                               |
| ----------------- | --------- | ------------------------------------------- |
| Core integrity    | 75        | Single-system correctness                   |
| Prep timeline     | 128       | Domain-deep (prep/scheduling)               |
| Chef-to-chef      | 83        | Network domain + 2 phases of cross-boundary |
| Financials        | 70        | Financial pipeline depth                    |
| Dinner circles    | 82        | Community/social domain                     |
| Full cohesion     | 130       | 12 domains individually + 10 cross-domain   |
| **This set**      | **50**    | **Multi-hop chains spanning 5-10 systems**  |
| **Running total** | **~618+** |                                             |

This set is the FINAL layer. Prior sets verified that individual systems work. This set verifies that data survives the journey from origin to every consumer. A system can pass all domain audits and still fail chain integrity if the hops between domains are broken.
