# Spec: Fix Google Maps CSP Blocking

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (1 file)
> **Created:** 2026-03-27
> **Built by:** Claude Code (2026-03-27)

---

## What This Does (Plain English)

The Google Maps location autocomplete on the public landing page (and all other autocomplete inputs) currently shows "This page can't load Google Maps correctly" because the Content Security Policy blocks map tile images. This fix adds the missing CSP domains so Google Maps renders and functions properly.

---

## Why It Matters

The "Browse Chefs" location search is broken for every visitor. They can't search by location, which is the primary discovery path for finding a chef.

---

## Files to Create

None.

---

## Files to Modify

| File             | What to Change                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `next.config.js` | Add Google Maps image domains to `img-src`, OSM to `frame-src` in the CSP header (L243, L247) |

---

## Database Changes

None.

---

## The Fix

In `next.config.js`, update these CSP directives:

**`img-src` (line 243)** - add Google Maps tile and static asset domains:

```
Before: "img-src 'self' data: blob: "
After:  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com"
```

**`frame-src` (line 247)** - add OpenStreetMap for the map fallback in `location-map.tsx`:

```
Before: 'frame-src https://js.stripe.com'
After:  'frame-src https://js.stripe.com https://www.openstreetmap.org'
```

Domain purposes:

- `*.googleapis.com` - map tiles, place photos, marker icons
- `*.gstatic.com` - static assets (map UI sprites, info window images)
- `www.openstreetmap.org` - OSM iframe fallback when Google Maps is unavailable

**NOT needed:** `font-src` changes. All three autocomplete components set `preventGoogleFontsLoading: true`, so no Google font requests are made.

---

## Edge Cases and Error Handling

| Scenario                             | Correct Behavior                                                     |
| ------------------------------------ | -------------------------------------------------------------------- |
| API key missing/invalid              | Components already fall back to plain text input (existing behavior) |
| Google Maps JS blocked by adblocker  | Components already fall back to plain text input (existing behavior) |
| Google Maps fails, map fallback used | `location-map.tsx` falls back to OSM iframe (now allowed by CSP)     |

---

## Verification Steps

1. Run `npm run build` to confirm no build errors
2. Open the public landing page at `http://localhost:3100`
3. Click the location input in the "Browse Chefs" search bar
4. Type "haverhill" (or any city name)
5. Verify: Google Maps autocomplete dropdown appears with suggestions (no error dialog)
6. Select a suggestion, verify it populates the input
7. Check browser console: no CSP violation warnings for `googleapis.com` or `gstatic.com`
8. Navigate to any page with `address-autocomplete` or `store-autocomplete` and verify those also work

---

## Out of Scope

- Changing the Google Maps API key or billing setup
- Refactoring autocomplete components
- Adding new Google Maps features

---

## Notes for Builder Agent

- The previous partial fix was commit `caaa9fdf` which added `maps.googleapis.com` to `script-src` and `connect-src`. This spec completes that work.
- The three autocomplete components (`location-autocomplete.tsx`, `address-autocomplete.tsx`, `store-autocomplete.tsx`) and `location-map.tsx` all benefit from this fix. No changes needed in those files.
- All autocomplete components set `preventGoogleFontsLoading: true`, so do NOT touch `font-src`.
- Do NOT add `https://maps.googleapis.com` to `img-src` (it's already covered by the wildcard `*.googleapis.com`).
- The OSM `frame-src` addition is defensive: `location-map.tsx` uses an OSM iframe as its Google Maps fallback, but `frame-src` currently only allows Stripe. Without this, the fallback is also broken.
- This is a two-line change in the CSP array. Don't overthink it.
