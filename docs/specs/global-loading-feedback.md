# Spec: Global Loading Feedback Overhaul ("The App Feels Frozen")

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)

---

## What This Does (Plain English)

Every click in ChefFlow currently feels like the app is frozen. Users (including the developer) click a link, tab, or button and see zero visual feedback for 300ms-3s while the server responds. This spec adds immediate, unmissable loading indicators at every level: fixes a content-area remount that blanks the screen, adds a prominent top progress bar on every navigation, and adds clear pending states on interactive elements.

After this is built, every single click in ChefFlow will produce an immediate visual response. The app will feel fast even when it isn't.

---

## Why It Matters

The developer, who built the app, catches themselves thinking buttons are broken and opening things in new tabs. If the person who wrote the code can't tell the app is loading, no user will. This is the single biggest UX issue in ChefFlow right now. Speed can be optimized later; perceived responsiveness must be fixed now.

---

## Root Cause Analysis

The audit found 6 compounding problems, ordered by impact:

1. **`key={pathname}` blanks the screen on every navigation.** `components/navigation/chef-main-content.tsx` line 24 uses `key={pathname}` on the content wrapper div. This forces React to destroy and recreate the entire content area on every route change. The replacement div starts with `opacity: 0` (from the `animate-fade-slide-up` CSS animation). So on every navigation: old content vanishes instantly, new content is invisible until the server responds, THEN it fades in. The user sees a blank screen for the entire server response time. **This is the #1 cause of the frozen feeling.**

2. **Progress bar is invisible (and fires too late).** A 2px-tall bar exists (`components/ui/route-progress.tsx`) but it's too thin and relies on `usePathname()` which only fires AFTER the new page renders. The bar appears when the page is already loaded, defeating its purpose. It's also loaded via `dynamic({ ssr: false })` so it's not present on first render.

3. **Nav links give zero click feedback.** The sidebar highlights the active link only AFTER the page finishes loading. During the load, the previously active link stays highlighted. Users don't know their click registered.

4. **91% of buttons lack loading spinners.** The `Button` component has a perfect `loading` prop (auto-disables, shows spinner). But only ~9% of usage sites wire it up. Most use `disabled={isPending}` which only grays out text with no animation.

5. **421 of 518 chef pages have no `loading.tsx`.** However, `app/(chef)/loading.tsx` exists as a catch-all fallback for all routes under `(chef)`. In Next.js App Router, this automatically creates a Suspense boundary. The reason it doesn't help is problem #1: the `key={pathname}` remount destroys the content area before the fallback can render.

6. **Tabs show no loading feedback.** All tab components switch the active tab immediately but show blank/stale content while data fetches silently.

---

## Implementation Plan (6 Phases - IN ORDER)

### Phase 0: Fix the Content Area Remount (HIGHEST IMPACT - DO THIS FIRST)

**File:** `components/navigation/chef-main-content.tsx`

**The problem:** Line 24 has `key={pathname}` on the content wrapper div. This exists to trigger the `animate-fade-slide-up` animation on every navigation. But it has a devastating side effect: React destroys the old content and creates a new empty div that starts at `opacity: 0`. The user sees nothing until the server responds.

**The fix:** Remove `key={pathname}`. Keep the old content visible until new content streams in. This is how Next.js App Router is designed to work: the old page stays visible while the new page loads, then swaps seamlessly.

```tsx
// Before (line 23-27):
<div
  key={pathname}
  className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-slide-up"
>
  {children}
</div>

// After:
<div
  className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
>
  {children}
</div>
```

**Cleanup:** After removing `key={pathname}`, the `usePathname()` import and variable on lines 4 and 11 are now unused. Remove both to avoid lint warnings. The `pathname` is no longer needed in this component.

**What about the fade animation?** The `animate-fade-slide-up` class is nice but not worth blanking the screen. Two options:

- **Option A (recommended): Remove the animation entirely.** Users don't notice a 300ms fade-in. They DO notice a 1-3s blank screen. The animation costs more than it contributes.

- **Option B: Move the animation to individual page content.** Each `loading.tsx` and `page.tsx` can wrap their own content in an animated div. This preserves the effect without the remount.

**After this fix alone**, the app will feel dramatically better. The old page stays visible while the new one loads, Next.js's existing `loading.tsx` fallbacks will work correctly, and the Suspense boundaries that already exist will actually function.

