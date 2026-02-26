# Performance: Navigation Speed Optimizations

**Date:** 2026-02-19
**Branch:** feature/packing-list-system
**Motivation:** Tab-to-tab navigation was taking ~2 seconds. Goal: cut that to ~0.5–1s without touching any business logic, financial code, or database schema.

---

## Root Cause Analysis

Every tab click triggered three sequential blocking operations before any pixel appeared on screen:

| Step           | What happened                                                                             | Cost        |
| -------------- | ----------------------------------------------------------------------------------------- | ----------- |
| **Middleware** | `supabase.auth.getUser()` + `user_roles` DB query on every navigation                     | 300–500 ms  |
| **Layout**     | `getChefSlug()` + `getChefPrimaryNavHrefs()` — two more DB queries before sidebar renders | 200–400 ms  |
| **Page data**  | Page-specific server queries (dashboard: 27 parallel queries)                             | 200–1000 ms |

The `loading.tsx` skeleton only appears _after_ the layout finishes — so during steps 1 and 2 the screen was completely blank. Step 3 already had the skeleton visible, so it felt faster even when it wasn't.

**Total blank-screen time: 500–900 ms before any UI appeared.**

---

## What Was Changed

### Fix 1 — Middleware Role Cache (`middleware.ts`)

**What:** After the first `user_roles` DB lookup, we write the result into an `httpOnly` cookie (`chefflow-role-cache`) with a 5-minute TTL. On every subsequent navigation, if the cookie is present, we skip the DB query entirely.

**How it works:**

- Cookie is set after the first DB lookup for a session
- Cookie mirrors the `sessionOnly` flag: no `maxAge` if the user unchecked "Stay signed in"
- `getUser()` still runs every time (auth token verification — cannot be skipped)
- The layout's `requireChef()` / `requireClient()` server checks remain unchanged and still run on every request as the authoritative security gate

**Security posture:** Unchanged. The cookie only avoids the _routing_ DB check in middleware. If someone tampered with the cookie, the worst outcome is being shown the wrong redirect path for up to 5 minutes — they still cannot access any data because every server action runs `requireChef()` / `requireClient()` independently.

**Expected savings:** 100–200 ms per navigation (the `user_roles` query round-trip).

---

### Fix 2 — Layout Data Cache (`lib/chef/layout-cache.ts`)

**What:** Created `getChefLayoutData(chefId)`, which wraps two DB queries in Next.js `unstable_cache()`:

- `chefs` table → `slug`, `tagline`, `portal_primary_color`, `portal_background_color`, `portal_background_image_url`
- `chef_preferences` table → `primary_nav_hrefs`

**Cache behaviour:**

- Keyed per chef (`chef-layout-{chefId}`) — one tenant's cache never touches another's
- TTL: 60 seconds — self-healing, no manual invalidation required
- Tag: `chef-layout-{chefId}` — can be flushed with `revalidateTag()` if needed in the future
- Uses the admin client (service role key) because `unstable_cache()` runs outside request context and cannot access per-request cookies

**Layout change (`app/(chef)/layout.tsx`):** Replaced the two separate `getChefSlug()` + `getChefPrimaryNavHrefs()` awaits with a single `getChefLayoutData(user.entityId)` call. The returned object has the same shape that the rest of the layout already expected.

**Expected savings:** 200–400 ms per navigation (two DB queries reduced to ~0 ms from in-process cache after first load).

---

### Fix 3 — Per-Route Loading Skeletons

**What:** Added `loading.tsx` files to the four most-visited route segments:

| File                               | Matches                           |
| ---------------------------------- | --------------------------------- |
| `app/(chef)/dashboard/loading.tsx` | Dashboard command centre          |
| `app/(chef)/events/loading.tsx`    | Events list + filter tabs         |
| `app/(chef)/clients/loading.tsx`   | Client list with avatars          |
| `app/(chef)/inquiries/loading.tsx` | Inquiry pipeline with stage stats |

**Why, given the group-level `(chef)/loading.tsx` already exists:**
The group-level skeleton is generic (4 cards + a list). Per-route skeletons match the real page layout more closely — the correct number of columns, table rows, and widgets — so the visual snap-in on data load is less jarring. They also guarantee each route has its own Suspense boundary rather than sharing the group fallback.

**Expected improvement:** Purely perceptual — data loads in the same amount of time, but the accurate skeleton makes it feel instantaneous.

---

## Files Changed

| File                               | Change                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `middleware.ts`                    | Role cache cookie logic (read before DB, write after DB)                   |
| `lib/chef/layout-cache.ts`         | **New.** `unstable_cache` wrapper for layout data                          |
| `app/(chef)/layout.tsx`            | Replaced `getChefSlug` + `getChefPrimaryNavHrefs` with `getChefLayoutData` |
| `app/(chef)/dashboard/loading.tsx` | **New.** Dashboard skeleton                                                |
| `app/(chef)/events/loading.tsx`    | **New.** Events list skeleton                                              |
| `app/(chef)/clients/loading.tsx`   | **New.** Clients list skeleton                                             |
| `app/(chef)/inquiries/loading.tsx` | **New.** Inquiries pipeline skeleton                                       |

---

## What Was Not Changed

- No database migrations
- No business logic or server actions
- No financial / ledger code
- No auth flow (tokens, sessions, sign-in/sign-out)
- No FSM transitions
- No client-facing pages

---

## Expected Total Improvement

| Before                        | After                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| ~2 s blank screen + data load | ~0.5–1 s (skeleton appears almost immediately, data follows) |

The main gain comes from eliminating the blank screen window. Once the sidebar renders, users have orientation — and the skeleton shows while page data loads.

---

## Future Options (Not Implemented)

If further speed is needed:

1. **Add `revalidateTag('chef-layout-{chefId}')` to profile/preference mutation actions** — makes slug and nav changes reflect instantly instead of waiting up to 60 s.
2. **Upgrade to Next.js 15** — enables React 19 streaming by default and the new `use()` API for async props, which would let the layout render the sidebar shell immediately while slug/nav data streams in.
3. **Supabase connection pooler** — switch the DB connection string to the pooler URL (`*.pooler.supabase.com`) to reduce per-query connection overhead.
4. **Per-widget Suspense on Dashboard** — wrap each of the 27 dashboard queries in its own `<Suspense>` so widgets pop in as they resolve rather than waiting for the slowest one.
