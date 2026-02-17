# Corrupted `.next` Cache Fix

**Date:** 2026-02-17
**Issue:** All pages rendering as black/empty screens
**Root Cause:** Corrupted `.next` build cache

## What Happened

The `.next/server/webpack-runtime.js` was referencing stale chunk files (e.g., `./1682.js`) that no longer existed on disk. This caused a `Cannot find module` error on every server-side render, resulting in a 500 error for all page requests.

The browser received error pages with no CSS, which appeared as black/empty screens.

## Diagnosis Steps

1. Verified `globals.css`, `tailwind.config.ts`, and `postcss.config.js` — all correct
2. Verified route group layouts (`(chef)`, `(client)`, `(public)`) — all correct
3. Ran `next build` — succeeded with no errors, confirming source code is fine
4. Curled the running dev server — found the 500 error with `Cannot find module './1682.js'` in the JSON error payload

## Fix

```bash
# Kill the running dev server
npx kill-port 3100

# Delete the corrupted cache
rm -rf .next

# Restart fresh
npm run dev
```

## Prevention

This typically happens when:
- Files are moved/renamed while the dev server is running
- `node_modules` are updated without restarting the dev server
- Git operations (checkout, rebase) change significant files mid-session

When in doubt, `rm -rf .next` and restart the dev server. It rebuilds in seconds.
