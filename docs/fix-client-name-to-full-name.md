# Fix: `.name` -> `.full_name` on Client Objects

**Date:** 2026-02-19
**Branch:** feature/packing-list-system
**Type:** Bug fix / TypeScript error resolution

---

## What Changed

### File Modified

**`app/(chef)/clients/communication/page.tsx`** — line 72

Before:
```tsx
{(client as any).full_name ?? (client as any).name}
```

After:
```tsx
{client.full_name}
```

---

## Why

The `clients` table uses `full_name` as its name column — there is no `name` column. The `getClientsWithStats()` action returns raw DB rows spread-merged with stats, so the correct field is always `full_name`.

The prior defensive expression `(client as any).full_name ?? (client as any).name` was written with a safety fallback to `.name` that:
1. Is unnecessary — `full_name` is always present on clients rows
2. Uses `as any` casts that suppress TypeScript type checking
3. The `.name` fallback would always be `undefined` since the field does not exist

The correct form is a direct `client.full_name` access, which TypeScript can verify at compile time.

---

## Audit Scope

All 29 `page.tsx` files in `app/(chef)/clients/` were reviewed. The findings:

| File | `.name` hits | Verdict |
|---|---|---|
| `communication/page.tsx` | `(client as any).full_name ?? (client as any).name` | **Fixed** — changed to `client.full_name` |
| `insights/page.tsx` | `topClient.full_name`, `mostFrequent.full_name` | Already correct |
| `insights/top-clients/page.tsx` | `client.full_name` | Already correct |
| `insights/most-frequent/page.tsx` | `client.full_name` | Already correct |
| `insights/at-risk/page.tsx` | `client.full_name` | Already correct |
| `preferences/dietary-restrictions/page.tsx` | `client.full_name` | Already correct |
| `preferences/allergies/page.tsx` | `client.full_name` | Already correct |
| `preferences/favorite-dishes/page.tsx` | `client.full_name` | Already correct |
| `preferences/dislikes/page.tsx` | `client.full_name` | Already correct |
| `[id]/page.tsx` | `reward.name` | Correct — reward object, not client |
| `history/past-menus/page.tsx` | `menu.name` | Correct — menu object, not client |
| All others | None | No client `.name` usage |

A broader sweep of `app/(chef)/` was also run for `.name` on client/chef objects. No other instances of `client.name`, `topClient.name`, or `c.name` referring to the `clients` table were found. All other `.name` references throughout the chef app refer to legitimate non-client objects: recipes, menus, ingredients, components, rewards, partners, campaigns, certifications, equipment, staff members, and vendor records — all of which have a `name` column.

---

## Related

- `lib/clients/actions.ts` — `getClientsWithStats()` merges raw `clients` rows (which have `full_name`) with computed stats
- `lib/events/debrief-actions.ts` — `DebriefClientBlanks.name` is an intentional DTO field mapped from `client.full_name` at the action layer; `blanks.client.name` in the debrief page is correct
- `app/(chef)/inquiries/new/page.tsx` — `l.name` refers to partner locations (which have a `name` column); `p.name` refers to partners (which also have `name`). Both are correct.
