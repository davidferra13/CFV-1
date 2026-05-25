# Exit Scenario Reclassification Sprint

> **Date:** 2026-05-25
> **Source:** Developer stress-test of exit scenario #58 revealed a pattern:
> many "bridgeable" exits are actually REDUCIBLE when ChefFlow already has the context
> and the external tool is just a free data source.
>
> **Pattern:** Free API + ChefFlow already knows (date, location, client, ingredients) = source it, don't link it.

---

## IMMEDIATELY ACTIONABLE (Free data, ChefFlow has context, no new infrastructure)

### #58 Weather for outdoor events -> SPEC WRITTEN

- **Reclassified:** Bridgeable -> Reducible
- **Spec:** `docs/specs/event-weather-intelligence.md`
- **API:** Open-Meteo (free, no key), historical + forecast
- **Context ChefFlow has:** event date, time, venue address
- **Build size:** Small widget, 3-tier progressive disclosure

### #23 Food safety temps/times

- **Reclassified:** Bridgeable -> Reducible
- **Why:** Static data. FDA temps/times almost NEVER change. This is a lookup table, not an API.
- **Context ChefFlow has:** recipe items, proteins, cooking methods
- **Build:** Static reference library. "Safe hold temp for sous vide chicken?" answered inline on recipe view.
- **Effort:** Tiny. JSON reference file + UI panel on recipe detail.

### #75 Unit conversion (metric/imperial, volume/weight)

- **Reclassified:** Bridgeable -> Reducible
- **Why:** Pure math. Zero external dependency.
- **Context ChefFlow has:** ingredient quantities in recipes
- **Build:** Inline converter on any quantity field. Tap "3/4 cup flour" -> shows grams, ounces, ml.
- **Effort:** Tiny. Utility function + UI affordance.

### #74 Recipe scaling (4 to 40 servings)

