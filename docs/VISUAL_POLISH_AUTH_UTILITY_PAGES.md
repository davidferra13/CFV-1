# Visual Polish: Auth & Utility Pages Color Migration

## Date
2026-02-16

## What Changed
Migrated Tailwind color classes across 8 auth, error, and utility pages from the default gray/blue palette to the ChefFlow design system's stone/brand/surface-muted palette.

### Color Mapping Applied
| Before | After |
|--------|-------|
| `bg-gray-50` (page backgrounds) | `bg-surface-muted` |
| `gray-*` (all shades: 100, 200, 400, 500, 600, 900) | `stone-*` (matching shades) |
| `blue-600` / `blue-700` (text, border, accent) | `brand-600` / `brand-700` |

### Files Modified

1. **`app/auth/signin/page.tsx`** -- Page background, heading text, body text, link accent colors
2. **`app/auth/signup/page.tsx`** -- Page background (4 instances across Suspense fallback, invitation loading, client signup, chef signup), headings, body text, spinner border, link accent colors
3. **`app/error.tsx`** -- Page background only; red error colors intentionally preserved
4. **`app/not-found.tsx`** -- Page background, 404 badge circle (`bg-stone-100`), 404 number text, description text
5. **`app/unauthorized/page.tsx`** -- Page background, description text; orange lock icon colors intentionally preserved
6. **`app/(chef)/loading.tsx`** -- All skeleton pulse bars (`bg-stone-200`), loading text (`text-stone-500`)
7. **`app/(client)/loading.tsx`** -- All skeleton pulse bars (`bg-stone-200`), loading text (`text-stone-500`)
8. **`app/(public)/loading.tsx`** -- Spinner border (`border-brand-600`), loading text (`text-stone-600`)

## Why
The design system uses `stone` (warm neutral) instead of `gray` (cool neutral) for a more cohesive visual identity. Brand accent colors replace raw `blue` to ensure all interactive elements use the configurable brand palette. The `bg-surface-muted` semantic token replaces `bg-gray-50` for full-page backgrounds so the background shade can be controlled from one Tailwind config value.

## What Was NOT Changed
- No logic, imports, or component structure was modified
- Red colors in `error.tsx` were intentionally preserved (errors should be red)
- Orange colors in `unauthorized/page.tsx` were intentionally preserved (lock icon)
- No changes to component props, event handlers, or state management

## Verification
A grep for `gray-` and `blue-` across all 8 files returned zero matches, confirming complete migration.
