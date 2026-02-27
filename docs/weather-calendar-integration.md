# Weather Integration — Calendar Views & Events List

**Date:** 2026-02-26
**Status:** Complete

## Overview

Integrated the Open-Meteo weather API into ChefFlow's calendar views and events list page. Weather indicators appear alongside events that have geocoded venue coordinates (`location_lat`, `location_lng`), showing a compact emoji + temperature range for dates within the 16-day forecast window.

## Architecture

### Data Flow

```
Server Page (RSC) → getWeatherForDateRange / getWeatherForEvents (server action)
  → queries events table for location_lat/lng
  → getWeatherBatch (deduplicates, fetches in parallel)
    → getEventWeather (Open-Meteo API, 1hr cache via next revalidate)
  → passes weather data as props to client components
```

### Key Design Decisions

1. **Server-side fetching only** — Weather data is fetched in server components/actions and passed as serialized props. No client-side API calls.
2. **Non-blocking** — Every weather fetch is wrapped in try/catch. If the API is down or a specific request fails, the UI renders normally without weather. No error states needed.
3. **Deduplication** — `getWeatherBatch` deduplicates by `lat,lng,date` key so multiple events at the same venue on the same day only trigger one API call.
4. **16-day limit** — Open-Meteo forecast covers up to 16 days ahead. Events beyond that range are silently skipped (no weather shown).
5. **Coordinates required** — Only events with non-null `location_lat` and `location_lng` get weather. Events without geocoded addresses are skipped silently.

## Files Changed

| File                                               | Change                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lib/weather/weather-actions.ts`                   | **NEW** — Server actions: `getWeatherBatch`, `getWeatherForDate`, `getWeatherForDateRange`, `getWeatherForEvents` |
| `app/(chef)/calendar/week/page.tsx`                | Added `getWeatherForDateRange` to parallel fetch, passes `weatherByDate` prop                                     |
| `app/(chef)/calendar/week/week-planner-client.tsx` | Added `weatherByDate` prop, renders emoji + temp range in each day column header                                  |
| `app/(chef)/calendar/day/page.tsx`                 | Added `getWeatherForDateRange` to parallel fetch, passes `weather` prop                                           |
| `app/(chef)/calendar/day/day-view-client.tsx`      | Added `weather` prop, renders weather banner with emoji, description, temp range, precipitation                   |
| `app/(chef)/events/page.tsx`                       | Added `getWeatherForEvents` call, renders weather emoji + temp in Date column                                     |

## Pre-existing Utility (unchanged)

| File                        | Purpose                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `lib/weather/open-meteo.ts` | Core API wrapper — `getEventWeather(lat, lng, date)` returns `EventWeather` or null |

## UI Appearance

### Week View

- Small weather line in each day column header: `emoji tempMin°–tempMax°`
- Only shows on days that have events with coordinates
- Tooltip shows full description and temp range

### Day View

- Full-width banner below navigation: large emoji, description text, temp range, precipitation amount
- Shows `(observed)` label for historical dates
- Only visible when an event with coordinates exists on that day

### Events List

- Inline after the date in the Date column: `emoji tempMin°–tempMax°`
- Tooltip shows full description and temp range
- Only for events within 16 days that have coordinates

## API Details

- **Provider:** Open-Meteo (free, no API key required)
- **Forecast endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Historical endpoint:** `https://archive-api.open-meteo.com/v1/archive`
- **Cache:** 1 hour (via Next.js `next: { revalidate: 3600 }`)
- **Rate limit:** None enforced by Open-Meteo for reasonable usage; deduplication keeps requests minimal

## Testing Notes

- Weather only appears for events with geocoded coordinates — test with events that have `location_lat`/`location_lng` set
- To see weather in the week view, navigate to a week containing upcoming events
- Historical weather works for past dates (uses the archive API)
- If Open-Meteo is unreachable, all views render normally without weather indicators
