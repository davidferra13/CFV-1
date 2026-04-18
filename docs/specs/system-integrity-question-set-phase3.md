# Cross-System Cohesion: System Integrity Question Set (Phase 3)

> **Purpose:** Phase 1 verified cohesion WITHIN the 12 chef-to-chef network systems (30/30 PASS). Phase 2 tested boundaries where network systems touch recipes, events, prep, shopping, scheduling, notifications, contracts, staff, and calendar (11 PASS, 4 PARTIAL, 16 FAIL before P2 fixes). Phase 3 tests 10 NEW untested boundaries between the network layer and: inquiry pipeline, financial ledger, client emails, equipment, pricing/catalog, dashboard, search, onboarding, embeddable widget, and dinner circles.
>
> **Relationship to Phase 2:** Phase 2 asked "do network systems talk to the rest of ChefFlow?" Phase 3 asks "do the remaining ChefFlow systems acknowledge that a chef has a network at all?"
>
> **How to use:** Same as Phases 1-2. Answer each question with a concrete decision. Every answer must cite `file:line`. Verdicts: PASS (works end-to-end), PARTIAL (data exists but UI/pipeline missing), FAIL (no path exists), WONTFIX (intentionally out of scope).

---

## A. Inquiry Pipeline and Network (3 questions)

**Q1. When a chef declines an inquiry due to scheduling conflict, does the system suggest handing it off to a connected chef?**
Chef A receives an inquiry for May 15. She already has an event that day. She clicks "Decline." Does the decline flow offer a "Hand off to network" option? Does it surface trusted circle chefs who are available on that date? Or is decline a dead end?

**Q2. When a handoff originates from an inquiry (via "Hand Off This Lead"), does the inquiry status update to reflect the referral?**
Chef A views inquiry #42 and clicks "Hand Off." The handoff is created via `getHandoffDataFromInquiry()`. Does inquiry #42's status change to `referred` or `handed_off`? Or does it stay in its current status (`new`, `awaiting_chef`) forever, showing as a stale lead in the pipeline even though it was referred?

**Q3. Can a chef see which inquiries led to successful handoff conversions (referral tracking)?**
Chef A handed off 3 inquiries last quarter. Two converted into booked events for other chefs. Can Chef A see this conversion data anywhere? Is there a link from the inquiry record to the handoff outcome? Or are inquiries and handoffs siloed with no traceability?

---

## B. Financial Ledger and Network Revenue (3 questions)

**Q4. When a handoff converts to a booked event, does the referral fee (if any) create a ledger entry?**
Chef A referred a lead to Chef B. Chef B booked the event at $3,000. Per their arrangement, Chef A gets a 10% referral fee ($300). Does `recordCollabHandoffConversion` create a ledger entry in Chef A's tenant for the referral income? Or is referral revenue display-only (`getReferralRevenueSummary`) with no accounting impact?

**Q5. Does the profit summary on the event detail page account for subcontractor costs as an expense?**
Chef A hired Chef C as a subcontractor for dessert at $400 flat. The Profit Summary card shows Revenue, Expenses, Profit, and Margin. Does "Expenses" include the $400 subcontract cost? Or is it only tracking `expenses` table entries (groceries, supplies, mileage)?

**Q6. Can the financial reports / analytics page aggregate revenue from co-hosted events vs solo events?**
Chef A co-hosted 3 events and ran 10 solo events this quarter. The analytics page shows revenue trends, top clients, conversion rates. Does it distinguish co-hosted event revenue? Can Chef A see "co-hosted revenue: $X" as a separate metric? Or are co-hosted events invisible in analytics because they live under another chef's tenant?

---

## C. Client Communications and Collaboration (2 questions)

**Q7. When a chef sends a client email about an event that has a co-host, does the email mention the co-host?**
Chef A is emailing Client X about the farm dinner. Chef B (co-host) is handling courses 4-6. The email template auto-populates event details. Does it include "Co-hosted with Chef B" or any collaborator context? Or does the client only see Chef A's name?

**Q8. When a client replies to an email about a co-hosted event, does the co-host chef get notified?**
Client X replies to Chef A's email with dietary changes. Chef B (co-host handling dietary-sensitive courses) needs to know. Does the email pipeline notify Chef B? Does the reply appear in Chef B's inbox or notification stream? Or is it siloed in Chef A's email only?

---

## D. Equipment and Shared Events (2 questions)

