# Google Maps / Places Integration

**Date:** 2026-02-17
**Branch:** feature/wix-integration
**Phase:** 2 of 5 (API integrations)

---

## What Changed

### New Components

- **`components/ui/address-autocomplete.tsx`** — Google Places Autocomplete input that returns structured address data (street, city, state, zip, lat/lng). Uses `@react-google-maps/api` with `useJsApiLoader`. Falls back to a plain text input while the Maps JS loads or if no API key is configured.
- **`components/ui/location-map.tsx`** — Interactive Google Map with a marker at given coordinates. Uses `GoogleMap` and `MarkerF` from `@react-google-maps/api`. Shows a loading placeholder while the API loads.

### Modified Files

- **`components/events/event-form.tsx`** — Replaced the plain Address `<Input>` with `<AddressAutocomplete>`. When the chef selects an address from Google suggestions, city/state/zip fields auto-populate and lat/lng are captured. Manual typing still works (no autocomplete required).
- **`components/inquiries/inquiry-form.tsx`** — Enhanced the Location field with `<AddressAutocomplete>`. On place selection, the full formatted address is stored as `confirmed_location`.
- **`app/(chef)/events/[id]/page.tsx`** — Added an interactive map below the location display on event detail pages. Only renders when `location_lat` and `location_lng` exist on the event.
- **`lib/events/actions.ts`** — Added `location_lat` (number, optional) and `location_lng` (number, optional) to both `CreateEventSchema` and `UpdateEventSchema`. Added to the insert payload in `createEvent`.

### Migration

- **`supabase/migrations/20260221000019_add_event_coordinates.sql`** — Adds `location_lat` (double precision) and `location_lng` (double precision) columns to the `events` table. Both nullable — existing events without coordinates simply don't show a map.

### Env Vars

- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** — Added to `.env.local` (empty, needs user's key) and `.env.local.example`.

---

## Why

Plain text address inputs are error-prone — typos, incomplete addresses, no visual context. Google Places autocomplete:

1. **Eliminates typos** — addresses come from Google's database
2. **Structured data** — city/state/zip auto-fill saves time
3. **Coordinates** — lat/lng enable map display without re-geocoding
4. **Visual context** — map on event detail page lets the chef confirm the location at a glance

---

## Design Decisions

### Controlled Input + Google Places

The autocomplete input is React-controlled (`value` + `onChange`). When Google Places sets the input value after selection, our `onPlaceChanged` callback updates parent state to match. Brief flash between Google's DOM update and React re-render is imperceptible in practice.

### Graceful Degradation

If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is empty or the Maps JS fails to load, the component renders a plain text input. The form still works — the chef just types manually without autocomplete. No API key = no crash.

### US-Only, Address-Type Restriction

Autocomplete is restricted to US addresses (`componentRestrictions: { country: 'us' }`) and address types only (`types: ['address']`). This keeps suggestions focused and relevant for a US-based private chef platform.

### `as any` Casts for Coordinates

`location_lat` and `location_lng` don't exist in the generated `types/database.ts` yet (it hasn't been regenerated since the migration). Used `(event as any).location_lat` in the detail page. This resolves automatically once `supabase gen types` is run.

### No Separate Google Maps Provider

Instead of a global `<GoogleMapsProvider>` wrapping the app, each component calls `useJsApiLoader` independently. The library deduplicates script loading internally. Since autocomplete (forms) and maps (detail pages) are on different routes, there's no overlap concern.

---

## How It Connects

- **Event Form → Actions → DB**: Autocomplete fills form state → `createEvent`/`updateEvent` include lat/lng → stored in events table
- **Event Detail Page → Map**: Page reads `location_lat`/`location_lng` from event → renders `<LocationMap>` if present
- **Inquiry Form → Location String**: Autocomplete fills `confirmed_location` with formatted address string → stored as-is in inquiries table

---

## Setup Required

1. **Google Cloud Console**: Enable "Places API (New)" + "Maps JavaScript API" in your existing GCP project
2. **API Key**: Create a browser-restricted API key (restrict to your domain for production)
3. **Env**: Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`
4. **Migration**: Apply `20260221000019_add_event_coordinates.sql` to the database

---

## Packages

- `@react-google-maps/api` (v2.20.8) — already installed
- `@types/google.maps` (devDep) — installed for TypeScript support
