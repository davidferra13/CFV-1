# Weather Intelligence: Research-to-Build Extraction Pack

> Source: `docs/research/weather-intelligence-product-research.md` + codebase audit
> Classification: **Product-shaped** (clear personas, workflows, app surfaces, existing code)
> Decision gate: **Full pack** (codebase mapping is directly useful)
> Date: 2026-05-16

---

## 1. Executive Summary

Research proposed weather intelligence as a new capability for ChefFlow. Codebase audit reveals **weather is already partially built**: Open-Meteo integration exists, `WeatherPanel` renders on event detail, Remy generates `weather_warning` alerts. The real work is deepening what exists, not building from scratch.

**Highest-leverage gaps:** risk engine integration (9th dimension), weather-conditional checklists, cadence message weather context, food safety heat warnings tied to specific menu items, and historical weather snapshots for venue learning.

**Research quality:** Strong. Chef-specific use cases are well-grounded. API recommendations align with what was already chosen (Open-Meteo). No contradictions with existing architecture.

---

## 2. Research Insights (Distilled)

| #   | Insight                                                         | Evidence Label                                                  |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Weather should be decision-enabling, not decorative             | `Research fact` (Weather Channel UX pattern)                    |
| 2   | Contextual language ("too windy for candles") beats raw numbers | `Research fact`                                                 |
| 3   | Weather as 9th risk dimension in existing engine                | `Inference` (engine has 8 dimensions, weather is a natural fit) |
| 4   | Open-Meteo is correct provider choice                           | `Codebase verified` (already in use)                            |
| 5   | Sunset/sunrise as event timeline markers                        | `Research fact` (chef domain knowledge)                         |
| 6   | Food safety hold times shrink in heat                           | `Research fact` (USDA guidelines)                               |
| 7   | Wind thresholds affect outdoor plating, candles, burners        | `Research fact` (chef domain knowledge)                         |
| 8   | Historical weather snapshots build venue intelligence           | `Speculation` (useful but unproven value)                       |
| 9   | Pollen/AQI alerts for guests                                    | `Speculation` (niche, low priority)                             |
| 10  | Client-facing weather notes in pre-event emails                 | `Inference` (cadence system exists at right touchpoints)        |

---

## 3. Existing Implementation Map

### Already Built

| Feature                                      | File(s)                                                                        | Status              | Notes                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------ |
| Open-Meteo forecast fetch                    | `lib/ai/remy-weather.ts`                                                       | `Codebase verified` | Geocodes address, fetches daily forecast, evaluates thresholds           |
| WeatherPanel on event detail                 | `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` (line ~215) | `Codebase verified` | Renders when lat/lng available                                           |
| Remy weather_warning alerts                  | `lib/ai/remy-proactive-alerts.ts` (line ~270)                                  | `Codebase verified` | Calls `getWeatherAlerts()`, maps to AlertCandidate                       |
| Event lat/lng fields                         | `lib/db/schema/schema.ts` (events table)                                       | `Codebase verified` | `location_lat`, `location_lng` as doublePrecision                        |
| Event date/time fields                       | Schema                                                                         | `Codebase verified` | `event_date`, `serve_time`, `arrival_time`                               |
| Event address fields                         | Schema                                                                         | `Codebase verified` | `location_address`, `location_city`, `location_state`, `location_zip`    |
| 8-dimension risk engine                      | `lib/costing/operational-risk.ts`                                              | `Codebase verified` | Scale, technique, ingredient, timing, venue, dietary, delegation, client |
| Risk assessment hydration                    | `lib/events/event-risk-assessment.ts`                                          | `Codebase verified` | Gathers DB context, feeds risk engine                                    |
| OperationalRiskPanel UI                      | Event overview tab                                                             | `Codebase verified` | Renders risk results as panel                                            |
| Cadence scheduler (7d/3d/48h/1d touchpoints) | `lib/communication/cadence-scheduler.ts`                                       | `Codebase verified` | Pre-event messages at right intervals                                    |
| CIL signal infrastructure                    | `lib/cil/types.ts`                                                             | `Codebase verified` | 14 signal sources, 6 domains                                             |
| Post-event checklist                         | `components/events/post-event-checklist.tsx`                                   | `Codebase verified` | Conditional items, auto-collapse                                         |
| Event summary PDF                            | `lib/documents/generate-event-summary.ts`                                      | `Codebase verified` | No weather section currently                                             |
| Calendar with intelligence layers            | `app/(chef)/calendar/page.tsx`                                                 | `Codebase verified` | DomainSignals, SchedulingInsightsBar                                     |

