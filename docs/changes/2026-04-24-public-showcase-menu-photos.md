# Public Showcase Menu Photos

## What changed

- Public showcase menu reads now include one representative menu photo from the first sorted dish with a non-empty `photo_url`.
- Public chef profile Sample Menu cards render that photo as a card hero when it exists.
- Menus without photos keep the existing text-first card layout.
- The chef menu detail page now labels the showcase control as **Public Profile Sample Menus** and explains the first-dish-photo card behavior.
- Dish photo thumbnail controls now expose the same public card cue through their hover and accessibility label without changing upload mechanics.

## Why

Dish photos were already supported by the schema and internal menu library cards, but the public chef profile did not expose them. This wires the existing photo data into the public browsing surface without exposing non-showcase menus or internal menu fields.

## Verification

- `npm run typecheck`
- Read-only local DB check confirmed `dishes.photo_url` exists, the `dish-photos` bucket is public, there are 19 non-archived menus, 0 showcase menus, and 0 dish photo URLs.
- A non-mutating mocked read verified the positive data path selects `photo_url`, keeps showcase and non-archived filters, sorts dishes, and returns the first non-empty sorted dish photo.
- Local dev route `http://127.0.0.1:3101/chef/harbor-hearth-canonical` returned 200 and rendered the Sample Menus no-showcase fallback cleanly.
- Enablement verification added `tests/unit/public-showcase-menu-photos.test.ts` for the representative photo path.
- `npm run typecheck` passed on April 24, 2026.
- Browser verification on `http://127.0.0.1:3101` confirmed the menu detail helper copy and public no-showcase fallback render. The authenticated chef shell still logs existing `/api/ai/health` 401 and realtime 403 dev responses.
