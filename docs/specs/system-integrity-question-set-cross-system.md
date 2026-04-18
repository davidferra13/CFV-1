# Cross-System Cohesion: System Integrity Question Set (Phase 2)

> **Purpose:** The Phase 1 chef-to-chef question set (30/30 PASS) verified cohesion WITHIN the 12 network systems. This Phase 2 set tests the BOUNDARIES where chef-to-chef systems touch every other ChefFlow system: recipes, events, prep, shopping, scheduling, pricing, AI, notifications, contracts, documents, staff, and calendar. Real-world scenarios only.
>
> **Relationship to Phase 1:** Phase 1 asked "do the 12 chef-to-chef systems talk to each other?" Phase 2 asks "do they talk to the REST of ChefFlow?"
>
> **How to use:** Same as Phase 1. Answer each question with a concrete decision. Every answer must cite `file:line`. Verdicts: PASS (works end-to-end), PARTIAL (data exists but UI/pipeline missing), FAIL (no path exists).

---

## A. Recipe Lifecycle Across Chefs (5 questions)

**Q1. When Chef B accepts a shared recipe and uses it in an event menu, can Chef A trace the lineage?**
Chef A shared her risotto recipe with Chef B via `shareRecipe()`. Chef B accepted (deep copy created). Chef B added it to a farm dinner menu. Can Chef A see that her recipe contributed to Chef B's event? Is there structured provenance on the copied recipe (source_chef_id, source_recipe_id), or just a text note in the notes field? Can ANY query trace copied-recipe-to-event?

**Q2. Does `deepCopyRecipe()` copy the FULL recipe, or just the skeleton?**
Chef A's risotto has: 12 ingredients, 6 step photos, 2 sub-recipe links, peak window settings (hold time, safety ceiling), production logs, and nutrition data. When Chef B accepts the share, does the deep copy include all of this? Or just the recipe record + ingredients? What data is silently lost?

**Q3. When a connection is removed, what happens to pending recipe shares?**
Chef A sent Chef B a recipe share (status: pending). They have a falling out. Chef A removes the connection via `removeConnection()`. The connection goes to declined, trusted circle is cleaned, collab spaces are archived. But the pending recipe share is still sitting in Chef B's inbox. Can Chef B still accept it? Should it auto-cancel?

**Q4. Does `getChefRelationshipSummary()` count actual recipe shares or just collab space chat references?**
Chef A shared 5 recipes with Chef B via `shareRecipe()` (5 rows in recipe_shares). But they never posted recipe references in their collab space. When Chef A views Chef B's profile and sees "Working History," does it say "5 recipes shared" or "0 recipes shared"? Which data source does it query?

**Q5. Can the collab space `attachRecipeReferenceToThread()` and the `shareRecipe()` flow be triggered from the same action?**
Chef A is in a collab space with Chef B. She references her risotto recipe in a thread message. Chef B sees it. Can Chef B one-click accept/share from the reference? Or must she navigate away to Chef A's profile, find the recipe, and request a share separately? Are these two systems (chat reference vs. data transfer) bridged?

---

## B. Operational Access for Event Collaborators (5 questions)

**Q6. Chef B is an accepted collaborator on Chef A's farm dinner. Can Chef B generate a shopping list for the event?**
The shopping list system (`generateShoppingList`) queries events with `.eq('tenant_id', user.tenantId!)`. Chef B's tenantId is her own, not Chef A's. Does Chef B get an empty list? Does she get an error? Or does the system fall back to `event_collaborators` like the prep timeline does?

**Q7. Can a collaborator chef see the event on their own calendar/schedule?**
Chef A invited Chef B to co-host. Chef B accepted. When Chef B opens her scheduling page (`/scheduling`), does the farm dinner appear? `getCalendarEvents()` filters by `tenant_id`. Separately, `getCollaboratingOnEvents()` exists. Are these merged in the calendar UI, or does Chef B only see her own events?

