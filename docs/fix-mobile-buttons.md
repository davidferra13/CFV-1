# Fix: Mobile Buttons Not Responding

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## Problem

On mobile, buttons in the navigation bar (hamburger menu, Remy, notifications) and the Remy FAB were not responding to taps. Desktop worked fine.

## Root Cause

**Stale Service Worker with CacheFirst strategy for JS files.**

The `public/sw.js` was a Workbox-generated service worker with a precache manifest referencing old production build chunks (`chefflow-build`). Critically, it used `CacheFirst` for `/_next/static.+.js` — meaning it **always served JS from the cache, never checking the network**. The cached JS didn't match the current dev server output, so React hydration failed silently. Without hydration, event handlers (`onClick`, etc.) were never attached to buttons.

**Why only mobile was affected:**

- On desktop (localhost), the browser was likely fetching fresh JS because the SW wasn't registered or the cache was empty.
- On mobile, the user connects via LAN IP (e.g., `192.168.x.x:3100`). The SW was registered there from a previous session and the CacheFirst strategy served stale JS on every subsequent visit.

**Why the first fix attempt didn't work:**

- The initial fix only unregistered the SW when `hostname === 'localhost'` or `hostname === '127.0.0.1'`. Mobile connects via a LAN IP, which didn't match any of those conditions. The stale SW remained active on mobile.

## Solution

### 1. `public/sw.js` — Replaced with self-destructing SW

The old 500+ line Workbox SW was replaced with a minimal "self-destructing" service worker that:

1. Calls `self.skipWaiting()` on install
2. On activate: clears all caches, unregisters itself, and reloads all open tabs

When mobile's existing SW checks for updates (happens on navigation), it downloads this new `sw.js`, sees it has changed, installs it, and the new SW immediately kills itself and reloads the page. After that, there's no SW at all and React hydration works normally.

### 2. `components/pwa/sw-register.tsx` — Always unregister

The `SwRegister` component now unconditionally unregisters any existing service worker on every page load. Since PWA is bypassed in `next.config.js` (only active when `ENABLE_PWA_BUILD=1`), there's never a valid SW to register. The belt-and-suspenders approach ensures the SW is killed both server-side (new sw.js) and client-side (SwRegister).

### 3. Earlier changes (kept)

- `components/search/global-search.tsx` — backdrop lowered from `z-40` to `z-30`
- `components/navigation/chef-nav.tsx` — touch targets increased to 40px

## How to Verify

1. Open the app on your phone
2. The self-destructing SW will install, clear all caches, unregister itself, and reload the page
3. After the reload, all navigation buttons, hamburger menu, and Remy FAB should respond to taps
4. Check browser console for `[SW] Unregistered service worker`
5. If buttons still don't work after one reload, clear site data in phone settings (Settings > Safari/Chrome > Clear Website Data)
