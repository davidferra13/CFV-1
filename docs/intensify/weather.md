# Intensify: Weather Zone

## Deep-Pass Run 2026-05-16

STATUS: fresh (run #1, major infrastructure discovered)
DEPTH: normal (3 intensify agents + 5 OTS lenses)

---

## /deep-pass: weather

**Status:** Fresh, high yield | **Trend:** Increasing (first run, many discoveries) | **Run:** #1

### Critical Discovery

Build queue items added from research were written BEFORE codebase audit revealed existing weather infrastructure. **4 of 12 queue items need correction:**

| Queue Item                          | Issue                                                                                                                      | Correction                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| #1 Weather Fetch Utility Extraction | `lib/weather/open-meteo.ts` + `lib/weather/weather-actions.ts` ALREADY EXIST as shared utility                             | Change to: "Wire remy-weather.ts to use shared utility" (much smaller scope) |
| #2 Fix Geocoding Redundancy         | Correct as-is                                                                                                              | No change needed                                                             |
| #3 Weather as 9th Risk Dimension    | `lib/formulas/weather-risk.ts` ALREADY scores 0-100. Not a new dimension; it's wiring existing scorer into existing engine | Change to: "Wire weather-risk.ts into operational-risk.ts venue scoring"     |
| #10 Weather-Conditional Checklist   | post-event-checklist.tsx is wrong target (hardcoded, post-event). Need new pre-event component                             | Correct target; note requires new component                                  |

Additionally, **8 HIGH/MED yield moves were discovered that are NOT in the build queue.**

### Selected Lenses

1. **Professional Event Chef** - domain authority on what weather changes operationally
2. **SRE / Reliability Engineer** - external API risk, caching, degradation
3. **Product Manager (Metrics-Driven)** - signal vs noise, user value
4. **Food Safety Specialist** - USDA guidelines, temperature/time, liability
5. **Information Architect** - weather hierarchy across surfaces, progressive disclosure

### Moves (Expert-Validated)

#### Tier 1: HIGH yield, pure wiring, expert-endorsed

1. **Fill venue_details nulls in risk engine** - `event_venue_details` has `has_oven`, `has_refrigeration`, `weather_exposure` but `event-risk-assessment.ts` hard-nulls all 4 venue fields. 4 lines of SQL fills them. **Chef endorses** (these are real operational factors). **SRE endorses** (no external dependency, pure DB read). **PM endorses** (immediate risk score accuracy improvement).

2. **Wire weather-risk.ts into operational-risk.ts** - Formula engine (`lib/formulas/weather-risk.ts`) already scores 0-100. Risk engine has 8 dimensions. Wire weather score as venue multiplier when `weather_exposure = true`. **Chef endorses** (outdoor event in thunderstorm IS higher risk). **Food Safety cautions**: air temp is proxy, not rule; don't give specific hold-time advice from ambient temp alone. **SRE cautions**: must timeout weather API call, never block risk assessment.

3. **Activate dead rail resolver for chef.event_risk_weather** - Rail item registered in chef-rail-registry.ts line 618 but NO RESOLVER exists. Write `weather-resolver.ts` that maps `getWeatherAlerts()` output to rail items. **PM endorses strongly** (dead code = wasted prior investment; activation is free value). **IA endorses** (rail is correct alert surface for weather).

4. **Wire weather into drive briefing** - `lib/mobile/drive-briefing.ts` has event location but no weather. Chef is driving to venue. Most natural weather surface in entire app. **Chef endorses strongly** (chefs check weather before driving out). **IA endorses** (context-appropriate placement).

5. **Add weather to prep sheet PDF** - `generate-prep-sheet.ts` has zero environmental context. Chef making food safety decisions without knowing it'll be 98F. **Food Safety endorses strongly** (operationally critical for hold-time and transport decisions). **Chef endorses** (staff read prep sheets, not the app).

6. **Add weather to event summary PDF** - `generate-event-summary.ts` has TIMING section but no forecast. One-line addition using existing `getEventWeatherForecast()`. **Chef endorses** (reference doc for the day). **SRE endorses** (graceful degradation if no forecast; section omitted).

7. **Add weather to cadence messages (3d/48h)** - Cadence scheduler supports `{varName}` interpolation. Add `{weatherLine}` that resolves to forecast summary. **PM endorses** (reduces client inbound questions about weather). **Chef endorses** (professional touch in communication).

8. **Wire weather into operational load scoring** - `lib/intelligence/operational-load.ts` scores day complexity with 6 factors. Weather is real operational load (heat = food safety pressure, rain = slower setup). **Chef endorses** (a 95F day with 3 outdoor events IS harder). **PM endorses** (makes heatmap accurate).

#### Tier 2: MED yield, pure or partial wiring

9. **Fix geocoding redundancy in remy-weather.ts** - Uses address geocoding despite lat/lng on events table. **SRE endorses** (eliminates 5-second timeout path, reduces API calls).

10. **Wire WeatherForecastCard orphan** - Fully built component, zero imports. Replace older `WeatherAlertPanel` in tickets tab. **IA endorses** (better component with caching and risk badge).

11. **Verify packing list weather prop** - `packing-list-client.tsx` accepts `weather?: EventWeather` and has `getWeatherSuggestions()`. Parent may not pass it. **Chef endorses** (packing list should reflect conditions).

12. **Connect weather risk to contingency template** - `lib/templates/contingency.ts` uses static thresholds. `weather-risk.ts` computes real ones. Wire live data into template. **Chef endorses** (contingency plans should reflect actual forecast).

13. **CIL weather signal source** - Add `weather` to SignalSource, emit when forecast changes significantly. Pluggable `INGESTORS` pattern. **PM endorses** (enables downstream automation).

14. **Client countdown page weather** - `app/(client)/my-events/[id]/countdown/` has no environmental context. Reduces "should I get a tent?" questions. **PM endorses** (reduces inbound support). **IA cautions** (keep it one line, not a weather widget).

15. **Calendar month view weather badges** - Day/week views already fetch weather; month does not. **IA cautions** (month view already dense; show badge ONLY for high/critical risk, not every event).

16. **Autopilot draft weather context** - Append weather forecast to LLM prompt context. AI decides whether to mention it. **Chef endorses** (natural communication).

### Expert Additions

- **Food Safety**: Real value is TRANSPORT warnings. 95F + 60-minute drive = cold chain alert. Connect `travelDistanceMinutes` + temperature for transport risk scoring.
- **Information Architect**: Establish weather information hierarchy: PRIMARY (event detail), ALERT (rail + Remy), REFERENCE (PDF/prep sheet), PASSIVE (calendar badge). Don't show weather on every surface.
- **SRE**: Add circuit breaker / timeout for Open-Meteo calls in risk engine path. Never block risk assessment on external API.

### Rejected

- **Menu intelligence seasonal warnings via weather**: Chef lens says forced. Real chefs rely on suppliers for availability, not weather APIs. Static seasonal calendar already works.
- **Shopping list auto-adding ice**: Chef lens says chefs know when to bring ice. Auto-adding items to their shopping list is patronizing.
- **Revenue forecast weather correlation**: PM lens says insufficient historical data. Pure speculation.
- **Staff today widget weather**: IA lens says too compact, wrong surface. Noise.
- **Unify severity type systems**: Low yield, no user impact. Defer until it causes an actual bug.

### Skip

- Historical weather snapshots (Move 11 in queue): Needs migration. MED yield. Queue it but don't prioritize over pure wiring moves.
- Weather-conditional pre-event checklist: Needs new component. Not wiring. Queue it but Wave 5.

### Pause When

All 8 Tier 1 moves are wired. Then re-assess: does the weather zone have more yield, or has it reached near-saturated? The reset trigger would be: new weather API capabilities (pollen, AQI) or new operational surfaces (mobile app, staff portal) that need weather.

### Best Next Move

**Fill venue_details nulls in risk engine** (Move 1). Zero external dependency, 4 lines of SQL, fills 4 null fields that the scoring engine already handles. Immediate risk score accuracy improvement across ALL events, not just weather-related ones. Pure internal wiring.

---

SURFACED:

- 4 weather subsystems already exist (open-meteo.ts, weather-actions.ts, weather-risk.ts, remy-weather.ts)
- WeatherForecastCard is orphaned (built, never imported)
- chef.event_risk_weather rail item registered but no resolver (dead code)
- event_venue_details has weather_exposure, has_oven, has_refrigeration (unused by risk engine)
- Drive briefing has no weather despite being most natural surface
- Prep sheet has zero environmental context (food safety gap)
- Operational load scoring ignores weather as complexity factor
- Packing list accepts weather prop but parent may not pass it
- Contingency template uses static thresholds, not live weather data
- Build queue item #1 largely already done (utility exists)

LENSES_USED:

- Professional Event Chef: domain authority on operational weather impact
- SRE / Reliability Engineer: external API risk and degradation patterns
- Product Manager (Metrics-Driven): signal vs noise, dead code as wasted investment
- Food Safety Specialist: temperature/time rules, transport risk
- Information Architect: weather hierarchy, progressive disclosure

EXPERT_VALIDATION:

- Fill venue nulls: endorsed (all lenses) - pure internal, zero risk
- Wire weather-risk into operational-risk: endorsed with caveat (Food Safety: air temp is proxy not rule; SRE: must timeout API)
- Rail resolver activation: endorsed strongly (PM: dead code = wasted investment)
- Drive briefing weather: endorsed strongly (Chef: most natural surface)
- Prep sheet weather: endorsed strongly (Food Safety: operationally critical)
- Event summary PDF weather: endorsed (Chef: reference doc)
- Cadence weather context: endorsed (PM: reduces inbound questions)
- Operational load weather: endorsed (Chef: real complexity factor)
- Menu seasonal via weather: rejected (Chef: forced, suppliers handle this)
- Shopping list auto-ice: rejected (Chef: patronizing)
- Revenue forecast weather: rejected (PM: insufficient data)

EXPERT_ADDITIONS:

- Transport risk scoring: travelDistanceMinutes + temperature = cold chain alert (Food Safety)
- Weather information hierarchy: primary/alert/reference/passive (IA)
- Circuit breaker for Open-Meteo in risk engine path (SRE)

REJECTED:

- Menu intelligence seasonal warnings: forced, chefs use suppliers
- Shopping list auto-adding ice: patronizing
- Revenue forecast weather correlation: insufficient data
- Staff today widget weather: wrong surface, noise
- Severity type unification: low yield, defer

ACTED ON: (pending dispatch)

SKIPPED:

- Historical weather snapshots: needs migration, MED yield, defer
- Weather-conditional pre-event checklist: needs new component, not wiring

CROSS_REFS:

- [[risk-engine]]: venue_details nulls are zone-adjacent (not weather-specific)
- [[discovery-rail]]: dead resolver for chef.event_risk_weather
- [[cadence]]: weather context injection at 3d/48h points
- [[cil]]: new weather signal source
- [[mobile]]: drive briefing weather integration

NEXT TRIGGER: All Tier 1 moves wired, OR new operational surfaces (mobile app, staff portal)

---

## Build Prompts (Ready to Dispatch)

### Wave 1 (Parallel, Zero Dependencies)

#### Agent: venue-details-risk-nulls

- **Model:** haiku
- **Zone:** risk-engine / weather
- **Task:** Fill 4 null fields in `lib/events/event-risk-assessment.ts` by querying `event_venue_details` table. In `getEventRiskAssessment()`, after step 8 (venue context, ~line 133), query `event_venue_details` for the event's venue. Map: `has_oven && has_stovetop` -> `venueHasFullKitchen`, `has_oven` -> `venueOvenCount` (1 or 0), `has_stovetop` -> `venueBurnerCount` (4 if true, 0 if false), `has_refrigeration` -> `hasRefrigeration`. Same for `getDishRiskPreview()` (~line 229). If no venue_details row, keep nulls (current behavior).
- **Read first:** `lib/events/event-risk-assessment.ts` (lines 118-138 and 228-248), `lib/db/schema/schema.ts` (search for `event_venue_details` table definition around line 19087)
- **Expert backing:** All 5 lenses endorsed. Zero external dependency, pure internal wiring.
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Event with venue_details row shows non-null venue risk factors. Event without venue_details row still works (nulls preserved).
- **Caveats:** Do NOT add new fields to EventRiskInput type; fill existing null fields only. Use the existing Supabase client pattern (db.from().select().eq()).

#### Agent: fix-geocoding-redundancy

- **Model:** haiku
- **Zone:** weather
- **Task:** In `lib/ai/remy-weather.ts`, modify the event query in `getWeatherAlerts()` to also select `location_lat, location_lng` from the events table. When both are non-null, use them directly for the Open-Meteo forecast call instead of geocoding `location_address`. Fall back to address geocoding only when coordinates are null. This eliminates redundant geocoding API calls.
- **Read first:** `lib/ai/remy-weather.ts` (full file, focus on event query and geocodeLocation usage), `lib/weather/open-meteo.ts` (to understand the forecast function signature)
- **Expert backing:** SRE endorsed (eliminates 5-second timeout path). Chef endorsed (faster weather checks).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Event with stored lat/lng triggers zero geocoding calls. Event with only address still geocodes correctly.
- **Caveats:** Do not change the function signatures or return types. Do not remove the geocoding function; it's still needed as fallback.

#### Agent: activate-weather-rail-resolver

- **Model:** haiku
- **Zone:** discovery-rail / weather
- **Task:** Create `lib/discovery/resolvers/chef/weather-resolver.ts`. This resolver activates the already-registered `chef.event_risk_weather` rail item (registered in `chef-rail-registry.ts` line 618). Import `getWeatherAlerts` from `lib/ai/remy-weather.ts`. Map each `EventWeatherAlert` to a `GodModeResolvedItem` using the registered definition ID. Set priority based on alertLevel: severe=p1, warning=p2, info=p3. Then register the resolver in `lib/discovery/resolvers/chef/index.ts` (or wherever resolvers are aggregated) following the exact pattern of existing resolvers like `intelligence-resolver.ts` or `staff-resolver.ts`.
- **Read first:** `lib/discovery/registries/chef-rail-registry.ts` (line 618, the event_risk_weather definition), `lib/discovery/resolvers/chef/intelligence-resolver.ts` (pattern to follow), `lib/ai/remy-weather.ts` (getWeatherAlerts signature and return type), `lib/discovery/universal-rail-types.ts` (GodModeResolvedItem type)
- **Expert backing:** PM endorsed strongly (dead code activation = free value). IA endorsed (rail is correct alert surface).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Resolver is registered and called during rail assembly. Events with weather alerts produce rail items.
- **Caveats:** Follow existing resolver patterns exactly. Do not modify the rail registry definition. Cap at 3 weather rail items maximum (don't flood the rail).

#### Agent: drive-briefing-weather

- **Model:** haiku
- **Zone:** mobile / weather
- **Task:** Add `weather: EventWeather | null` field to the `DriveBriefing` type in `lib/mobile/drive-briefing.ts`. In the function that builds the briefing, call `getEventWeatherForecast(eventId)` from `lib/weather/weather-actions.ts` (or `getWeatherForDate` from `lib/weather/open-meteo.ts` using event's lat/lng and date). Populate the field. If weather fetch fails or event has no coordinates, set to null.
- **Read first:** `lib/mobile/drive-briefing.ts` (full file), `lib/weather/weather-actions.ts` (getEventWeatherForecast signature), `lib/weather/open-meteo.ts` (EventWeather type definition)
- **Expert backing:** Chef endorsed strongly (most natural weather surface). IA endorsed (context-appropriate).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. DriveBriefing type includes weather field. Briefing for event with coordinates includes weather data.
- **Caveats:** Wrap weather fetch in try/catch. Never fail the entire briefing because weather API is down. Null is acceptable default.

#### Agent: prep-sheet-weather

- **Model:** haiku
- **Zone:** documents / weather
- **Task:** Add a one-line weather forecast to the prep sheet PDF generated by `lib/documents/generate-prep-sheet.ts`. In the data fetch function, call `getEventWeatherForecast(eventId)` from `lib/weather/weather-actions.ts`. In the render function, after the prep timeline section, add a line like: `Weather: Clear, High 82F / Low 68F | Rain: 10%`. If no forecast available, omit the line entirely.
- **Read first:** `lib/documents/generate-prep-sheet.ts` (full file, focus on data fetch function and render function structure), `lib/weather/weather-actions.ts` (getEventWeatherForecast return type)
- **Expert backing:** Food Safety endorsed strongly (operationally critical for hold-time decisions). Chef endorsed.
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Prep sheet for event with coordinates includes weather line. Prep sheet for event without coordinates renders normally (no weather line).
- **Caveats:** Keep it one line. No weather widget in the PDF. Format: `Weather: {condition}, High {high}F / Low {low}F | Rain: {precip}%`. Use existing PDF text helpers.

#### Agent: event-summary-pdf-weather

- **Model:** haiku
- **Zone:** documents / weather
- **Task:** Add a FORECAST section to the event summary PDF in `lib/documents/generate-event-summary.ts`. In `fetchEventSummaryData()`, add `getEventWeatherForecast(eventId)` to the existing parallel Promise.all block. In `renderEventSummary()`, after the TIMING section, add a `FORECAST` section using existing `colSectionHeader()` and `colKeyValue()` helpers. Show: Condition, Temperature range, Wind, Rain probability, Sunset time. If no forecast data, omit the entire section.
- **Read first:** `lib/documents/generate-event-summary.ts` (full file, focus on fetchEventSummaryData and the TIMING section rendering), `lib/weather/weather-actions.ts` (getEventWeatherForecast return type)
- **Expert backing:** Chef endorsed (reference doc). SRE endorsed (graceful degradation).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Event summary PDF includes FORECAST section when weather data available. PDF renders normally when no forecast.
- **Caveats:** Use existing `colSectionHeader`/`colKeyValue` helpers. Do not add new PDF rendering utilities. Sunset time is available from Open-Meteo daily forecast response.

### Wave 2 (After Wave 1 Verified, Parallel)

#### Agent: weather-risk-into-operational-risk

- **Model:** opus
- **Zone:** risk-engine / weather
- **Task:** Wire the existing weather risk formula (`lib/formulas/weather-risk.ts`, which returns a 0-100 score + warnings) into the operational risk engine (`lib/costing/operational-risk.ts`). This is NOT a new 9th dimension; instead, enhance the existing `scoreVenue()` function: when the event has `weather_exposure = true` (from event_venue_details, wired in Wave 1), multiply the venue score boost by the weather risk score. Add a `WeatherRiskInput` to `EventRiskInput` with fields: `weatherRiskScore: number | null`, `weatherWarnings: string[] | null`, `isOutdoor: boolean | null`. In `event-risk-assessment.ts`, call `getEventWeatherForecast()` in the hydration function and pass `assessWeatherRisk()` result into the input. The venue dimension should show weather-specific mitigations when weather risk is elevated.
- **Read first:** `lib/formulas/weather-risk.ts` (full file, understand WeatherRiskResult type and assessWeatherRisk function), `lib/costing/operational-risk.ts` (scoreVenue function lines 333-387, EventRiskInput type), `lib/events/event-risk-assessment.ts` (getEventRiskAssessment hydration flow)
- **Expert backing:** Chef endorsed (outdoor event in thunderstorm IS riskier). Food Safety cautions: air temp is proxy, not rule. SRE cautions: timeout the weather API call; never block risk assessment.
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Outdoor event with 92F forecast shows elevated venue risk. Indoor event is unaffected. Event with no forecast computes normally (null handling). Weather API timeout does not block risk assessment.
- **Caveats:** MUST wrap weather fetch in Promise.race with 3-second timeout. If timeout, proceed with null weather data. Do NOT add a new dimension to the weights map; enhance venue dimension conditionally. Food Safety: do NOT generate specific hold-time recommendations from ambient temperature alone.

#### Agent: cadence-weather-context

- **Model:** haiku
- **Zone:** communication / weather
- **Task:** Add weather context to cadence messages at the `3_days_before` and `48_hours_before` touchpoints in `lib/communication/cadence-scheduler.ts`. In `sendCadenceEmail()`, after loading event data, call `getEventWeatherForecast(eventId)` from `lib/weather/weather-actions.ts`. Add a `{weatherLine}` template variable that resolves to a one-line forecast summary (e.g., "Forecast: 74F, Clear, light wind") or empty string if no forecast. For the `ConfidenceCadenceEmail` component (if it accepts props), add an optional weather row to the details table. For SMS (48h point), append weather as short text if character budget permits.
- **Read first:** `lib/communication/cadence-scheduler.ts` (full file, focus on sendCadenceEmail and template variable interpolation), `lib/communication/cadence-types.ts` (CadencePoint types), `lib/weather/weather-actions.ts` (getEventWeatherForecast)
- **Expert backing:** PM endorsed (reduces inbound client questions). Chef endorsed (professional communication).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. 3-day cadence email includes weather line. 48h SMS includes short weather if space permits. Messages send normally when no forecast available.
- **Caveats:** Weather line is OPTIONAL. Never fail a cadence message because weather API is unavailable. Keep weather text under 50 characters for SMS. For client-facing tone: "Beautiful evening expected, 74F" not "Temp: 74, Precip: 0%".

#### Agent: operational-load-weather

- **Model:** haiku
- **Zone:** intelligence / weather
- **Task:** Add weather as a factor in `lib/intelligence/operational-load.ts`. Add `weatherRisk: number` to the `DayLoadBreakdown` type. In the day scoring function, for each event on that day, call `assessWeatherRisk()` from `lib/formulas/weather-risk.ts` using the event's weather forecast (from `getWeatherForDate()` in `lib/weather/open-meteo.ts`). Average the weather risk scores across the day's events. Multiply by weight 0.15 and add to rawScore. If no weather data for any event, default weatherRisk to 0 (no impact).
- **Read first:** `lib/intelligence/operational-load.ts` (full file, focus on DayLoadBreakdown type and scoring logic), `lib/formulas/weather-risk.ts` (assessWeatherRisk function signature), `lib/weather/open-meteo.ts` (getWeatherForDate function)
- **Expert backing:** Chef endorsed (weather is real operational complexity). PM endorsed (makes heatmap accurate).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Day with 95F outdoor event scores higher load than same day at 72F. Day with no events or no weather data scores 0 weather load.
- **Caveats:** Wrap weather fetch in try/catch. Weather failure should never break load calculation. Weight 0.15 is conservative; weather should influence, not dominate.

### Wave 3 (After Wave 1, Independent)

#### Agent: wire-weatherforecastcard-orphan

- **Model:** haiku
- **Zone:** events / weather UI
- **Task:** `components/events/weather-forecast-card.tsx` is a fully-built component that is NEVER imported by any page. Find where `WeatherAlertPanel` is used (reportedly in `event-detail-tickets-tab.tsx` around line 1058) and replace it with `WeatherForecastCard`, which has proper server action caching and includes the risk assessment badge. If `WeatherAlertPanel` has no other consumers after this change, leave it (do not delete code).
- **Read first:** `components/events/weather-forecast-card.tsx` (understand its props and rendering), `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` (find WeatherAlertPanel usage), search for other imports of WeatherAlertPanel across the codebase
- **Expert backing:** IA endorsed (better component with caching). PM endorsed (dead code activation).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. WeatherForecastCard is imported and rendered on at least one page. WeatherAlertPanel is still importable (not deleted).
- **Caveats:** Verify prop compatibility before swapping. If WeatherForecastCard needs different props than WeatherAlertPanel provides, adapt the parent's data passing, not the component.

#### Agent: contingency-template-live-weather

- **Model:** haiku
- **Zone:** templates / weather
- **Task:** In `lib/templates/contingency.ts`, wire live weather data into contingency plan generation. The template already generates weather contingency plans for outdoor events using static thresholds. Import `assessWeatherRisk` from `lib/formulas/weather-risk.ts` and call it with the event's forecast when available. Add an optional `weatherWarnings: string[]` to `ContingencyVars` (or equivalent type). When warnings exist, inject them into the contingency plan's trigger conditions instead of using static "60% rain chance" text.
- **Read first:** `lib/templates/contingency.ts` (full file, understand ContingencyVars type and how weather sections are generated), `lib/formulas/weather-risk.ts` (assessWeatherRisk return type, warnings array)
- **Expert backing:** Chef endorsed (contingency plans should reflect actual forecast).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Contingency plan for outdoor event with forecast uses live weather warnings. Contingency plan without forecast still generates using static thresholds.
- **Caveats:** Do NOT remove static threshold fallback. Live data supplements, doesn't replace. Static thresholds are the safety net when API is unavailable.

#### Agent: cil-weather-signal

- **Model:** haiku
- **Zone:** cil / weather
- **Task:** Add `'weather'` to the `SignalSource` union type in `lib/cil/types.ts`. Add a `weather` ingestor function in `lib/cil/ingest.ts` following the existing `INGESTORS` Record pattern. The ingestor should update the event entity with weather state metadata (weather_risk_score, weather_condition). Then in `lib/ai/remy-proactive-alerts.ts`, after `checkWeatherForEvents()` runs, emit a CIL signal for each event that was checked, using the existing CIL emit pattern from other alert types.
- **Read first:** `lib/cil/types.ts` (SignalSource union type, CILSignal interface), `lib/cil/ingest.ts` (INGESTORS Record pattern, existing ingestor examples), `lib/ai/remy-proactive-alerts.ts` (checkWeatherForEvents function, how other alert types emit CIL signals)
- **Expert backing:** PM endorsed (enables downstream automation).
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. `weather` is a valid SignalSource. Weather check emits CIL signal. Ingestor handles the signal without error.
- **Caveats:** Follow existing patterns EXACTLY. Do not invent new CIL conventions. If existing alert types don't emit CIL signals, find the correct emission point by searching for `notifyCIL` or `emitSignal` patterns.

### Dispatch Notes

- Total agents: 12
- Estimated tier cost: 10 haiku + 2 opus
- Wave 1: 6 agents (parallel, zero dependencies, ~30 min)
- Wave 2: 3 agents (parallel, depend on Wave 1, ~30 min)
- Wave 3: 3 agents (parallel, depend on Wave 1 only, can run alongside Wave 2)
- Verification after all waves: `npx tsc --noEmit --skipLibCheck && npm run test:affected`
- Opus agents: weather-risk-into-operational-risk (multi-file judgment, timeout logic, scoring weight decisions)
- All other agents are mechanical single-file wiring (haiku)

BUILD_PROMPTS: see above (12 prompts across 3 waves)
PROMPT_STATUS: DISPATCHED (Waves 1-3 complete, all verified 2026-05-16)

DISPATCHED:

- Wave 1 (6 haiku): venue-nulls, fix-geocoding, rail-resolver, drive-briefing, prep-sheet-weather, event-summary-weather - ALL VERIFIED
- Wave 2 (1 opus + 2 haiku): weather-risk-into-operational-risk, cadence-weather-context, operational-load-weather - ALL VERIFIED
- Wave 3 (3 haiku): wire-weatherforecastcard-orphan, contingency-template-live-weather, cil-weather-signal - ALL VERIFIED
- Total: 12 agents, ~16 files modified/created, zero type errors across all waves
