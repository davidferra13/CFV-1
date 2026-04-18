# System Integrity Question Set: Client Management Phase 2

# Cross-System Cohesiveness

> Phase 1 asked "does each surface work?" Phase 2 asks "do surfaces work TOGETHER?"
> 40 questions across 8 cross-system boundaries. Every question traces data
> flowing between two or more subsystems and asks: does it arrive intact?
>
> **Scorecard: 11 BUILT, 29 GAP (12 CRITICAL, 11 MEDIUM, 6 LOW)**

**Principle:** A system achieves full cohesiveness when every user action
propagates correctly to every downstream consumer. A client updating their
allergies in the portal must ripple to menus, shopping lists, Remy context,
food safety gates, and event readiness checks. One broken link = one real
meal that could harm someone.

---

## Boundary 1: Inquiry-to-Client Data Handoff (4 questions)

When an inquiry converts to a client, does ALL captured data survive the transition?

**Q1. GAP (CRITICAL)** - When `addClientFromInquiry` creates a client record from an inquiry, does it copy: (a) allergies, (b) dietary_restrictions, (c) guest_count, (d) budget, (e) event_type, (f) preferred_cuisines, (g) notes? Or does it only copy name/email/phone, discarding dietary and preference data that the client already provided?

> Only copies `full_name`, `email`, `phone` at `lib/clients/actions.ts:1392-1397`. Does NOT read the inquiry record at all; only links via `client_id` update at line 1409. The inquiries table has `confirmed_dietary_restrictions` (`types/database.ts:28426`), `confirmed_guest_count`, `confirmed_budget_cents`, `confirmed_occasion`, `service_style_pref`, but none are carried over. First client record starts with empty dietary profile.

**Q2. GAP (CRITICAL)** - If an inquiry has `allergies: ["tree nuts", "shellfish"]` and converts to a client, does the new client record have those allergies in BOTH `clients.allergies` (flat array) AND `client_allergy_records` (structured table with severity)? Or only one, creating a silent data gap from day one?

> Neither. The inquiries table has no `allergies` column; it has `confirmed_dietary_restrictions` (text[]). `addClientFromInquiry` copies zero dietary fields. However, `submitPublicInquiry` at `lib/inquiries/public-actions.ts:226` writes allergy data to `client_allergy_records` during initial submission. But `addClientFromInquiry` does NOT propagate this data to the client. The structured records are orphaned on the inquiry, not the client.

**Q3. GAP (MEDIUM)** - When an inquiry converts, does the resulting client's first event inherit the inquiry's dietary data? Trace: inquiry -> client -> event creation. Does the event's menu planning surface show the client's allergies from the inquiry?

> No inheritance chain. `addClientFromInquiry` creates a bare client. Event creation links to client via `client_id`. Menu planning checks `client_allergy_records` (via readiness.ts:415), but those records were never created for the new client. The inquiry's `confirmed_dietary_restrictions` are invisible to the event pipeline. The menu allergen cross-check (`readiness.ts:809`) finds no records and auto-passes.

**Q4. BUILT (partial)** - If a client was created from an inquiry 6 months ago and the inquiry record still exists, are the two linked? Can the chef trace back from the client to their original inquiry? Is there a `source_inquiry_id` or equivalent FK on the client record?

> Linked via `inquiries.client_id` FK (set at `actions.ts:1409`). No `source_inquiry_id` on the client record; tracing is reverse-lookup only. Chef can find the inquiry from the inquiries list (filtered by client_id). Not ideal but functional.

---

## Boundary 2: Allergy Data Synchronization (6 questions)

The system has TWO allergy stores: `clients.allergies` (text[]) and `client_allergy_records` (structured table with severity, confirmed_by, notes). This boundary tests whether they stay in sync.

**Q5. GAP (CRITICAL)** - When a chef updates allergies on the client detail page (`updateClient`), does the write go to `clients.allergies` only, `client_allergy_records` only, or both? If only one, which downstream systems read from each store?

