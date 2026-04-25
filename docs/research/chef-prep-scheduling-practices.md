# Research: How Chefs Handle Prep Scheduling & Kitchen Operations

> **Date:** 2026-03-31
> **Question:** How do professional chefs currently manage prep scheduling, food costing, and kitchen delegation, and what can we learn to improve ChefFlow's component-aware prep scheduling?
> **Status:** complete

## Origin Context

ChefFlow is preparing for its first beta tester demo with a private chef/caterer. Their pain points include admin overload, food cost/ordering/prep lists/prep times automation, handing kitchen management to a sous chef, and organizational tools designed by a chef. They have been trying to build their own management app for 2 years, tried Monday.com and other platforms, and concluded "none were designed by a chef." They currently track every step with a client in a spreadsheet.

This research validates and informs our component-aware prep scheduling spec (`docs/specs/component-aware-prep-scheduling.md`), which connects menu component data (make-ahead windows, prep day offsets, stations) to the event scheduling engine.

## Summary

Professional chefs and caterers overwhelmingly rely on manual systems (spreadsheets, paper prep lists, mental math) for prep scheduling. The software market is fragmented: recipe management tools (meez), catering CRM tools (Puree, Total Party Planner), and task management tools (opsi) each solve a slice of the problem, but none connect menu components to calendar-based prep timelines the way our spec proposes. The biggest validated pain points are: (1) translating menus into day-by-day prep schedules, (2) estimating and tracking prep time per component, and (3) delegating prep tasks to team members with clear accountability. ChefFlow's component-aware approach fills a gap no current tool addresses.

## Detailed Findings

### Current Chef Practices

**Manual systems dominate.** Most private chefs and small caterers manage prep through a combination of:

- **Spreadsheets** for tracking client preferences, menus, and prep timelines. Grace is a textbook example: every single step tracked in a spreadsheet.
- **Paper prep lists** organized by station. The industry-standard format tracks: Date/Day, Station, Items, On Hand, Par (target quantity), and Need (calculated shortfall). These are filled out daily by the chef or sous chef.
- **Mental math** for make-ahead timing. Experienced chefs carry "this needs 72 hours" or "marinate overnight" knowledge in their heads, reverse-calculating from the event date. This is the exact gap our spec closes.
- **Mise en place as philosophy.** Every professional kitchen operates on the principle of "everything in its place" before cooking begins. The prep list is the operational expression of mise en place.

**How private chefs structure a cook day:**
A typical private chef keeps a base of 3 prepped proteins, 4 types of roasted/raw vegetables, 2 sauces/dressings, and 1 grain. Sauces and dressings are made first (fast, high impact). Proteins are marinated while other prep happens in parallel. This parallel-task thinking is important: prep blocks should not assume sequential execution.

**Make-ahead categorization is intuitive, not systematic.** Chefs mentally sort items into categories:

- Items that _improve_ with time (braises, confits, fermented items, kale salads)
- Items that _keep_ well (breads, baked goods, frozen components)
- Items that _must_ be fresh (salads, a la minute sauces, tempura)
- Items that need lead time (stocks, demi-glace, cured proteins)

Our spec's `is_make_ahead` boolean and `make_ahead_window_hours` column formalize this intuition. No other tool does this at the component level.

