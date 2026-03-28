# Spec: Smart Input Autocomplete

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-8 files)
> **Created:** 2026-03-27
> **Built by:** Claude Code session 2026-03-27

---

## What This Does (Plain English)

Every text input where a user types a location, address, dish name, cuisine, or other structured value gets upgraded from a dumb text field to a smart autocomplete input. When the user starts typing, the system shows suggestions: real addresses via Google Places, saved dishes from their recipe book, known cuisines, past cities they've worked in, etc. Picking a suggestion fills in structured data (not just a string), so downstream logic gets clean, validated information instead of freeform text.

The highest-impact target is the **homepage chef search** (the very first thing a visitor sees). Right now they type a city/ZIP into a plain text box and hope for the best. After this feature, they get Google Places-powered location suggestions as they type, and selecting one passes structured geocoded data to the chef directory search.

---

## Why It Matters

The homepage search is the front door of the product. A plain text input with no suggestions feels broken by modern standards and leads to bad search results (typos, ambiguous inputs, no geocoding until after submit). Address inputs throughout the app have the same problem: most are plain text fields even though we already have `AddressAutocomplete` (Google Places) and `TagInput` (suggestion lists) built and working. This spec connects existing infrastructure to the places that need it.

---

## Files to Create

| File                                      | Purpose                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/location-autocomplete.tsx` | Lightweight Google Places autocomplete for city/region/ZIP inputs (not full street addresses). Wraps `@react-google-maps/api` with `types: ['(regions)']` instead of `['address']`. Returns city, state, ZIP, lat/lng. Designed for search bars and filters.        |
| `components/ui/combobox-input.tsx`        | Generic controlled combobox: text input + filterable dropdown of suggestions from a provided list. Keyboard-navigable (arrow keys, Enter to select, Escape to close). Used for dishes, cuisines, occasion types, and any field where we have a known set of values. |
| `docs/smart-input-autocomplete.md`        | Implementation notes for this feature.                                                                                                                                                                                                                              |

---

## Files to Modify

| File                                                        | What to Change                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(public)/_components/homepage-search.tsx`              | Replace the plain `<input>` for location with `<LocationAutocomplete>`. On selection, store structured `{ city, state, zip, lat, lng }` and pass lat/lng as query params to `/chefs` so the directory page skips re-geocoding. |
| `app/(public)/chefs/_components/directory-filters-form.tsx` | Replace the plain location text input with `<LocationAutocomplete>`. Pass structured location data to the search action instead of raw text.                                                                                   |
| `app/(public)/book/_components/book-dinner-form.tsx`        | Replace location text input with `<LocationAutocomplete>`.                                                                                                                                                                     |
| `app/(public)/discover/_components/discover-filters.tsx`    | Replace location/search input with `<LocationAutocomplete>` for the location portion.                                                                                                                                          |
| `components/events/event-creation-wizard.tsx`               | Replace city/ZIP text inputs with `<AddressAutocomplete>` (full address, already exists).                                                                                                                                      |
| `components/events/travel-leg-form.tsx`                     | Replace address text inputs with `<AddressAutocomplete>`.                                                                                                                                                                      |
| `components/clients/address-manager.tsx`                    | Replace street address text input with `<AddressAutocomplete>`.                                                                                                                                                                |
| `app/(chef)/clients/new/client-create-form.tsx`             | Replace "Full address" text input with `<AddressAutocomplete>`.                                                                                                                                                                |
| `components/public/public-inquiry-form.tsx`                 | Replace address text input with `<AddressAutocomplete>`.                                                                                                                                                                       |
| `components/embed/embed-inquiry-form.tsx`                   | Replace address text input with `<AddressAutocomplete>`. Note: embed uses inline styles (no Tailwind), so the autocomplete may need a `variant` prop or inline style override.                                                 |
| `components/settings/preferences-form.tsx`                  | Replace city/ZIP text inputs with `<LocationAutocomplete>`. Replace "Store address" with `<StoreAutocomplete>` (already exists).                                                                                               |
| `components/finance/mileage-tracker.tsx`                    | Replace "Starting location" text input with `<AddressAutocomplete>`.                                                                                                                                                           |
| `components/social/social-post-composer.tsx`                | Replace "Add location..." text input with `<LocationAutocomplete>`.                                                                                                                                                            |
| `app/(public)/worksheet/[token]/worksheet-form.tsx`         | Replace "Event address" text input with `<AddressAutocomplete>`.                                                                                                                                                               |