**Q9. When Chef A rents equipment for a co-hosted event, can collaborator Chef B see the equipment assignment?**
Chef A rents a chafing dish set for the farm dinner and links it via `event_id` on the rental record. Chef B (co-host) opens the event. Can Chef B see what equipment Chef A has assigned? Or is equipment inventory strictly single-tenant with no cross-chef visibility?

**Q10. Can two collaborating chefs avoid duplicate equipment rentals for the same event?**
Chef A and Chef B are co-hosting. Both need a 60-quart mixer. Chef A already rented one and linked it to the event. Can Chef B see this before renting a second one? Is there any equipment coordination surface for shared events?

---

## E. Pricing, Catalog, and Ingredient Sharing (2 questions)

**Q11. Can connected chefs share price intelligence on ingredients?**
Chef A found a great deal on saffron at $12/oz from a local supplier. Chef B (trusted circle, same region) is also sourcing saffron. Can Chef A share this price data point with Chef B? Does the price catalog or ingredient system support cross-chef price sharing? Or is pricing data strictly per-tenant?

**Q12. When two chefs co-host an event, can they share a unified shopping list?**
Chef A handles courses 1-3 (needs 5 lbs chicken, 2 lbs butter). Chef B handles courses 4-6 (needs 3 lbs chicken, 1 lb butter). Can they generate a merged shopping list showing "8 lbs chicken, 3 lbs butter"? Or does each chef get their own isolated list with no consolidation?

---

## F. Dashboard Network Awareness (2 questions)

**Q13. Does the dashboard show any network activity (pending handoffs, connection requests, collab space messages)?**
Chef A logs in. Her dashboard shows events, inquiries, revenue, goals, todos. She has 2 pending handoffs, 1 connection request, and 3 unread collab space messages. Does the dashboard surface any of this? Is there a network activity widget? Or must she navigate to /network to discover these?

**Q14. Does the dashboard heartbeat or priority queue include network-sourced items?**
The dashboard has a heartbeat section (upcoming items) and a priority queue (actionable items). A pending handoff is time-sensitive (chef should respond). Does it appear in the priority queue? Or is the priority queue blind to network actions?

---

## G. Search and Network Content (2 questions)

**Q15. Can universal search find connections, collab spaces, or handoffs by name?**
Chef A types "Mike" in the universal search bar. Mike is a connected chef. Is "Mike (Connection)" a search result? Can she search "Henderson handoff" and find the handoff she sent? Or does search only cover clients, events, recipes, and inquiries?