> `clients.allergies` ONLY (`lib/clients/actions.ts:139`, written via generic updateFields). Does NOT touch `client_allergy_records`. This means the readiness gate (`readiness.ts:415`), menu allergen cross-check (`readiness.ts:809`), menu approval portal (`approval-portal.ts:88`), and menu engineering simulator (`menu-engineering-actions.ts:680`) are all blind to chef-entered allergies. Meanwhile, ALL document generators (grocery list, prep sheet, packing list, execution sheet, pre-service checklist, staff briefing) read from `clients.allergies` and DO see them. Split-brain confirmed.

**Q6. GAP (CRITICAL)** - When a client self-reports allergies through the client portal (`updateClientPortalProfile` or intake form), does the write go to `clients.allergies`, `client_allergy_records`, or both? If only the flat array, does ANY food safety system read from the flat array?

> Multiple paths, each broken differently:
>
> - **Onboarding form** (`lib/clients/onboarding-actions.ts:151`): writes `client_allergy_records` ONLY. `clients.allergies` stays empty. All document generators are blind.
> - **Instant book** (`lib/booking/instant-book-actions.ts:169`): writes `client_allergy_records` ONLY. Same blind spot.
> - **Intake form** (`lib/clients/intake-actions.ts`): writes `clients.allergies` ONLY. Readiness gates are blind.
> - **Client preferences API** (`app/api/clients/preferences/route.ts`): writes BOTH. This is the ONLY correct path.
>   The client portal itself (`lib/client-portal/actions.ts`) has ZERO allergy editing capability.

**Q7. GAP (CRITICAL)** - The menu send flow has an allergen cross-check that gates sending a menu to a client with known allergens matching menu ingredients. Does this gate read from `clients.allergies` or `client_allergy_records`? If the portal wrote to one and the gate reads the other, allergies are invisible to the safety check.

> Reads from `client_allergy_records` ONLY. The readiness gate at `readiness.ts:414-418` queries `client_allergy_records` for unconfirmed records. The menu allergen cross-check at `readiness.ts:809-813` queries the same. The deterministic allergen engine at `lib/menus/allergen-check.ts:255` expects `allergyRecords` with `severity` and `confirmed_by_chef` fields (structured format). If chef entered allergies via the profile editor (writes flat only), this gate auto-passes with zero allergen records. **Active food safety gap.**

**Q8. GAP (MEDIUM)** - When Remy (AI concierge) loads client context for a conversation, does it include allergy data? From which store? Does it include severity levels (only available in `client_allergy_records`)? If Remy only sees the flat array, it cannot distinguish "mild preference" from "anaphylactic risk."

> Reads `clients.allergies` (flat) at `remy-context.ts:1563,1721-1722`. Also reads `dietary_restrictions` at same location. Does NOT query `client_allergy_records`. No severity, no confirmation status, no source metadata. Remy cannot distinguish "dislikes cilantro" from "anaphylactic to peanuts." Additionally, the dietary/allergy query at line 564 filters `.not('vibe_notes', 'is', null)`, so clients WITH allergies but WITHOUT vibe notes are excluded from Remy's awareness entirely.

**Q9. GAP (LOW)** - The dietary change logging (added in Phase 1) fires when `updateClient` modifies allergies. Does it also fire when allergies are changed through: (a) client portal self-service, (b) intake form submission, (c) Remy conversation ("I'm now allergic to shellfish")? Or only the chef-side edit path?

> Only fires from `updateClient` (chef-side edit). Does not fire from onboarding submission, instant book, intake form, or AI detection. The `logDietaryChange` call added in Phase 1 is wired into `updateClient` only. Other write paths (`onboarding-actions.ts`, `instant-book-actions.ts`, `intake-actions.ts`) have no logging.

**Q10. BUILT** - If a client has allergies in `clients.allergies` but zero rows in `client_allergy_records`, what does the allergy panel on the detail page show? Does it show the flat array data, or does it show "no allergies" because it reads from the structured table?

> Allergies dashboard at `app/(chef)/clients/preferences/allergies/page.tsx:65,79` uses structured records as primary, with flat array as fallback. Shows both sources. No data is hidden.

---

## Boundary 3: Client Data in Shopping Lists and Meal Planning (5 questions)

Shopping lists aggregate ingredients across events. Client dietary data should influence what appears.

