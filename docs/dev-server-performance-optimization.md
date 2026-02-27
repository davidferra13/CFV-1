# Dev Server Performance Optimization

**Date:** 2026-02-26
**Problem:** Localhost dev server (port 3100) was extremely slow — page loads taking several seconds, HMR sluggish.

---

## Root Causes Identified

### 1. Bloated Webpack Cache (1.6 GB)

The `.next-dev/cache/webpack/server-development/` directory had grown to 1.6 GB over time. Webpack reads and writes this cache on every compilation. On Windows, large directories with thousands of small files cause extra filesystem overhead.

**Fix:** Deleted the cache (`rm -rf .next-dev/cache`). It rebuilds itself clean on next start.

### 2. Webpack Dev Server (No Turbopack)

The dev script was using the default webpack compiler. Next.js 14 ships with Turbopack, which is 3-10x faster for hot module reload (HMR) and initial page compilation in development.

**Fix:** Added `--turbo` flag to the dev script in `package.json`:

```
"dev": "next dev -p 3100 -H 0.0.0.0 --turbo"
```

Turbopack is compatible with this project because the Sentry webpack plugins were already disabled (`disableServerWebpackPlugin: true`, `disableClientWebpackPlugin: true`), and there are no custom webpack configurations in `next.config.js`.

### 3. Uncached Layout DB Calls (7-10 round-trips per page)

The chef layout (`app/(chef)/layout.tsx`) runs on every page navigation. Three of the seven `Promise.all` calls had no caching:

- `hasCannabisAccess()` — hit the DB every time
- `getChefArchetype()` — hit the DB every time
- `getAccountDeletionStatus()` — hit the DB every time

Each of these also called `requireChef()` internally (another DB call), resulting in 9-10 Supabase round-trips per page load.

**Fix:** Created `lib/chef/layout-data-cache.ts` with cached wrappers using `unstable_cache` (60-second TTL), matching the pattern already used by `getChefLayoutData()`. Updated the layout to use these cached versions.

The cached functions use the admin client (like `layout-cache.ts`) because `unstable_cache` runs outside the request context and can't access per-request cookies.

### 4. Unused `googleapis` Package (Dead Weight)

The `googleapis` npm package (v171.x) was in `dependencies` but **not imported anywhere** in the codebase. All Google API calls (Gmail, Calendar) use raw `fetch()` to the REST APIs directly. The package was dead weight — webpack still had to process it during module resolution.

**Fix:** Removed `googleapis` from dependencies via `npm uninstall googleapis`.

### 5. Remotion (Assessment Only)

The `remotion` and `@remotion/player` packages are in dependencies. The 10 explainer player components exist in `components/explainers/` but are **not imported by any app pages** — they're referenced only in documentation. Turbopack handles tree-shaking of unused imports much better than webpack, so enabling Turbopack (fix #2) already mitigates this. No code changes needed.

---

## Files Changed

| File                            | Change                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `package.json`                  | Added `--turbo` to dev script, removed `googleapis`                                    |
| `package-lock.json`             | Updated after `googleapis` removal                                                     |
| `app/(chef)/layout.tsx`         | Replaced uncached DB calls with cached wrappers                                        |
| `lib/chef/layout-data-cache.ts` | **New** — cached wrappers for cannabis access, archetype, deletion status, admin check |

---

## Expected Impact

| Optimization       | Impact                                                |
| ------------------ | ----------------------------------------------------- |
| Cache cleared      | Immediate — removes 1.6 GB of stale webpack artifacts |
| Turbopack enabled  | 3-10x faster HMR and page compilation in dev          |
| Layout caching     | ~300ms saved per page navigation (3-4 fewer DB calls) |
| googleapis removed | Faster module resolution, smaller node_modules        |

---

## How to Clear the Cache Again

If the dev server becomes sluggish again in the future:

```bash
rm -rf .next-dev/cache
```

Then restart the dev server. The cache rebuilds itself.
