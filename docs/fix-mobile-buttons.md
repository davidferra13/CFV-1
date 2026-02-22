# Fix: Mobile Buttons Not Responding

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## Problem

On mobile, buttons in the navigation bar (hamburger menu, Remy, notifications) and the Remy FAB were not responding to taps. Desktop worked fine.

## Root Cause

**Stale Service Worker:** The `SwRegister` component unconditionally registered `sw.js` even in development mode. The `sw.js` precache manifest referenced old production build chunks (`chefflow-build`). On mobile, where the service worker persists between visits, it served stale cached JavaScript that didn't match the dev server's current output. This broke React hydration, meaning event handlers (onClick, etc.) were never attached to buttons.

**Contributing factors:**

- `GlobalSearch` backdrop used `z-40` (same level as mobile header), creating stacking context conflicts
- Mobile header touch targets were 36px — below the recommended 44px minimum

## Changes

### 1. `components/pwa/sw-register.tsx`

- In development mode (localhost, 127.0.0.1, port 3000/3100), the component now **unregisters** any existing service worker instead of registering one
- In production, behavior is unchanged (registers `sw.js` normally)

### 2. `components/search/global-search.tsx`

- Lowered the full-screen backdrop from `z-40` to `z-30` so it doesn't compete with other `z-40` fixed elements (mobile header, bottom tab bar)

### 3. `components/navigation/chef-nav.tsx`

- Increased mobile header button touch targets from `w-9 h-9` (36px) to `w-10 h-10` (40px)
- Added `gap-0.5` spacing between header buttons

## How to Verify

1. Open the app on your phone
2. The service worker should auto-unregister on next load (check console for `[SW] Unregistered stale service worker in dev mode`)
3. All navigation buttons, hamburger menu, and Remy FAB should respond to taps
4. If buttons still don't work after one page load, do a hard refresh (pull down or clear cache) to flush the old SW cache
