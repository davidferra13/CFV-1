# Dark Mode Conversion — Session Notes

**Date:** 2026-02-23
**Branch:** feature/risk-gap-closure

## What Changed

ChefFlow was converted from a light theme (white/cream backgrounds) to a permanent dark theme. This was inspired by the developer discovering that Dark Reader's transformation of the site looked significantly better — the warm terracotta/orange brand colors radiate against dark surfaces, giving the site a premium, luxury restaurant feel.

## Decision: No Toggle

The site is just dark now. There is no light/dark toggle. The `ThemeProvider` still exists but defaults to "light" — we changed what the light colors ARE, rather than adding `dark:` variants. This means zero overhead, zero toggle UI, and a simpler codebase.

## Color Mapping

The conversion inverts the Tailwind `stone` scale (warm-toned grays) while keeping brand orange untouched:

| Element            | Before                  | After                      |
| ------------------ | ----------------------- | -------------------------- |
| Page background    | `#ede9e4` (beige)       | `#0c0a09` (near black)     |
| Card/container bg  | `#ffffff` (white)       | `#1c1917` (dark warm gray) |
| Subtle backgrounds | `#faf9f7` (off-white)   | `#292524` (dark gray)      |
| Heading text       | `stone-900`             | `stone-100`                |
| Body text          | `stone-800`             | `stone-200`                |
| Secondary text     | `stone-600`             | `stone-400`                |
| Borders            | `stone-200`             | `stone-700`                |
| Brand tints        | `brand-50`              | `brand-950`                |
| Active links       | `brand-700`             | `brand-400`                |
| Brand buttons      | `brand-600` (unchanged) | `brand-600` (unchanged)    |
| Status badges      | `*-50` backgrounds      | `*-950` backgrounds        |

## Files Changed

### Foundation

- `tailwind.config.ts` — Surface color tokens redefined to dark values
- `app/globals.css` — Body defaults, input styles, scrollbar, selection, shadows, FullCalendar theme, skeleton, label-section, ring-offset color

### Core UI Components

- `components/ui/card.tsx` — `bg-white` → `bg-surface`, `border-stone-200` → `border-stone-700`
- `components/ui/button.tsx` — Secondary/ghost variants darkened
- `components/ui/badge.tsx` — All variant backgrounds darkened (`*-50` → `*-950`)

### Batch Conversion (~200+ files)

All `.tsx` and `.ts` files in `app/` and `components/` (excluding `components/embed/`) were batch-converted using sed find-and-replace for:

- `bg-white` → `bg-surface`
- `bg-stone-{50,100,200}` → `bg-stone-{800,800,700}`
- `text-stone-{900,800,700,600}` → `text-stone-{100,200,300,400}`
- `border-stone-{100,200,300}` → `border-stone-{800,700,600}`
- `bg-brand-{50,100,200,300}` → `bg-brand-{950,900,800,800}`
- `bg-{color}-{50,100}` → `bg-{color}-{950,900}` for all color scales
- `text-brand-700` → `text-brand-400`
- Various hover/active state inversions

### Edge Cases

- `app/(chef)/layout.tsx` — Portal fallback color `#ede9e4` → `#0c0a09`
- `app/(public)/page.tsx` — Hero gradient fixed for dark (warm dark gradient)
- `app/(public)/unsubscribe/page.tsx` — Inline style colors darkened

### Excluded from conversion

- `components/embed/embed-inquiry-form.tsx` — Iframe-isolated, uses inline styles
- `public/embed/chefflow-widget.js` — External widget
- `app/opengraph-image.tsx` — OG image generation (static PNG)
- Game pages (`snake`, `galaga`, `the-line`) — Game canvases keep their own colors

## After Restart

The dev server needs to be restarted after this conversion to pick up the `tailwind.config.ts` surface color changes. Run:

```bash
# Kill dev server, clear cache, restart
rm -rf .next/
npm run dev
```

## Visual Reference

The Dark Reader screenshot that inspired this change showed:

- Deep black backgrounds
- Warm terracotta orange buttons/accents glowing against dark surfaces
- Dark gray cards with subtle borders
- A "luxury restaurant menu" aesthetic

The goal was to replicate this exact feel natively.