- **Reclassified:** Bridgeable -> Reducible
- **Why:** Pure math with chef-knowledge adjustments (salt doesn't scale linearly, etc.)
- **Context ChefFlow has:** full recipe with quantities and serving count
- **Build:** Scaling slider on recipe view. Input target servings, see adjusted quantities.
- **Effort:** Small. Math engine + scaling rules for non-linear ingredients.

### #22 Nutritional info for a dish

- **Reclassified:** Bridgeable -> Reducible
- **Why:** USDA SR Legacy database is free, public domain. We already reference it (`lib/reference/data/nutrition-common.json`).
- **Context ChefFlow has:** recipe ingredients with quantities
- **Build:** Auto-calculated nutrition panel per recipe. Macros, calories, key nutrients.
- **Effort:** Medium. Map ingredients to USDA entries, sum per recipe.

### #24 Substitute ingredient (allergy swaps)

- **Reclassified:** Bridgeable -> Reducible
- **Why:** We already have `lib/reference/data/substitutions.json`. Data exists.
- **Context ChefFlow has:** recipe ingredients, client allergy profile
- **Build:** "Suggest substitute" button on any ingredient, filtered by client allergies.
- **Effort:** Small. Data exists, need UI + allergy-aware filtering.

### #45 Find grocery store near event venue

- **Reclassified:** Bridgeable -> Partially Reducible
- **Why:** ChefFlow knows venue address. Can show nearby stores on event page.
- **Context ChefFlow has:** venue address, shopping list items
- **Build:** "Nearby stores" panel on event detail. Map link for directions (routing stays external).
- **Effort:** Small. Google Places API or similar. Store results cached per venue.

### #43 Route planning / day's stops on map

- **Reclassified:** Bridgeable -> Partially Reducible
- **Why:** Can show all day's events on a map with addresses. ROUTING is permanent exit (Google/Waze own that). But the MAP VIEW with stops is ours.
- **Context ChefFlow has:** all events for a date with addresses
- **Build:** Calendar day view with map showing pins for each stop. Tap pin -> deep link to Maps app for directions.
- **Effort:** Medium. Map component + calendar integration.

### #5 Seasonal ingredient availability

- **Reclassified:** Bridgeable -> Reducible
- **Why:** Seasonal data is knowable and relatively static per region. PIE already has seasonal scoring (260K seasonal scores exist on Pi).
- **Context ChefFlow has:** recipe ingredients, event date, chef's region
- **Build:** "Availability check" on ingredients scoped to event month + region. Yellow/red flags for out-of-season items.
- **Effort:** Medium. PIE seasonal data needs surfacing in recipe/menu UI.

### #73 Mileage tracking for tax deductions

- **Reclassified:** Bridgeable -> Reducible
- **Why:** ChefFlow has home address (account) and event venue address. Distance is calculable.
- **Context ChefFlow has:** chef home zip, event venue address, event date
- **Build:** Auto-calculated round-trip mileage per event. Annual mileage export for tax prep.
- **Effort:** Small. Distance API call per event, stored on event record.

### #88 Timezone math for destination events

- **Reclassified:** Bridgeable -> Reducible
- **Why:** Pure computation. Timezone from address is deterministic.
- **Context ChefFlow has:** event venue address, chef home timezone
- **Build:** Auto-detect event timezone from address. Show prep timeline in chef's local time AND event local time.
- **Effort:** Tiny. Timezone lookup library + dual-time display.

### #87 Prep timing reminders/alarms

- **Reclassified:** Bridgeable -> Partially Reducible
- **Why:** ChefFlow has event time and knows prep steps. Can generate a prep timeline.
- **Context ChefFlow has:** event datetime, recipes with prep steps/times
- **Build:** Auto-generated prep timeline ("Start brine: 6am Tuesday, Start stock: 2pm Wednesday"). Export to calendar or push notification (future).
- **Effort:** Medium. Prep time estimation engine + timeline UI.

---

## QUICK WINS ALREADY PARTIALLY BUILT

### #7 Food cost % modeling (margin calculator)

- **Status:** PIE exists, menu costing exists. Missing: "what if I swap this protein" scenario modeler.
- **Build:** Add swap-and-recalculate on menu cost view. Show margin % against target.
- **Effort:** Small. UI work on existing infrastructure.

### #38 Check if client payment cleared

- **Status:** Stripe integration exists.
- **Build:** Payment status badge on event detail. Green/yellow/red. No Stripe dashboard visit needed.
- **Effort:** Tiny. Surface existing Stripe webhook data.

### #72 Calendar sync to personal calendar

- **Status:** Events have dates/times/locations.
- **Build:** iCal feed URL per chef. Subscribe once in Google/Apple Calendar, auto-syncs.
- **Effort:** Small. Standard iCal export endpoint.

### #80 Waitlist management during busy season

- **Status:** Client and inquiry system exists.
- **Build:** Waitlist status field on inquiries. Priority/date sorting. Capacity indicator.
- **Effort:** Small. UI + one status field.

### #84 Recurring meal prep schedule

- **Status:** Events exist but are one-off.
- **Build:** Recurring event type (weekly/biweekly template). Auto-generates future events.
- **Effort:** Medium. Recurrence engine + template system.

---

## TOTAL RECLASSIFICATION COUNT

| Original classification                | Count reclassified | New classification                      |
| -------------------------------------- | ------------------ | --------------------------------------- |
| Bridgeable -> Reducible                | 11                 | Chef never leaves                       |
| Bridgeable -> Partially Reducible      | 3                  | Chef leaves for routing/directions only |
| Reducible (already correct, quick win) | 5                  | Needs build, data/infra exists          |

**19 scenarios actionable now.** No new infrastructure. Free APIs + existing data + UI work.

---

## PRIORITY ORDER (by chef pain frequency x effort)

| Priority | Scenario                  | Frequency           | Effort | Impact                          |
| -------- | ------------------------- | ------------------- | ------ | ------------------------------- |
| 1        | #74 Recipe scaling        | Per menu            | Small  | Eliminates calculator exit      |
| 2        | #75 Unit conversion       | Per recipe          | Tiny   | Eliminates Google exit          |
| 3        | #23 Food safety reference | Per cook            | Tiny   | Eliminates Google exit          |
| 4        | #72 Calendar sync         | Daily               | Small  | Eliminates daily friction       |
| 5        | #58 Weather widget        | Per outdoor event   | Small  | Eliminates weather.com          |
| 6        | #22 Nutrition info        | Per client request  | Medium | Eliminates USDA/MFP exit        |
| 7        | #24 Substitution engine   | Per allergy event   | Small  | Data already exists             |
| 8        | #7 Margin modeler         | Per menu            | Small  | Eliminates spreadsheet          |
| 9        | #38 Payment status        | Per event           | Tiny   | Eliminates Stripe dashboard     |
| 10       | #73 Mileage tracking      | Per event           | Small  | Eliminates MileIQ exit          |
| 11       | #45 Nearby stores         | Per event           | Small  | Reduces Google Maps exit        |
| 12       | #5 Seasonal availability  | Per menu            | Medium | Surfaces existing PIE data      |
| 13       | #43 Day map view          | Per event day       | Medium | Reduces routing exit            |
| 14       | #88 Timezone math         | Per destination gig | Tiny   | Eliminates Google exit          |
| 15       | #87 Prep timeline         | Per event           | Medium | Reduces phone alarm exit        |
| 16       | #80 Waitlist              | Busy season         | Small  | Eliminates spreadsheet          |
| 17       | #84 Recurring events      | Weekly (meal prep)  | Medium | Eliminates calendar/spreadsheet |

---

## THE PATTERN FOR ALL REMAINING SCENARIOS

Every exit scenario should be evaluated with this rubric:

1. **What context does ChefFlow already have?** (date, location, client, ingredients, recipes, prices)
2. **Is the external tool just a data source?** If yes -> source it, don't link it.
3. **Is the data free or cheap?** If yes -> no excuse not to have it.
4. **Is the data static or slow-changing?** If yes -> cache it, even easier.
5. **Would a chef need the FULL external tool, or just a slice?** Usually just a slice.

If answers are: has context, data source, free, static/cacheable, just a slice -> **Reclassify to Reducible. Build it.**

---

## Evaluated Registry

| #   | Title                          | Date       | Mode        | Classification                   | Spec                          |
| --- | ------------------------------ | ---------- | ----------- | -------------------------------- | ----------------------------- |
| 58  | Weather for outdoor event      | 2026-05-25 | Interactive | Reducible                        | event-weather-intelligence.md |
| 90  | Parking/loading dock logistics | 2026-05-25 | Interactive | Reducible + Client-Collaborative | venue-access-intelligence.md  |
| 94  | Quick recipe glance mid-cook   | 2026-05-25 | Interactive | Reducible                        | mid-cook-reference-system.md  |

**Stats:** Total: 95 | Evaluated: 3 | Remaining: 92 | Reducible: 2 | Client-Collaborative: 1 | Specs written: 3 | Needs developer review: 0
