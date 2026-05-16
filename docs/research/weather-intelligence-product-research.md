# Weather Intelligence for ChefFlow: Product Research

> Research date: 2026-05-16
> Source: Weather Channel app UX analysis + ChefFlow codebase audit
> Status: RESEARCH (not spec)

---

## 1. What the Screenshots Teach Us

The Weather Channel app organizes environmental data into **decision-enabling cards**, not raw data dumps. Key patterns:

**Contextual language over raw numbers.** "It's breezy" instead of just "14 mph." "Lower than yesterday" instead of just "27%." The app interprets data for the user. ChefFlow should do the same: "Too windy for outdoor plating" instead of "Wind: 22 mph."

**Activity recommendations.** The "Running: Good" card maps weather to a specific activity. ChefFlow equivalent: "Outdoor dinner: Caution" or "Load-in conditions: Clear."

**Time-anchored forecasts.** Hourly temps dropping from 78 to 66 across the evening tell a story. For a chef, that story is: "Start warm, guests will get cold after sunset. Plan hot courses for later service."

**Layered detail.** Main screen = big picture (79, Sunny). Scroll = operational detail (UV, pollen, wind, dew point). ChefFlow should show "Event Weather: Good" at glance, then expand to show why and what to watch.

**Sunset/sunrise as event markers.** 8:01 PM sunset is not trivia for a chef doing a 7 PM outdoor dinner. It means: candles needed by 8:15, lighting rig if serving past 8:30, golden-hour photos at 7:30.

**Comparative framing.** "Lower than yesterday" gives context. ChefFlow equivalent: "10 degrees cooler than your last outdoor event at this venue."

**Multi-day planning.** The 7-day forecast with rain percentages maps directly to event week planning. Tuesday 92/71 with 24% rain is different prep than Thursday 64/46 with 2%.

---

## 2. ChefFlow-Specific Opportunities

### What Weather Actually Changes for a Chef

| Decision Domain         | What Weather Affects                                                                                            | When It Matters         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Menu planning**       | Cold food vs hot food balance, frozen desserts, chocolate work, cream stability, soup vs salad ratios           | 3-7 days before event   |
| **Ingredient sourcing** | Heat-sensitive items (chocolate, butter, cream), items that wilt in humidity, seasonal peak windows             | 2-5 days before         |
| **Prep scheduling**     | Dough proofing speed (humidity/temp), chocolate tempering difficulty, meringue stability, stock reduction speed | Day before + day of     |
| **Equipment packing**   | Coolers vs warmers, tent/canopy needs, portable shade, fan/heater, ice quantities, chafing dishes               | Day before              |
| **Transport**           | Cold chain integrity during hot weather, ice melt rates, food safety hold times shrink in heat                  | Morning of              |
| **Service execution**   | Plating speed (food cools/melts faster), outdoor burner efficiency in wind, grill flare management              | During event            |
| **Staff safety**        | Heat exhaustion risk, hydration planning, shade for kitchen staff, cold weather gear                            | During event            |
| **Guest comfort**       | Indoor/outdoor decision, heating/cooling needs, blanket/fan provisions, bug spray timing                        | Event planning + day of |
| **Photography**         | Golden hour timing for food photos, natural lighting quality, rain contingency                                  | Event day               |
| **Post-event**          | Leftover transport safety, equipment drying (rain), cleanup timing                                              | After event             |

### What Weather Does NOT Affect (Do Not Build)

- Recipe creation workflow
- Client relationship management
- Invoice/payment processing
- Ingredient library management
- Staff hiring/scheduling (weather adjusts existing schedule, does not drive it)

---

## 3. Features Worth Building

### Tier 1: High Impact, Low Complexity (MVP)

**3.1 Event Weather Risk Card**

- Lives on event detail overview tab alongside existing risk assessment
- Shows weather forecast for event date + location
- Color-coded: Green/Yellow/Orange/Red
- One-sentence summary: "Clear skies, 72F at service time. Low wind. Good conditions."
- Pulls from event's date + venue zip/location

**3.2 Weather as 9th Risk Dimension**

- Integrate into existing `lib/costing/operational-risk.ts` engine
- New `scoreWeather(event: EventRiskInput)` function
- Factors: temperature extremes, rain probability, wind speed, humidity
- Mitigations auto-generated: "Rain 60%: confirm tent/indoor backup"
- This is the highest-leverage feature because the risk engine already exists