### Partially Built / Needs Refinement

| Feature               | Current State                                                        | Gap                                                                                        |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Weather alerts        | Remy alerts on thunderstorms, heavy precip, extreme temps, high wind | Missing: chef-specific contextual language, food safety tie-ins, menu-aware warnings       |
| WeatherPanel          | Exists on event detail                                               | Unknown: need to inspect component to assess depth (forecast display, risk interpretation) |
| Geocoding             | `remy-weather.ts` geocodes `location_address` on every fetch         | Not using stored `location_lat`/`location_lng`; redundant API calls                        |
| Weather + risk engine | Risk engine has no weather dimension                                 | 9th dimension not wired                                                                    |
| Cadence messages      | 7d/3d/48h/1d pre-event emails/SMS                                    | No weather context in message content                                                      |

### Not Built

| Feature                                      | Notes                                                   |
| -------------------------------------------- | ------------------------------------------------------- |
| Weather as risk dimension                    | No `scoreWeather()` in operational-risk.ts              |
| Weather-conditional checklist items          | Post-event checklist exists but no weather-driven items |
| Historical weather snapshots                 | No `event_weather_snapshots` table                      |
| Cached event forecasts                       | No `event_weather_forecasts` table                      |
| Sunset/sunrise in event timeline             | Not surfaced as timeline markers                        |
| Food safety + weather + menu cross-reference | Heat warnings not tied to specific dishes/ingredients   |
| Client-facing weather notes                  | No weather in cadence email templates                   |
| Guest dress suggestions                      | No weather info on guest-facing pages                   |
| Staff heat/cold safety warnings              | No weather context for staff assignments                |
| Calendar weather overlay                     | No forecast dots on calendar view                       |
| CIL weather signal source                    | No `weather` in SignalSource type                       |
| Wind-risk checklist items                    | No wind-specific operational warnings                   |

---

## 4. Gap Analysis

### Product Gaps

**G1: Risk engine missing weather dimension**

- Research says: Weather is the natural 9th operational risk dimension
- Codebase does: 8 dimensions scored, weighted, with mitigations. Weather is absent.
- Why it matters: Outdoor events in rain/heat/wind are materially riskier. The engine already handles this pattern perfectly.
- Close it: Add `scoreWeather()` to `operational-risk.ts`, add `WeatherRiskInput` to types, wire into `event-risk-assessment.ts`
- Verify: Event with 90F outdoor forecast scores higher risk than 72F indoor event

**G2: Weather alerts lack chef-specific language**

- Research says: "Too windy for outdoor candles" beats "Wind: 22 mph"
- Codebase does: `remy-weather.ts` generates alerts with generic messages about thunderstorms, precipitation, extreme temps
- Why it matters: Raw weather data requires chef to translate. ChefFlow should do the translation.
- Close it: Enrich alert messages with chef-contextual language keyed to event type (outdoor, farm, backyard)
- Verify: Remy alert for 25 mph wind at outdoor event says "Secure candles, weight tablecloths, expect burner efficiency drop"

**G3: No weather-conditional checklist items**

- Research says: Outdoor events need weather-dependent prep items
- Codebase does: Post-event checklist has 3 conditional items (photos, referrer thanks, dietary)
- Why it matters: Chef needs "Pack extra ice" and "Confirm tent" to appear automatically based on forecast
- Close it: Add pre-event checklist items that appear conditionally based on weather forecast + event type
- Verify: Event with temp > 85F gets "Pack extra cooler ice" item; event with rain > 40% gets "Confirm tent/indoor backup"

**G4: No sunset/sunrise in event flow**

- Research says: Sunset is an operational marker for outdoor events (lighting, photos, candle timing)
- Codebase does: Event has `serve_time` and `arrival_time` but no sunset awareness
- Why it matters: Chef doing 7 PM outdoor dinner with 8:01 PM sunset needs to plan lighting transition
- Close it: Include sunset/sunrise in event detail for outdoor events; add to event summary PDF
- Verify: Outdoor event shows "Sunset at 8:01 PM" in timeline section

### Data Gaps

**G5: Geocoding is redundant**