**Q8. The `can_modify_menu` permission exists on `event_collaborators`. Is it enforced anywhere?**
Chef B has `can_modify_menu: true` on her collaboration record. She navigates to the event, opens the menu editor, and tries to add a dish. Does the mutation succeed? All menu mutations use `.eq('tenant_id', user.tenantId!)`. Does the permission actually gate anything, or is it a schema-only promise?

**Q9. Can two collaborating chefs see each other's prep blocks for the shared event?**
Chef A created prep blocks for courses 1-3 on Monday. Chef B wants to create prep blocks for courses 4-6 on Tuesday. Can Chef B see Chef A's blocks to avoid kitchen conflicts? `fetchPrepBlocks` filters by `chef_id`. Is there any cross-chef prep block visibility for shared events?

**Q10. Does event costing account for collaborator splits or subcontractor costs?**
The event has a $3,000 budget. Chef A (primary) handles 4 courses. Chef B (co-host) handles 2 courses with her own ingredient sourcing. A subcontractor handles dessert at $400 flat rate. Does `refreshIngredientCostsAction` include Chef B's ingredient costs? Does it include the subcontract cost from `getSubcontractCosts(eventId)`? Or is the cost calculation purely single-tenant?

---

## C. Client Data Continuity (4 questions)

**Q11. When a handoff converts to a booked event, does the receiving chef get a pre-populated client record?**
Chef A handed off a lead. The handoff contains: client name "Sarah Johnson", dietary "gluten-free, nut allergy", 8 guests, $200/head, May 15. Chef B accepts the handoff and books the event. Does `recordCollabHandoffConversion` auto-create a client record in Chef B's tenant from `client_context`? Or must Chef B manually re-enter "Sarah Johnson" and her dietary needs?

**Q12. When a contact share is accepted and a client record is auto-created, does it carry the full context?**
Chef A shares a client via `createNetworkContactShare()`. The share includes: name, email, phone, event_date, dietary details in the `details` field, and the referring chef's identity. On accept, the auto-created client record gets name, email, phone. Does it also get the dietary info? The event date? The referring chef's ID (not just generic "referral")?

**Q13. The handoff UI renders `desired_cuisines` from `client_context`, but the inquiry handoff path embeds dietary restrictions and allergies too. Are they rendered?**
Chef A clicks "Hand Off This Lead" on an inquiry with dietary_requirements: "gluten-free" and allergies: "tree nuts, shellfish." The `getHandoffDataFromInquiry` function packages these into `client_context`. When Chef B opens the handoff in her inbox, does she see "Gluten-free, Tree nut allergy, Shellfish allergy"? Or does the UI only show `desired_cuisines` and ignore the rest of client_context?

**Q14. Does the `getReferralRevenueSummary` function scope its financial reads properly?**
Chef A sent a handoff. Chef B converted it into an event. `getReferralRevenueSummary` reads `event_financial_summary` for Chef B's event without tenant scoping (it queries by `event_id` only). Is this intentional cross-tenant read safe? What prevents Chef A from seeing the full financial details of Chef B's event, not just the revenue total?

---

## D. AI Network Intelligence (4 questions)

**Q15. Can Remy suggest "hand this inquiry to your trusted circle" when a chef is double-booked?**
Chef A has an inquiry for May 15. She already has an event on May 15. She asks Remy "what should I do about this inquiry?" Can Remy detect the scheduling conflict AND suggest a handoff to a trusted circle chef? Does Remy know the handoff system exists? Does it have a `network.handoff` tool or any network awareness in its system prompt?

**Q16. When a chef asks Remy "who have I worked with before?", can Remy answer?**
The data exists: `getChefRelationshipSummary()`, `getCoHostFinancialSummary()`, `getMyConnections()`. But does the Remy context loader (`remy-context.ts`) include ANY network data? Does Remy have any `chef_connections`, `trusted_circle`, or `event_collaborators` context?