**3.3 Outdoor Event Readiness Checklist**

- When event_type includes outdoor/garden/farm/backyard/patio:
  - Auto-add weather-dependent checklist items
  - "Check forecast 48 hours before"
  - "Confirm tent/canopy if rain > 30%"
  - "Pack extra ice if temp > 85F"
  - "Bring portable fans if temp > 90F"
  - "Wind backup plan if gusts > 20 mph"
- Integrates with existing post-event-checklist.tsx pattern

**3.4 Smart Pre-Event Reminders (via Remy)**

- 48 hours before event: Remy sends weather-aware prep note
- "Saturday's dinner at [venue]: 85F expected, partly cloudy. Consider swapping the chocolate tart for sorbet. Pack extra cooler ice."
- 6 hours before: "Today's forecast: 72F dropping to 64F by 8 PM. Guests may want a warm course later in service."
- Wires into existing `lib/ai/remy-proactive-alerts.ts`

### Tier 2: Medium Impact, Medium Complexity

**3.5 Sunset/Sunrise Event Timeline Integration**

- For outdoor events, auto-insert sunset time into service timeline
- "Sunset at 8:01 PM: transition to candlelight/string lights"
- "Golden hour 7:15-7:45: ideal for food photography"
- "Civil twilight ends 8:35 PM: full dark, lighting required"
- Useful for event packet generation (`lib/documents/generate-event-summary.ts`)

**3.6 Heat-Risk Alerts for Food Safety**

- Temperature > 85F triggers food safety warnings
- "Danger zone reminder: perishables left out shrink from 4 hours to 2 hours above 90F"
- "Seafood, dairy, cream sauces: transport in coolers with temperature monitoring"
- "Chocolate work: ambient above 80F makes tempering extremely difficult"
- Maps to specific menu items via recipe ingredient analysis

**3.7 Wind-Risk Alerts for Outdoor Service**

- Wind > 15 mph: "Secure paper menus, use menu cards or boards"
- Wind > 20 mph: "Candle alternatives needed. Secure tent flaps. Weight tablecloths."
- Wind > 25 mph: "Outdoor grilling affected. Burner efficiency drops. Add 15-20% cook time."
- Wind > 35 mph: "Outdoor service not recommended. Activate indoor backup plan."

**3.8 Client-Facing Weather Note**

- Auto-generated weather summary for client communication
- "We're watching the forecast for Saturday. Current outlook: beautiful evening, 74F at service time. We'll have contingency plans ready if anything changes."
- Wires into email templates and cadence scheduler

### Tier 3: High Impact, High Complexity (Future)

**3.9 Seasonal Menu Intelligence**

- Cross-reference weather patterns with PIE seasonal data
- "Peak strawberry season in your region. 3 of your recipes use strawberries. Great time to feature them."
- "First frost expected next week. Last chance for fresh basil, tomatoes, zucchini."
- Requires regional agricultural data beyond simple weather

**3.10 Multi-Event Weather Dashboard**

- Calendar view showing weather forecast overlay on upcoming events
- Quick scan: "Next 3 events all clear. Thursday event has 40% rain chance."
- Color-coded dots on calendar

**3.11 Historical Weather Intelligence**

- "Last time you cooked at [venue] in July, it was 91F. You noted 'ice melted too fast.'"
- Stores weather snapshot with completed events for future reference
- Builds institutional knowledge over time

**3.12 Pollen/Allergy Guest Awareness**

- High tree pollen + outdoor event + guest dietary profile = "Consider: outdoor pollen is high. Guests with seasonal allergies may prefer indoor seating option."
- Nice-to-have, not core

---

## 4. Features NOT Worth Building

| Feature                                             | Why Not                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Weather widget on dashboard                         | Generic. Not decision-enabling. Chefs have phones.            |
| Detailed hourly forecast display                    | Weather Channel already does this. Don't replicate.           |
| Weather maps/radar                                  | Zero chef utility. Visual noise.                              |
| Pollen counts as standalone                         | Too niche unless tied to specific event + guest profiles      |
| Pressure/visibility/dew point cards                 | Raw meteorological data. Chefs don't use this.                |
| Weather-based push notifications unlinked to events | Spam. Weather alerts only matter relative to an event.        |
| Historical weather trends/graphs                    | Not actionable.                                               |
| Weather comparison between cities                   | No use case.                                                  |
| Moon phase display                                  | Unless explicitly tied to tidal seafood sourcing (very niche) |
| "Good weather for running" style activity cards     | Wrong domain.                                                 |