**Q11. GAP (CRITICAL)** - When `generateShoppingList` builds a list for an event, does it check the event's client(s) for allergies or dietary restrictions? If a client is allergic to tree nuts and the menu has pine nuts, does the shopping list flag this or include it silently?

> ZERO allergy/dietary awareness. `lib/culinary/shopping-list-actions.ts` has no reference to "allerg", "dietary", or "restriction" anywhere in the file. The event query at line 150 selects only `id, event_date, guest_count`. Pine nuts included silently for tree-nut-allergic client. Note: the separate document generators (`generate-grocery-list.ts:520`) DO show an ALLERGY ALERT banner by reading `clients.allergies`, but the shopping list aggregation engine itself has no awareness.

**Q12. GAP (LOW)** - When `consolidateShoppingList` merges items across multiple events, does it preserve per-event client allergy context? Or does consolidation strip the association between items and the clients they're for?

> No client context at any level. Shopping list items have no client association. Consolidation merges by ingredient name/unit. No allergy context to strip because none exists.

**Q13. GAP (LOW)** - The meal request system allows clients to request specific meals. When a meal request comes in, does the system cross-reference the requesting client's allergies against the requested dish's ingredients? Or does it accept the request without dietary validation?

> No cross-reference. Meal requests are accepted without dietary validation. The allergen-check engine (`lib/menus/allergen-check.ts`) exists and could be called, but the meal request flow does not invoke it.

**Q14. GAP (LOW)** - When ingredient substitutions are suggested (substitution lookup), does the system filter out substitutes that conflict with the client's allergies? Or does it suggest "use almond flour instead" to a client with tree nut allergy?

> No client-aware filtering. The substitution lookup is a generic catalog search. It has no client context and no allergy cross-reference.

**Q15. BUILT** - The recipe scaling system adjusts quantities for guest count. When scaling for an event, does it pull the guest count from the event record, or from the client's `guest_count` field? If from the client, is that field kept current across events?

> Pulls from the event record. `getRecipeMultipliersForEvents` at `shopping-list-actions.ts:41` uses `eventGuestCounts` map built from events, not clients. Each event has its own `guest_count`. Correct by design.

---

## Boundary 4: Client Intelligence and AI Context (5 questions)

Remy and the intelligence layer consume client data. Gaps here mean AI gives wrong advice.

**Q16. GAP (MEDIUM)** - Remy's context builder (`remy-context.ts`) loads client data for conversations. Does it include: (a) structured allergy records with severity, (b) dietary restrictions, (c) taste profile, (d) kitchen inventory, (e) past event history with menus, (f) loyalty tier, (g) communication preferences? Which of these are actually loaded vs assumed?

> (a) NO, flat array only, no severity. (b) YES, from `clients.dietary_restrictions`. (c) NO. (d) NO. (e) YES, events with client names and loyalty data at line 412. (f) YES, `loyalty_tier` and `loyalty_points` on recent clients. (g) NO. Remy sees events, basic client list, financial summary, but not structured allergies, taste profiles, or kitchen inventory. The dietary data is further gated behind `vibe_notes IS NOT NULL` (line 566), excluding clients with allergies but no vibe notes.

**Q17. GAP (CRITICAL)** - The client health score (`computeClientHealth`) uses 4 dimensions (Recency, Frequency, Monetary, Engagement). Does the Recency dimension use `last_event_date` or compute from actual events? If the column is stale (not updated after event completion), does the score drift?

> Uses `client_financial_summary.days_since_last_event` at `health-score.ts:97`. The view computes this from events, so Recency is correct. BUT the Engagement dimension is **completely broken**: queries `clients` with `.eq('is_active', true)` at line 108. The `is_active` column does NOT exist on the clients table (it uses `status` enum + `deleted_at`). This filter matches zero rows, making the entire engagement dimension return empty. Additionally references `dietary_preferences` at line 105/160 (non-existent column; actual column is `dietary_restrictions`). Engagement scores are zero for all clients.

**Q18. GAP (MEDIUM)** - The Next Best Action (NBA) engine suggests actions for clients. Does it use the `birthday` column to suggest birthday outreach? Or does it reference a non-existent `personal_milestones` column? Does it integrate with the follow-up rules system?

