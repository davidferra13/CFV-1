# Spec: Homepage Meal Type Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** meal type discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete._

### Raw Signal

The developer is expanding the homepage discovery rail in focused passes. Cuisine was queued first. This is the next rail expansion dimension: meal type.

Relevant phrases from the session:

- "we need to talk about massive expansion ideas for the homepage discovery rail"
- "i want to focus on making sure the rail has EVERYTHING IT SHOULD"
- "tell me how we can add everythign wihtout it being extremely impratical but add spontinutidy from time to time"
- "please just focus on cusine for now"
- "now lets do the next one"

The assumed "next one" is meal type because it was the next major discovery dimension after cuisine in the planning conversation. If that assumption is wrong, this spec can be renamed or superseded before implementation.

### Developer Intent

- **Core goal:** Add a meal-type discovery layer to the homepage rail without turning it into a giant category dump.
- **Product role:** Meal type should answer "what kind of eating moment is this?" before the user has picked cuisine, chef, or exact dish.
- **Homepage principle:** Show a small, timely, high-signal set of meal-type entry points. Make the full meal-type catalog reachable through `/eat` or another real public destination.
- **Spontaneity principle:** Occasionally suggest a meal format the user may not have considered, but keep it grounded in time of day, season, saved behavior, and available downstream coverage.
- **Implementation timing:** This is queued only. A later build agent should implement it.

---

## What This Does

Create a meal-type discovery rail system for the homepage. The rail should help users start from the eating context:

- breakfast
- brunch
- lunch
- dinner
- snacks
- desserts
- drinks
- meal prep
- catering
- family-style meals
- private dinner
- tasting menu
- late-night food
- picnic / outdoor meal
- party spread
- grazing board
- holiday meal
- work lunch
- date-night dinner
- weeknight dinner

The homepage should not show every meal type at once. It should generate a compact set of meal-type cards or pills using time, context, popularity, recent behavior, and controlled surprise.

---

## Product Principle

Meal type is not cuisine. Meal type is the user's immediate intent shape.

Examples:

- "Dinner tonight" is a meal type / timing intent.
- "Thai" is cuisine.
- "Gluten-free" is dietary constraint.
- "Birthday" is occasion.
- "One-pan" is effort / technique.

The later build should keep these boundaries clean so the rail remains understandable.

Target mental model:

> Meal type rail = fast entry into the user's eating moment.

---

## Homepage Meal Type Rail

The homepage meal-type rail should support these modules.

### Time-Of-Day Picks

Examples:

- Breakfast
- Brunch
- Lunch
- Dinner
- Late night

Purpose: make the rail feel immediately relevant.

Rules:

- Morning sessions should bias toward breakfast, brunch, coffee, meal prep, and work lunch.
- Midday sessions should bias toward lunch, meal prep, snack boards, and dinner planning.
- Evening sessions should bias toward dinner tonight, date night, family dinner, and late-night.
- Do not make time-of-day personalization so strong that the rail becomes repetitive.

### Planning Horizon

Examples:

- Dinner tonight
- This weekend
- Next week's meal prep
- Holiday table
- Party this month

Purpose: bridge from browsing into planning and inquiry.

### Dining Format

Examples:

- Private dinner
- Tasting menu
- Family-style meal
- Buffet
- Grazing table
- Cocktail bites
- Picnic
- Backyard grill
- Chef's table

Purpose: expose how the meal is served, not just what is eaten.

### Everyday Utility

Examples:

- Weeknight dinner
- Meal prep
- Work lunch
- Kid-friendly dinner
- Leftover-friendly meals
- Freezer meals

Purpose: keep the rail practical, not only event-oriented.

### Hosting / Group Meals

Examples:

- Dinner party
- Birthday dinner
- Game-day spread
- Brunch party
- Family gathering
- Corporate lunch
- Cocktail party

Purpose: guide users toward chef discovery, planning, and eventual inquiry when the meal has guests.

### Sweet / Drink-Led Moments

Examples:

- Desserts
- Cakes
- Pastry
- Coffee
- Cocktails
- Zero-proof drinks
- Wine-pairing dinner

Purpose: include food experiences that are not standard entree-driven meals.

### Surprise Meal Format

Examples:

- "Try a grazing table"
- "Plan a late brunch"
- "Make it family-style"
- "Unexpected dinner format"
- "Chef's choice tasting"

Purpose: add spontaneity in a way that expands the user's idea of what ChefFlow can help with.

---

## Full Meal Type Destination

The homepage must include a path to a deeper destination where users can browse all supported meal types and formats.

Preferred destination:

- `/eat` with meal-type filters and preserved query context.

Required capabilities:

- Browse common meal types.
- Browse hosting formats.
- Browse time-of-day eating moments.
- Browse everyday utility categories.
- Browse sweet/drink-led formats.
- Search or filter by text.
- Combine meal type with cuisine, dietary, location, group size, budget, and date window where those filters already exist.