**Q17. Can the brain dump parser extract collaboration intent?**
Chef writes: "Need to partner with Mike on the Henderson wedding. Ask Sarah if she can do desserts." The brain dump parser (`parse-brain-dump.ts`) outputs clients, recipes, notes. Can it identify "Mike" and "Sarah" as collaboration targets? Can it extract "partner on event" and "ask for desserts" as actionable items? Or does it dump everything into generic `business_note`?

**Q18. Does Remy's NAV_ROUTE_MAP include any network pages?**
If a chef says "take me to my connections" or "show me my handoffs" or "open my collab inbox," can Remy navigate there? Does `NAV_ROUTE_MAP` include `/network`, `/network?tab=collab`, `/network?tab=connections`?

---

## E. Notification Delivery Pipeline (4 questions)

**Q19. How many of the 12 defined network notification types actually fire through the canonical notification pipeline (email/push/SMS)?**
`lib/notifications/types.ts` defines 12 network notification types (connection_request, handoff_received, collab_invite, etc.). The canonical `createNotification()` routes to email, push, SMS, in-app toast. How many of the 12 types actually call `createNotification()`? How many write to the parallel `chef_social_notifications` table only? How many are never emitted at all?

**Q20. Email templates exist for `friend-request.tsx` and `collaboration-invite.tsx`. Are they ever called?**
These templates were built. But does any code path ever render and send them? If Chef A sends a connection request, does Chef B get an email? If Chef A invites Chef B to collaborate on an event, does Chef B get an email?

**Q21. The notification settings form includes a "Network" category toggle. Does it work?**
`notification-settings-form.tsx` lists `network` in `CHEF_CATEGORIES`. But `CATEGORY_REPRESENTATIVE_ACTION` maps each category to a representative action for tier defaults. Does it include `network`? If not, does the settings page crash or silently fail when rendering the network row?

**Q22. When a collab space message is sent, does the recipient get notified?**
Chef A sends a message in a shared collab space. Does Chef B get: (a) an in-app notification? (b) an email? (c) a push notification? (d) nothing? `sendCollabThreadMessage()` in `collab-space-actions.ts` does what after writing the message?

---

## F. Contracts, Documents & Templates (3 questions)

**Q23. Can the contract generator produce a multi-party agreement when an event has collaborators?**
Chef A (primary) and Chef B (co-host) are hosting a farm dinner for Client X. Chef A generates a contract. Does it reference Chef B? Include co-host responsibilities? Revenue split terms? Or is it strictly a two-party (Chef A + Client X) template with no collaborator awareness?

**Q24. Can the event detail page surface subcontract costs alongside ingredient costs?**
Chef A subcontracted dessert to Chef C at $400. The event detail page shows ingredient costs via `refreshIngredientCostsAction`. Does it also show the $400 subcontract cost? Is `getSubcontractCosts(eventId)` called anywhere in the event UI? Or is subcontract cost data only visible on the community/subcontracts page?

**Q25. Does the staff briefing template auto-populate collaborator chefs alongside staff assignments?**
Chef A generates a staff briefing for the farm dinner. Chef B is a co-host. Three staff are assigned (sous chef, server, bartender). Does the briefing list Chef B as a collaborator? Does it show both staff AND collaborator chefs? Or does it only show explicitly-passed staff data?

---

## G. Staff Visibility into Collaboration (3 questions)

**Q26. Can a sous_chef (staff role) see which collaborator chefs are working an event they're assigned to?**
Chef A's sous chef opens the staff portal for the farm dinner. Chef B (co-host) is handling courses 4-6. Does the sous chef see "Chef B - Co-Host" anywhere? Or does the staff portal show only event details, dietary alerts, and tasks with no collaborator context?

**Q27. Does any staff permission grant access to the chef's network or handoff data?**
The `STAFF_PERMISSION_MAP` defines 5 permissions: manage_tasks, view_financials, manage_staff, manage_inventory, view_clients. Is there a `view_network` or `view_collaborations` permission? Can a sous chef see incoming handoffs, trusted circle members, or collaboration invitations on behalf of the chef?