**Q16. Can search surface shared recipes or recipes received from other chefs?**
Chef A accepted a shared recipe "Truffle Risotto" from Chef B. She searches "Truffle Risotto." Does it appear in recipe results? It should (it's in her tenant via deep copy). But can she distinguish "received from Chef B" vs "my original"?

---

## H. Onboarding and Network Introduction (2 questions)

**Q17. Does the onboarding flow introduce the chef network feature?**
A new chef signs up and goes through onboarding. The wizard covers clients, recipes, staff. Does it mention the chef network? Does it offer to import connections? Or does a new chef have to discover /network on their own?

**Q18. When a chef receives a handoff or connection request BEFORE completing onboarding, does it break?**
Chef B (new, hasn't finished onboarding) receives a connection request from Chef A. Does the notification render? Can Chef B navigate to /network and accept? Or does the notification fail because Chef B hasn't set up their profile yet?

---

## I. Embeddable Widget and Network (2 questions)

**Q19. Can the embeddable inquiry widget route inquiries to a chef's network when the chef is unavailable?**
A potential client fills out Chef A's embedded inquiry form on her website. Chef A is booked solid that month. Can the widget suggest "Chef A's trusted partners are available" or offer to route to a network chef? Or does it only submit to Chef A's inbox?

**Q20. Does the embeddable widget show any co-hosting or collaboration context?**
Chef A and Chef B co-host a recurring farm dinner. The embed on the farm's website shows Chef A's inquiry form. Does it mention Chef B? Can the client see both chefs? Or is the widget strictly single-chef?

---

## J. Dinner Circles and Event Planning (2 questions)

**Q21. Can a dinner circle be used to recruit collaborators for an event?**
Chef A runs a "Boston Private Chefs" dinner circle. She needs a co-host for a large event. Can she post in the circle to recruit? Does the dinner circle system connect to the event collaborator system? Or are circles social-only with no operational bridge?

**Q22. When a dinner circle member RSVPs to a circle event, does it create a real event in ChefFlow?**
A dinner circle has a scheduled gathering. Members RSVP through the circle UI. Does this create an event record in the host chef's event pipeline? Or are circle events informal (no event record, no financial tracking, no prep timeline)?

---

## Scorecard

| Domain                   | Questions | PASS   | PARTIAL | FAIL  | WONTFIX |
| ------------------------ | --------- | ------ | ------- | ----- | ------- |
| A. Inquiry Pipeline      | Q1-Q3     | 3      | 0       | 0     | 0       |
| B. Financial Ledger      | Q4-Q6     | 2      | 1       | 0     | 0       |
| C. Client Communications | Q7-Q8     | 1      | 1       | 0     | 0       |
| D. Equipment Sharing     | Q9-Q10    | 0      | 0       | 0     | 2       |
| E. Pricing & Ingredients | Q11-Q12   | 0      | 0       | 0     | 2       |
| F. Dashboard Network     | Q13-Q14   | 2      | 0       | 0     | 0       |
| G. Search & Network      | Q15-Q16   | 1      | 1       | 0     | 0       |
| H. Onboarding & Network  | Q17-Q18   | 1      | 0       | 0     | 1       |
| I. Embeddable Widget     | Q19-Q20   | 0      | 0       | 0     | 2       |
| J. Dinner Circles        | Q21-Q22   | 0      | 0       | 0     | 2       |
| **Total**                | **22**    | **10** | **3**   | **0** | **9**   |

### Per-Question Verdicts

| Q   | Verdict | One-Line Summary                                                                                                                                                                                                                           |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | PASS    | Decline modal now shows "Refer to your network instead" link that prepares handoff data and navigates to `/network?tab=handoffs&action=create`. `decline-with-reason-modal.tsx`                                                            |
| Q2  | PASS    | `createCollabHandoff` now calls `transitionInquiry(sourceEntityId, 'declined')` when `sourceEntityType === 'inquiry'`. Inquiry moves out of active pipeline                                                                                |
| Q3  | PASS    | `getHandoffForInquiry` reverse-lookup queries `chef_handoffs` by `source_entity_type/id`. Inquiry detail page shows referral badge with conversion count. No schema change needed                                                          |
| Q4  | PARTIAL | `recordCollabHandoffConversion` updates handoff status and creates client record. No ledger entry yet (blocked on schema: needs `referral_fee_cents` column on handoffs). Referral revenue tracked via `getReferralRevenueSummary` display |
| Q5  | PASS    | `getEventProfitSummary` now queries `subcontract_agreements` and adds subcontract costs to `totalBusinessCents`. Profit margin, per-guest cost, and effective hourly rate all account for subcontractor expenses                           |
| Q6  | PASS    | `CollaborationRevenueCard` on analytics page. `getCollaborationRevenueStats` computes solo vs co-hosted event counts/revenue, subcontract income/expenses, and referral conversion rates                                                   |
| Q7  | PASS    | `coHostNames` prop added to `EventProposedEmail`, `EventConfirmedEmail`, `EventReminderEmail`. Collaborators queried via `event_collaborators` in transitions + lifecycle. "Co-hosted with" row renders in details table                   |
| Q8  | PARTIAL | Inbound email webhook (`api/webhooks/email/inbound`) routes to chef by alias. Cross-chef notification requires mapping reply to event, then to collaborators. Deferred: pipeline complexity, low frequency                                 |
| Q9  | WONTFIX | Equipment is single-tenant by design. Cross-chef equipment visibility adds complexity without clear user value; chefs coordinate equipment verbally or via collab space chat                                                               |
| Q10 | WONTFIX | Same as Q9. Equipment coordination is a collab space conversation, not a system feature. Premature to build                                                                                                                                |
| Q11 | WONTFIX | Price sharing between chefs is a future feature (requires trust model, data ownership rules). Current price catalog is per-tenant                                                                                                          |
| Q12 | WONTFIX | Shopping list consolidation across tenants requires ingredient normalization + trust. Better solved via collab space discussion + manual coordination for now                                                                              |
| Q13 | PASS    | `NetworkActivitySection` widget added to dashboard. Shows pending handoffs, connection requests, and unread collab messages with direct links to /network tabs. Auto-hides when no activity                                                |
| Q14 | PASS    | `getNetworkQueueItems` provider added to priority queue. Surfaces pending handoffs (with budget/expiry scoring) and connection requests. Wired into `buildPriorityQueue` with `'network'` domain                                           |
| Q15 | PASS    | `universalSearch` now searches connections (by chef name), handoffs (by title/occasion), and collab spaces (by name). 16 entity types total. Results grouped under "Chef Network"                                                          |
| Q16 | PARTIAL | Deep-copied recipes ARE searchable (they live in chef's tenant, same as any recipe). But no provenance indicator distinguishes "received from Chef B" vs "my original" in search results                                                   |
| Q17 | PASS    | `chef_network` step added to onboarding wizard (7th step, skippable). `NetworkStep` component introduces handoffs, collaboration, and community board with "Explore Network" CTA                                                           |
| Q18 | WONTFIX | Network features work regardless of onboarding status (Q7 in Phase 1 CLAUDE.md: "No forced onboarding gates"). Connection requests and notifications render for any authenticated chef                                                     |
| Q19 | WONTFIX | Embed widget is single-chef by design (`chefId` param). Network routing adds complexity to an already simple entry point. Out of scope for V1                                                                                              |
| Q20 | WONTFIX | Same as Q19. Embed is a simple inquiry form; collaboration context belongs on the event page, not the intake widget                                                                                                                        |
| Q21 | WONTFIX | Dinner circles are social/guest-facing, not chef-to-chef operational. Collaborator recruitment happens via the network tab (opportunities board). These are intentionally separate systems                                                 |
| Q22 | WONTFIX | Circle events are informal gatherings. Creating formal event records from circle RSVPs would conflate social and operational data. Chef creates event manually if needed                                                                   |

---

## Gap Inventory

> Ranked by impact. P0 = data loss or security. P1 = broken user flow. P2 = missing connection, enhancement.

| #   | Gap                                                                   | Severity | Domain | Fix Approach                                                                                                                                                                          |
| --- | --------------------------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | ~~No "hand off to network" option in inquiry decline flow~~           | ~~P1~~   | A      | **FIXED.** "Refer to your network instead" link added to `decline-with-reason-modal.tsx`                                                                                              |
| G2  | ~~Inquiry status not updated after handoff creation~~                 | ~~P1~~   | A      | **FIXED.** `createCollabHandoff` now calls `transitionInquiry(sourceEntityId, 'declined')` for inquiry-sourced handoffs                                                               |
| G3  | ~~No inquiry-to-handoff traceability~~                                | ~~P2~~   | A      | **FIXED.** `getHandoffForInquiry` reverse-lookup + referral badge on inquiry detail page                                                                                              |
| G4  | Referral revenue is display-only (no ledger entries)                  | P2       | B      | **DEFERRED.** Needs `referral_fee_cents` column on `chef_handoffs` (schema migration). Tracking works via `getReferralRevenueSummary`; ledger entry blocked on fee structure          |
| G5  | ~~Profit summary excludes subcontract costs from margin calculation~~ | ~~P1~~   | B      | **FIXED.** `getEventProfitSummary` now queries `subcontract_agreements` and adds to `totalBusinessCents`                                                                              |
| G6  | ~~Analytics blind to co-hosted events~~                               | ~~P2~~   | B      | **FIXED.** `CollaborationRevenueCard` server component on analytics page. `getCollaborationRevenueStats` computes solo vs co-hosted, subcontract income/expense, referral conversions |
| G7  | ~~Email templates have zero collaborator awareness~~                  | ~~P2~~   | C      | **FIXED.** `coHostNames` prop on 3 event templates + notification wrappers. Collaborators queried in `transitions.ts` and `lifecycle/route.ts`                                        |
| G8  | Client email replies not forwarded to co-host chefs                   | P2       | C      | **DEFERRED.** Inbound webhook maps alias to chef, not event. Requires reply-to-event mapping + collaborator notification. Low frequency in V1                                         |
| G9  | ~~Dashboard missing network activity widgets~~                        | ~~P1~~   | F      | **FIXED.** `NetworkActivitySection` added to dashboard. Shows pending handoffs, connection requests, unread collab messages with links                                                |
| G10 | ~~Priority queue blind to network actions~~                           | ~~P2~~   | F      | **FIXED.** `getNetworkQueueItems` provider in `lib/queue/providers/network.ts`. `'network'` domain added to queue types, build, filters, and summary                                  |
| G11 | ~~Universal search cannot find network entities~~                     | ~~P2~~   | G      | **FIXED.** 3 new entity types (connection, handoff, collab_space) added to `universalSearch`. Searches both sent and received directions                                              |
| G12 | ~~Onboarding does not introduce network feature~~                     | ~~P2~~   | H      | **FIXED.** `chef_network` wizard step added to `onboarding-constants.ts`. `NetworkStep` component with handoffs/collaboration/community intro                                         |