---

## Database Changes

None. All autocomplete data comes from external APIs (Google Places, Nominatim) or existing database tables (recipes, chefs). No new tables or columns needed.

---

## Data Model

### LocationAutocomplete output

```ts
type LocationData = {
  city: string
  state: string // two-letter abbreviation
  zip: string
  lat: number | null
  lng: number | null
  displayText: string // "Boston, MA" or "02115" - what shows in the input
}
```

### ComboboxInput

```ts
type ComboboxOption = {
  value: string // stored value
  label: string // display text
  subtitle?: string // secondary line (e.g., cuisine type under dish name)
}
```

---

## Server Actions

No new server actions. The autocomplete components are purely client-side. Google Places API calls happen in the browser via `@react-google-maps/api`. Existing server actions (chef directory search, event creation, etc.) already accept the structured fields these components will provide.

One minor optimization for the homepage flow:

| Action                                             | Auth   | Input                                                  | Output                                  | Side Effects |
| -------------------------------------------------- | ------ | ------------------------------------------------------ | --------------------------------------- | ------------ |
| N/A - homepage search passes lat/lng as URL params | Public | `?lat=42.37&lng=-71.06&radius=50&serviceType=catering` | Chef directory results (already exists) | None         |

The directory search server action (`lib/directory/location-search.ts`) already accepts lat/lng. Today it receives raw text and geocodes server-side. After this change, the homepage will pass pre-geocoded coordinates, skipping the server-side geocoding step.

---

## UI / Component Spec

### LocationAutocomplete Component

A single-line text input with a dropdown of Google Places suggestions. Visually identical to the existing input it replaces (same height, padding, colors, rounded corners) but with a suggestion dropdown below.

**Props:**

- `value: string` - controlled display text
- `onSelect: (data: LocationData) => void` - fires when user picks a suggestion
- `onChange?: (text: string) => void` - fires on every keystroke (for uncontrolled/hybrid use)
- `placeholder?: string`
- `className?: string` - pass-through for custom styling
- `types?: string[]` - Google Places types, default `['(regions)']`

**States:**

- **Idle:** Shows placeholder text, no dropdown
- **Typing (< 3 chars):** No dropdown yet (avoid noise)
- **Typing (>= 3 chars):** Dropdown appears below input with Google Places suggestions. Max 5 results. Each row shows city/region name and state.
- **Loading:** Subtle spinner icon inside the input while Places API responds
- **Selected:** Input shows `displayText` from the selected suggestion. Dropdown closes.
- **No results:** Dropdown shows "No locations found" message. User can still submit freeform text.
- **API unavailable:** Falls back to plain text input silently (same as AddressAutocomplete does today)

**Keyboard:**

- Arrow Up/Down to navigate suggestions
- Enter to select highlighted suggestion (or submit form if no dropdown)
- Escape to close dropdown
- Tab to close dropdown and move focus

### ComboboxInput Component

A text input with a filterable dropdown sourced from a provided `options` array. No external API calls.

**Props:**

- `value: string`
- `onChange: (value: string) => void`
- `options: ComboboxOption[]`
- `onSelect?: (option: ComboboxOption) => void`
- `placeholder?: string`
- `allowFreeText?: boolean` - if true, user can type values not in the list (default: true)
- `className?: string`

**Behavior:**

- Dropdown appears on focus if options exist
- Filters options as user types (case-insensitive substring match)
- Highlights matching portion of text in dropdown
- Keyboard navigation same as LocationAutocomplete

### Homepage Search (updated)

The location field in the search bar becomes a `<LocationAutocomplete>`. The dropdown appears inline below the search bar, visually attached. The search button passes lat/lng to the chef directory when available, falling back to text-only search when the user types without selecting a suggestion.

### Interactions

- **User types "Bos"** -> dropdown shows "Boston, MA", "Boscawen, NH", etc.
- **User clicks "Boston, MA"** -> input shows "Boston, MA", internal state stores `{ city: "Boston", state: "MA", lat: 42.36, lng: -71.06 }`
- **User clicks Search** -> navigates to `/chefs?lat=42.36&lng=-71.06&location=Boston,+MA&serviceType=catering`
- **User types "02115" and hits Enter without selecting** -> falls back to text search (existing behavior), directory page geocodes server-side

---

