# Spec: Homepage Seasonal and Timely Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** seasonal and timely discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

This spec expands the seasonal/timely homepage rail section. It should make the homepage feel alive without becoming a generic holiday calendar.

Intent:

- Use season, local time, holidays, produce windows, and planning windows.
- Add freshness and spontaneity.
- Avoid stale or irrelevant seasonal modules.
- Keep all routes real and public-safe.

---

## What This Does

Create a homepage rail layer for seasonal and timely discovery:

- summer dinners
- winter soups
- grilling season
- holiday baking
- back-to-school meals
- farmers market finds
- peak produce
- Sunday prep
- Friday dinner
- last-minute hosting

---

## Timeliness Classes

- **Season:** spring, summer, fall, winter.
- **Produce window:** tomatoes, asparagus, corn, apples, citrus.
- **Weather / vibe:** grilling, soups, rainy-day meals.
- **Calendar:** holidays, school year, long weekends.
- **Weekly rhythm:** Sunday prep, Friday dinner, Monday reset.
- **Urgency:** tonight, this weekend, last-minute.
- **Local market:** farmers market, local specialties when coverage exists.

---

## Homepage Modules

### Seasonal Staples

Examples:

- Summer dinners
- Winter soups
- Spring vegetables
- Fall comfort food

Purpose: make the rail seasonally relevant.

### Peak Ingredients

Examples:

- Tomato season
- Corn season
- Citrus season
- Apple season
- Asparagus season

Purpose: connect seasonal discovery to ingredients.

### Calendar Moments

Examples:

- Holiday baking
- Back-to-school meals
- Long weekend grilling
- New Year's dinner

Purpose: support timely planning.

### Weekly Rhythm

Examples:

- Sunday meal prep
- Friday dinner
- Monday reset
- Weekend brunch

Purpose: make timely suggestions useful even outside holidays.

### Local / Market

Examples:

- Farmers market finds
- Local harvest
- Regional seasonal picks

Purpose: support location-aware freshness when coverage exists.

### Timely Wildcard

Examples:

- "Peak right now"
- "This weekend's pick"
- "Seasonal surprise"
- "Cook with what's good now"

Purpose: controlled freshness injection.

---

## Full Destination

Preferred route:

- `/eat` with seasonal/timely context.
- `/ingredients` for ingredient-specific seasonal discovery if public-safe.

Required capabilities:

- Browse by season.
- Browse by date window.
- Browse by ingredient season.
- Browse by holiday/calendar moment.
- Combine with cuisine, meal type, constraints, location, budget, and group size.
- Hide or degrade stale seasonal items.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `timelinessClass`
- `season`
- `startDate`
- `endDate`
- `recurrenceRule`
- `regionFit`
- `weatherFit`
- `planningHorizon`
- `coverageScore`
- `freshnessScore`
- `popularityScore`
- `noveltyScore`
- `relatedItems`
- `defaultRoute`
- `defaultQuery`

Suggested `timelinessClass` values:

- `season`
- `produce_window`
- `weather`
- `calendar`
- `weekly_rhythm`
- `urgency`
- `local_market`
- `wildcard`

---

## Slot Model

Example composition:

- 2 seasonally relevant items
- 1 peak ingredient
- 1 weekly rhythm item
- 1 calendar/planning item
- 1 local/market item when supported
- 1 timely wildcard
- 1 "Explore what's timely" item

Example output:

- Summer Dinners
- Grilling Season
- Tomato Season
- Friday Dinner
- Long Weekend Hosting
- Farmers Market Finds
- Peak Right Now
- Explore Seasonal Picks

Rules:

- Do not show out-of-season items unless framed as planning ahead.
- Do not show holiday items too early or too late without a planning reason.
- Local items require location support or a generic non-local fallback.
- Freshness should not override safety or coverage.

---

## Controlled Spontaneity

Good examples:

- "Peak right now: tomatoes."
- "This weekend: grilling."
- "Sunday: meal prep."

Bad examples:

- Holiday baking months after the holiday.
- Location-specific produce with no location signal.
- Empty seasonal result pages.

---

## Routing Rules

- Route to real public destinations only.
- Preserve date/season context.
- Do not expose private sourcing, costs, inventory, vendor, recipe, menu, client, quote, invoice, or event data.
- No automatic record creation.

---

## Acceptance Criteria

- Homepage can surface timely discovery without a stale calendar dump.
- Season, produce window, calendar, weekly rhythm, urgency, and local market classes are modeled.
- Stale or unsupported items are suppressed or framed honestly.
- Slot logic is freshness and coverage gated.
- Tests cover date windows, dedupe, stale suppression, local fallback, routing, hidden/dismissed behavior, and empty-result handling.

---

## Out Of Scope

- Weather API integration unless already available.
- Local inventory or vendor availability claims.
- Booking/inquiry write-path changes.