---

## 5. Data Sources / API Options

### External Weather APIs

| Provider              | Free Tier         | Paid           | Strengths                                                        | Weaknesses                                        |
| --------------------- | ----------------- | -------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| **Open-Meteo**        | Unlimited, no key | Donation-based | 7-day hourly forecast, historical, no rate limits, open source   | No severe weather alerts, no AQI/pollen           |
| **OpenWeatherMap**    | 1,000 calls/day   | $0-$180/mo     | 7-day forecast, air quality, alerts                              | Rate limits, vendor lock-in                       |
| **WeatherAPI.com**    | 1M calls/mo       | $9-$35/mo      | 14-day forecast, astronomy (sunrise/sunset), air quality, alerts | Commercial dependency                             |
| **Tomorrow.io**       | 500 calls/day     | $25+/mo        | Minute-level precipitation, pollen, fire index                   | Complex pricing, heavy SDK                        |
| **NWS (weather.gov)** | Unlimited, free   | N/A            | Authoritative US forecasts, alerts, no key needed                | US only, XML/GeoJSON, slow, no hourly granularity |
| **Visual Crossing**   | 1,000 records/day | $0-$35/mo      | Historical + forecast, CSV export, simple API                    | Smaller ecosystem                                 |

**Recommendation: Open-Meteo as primary, NWS alerts as supplement.**

Open-Meteo rationale:

- $0 cost (aligns with no-cloud-services mandate)
- No API key management
- No rate limits
- 7-day hourly forecast with temperature, precipitation, wind, humidity, UV
- Sunrise/sunset included
- Historical data available
- Can be called from server-side without exposing keys
- Self-hostable (open source) if needed later

NWS supplement:

- Severe weather alerts (tornado, thunderstorm, heat advisory)
- Free, no key, authoritative for US
- Only fetch when event is within 48 hours

### Internal / Self-Built Intelligence

| Data Type                       | Source                                                | Storage                                  | Use                        |
| ------------------------------- | ----------------------------------------------------- | ---------------------------------------- | -------------------------- |
| Sunset/sunrise times            | Calculated from lat/lng + date (astronomical formula) | Computed, not stored                     | Event timeline, lighting   |
| Regional frost dates            | USDA Plant Hardiness Zone data (public)               | OpenClaw reference table                 | Seasonal ingredient alerts |
| Growing seasons by region       | USDA + agricultural extension data                    | OpenClaw reference table                 | Menu suggestions           |
| Historical event weather        | Snapshot weather at event completion                  | ChefFlow `event_weather_snapshots` table | "Last time at this venue"  |
| Food safety temperature rules   | USDA food safety guidelines (static)                  | Hardcoded constants                      | Heat alerts                |
| Wind thresholds for outdoor ops | Chef domain knowledge (static)                        | Hardcoded constants                      | Wind alerts                |

---

## 6. Database Schema Additions

### ChefFlow Tables

```sql
-- Snapshot weather conditions at event time (captured after event, stored forever)
CREATE TABLE event_weather_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Conditions at service start
  temperature_f NUMERIC(5,1),
  feels_like_f NUMERIC(5,1),
  humidity_pct INTEGER,
  wind_speed_mph NUMERIC(5,1),
  wind_gust_mph NUMERIC(5,1),
  precipitation_probability INTEGER,
  weather_code TEXT,              -- e.g. 'clear', 'rain', 'overcast'
  weather_description TEXT,       -- human-readable
  uv_index NUMERIC(3,1),
  -- Astronomy
  sunset_time TIME,
  sunrise_time TIME,
  -- Chef notes (optional, captured post-event)
  chef_weather_notes TEXT,        -- "ice melted fast", "too windy for candles"
  UNIQUE(event_id, tenant_id)
);

-- Cached forecast for upcoming events (refreshed periodically, TTL-based)
CREATE TABLE event_weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  forecast_date DATE NOT NULL,
  -- Hourly data for service window (stored as JSONB array)
  hourly_forecast JSONB,          -- [{hour, temp, precip_pct, wind, humidity}]
  -- Summary for the event time window
  service_temp_high_f NUMERIC(5,1),
  service_temp_low_f NUMERIC(5,1),
  max_wind_mph NUMERIC(5,1),
  max_precip_probability INTEGER,
  overall_code TEXT,              -- worst-case weather code during service
  -- Risk scoring
  weather_risk_score INTEGER,     -- 0-100, computed by risk engine
  weather_risk_level TEXT,        -- low/moderate/high/critical
  risk_factors JSONB,             -- structured risk breakdown
  -- Astronomy
  sunset_time TIME,
  sunrise_time TIME,
  UNIQUE(event_id, tenant_id)
);
```

