# Build: Visual Elevation

**Date:** 2026-02-21
**Branch:** `feature/scheduling-improvements`
**Scope:** Pure aesthetic — zero functionality, data, or layout changes

## Summary

Elevated ChefFlow's visual feel from "functional and clean" to "premium and alive" across 11 files (~130 lines changed). Every change adds depth, motion feedback, or typographic authority. No libraries added — CSS-native throughout.

## Changes by File

### 1. `tailwind.config.ts`

- Added `surface.page: '#ede9e4'` — warm stone page background token
- Added 3 keyframe animations: `fade-slide-up` (220ms spring), `scale-in` (150ms spring), `shimmer` (1.6s linear loop)
- All use `cubic-bezier(0.16, 1, 0.3, 1)` — fast start, slow settle (same easing as Linear, Vercel)

### 2. `app/globals.css`

- Body background changed from `bg-surface-muted` to `bg-surface-page` (warmer `#ede9e4`)
- CSS custom property shadow system: `--shadow-card`, `--shadow-card-hover`, `--shadow-overlay`
- Global `scroll-behavior: smooth`
- `::selection` tinted with brand-200 (`#f8ddc0`)
- Global scrollbar: 6px thin, stone-colored, rounded track
- `.label-section` utility class (10px, 600 weight, 0.1em tracking, uppercase)

### 3. `components/ui/button.tsx`

- `active:scale-[0.97] active:duration-75` — physical dip on press, instant response
- Primary variant: added `hover:shadow-md` — visible lift on hover

### 4. `components/ui/card.tsx`

- Shadow upgraded from `shadow-sm` to `shadow-[var(--shadow-card)]` with `transition-shadow duration-200`
- Border softened to `border-stone-200/80`
- CardFooter background: `bg-stone-50/50` → `bg-surface-accent/60` (warmer, matches page bg)

### 5. `components/ui/badge.tsx`

- Added `animate-scale-in` — badges scale from 92% to 100% on mount (150ms)

### 6. `components/ui/skeleton.tsx`

- Replaced flat `animate-pulse bg-stone-100` with shimmer gradient:
  `bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%] animate-shimmer`
- All composite skeletons (SkeletonCard, SkeletonRow, SkeletonTable, etc.) inherit automatically

### 7. `components/ui/input.tsx`

- Added `transition-[border-color,box-shadow] duration-150` — focus ring blooms smoothly instead of snapping on

### 8. `components/navigation/chef-nav.tsx`

- **Active left border accent:** Expanded sidebar nav items get `border-l-2 border-brand-500` when active, `border-transparent` when inactive — strong spatial anchor for current location
- **Group label opacity:** Inactive nav group labels (Culinary, Operations, etc.) render at `opacity-50`, active groups at full opacity — visual hierarchy communicates "you are here"
- **Mobile bottom tab icon bounce:** `group-active:scale-110 transition-transform duration-100` on bottom tab icons — subtle bounce on tap
- Native tooltips on collapsed rail items already existed — no change needed

### 9. `app/(chef)/layout.tsx`

- Default portal background fallback changed from `#f5f5f4` to `#ede9e4` — matches warm stone page token
- Chefs with custom `portal_background_color` are unaffected

### 10. `app/(chef)/dashboard/page.tsx`

- **Morning greeting:** `Good morning/afternoon/evening, {firstName}.` below the Dashboard title — small, human, `text-sm text-stone-400`
- **Emoji → colored dots:** Priority banner emojis (red circle, yellow circle, green circle, checkmark) replaced with `2.5x2.5` rounded dot spans using exact colors: critical `#ef4444`, high `#f59e0b`, normal `#e88f47` (brand), resolved `#10b981`

### 11. `components/navigation/chef-main-content.tsx`

- Added `usePathname()` from `next/navigation`
- Inner content div gets `key={pathname}` — React remounts on route change
- Added `animate-fade-slide-up` — every page transition fades and slides up from 8px below in 220ms with spring easing

## Design Principles Applied

1. **Restraint + precision + depth** — every change either adds contrast, motion feedback, or typographic authority
2. **CSS-native only** — no Framer Motion, no animation libraries
3. **Spring easing everywhere** — `cubic-bezier(0.16, 1, 0.3, 1)` produces fast-start, slow-settle motion
4. **Warm stone palette** — page background `#ede9e4` creates visible depth against white cards
5. **Micro-interactions** — button press dip, badge scale-in, input focus bloom, icon tap bounce

## Verification

- `npx tsc --noEmit --skipLibCheck` — exit 0 (pre-existing errors in staff/wellbeing files are unrelated)
- `npx next build --no-lint` — exit 0

## What Was NOT Changed

- No dark mode
- No layout restructuring
- No new pages or routes
- No data or functionality changes
- No widget component internals
- No new npm dependencies