- Research says: N/A (discovered during codebase audit)
- Codebase does: `remy-weather.ts` geocodes `location_address` on every weather check, despite `location_lat`/`location_lng` existing on events table
- Why it matters: Unnecessary API calls, slower, may give different coordinates than stored values
- Close it: Use stored lat/lng when available, fall back to geocoding only when missing
- Verify: Weather fetch for event with stored coordinates skips geocoding step

**G6: No historical weather capture**

- Research says: "Last time at this venue in July it was 91F" builds institutional knowledge
- Codebase does: Nothing. Weather data is ephemeral.
- Why it matters: Chefs learn from past conditions. "I noted ice problems last summer here" is valuable context.
- Close it: Capture weather snapshot when event completes (temperature, conditions, optional chef notes)
- Verify: Completed event has `event_weather_snapshots` row with conditions at service time

### Integration Gaps

**G7: Cadence messages have no weather context**

- Research says: 48h and 3-day pre-event emails should include weather outlook
- Codebase does: Cadence scheduler sends at 7d/3d/48h/1d but no weather data in message content
- Why it matters: Chef and client both benefit from "Saturday looks beautiful, 74F" or "Rain possible, we have a backup plan"
- Close it: Enrich cadence message context with weather summary for upcoming event
- Verify: 3-day-before email includes one-line weather outlook

**G8: CIL has no weather signal source**

- Research says: Weather changes are operationally significant signals
- Codebase does: 14 signal sources, no weather
- Why it matters: Weather forecast changes (clear -> thunderstorm) should trigger intelligence layer reactions
- Close it: Add `weather` to SignalSource, emit signal when forecast changes significantly for upcoming event
- Verify: Forecast change from clear to rain within 48h of event generates CIL signal

### Test Gaps

**G9: No tests for remy-weather.ts**

- Current state: `remy-weather.ts` exists but test coverage is unknown
- Why it matters: Weather logic (threshold evaluation, geocoding fallback, alert generation) needs deterministic tests
- Close it: Unit tests for threshold logic, mock Open-Meteo responses
- Verify: Test suite covers thunderstorm, extreme heat, extreme cold, high wind, and "all clear" scenarios

---

## 5. Opportunities (Beyond Direct Gaps)

### Grounded (Clearly Useful)

**O1: Menu-aware heat warnings.** Cross-reference weather forecast with event menu. 92F + chocolate tart on menu = "Chocolate tempering will be extremely difficult. Consider alternative dessert or plan extensive cooling." Already have risk engine + recipe ingredients + weather data; this connects them.

**O2: Wind-risk tiered alerts.** Not just "it's windy" but tiered operational impact: 15 mph (secure paper menus), 20 mph (candle alternatives, weight tablecloths), 25 mph (burner efficiency drops, add cook time), 35 mph (outdoor service not recommended). Static thresholds, no API needed.

**O3: Travel weather awareness.** Chef's travel to venue can be impacted by weather. If 60+ minutes of travel in icy/stormy conditions, flag it. Already have `travel_time_minutes` on events.

**O4: Event summary PDF weather section.** Add weather conditions to the event packet PDF. One line: "Forecast: 74F, Clear, Sunset 8:01 PM." Useful for staff who don't have app access.

### Speculative (Maybe Useful)

**O5: Seasonal menu intelligence via PIE + weather.** Cross-reference regional frost dates with PIE seasonal data and weather forecast. "First frost expected next week; last chance for fresh tomatoes." Requires agricultural data in OpenClaw.

**O6: Multi-event weather dashboard on calendar.** Color-coded weather dots on calendar events. Quick scan: "3 events clear, 1 has rain risk." Adds visual density to already-complex calendar.

**O7: Guest allergy + pollen cross-reference.** High tree pollen + outdoor event + guest with seasonal allergies = awareness note. Very niche.

---

## 6. Build Candidates

### Quick Wins (< 1 session each)

#### QW1: Fix Geocoding Redundancy

- **Goal:** Use stored lat/lng before geocoding
- **Files:** `lib/ai/remy-weather.ts`
- **Scope:** When event has `location_lat`/`location_lng`, skip geocoding API call. Fall back to address geocoding only when coordinates missing.
- **Acceptance:** Weather fetch for event with stored coordinates makes zero geocoding calls
- **Risk:** Low
- **Dependencies:** None

#### QW2: Enrich Weather Alert Language

