# Fix: Version Staleness After Deploy

**Date:** 2026-03-21
**Problem:** Deployed updates consistently failed to reflect immediately in browsers, creating a "cat and mouse" experience where the visible app lagged behind actual updates.

## Root Cause

Three compounding caching layers:

1. **Static service worker cache key** - `public/sw.js` used a hardcoded `CACHE_NAME = 'chefflow-runtime-v2026-03-16'` that never changed between deploys. The SW intercepted all `/_next/static/` requests and served stale JS/CSS via stale-while-revalidate indefinitely.

2. **ISR pages cached for 1 hour** - Public pages (`/`, `/pricing`, `/contact`, `/terms`) set `revalidate = 3600`. After deploy, these pages served hour-old HTML until the revalidation window expired.

3. **No post-deploy cache invalidation** - Deploy scripts built and restarted the server but never signaled the SW to purge old caches or inject the new BUILD_ID.

## What Changed

### 1. Build-version API route (`app/api/build-version/route.ts`)

- New endpoint that reads `.next/BUILD_ID` and returns it as JSON
- `force-dynamic` + `no-store` headers ensure it is never cached
- Used by the SW to detect when a new build has landed

### 2. Service worker rewrite (`public/sw.js`)

- Cache name is now dynamic: `chefflow-v-{BUILD_VERSION}`
- `__BUILD_VERSION__` placeholder gets stamped by the deploy script with the actual BUILD_ID
- On activation, deletes ALL caches that don't match the current build (evicts stale assets)
- Polls `/api/build-version` every 5 minutes to detect hot deploys
- When a new version is detected, posts `NEW_VERSION_AVAILABLE` to all client tabs
- API routes (`/api/*`) are excluded from SW caching entirely

### 3. SW registration update (`components/pwa/sw-register.tsx`)

- Listens for `NEW_VERSION_AVAILABLE` messages from the SW
- Auto-reloads the page when a new version is detected
- Cleanup: removes the message listener on unmount

### 4. Deploy script cache stamp (`scripts/deploy-beta.sh`, `scripts/deploy-prod.sh`)

- After build succeeds, reads `BUILD_ID` from `.next-staging/BUILD_ID`
- Uses `sed` to replace `__BUILD_VERSION__` in `public/sw.js` with the actual BUILD_ID
- This happens before the atomic swap, so the new SW file is live immediately after restart

### 5. ISR revalidation lowered (`app/(public)/*.tsx`)

- Changed from `revalidate = 3600` (1 hour) to `revalidate = 60` (1 minute) on:
  - `/` (landing page)
  - `/pricing`
  - `/contact`
  - `/terms`
- Still efficient (only regenerates once per minute at most) but eliminates the hour-long staleness window

## How It Works End-to-End

```
1. Developer runs `bash scripts/deploy-beta.sh`
2. Build produces new BUILD_ID (git SHA)
3. Deploy script stamps sw.js: __BUILD_VERSION__ -> abc1234
4. Atomic swap + server restart
5. Browser's SW registration checks for sw.js update (updateViaCache: 'none')
6. New sw.js has different content (new BUILD_VERSION) -> browser installs new SW
7. New SW activates, deletes all caches except chefflow-v-abc1234
8. SW calls self.clients.claim() -> takes over all tabs
9. controllerchange fires -> page reloads with fresh assets
10. Additionally: SW polls /api/build-version every 5 min as a safety net
```

## Expected Impact

| Scenario                         | Before                                              | After                                          |
| -------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| Deploy new JS/CSS                | 1-10 min (stale-while-revalidate from old SW cache) | Immediate (old cache evicted on SW activation) |
| Update public pages              | Up to 1 hour (ISR revalidation)                     | Up to 1 minute                                 |
| Hot deploy between user sessions | Indefinite (static cache key never rotated)         | Max 5 min (version polling)                    |
| Hard refresh needed              | Yes (only reliable fix)                             | No (automatic)                                 |