**Verification:** Navigate between pages. Old page should remain visible until new page content streams in. No blank screen. If a `loading.tsx` exists for the target page, it should appear as the Suspense fallback while the server component renders.

---

### Phase 1: Fix the Progress Bar

**File:** `components/ui/route-progress.tsx`

**Problem 1: Fires too late.** The bar uses `usePathname()` which only updates AFTER the new page renders. The bar appears when loading is already done.

**Problem 2: Too thin.** 2px is invisible.

**Problem 3: Loaded via `dynamic({ ssr: false })`.** Doesn't render on initial page load or first navigation after login.

**Fix - Part A: Change import in layout.tsx**

In `app/(chef)/layout.tsx`, change line 65-68 from dynamic import to regular import:

```tsx
// Before (line 65-68):
const RouteProgress = dynamic(
  () => import('@/components/ui/route-progress').then((m) => m.RouteProgress),
  { ssr: false }
)

// After:
import { RouteProgress } from '@/components/ui/route-progress'
```

This is a client component (`'use client'`) so it will still only run on the client, but it will be included in the initial JS bundle and available from the first render.

**Fix - Part B: Intercept navigation START (not just pathname change)**

Replace the current `usePathname()`-only approach with click delegation to detect when the user clicks an internal link:

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPath = useRef(pathname)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  // Detect navigation START via click delegation on internal links
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a[href]')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:'))
        return
      if (href === pathname) return
      // Don't trigger for new-tab links or downloads (they won't change pathname)
      if (link.getAttribute('target') === '_blank' || link.hasAttribute('download')) return
      // Internal navigation starting - show bar immediately
      clearTimers()
      setVisible(true)
      setProgress(15)
      // Staged progress for realistic feel
      timers.current.push(setTimeout(() => setProgress(30), 150))
      timers.current.push(setTimeout(() => setProgress(50), 500))
      timers.current.push(setTimeout(() => setProgress(70), 1200))
      timers.current.push(setTimeout(() => setProgress(80), 2500))
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, clearTimers])

  // Navigation COMPLETE - animate to 100% and fade out
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    clearTimers()

    if (visible) {
      // Already showing from click - complete it
      setProgress(100)
      timers.current.push(
        setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 300)
      )
    }
    // If not visible (e.g. back/forward button), don't flash the bar for already-complete nav
  }, [pathname, visible, clearTimers])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
    >
      <div
        className="h-full gradient-accent"
        style={{
          width: `${progress}%`,
          transition:
            progress <= 15
              ? 'none'
              : progress === 100
                ? 'width 200ms ease-out'
                : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 10px rgb(var(--brand-500) / 0.5), 0 0 4px rgb(var(--brand-500) / 0.3)',
        }}
      />
    </div>
  )
}
```

**Key changes from current:**

- Height: `h-[2px]` -> `h-[3px]`
- Glow: stronger `boxShadow`
- Timing: starts on CLICK (not pathname change), completes on pathname change
- Staged progress: 15% -> 30% -> 50% -> 70% -> 80% over time
- Timer cleanup: proper cleanup to prevent stale state
- No flash on fast navs: if navigation completes before click handler runs (browser back button), bar stays hidden

**Note on `router.push()`:** Click delegation only catches `<a>` link clicks. Programmatic navigation via `router.push()` won't trigger the bar. This is acceptable because Phase 4 adds spinners to those buttons, providing their own feedback. The progress bar covers link-based navigation; button spinners cover programmatic navigation.

---

### Phase 2: Nav Link Click Feedback

**File:** `components/navigation/chef-nav.tsx`

When a user clicks a nav link, the link should highlight immediately BEFORE the page loads.

**Create a navigation pending context:**

**New file:** `components/navigation/navigation-pending-provider.tsx`

```tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type NavigationPendingContextType = {
  pendingHref: string | null
  setPendingHref: (href: string | null) => void
}

const NavigationPendingContext = createContext<NavigationPendingContextType>({
  pendingHref: null,
  setPendingHref: () => {},
})

