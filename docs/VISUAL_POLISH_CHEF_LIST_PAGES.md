# Visual Polish: Chef Portal List Pages - Color System Alignment

## Date
2026-02-16

## What Changed
Replaced all Tailwind `gray-*` color classes with `stone-*` and all `blue-*` accent classes with `brand-*` across 8 chef portal list page files. This brings the list pages into alignment with the ChefFlow design system, which uses warm stone tones instead of cool grays, and a custom brand color scale instead of default blue.

## Files Modified

| File | gray->stone | blue->brand | Notes |
|------|-------------|-------------|-------|
| `app/(chef)/events/page.tsx` | 3 shades (500, 600, 900) | 1 link color (600, hover 800) | |
| `app/(chef)/inquiries/page.tsx` | 5 shades (200, 400, 500, 600, 900) + hover:bg | 1 next-action text (600) | Amber classes preserved for urgency |
| `app/(chef)/clients/page.tsx` | 3 shades (500, 600, 900) | None | |
| `app/(chef)/quotes/page.tsx` | 5 shades (200, 400, 500, 600, 900) + hover:bg | 3 (border-l, bg, hover:bg for sent highlight) | |
| `app/(chef)/menus/page.tsx` | 2 shades (600, 900) | None | |
| `app/(chef)/expenses/page.tsx` | 7 shades (100, 400, 500, 600, 700, 800, 900) | 3 (category color, 2 link colors) | Category colors also updated |
| `app/(chef)/aar/page.tsx` | 6 shades (400, 500, 600, 700, 900) + hover:bg | None | Amber, green, red semantic colors preserved |
| `app/(chef)/import/page.tsx` | 2 shades (600, 900) | None | |

## Files Skipped (No Changes Needed)
- `app/(chef)/recipes/page.tsx` - Delegates entirely to `RecipeLibraryClient` component; no inline Tailwind color classes
- `app/(chef)/financials/page.tsx` - Delegates entirely to `FinancialsClient` component; no inline Tailwind color classes

## Design Decisions
- **Semantic colors preserved**: Green (revenue/positive trends), red (negative trends/forgotten items), amber (urgency/warnings/personal expenses), purple (alcohol category), cyan (supplies category) were all intentionally left untouched. These carry meaning beyond branding.
- **Category badge colors in expenses**: The `equipment` and `other` categories used `bg-gray-100` which was converted to `bg-stone-100`. The `gas_mileage` category used `bg-blue-100 text-blue-800` which was converted to `bg-brand-100 text-brand-800`.
- **Scope**: Only Tailwind color class names were changed. Zero logic, imports, data fetching, or component structure modifications.

## Verification
Post-edit grep confirmed zero remaining `gray-*` or `blue-*` Tailwind classes across all 10 target page files.

## What This Connects To
This is part of the visual polish phase for the chef portal. The color system alignment ensures that all list/index pages use the same warm neutral palette (stone) and brand accent colors, creating visual consistency across the entire chef experience. Client-side wrapper components (`RecipeLibraryClient`, `FinancialsClient`, `MenusClientWrapper`) may need separate passes if they contain gray/blue classes internally.