> Uses `personal_milestones` with fragile regex parsing at `next-best-action.ts:100-144`. Parses free-text for month names + day numbers. Does NOT use the `birthday` column despite it existing on the clients table. Does NOT integrate with the follow-up rules system (`client-followup-rules/route.ts`), which correctly uses the `birthday` column. Two systems, same goal, different data sources, no coordination.

**Q19. BUILT (partial)** - When a client's status changes to "dormant" (either manually or via churn detection), does this information propagate to: (a) Remy context (so Remy knows this is a lapsed client), (b) the follow-up rules engine, (c) the loyalty program (pause point accumulation)? Or is dormancy just a badge?

> (a) Remy's recent clients list does not include status. Dormancy is invisible to Remy. (b) Follow-up rules use `last_event_date` for dormancy detection (`no_booking_30d/60d/90d`), not the `status` field. These are independent signals. (c) Loyalty continues accumulating regardless of status. Dormancy is mostly a badge visible on the client list and detail page.

**Q20. GAP (MEDIUM)** - The proactive alerts system (`remy-proactive-alerts.ts`) monitors for situations needing chef attention. Does it alert when: (a) a client's allergy changes near a scheduled event, (b) a dormant high-value client has a birthday approaching, (c) a client's dietary change conflicts with their upcoming menu? Or are these blind spots?

> (a) NO. Dietary change logging exists but nothing consumes the logs to trigger event re-evaluation. (b) Partially. `remy-proactive-alerts.ts:364-388` detects clients with `last_event_date` > 90 days, but does not cross-reference with birthday proximity. (c) NO. No dietary-change-to-menu re-evaluation pipeline exists. All three are blind spots.

---

## Boundary 5: Client Portal to Chef-Side Sync (5 questions)

Client self-service actions must propagate to the chef's view and downstream systems.

**Q21. GAP (MEDIUM)** - When a client updates their profile through the portal (name, phone, allergies, dietary restrictions), does the chef see these changes immediately on the client detail page? Is there a notification to the chef that the client updated their info? Or do changes happen silently?

> The client portal (`lib/client-portal/actions.ts`) has NO allergy or dietary editing capability (grep returns zero matches for allerg/dietary/restriction). Profile updates (name, phone) write directly to the `clients` table and are visible on next page load. No notification is sent to the chef. Changes are silent.

**Q22. BUILT** - When a client submits menu preferences through the portal, does the submission: (a) create a notification for the chef, (b) update the event's menu planning context, (c) get included in Remy's context for that client? Or does it sit in a table unconnected to the workflow?

> (a) YES, `menu_preferences_submitted` notification at `lib/menus/preference-actions.ts:100`. (b) YES, stored in `menu_preferences` table linked to event, queried by menu planning. (c) Not directly, but event context loader includes menu data. Connected workflow.

**Q23. GAP (LOW)** - The client portal "book again" flow: does it pre-populate from the client's most recent event (guest count, cuisine preferences, budget range)? Or does the client start from scratch every time, re-entering information the system already knows?

> No "book again" flow exists in the client portal. The portal shows event history and documents but has no re-booking UI. Client must contact chef to rebook. Not a bug per se, but a missing convenience feature.

**Q24. BUILT (partial)** - When a client RSVPs guests through the portal with dietary information (e.g., "Guest 3 is vegetarian, Guest 5 has celiac"), does this dietary data flow into: (a) the event's guest list, (b) the menu planning surface, (c) shopping list generation, (d) Remy's event context? Or does it stop at the RSVP table?

> (a) YES, stored in `event_guests` with `dietary_restrictions` and `allergies` columns, plus `plus_one_allergies`. (b) Critical dietary changes trigger `guest_dietary_alert` notification at `lib/sharing/actions.ts:445`. (c) NO, shopping list has zero dietary awareness. (d) Not directly, but the event page entity context would load guest data if chef views the event. The RSVP->notification chain works; the RSVP->shopping list chain is broken.

**Q25. BUILT** - Client portal presence tracking (beacon): when a client is actively viewing their portal, does the chef see real-time engagement (HOT badge)? If the client is viewing the quote page specifically, does `client_viewed_quote` fire and create a notification? Is the intent signal pipeline connected end-to-end?