- **Goal:** Chef-specific contextual messages instead of generic weather warnings
- **Files:** `lib/ai/remy-weather.ts`
- **Scope:** Rewrite alert message generation. Key on event occasion (outdoor/farm/backyard/garden) for context-specific warnings. Add wind tier thresholds. Add food safety language for heat.
- **Acceptance:** Remy alert for 25 mph wind at outdoor event includes operational mitigations, not just "high winds expected"
- **Risk:** Low
- **Dependencies:** None

#### QW3: Add Weather Section to Event Summary PDF

- **Goal:** One-line weather in event packet
- **Files:** `lib/documents/generate-event-summary.ts`
- **Scope:** Fetch forecast for event date/location (reuse remy-weather fetch logic). Add "Forecast: 74F, Clear, Sunset 8:01 PM" line to event details section.
- **Acceptance:** PDF includes weather line when forecast is available
- **Risk:** Low. Graceful degradation if no forecast available.
- **Dependencies:** QW1 (use stored coordinates)

### Foundation Work (1-2 sessions)

#### FW1: Weather as 9th Risk Dimension

- **Goal:** Integrate weather scoring into operational risk engine
- **Files:** `lib/costing/operational-risk.ts`, `lib/events/event-risk-assessment.ts`
- **Scope:**
  - Add `WeatherRiskInput` interface (temperature, wind, precipitation, humidity, is_outdoor)
  - Add `scoreWeather()` function with thresholds for heat, cold, rain, wind, humidity
  - Add weight to existing weights map (suggest 1.3, same as technique)
  - Wire weather data fetch into `getEventRiskAssessment()` hydration
  - Mitigations: "Pack extra ice," "Confirm tent," "Bring portable fans," etc.
- **Acceptance:**
  - 92F outdoor event scores weather risk >= 50 (high)
  - 72F indoor event scores weather risk 0 (low)
  - Rain 60% outdoor scores >= 40 with "Confirm tent/indoor backup" mitigation
  - Wind 25 mph outdoor scores >= 35 with burner/candle mitigations
  - Indoor events score 0-10 regardless of weather (only travel impact)
- **Edge cases:** Event more than 7 days out has no forecast; score as "unknown" (conservative, like existing null handling). Event with no location cannot be scored.
- **Risk:** Medium. Must handle no-forecast gracefully without making all future events look risky.
- **Dependencies:** QW1 (coordinates), shared weather fetch utility

#### FW2: Weather Fetch Utility Extraction

- **Goal:** Single reusable weather fetch function for all consumers
- **Files:** New `lib/weather/provider.ts`, `lib/weather/types.ts`
- **Scope:**
  - Extract Open-Meteo fetch logic from `remy-weather.ts` into shared utility
  - `getEventWeatherForecast(lat, lng, date, serviceStartHour?, serviceEndHour?)` returns structured forecast
  - Include sunrise/sunset in response
  - Include hourly data for service window
  - Handle errors gracefully (return null, not throw)
  - Consumers: remy-weather.ts, risk engine, WeatherPanel, event summary PDF, cadence messages
- **Acceptance:** Single function, all weather consumers use it, no duplicate Open-Meteo calls
- **Risk:** Low. Refactor, not new feature.
- **Dependencies:** None (foundational; other items depend on this)

### User-Facing Features (1 session each)

#### UF1: Weather-Conditional Checklist Items

- **Goal:** Auto-add prep items based on weather + event type
- **Files:** New `lib/weather/checklist-conditions.ts`, modify existing checklist component or create pre-event variant
- **Scope:**
  - Define weather condition -> checklist item mappings:
    - Temp > 85F: "Pack extra cooler ice," "Monitor cold chain closely"
    - Temp > 95F: "Staff hydration plan," "Consider indoor alternatives for delicate courses"
    - Rain > 30%: "Confirm tent/canopy," "Waterproof equipment covers"
    - Rain > 60%: "Activate indoor backup plan"
    - Wind > 15 mph: "Secure paper menus, use cards/boards"
    - Wind > 20 mph: "Candle alternatives," "Weight tablecloths"
    - Wind > 25 mph: "Add 15-20% grill/burner cook time"
  - Only show for events within 48 hours (forecast reliable)
  - Only outdoor-relevant items for outdoor events
- **Acceptance:** Outdoor event with 90F forecast shows heat-related checklist items
- **Risk:** Medium. Must not overwhelm with items. Cap at 5 most important.
- **Dependencies:** FW2 (shared weather fetch)

#### UF2: Sunset/Sunrise in Event Timeline

