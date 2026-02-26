# Build Stabilization -- 500.html ENOENT Fix

## Date

2026-02-20

## Problem

The Next.js production build was failing with:

## Root Cause Chain

### Issue 1: PWA plugin fallback document (primary trigger)

@ducanh2912/next-pwa v10 was configured with fallbacks: { document: "/offline.html" }. This triggers a pages-router compilation pass that, on Windows, interfered with the main build RSC Client Manifest. The result was "Could not find the module in the React Client Manifest" errors during static page generation.

### Issue 2: 500.html export skip

When pages/500.tsx was present, Next.js set hasPages500 = true, which disabled the useDefaultStatic500 code path. The custom 500.tsx page HTML was never written to .next/export/500.html by the static export worker. The subsequent rename(.next/export/500.html, .next/server/pages/500.html) then failed with ENOENT.

### Issue 3: Stale .next cache

The original build was reading stale manifest data from a previous partial build in .next.

## Fix Applied

### 1. Removed fallbacks option from PWA config (next.config.js)

The fallbacks: { document: "/offline.html" } option was removed from @ducanh2912/next-pwa configuration. This eliminates the pages-router compilation pass that caused RSC manifest corruption on Windows.

### 2. Disabled PWA plugin during builds (next.config.js)

Set disable: true unconditionally. This routes all build traffic through the standard Next.js App Router webpack pipeline only.

Note: Service worker registration is currently disabled in production. To re-enable, change disable: true back to disable: process.env.NODE_ENV === "development" and test on Windows first.

### 3. Removed pages/500.tsx

With no pages/500.tsx, Next.js uses the useDefaultStatic500 code path, which correctly exports /\_error as /500 HTML. This path reliably produces .next/server/pages/500.html.

The pages/\_app.tsx was retained.

### 4. Cleared .next build cache

Deleted .next/ to ensure a completely fresh build without stale manifest references.

## Files Changed

| File           | Change                                              |
| -------------- | --------------------------------------------------- |
| next.config.js | Removed fallbacks option; set disable: true for PWA |
| pages/500.tsx  | Deleted (was causing 500.html export failure)       |

## Build Result

## Re-enabling PWA

If PWA support needs to be restored:

1. Change disable: true to disable: process.env.NODE_ENV === "development" in next.config.js
2. Do NOT add back fallbacks: { document: "/offline.html" } -- this triggers the dual-pipeline issue
3. Test with npx next build on Windows before deploying
