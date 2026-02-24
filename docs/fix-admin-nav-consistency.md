# Fix: Admin Account Navigation Consistency

**Date:** 2026-02-24
**Branch:** feature/risk-gap-closure

## Problem

The developer's admin account (`davidferra13@gmail.com`) was not seeing the full navigation on localhost, beta, or any environment. Two separate bugs caused this:

### Bug 1: Module filtering applied to admins

The sidebar and mobile nav filtered nav groups based on `enabledModules` from `chef_preferences`. If the admin hadn't explicitly toggled on every module (e.g., "Protection", "More Tools"), those groups were hidden — even though admins should have unrestricted access to everything.

**Files:** `components/navigation/chef-nav.tsx` (both `ChefSidebar` and `ChefMobileNav`)

**Fix:** When `isAdmin` is true, skip module filtering entirely — show all `navGroups`.

### Bug 2: `isAdmin()` called with wrong signature

Two pages called `isAdmin(user.email)`, but `isAdmin()` takes **no parameters** — it reads the current user from the Supabase session internally. Passing an argument didn't cause a runtime error (TypeScript allows extra args in JS), but the function ignored the argument and worked normally in some contexts while silently failing in others due to how the return value was used.

**Files:**

- `app/(chef)/settings/page.tsx` line 456 — `isAdmin(user.email)` used directly in JSX (not awaited, so the Promise was always truthy... but unreliable)
- `app/(chef)/settings/incidents/page.tsx` line 18 — `!isAdmin(user.email)` used as a guard (same issue — Promise negation is always false, so the redirect never fired, but for the wrong reasons)

**Fix:** Both pages now properly `await isAdmin()` and use the boolean result.

## What Changed

| File                                     | Change                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `components/navigation/chef-nav.tsx`     | Admin bypass in both `ChefSidebar` and `ChefMobileNav` module filtering |
| `app/(chef)/settings/page.tsx`           | Added `isAdmin()` to parallel Promise.all, use `userIsAdmin` variable   |
| `app/(chef)/settings/incidents/page.tsx` | `await isAdmin()` instead of `isAdmin(user.email)`                      |

## Environment Consistency

`ADMIN_EMAILS=davidferra13@gmail.com,agent@chefflow.test` is set in:

- `.env.local` (localhost dev)
- `.env.local.beta` (Raspberry Pi beta)

Both environments will now show the identical full navigation for the admin account. Vercel production uses the same env var pattern.

## How It Works Now

1. **Layout** (`app/(chef)/layout.tsx`) resolves `isAdmin()` once per page load
2. **Passes `isAdmin` boolean** to `ChefSidebar` and `ChefMobileNav`
3. **If admin:** all nav groups shown, no module filtering
4. **If not admin:** module filtering applies as before (progressive disclosure)
5. **Settings page:** admin-only sections (System Incidents) correctly gated
6. **Incidents page:** properly redirects non-admins

The admin experience is now identical across localhost:3100, beta.cheflowhq.com, and app.cheflowhq.com.