## Edge Cases and Error Handling

| Scenario                                              | Correct Behavior                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Maps API key missing or invalid                | Fall back to plain text input silently. Log warning to console. Feature degrades gracefully.                                                                                     |
| Google Places API rate limit / network error          | Show brief inline error "Could not load suggestions" under the input. Allow freeform text submission.                                                                            |
| User types and submits without selecting a suggestion | Pass raw text to the search/form (existing behavior). No blocking. Autocomplete is a convenience, not a gate.                                                                    |
| User clears the input after selecting                 | Clear the stored structured data. Next submission uses whatever text is in the field.                                                                                            |
| Very slow API response (> 2s)                         | Show loading spinner. If user submits before response arrives, use freeform text.                                                                                                |
| Embed form (iframe context)                           | `embed-inquiry-form.tsx` uses inline styles. The AddressAutocomplete dropdown must work within iframes and not rely on Tailwind. May need an `unstyled` or `embed` variant prop. |
| Mobile / touch devices                                | Dropdown must be touch-friendly (large tap targets, no hover-only states). Dropdown should not cause layout shifts on small screens.                                             |

---

## Verification Steps

1. Open `http://localhost:3100` (homepage)
2. Click into the location search field
3. Type "Bos" - verify dropdown appears with Boston and other suggestions
4. Select "Boston, MA" - verify input shows "Boston, MA"
5. Click Search - verify URL includes lat/lng params
6. Verify chef directory results are location-filtered correctly
7. Navigate to `/chefs` directly - verify the filter bar's location input also has autocomplete
8. Navigate to `/book/dinner` - verify location input has autocomplete
9. Sign in with agent account, create a new event - verify address field has autocomplete
10. Create a new client - verify address field has autocomplete
11. Open the public inquiry form - verify address has autocomplete
12. Test keyboard navigation: arrow keys, Enter, Escape in the dropdown
13. Test on mobile viewport (390px width) - verify dropdown doesn't break layout
14. Disconnect network briefly - verify graceful fallback to plain text input
15. Screenshot all key states

---

## Out of Scope

- **Map display / visual map picker** - this spec is autocomplete only, not a map UI
- **Saved/recent searches** - future enhancement, not in this pass
- **Dish/cuisine autocomplete for chef profiles** - the `ComboboxInput` component enables this, but wiring it to recipe data is a separate spec
- **International address support** - staying US-only (matches existing `componentRestrictions: { country: 'us' }`)
- **Chef coverage area editor** - already uses a different UI pattern (multi-select), not changing it here
- **Replacing TagInput** - TagInput already has suggestion support and works well for array fields. ComboboxInput is for single-value fields.

---

## Notes for Builder Agent

1. **Reuse existing components first.** `AddressAutocomplete` already works for full street addresses. Only build `LocationAutocomplete` because the homepage needs city/region/ZIP suggestions (not street addresses), which requires `types: ['(regions)']` instead of `types: ['address']`.

2. **`@react-google-maps/api` is already installed** and the API key is configured (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). No new dependencies needed.

3. **The `useJsApiLoader` hook must only be called once per page.** If a page has both `AddressAutocomplete` and `LocationAutocomplete`, they must share the loader. Consider extracting the loader into a shared provider or using a module-level singleton pattern (check how `AddressAutocomplete` handles this today).

4. **Homepage search bar styling is custom** (rounded-2xl, backdrop-blur, specific padding). The `LocationAutocomplete` must accept a `className` prop and render the input without its own wrapper styling, so it can be styled to match the search bar.

5. **The embed form (`embed-inquiry-form.tsx`) uses inline styles, not Tailwind.** If wiring `AddressAutocomplete` into the embed, either add an inline-style variant or render a plain input with a custom Google Places integration that doesn't depend on Tailwind classes for the dropdown.

6. **Debounce.** Google Places API charges per request. Add a 300ms debounce to the input before triggering autocomplete requests.

7. **StoreAutocomplete already exists** at `components/ui/store-autocomplete.tsx` for business/establishment lookups. Use it for the "Store address" field in preferences, don't build a new one.

8. **Don't break freeform submission.** Every input that gains autocomplete must still work if the user types and submits without selecting a suggestion. Autocomplete is additive, never blocking.

9. **Priority order for implementation:** Homepage search -> directory filters -> public inquiry form -> event forms -> everything else. The homepage is the highest-impact change.