- **Goal:** Show sunset as operational marker for outdoor events
- **Files:** Event detail overview tab, event summary PDF
- **Scope:**
  - Show "Sunset at 8:01 PM" in event details when event is outdoor and serve time is within 2 hours of sunset
  - Calculate golden hour (sunset minus 45 min) for photo timing note
  - Include in event summary PDF
- **Acceptance:** Outdoor 7 PM dinner with 8:01 PM sunset shows sunset marker and golden hour note
- **Risk:** Low. Sunrise/sunset comes from Open-Meteo response.
- **Dependencies:** FW2 (shared weather fetch with sunrise/sunset)

#### UF3: Cadence Weather Context

- **Goal:** Include weather outlook in pre-event cadence messages
- **Files:** `lib/communication/cadence-scheduler.ts`, email templates
- **Scope:**
  - At 3-day and 48-hour cadence points, fetch weather for event
  - Add one-line weather note to message context
  - Chef-facing: operational ("85F expected, pack extra ice")
  - Client-facing (if cadence sends to client): reassuring ("Beautiful evening expected, 74F")
- **Acceptance:** 3-day-before cadence message includes weather line
- **Risk:** Low. Weather line is optional; message sends even if forecast unavailable.
- **Dependencies:** FW2 (shared weather fetch)

### Data / Intelligence

#### DI1: Historical Weather Snapshots

- **Goal:** Capture weather at event completion for future reference
- **Files:** New migration for `event_weather_snapshots` table, hook into event completion flow
- **Scope:**
  - On event transition to "completed": fetch current weather for event location, store snapshot
  - Fields: temperature, humidity, wind, conditions, sunset time, optional chef notes
  - Surface in Remy context: "Last time at [venue] in July, it was 91F"
  - Surface in risk engine: venue history includes weather context
- **Acceptance:** Completed event creates weather snapshot row. Future event at same venue shows historical weather note.
- **Risk:** Medium. Migration needed. Chef notes field needs UI input.
- **Dependencies:** FW2 (shared weather fetch), event transition hooks

#### DI2: CIL Weather Signal Source

- **Goal:** Weather forecast changes trigger CIL signals
- **Files:** `lib/cil/types.ts`, new `lib/cil/sources/weather.ts`
- **Scope:**
  - Add `weather` to SignalSource union
  - Emit signal when forecast for upcoming event (within 48h) changes significantly
  - "Significant" = weather code change (clear -> rain), temp change > 10F, wind change > 10 mph
  - Signal feeds into proactive Remy alerts
- **Acceptance:** Forecast change from clear to thunderstorm for tomorrow's event generates CIL signal
- **Risk:** Low. CIL infrastructure handles this pattern.
- **Dependencies:** FW2 (shared weather fetch), baseline forecast to compare against (needs cached forecast)

### Tests

#### T1: Weather Threshold Tests

- **Goal:** Deterministic tests for weather scoring logic
- **Files:** New `tests/unit/weather-risk-scoring.test.ts`
- **Scope:** Test scoreWeather() with mock inputs: extreme heat, extreme cold, rain levels, wind tiers, humidity, indoor vs outdoor, missing data
- **Acceptance:** All threshold boundaries tested, null handling verified
- **Dependencies:** FW1 (risk engine integration)

#### T2: Remy Weather Alert Tests

- **Goal:** Test alert generation logic
- **Files:** New `tests/unit/remy-weather-alerts.test.ts`
- **Scope:** Mock Open-Meteo responses, verify correct alert level and message for each weather scenario
- **Dependencies:** QW2 (enriched alert language)

---

## 7. Already-Built vs Missing Table

| Feature                              | Status                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Open-Meteo API integration           | **Already built**                                          |
| WeatherPanel on event detail         | **Already built**                                          |
| Remy weather_warning alerts          | **Already built**                                          |
| Event lat/lng storage                | **Already built**                                          |
| 8-dimension risk engine              | **Already built**                                          |
| Cadence scheduler at right intervals | **Already built**                                          |
| CIL signal infrastructure            | **Already built**                                          |
| Post-event checklist pattern         | **Already built**                                          |
| Event summary PDF generation         | **Already built**                                          |
| Geocoding uses stored coordinates    | **Needs refinement** (currently re-geocodes)               |
| Weather alert contextual language    | **Needs refinement** (generic, not chef-specific)          |
| Weather as risk dimension            | **Not built**                                              |
| Shared weather fetch utility         | **Not built** (logic duplicated/coupled in remy-weather)   |
| Weather-conditional checklists       | **Not built**                                              |
| Sunset/sunrise in event flow         | **Not built**                                              |
| Cadence weather context              | **Not built**                                              |
| Historical weather snapshots         | **Not built**                                              |
| CIL weather signal source            | **Not built**                                              |
| Menu-aware heat warnings             | **Not built**                                              |
| Wind-tier operational alerts         | **Partially built** (basic wind threshold in remy-weather) |
| Client-facing weather notes          | **Not built**                                              |
| Calendar weather overlay             | **Not built**                                              |
| Weather dashboard/widget             | **Not worth building**                                     |
| Radar/maps display                   | **Not worth building**                                     |
| Pollen standalone display            | **Not worth building**                                     |
| Raw meteorological data cards        | **Not worth building**                                     |