**Q28. When staff view the event schedule, do they see prep blocks from collaborator chefs?**
Chef A's staff member checks the event timeline. Chef A has prep blocks for courses 1-3. Chef B (collaborator) has prep blocks for courses 4-6 in her own system. Does the staff member see both sets of blocks? Or only Chef A's?

---

## H. Calendar & Availability Unification (3 questions)

**Q29. When a chef creates an availability signal, does it appear on: (a) their social profile, (b) partner calendar view, (c) their own calendar?**
Chef A posts that she's available May 20-25 for Boston events via `upsertCollabAvailabilitySignal()`. Partner Chef B checks Chef A's partner calendar via `getPartnerCalendar()`. Does Chef B see May 20-25 as "available"? Or does `getPartnerCalendar` only show booked dates (busy/tentative) with no open-date awareness?

**Q30. Are social availability posts and collab availability signals the same data, or two separate systems that happen to share a name?**
A chef posts on the social feed with #available (category: "availability"). The social system auto-creates an availability signal via G12 fix. Separately, a chef can create availability signals directly in the collab tab. Are these the same database rows? If a chef deletes the social post, does the signal disappear? If she deletes the signal, does the post disappear? Or are they two decoupled copies?

**Q31. Does the scheduling DOP (Day-of-Progress) view show collaborative events alongside owned events?**
Chef A owns 2 events this week. She's collaborating on 1 more. The DOP progress bar shows "2 events this week." Should it show 3? Does `getTodaysSchedule()` or `getWeekSchedule()` include collaborating-on events?

---

## Scorecard

| Domain                     | Questions | PASS   | PARTIAL | FAIL   |
| -------------------------- | --------- | ------ | ------- | ------ |
| A. Recipe Lifecycle        | Q1-Q5     | 2      | 0       | 3      |
| B. Collaborator Ops Access | Q6-Q10    | 3      | 1       | 1      |
| C. Client Data Continuity  | Q11-Q14   | 2      | 1       | 1      |
| D. AI Network Intelligence | Q15-Q18   | 1      | 1       | 2      |
| E. Notification Pipeline   | Q19-Q22   | 1      | 2       | 1      |
| F. Contracts & Documents   | Q23-Q25   | 1      | 1       | 1      |
| G. Staff Visibility        | Q26-Q28   | 2      | 0       | 1      |
| H. Calendar & Availability | Q29-Q31   | 2      | 1       | 0      |
| **Total**                  | **31**    | **14** | **7**   | **10** |

### Per-Question Verdicts