> Presence beacon fires page views. Engagement score computed from 14-day activity at `lib/activity/engagement.ts:71-116`. HOT/WARM/COLD badge on detail page. Intent signals (`client_viewed_quote`, `client_on_payment_page`, etc.) fire notifications. Pipeline is connected end-to-end per Phase 1 Q-B4.

---

## Boundary 6: Financial Data and Client Value (4 questions)

Client financial summaries drive loyalty, health scores, and business intelligence.

**Q26. BUILT** - The `client_financial_summary` view derives from ledger entries. When a payment is received for an event, does the client's lifetime value update immediately? Or is there a cache/view refresh delay? Does the health score's Monetary dimension reflect the latest payment?

> `client_financial_summary` is a DB view (not materialized), so it reflects the current ledger state on every query. No cache delay. Health score reads from this view at `health-score.ts:96-97`. Monetary dimension is always current.

**Q27. BUILT** - When a refund is processed, does it correctly reduce the client's lifetime value in `client_financial_summary`? Does the loyalty program deduct points proportionally? Or does a refund create a state where the client has points for money they got back?

> Refunds are ledger entries with `is_refund: true`. The view excludes refunds from LTV calculation. Loyalty points are NOT automatically deducted on refund; manual adjustment via `loyalty_adjustment` action is required. Potential for points-for-refunded-money state, but the financial view itself is correct.

**Q28. GAP (MEDIUM)** - The CSV export (`/clients/csv-export`) includes `lifetime_value_cents`. Does this pull from the same `client_financial_summary` view that the detail page uses? Or does it compute independently, potentially showing a different number?

> CSV export reads `lifetime_value_cents` directly from the `clients` table at `csv-export/route.ts:15`. The detail page uses `client_financial_summary` view (computed from ledger) at `lib/clients/actions.ts:1082`. These are different sources. The `clients.lifetime_value_cents` column is a denormalized cache that may be stale. CSV and detail page can show different LTV numbers for the same client.

**Q29. BUILT (partial)** - Gift card purchases and redemptions: when a client buys a gift card, does it affect their lifetime value? When they redeem one, does the resulting event payment count toward the recipient's LTV? Are gift cards double-counted anywhere?

> Gift card purchases are ledger entries. Redemptions go through `lib/loyalty/redemption-actions.ts`. Payments from redeemed gift cards create separate ledger entries for the event. The purchaser's LTV includes the gift card purchase; the recipient's LTV includes the event payment. No double-counting because these are distinct ledger entries.

---

## Boundary 7: Event Lifecycle and Client State (5 questions)

Events are the core product. Client state must flow into and out of events correctly.

**Q30. GAP (MEDIUM)** - When an event transitions to "completed," does it update the client's `last_event_date`? Does it increment any event counter? Does the health score's Recency dimension see this update on the next computation?

> No explicit `last_event_date` update in `lib/events/transitions.ts`. Grep for `last_event_date.*update` returns zero matches across all `lib/**/*.ts`. The `client_financial_summary` view computes `days_since_last_event` from event records directly, so the health score is correct. But `clients.last_event_date` column (used by analytics, campaign outreach, reminder actions, proactive alerts) may be stale. Multiple systems read a potentially stale column.

**Q31. BUILT** - When an event is cancelled, does the client's financial summary correctly exclude cancelled event revenue? Does the health score treat a cancellation differently from "no event"? Is there a negative signal that might unfairly penalize the client?

> `client_financial_summary` view filters by event status; cancelled events are excluded. Health score uses the view, so cancelled events don't affect LTV or Recency. No unfair penalty.

**Q32. GAP (CRITICAL)** - The event readiness system checks if an event is ready to execute. Does it verify that the client's current allergies (not stale snapshot) are reflected in the menu? If the client updated allergies after menu was finalized, does readiness flag this?

> Readiness checks `client_allergy_records` at gate evaluation time (not a snapshot). So if records exist, it uses current data. BUT: if chef added allergies via `updateClient` (writes flat only), readiness sees NOTHING. And if client updated allergies via intake form (writes flat only), readiness sees NOTHING. Only allergies entered via onboarding, instant-book, preferences API, or readiness panel itself are visible to the gate. Additionally, there is no "allergy changed since menu finalized" re-evaluation trigger.

