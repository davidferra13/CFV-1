# Dark Mode System — Build Notes

**Date:** 2026-02-20
**Branch:** fix/grade-improvements

---

## What Was Built

A complete dark mode system for ChefFlow V1 using `next-themes` with Tailwind CSS `darkMode: 'class'` strategy.

---

## Files Modified

### `tailwind.config.ts`

Added `darkMode: 'class'` at the top of the config object. This tells Tailwind to apply dark variants only when a `.dark` class is present on the `<html>` element — the standard `next-themes` integration pattern. No color palette or content changes were made.

### `app/layout.tsx`

- Added `import { ThemeProvider } from '@/components/ui/theme-provider'`
- Added `suppressHydrationWarning` to the `<html>` element (required by `next-themes` to silence the expected class mismatch during SSR hydration)
- Wrapped the body's children in `<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>`
- `CookieConsent` and `PresenceBeacon` remain inside the provider so they also receive the theme context

---

## Files Created

### `components/ui/theme-provider.tsx`

A thin `'use client'` wrapper around `NextThemesProvider`. Isolates the client boundary at the provider level so the root layout can remain a server component. Accepts all standard `ThemeProviderProps`.

### `components/ui/theme-toggle.tsx`

A `'use client'` button component that reads the current theme via `useTheme()` and toggles between `'light'` and `'dark'`. Uses the `mounted` guard pattern to avoid hydration mismatches — renders `null` until mounted client-side. Uses `Button` with `variant="ghost"` and `size="sm"`, and `Sun`/`Moon` icons from `lucide-react`.

### `app/(chef)/settings/appearance/page.tsx`

A new settings sub-page at `/settings/appearance`. Protected by `requireChef()`. Renders a single card with the `ThemeToggle` component. Uses `dark:` Tailwind variants for card background, borders, and text so it looks correct in both modes. Title metadata: `Appearance - ChefFlow`.

### `components/ui/undo-toast.tsx`

A utility function `showUndoToast(message, onUndo, duration?)` that wraps `sonner`'s `toast()` with a pre-wired `Undo` action button. Exported as a named function (not a React component). Useful for any optimistic-update pattern that needs a brief undo window.

### `lib/undo/use-undo-stack.ts`

A generic client-side React hook `useUndoStack<T>(initialState)` that maintains a history stack of states with descriptions. API:

- `current` — the current state value
- `push(description, newState)` — saves current state to history and advances to `newState`
- `undo()` — pops history, restores previous state, returns the description string (or `null` if nothing to undo)
- `canUndo` — boolean derived from history length

---

## How Dark Mode Works

1. `next-themes` writes `class="dark"` (or removes it) on the `<html>` element based on user preference stored in `localStorage`.
2. Tailwind's `darkMode: 'class'` strategy activates all `dark:` utility variants whenever that class is present.
3. `defaultTheme: "light"` ensures a consistent SSR render; `enableSystem: false` prevents OS preference from overriding the explicit user choice.
4. `suppressHydrationWarning` on `<html>` prevents React from warning about the server-rendered (classless) vs. client-hydrated (with class) mismatch — this is expected and safe with `next-themes`.

---

## How to Surface the Toggle Elsewhere

`ThemeToggle` can be imported into any client component (sidebar, navbar, user menu). Example:

```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle'
// Inside any layout or nav component:
;<ThemeToggle />
```

The component handles its own mounting guard and requires no props.

---

## Adding Dark Styles Going Forward

Only files that are actively being modified should receive `dark:` class additions. The pattern is:

```tsx
// Light-first, then dark override
<div className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100">
```

Common stone-scale mappings used in this project:

- Background: `bg-white` / `dark:bg-stone-900`
- Card: `bg-stone-50` / `dark:bg-stone-800`
- Border: `border-stone-200` / `dark:border-stone-700`
- Body text: `text-stone-700` / `dark:text-stone-300`
- Muted text: `text-stone-500` / `dark:text-stone-400`
- Headings: `text-stone-900` / `dark:text-stone-100`

---

## Connection to System

- **Settings route**: The new `/settings/appearance` page slots into the existing settings section under `app/(chef)/settings/`. It follows the same `requireChef()` + `Card` layout pattern as all other settings pages.
- **No existing components were modified** beyond `tailwind.config.ts` and `app/layout.tsx` — dark mode activates globally via the class strategy, meaning existing components that already use standard Tailwind utilities will benefit as `dark:` overrides are added incrementally.
- **Undo infrastructure**: `useUndoStack` and `showUndoToast` are standalone utilities that do not depend on the theme system. They were added in the same build pass as a supporting UX primitive.