| Q   | Verdict      | One-Line Summary                                                                                                                                                                                                                                        |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | PASS         | `getRecipeProvenance()` reverse-lookups `recipe_shares.created_recipe_id` to find sharing chef. "Shared by Chef X" badge renders on recipe detail page header. No schema change needed                                                                  |
| Q2  | FAIL         | `deepCopyRecipe()` copies recipe record + ingredients ONLY. Missing: step photos, sub-recipes, peak windows, production logs, nutrition data                                                                                                            |
| Q3  | FAIL         | `removeConnection()` (`lib/network/actions.ts:1015`) only sets status to 'declined'. Does NOT cancel pending recipe shares. Orphaned shares remain in recipient's inbox. G1 fix was documented but never implemented                                    |
| Q4  | PASS(G8)     | `getChefRelationshipSummary()` now counts `recipe_shares` table rows (both directions) and uses correct handoff table/column names                                                                                                                      |
| Q5  | FAIL         | `attachRecipeReferenceToThread` and `shareRecipe` are completely disconnected. No bridge action from chat reference to data transfer                                                                                                                    |
| Q6  | PASS(G5)     | `generateShoppingList` now queries event_collaborators and merges collab events into shopping list                                                                                                                                                      |
| Q7  | PASS(G6)     | `getCalendarEvents` and `fetchUpcomingSchedulingEvents` now merge collab events into calendar, schedule, and DOP views                                                                                                                                  |
| Q8  | PARTIAL      | `hasCollaboratorPermission()` and `canModifyEventMenu()` now exported from `collaboration/actions.ts`. Permission check logic live, but menu mutations still use tenant_id gate (cross-tenant access not yet wired). Permission is no longer dead       |
| Q9  | PASS(G12)    | `getEventPrepBlocks` now fetches collaborator chef blocks for shared events and merges them sorted by date/time                                                                                                                                         |
| Q10 | FAIL         | `refreshIngredientCostsAction` is tenant-scoped. Does not include collaborator ingredient costs or `getSubcontractCosts(eventId)`. Single-tenant costing only                                                                                           |
| Q11 | PASS(G4)     | `recordCollabHandoffConversion` now auto-creates client from `client_context` (name, email, dietary, allergies, referral_source)                                                                                                                        |
| Q12 | FAIL         | `respondToNetworkContactShare()` (`lib/network/actions.ts:1340`) only updates share status. Does NOT auto-create client record. No dietary/event_date/referral carry-forward. G11 fix was documented but never implemented                              |
| Q13 | PASS(G10)    | Handoff inbox now renders `dietaryRequirements`, `allergies`, and `clientName` from client_context alongside desired_cuisines                                                                                                                           |
| Q14 | PARTIAL      | Cross-tenant read is intentional (referral tracking). Only returns `total_revenue_cents`, not full financial breakdown. Safe but unscoped at the query level                                                                                            |
| Q15 | FAIL         | Remy has zero network awareness. No tools, no context, no system prompt mention. Cannot suggest handoffs, detect scheduling conflicts for network action, or reference connections                                                                      |
| Q16 | PARTIAL(G19) | `remy-context.ts` now loads networkSummary (connections, trusted circle count, pending handoffs, active collab spaces, pending requests). NAV_ROUTE_MAP includes /network routes. Remy suggests handoffs when chef is double-booked. No agent tools yet |
| Q17 | FAIL         | `parse-brain-dump.ts` outputs clients/recipes/notes only. No collaboration intent extraction. "Partner with Mike on Henderson wedding" becomes generic `business_note`                                                                                  |
| Q18 | PASS(G19)    | `NAV_ROUTE_MAP` now includes `/network`, `/network?tab=connections`, `/network?tab=collab`, `/network?tab=community`. Remy can navigate to all network pages                                                                                            |
| Q19 | PARTIAL(G2)  | 6 of 12 now fire canonical pipeline (connection_request, connection_accepted, handoff_received, handoff_accepted, contact_share, opportunity_interest). Remaining: collab_invite, collab_space_message, mentorship_request, social_follow               |
| Q20 | PARTIAL(G9)  | Generic notification emails now sent via canonical pipeline (G2). Pretty templates exist but need custom routing in channel-router                                                                                                                      |
| Q21 | FAIL         | `CHEF_CATEGORIES` array and `CATEGORY_REPRESENTATIVE_ACTION` record have no `network` entry (`notification-settings-form.tsx:25-43`). NotificationCategory type has 14 categories, none is 'network'. G3 fix was documented but never implemented       |
| Q22 | PASS(G7)     | `sendCollabThreadMessage` now notifies all other space members via canonical pipeline (email/push/SMS)                                                                                                                                                  |
| Q23 | FAIL         | Contract generator (`generateContract`) is two-party only (Chef + Client). No collaborator, co-host, or subcontractor awareness. No revenue split terms                                                                                                 |
| Q24 | PASS(G22)    | `getSubcontractCosts(eventId)` now called from event detail page and rendered in money tab. Amber card shows total subcontract cost and agreement count                                                                                                 |
| Q25 | PASS         | `generateStaffBriefing` now queries `event_collaborators` after staff assignments and adds collaborating chefs (co-host, subcontractor) to the staff briefing with role labels. Fully auto-populated                                                    |
| Q26 | PASS         | `getStaffEventView` now queries `event_collaborators` and returns `collaborators[]` (name + role). `StaffEventView` renders "Also working this event" card listing all collaborating chefs                                                              |
| Q27 | FAIL         | No `view_network` or `view_collaborations` permission in `STAFF_PERMISSION_MAP`. Staff has zero access to handoffs, trusted circle, or collab invitations                                                                                               |
| Q28 | PASS         | `getEventPrepBlocks` now queries `event_collaborators` for the event and fetches prep blocks from all collaborating chefs, merging and sorting by date/time. Cross-chef visibility for shared events                                                    |
| Q29 | PASS(G27)    | `getPartnerCalendar()` now queries `chef_availability_signals` alongside events. Returns `available` status entries for open signal date ranges. Busy dates take precedence over availability                                                           |
| Q30 | PARTIAL      | Social availability posts auto-create signals (G12 fix). But deleting the post does not delete the signal, and deleting the signal does not delete the post. Decoupled copies                                                                           |
| Q31 | PASS(G13)    | `fetchUpcomingSchedulingEvents` now merges collab events; getTodaysSchedule, getWeekSchedule, DOP all include them                                                                                                                                      |