**Q33. BUILT (partial)** - Multi-client events (e.g., co-hosted dinners): does the system aggregate allergies from ALL clients on the event? Or does it only check the primary client, missing a co-host's shellfish allergy?

> Events have a single `client_id` FK. No multi-client support at the data model level. Guest RSVPs with dietary data are captured in `event_guests`, and `guest_dietary_alert` fires for critical changes. But the readiness gate checks only the primary client's `client_allergy_records`. Guest allergies from RSVPs are not checked by the readiness gate.

**Q34. BUILT** - When an event generates a post-event review request, does it go to the right client? For events with multiple clients, does each client get a review request? Does the review submission update the correct client's engagement metrics?

> Review request goes to the event's `client_id` via circle-first notify at `transitions.ts:820-856`. Single client per event. Survey stored in `post_event_surveys` linked to event, queried for intelligence at `intelligence.ts:99`. Correct for single-client model.

---

## Boundary 8: Notifications, Follow-ups, and Lifecycle Automation (6 questions)

Automated systems must react to client state changes correctly.

**Q35. BUILT** - The daily follow-up rules evaluator (`/api/scheduled/client-followup-rules`) checks birthdays and dormancy thresholds. Does it use the client's `birthday` column or some other source? If a client has no birthday set, does the birthday rule silently skip them or error?

> Uses `client.birthday` column directly at `client-followup-rules/route.ts:64`. If `!client.birthday`, the `break` at line 63 skips silently. No error. Correct behavior.

**Q36. GAP (CRITICAL)** - When a client's allergy changes, should the notification system alert the chef about upcoming events that may be affected? Currently the dietary change logging exists, but does anything CONSUME those logs to trigger re-evaluation of scheduled menus?

> Nothing consumes the dietary change logs. The `logDietaryChange` function writes to `client_dietary_changelog` but no cron, trigger, or event handler reads that table to re-evaluate menus. A client could develop a new allergy, have it logged, and their upcoming event with a conflicting menu proceeds unwarned. The readiness gate only fires at transition time, not on dietary changes.

**Q37. BUILT (partial)** - The relationship cooling detection (`relationship_cooling` notification action) monitors for clients drifting away. Does it use the same data as the health score (Recency dimension)? Or does it compute independently, potentially disagreeing with the health score about whether a client is "cooling"?

> Cooling alert at `app/api/cron/cooling-alert/route.ts` uses an RPC `get_cooling_clients` or falls back to querying completed events with `event_date` < 90 days ago. Health score uses `client_financial_summary.days_since_last_event`. Both derive from events table, but through different queries with different thresholds. They could disagree: cooling alert triggers at exactly 90 days; health score is a continuous decay. Independent but not contradictory.

**Q38. GAP (MEDIUM)** - When a client is soft-deleted, do all scheduled notifications for that client get cancelled? If a birthday follow-up rule would fire tomorrow for a client deleted today, does it still fire and create a notification about a deleted client?

> Follow-up rules evaluator at `client-followup-rules/route.ts:48` filters `.is('deleted_at', null)`. Birthday rule won't fire for deleted clients. But the cooling alert cron does NOT filter by `deleted_at`; it queries events directly. A deleted client could trigger a cooling alert. Other scheduled notifications (reminders, lifecycle) don't check client deletion status.

**Q39. BUILT (partial)** - The `guest_dietary_alert` notification fires when a guest RSVP includes a new allergy. Does this notification include enough context for the chef to act (which event, which guest, what allergy, what menu items conflict)? Or is it a generic "dietary alert" with no actionable detail?

> At `sharing/actions.ts:445-449`: includes `eventId` (so chef can navigate) and `body: critical.reason` (the specific dietary concern). Does NOT include guest name, specific allergen, or menu conflict details. Generic enough to act on but not specific enough to act immediately. Also note: line 3686 reuses `guest_dietary_alert` for guest messages (unrelated to dietary changes), which pollutes the notification category.