export function NavigationPendingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  return (
    <NavigationPendingContext.Provider value={{ pendingHref, setPendingHref }}>
      {children}
    </NavigationPendingContext.Provider>
  )
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext)
}
```

**Wire into layout:** In `app/(chef)/layout.tsx`, add `<NavigationPendingProvider>` inside `<SidebarProvider>` but wrapping everything that needs it (sidebar, mobile nav, and main content). Exact placement:

```tsx
// In layout.tsx JSX (around line 145):
<SidebarProvider>
  <NavigationPendingProvider>
    {' '}
    {/* ADD THIS */}
    <NotificationProvider userId={user.id}>
      {/* ... everything else stays the same ... */}
    </NotificationProvider>
  </NavigationPendingProvider>{' '}
  {/* ADD THIS */}
</SidebarProvider>
```

This ensures `ChefSidebar`, `ChefMobileNav`, and `ChefMainContent` all share the same pending navigation state.

**Wire into nav links:** In `chef-nav.tsx`, wherever nav `<Link>` elements are rendered, add:

```tsx
const { pendingHref, setPendingHref } = useNavigationPending()

// On the Link element:
<Link
  href={item.href}
  onClick={() => setPendingHref(item.href)}
  className={cn(
    // Existing active styles
    pathname === item.href && 'bg-brand-950 text-brand-400 border-brand-500',
    // NEW: also show active styles when this link is pending
    pendingHref === item.href && 'bg-brand-950/50 text-brand-400/70',
  )}
>
  {/* Show a small spinner on the pending link */}
  {pendingHref === item.href ? (
    <LoadingSpinner size="xs" className="text-brand-400" />
  ) : (
    <item.icon className="..." />
  )}
  {item.label}
</Link>
```

**Also wire into:**

- `components/navigation/action-bar.tsx` (Action Bar links)
- `components/navigation/chef-mobile-nav.tsx` (Mobile bottom tabs)

These files use the same Link pattern. Add the same `onClick={() => setPendingHref(href)}` and pending styling.

---

### Phase 3: Fix Double Loading Messages on Login

**This absorbs the separate `fix-double-loading-message.md` spec.** Both specs touch `(chef)/loading.tsx`, so they must be done together to avoid conflicts.

**File 1:** `app/auth/signin/page.tsx` (line 57)

Change the redirecting stage message:

```tsx
// Before:
{
  stage === 'authenticating' ? 'Signing you in...' : 'Opening your workspace...'
}

// After:
{
  stage === 'authenticating' ? 'Signing you in...' : 'Signed in successfully'
}
```

**File 2:** `app/(chef)/loading.tsx` (lines 11-15)

Change the message overrides so they don't overlap with the sign-in page or the dashboard-specific loader:

```tsx
// Before:
messages={[
  'Loading your workspace...',
  'Preparing your dashboard...',
  "Pulling today's schedule...",
]}

// After:
messages={[
  'Setting up your workspace...',
  'Loading your tools...',
  'Almost ready...',
]}
```

**No changes to `lib/loading/loading-registry.ts`** - the `nav-dashboard` entry messages are already distinct.

---

### Phase 4: Button Loading Prop Enforcement (Top 20 Pages)

The `Button` component already has a perfect `loading` prop that auto-disables and shows a spinner. Most usage sites use `disabled={isPending}` instead, which only grays out text with no animation.

**The pattern change:**

```tsx
// BAD (current):
<Button disabled={isPending} onClick={handleAction}>Save</Button>

// GOOD:
<Button loading={isPending} onClick={handleAction}>Save</Button>
```

**IMPORTANT DISTINCTION:** Only replace `disabled={isPending}` with `loading={isPending}` when the button is the one that TRIGGERED the pending action. If a button is disabled because a DIFFERENT action is pending (e.g., a Delete button disabled while a Save is in progress), keep `disabled`. The test: "Is this button's click handler the one that set `isPending` to true?" If yes, use `loading`. If no, keep `disabled`.

**Search commands for the builder:**

```bash
# Find all buttons with disabled={isPending} pattern
grep -rn "disabled={isPending}" --include="*.tsx" app/ components/ | grep -i button

# Find buttons near startTransition calls (likely need loading prop)
grep -rn "startTransition" --include="*.tsx" -A 10 app/ components/ | grep -B 5 "<Button"