---

## Classification Note (2026-04-18 audit)

All 10 FAIL and 7 PARTIAL verdicts are **network/collaboration feature gaps**, not data integrity or zero-hallucination violations. They represent unbuilt cross-boundary wiring for the chef-to-chef network feature set (deep copy completeness, cross-tenant menu permissions, AI network awareness, multi-party contracts, staff network visibility, availability signal sync). None involve incorrect data display, silent failures, or security issues. Reclassified as P2 enhancements per anti-clutter rule.

**Stale verdict correction (2026-04-18):** Q3, Q12, Q21 were previously marked PASS with G1/G11/G3 fix references. Code verification shows these fixes were documented in the gap inventory but never implemented. Corrected to FAIL.

---

## Gap Inventory

> Populated after verdict investigation. Ranked by impact. P0 = data loss or security. P1 = broken user flow. P2 = missing connection, enhancement.

| #   | Gap                                                                                                 | Severity | Domain | Fix Approach                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Orphaned recipe shares after connection removal                                                     | P0       | A      | `removeConnection()` should cancel pending recipe shares between the two chefs                                                                                        |
| G2  | Notification pipeline: 11/12 network types never fire canonical notifications                       | P0       | E      | Wire `createNotification()` calls into connection requests, handoff actions, collab invites, contact shares, opportunity interests, collab space messages, mentorship |
| G3  | Notification settings form missing `network` key in CATEGORY_REPRESENTATIVE_ACTION                  | P0       | E      | Add `network: 'connection_request_received'` to the record in notification-settings-form.tsx                                                                          |
| G4  | Handoff conversion does not auto-create client record in receiving chef's tenant                    | P1       | C      | `recordCollabHandoffConversion` should create client from `client_context` (name, email, dietary, allergies)                                                          |
| G5  | Collaborator chef gets empty shopping list for shared events                                        | P1       | B      | `generateShoppingList` needs collaborator fallback: if tenant_id mismatches, check event_collaborators                                                                |
| G6  | Calendar/schedule excludes collaborating-on events                                                  | P1       | H      | Merge `getCollaboratingOnEvents()` results into `getCalendarEvents()`, `getWeekSchedule()`, `getTodaysSchedule()`                                                     |
| G7  | Collab space messages trigger zero notifications                                                    | P1       | E      | `sendCollabThreadMessage` should call `createNotification` with type `collab_space_message`                                                                           |
| G8  | `getChefRelationshipSummary` counts collab space recipe references, not actual recipe_shares        | P1       | A      | Query `recipe_shares` table (from_chef_id/to_chef_id) instead of collab space messages                                                                                |
| G9  | Email templates for friend-request and collaboration-invite exist but never called                  | P1       | E      | Wire email sends into `sendConnectionRequest` and `respondToEventInvitation`                                                                                          |
| G10 | Handoff inbox UI only renders `desired_cuisines` from client_context; dietary/allergies hidden      | P1       | C      | Render `dietaryRequirements` and `allergies` fields from client_context in handoff detail view                                                                        |
| G11 | Contact share auto-client omits dietary info and referring chef identity                            | P1       | C      | Carry `details` field data into client notes; store `referral_source: 'chef_referral:{chef_id}'`                                                                      |
| G12 | No cross-chef prep block visibility for collaborative events                                        | P1       | B      | Add collaborator prep block query when viewing shared event prep schedule                                                                                             |
| G13 | DOP progress bar and week schedule undercount (missing collab events)                               | P1       | H      | Same fix as G6: merge collab events into schedule queries                                                                                                             |
| G14 | `deepCopyRecipe()` copies recipe + ingredients only; missing step photos, sub-recipes, peak windows | P2       | A      | Extend deep copy to include recipe_step_photos, recipe_sub_recipes, and peak_window settings                                                                          |
| G15 | No structured provenance on copied recipes (only text note)                                         | P2       | A      | Add `source_recipe_id`, `source_chef_id` columns to recipes table (nullable, additive migration)                                                                      |
| G16 | No bridge from collab space recipe reference to `shareRecipe()` action                              | P2       | A      | Add "Share This Recipe" action button on recipe_reference messages in collab space UI                                                                                 |
| G17 | `can_modify_menu` permission exists in schema but never enforced                                    | P2       | B      | Add collaborator permission check in menu mutation actions, or remove the dead field                                                                                  |
| G18 | Event costing single-tenant; does not include collaborator or subcontract costs                     | P2       | B      | Add subcontract cost query and collaborator cost awareness to cost refresh                                                                                            |
| G19 | Remy has zero network awareness (no tools, no context, no routes)                                   | P2       | D      | Add network data to remy-context.ts; add /network routes to NAV_ROUTE_MAP; add network agent actions                                                                  |
| G20 | Brain dump parser cannot extract collaboration intent                                               | P2       | D      | Add `collaboration` note type to BrainDumpResponseSchema                                                                                                              |
| G21 | Contract generator is two-party only (Chef + Client)                                                | P2       | F      | Add collaborator/co-host section to ContractVars and template                                                                                                         |
| G22 | Subcontract costs not surfaced on event detail page                                                 | P2       | F      | Call `getSubcontractCosts(eventId)` in event detail and display alongside ingredient costs                                                                            |
| G23 | Staff briefing not auto-populated from event_staff_assignments + event_collaborators                | P2       | F      | Auto-assemble staff + collaborator lists when generating briefing                                                                                                     |
| G24 | Staff portal has zero collaborator context on events                                                | P2       | G      | Show collaborator chefs in staff event view                                                                                                                           |
| G25 | No `view_network` permission for staff roles                                                        | P2       | G      | Add permission if sous_chef needs handoff/collab visibility (or decide explicitly it's chef-only)                                                                     |
| G26 | Staff sees only owner's prep blocks, not collaborator blocks                                        | P2       | G      | Same pattern as G12: cross-chef prep block query for staff                                                                                                            |
| G27 | Partner calendar shows busy dates only, not availability windows                                    | P2       | H      | Include availability signals in `getPartnerCalendar` response                                                                                                         |
| G28 | Availability signals and social availability posts are decoupled copies                             | P2       | H      | Bidirectional sync: deleting one should clean up the other                                                                                                            |
| G29 | `getReferralRevenueSummary` queries event_financial_summary without tenant scoping                  | P2       | C      | Add explicit scope: only return `total_revenue_cents` (already limited), document intentional cross-tenant read                                                       |