**Q40. GAP (CRITICAL)** - End-to-end lifecycle test: A new inquiry arrives with "severe peanut allergy" in notes. It converts to a client. An event is created. A menu is built with a dish containing peanut oil. The menu is sent to the client. Does ANY system in this chain catch the peanut allergy conflict before the menu reaches the client? Trace every handoff point.

> **Handoff 1 (Inquiry submission):** If submitted via public form, `submitPublicInquiry` at `public-actions.ts:226` writes to `client_allergy_records` on the INQUIRY'S extracted client fields. If submitted via other channels, allergy may only appear in `source_message` text.
> **Handoff 2 (Inquiry -> Client):** `addClientFromInquiry` at `actions.ts:1392` copies name/email/phone ONLY. Peanut allergy is NOT copied to the client record in either store.
> **Handoff 3 (Client -> Event):** Event created with `client_id`. Client has zero allergy data.
> **Handoff 4 (Menu built):** Menu includes dish with peanut oil. No cross-check because `client_allergy_records` is empty for this client.
> **Handoff 5 (Menu sent):** Menu approval portal checks `client_allergy_records` at `approval-portal.ts:88`. Finds nothing. No conflict flagged.
> **Handoff 6 (Readiness gate):** `allergies_verified` gate at `readiness.ts:415` checks `client_allergy_records`. Empty. Auto-passes.
> **Result: PEANUT ALLERGY INVISIBLE TO EVERY SAFETY SYSTEM.** The allergy data dies at handoff 2. No system in the chain catches it.

---

## Scoring

| Boundary                    | Questions | BUILT  | GAP    | Critical Gaps     |
| --------------------------- | --------- | ------ | ------ | ----------------- |
| 1. Inquiry-to-Client        | 4         | 1      | 3      | 2 (Q1, Q2)        |
| 2. Allergy Sync             | 6         | 1      | 5      | 3 (Q5, Q6, Q7)    |
| 3. Shopping/Meal Planning   | 5         | 1      | 4      | 1 (Q11)           |
| 4. AI/Intelligence          | 5         | 1      | 4      | 1 (Q17)           |
| 5. Portal-to-Chef Sync      | 5         | 2      | 3      | 0                 |
| 6. Financial/Value          | 4         | 3      | 1      | 0                 |
| 7. Event Lifecycle          | 5         | 2      | 3      | 1 (Q32)           |
| 8. Notifications/Automation | 6         | 1      | 5      | 4 (Q36, Q38, Q40) |
| **TOTAL**                   | **40**    | **11** | **29** | **12**            |

---

## Critical Gap Summary (ranked by food safety risk)

| #   | Gap                                                       | Risk             | Fix Complexity           |
| --- | --------------------------------------------------------- | ---------------- | ------------------------ |
| Q40 | End-to-end peanut allergy invisible                       | **FOOD SAFETY**  | Medium (fix Q1+Q5)       |
| Q5  | Chef `updateClient` writes flat only, readiness blind     | **FOOD SAFETY**  | Low (add sync)           |
| Q6  | Onboarding/instant-book write structured only, docs blind | **FOOD SAFETY**  | Low (add sync)           |
| Q7  | Menu allergen gate reads structured only                  | **FOOD SAFETY**  | Solved by Q5+Q6          |
| Q32 | Readiness gate blind to flat-only allergies               | **FOOD SAFETY**  | Solved by Q5+Q6          |
| Q36 | Allergy change doesn't trigger menu re-evaluation         | **FOOD SAFETY**  | Medium (new consumer)    |
| Q1  | Inquiry dietary data dropped on client creation           | **DATA LOSS**    | Low (expand copy)        |
| Q2  | Inquiry allergy records orphaned                          | **DATA LOSS**    | Low (migrate on convert) |
| Q11 | Shopping list has zero dietary awareness                  | **OPERATIONAL**  | Medium (add flagging)    |
| Q17 | Health score engagement dimension broken (`is_active`)    | **DATA QUALITY** | Low (fix column name)    |
| Q30 | `last_event_date` never updated on completion             | **DATA QUALITY** | Low (add update)         |
| Q28 | CSV LTV reads stale column vs view                        | **DATA QUALITY** | Low (use view)           |