---

## 8. Recommended Sequence

### Wave 1: Foundation (must come first)

| Order | Item                           | Why First                                                             |
| ----- | ------------------------------ | --------------------------------------------------------------------- |
| 1     | **FW2: Weather Fetch Utility** | Everything depends on this. Extract from remy-weather, make reusable. |
| 2     | **QW1: Fix Geocoding**         | Part of FW2 extraction. Use stored lat/lng.                           |

### Wave 2: Risk Engine (highest leverage, independent)

| Order | Item                            | Parallel?                 |
| ----- | ------------------------------- | ------------------------- |
| 3     | **FW1: Weather Risk Dimension** | Yes, parallel with Wave 3 |
| 4     | **T1: Weather Risk Tests**      | Sequential after FW1      |

### Wave 3: Alert Enrichment (independent of Wave 2)

| Order | Item                           | Parallel?                 |
| ----- | ------------------------------ | ------------------------- |
| 3     | **QW2: Enrich Alert Language** | Yes, parallel with Wave 2 |
| 4     | **T2: Alert Tests**            | Sequential after QW2      |

### Wave 4: UI / Communication (depends on Wave 1)

| Order | Item                             | Parallel?         |
| ----- | -------------------------------- | ----------------- |
| 5     | **UF2: Sunset/Sunrise**          | Yes, all parallel |
| 5     | **QW3: PDF Weather Section**     | Yes, all parallel |
| 5     | **UF3: Cadence Weather Context** | Yes, all parallel |

### Wave 5: Deeper Intelligence (depends on Wave 1 + 2)

| Order | Item                          | Parallel?     |
| ----- | ----------------------------- | ------------- |
| 6     | **UF1: Weather Checklists**   | Yes, parallel |
| 6     | **DI1: Historical Snapshots** | Yes, parallel |
| 6     | **DI2: CIL Weather Signal**   | Yes, parallel |

### Do Not Parallelize

- FW1 and FW2 touch `operational-risk.ts` and weather fetch; FW2 must complete first
- UF1 and FW1 both affect risk/weather scoring; FW1 first
- DI1 needs migration; cannot parallel with other migration work

---

## 9. Queue-Ready Items

### Ready to Queue Now

**QUEUE-1: Extract Weather Fetch Utility (FW2)**

- Raw source: Weather research doc + codebase audit
- Goal: Single reusable weather fetch function for all consumers
- Scope: New `lib/weather/provider.ts` + `lib/weather/types.ts`. Extract from `remy-weather.ts`. Use stored lat/lng first.
- AC: (1) `getEventWeatherForecast()` returns structured forecast with hourly data + sunrise/sunset. (2) `remy-weather.ts` imports from new utility. (3) Zero geocoding calls when lat/lng stored. (4) Returns null on error, never throws.
- Risks: Must not break existing Remy weather alerts during extraction
- Dependencies: None
- Verification: Existing weather alerts still fire. Event detail WeatherPanel still renders.
- Proof: `npm run test:affected` passes. Remy weather alerts generate for test event.

**QUEUE-2: Weather as 9th Risk Dimension (FW1)**

- Raw source: Research doc section 3.2 + operational-risk.ts audit
- Goal: Weather scores alongside 8 existing dimensions
- Scope: Add `WeatherRiskInput`, `scoreWeather()`, wire into assessment hydration
- AC: (1) 92F outdoor event: weather risk >= 50. (2) 72F indoor: weather risk 0-10. (3) Rain 60% outdoor: >= 40 with tent mitigation. (4) No forecast: scored conservatively as null (existing pattern). (5) Weight 1.3.
- Risks: Must handle no-forecast without inflating risk. Indoor events must not be penalized.
- Dependencies: QUEUE-1
- Verification: Unit tests for all threshold boundaries. Integration test with real event.
- Proof: `tests/unit/weather-risk-scoring.test.ts` passes. Event risk panel shows weather dimension.