Hard rule:

- Do not create placeholder destinations. Every card must land somewhere real and useful.

---

## Meal Type Metadata

Every meal type should be backed by metadata so the rail can be generated by rules.

Recommended fields:

- `name`
- `slug`
- `category`
- `timeOfDay`
- `planningHorizon`
- `groupSizeFit`
- `serviceFormat`
- `eventFit`
- `everydayFit`
- `seasonalRelevance`
- `popularityScore`
- `familiarityScore`
- `noveltyScore`
- `coverageScore`
- `relatedMealTypes`
- `compatibleCuisineTags`
- `compatibleDietTags`
- `defaultRoute`
- `defaultQuery`

Suggested `category` values:

- `time_of_day`
- `everyday`
- `hosting`
- `event`
- `format`
- `sweet`
- `drink`
- `planning`
- `wildcard`

`coverageScore` matters. Do not push a meal type if it leads to empty chef results, empty `/eat` results, or fake cards.

---

## Slot Model

The homepage rail should use slots instead of a flat static list.

Example slot composition:

- 2 time-of-day picks
- 2 practical meal types
- 1 hosting format
- 1 planning-horizon item
- 1 sweet/drink-led item
- 1 wildcard format
- 1 "Explore meal types" item

Example morning output:

- Breakfast
- Brunch
- Work Lunch
- Meal Prep
- Pastry
- Private Dinner This Weekend
- Try a Grazing Table
- Explore Meal Types

Example evening output:

- Dinner Tonight
- Family-Style Dinner
- Date Night
- Late Night
- Tasting Menu
- Dessert Table
- Surprise Format
- Explore Meal Types

Rules:

- Do not show too many near-duplicates in one rail.
- Avoid mixing too many abstraction levels in one visible set.
- Keep at least one practical item visible.
- Keep at least one hosting/event item visible.
- Keep at least one discovery/spontaneous item visible only when it has downstream coverage.
- Keep "Explore meal types" available.

---

## Controlled Spontaneity

Spontaneity should suggest a meal format or eating moment the user may not have considered.

Requirements:

- Wildcard meal-type items should appear only sometimes or behind an explicit "Surprise me" action.
- Wildcards should respect time of day, likely planning horizon, location, and past behavior.
- Wildcards must avoid absurd timing unless clearly framed as planning for later.
- Hidden or dismissed wildcard types should not immediately reappear.
- Use bridge logic from familiar to novel formats.

Good examples:

- If the user browses dinner parties, suggest a tasting menu.
- If the user browses brunch, suggest a pastry-forward brunch.
- If the user browses private dinner, suggest family-style dinner.
- If the user browses cocktails, suggest cocktail bites or zero-proof pairings.

Bad examples:

- Suggesting late-night food at 8 AM without a planning context.
- Suggesting a party spread to a user currently filtering for solo meal prep.
- Sending a wildcard to an empty results page.

---

## Routing Rules

Every meal-type item must route to a real public destination.

Allowed intent:

- Meal type can feed `/eat` with query context.
- Event/hosting meal types can feed `/chefs` if chef filters support the intent.
- Strong booking-intent items can bridge to public chef profiles, inquiry, or booking only through existing user-controlled paths.

Hard rules:

- No placeholder routes.
- No fake result pages.
- No private operational data.
- No automatic booking, inquiry, event, group, or planning object creation from a rail click.
- No private recipes, private menus, ingredient costs, internal notes, client data, quotes, invoices, or event IDs.

---

## UX Requirements

- The rail should show roughly 6-10 meal-type cards or pills at a time, depending on viewport and density.
- Mobile should prioritize the most immediate choices: Dinner tonight, Private dinner, Meal prep, Catering, Date night, Birthday dinner, Saved/recent, Near me, Surprise me.
- Text must not overlap on mobile or desktop.
- Touch targets must be large enough for mobile use.
- Labels should be short and action-oriented.
- Avoid internal product language like "meal-type rail" in public copy.
- Do not explain mechanics in visible app copy.

---

## Acceptance Criteria

- The homepage can surface meal-type entry points without listing every supported type at once.
- A deeper public destination can browse all supported meal types.
- Time-of-day, everyday utility, hosting, format, sweet/drink-led, and wildcard meal-type modules are represented.
- Slot composition prevents repetitive or chaotic rail output.
- Spontaneity is controlled, contextual, and coverage-gated.
- Every visible item routes to a real public destination.
- No rail click creates booking, inquiry, event, group, or planning records automatically.
- Tests cover routing, deduplication, slot composition, time-of-day bias, hidden/dismissed behavior, coverage gating, and wildcard constraints.

---

## Out Of Scope

- Cuisine discovery expansion.
- Dietary/constraint discovery expansion.
- Ingredient-led discovery expansion.
- Technique discovery.
- Full planning shortlist implementation.
- Booking or inquiry write-path changes.
- Production implementation during the queue-recording pass.
