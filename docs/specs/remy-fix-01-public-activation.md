# Remy Fix 01: Public Activation + Mobile + Quick-Start

> **Priority:** P0 - Remy is invisible to all non-authenticated users
> **Risk level:** LOW - additive changes only, no existing behavior modified
> **Estimated scope:** 4 files modified

---

## Problem

1. `RemyConciergeWidget` is fully built but NEVER imported or rendered in any layout or page. Visitors to cheflowhq.com see no chatbot.
2. On mobile (< 1024px), `useRemyDisplayMode` force-locks mode to `hidden` and refuses all `setMode` calls. Mobile users cannot access Remy on ANY surface.
3. In `remy-public-widget.tsx` (the per-chef public chat), quick-start buttons use `setInput(q)` then `setTimeout(() => sendMessage(), 50)`. `sendMessage()` reads `input` from its closure, which is still the OLD empty string. Every quick-start sends an empty message.

## Exact Changes Required

### Change 1: Mount the concierge widget in the public layout

**File:** `app/(public)/layout.tsx`

Add a dynamic import for `RemyConciergeWidget` and render it inside the layout div, after `<PublicFooter />`.

```tsx
// Add this import at top, after existing dynamic import
const RemyConciergeWidget = dynamic(
  () => import('@/components/public/remy-concierge-widget').then((m) => m.RemyConciergeWidget),
  { ssr: false }
)

// Add <RemyConciergeWidget /> right after <PublicFooter /> inside the outer div
```

The result should look like:

```tsx
      <PublicFooter />
      <RemyConciergeWidget />
    </div>
```

### Change 2: Allow mobile users to toggle Remy

**File:** `lib/hooks/use-remy-display-mode.ts`

The problem is two places:

**A) Lines 66-80 - `setMode` callback:** Remove the early return that blocks mobile. Replace:

```ts
const setMode = useCallback(
  (nextMode: RemyDisplayMode) => {
    if (isMobile && mobileDefault === 'hidden') {
      setModeState('hidden')
      return
    }
    setModeState(nextMode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, nextMode)
    }
  },
  [isMobile, mobileDefault, storageKey]
)
```

With:

```ts
const setMode = useCallback(
  (nextMode: RemyDisplayMode) => {
    setModeState(nextMode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, nextMode)
    }
  },
  [storageKey]
)
```

**B) Line 82 - `effectiveMode`:** Remove the mobile override. Replace:

```ts
const effectiveMode: RemyDisplayMode = isMobile && mobileDefault === 'hidden' ? 'hidden' : mode
```

With:

```ts
const effectiveMode: RemyDisplayMode = mode
```

This keeps the `mobileDefault` parameter working for INITIAL state (line 44-46 already handles that correctly), but no longer FORCE-LOCKS mobile users out after initialization.

### Change 3: Fix quick-start button race condition

**File:** `components/ai/remy-public-widget.tsx`

The `sendMessage` function (line 53) reads `input` from closure. Quick-start buttons need to pass text directly.

**Step A:** Change the `sendMessage` signature to accept optional text. Replace lines 53-55:

```ts
const sendMessage = useCallback(async () => {
  const trimmed = input.trim()
  if (!trimmed || isStreaming) return
```

With:

```ts
const sendMessage = useCallback(async (overrideText?: string) => {
  const trimmed = (overrideText ?? input).trim()
  if (!trimmed || isStreaming) return
```

**Step B:** Update the quick-start buttons at lines 215-221. Replace:

```tsx
onClick={() => {
  setInput(q)
  setTimeout(() => sendMessage(), 50)
}}
```

With:

```tsx
onClick={() => sendMessage(q)}
```

**Step C:** The dependency array for `sendMessage` (around line 137) stays the same. The `overrideText` parameter is just an argument, not a dependency.

## Files NOT to modify

- Do NOT touch `components/public/remy-concierge-widget.tsx` (the landing page widget is already correct; it passes text directly via `sendMessage(s.message)` at line 414)
- Do NOT touch `components/ai/remy-drawer.tsx`
- Do NOT touch any API routes
- Do NOT touch any server-side files

## Verification

After changes:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. Visit the public layout pages (e.g. `/` or `/about`) and confirm the concierge widget appears in the bottom corner
3. On a mobile viewport (< 1024px), confirm the mascot button is visible and clicking it opens the chat
4. On a chef's public profile page, click any of the 3 quick-start buttons and confirm the message actually sends (not empty)