**QUEUE-3: Enrich Weather Alert Language (QW2)**

- Raw source: Research doc section 3.4 + remy-weather.ts audit
- Goal: Chef-specific contextual language in weather alerts
- Scope: Rewrite alert message generation in `remy-weather.ts` with tiered wind thresholds, food safety heat language, and event-type-aware context
- AC: (1) Wind alerts include operational mitigations (candles, tablecloths, burners). (2) Heat alerts mention food safety (hold times, cold chain). (3) Outdoor events get richer context than indoor. (4) Alert messages read like chef advice, not weather reports.
- Risks: Low
- Dependencies: QUEUE-1
- Verification: Unit tests with mock forecasts verify message content
- Proof: `tests/unit/remy-weather-alerts.test.ts` passes

### Needs More Spec Before Queueing

**SPEC-1: Weather-Conditional Checklist Items (UF1)**

- Questions:
  1. Should this be a new "pre-event checklist" component or extend the existing post-event checklist pattern?
  2. Should items appear on event detail page, in Remy alerts, or both?
  3. What is the maximum number of weather items to show? (Research suggests cap at 5)
  4. Should chef be able to dismiss/hide weather checklist items?
  5. Should items appear only within 48h of event, or earlier?

**SPEC-2: Historical Weather Snapshots (DI1)**

- Questions:
  1. Should weather snapshot capture be automatic on event completion, or prompted?
  2. Should chef notes be captured via modal, inline text field, or Remy conversation?
  3. How should historical weather surface? Risk engine context? Remy mention? Venue detail page?
  4. Migration: new table or add columns to existing event tables?

**SPEC-3: Cadence Weather Context (UF3)**

- Questions:
  1. Which cadence points should include weather? (Research suggests 3-day and 48-hour)
  2. Should weather appear in chef-only messages, client-facing messages, or both?
  3. What tone for client-facing? ("Beautiful evening expected" vs "74F, partly cloudy")
  4. Should weather line be in email subject, body intro, or footer?

---

## 10. Items Needing More Spec

See SPEC-1, SPEC-2, SPEC-3 above.

---

## 11. Follow-Up Research Tasks

| Task                                      | Why Needed                                                  | Unblocks                      | Evidence Needed                             |
| ----------------------------------------- | ----------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| Inspect WeatherPanel component            | Understand current depth of weather display on event detail | Scope of UI refinement work   | Read component source, assess what it shows |
| Inspect remy-weather.ts thresholds        | Understand current alert threshold values                   | QW2 enrichment scope          | Read current threshold constants            |
| Benchmark Open-Meteo response times       | Ensure weather fetch doesn't slow event detail page load    | FW2 caching strategy          | Time 10 API calls, measure P50/P95          |
| Research USDA food safety temp/time rules | Accurate hold time adjustments for heat                     | Menu-aware heat warnings (O1) | USDA Danger Zone guidelines                 |
| Research regional frost date datasets     | Seasonal ingredient alerts                                  | O5 seasonal menu intelligence | USDA Plant Hardiness Zone data availability |

---

## 12. Risks and Unresolved Questions

| Risk                              | Impact                                            | Mitigation                                                                       |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| Open-Meteo downtime               | Weather features degrade                          | All consumers handle null gracefully. Risk engine scores unknown conservatively. |
| Forecast inaccuracy > 3 days out  | Checklist items or alerts based on wrong forecast | Only show weather-conditional items within 48h. Refresh forecast every 6h.       |
| Over-alerting                     | Chef ignores weather alerts because too many      | Cap alerts per event. Only alert on operationally significant thresholds.        |
| Event without location            | Cannot fetch weather                              | Skip weather dimension. Score as null. Show "Add location for weather intel."    |
| Indoor events flagged for weather | False positives                                   | Indoor events only score travel-related weather risk, not service conditions.    |
| Migration risk (DI1)              | New table touches production DB                   | Additive only. No existing table changes. Standard migration safety.             |

**Unresolved:**

- Should WeatherPanel be refactored or left as-is during this work?
- Is there a pre-event checklist concept anywhere, or only post-event?
- Does the cadence system support dynamic content injection, or are templates static?
