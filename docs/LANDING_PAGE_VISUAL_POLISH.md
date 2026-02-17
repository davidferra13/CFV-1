# Landing Page Visual Polish

**Date:** 2026-02-16
**File changed:** `app/(public)/page.tsx`

## What Changed

Visual polish pass on the public landing page to align with the ChefFlow design system tokens.

### Color Replacements

| Before | After | Reason |
|--------|-------|--------|
| `gray-*` (all shades) | `stone-*` | Design system uses warm stone palette, not neutral gray |
| `bg-orange-500` | `bg-brand-600` | Primary brand color for buttons and step numbers |
| `hover:bg-orange-600` | `hover:bg-brand-700` | Brand hover state |
| `text-orange-500` | `text-brand-600` | Brand accent for hero highlight text |
| `bg-orange-100 text-orange-600` | `bg-brand-100 text-brand-700` | Feature card icon background (Event Management) |
| `bg-blue-100 text-blue-600` | `bg-sky-100 text-sky-600` | Feature card icon background (Client Portal) |
| `bg-green-100 text-green-600` | `bg-emerald-100 text-emerald-600` | Feature card icon background (Financial Tracking) |
| `bg-gray-50` (sections) | `bg-stone-50` | Alternating section backgrounds |

### Layout Refinements

| Before | After | Reason |
|--------|-------|--------|
| `max-w-4xl` (Hero, How It Works, Pricing) | `max-w-6xl` | Consistent max-width across all sections |
| No `rounded-xl` on feature cards | `rounded-xl` added | Softer, more polished card appearance |

### What Did NOT Change

- All copy/text content is identical
- HTML structure and component hierarchy unchanged
- SVG icons unchanged
- Responsive breakpoints unchanged
- Link destinations unchanged

## Why

This is part of the visual polish phase to bring the public-facing pages into alignment with the unified design system (stone palette + brand accent tokens). The previous implementation used raw Tailwind color names (gray, orange, blue, green) which would not respond to theme configuration changes and were visually inconsistent with the rest of the application.

## How It Connects

- The `brand-*` and `stone-*` tokens are defined in `tailwind.config.ts` as part of the design system
- The same token set is used throughout the chef portal and client portal
- This change ensures the landing page matches the authenticated experience visually
