# Event Weather Intelligence

> **Status:** SPEC-READY
> **Exit Scenario:** #58 (reclassified: Bridgeable -> Reducible)
> **Source:** Developer stress-test evaluation, 2026-05-25
> **Principle:** Weather.com is a SOURCE, not a destination. Chef never leaves.
> **Expanded:** 2026-05-25. Weather is DUAL-SURFACE: chef ops + client trust signal.

---

## Problem

Chef checks weather.com before outdoor events. ChefFlow already knows the event date, time, and venue address. There is zero reason the chef should leave the app for weather data.

**Bigger problem:** Clients text "what's the weather looking like for Saturday?" and the chef becomes a human weather relay. Weather data on Dinner Circles kills that question before it's asked.

## Design

### Three-tier progressive disclosure

**Tier 1: Event card glance (always visible)**

- Icon + temp + one-line summary
- Example: "72F, rain likely after 4pm"
- Zero noise. Passive. Appears on event cards and event detail header.

**Tier 2: Expanded panel (tap to open)**

- Hourly breakdown scoped to event time window (not full day)
- Precipitation % per hour
- Wind speed and direction
- Temperature curve across event window
- Humidity
- "Chef signals": wind too high for outdoor plating, humidity affects pastry, temp affects cold holding

**Tier 3: Deep tabs (one more tap)**

- Pollen forecast (outdoor dining allergy concerns)
- UV index (shade planning, ice melt rate)
- Air quality index
- Extended 10-day forecast (planning horizon)
- Sunrise/sunset times (lighting, ambiance timing)

### Temporal coverage

| Event state       | What shows                                    |
| ----------------- | --------------------------------------------- |
| Future (7+ days)  | Extended forecast, low confidence noted       |
| Future (1-7 days) | Hourly forecast, improving accuracy noted     |
| Today             | Live conditions + hourly remaining            |
| Past              | Historical actuals (what DID happen that day) |

Past weather is valuable: chef reviews events, learns patterns ("last September farm dinner was 58F, needed heat lamps").

### Where it appears

#### Chef surfaces (internal)

1. **Event detail page** - weather widget in sidebar/header area
2. **Calendar day view** - small weather row per event
3. **Shopping/prep view** - weather alert if conditions affect prep (e.g., "High humidity day, adjust pastry timing")

#### Client surfaces (Dinner Circles, portal)

1. **Dinner Circle header** - EVERY circle shows weather for that event's date at the TOP. Clean, beautiful, one-line. "Saturday: 74F, clear skies, sunset at 8:12pm." This is the first thing the client sees.
2. **Client portal event view** - same Tier 1 glance. Client never needs to ask "what's the weather?"
3. **Remy emails** - when Remy sends event confirmations or day-of updates, weather is included naturally. "Looking forward to Saturday's dinner. Beautiful evening ahead, 72F and clear."

#### Why client-facing weather matters

- **Kills the #1 pre-event text:** "Hey, what's the weather looking like?" Gone. Already answered.
- **Trust signal:** Client sees weather on their Circle and thinks "my chef is on top of everything."
- **Proactive intelligence:** If rain is forecast, chef can message first: "Rain expected after 6pm, I've planned for indoor plating." Chef looks like a hero.
- **Sunset times for outdoor events:** Clients planning ambiance (candles, lighting) see sunset time without asking.
- **The God-Tier pattern:** Things that DISAPPEAR from the chef's inbox because the system answered the question before the client asked it.

### Data source

Any free weather API (Open-Meteo is free, no key required, covers historical + forecast). Weather.com/WeatherAPI as fallback. ChefFlow fetches on event load, caches per event per hour. No cost.

### What we do NOT build

- Real-time radar maps (permanent exit to weather apps)
- Push notifications for weather changes (future, not V1)
- Weather-based menu suggestions (future AI layer)

## Chef-facing language

- "Weather" not "Meteorological conditions"
- "Rain starts around 4pm" not "Precipitation probability exceeds 60% at 1600"
- "Windy, secure tablecloths" not "Wind advisory: 15-25mph gusts"

## Done when

1. Event detail shows Tier 1 weather for any event with a date and address
2. Expanding reveals Tier 2 hourly breakdown
3. Deep tabs show Tier 3 data (pollen, UV, air quality)
4. Past events show historical weather
5. No chef ever needs to visit weather.com for event-scoped decisions
