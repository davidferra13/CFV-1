# Operational Workflow Interrogation

> Real-world chef operations stress test. Every question derived from actual private chef dinner workflows.
> Tests whether ChefFlow can fully replace: phone notes, Instagram, text messages, whiteboards, and memory.
> Each question is binary PASS/FAIL. "Mostly works" is not passing. All questions benefit all users unless marked (SPECIFIC).
>
> **Source:** April 16, 2026 dinner scenario (6-guest women's dinner, repeat client, 5 courses, 21 components, $125/head)
> **Companion data:** `memory/project_dinner_stress_test_april16.md`
>
> **Scored: 2026-04-16** | **16 PASS, 12 PARTIAL, 17 FAIL** | Grade: ChefFlow cannot yet replace manual workflow

---

## Coverage Map

| Q    | Title                                   | Phase    | Status | Tier     |
| ---- | --------------------------------------- | -------- | ------ | -------- |
| OW1  | Per-Person Pricing on Event Form        | Pricing  | SPEC   | UI       |
| OW2  | Group Payment Attribution               | Pricing  | SPEC   | Schema   |
| OW3  | Price-Per-Head Auto-Calculation         | Pricing  | SPEC   | UI       |
| OW4  | Chef Arrival Time on Event Form         | Event    | SPEC   | UI       |
| OW5  | Service Style on Event Form             | Event    | SPEC   | UI       |
| OW6  | Per-Event Dietary Override              | Event    | SPEC   | UI       |
| OW7  | Guest Count Change Audit Trail          | Event    | SPEC   | Logic    |
| OW8  | Guest Count Mid-Planning Impact         | Event    | SPEC   | Logic    |
| OW9  | Multi-Option Menu Proposal              | Menu     | SPEC   | Workflow |
| OW10 | Client Menu Selection Flow              | Menu     | SPEC   | Workflow |
| OW11 | Menu Delivery as Visual (Image/PDF)     | Menu     | SPEC   | UI       |
| OW12 | Optional/Tentative Menu Items           | Menu     | SPEC   | Schema   |
| OW13 | Menu Priority Tiers (Kill List)         | Menu     | SPEC   | Schema   |
| OW14 | Course-Level Portion Lock               | Portions | SPEC   | UI       |
| OW15 | Portion-Per-Guest Display               | Portions | SPEC   | UI       |
| OW16 | Portion Adequacy Indicator              | Portions | SPEC   | Logic    |
| OW17 | Sub-Recipe Composition in UI            | Recipes  | SPEC   | UI       |
| OW18 | Recipe Rebuild Detection                | Recipes  | SPEC   | Logic    |
| OW19 | Ingredient Overlap in Planning          | Recipes  | SPEC   | UI       |
| OW20 | Recipe Scaling for Guest Count          | Recipes  | SPEC   | Logic    |
| OW21 | Prep Day Assignment per Component       | Prep     | SPEC   | UI       |
| OW22 | Prep Timeline Backward from Serve Time  | Prep     | SPEC   | UI       |
| OW23 | Make-Ahead vs Day-Of in Event View      | Prep     | SPEC   | UI       |
| OW24 | Shopping List from Full Menu            | Shopping | SPEC   | Logic    |
| OW25 | Ingredient Consolidation Accuracy       | Shopping | SPEC   | Logic    |
| OW26 | Shopping List with Overlap Grouping     | Shopping | SPEC   | UI       |
| OW27 | Client Relationship Origin Date         | Client   | SPEC   | Schema   |
| OW28 | Client Event Context Variety            | Client   | SPEC   | UI       |
| OW29 | Visual Meal Archive (Instagram Replace) | Client   | SPEC   | UI       |
| OW30 | Client Preference Reconstruction        | Client   | SPEC   | UI       |
| OW31 | Dish Repetition Warning Visibility      | Client   | SPEC   | UI       |
| OW32 | Dish Frequency on Client Profile        | Client   | SPEC   | UI       |
| OW33 | Communication Thread per Event          | Comms    | SPEC   | UI       |
| OW34 | Menu Iteration Chat Trail               | Comms    | SPEC   | Workflow |
| OW35 | Same-Day Confirmation Workflow          | Comms    | SPEC   | Workflow |
| OW36 | Client-Facing Event Link                | Portal   | SPEC   | UI       |
| OW37 | Client Menu View and Feedback           | Portal   | SPEC   | Workflow |
| OW38 | Execution Timeline on Event Day         | Exec     | SPEC   | UI       |
| OW39 | Course Fire Sequence                    | Exec     | SPEC   | UI       |
| OW40 | Post-Event Dish Photo Capture           | Post     | SPEC   | UI       |
| OW41 | Site/Kitchen Notes on Event Form        | Event    | SPEC   | UI       |
| OW42 | Relationship Duration Display           | Client   | SPEC   | UI       |
| OW43 | Creative Inspiration Capture            | Recipes  | SPEC   | Schema   |
| OW44 | Multi-Context Client Booking            | Client   | SPEC   | UI       |
| OW45 | Event Form Field Completeness           | Event    | SPEC   | UI       |

---

## Phase 1: Pricing Reality

Every chef prices differently. The most common model for private dinners is per-person. The system must handle it natively.

**OW1. Per-Person Pricing on Event Form**
The `events` table has `pricing_model` (per_person/flat_rate/custom) and `price_per_person_cents`. Can a chef select "per person" pricing and enter $125/head directly on the event creation form? Currently, the form only exposes a flat "Quoted Price ($)" input. The per-person columns exist in the schema but are not on the form. A chef entering $125/head for 6 guests should see $750 auto-calculated total.

**OW2. Group Payment Attribution**
A dinner for 6 women at $125/head where the group agreed on pricing (not just the host paying). Can the system represent that this is a group-funded event? Can split billing be configured per event? The `split_billing` JSONB column exists on events. Is there UI to configure it? Most private chef dinners for friend groups involve either one person paying or the group splitting.

**OW3. Price-Per-Head Auto-Calculation**
When guest count changes (8 to 6), does the total automatically recalculate? If pricing is $125/head and guests drop from 8 ($1,000) to 6 ($750), the quote total should update. Does it? Or must the chef manually recalculate and re-enter?

---

## Phase 2: Event Creation Completeness

The event form is the single most important input surface. Every field the chef needs during planning and execution must be capturable at creation or editable before service.

**OW4. Chef Arrival Time on Event Form**
The chef arrives at 5:00 PM, serves at 7:15. `arrival_time` exists in the schema. Can the chef enter this on the event form? The timeline engine reads `arrival_time` to compute backward scheduling, but if the chef cannot set it at creation, the timeline runs on incomplete data. Every chef has a different arrival-to-service gap.

**OW5. Service Style on Event Form**
Plated, buffet, family style, cocktail, tasting menu: each fundamentally changes portion planning, staffing, and equipment. `service_style` exists as an enum in the schema. Can a chef select it when creating an event? Currently defaults to 'plated' with no UI to change it.

**OW6. Per-Event Dietary Override**
Client "M" has no allergies. But if she hosted a dinner where one guest was celiac, the chef needs to set event-level dietary restrictions that differ from the client profile. Currently, allergies/restrictions auto-inherit from the client and display as read-only on the event form. Can a chef override them per event?

**OW7. Guest Count Change Audit Trail**
Guest count went from 8 to 6. The `guest_count_changes` table exists with columns for previous/new count, price impact, and surcharge tracking. But `requestGuestCountUpdate` does not write to it. Is the audit trail functional? A chef needs to see: "Original: 8, Changed to 6 on April 10, No price impact." This matters for quoting disputes and menu planning history.

**OW8. Guest Count Mid-Planning Impact**
When guest count changes after the menu is drafted, what happens? Does portion math auto-recalculate? Does the shopping list update? Does the prep timeline adjust? Or must the chef manually propagate the change through every downstream system?

**OW41. Site/Kitchen Notes on Event Form**
Chef arrives at a client's home and needs to know: kitchen layout, access instructions, parking, site-specific notes. `site_notes`, `kitchen_notes`, `access_instructions`, `location_notes` all exist in the schema. None are on the event form. Can the chef capture "ring doorbell, enter through side gate, small kitchen, no stand mixer" at event creation?

**OW45. Event Form Field Completeness**
Counting all schema columns that accept user input vs. what the event form actually exposes: how many fields are in the database but invisible to the chef during creation? Each missing field is context the chef must track elsewhere (notes, memory, text messages) instead of in the system.

---

## Phase 3: Menu Development Workflow

This is where ChefFlow must replace text messaging. The real workflow is: chef sends options, client picks and refines, chef finalizes. Not: chef builds one menu and shares it.

**OW9. Multi-Option Menu Proposal**
The chef sent multiple menu options for the client to choose from. Can a chef create 2-3 menu drafts for the same event and share them simultaneously for the client to compare? Current flow: one menu per event, shared via approval portal. Real workflow: "Here are three directions we could go. Pick what speaks to you."

**OW10. Client Menu Selection Flow**
After receiving options, the client picked specific items across proposals ("apps from Option A, pasta from Option B"). Can the client mix and match across proposals? Can the chef easily compose a final menu from the client's selections? This is the most common menu development pattern for collaborative clients.

**OW11. Menu Delivery as Visual (Image/PDF)**
The chef sent the menu as an image, not text. The Front-of-House Menu Generator produces styled HTML with 10 templates. Can the chef export this as an image (PNG/JPG) for texting to a client? Many clients (especially repeat/casual) don't log into portals. They want a pretty picture in their text thread.

**OW12. Optional/Tentative Menu Items**
The chef considered a "frozen fruit riot candy" as an optional addition. Can menu items be marked as tentative/optional? This affects shopping lists (don't buy for optional items unless confirmed), prep planning (schedule only if doing it), and client communication (show as "possible addition").

**OW13. Menu Priority Tiers (Kill List)**
The chef categorized dishes as Critical (ravioli, chicken, tart), Support (carrots, chips, dips), and Optional (frozen fruit candy). If execution gets overwhelming, cut Optional first, then simplify Support. Can the system assign priority tiers to menu components so the chef has a pre-decided kill list?

---

## Phase 4: Portion Intelligence

Chefs think in portions per guest per course. The system must match this mental model.

**OW14. Course-Level Portion Lock**
The chef locked: 3 bites (apps), 5 ravioli (pasta), 1 thigh (main), 1/7 tart (dessert). Can portions be set per course per guest as a discrete, visible value? Not buried in recipe yield math, but front-and-center: "This course = X per person."

**OW15. Portion-Per-Guest Display**
When viewing a menu attached to a 6-guest event, can the chef see at a glance: "18 bites total (3pp), 30 ravioli total (5pp), 6 thighs total (1pp)"? The system has `portion_quantity` per component and `guest_count` on the event. Is the multiplication displayed?

**OW16. Portion Adequacy Indicator**
The professional portion standards library exists (`lib/recipes/portion-standards.ts`). When a chef sets portions, does the system flag if they're outside standard ranges? Example: 8oz protein for a multi-course dinner with rich apps is too much. Does the system nudge?

---

## Phase 5: Recipe Architecture

A "5-dish dinner" is actually 18-21 independent recipes. The system must handle composition without overwhelming the chef.

**OW17. Sub-Recipe Composition in UI**
The `recipe_sub_recipes` table enables nesting (Chocolate Tart = shell + ganache + caramel + blueberry + gelato). Is the UI for creating and viewing sub-recipes discoverable and usable? Can a chef build a composed dish and see all its parts in one view? Or is sub-recipe management buried in settings?

**OW18. Recipe Rebuild Detection**
The chef said: "every time I do a dinner, even something I've made before, I rewrite everything from scratch." When creating a new recipe, does the system detect that a similar recipe already exists? "You already have 'Brown Butter Sage Sauce' in your library. Use it?" This prevents recipe bloat and saves the chef from rebuilding what they already captured.

**OW19. Ingredient Overlap in Planning View**
"A lot of these dishes overlap heavily in ingredients, which makes it harder to break everything down." When viewing a full menu, can the chef see which ingredients appear in multiple dishes? Not just in the shopping list (post-planning), but during menu composition (pre-planning). "Butter appears in 4 of your 5 courses. Heavy cream in 3."

**OW20. Recipe Scaling for Guest Count**
`recipe-scaling.ts` exists with sub-linear spice scaling. When a recipe yields 4 portions and the event has 6 guests, does the ingredient list auto-scale on the recipe view within the event context? Or does the chef see the base recipe and do mental math?

---

## Phase 6: Prep Orchestration

The chef's whiteboard had two columns: "Before" and "Day-Of." The system must match this mental model.

**OW21. Prep Day Assignment per Component**
`prep_day_offset` exists on components (-1 = day before, 0 = day of). Is there a UI where the chef drags or assigns each component to a prep day? Can they see the full menu split into "Tonight" vs "Tomorrow" columns?

**OW22. Prep Timeline Backward from Serve Time**
Three timeline engines exist (deterministic, AI, template). All work backward from `serve_time`. But can the chef SEE the computed timeline? "5:00 arrive, 5:15 setup, 5:30 fire apps prep, 6:00 start chicken..." Is this rendered on an event page or just computed internally?

**OW23. Make-Ahead vs Day-Of in Event View**
On the event detail page for tomorrow's dinner, can the chef see a clean split: "Make tonight: onion base, tart, confit garlic, gelato base, ravioli dough" vs "Tomorrow: assemble grilled cheese, boil ravioli, sear chicken, plate dessert"? Is this a single, scannable view?

---

## Phase 7: Shopping Intelligence

The shopping list is the first physical output. It must be complete, consolidated, and scaled.

**OW24. Shopping List from Full Menu**
An event has 5 courses, 21 components, 18 recipes. Can the chef generate one shopping list covering everything? Does it pull from all sub-recipes? Does it handle components without linked recipes (free-text dishes)?

**OW25. Ingredient Consolidation Accuracy**
Butter appears in grilled cheese, brown butter sauce, garlic butter, tart shell, and gelato. When the shopping list generates, is "butter" one line with the total across all recipes? Or does it appear 5 times? Unit conversion: if one recipe uses cups and another uses tablespoons, does the system normalize?

**OW26. Shopping List with Overlap Grouping**
Beyond consolidation: can the chef see WHERE each ingredient is used? "Butter: 2 cups (brown butter sauce) + 4 tbsp (garlic butter) + 1/2 cup (tart shell) + 3 tbsp (gelato base) = total X." The `sources` array exists in `getMenuShoppingList()`. Is it rendered in the UI?

---

## Phase 8: Client Knowledge System

ChefFlow must replace: phone notes, Instagram, memory, years of text messages. This is the highest-leverage category.

**OW27. Client Relationship Origin Date**
A chef has known "M" for years but just started using ChefFlow. `created_at` shows the record creation date, not when the relationship started. Is there a "First met" or "Relationship since" date field so the system accurately reflects "3-year client" instead of "2-week client"?

**OW28. Client Event Context Variety**
Client "M" hires for different contexts: couple dinner, friend group hosting, possibly holiday gatherings. When viewing a client's event history, can the chef see the PATTERN? "3 couple dinners, 2 friend group events, 1 holiday." This informs menu planning (don't repeat the friend-group menu for a couple dinner, different vibe).

**OW29. Visual Meal Archive (Instagram Replacement)**
The chef used Instagram to see "what she ate a year ago." Can the chef attach photos to completed events showing the plated dishes? Can they browse a client's visual history: "Here's what I made for M in April 2025"? Without this, Instagram remains the meal archive and ChefFlow is incomplete.

**OW30. Client Preference Reconstruction**
The chef had to manually cross-reference phone notes, Instagram, memory, and texts to reconstruct "M's" preferences. Does the client profile aggregate: dietary info, past dishes served, notes, feedback, and communication history into one view? Can the chef open "M's" profile and instantly know everything without checking other sources?

**OW31. Dish Repetition Warning Visibility**
`RepeatMenuAlert` fires on the event detail page at >30% recipe overlap. But does the chef see it DURING menu building, or only AFTER attaching a menu to an event? The warning is most useful during composition, not after.

**OW32. Dish Frequency on Client Profile**
`DishFrequencyChart` and `getNeverServedDishes()` components exist but may not be wired to the client detail page. Can a chef open a client profile and see: "Most served: Risotto (4x), Salmon (3x). Never served: Lamb, Duck, Souffle"? This directly prevents repetition and inspires new menus.

**OW42. Relationship Duration Display**
The client detail page shows "Client Since: April 2, 2026." Does it also show elapsed time? "Client for 2 weeks" vs "Client for 3 years" tells a completely different story. The raw date requires mental math.

**OW44. Multi-Context Client Booking**
When rebooking a repeat client, does the system know this client books different event types? Can it suggest: "Last time M booked for friends, you made X. Last couple dinner, you made Y." Context-aware history, not just chronological.

---

## Phase 9: Communication Trail

The menu was developed over days of texting. That history has value. The system should capture or replace it.

**OW33. Communication Thread per Event**
Is there a message/note thread attached to each event where the chef can log planning decisions? "Client wants pasta or chicken. Trusts my ideas. Sent 3 options April 8. She picked grilled cheese + ravioli + chicken + tart. Confirmed April 15."

**OW34. Menu Iteration Chat Trail**
The menu went through: chef sends options > client responds > chef refines > client approves. Is this iteration history visible? Can the chef (or future agent) see how the menu evolved from first draft to final? `menu_revisions` table exists. Is the UI useful?

**OW35. Same-Day Confirmation Workflow**
The chef texted the client same-day to confirm. Does the system have a "day-of confirmation" touchpoint? Can it prompt the chef to confirm timing, guest count, allergies the morning of? Can the client confirm via the portal?

---

## Phase 10: Client Portal (The Link the Chef Promised)

The chef told client "M": "next time we book I want to send you a link so we can do all of this in one place." This is a direct product requirement.

**OW36. Client-Facing Event Link**
Can the chef send a single link where the client can: see the proposed menu, confirm guest count, confirm allergies, approve/refine dishes, and confirm timing? One link, one place, replacing the text thread.

**OW37. Client Menu View and Feedback**
The approval portal exists (`lib/menus/approval-portal.ts`). Can a client view the menu visually (not as a data table), flag specific dishes, suggest changes, and approve? Does the experience feel like a "link from my chef" or like logging into enterprise software?

---

## Phase 11: Day-of Execution

The chef arrives at 5:00 and serves at 7:15. The system must support in-the-moment decision making.

**OW38. Execution Timeline on Event Day**
When the chef opens the event on their phone at 5:00 PM, can they see: "5:00 Setup, 5:30 Chicken in oven, 6:00 Fire app prep, 6:45 Boil water, 7:00 Drop ravioli, 7:15 Serve apps"? Is this a single scrollable view optimized for a phone screen in a kitchen?

**OW39. Course Fire Sequence**
Beyond timeline: when the chef is mid-service, can they track which courses have fired? "Apps: FIRED. Pasta: IN PROGRESS. Main: QUEUED. Dessert: QUEUED." A simple checklist for under-pressure execution.

---

## Phase 12: Post-Event and Memory Building

Every completed event should make the next one easier. This is how the system compounds value.

**OW40. Post-Event Dish Photo Capture**
After the event, the chef takes photos of the plated dishes. Can they attach photos to the completed event (per dish, not just per event)? This builds the visual archive that replaces Instagram. Next time this client books, the chef can see actual photos of what was served.

**OW43. Creative Inspiration Capture**
The chef's menu was influenced by: recent time with friends, ideas they'd been thinking about, seasonal availability. Is there a place to capture "inspiration notes" or "idea bank" that feeds into menu planning? Not a recipe, but a creative spark: "Saw an amazing brown butter sage dish at dinner with friends. Want to do my version for the next event."

---

## Scoring Rubric

| Verdict     | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| **PASS**    | Works through the normal UI. A real chef can do this without workarounds.          |
| **PARTIAL** | Schema/logic exists but UI is missing, buried, or requires developer intervention. |
| **FAIL**    | Feature does not exist or the chef cannot accomplish the task through the app.     |

**Grading:**

- 40+ PASS = Operational workflow is production-ready
- 30-39 PASS = Usable but chef still needs external tools for some workflows
- 20-29 PASS = Significant gaps; chef still relies on phone/Instagram/memory
- <20 PASS = ChefFlow cannot replace manual workflow

---

## How to Use This Document

1. Grade each question against the live app (agent test account + Playwright)
2. FAIL items become the build queue, ranked by "how many chefs hit this wall"
3. PARTIAL items get a follow-up fix or spec
4. Re-grade after each build cycle
5. This document grows: every new real-world dinner scenario adds questions

**The finish line:** A chef can plan, price, communicate, prep, execute, and archive a 5-course dinner for 6 guests entirely through ChefFlow, never opening Instagram, phone notes, or a text thread.

---

## Full Scorecard (2026-04-16)

### Phase 1: Pricing Reality

| OW# | Question                         | Verdict  | Evidence                                                                                                                                                                                                                       |
| --- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OW1 | Per-Person Pricing on Event Form | **FAIL** | Event form only shows flat "Quoted Price ($)". `pricing_model` and `price_per_person_cents` exist in schema but are not on the form. Per-person pricing only enters via quote acceptance trigger.                              |
| OW2 | Group Payment Attribution        | **PASS** | Full split billing UI: `app/(chef)/events/[id]/split-billing/page.tsx`, `components/operations/split-billing-form.tsx`, server actions for payer assignment and invoice generation.                                            |
| OW3 | Price-Per-Head Auto-Calculation  | **PASS** | Quote form (`components/quotes/quote-form.tsx:536-558`) auto-calculates `per_person * guest_count`. Guest count changes recalculate via `lib/guests/count-changes.ts:70-77`. Not on event form, but functional through quotes. |

### Phase 2: Event Creation Completeness

| OW#  | Question                         | Verdict     | Evidence                                                                                                                                                                                                                               |
| ---- | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW4  | Chef Arrival Time on Event Form  | **FAIL**    | `arrival_time` exists in schema. Not on event form. Timeline engines read it but chef cannot set it at creation.                                                                                                                       |
| OW5  | Service Style on Event Form      | **FAIL**    | `service_style` enum exists (plated, buffet, family_style, cocktail, tasting_menu, other). Not on form. Defaults to 'plated'.                                                                                                          |
| OW6  | Per-Event Dietary Override       | **FAIL**    | Allergies/restrictions auto-inherit from client, displayed read-only on form (`event-form.tsx:700-712`). No per-event override UI.                                                                                                     |
| OW7  | Guest Count Change Audit Trail   | **FAIL**    | `guest_count_changes` table exists with previous/new count, price impact, surcharge columns. `requestGuestCountUpdate` does NOT write to it. Changes only in activity log + chat.                                                      |
| OW8  | Guest Count Mid-Planning Impact  | **PARTIAL** | Pricing recalculates for per-person model. Menu portions, shopping lists, and prep timelines re-derive at render time from current guest_count. No stored recalculation trigger. Adequate for most cases but not explicit.             |
| OW41 | Site/Kitchen Notes on Event Form | **FAIL**    | `site_notes`, `kitchen_notes`, `access_instructions`, `location_notes` all in schema. None on event form. Chef must track elsewhere or edit event post-creation.                                                                       |
| OW45 | Event Form Field Completeness    | **FAIL**    | Form exposes ~11 fields. Schema has ~23 user-inputtable columns. ~48% coverage. Missing: service_style, pricing_model, arrival_time, departure_time, dietary overrides, site/kitchen/access notes, cannabis_preference, pricing_notes. |

### Phase 3: Menu Development Workflow

| OW#  | Question                        | Verdict     | Evidence                                                                                                                                                                                   |
| ---- | ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OW9  | Multi-Option Menu Proposal      | **FAIL**    | System supports one menu per event. No mechanism to share 2-3 draft menus for client comparison. Real workflow (send options, client picks) is not supported.                              |
| OW10 | Client Menu Selection Flow      | **FAIL**    | Client approval portal allows approve/flag on a single menu. No mix-and-match across proposals. No "pick apps from Option A, pasta from Option B" capability.                              |
| OW11 | Menu Delivery as Visual (Image) | **FAIL**    | FOH Menu Generator produces styled HTML. Download as HTML and Print exist. No PNG/JPG/image export. `html2canvas` in package-lock but not imported. Chef cannot text an image of the menu. |
| OW12 | Optional/Tentative Menu Items   | **PARTIAL** | `recipe_ingredients.is_optional` works at ingredient level. Dishes and components have no optional/tentative flag. Chef cannot mark a dish as "maybe, depends on time."                    |
| OW13 | Menu Priority Tiers (Kill List) | **FAIL**    | No priority, tier, or execution-importance field on dishes or components. Chef has no pre-decided cut list when overwhelmed.                                                               |

### Phase 4: Portion Intelligence

| OW#  | Question                   | Verdict  | Evidence                                                                                                                                                                                                     |
| ---- | -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OW14 | Course-Level Portion Lock  | **PASS** | `MenuEditor.tsx:305-327`: per-component `portion_quantity` + `portion_unit` inputs. Chef can set "3 bites" at component level. Displayed inline as "120g/plate" style labels.                                |
| OW15 | Portion-Per-Guest Display  | **FAIL** | No multiplication of `portion_quantity * guest_count` anywhere. Chef sees "5 per plate" but never "30 total (5pp x 6 guests)". `ScaleForEventButton` exists but is never rendered.                           |
| OW16 | Portion Adequacy Indicator | **FAIL** | `portion-standards.ts` has professional ranges. `RecipeScalingCalculator` displays reference info. But no comparison against chef's actual portion settings. No warning when portions are outside standards. |

### Phase 5: Recipe Architecture

| OW#  | Question                       | Verdict     | Evidence                                                                                                                                                                        |
| ---- | ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW17 | Sub-Recipe Composition in UI   | **PASS**    | Recipe detail page (`recipe-detail-client.tsx:506-569`): dedicated "Sub-Recipes" card with add/view/remove. Search modal, quantity/unit, circular ref prevention. Discoverable. |
| OW18 | Recipe Rebuild Detection       | **PARTIAL** | `createRecipeWithIngredients` checks exact name duplicates (case-insensitive). No fuzzy matching. "Pan Seared Salmon" vs "Seared Salmon" would not be flagged.                  |
| OW19 | Ingredient Overlap in Planning | **PASS**    | `findIngredientOverlap()` in menu simulator, rendered in "What If" panel on menu detail page (`menu-whatif-panel.tsx:231-238`). Shows shared ingredients during composition.    |
| OW20 | Recipe Scaling for Guest Count | **PARTIAL** | `RecipeScalingCalculator` on standalone recipe page requires manual guest count input. `ScaleForEventButton` exists but never rendered. No auto-scaling from event context.     |

### Phase 6: Prep Orchestration

| OW#  | Question                               | Verdict     | Evidence                                                                                                                                                                                                                                |
| ---- | -------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW21 | Prep Day Assignment per Component      | **PASS**    | `MenuEditor.tsx:406-432`: dropdown for `prep_day_offset` (day-of, 1/2/3 days before). "Make-ahead" checkbox auto-sets on negative offset. Time-of-day selector.                                                                         |
| OW22 | Prep Timeline Backward from Serve Time | **PARTIAL** | AI-generated panel on Ops tab (confirmed/in_progress events only, requires clicking "Generate"). Deterministic `PrepTimelineView` (backward from serve_time, color-coded blocks) exists but is **orphaned** (not rendered on any page). |
| OW23 | Make-Ahead vs Day-Of in Event View     | **PARTIAL** | Menu prep timeline groups by day offset. Events prep timeline groups by category (day-before, morning, etc.). Neither renders a clean two-column split. Events version is orphaned.                                                     |

### Phase 7: Shopping Intelligence

| OW#  | Question                            | Verdict  | Evidence                                                                                                                                                      |
| ---- | ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW24 | Shopping List from Full Menu        | **PASS** | `MenuShoppingList` on menu detail page. `ShoppingListGenerator` at `/culinary/prep/shopping`. Both traverse full recipe hierarchy.                            |
| OW25 | Ingredient Consolidation Accuracy   | **PASS** | `getMenuShoppingList()` consolidates by ingredientId+unit. Same ingredient across recipes = one line with summed quantity. Unit conversion in formula engine. |
| OW26 | Shopping List with Overlap Grouping | **PASS** | `sources` array rendered as expandable per-ingredient breakdown. Chef sees per-recipe contributions to total.                                                 |

### Phase 8: Client Knowledge System

| OW#  | Question                                | Verdict     | Evidence                                                                                                                                                                                                   |
| ---- | --------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW27 | Client Relationship Origin Date         | **FAIL**    | Only `created_at` (system date). No "relationship since" or "first met" field. Chef who's known client 5 years but just joined ChefFlow shows "Client for 2 weeks."                                        |
| OW28 | Client Event Context Variety            | **PARTIAL** | `ClientEventsTable` shows occasion per event. No aggregation ("3 couple dinners, 2 friend groups"). No occasion filter. Status filter only.                                                                |
| OW29 | Visual Meal Archive                     | **PASS**    | `EventPhotoGallery` on completed events: drag-drop upload, photo types (plating/setup/process), captions, reorder, portfolio toggle. Up to 50 photos per event. `ClientPhotoGallery` on client page.       |
| OW30 | Client Preference Reconstruction        | **PARTIAL** | All data present (dietary, past menus, notes, feedback, comms). But ~30 panels stacked vertically with no tabs, no collapsible sections, no "quick reference" summary. Not usable as a glance-and-go tool. |
| OW31 | Dish Repetition Warning During Building | **FAIL**    | `RepeatMenuAlert` only on event detail overview tab (post-attachment). Not in MenuEditor. Chef sees warning AFTER building, not during.                                                                    |
| OW32 | Dish Frequency on Client Profile        | **FAIL**    | `DishFrequencyChart` + `getNeverServedDishes()` built. Neither imported on client detail page. Chef cannot see frequency or "never served" from the client profile.                                        |
| OW42 | Relationship Duration Display           | **FAIL**    | Raw date only: `format(new Date(client.created_at), 'PPPP')`. No elapsed time ("Client for 2 years, 3 months").                                                                                            |
| OW44 | Multi-Context Client Booking            | **PARTIAL** | Event history shows occasion per row. No occasion filter, no context-aware rebooking summary. Chef must manually scan history to find "last friend group dinner" vs "last couple dinner."                  |

### Phase 9: Communication Trail

| OW#  | Question                       | Verdict     | Evidence                                                                                                                                                                     |
| ---- | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW33 | Communication Thread per Event | **PASS**    | Event overview tab: `MessageThread` + `MessageLogForm` with templates. Messages include inquiry-origin messages. Chef can log planning notes.                                |
| OW34 | Menu Iteration Chat Trail      | **PARTIAL** | `menu_revisions` table + `getRevisionHistory()` + `compareRevisions()` fully built in backend. Zero UI components import them. Chef cannot see revision timeline or diffs.   |
| OW35 | Same-Day Confirmation Workflow | **PARTIAL** | Prep prompts engine generates day-of chef-side nudges. `PreServiceChecklist` exists for client-side. No automated outbound "confirm with client" prompt on morning of event. |

### Phase 10: Client Portal

| OW#  | Question                 | Verdict     | Evidence                                                                                                                                                                |
| ---- | ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW36 | Client-Facing Event Link | **PASS**    | `app/(client)/my-events/[id]/page.tsx`: event details, payment summary, menu with approval status, calendar add, share-with-guests, feedback form. One-link experience. |
| OW37 | Client Menu View Quality | **PARTIAL** | In-page menu shows name + description only. Styled FOH version available as downloadable PDF. Not rendered inline. Client must download to see course/dish detail.      |

### Phase 11: Day-of Execution

| OW#  | Question                        | Verdict  | Evidence                                                                                                                                                            |
| ---- | ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW38 | Execution Timeline on Event Day | **PASS** | `ServiceTimelinePanel` on Ops tab: minute-by-minute run-of-show. Printable. Dedicated `/events/[id]/schedule` page.                                                 |
| OW39 | Course Fire Sequence            | **PASS** | Full KDS at `/events/[id]/kds`: course states (pending/fired/plated/served/86'd). `CourseFireButton` advances each course. Mobile-optimized with fullscreen toggle. |
| OW40 | Post-Event Dish Photo Capture   | **PASS** | `EventPhotoGallery` on completed events. Drag-drop, captions, types, reorder, portfolio. Photos are per-event (no per-dish linking via `dish_id`).                  |

### Phase 12: Post-Event and Memory Building

| OW#  | Question                     | Verdict  | Evidence                                                                                                                                                                                             |
| ---- | ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OW43 | Creative Inspiration Capture | **PASS** | Chef Journal system: `app/(chef)/settings/journal/`. Entry types: idea, inspiration, technique, ingredient, reflection. Status: backlog/testing/adopted/parked. Dashboard widget. Brain dump parser. |

---

## Score Summary

| Category                  | PASS   | PARTIAL | FAIL   |
| ------------------------- | ------ | ------- | ------ |
| Pricing Reality (3)       | 2      | 0       | 1      |
| Event Creation (7)        | 0      | 1       | 6      |
| Menu Development (5)      | 0      | 1       | 4      |
| Portion Intelligence (3)  | 1      | 0       | 2      |
| Recipe Architecture (4)   | 2      | 2       | 0      |
| Prep Orchestration (3)    | 1      | 2       | 0      |
| Shopping Intelligence (3) | 3      | 0       | 0      |
| Client Knowledge (8)      | 1      | 3       | 4      |
| Communication Trail (3)   | 1      | 2       | 0      |
| Client Portal (2)         | 1      | 1       | 0      |
| Day-of Execution (3)      | 3      | 0       | 0      |
| Post-Event (1)            | 1      | 0       | 0      |
| **TOTAL (45)**            | **16** | **12**  | **17** |

**Grade: 16 PASS / 45 = ChefFlow cannot replace manual workflow**

---

## Priority Fix Queue (Ranked by User Impact)

### Tier 1: Blocks Every Chef, Every Event (fix first)

| OW#      | Fix                                                                                                      | Effort | Impact                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| OW1+OW45 | Add per-person pricing, service style, arrival time, dietary overrides, site/kitchen notes to event form | Medium | Every chef uses per-person pricing. Every event has an arrival time. Form is 48% complete. |
| OW4      | Expose `arrival_time` on event form                                                                      | Small  | Timeline engines are blind without it. 10-minute fix.                                      |
| OW5      | Expose `service_style` on event form                                                                     | Small  | Changes portion planning, staffing, equipment. 10-minute fix.                              |
| OW15     | Display `portion_quantity * guest_count` on menu/event views                                             | Small  | Chef needs "30 ravioli total" not "5 per plate." Math is trivial.                          |
| OW11     | Add image export (PNG) to FOH Menu Generator                                                             | Small  | `html2canvas` already in dependencies. One button. Chefs text menu images.                 |

### Tier 2: Blocks Key Workflows

| OW#      | Fix                                                               | Effort | Impact                                                       |
| -------- | ----------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| OW9+OW10 | Multi-option menu proposal with client mix-and-match              | Large  | Real menu development workflow. Biggest architectural gap.   |
| OW31     | Move `RepeatMenuAlert` into MenuEditor (during composition)       | Small  | One import + render. Warning is useless after menu is built. |
| OW32     | Wire `DishFrequencyChart` into client detail page                 | Small  | Component exists. One import + render. Prevents repetition.  |
| OW22     | Wire orphaned `PrepTimelineView` to event detail page             | Small  | Component exists and works. Just not imported.               |
| OW7      | Write to `guest_count_changes` table in `requestGuestCountUpdate` | Small  | Table exists. One INSERT statement missing.                  |

### Tier 3: Compounds Value Over Time

| OW#  | Fix                                                               | Effort | Impact                                                                       |
| ---- | ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| OW27 | Add "relationship_started_at" date field to clients table         | Small  | One column, one form field. Veteran chefs need this on day one.              |
| OW42 | Display relative duration from created_at/relationship_started_at | Small  | `formatDistance(date, now)` from date-fns. One line.                         |
| OW34 | Build menu revision timeline UI from existing backend             | Medium | `getRevisionHistory` + `compareRevisions` built. Need UI component.          |
| OW13 | Add priority tier to dishes/components schema + UI                | Medium | New column + dropdown. Enables kill list during service.                     |
| OW30 | Add tabbed navigation or summary card to client detail page       | Medium | 30+ panels need information hierarchy. Quick-ref tab for pre-event planning. |