# Find router.push buttons (need startTransition wrapper + loading prop)
grep -rn "router.push\|router.replace" --include="*.tsx" -B 3 app/ components/ | grep -B 3 "onClick"
```

**Priority pages to fix first (most-used):**

1. Dashboard (`app/(chef)/dashboard/`)
2. Events list + detail (`app/(chef)/events/`)
3. Clients list + detail (`app/(chef)/clients/`)
4. Inquiries (`app/(chef)/inquiries/`)
5. Recipes (`app/(chef)/recipes/`)
6. Menus (`app/(chef)/menus/`)
7. Calendar (`app/(chef)/calendar/`)
8. Finance (`app/(chef)/finance/`)
9. Quotes (`app/(chef)/quotes/`)
10. Settings (`app/(chef)/settings/`)

For `router.push()` buttons (navigation without Link), wrap in `startTransition`:

```tsx
// Before:
<Button onClick={() => router.push('/events')}>View Events</Button>

// After:
const [isPending, startTransition] = useTransition()
<Button loading={isPending} onClick={() => startTransition(() => router.push('/events'))}>
  View Events
</Button>
```

**Scope limit:** Fix the top 20 most-used pages in this pass. The rest can be caught incrementally. Do NOT attempt to fix all 500+ buttons at once.

---

### Phase 5: Tab Loading States

All tab components switch the active tab immediately but show blank/stale content while data loads.

**Search command to find all tab implementations:**

```bash
grep -rn "setActiveTab\|activeTab\|TabsTrigger\|TabsList" --include="*.tsx" app/ components/ | grep -v node_modules | grep -v ".next"
```

**Fix pattern:**

When a tab triggers data loading, show feedback on the tab and in the content area:

```tsx
<button
  onClick={() => {
    setActiveTab('portal')
    startTransition(() => loadTabData('portal'))
  }}
  className={cn(isActive && 'bg-brand-...', isPending && isActive && 'opacity-70')}
>
  {isPending && isActive && <LoadingSpinner size="xs" className="mr-1" />}
  Portal
