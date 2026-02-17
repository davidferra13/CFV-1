# Visual Polish: Sub-Pages & Portal Color Migration

## Date
2026-02-16

## Summary
Migrated all remaining page-level files across the chef portal, client portal, and public layer from the default Tailwind `gray` palette to `stone`, and from `blue`/`orange` accent colors to the unified `brand` color token. This continues the visual polish phase that standardizes ChefFlow's design system.

## What Changed

### Color Replacements Applied
| Old Token | New Token | Scope |
|-----------|-----------|-------|
| `gray-*` (all shades) | `stone-*` | All 22 target files |
| `text-blue-600/700` | `text-brand-600/700` | Links, accents |
| `bg-blue-*` | `bg-brand-*` | Backgrounds, timeline dots |
| `hover:bg-blue-*` | `hover:bg-brand-*` | Hover states |
| `border-blue-*` | `border-brand-*` | Borders, accent lines |
| `bg-orange-*` | `bg-brand-*` | CTA buttons, badges (public pages) |
| `hover:bg-orange-*` | `hover:bg-brand-*` | CTA hover states |
| `text-orange-*` | `text-brand-*` | Accent text (public pages) |
| `border-orange-*` | `border-brand-*` | Card borders (pricing) |
| `focus-visible:ring-orange-*` | `focus-visible:ring-brand-*` | Focus rings (contact form) |

### Files Modified (22 total)

**Chef Portal Sub-Pages (13 files):**
1. `app/(chef)/events/new/page.tsx` - gray to stone
2. `app/(chef)/events/[id]/edit/page.tsx` - gray to stone
3. `app/(chef)/events/[id]/aar/page.tsx` - gray to stone
4. `app/(chef)/inquiries/new/page.tsx` - gray to stone
5. `app/(chef)/inquiries/[id]/page.tsx` - gray to stone, blue to brand
6. `app/(chef)/quotes/new/page.tsx` - gray to stone
7. `app/(chef)/quotes/[id]/page.tsx` - gray to stone, blue to brand
8. `app/(chef)/quotes/[id]/edit/page.tsx` - gray to stone
9. `app/(chef)/menus/new/page.tsx` - gray to stone
10. `app/(chef)/menus/[id]/page.tsx` - no changes (delegates to client component)
11. `app/(chef)/clients/[id]/page.tsx` - gray to stone, blue to brand
12. `app/(chef)/recipes/new/page.tsx` - no changes (delegates to client component)
13. `app/(chef)/expenses/new/page.tsx` - gray to stone

**Client Portal Pages (5 files):**
14. `app/(client)/my-events/page.tsx` - gray to stone
15. `app/(client)/my-events/[id]/page.tsx` - gray to stone, blue to brand
16. `app/(client)/my-events/[id]/pay/page.tsx` - gray to stone, blue to brand
17. `app/(client)/my-quotes/page.tsx` - gray to stone, blue to brand
18. `app/(client)/my-quotes/[id]/page.tsx` - gray to stone

**Public Pages (4 files):**
19. `app/(public)/pricing/page.tsx` - gray to stone, orange to brand
20. `app/(public)/contact/page.tsx` - gray to stone, orange to brand, blue to brand
21. `app/(public)/privacy/page.tsx` - gray to stone, blue to brand
22. `app/(public)/terms/page.tsx` - gray to stone, blue to brand

## What Was NOT Changed
- **Semantic colors preserved**: `red-*` (errors, rejection), `green-*` (success, acceptance), `amber-*` (warnings, missing facts) were intentionally left untouched. These carry meaning (danger, success, caution) and are not part of the brand/neutral palette swap.
- **No logic changes**: Zero modifications to imports, data fetching, server actions, conditionals, or component structure.
- **Component-delegating pages skipped**: `menus/[id]/page.tsx` and `recipes/new/page.tsx` contain no direct color classes (they render child client components), so they required no edits.

## Why
The design system uses `stone` as the neutral palette (warmer than default gray, matching the culinary/artisan feel of ChefFlow) and `brand` as the single accent color token (configured in tailwind.config). This migration ensures visual consistency across every page a user can navigate to, completing the color standardization that was started on top-level layouts and list pages.

## Connection to System
This is a pure presentation change. It does not affect:
- Database schema or queries
- Server actions or business logic
- Authentication or authorization flows
- The event FSM or ledger system
- RLS policies or tenant scoping

The `brand` color token is defined in `tailwind.config.ts` and can be changed in one place to re-theme the entire application.
