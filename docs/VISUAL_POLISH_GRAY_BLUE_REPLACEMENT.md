# Visual Polish: gray->stone and blue->brand Class Replacement

## Date

2026-02-16

## What Changed

Replaced all Tailwind `gray-*` utility classes with `stone-*` and all `blue-*` utility classes with `brand-*` across 9 chef-portal files. This is a visual polish pass to align the UI with a warmer neutral palette (stone) and a unified brand accent color system (brand).

## Files Modified

| File                                               | gray->stone                                       | blue->brand                                        |
| -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `app/(chef)/clients/clients-table.tsx`             | 7 occurrences                                     | 0                                                  |
| `app/(chef)/clients/[id]/client-events-table.tsx`  | 4 occurrences                                     | 0                                                  |
| `app/(chef)/clients/client-invitation-form.tsx`    | 1 occurrence                                      | 0                                                  |
| `app/(chef)/clients/pending-invitations-table.tsx` | 2 occurrences                                     | 0                                                  |
| `app/(chef)/financials/financials-client.tsx`      | ~50 occurrences (text, bg, border, divide, hover) | 7 occurrences (bg, text, focus:ring, focus:border) |
| `app/(chef)/expenses/[id]/page.tsx`                | ~25 occurrences (text, border)                    | 3 occurrences (bg, text)                           |
| `app/(chef)/schedule/page.tsx`                     | 2 occurrences                                     | 0                                                  |
| `app/(chef)/events/[id]/schedule/page.tsx`         | 3 occurrences                                     | 0                                                  |
| `app/(chef)/settings/page.tsx`                     | 2 occurrences                                     | 0                                                  |

## What Was NOT Changed

Semantic colors were preserved exactly as-is:

- `red-*` (errors, negative amounts, refunds)
- `green-*` (success, positive amounts, payments)
- `amber-*` (personal expense badge)
- `yellow-*` (margin warnings)
- `purple-*` (tips)
- `orange-*` (add-on entries)
- `teal-*` (credits)

## Why

- **stone vs gray**: Tailwind's `stone` palette has warmer undertones compared to the cooler `gray`. This gives the UI a more refined, less sterile feel that better suits a food/hospitality product.
- **brand vs blue**: Replacing raw `blue-*` with `brand-*` lets us control the accent color from a single Tailwind theme configuration. If the brand color changes in the future, only `tailwind.config` needs updating -- not dozens of files.

## How It Connects to the System

- No logic, imports, types, or component structure was modified.
- This is a purely cosmetic change to Tailwind utility classes.
- All server actions, FSM transitions, ledger logic, and auth guards remain untouched.

## Verification

After replacement, grep confirmed zero remaining `gray-` or `blue-` class references in all 9 files.