### OpenClaw Reference Tables (on Pi)

```sql
-- Regional growing seasons (static reference, loaded once)
CREATE TABLE regional_seasons (
  id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  region TEXT,
  usda_zone TEXT,
  avg_last_frost DATE,           -- month-day only
  avg_first_frost DATE,
  growing_season_days INTEGER,
  peak_produce_months INTEGER[]  -- 1-indexed: [6,7,8,9] = Jun-Sep
);

-- Food safety temperature thresholds (static reference)
CREATE TABLE food_safety_thresholds (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,         -- 'dairy', 'seafood', 'meat', 'produce', 'chocolate'
  max_ambient_f NUMERIC(5,1),    -- above this, special handling required
  max_hold_minutes INTEGER,      -- at max_ambient, how long before unsafe
  transport_notes TEXT,
  storage_notes TEXT
);
```

---

## 7. Where This Lives in Each Portal

### Chef Portal (Primary)

| Location                             | What Shows                                          | Format                                  |
| ------------------------------------ | --------------------------------------------------- | --------------------------------------- |
| Event detail overview tab            | Weather risk card (beside existing risk assessment) | Card with icon, score, one-line summary |
| Event detail overview tab            | Sunset/sunrise for outdoor events                   | Inline in timeline section              |
| Event checklist                      | Weather-conditional items                           | Checklist items (auto-added)            |
| Calendar view                        | Weather forecast dots on event dates                | Color-coded dot overlay                 |
| Prep sheet / event packet            | Weather summary section                             | Text block in PDF/print                 |
| Remy proactive alerts                | 48h and 6h weather notes                            | Chat message                            |
| Dashboard (only if event within 48h) | "Tomorrow's event: 85F, pack extra ice"             | Alert banner, not a widget              |

### Client Portal

| Location             | What Shows                                    | Format                          |
| -------------------- | --------------------------------------------- | ------------------------------- |
| Event page           | "Weather outlook: Beautiful evening expected" | One-line text, positive framing |
| Email communications | Weather note in pre-event email               | Text paragraph                  |

### Guest Portal

| Location                  | What Shows                              | Format              |
| ------------------------- | --------------------------------------- | ------------------- |
| Event RSVP / details page | "Dress for: warm evening outdoors, 74F" | One-line suggestion |

### Staff Portal

| Location          | What Shows                              | Format     |
| ----------------- | --------------------------------------- | ---------- |
| Shift details     | Heat/cold warnings, hydration reminders | Alert card |
| Packing checklist | Weather-adjusted equipment list         | Checklist  |

---

## 8. Card vs Alert vs Timeline vs Checklist

| Data                               | Format                           | Why                               |
| ---------------------------------- | -------------------------------- | --------------------------------- |
| Overall event weather outlook      | **Card** on event detail         | Glanceable, always visible        |
| Rain > 40% for outdoor event       | **Alert** banner                 | Requires action (backup plan)     |
| Temperature > 90F                  | **Alert** + **checklist items**  | Safety concern + actionable steps |
| Wind > 20 mph outdoor              | **Alert** + **checklist items**  | Operational impact                |
| Sunset time                        | **Timeline** marker              | Time-based, fits event flow       |
| "Pack extra ice"                   | **Checklist item**               | Actionable, completable           |
| "Chocolate work will be difficult" | **Card** note on menu            | Informational, menu-specific      |
| "Last time here it was 91F"        | **Insight** in Remy              | Contextual, conversational        |
| Client weather note                | **Text block** in email template | Communication, not UI             |
| 48h forecast change                | **Remy alert**                   | Proactive, time-sensitive         |

