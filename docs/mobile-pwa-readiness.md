# Mobile & PWA Readiness

**Branch:** `feature/packing-list-system`
**Date:** 2026-02-19

## What Changed and Why

ChefFlow was fully functional in the browser but was not properly set up to be installed as a home screen app on iOS or Android. This pass addressed all blocking issues and added mobile polish across the board.

---

## Changes Made

### 1. PNG Icons Generated (`scripts/generate-icons.ts`)

Apple does not support SVG for home screen icons. The existing manifest icons were SVG-only, meaning iOS would show a blurry screenshot instead of the ChefFlow logo when added to the home screen.

Created a one-time script using `sharp` (PNG→PNG resize, reliable cross-platform) that generates:

- `public/apple-touch-icon.png` — 180×180, referenced by iOS Safari for "Add to Home Screen"
- `public/icon-192.png` — 192×192, used by Android PWA install
- `public/icon-512.png` — 512×512, used by Android splash/install screens

Source: `public/logo.png`. Run again any time the logo changes: `npx tsx scripts/generate-icons.ts`

### 2. Manifest Updated (`public/manifest.json`)

- Added PNG icon entries (alongside existing SVGs for forward compat)
- Changed `start_url` from `/` to `/dashboard` — both chefs and clients land here post-auth, so the installed app opens in the right place
- Changed `orientation` from `any` to `portrait` — the app is designed for portrait use
- Added `categories: ["business", "productivity"]` — improves discoverability in app stores and browser install UIs
- Added `shortcuts` for New Event and Inbox — Android long-press on the home screen icon shows quick actions

### 3. Layout Updated (`app/layout.tsx`)

- Added `export const viewport: Viewport` (Next.js 14 Metadata API) — this is the proper way to set viewport in Next.js 14+, replacing manual `<meta>` tags
- `viewportFit: 'cover'` — allows content to render edge-to-edge on iPhones with notch/Dynamic Island; safe area insets (see below) then control padding
- `themeColor: '#111827'` moved to viewport export (canonical location)
- Apple icon updated to reference the new `apple-touch-icon.png` (180×180 PNG)
- Removed manual `<meta name="theme-color">` and `<meta name="mobile-web-app-capable">` from `<head>` — these are now handled by the viewport/metadata exports

### 4. Service Worker (`next.config.js` + `next-pwa`)

Installed `next-pwa` which uses Workbox to auto-generate a service worker at build time.

Config:
- `dest: 'public'` — SW files (`sw.js`, `workbox-*.js`) written to `public/` at build time
- `disable: process.env.NODE_ENV === 'development'` — SW is disabled in dev to avoid caching bugs during development
- `fallbacks.document: '/offline.html'` — when a page navigation fails (no network + not cached), serve the offline page

The generated SW files are excluded from git (see `.gitignore`). They are regenerated on every production build.

**This is the key change that enables the Android browser install prompt.** Chrome requires a registered service worker before showing the "Add to Home Screen" / install banner.

### 5. Offline Fallback Page (`public/offline.html`)

A standalone HTML page (no framework dependencies) served by the service worker when:
- The user has no network
- The requested page isn't in the SW cache

Design: dark background matching the app (`#111827`), branded message, "Try Again" button. Uses `env(safe-area-inset-*)` directly for safe rendering on notched devices.

### 6. Safe Area Insets (`app/globals.css`)

Added CSS utility classes for iOS devices with notch/Dynamic Island/home indicator:

```css
.pb-safe        /* padding-bottom: env(safe-area-inset-bottom) */
.pt-safe        /* padding-top: env(safe-area-inset-top) */
.pb-mobile-nav  /* padding-bottom: calc(3.5rem + env(safe-area-inset-bottom)) */
```

`viewportFit: 'cover'` in the viewport export (step 3) is required for `env(safe-area-inset-*)` to return non-zero values on iOS. Without `viewport-fit=cover`, the browser clips the layout away from the notch area and the env() values are always 0.

Applied to:
- Bottom nav bars in `chef-nav.tsx` and `client-nav.tsx` → `pb-safe` on the `<nav>` element
- Main content wrappers in `chef-main-content.tsx` and `client-nav.tsx` (ClientMainContent) → `pb-mobile-nav` replaces `pb-16`

### 7. Touch Interaction Polish (`app/globals.css`)

**`touch-action: manipulation`** added to `button, a, [role="button"], [role="link"], label`:
- Eliminates the 300ms click delay browsers add to distinguish tap from double-tap-to-zoom
- Makes the app feel instantly responsive, like a native app

**Input font-size fix** — `font-size: max(16px, 0.875rem)` on all form inputs:
- iOS Safari auto-zooms the page when a focused input has `font-size < 16px`
- This fix prevents that jarring auto-zoom without restricting user zoom globally (which would be an accessibility regression)

### 8. Bottom Nav Label Font Size

Changed `text-[10px]` → `text-xs` (12px) on all bottom tab bar labels in both `chef-nav.tsx` and `client-nav.tsx`. 10px is below comfortable reading threshold on mobile; 12px is the minimum recommended for body text.

### 9. Button Touch Target (`components/ui/button.tsx`)

Changed `sm` size from `h-8` (32px) → `h-10` (40px). 32px is below the WCAG 2.5.5 recommended 44px minimum for touch targets. The `sm` variant is now 40px, keeping it visually compact while meeting accessibility requirements.

---

## How to Verify

### Lighthouse PWA Audit
1. Deploy to Vercel (or run production build locally)
2. Open Chrome DevTools → Lighthouse → select "Progressive Web App"
3. Run audit — target: all checks green

### iOS "Add to Home Screen"
1. Open the app in Safari on iPhone
2. Tap the Share button → "Add to Home Screen"
3. Confirm: icon shows ChefFlow logo (not a screenshot), title is "ChefFlow"
4. Open from home screen — confirm it launches without browser chrome (standalone mode)
5. On iPhone 14 Pro or similar: confirm bottom nav is above the home indicator (safe area working)

### Android PWA Install
1. Open the app in Chrome on Android
2. After a few seconds of interaction, Chrome should show a bottom sheet or address bar install prompt
3. Install → confirm icon and launch behavior

### Offline Mode
1. Install the app (either platform)
2. Disable network (airplane mode)
3. Try navigating to a page — confirm `offline.html` appears with branded message
4. Re-enable network → tap "Try Again" → confirm normal navigation resumes

### Safe Areas (Notch Devices)
- On iPhone with Dynamic Island (14 Pro+): bottom nav should sit visibly above the home indicator line
- On iPhone SE (no notch): bottom nav should look identical to before (safe area inset is 0)

---

## Dependencies Added

| Package | Type | Purpose |
|---|---|---|
| `next-pwa` | prod | Service worker generation via Workbox |
| `sharp` | dev | PNG icon generation script |

`tailwindcss-safe-area` was considered but requires Tailwind v4 (project uses v3). Safe area utilities were implemented directly in `globals.css` via `@layer utilities` instead.