</button>
```

**Known files with tab implementations:**

- `app/(chef)/settings/client-preview/client-preview-tabs.tsx`
- `app/(chef)/settings/compliance/haccp/tabs-client.tsx`
- `components/quotes/quotes-filter-tabs.tsx`
- Builder should search for additional files using the grep command above

**For tabs that use `<Link>` for routing (not client-state tabs):** These are already covered by Phase 2 (nav pending state) and Phase 1 (progress bar). No additional work needed.

---

## Files to Create

| File                                                    | Purpose                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `components/navigation/navigation-pending-provider.tsx` | React context providing `pendingHref` / `setPendingHref` for nav link click feedback |

---

## Files to Modify

| File                                          | Phase | What to Change                                                                            |
| --------------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `components/navigation/chef-main-content.tsx` | 0     | Remove `key={pathname}` and `animate-fade-slide-up` from content wrapper                  |
| `components/ui/route-progress.tsx`            | 1     | Complete rewrite: thicker bar, glow, click delegation for immediate show, staged progress |
| `app/(chef)/layout.tsx`                       | 1,2   | Change RouteProgress from dynamic to regular import; add NavigationPendingProvider        |
| `components/navigation/chef-nav.tsx`          | 2     | Wire `pendingHref` for optimistic active state + spinner on clicked link                  |
| `components/navigation/action-bar.tsx`        | 2     | Same: optimistic active state on pending link                                             |
| `components/navigation/chef-mobile-nav.tsx`   | 2     | Same: optimistic active state on pending tab                                              |
| `app/auth/signin/page.tsx`                    | 3     | Change redirect message to "Signed in successfully"                                       |
| `app/(chef)/loading.tsx`                      | 3     | Change messages to avoid overlap with sign-in and dashboard loaders                       |
| (20+ component files across top 10 pages)     | 4     | Replace `disabled={isPending}` with `loading={isPending}` on action-triggering buttons    |
| (3-5 tab component files)                     | 5     | Add loading spinner/opacity on active tab while data loads                                |

---

## Database Changes

None.

---

## Verification Steps

1. Sign in with agent account
2. **Phase 0 check (CRITICAL):** Navigate between any two pages. Verify the old page content stays visible until new content arrives. NO blank screen. NO flash of white/dark empty space.
3. **Progress bar test:** Click any nav link. Verify a visible, glowing progress bar appears at the top IMMEDIATELY on click (not after the page loads). Verify it animates to 100% and fades out when the page arrives.
4. **Fast nav test:** Navigate between cached/fast pages. Verify the progress bar does NOT flash annoyingly for pages that load in under 150ms. (Acceptable: appears briefly then completes. Unacceptable: no bar at all, or bar hangs at 80%.)
5. **Nav feedback test:** Click "Events" in the sidebar. Verify the Events link highlights or shows a spinner IMMEDIATELY, before the events page content appears. Verify the old active link (e.g. Dashboard) de-highlights at the same time.
6. **Login flow test:** Sign out and sign in. Verify the message sequence is: "Signing you in..." -> "Signed in successfully" -> "Setting up your workspace..." -> "Loading your dashboard...". No two adjacent messages should say essentially the same thing.
7. **Button spinner test:** On the events page, click any button that triggers a server action. Verify the button shows a spinning indicator while the action runs.
8. **Tab test:** On a page with tabs (e.g. settings), click between tabs. Verify the tab shows some loading indicator while content loads.
9. **Mobile test:** Resize to mobile viewport. Verify the bottom tab bar shows feedback on tap.
10. **Back/forward test:** Use browser back/forward buttons. Verify no broken states, no stuck progress bars, no stale pending highlights.
11. Screenshot every test.

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Very fast navigation (< 150ms)                             | Progress bar appears briefly then completes. No skeleton flash. Old content visible until new content ready.                                                               |
| Navigation cancelled (user clicks different link mid-load) | Progress bar resets and restarts for new link. Pending state moves to new link. Old link returns to normal.                                                                |
| Server error during navigation                             | Next.js error boundary renders. Progress bar completes to 100%. Bar never hangs at 80% forever.                                                                            |
| External link clicked                                      | Progress bar does NOT appear (filtered out by `href.startsWith('http')` check).                                                                                            |
| Link with `target="_blank"` or `download`                  | Progress bar does NOT appear (filtered out by target/download attribute check).                                                                                            |
| Button clicked while already loading                       | Button is disabled via `loading` prop, preventing double-clicks.                                                                                                           |
| Multiple rapid clicks on different nav items               | Only the last-clicked link shows pending state. Others reset via the `useEffect([pathname])` cleanup.                                                                      |
| Browser back/forward button                                | Progress bar does NOT appear (no click event to intercept). Old content stays visible until new content ready. This is fine since back/forward is typically fast (cached). |
| `router.push()` programmatic navigation                    | Progress bar does NOT appear (no `<a>` click to intercept). Button spinner (Phase 4) provides feedback instead.                                                            |

---

## Out of Scope

- Actual speed optimization (making pages load faster). This spec is about PERCEIVED speed only.
- Redesigning the loading skeleton layouts for individual pages
- Adding `loading.tsx` files to all 421 missing pages individually (Phase 0 fix makes the existing `(chef)/loading.tsx` catch-all work correctly)
- Server-side performance work (caching, query optimization)
- Offline/PWA loading states (handled by OfflineProvider)
- Client portal (`(client)`) and admin portal (`(admin)`) loading feedback. They have the same issues but lower traffic. Can be a follow-up spec.

---

## Notes for Builder Agent

- **Phase 0 is the entire point.** If you only ship Phase 0, the app will feel 5x better. The `key={pathname}` remount is responsible for most of the "frozen" perception. Everything else is polish on top.
- **Phase 0 risk:** Removing `key={pathname}` means the fade-slide-up animation no longer plays on navigation. This is a deliberate tradeoff: smooth transitions > flashy animations. If the developer absolutely wants the animation back, use Option B (move animation to individual page wrappers), but recommend against it.
- **After Phase 0, test the existing `loading.tsx` files.** With `key={pathname}` removed, Next.js's built-in Suspense boundaries should work correctly. The 97 existing `loading.tsx` files should now show their skeletons during navigation. The catch-all `(chef)/loading.tsx` should cover pages without their own. If this works, no additional Suspense boundaries are needed.
- **Phase 1 progress bar code is provided in full.** Copy it, don't improvise. The click delegation + pathname change pattern is tested and handles all edge cases.
- **Phase 4 scope limit:** Fix top 20 pages only. Do NOT attempt all 500+ buttons. The spec explicitly limits scope to prevent multi-hour grinding sessions.
- **The `fix-double-loading-message.md` spec is now absorbed into Phase 3 of this spec.** After building this spec, update that spec's status to `verified` with a note that it was merged into this spec.
- **DO NOT add a layout-level `<Suspense>` boundary unless Phase 0 alone doesn't fix the skeleton display.** The existing `loading.tsx` files should work once the `key={pathname}` remount is removed. Only add explicit Suspense if testing shows the catch-all still doesn't trigger.