---

## 9. MVP Build Plan

### Phase 1: Weather Data Pipeline (1-2 sessions)

1. Create `lib/weather/provider.ts` with Open-Meteo client
   - `getEventForecast(lat, lng, date, serviceStartHour, serviceEndHour)`
   - Returns structured forecast for service window
   - Includes sunset/sunrise
2. Create `lib/weather/types.ts` with interfaces
3. Add geocoding: resolve event venue zip to lat/lng (Open-Meteo has geocoding API)
4. Cache forecasts in `event_weather_forecasts` table
5. Refresh logic: re-fetch if forecast older than 6 hours and event within 7 days

### Phase 2: Risk Engine Integration (1 session)

1. Add `scoreWeather()` to `lib/costing/operational-risk.ts`
2. Add `WeatherRiskInput` to existing risk input types
3. Wire weather data into `getEventRiskAssessment()` in `lib/events/event-risk-assessment.ts`
4. Weather becomes 9th risk dimension with appropriate weight

### Phase 3: Event Detail UI (1 session)

1. Weather risk card on event overview tab
2. Sunset/sunrise in event timeline
3. Weather-conditional checklist items for outdoor events

### Phase 4: Remy Integration (1 session)

1. 48-hour pre-event weather context in Remy alerts
2. Weather-aware prep suggestions
3. Historical weather notes after event completion

### Phase 5: Client Communication (1 session)

1. Weather note template for pre-event emails
2. Guest-facing dress suggestion on event pages

**Total estimated effort: 5-6 sessions, phased over 2-3 weeks.**

---

## 10. Recommended Implementation Path

### Verdict: Hybrid, starting with external API + internal enrichment

**Start with Open-Meteo** (free, no key, no rate limits, no vendor lock-in) for real-time forecasts. Supplement with **NWS alerts** for severe weather. Store **weather snapshots** after events to build internal intelligence over time.

**Do not** build a weather UI. Build a **weather-informed operations layer** that surfaces weather only when it changes a decision.

**Integration priority:**

1. Risk engine (weather as 9th dimension) -- highest leverage, smallest surface area
2. Remy alerts (proactive, contextual, conversational)
3. Event checklist (actionable, completable)
4. Client communication (professional, reassuring)
5. Calendar overlay (visual, planning-oriented)

**What makes this ChefFlow, not Weather Channel:**

- Weather data only appears tied to a specific event
- Every weather data point maps to a chef decision
- Contextual language: "Too hot for chocolate work" not "Temperature: 92F"
- Historical learning: "Last time you were here in summer, you noted ice problems"
- Food safety integration: weather + menu + ingredients = specific warnings
- Existing risk engine provides the scoring framework

**Cost: $0.** Open-Meteo is free. NWS is free. Geocoding via Open-Meteo is free. Storage is local PostgreSQL. No cloud services added. Aligns perfectly with self-hosted mandate.

**Risk: Low.** Open-Meteo is open-source and self-hostable. If it goes down, weather features degrade gracefully (risk engine scores weather as "unknown," scored conservatively like all null inputs already are). No critical path depends on weather data.

---

## Appendix: Weather Channel UX Patterns to Steal (Adapted)

| Weather Channel Pattern              | ChefFlow Adaptation                                                         |
| ------------------------------------ | --------------------------------------------------------------------------- |
| "It's breezy" (contextual label)     | "Too windy for outdoor candles"                                             |
| "Lower than yesterday" (comparative) | "15 degrees cooler than your last outdoor event"                            |
| "Running: Good" (activity fitness)   | "Outdoor dinner: Caution"                                                   |
| Color-coded cards                    | Green/Yellow/Orange/Red risk level on weather card                          |
| Hourly temp curve                    | Temp curve across service hours (6 PM: 78, 8 PM: 68, 10 PM: 62)             |
| Sunset as distinct event             | Sunset as timeline marker in event flow                                     |
| 7-day forecast                       | Event-week forecast on calendar                                             |
| Pollen by type                       | Guest allergy awareness (only if guest profiles have allergies)             |
| AQI bar                              | "Air quality advisory: consider moving service indoors" (only if AQI > 100) |
