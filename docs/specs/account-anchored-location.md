# Account-Anchored Location

> Every account is anchored to a zip code so every location-dependent feature works automatically without ever asking for permission or input.

## Problem

Location-dependent features (nearby directory, chef matching, pricing, tax, travel, grocery) currently require zip/location input on every visit. Browser geolocation needs permission popups. Features feel gated behind friction.

## Solution

One zip code per account, set once, stored permanently. Every radius-based feature reads from it automatically.

## Principles

1. **Set once, forget forever.** Onboarding or first encounter asks zip. After that, invisible.
2. **Not surveillance.** No GPS, no browser location, no tracking. Just a zip code the user chose.
3. **All features unlocked by default.** Once zip exists, everything works: nearby pre-resolved, pricing localized, availability scoped.
4. **Works for every user type.** Chef, client, public visitor. Same mechanism.
5. **Pre-computed, not on-demand.** Data already resolved against that zip. Click = instant results.
6. **Adjustable, not rigid.** Change zip in settings anytime. Some features allow temporary area override.

## Architecture

### Storage Layer

**Authenticated users (chef + client):** New `user_location_defaults` table keyed by `auth_user_id`. Single source of truth for all user types.

```sql
CREATE TABLE user_location_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip text NOT NULL,
  city text,
  state text,
  lat double precision,
  lng double precision,
  radius_miles integer NOT NULL DEFAULT 25,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Public (unauthenticated) users:** `cf_default_zip` cookie (httpOnly, 1 year expiry). Stores JSON: `{zip, city, state, lat, lng, radiusMiles}`.

### Central Resolver

`lib/location/account-location.ts` exports:

- `resolveAccountLocation(authUserId?: string): AccountLocation | null` - DB lookup for authenticated, cookie for public
- `setAccountLocation(authUserId: string, zip: string): AccountLocation` - Geocodes zip, writes to DB
- `setPublicLocation(zip: string): AccountLocation` - Sets cookie for public users
- `getAccountLocationOrPrompt(): { location: AccountLocation | null, needsPrompt: boolean }` - For UI: returns location or signals first-encounter prompt needed

### Geocoding on Write

When user sets zip, system geocodes once via existing `resolvePublicLocationQuery()` and stores lat/lng/city/state. No runtime geocoding needed.

### First-Encounter Prompt

Lightweight banner (not modal, not blocking): "Set your zip code to unlock local features." Appears on location-dependent pages when no zip is set. Dismissible. Single input field + "Set" button. Disappears permanently after set.

### Settings Integration

- **Chef:** New "Home Location" section in Settings, pre-filled from existing `chef_preferences.homeZip` if available
- **Client:** New "My Location" section in client profile/settings
- Both: zip input, city/state auto-filled from geocode, radius slider (5/10/25/50/100 mi)

### Consumer Wiring

Every feature that currently asks for zip/location gets a fallback chain:

1. Explicit user input (search bar, filter) - highest priority
2. Account-anchored location (from `resolveAccountLocation()`)
3. IP-based approximate location (existing `detectMyLocation()`)
4. No location (graceful degradation)

### Affected Features

| Feature               | Current State                | After                       |
| --------------------- | ---------------------------- | --------------------------- |
| /nearby directory     | Manual zip entry every visit | Pre-filled from account zip |
| /chefs directory      | Location autocomplete        | Pre-filled, instant results |
| PIE pricing           | Requires zip parameter       | Reads from account zip      |
| Chef matching/booking | Manual location entry        | Pre-filled from client zip  |
| Tax calculation       | Requires zip                 | Falls back to account zip   |
| Travel optimization   | Event zip only               | Chef home zip as base       |
| Grocery/sourcing      | No location awareness        | Scoped to chef zip          |
| Homepage search       | Empty location field         | Pre-filled suggestion       |

### Backfill Strategy

Migration script populates `user_location_defaults` from existing data:

- Chefs: `chef_preferences.homeZip` + `chefs.city` + `chefs.state`
- Clients: geocode from `clients.address` if available
- Geocode all zips to populate lat/lng

### Privacy

- No GPS, no browser geolocation API needed
- User explicitly chooses their zip
- No location tracking or history
- Cookie for public users is first-party, httpOnly, same-site
- User can change or remove at any time

## Migration

Single SQL migration. Table creation + backfill in one step. No breaking changes; all consumers fall back gracefully when no location is set.

## Out of Scope

- Automatic location detection from browser
- Multiple saved locations per user
- Location history/tracking
- Real-time distance calculations from GPS