Sources: [Chef Shelley cook day walkthrough](https://www.chefshelley.co/042024-2/), [Girl and the Kitchen private chef tips](https://girlandthekitchen.com/blog/private-chef-tips/), [Food52 make-ahead dinner party guide](https://food52.com/story/12662-how-to-prep-a-dinner-party-in-advance)

### Existing Tools & Competitors

**Recipe Management (closest to our domain):**

| Tool                              | What It Does                                                                                                                                                                | What It Misses                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **meez** ($getmeez.com)           | Recipe digitization, scaling, costing, training manuals. Imports from Excel/Word/PDF. USDA nutrition database. Multi-language. Used by restaurants, universities, caterers. | No event-based prep scheduling. No calendar mapping. No make-ahead timeline awareness. Recipes exist in isolation, not connected to events or dates. |
| **Parsley** (parsleysoftware.com) | Cooking and prep instructions scaled automatically. Used by restaurants, universities, grocers, caterers.                                                                   | Similar gap: no event-aware prep timeline.                                                                                                           |

**Catering CRM/Operations:**

| Tool                                            | What It Does                                                                                                                                                                         | What It Misses                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Puree** ($54/mo, puree.app)                   | Turns quotes into chef dockets and kitchen reports. Consolidated view of all menu items across timeframes. Stripe payments, Xero invoicing, Google Calendar sync. Built by caterers. | Dockets are order-based, not component-aware. No reverse-calendar prep scheduling. No make-ahead window concept. |
| **Sprwt** (sprwt.io)                            | All-in-one meal prep/catering platform. Ordering, route planning, nutrition tracking. Kitchen screen integration for live recipe updates synced to event timelines.                  | Designed for meal prep delivery businesses, not private chefs/caterers doing bespoke events.                     |
| **Total Party Planner** (totalpartyplanner.com) | Large-event catering software. BEO generation, staff scheduling, venue management.                                                                                                   | Enterprise-scale, not suited for solo/small catering operations. No component-level prep awareness.              |
| **GoPrep** (goprep.com)                         | Enterprise meal prep and catering. Multi-location. Advanced ordering, production, reporting.                                                                                         | Enterprise focus. Production-line oriented, not event-oriented.                                                  |
| **Traqly** (gotraqly.com)                       | Proposals, menus, clients, events, payments in one place. Built specifically for chefs and catering teams.                                                                           | Workflow/CRM tool. No prep scheduling engine.                                                                    |

**Task Management (adjacent):**

| Tool                     | What It Does                                                                                                                         | What It Misses                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **opsi** (opsi.io)       | Restaurant checklist app. Role-based task assignment. Integrated recipes alongside tasks. Dynamic checklists with conditional logic. | Restaurant-focused (daily service cycles), not event-focused. No reverse-calendar planning from event dates. |
| **Monday.com / ClickUp** | Generic project management. Templates for meal planning and chef business plans.                                                     | Not kitchen-aware. Grace specifically tried Monday.com and rejected it: "not designed by a chef."            |

**The gap ChefFlow fills:** No existing tool connects component-level recipe data (make-ahead windows, prep stations, prep time estimates) to event dates and generates a reverse-calendar prep plan. meez knows recipes. Puree knows events. Neither connects the two at the component level.

Sources: [meez](https://www.getmeez.com/), [meez reviews on Capterra](https://www.capterra.com/p/246573/meez/reviews/), [Puree](https://www.puree.app/), [Puree kitchen management](https://www.puree.app/features/kitchen_management), [Sprwt 2026 catering software](https://sprwt.io/blog/catering-software-for-2026-the-smart-way-to-scale-automate-and-delight-clients/), [opsi](https://www.opsi.io/), [Traqly](https://blog.gotraqly.com/personal-chef-software-why-chefs-need-a-centralized-workflow-in-2025/), [GoPrep](https://www.goprep.com/)

### Pain Points & Gaps

**1. The "mental math" tax.** Chefs spend significant cognitive load reverse-calculating prep timelines from event dates. "Demi-glace needs 72 hours, so if the event is Saturday, I start Wednesday morning." This is trivially automatable but no tool does it. Our `prep_day_offset` field directly solves this.

**2. No single source of truth.** Chefs bounce between recipe books, spreadsheets, calendars, and messaging apps. One chef on meez reported that costing a new menu used to take "at least a week" across multiple tools. The prep schedule exists in one place, the recipes in another, the event details in a third. Integration is manual.

**3. Delegation without documentation.** The number-one barrier to delegating kitchen work is that the knowledge lives in the chef's head. A sous chef can't execute prep if they don't know: what to make, when to start, what station to use, how long it takes, and where to store the result. Our spec outputs all five of these per component.

**4. Cost pressure and waste.** Inflation is the top pain point for food service operators, with nearly 1 in 4 ranking it first. Prep lists based on projected covers prevent both shortages and waste, but most chefs estimate rather than calculate. Linking component-level costing (which ChefFlow already has via recipe costing) to prep scheduling creates a cost-per-prep-day view that no competitor offers.

**5. Communication breakdown.** Manual prep management systems suffer from "easily erased information and really inefficient cross-team communication, with no easy way to communicate when prep was done or where something was located." Kitchen display systems (KDS) solve this for restaurant service but not for multi-day catering prep.

**6. Software not designed by chefs.** Grace's complaint is universal. Generic project management tools (Monday.com, Asana, ClickUp) don't understand kitchen concepts like stations, make-ahead windows, or mise en place. Restaurant-specific tools (Toast, Square KDS) don't understand event-based workflows. The market has a blind spot for private chef/catering operations.

Sources: [meez case studies](https://www.getmeez.com/case-studies), [Toast FSR insights](https://pos.toasttab.com/blog/on-the-line/fsr-insights), [Fast Casual KDS pain points](https://www.fastcasual.com/blogs/tell-me-where-it-hurts-5-kitchen-pain-points-solved-by-1-kds-system/), [meez kitchen management blog](https://www.getmeez.com/blog/what-does-effective-kitchen-management-look-like), [NewPoint operator pain points](https://newpointmarketing.com/foodservice-marketing-plan-solve-top-5-operator-pain-points/)

### Multi-Day Prep Timeline Management

**Backward scheduling is the standard.** Event catering universally uses backward planning: start with the event date and work backward. This is the same approach our spec uses with `prep_day_offset` (negative integers relative to event date).

**Catering timeline phases typically break into:**

1. **D-7 to D-3:** Long-lead items (stocks, cures, confits, bread doughs, ferments)
2. **D-2 to D-1:** Medium-lead items (marinades, sauces, roasted vegetables, compound butters)
3. **D-0 morning:** Short-lead items (mise en place, portioning, plating prep)
4. **D-0 service:** A la minute items only

**Pre-event checklist components:**

- Staff assignments and role clarity
- Equipment check (warmers, coolers, transport containers)
- Transport logistics (pack list, vehicle loading order)
- Pre-event briefing on timing, responsibilities, service expectations

Our spec already accounts for these through the generic blocks (Equipment Check, Grocery Run, Pack the Car, Post-Event Admin). The component-specific blocks layer on top of this framework.

**Critical learning:** Catering companies emphasize that the prep timeline and the logistics timeline are separate but interdependent. Prep tells you _what to cook when_. Logistics tells you _what to bring and how_. Both must be visible on the same calendar but are different concerns. Our spec handles this correctly: component blocks are prep, generic blocks handle logistics.

Sources: [FlashQuotes catering event checklist](https://flashquotes.com/blog/event-catering-checklist-from-booking-to-execution), [EventDrive backward planning](https://www.eventdrive.com/en/blog/effective-backward-planning-guide), [Woodman's catering timeline](https://www.woodmans.com/blog/catering/how-to-plan-a-successful-timeline-for-your-catered-event/), [UpMenu catering checklist](https://www.upmenu.com/blog/catering-checklists/)

### Kitchen Delegation Patterns

**The brigade system is the model.** Professional kitchens use the _brigade de cuisine_ hierarchy: Executive Chef sets the vision, Sous Chef manages execution, Station Chefs (Chef de Partie) own their stations, and Prep Cooks execute the prep list. Even in small operations (2-3 people), this hierarchy exists informally.

**What makes delegation work:**

1. **Clear task ownership.** Each prep task assigned to a specific person. "The sous chef prepares all proteins for grilling; line cooks portion and label vegetables."
2. **Estimated completion times.** Every task on the prep list has an estimated duration, enabling prioritization and accountability.
3. **Station assignment.** Tasks are grouped by station (saute, grill, prep table, pastry) so one person can batch their work at one station.
4. **Standard recipes as the reference.** Delegation fails when the sous chef has to guess. Recipes with photos, step-by-step instructions, and yield information are the documentation layer.

**What prevents effective delegation:**

- Chef ego/micromanagement: "those who micromanage or try to handle every detail are cheating themselves and everyone else in the operation"
- Undocumented recipes (the knowledge-in-head problem)
- Unclear priorities (what must be done first vs. what can wait)
- No feedback loop (no way to know if prep was completed, or where the prepped item is stored)

**Our spec's alignment:** The component-aware prep plan outputs exactly what a sous chef needs: what to make (component name), when to start (calendar date + time of day), where to work (station), how long it takes (estimated duration), and storage notes. This is the documentation layer that enables delegation.

**What's missing for delegation (future spec):** Task assignment (who does what), completion tracking (checkbox per block per person), and a sous chef view (filtered to their assigned blocks only). The current spec correctly defers this to a separate spec.

Sources: [High Speed Training brigade de cuisine](https://www.highspeedtraining.co.uk/hub/kitchen-hierarchy-brigade-de-cuisine/), [RestaurantOwner delegation guide](https://www.restaurantowner.com/public/Delegate-to-Succeed-How-to-Help-Your-Crew-Help-You.cfm), [Chefs Resources kitchen management](https://www.chefs-resources.com/kitchen-management-tools/), [Instawork prep cook roles](https://www.instawork.com/blog/prep-cook-job-description)

## Gaps and Unknowns

1. **No direct interviews with private chefs beyond Grace.** The research is based on web sources and Grace's testimony. Validating with 2-3 more private chefs/caterers would strengthen the findings. However, Grace's pain points align precisely with what the web research surfaces, suggesting they are representative.

2. **Pricing data for competitors is incomplete.** meez does not publicly list pricing. Puree starts at $54/month. Most tools use "contact us" pricing. Difficult to assess price sensitivity for the target market.

3. **Adoption barriers unknown.** We know chefs want better tools, but we don't know what prevents adoption of existing tools (beyond "not designed by a chef"). Could be cost, learning curve, mobile-first needs, or simply that they haven't heard of the tools.

4. **Parallel prep task modeling.** Chefs routinely run multiple prep tasks in parallel (marinate proteins while stocks reduce). Our spec models prep blocks as sequential items on a day, but doesn't explicitly model parallelism. This may matter for accurate time estimation but is acceptable for v1.

5. **Actual prep time variance.** The 60-minute fallback for components without linked recipes is a rough estimate. Real prep times vary dramatically (5 minutes for a vinaigrette vs. 8 hours for a stock). The `~` prefix in the aggregate communicates this, but the estimate quality depends on chefs populating `recipe.prep_time_minutes`.

## Recommendations for ChefFlow Spec

### Validate Current Spec (Already Correct)

1. **Backward calendar mapping is the right model.** Industry standard. `prep_day_offset` directly implements how every caterer thinks. (quick fix: already in spec)

2. **Station assignment on prep blocks is valuable.** Brigade system relies on station-based work grouping. Our spec includes `prep_station` in notes. (quick fix: already in spec)

3. **Separating prep timeline from logistics timeline is correct.** Component blocks for cooking, generic blocks for logistics. Don't merge them. (quick fix: already in spec)

### Enhance Current Spec

4. **Add a "printable prep list" view.** Every kitchen runs on paper during service. A print-friendly version of the prep plan, grouped by day and station, would be the single most impactful addition for delegation. One page per prep day, with checkboxes, component names, durations, storage notes. (needs a spec - separate from this build, but high value for Grace's demo)

5. **Consider grouping by station within each day.** The current spec sorts "chronologically within each day." For delegation, grouping by station is more useful: a sous chef works one station at a time, not one time slot at a time. (quick fix - can be added to the UI sort logic in the current spec without new data)

6. **Surface storage instructions prominently.** The spec puts `storage_notes` in the block's `notes` field. For make-ahead items, storage is critical ("refrigerate immediately," "freeze in portions," "keep at room temp for 2 hours max"). Consider a dedicated visual indicator or icon rather than burying it in notes. (quick fix - UI enhancement in the Prep Plan section)

### Future Specs (Post-v1)

7. **Sous chef delegation board.** A filtered view where sous chefs see only their assigned prep blocks, with completion checkboxes and time tracking. This is what Grace explicitly asked for ("hand over kitchen management to a sous chef"). (needs a spec - the current spec correctly defers this)

8. **Prep completion tracking with timestamps.** When a prep block is marked complete, record who completed it and when. This creates accountability and helps estimate future prep times more accurately. (needs a spec)

9. **Parallel task awareness.** Model which prep tasks can run simultaneously at different stations vs. which require the same equipment/station and must be sequential. This would improve time estimates for multi-station kitchens. (needs discussion - significant complexity, unclear if v1 needs it)

10. **Shopping list generation from prep plan.** The prep plan knows what components need to be made and when. Combining this with recipe ingredient lists generates a time-aware shopping list: "Buy these by Wednesday for the early prep, buy these by Friday for freshness." (needs a spec - high value, connects to existing OpenClaw ingredient pricing)

11. **Template prep plans.** If a chef runs the same 5-course dinner format regularly, they should be able to save a prep plan template and apply it to new events. (needs discussion - depends on how often chefs repeat exact menus)

### Competitive Positioning Note

No tool in the market connects recipe components to event-based prep timelines. meez owns recipe management. Puree owns catering quotes-to-dockets. Our component-aware prep scheduling sits in the gap between them. For Grace's demo, the visual of "Saturday event, Wednesday: start demi-glace" generated automatically from her menu data will demonstrate something she cannot get anywhere else. This is the right feature to lead with.
