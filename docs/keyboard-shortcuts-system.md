# Keyboard Shortcuts System (T3.4)

## Overview

Adds a global keyboard shortcut system to the chef portal. Chefs can navigate the app, trigger "create new" flows, and open global search without touching the mouse.

---

## Files Created

| File | Role |
|---|---|
| `components/ui/keyboard-shortcut-provider.tsx` | Client component — listens for keydown events, handles chord sequences and single-key shortcuts |
| `components/ui/shortcuts-help-panel.tsx` | Client modal — displays all shortcuts organized by category; shown on `?` |
| `components/ui/shortcut-hint.tsx` | Inline component — renders `<kbd>` badge pairs next to labels or in tooltips |
| `components/navigation/keyboard-shortcuts-wrapper.tsx` | Thin client island — bridges the server-rendered chef layout to the client provider |

## File Modified

| File | Change |
|---|---|
| `app/(chef)/layout.tsx` | Imported `KeyboardShortcutsWrapper` and wrapped the layout body so all chef pages get shortcuts |

---

## Shortcut Reference

### Navigation (G chords)

| Keys | Destination |
|---|---|
| G then D | `/dashboard` |
| G then C | `/clients` |
| G then I | `/inquiries` |
| G then E | `/events` |
| G then F | `/finance` |
| G then S | `/settings` |

### Create New (N chords)

| Keys | Destination |
|---|---|
| N then I | `/inquiries/new` |
| N then E | `/events/new` |
| N then Q | `/quotes/new` |
| N then C | `/clients/new` |

### Single-key

| Key | Action |
|---|---|
| `?` | Toggle shortcuts help panel |
| `/` | Dispatch `open-search` custom event |
| `Cmd+K` / `Ctrl+K` | Dispatch `open-search` custom event |
| `Escape` | Close shortcuts help panel |

---

## Architecture Decisions

### Server layout + client provider
The chef layout (`app/(chef)/layout.tsx`) is a server component performing the auth role-check before any client code ships. Adding a `'use client'` directive there directly would break that guard. Instead, `KeyboardShortcutsWrapper` is a minimal client island that Next.js resolves at the client boundary — the server component imports it freely and passes children through. The auth check still runs server-side.

### Chord implementation
Chords (two-key sequences like G→D) are tracked with a `useRef` storing the last key and its timestamp. If the second key arrives within 1 000 ms of the first, the pair is checked against the chord table. The ref avoids re-renders on every keystroke; only state changes (help panel open/close) trigger renders.

### Typing guard
Before any shortcut fires, `isTypingTarget()` checks `document.activeElement`. If the focused element is `<input>`, `<textarea>`, or `[contenteditable]`, all shortcuts are suppressed so chefs can type normally in forms.

### Search integration
The `/` and `Cmd+K` shortcuts dispatch a browser `CustomEvent('open-search')` on `window`. Any search component (current or future) can listen for this event with `window.addEventListener('open-search', ...)` without needing to know about the shortcut system.

### ShortcutHint component
`ShortcutHint` accepts a `keys: string[]` array and renders each key as a styled `<kbd>` element with "then" separators between chords. It is intentionally small and inline — suitable for use next to nav labels, button text, or inside tooltips.

---

## Pre-existing Lint Warning (not introduced by this change)

The inline `style` prop on the `<div>` in `app/(chef)/layout.tsx` (portal background color/image from the database) carries a pre-existing CSS lint warning. This cannot be converted to static Tailwind classes because the values are dynamic per-chef runtime data. The warning predates this change and is unrelated to the keyboard shortcut work.
