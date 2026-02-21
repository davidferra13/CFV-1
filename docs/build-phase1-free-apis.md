# Build: Phase 1 Free API Integrations

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Status:** Complete — TypeScript clean, no migrations required

---

## What Changed

Four zero-setup free APIs were integrated into ChefFlow V1. None require API keys, accounts, or environment variables. All are production-ready immediately.

---

## Integration 1: Open-Meteo Weather

**Purpose:** Show weather forecast (or actual historical weather) for the event date on the chef event detail page.

**API:** [Open-Meteo](https://open-meteo.com/) — completely free, no key, unlimited requests
**Files created:**

- `lib/weather/open-meteo.ts` — fetches daily weather by lat/lng + date
- `components/events/weather-panel.tsx` — server component, renders weather card

**How it works:**

- Forecast API used for events within the next 16 days
- Historical archive API used for past events
- Events >16 days in the future: panel returns `null` (not rendered)
- Weather appears in the location section of the Event Details card, beneath the Google Map
- Displays: emoji, description, temp range (°F), precipitation (inches)
- Source label: "Forecast" vs "Actual weather"

**Conditional rendering:**

- Only shown when the event has `location_lat` + `location_lng` coordinates
- Falls back gracefully on API failure (returns `null`)

---

## Integration 2: Nominatim Geocoding

**Purpose:** Auto-geocode event addresses to get lat/lng coordinates, enabling the map and weather panels.

**API:** [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/) — completely free, no key
**Rate limit:** 1 req/sec per IP (results cached 24h by Next.js)
**Files created:**

- `lib/geocoding/nominatim.ts` — geocodes address string → `{ lat, lng, displayName }`
- `lib/events/geocoding-actions.ts` — server action: geocodes + writes lat/lng to `events` table
- `components/events/geocode-address-button.tsx` — client component button

**How it works:**

- When an event has a `location_address` but no `location_lat`/`location_lng`, a "📍 Add map location" button appears in the location section
- Chef clicks the button → server action calls Nominatim → saves coordinates to the event → revalidates the page
- After geocoding, the map and weather panel become available on next render
- Button shows inline success/error feedback

**Data written:** `events.location_lat`, `events.location_lng` — existing nullable columns, no migration needed

---

## Integration 3: QR Server Client Portal QR Code

**Purpose:** Give chefs a scannable QR code linking directly to the client's event portal, for easy in-person sharing.

**API:** [api.qrserver.com](https://api.qrserver.com/) — completely free, no key
**Files created:**

- `components/events/client-portal-qr.tsx` — renders `<img>` tag pointing to the QR Server API

**How it works:**

- Generates a QR code for `{NEXT_PUBLIC_APP_URL}/my-events/{eventId}`
- Shown on the chef event detail page in a new "Client Portal Access" card
- Only displayed for non-draft, non-cancelled events (i.e., events the client has access to)
- Includes a plain-text URL and "Open portal ↗" link below the QR code
- Configurable via `NEXT_PUBLIC_APP_URL` env var (falls back to `'https://your-domain.com'`)

**Setup required:** Set `NEXT_PUBLIC_APP_URL=https://your-actual-domain.com` in Vercel environment variables.

---

## Integration 4: Open Food Facts Nutrition Lookup

**Purpose:** Let chefs look up nutritional data for any ingredient, dish, or recipe by name, directly on the recipe detail page.

**API:** [Open Food Facts](https://world.openfoodfacts.org/) — completely free, no key
**Files created:**

- `lib/nutrition/open-food-facts.ts` — search utility returning `NutritionResult[]`
- `lib/nutrition/actions.ts` — `'use server'` action wrapping the search
- `components/recipes/nutrition-lookup-panel.tsx` — client component with search UI

**How it works:**

- Recipe detail page (`/culinary/recipes/[id]`) now fully built out from its previous stub
- Nutrition Lookup panel appears at the bottom of the recipe detail page
- Pre-filled with the recipe name; chef can modify the search term
- Clicking "Search" calls `searchNutritionAction` (server action) → Open Food Facts API
- Results list shows up to 5 matches with name, brand, and Nutri-Score badge
- Clicking a result shows per-100g breakdown: calories, protein, fat, carbs, fiber, sugar, sodium

**Recipe detail page also now shows:**

- Recipe name, category, dietary tags, archived status
- Time info (prep/cook/total), yield
- Method and notes
- Ingredients list with quantities and estimated prices
- Links to Edit Recipe and back to Recipes

---

## Event Detail Page Changes

`app/(chef)/events/[id]/page.tsx` received three additions:

| Addition                 | Location in page                                  | Condition                     |
| ------------------------ | ------------------------------------------------- | ----------------------------- |
| `<WeatherPanel>`         | Inside Event Details card, after LocationMap      | lat/lng exist                 |
| `<GeocodeAddressButton>` | Inside Event Details card, address line           | address exists but no lat/lng |
| `<ClientPortalQR>` card  | After main 2-column grid, before Service Contract | Status not draft/cancelled    |

---

## No Migrations Required

All four integrations work with the existing schema:

- Weather: read-only, uses existing `location_lat`/`location_lng`/`event_date`
- Geocoding: writes to existing nullable `location_lat`/`location_lng` columns
- QR code: no DB interaction
- Nutrition: no DB interaction (display-only, data not persisted)

---

## Phase 2 Preview (requires API keys)

| API             | Key needed                         | What it adds                              |
| --------------- | ---------------------------------- | ----------------------------------------- |
| Resend          | `RESEND_API_KEY`                   | Transactional email for notifications     |
| Google Places   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`  | Address autocomplete on event form        |
| Google Calendar | OAuth                              | Sync events to chef's calendar            |
| Edamam          | `EDAMAM_APP_ID` + `EDAMAM_APP_KEY` | Recipe-level nutrition analysis           |
| Cloudinary      | `CLOUDINARY_CLOUD_NAME` etc.       | Managed image uploads for receipts/photos |

To proceed with Phase 2, provide which keys are available.
