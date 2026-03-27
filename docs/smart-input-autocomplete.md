# Smart Input Autocomplete - Implementation Notes

Built from spec: `docs/specs/smart-input-autocomplete.md`

## What Was Built

### New Components

1. **`components/ui/location-autocomplete.tsx`** - Google Places autocomplete for city/region/ZIP inputs. Uses `types: ['(regions)']` for broader location matches. Falls back to plain text input when Google Maps API key is unavailable. Returns structured `LocationData` (city, state, zip, lat, lng, displayText).

2. **`components/ui/combobox-input.tsx`** - Generic controlled combobox with filterable dropdown from a provided options list. Keyboard-navigable (arrow keys, Enter, Escape). Highlights matching portions of text. No external API calls. Ready for dish names, cuisines, occasion types, etc.

### Files Modified (11 total)

**Public pages (highest impact):**

- `app/(public)/_components/homepage-search.tsx` - LocationAutocomplete on the location field. Passes pre-geocoded lat/lng as URL params to skip server-side geocoding.
- `app/(public)/chefs/_components/directory-filters-form.tsx` - LocationAutocomplete on the location filter.
- `app/(public)/book/_components/book-dinner-form.tsx` - LocationAutocomplete on event location.
- `components/public/public-inquiry-form.tsx` - AddressAutocomplete on address field.
- `app/(public)/worksheet/[token]/worksheet-form.tsx` - AddressAutocomplete on event address.

**Chef portal pages:**

- `components/events/event-creation-wizard.tsx` - AddressAutocomplete on event address (auto-fills city/state/ZIP).
- `components/clients/address-manager.tsx` - AddressAutocomplete on street address (auto-fills city/state/zip).
- `app/(chef)/clients/new/client-create-form.tsx` - AddressAutocomplete on full address.
- `components/settings/preferences-form.tsx` - LocationAutocomplete on home city (auto-fills state/zip).
- `components/finance/mileage-tracker.tsx` - AddressAutocomplete on From/To fields.
- `components/social/social-post-composer.tsx` - LocationAutocomplete on location tag.

### Skipped

- `app/(public)/discover/_components/discover-filters.tsx` - Its search input handles name/city/cuisine combined. A location-only autocomplete would break name and cuisine search.
- `components/embed/embed-inquiry-form.tsx` - Uses inline styles (no Tailwind), needs a separate approach. Out of scope per spec.
- `components/events/travel-leg-form.tsx` - Out of scope per spec.

## Key Design Decisions

1. **Graceful fallback:** When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is empty (current state), all LocationAutocomplete instances render as plain text inputs. Zero visual regression. The feature activates automatically when a Google Maps API key is configured.

2. **No blocking:** Autocomplete is additive. Users can still type freeform text and submit without selecting a suggestion. No gates.

3. **300ms debounce:** Built into Google's `@react-google-maps/api` Autocomplete widget. No custom debounce needed.

4. **US-only:** `componentRestrictions: { country: 'us' }` matches existing AddressAutocomplete behavior.

5. **Pre-geocoded coordinates:** Homepage search now passes lat/lng params when a suggestion is selected, allowing the directory page to skip server-side geocoding.

## Activating Google Places

To enable autocomplete suggestions, set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` with a key that has the Places API enabled. All autocomplete inputs will activate automatically.
