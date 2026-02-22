# Remy — Page-Aware Deep Context

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## What Changed

Remy now automatically loads the full details of whatever entity the chef is currently viewing. Previously, Remy only knew the URL path (e.g., `/events/abc123`) but had no idea what was on the page. Now Remy fetches and understands the complete entity data.

## Pages Covered

| Page              | What Remy Now Knows                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/events/[id]`    | Occasion, date, time, guest count, status, service style, location, price, payment status, dietary/allergies, special requests, kitchen notes, prep readiness, and the full client profile       |
| `/clients/[id]`   | Name, contact, dietary restrictions, allergies, dislikes, spice tolerance, favorite cuisines/dishes, vibe notes, kitchen details, payment behavior, tipping pattern, lifetime value, event count |
| `/recipes/[id]`   | Name, category, description, method, yield, timing, dietary tags, times cooked, notes, adaptations, and full ingredient list with quantities                                                     |
| `/inquiries/[id]` | Status, channel, confirmed details (date, guests, location, budget, dietary), original message, unanswered questions, next action, follow-up due date, client info                               |
| `/menus/[id]`     | Name, status, cuisine, service style, guest count, description, notes, and full course breakdown with dishes and components (linked recipes)                                                     |

## Architecture

- **Type:** `PageEntityContext` added to `lib/ai/remy-types.ts` — simple `{ type, summary }` structure
- **Loaders:** 5 entity-specific functions in `lib/ai/remy-context.ts` — one per page type
- **URL parsing:** Regex extracts UUID from `currentPage`, routes to the right loader
- **Non-blocking:** Wrapped in `try/catch` — if entity load fails, Remy still works normally with general context
- **Prompt injection:** Added `CURRENTLY VIEWING` section in `app/api/remy/stream/route.ts` system prompt builder, included in grounding rule

## Files Modified

- `lib/ai/remy-types.ts` — added `PageEntityContext` interface and `pageEntity` field to `RemyContext`
- `lib/ai/remy-context.ts` — added `loadPageEntityContext` dispatcher and 5 entity loaders
- `app/api/remy/stream/route.ts` — added `CURRENTLY VIEWING` prompt block and updated grounding rule

## Also in This Session

- **TTS Listen Button** — Remy messages now have a speaker icon (hover to see). Uses browser's free `speechSynthesis` API. Click to listen, click again to stop. Strips markdown before speaking.
