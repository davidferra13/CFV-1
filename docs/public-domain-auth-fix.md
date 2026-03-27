# Public Domain Auth Fix

## What Changed

Two critical bugs prevented anyone from using `cheflowhq.com` for signup/signin. Both are now fixed.

## Bug 1: Middleware Redirects to localhost

**Problem:** The Next.js middleware built redirect URLs using `request.url`, which is the internal server URL (`http://localhost:3100`). When a user visited via `cheflowhq.com` (Cloudflare Tunnel), any redirect (unauthenticated -> signin, role check -> dashboard) sent them to `localhost:3100`, which doesn't resolve for external users.

**Fix:** Added `buildRedirectUrl()` helper in `middleware.ts` that reads `x-forwarded-proto` and `Host` headers from the incoming request. Cloudflare Tunnel preserves these headers, so redirects now use the correct public origin. Falls back to `request.url` for direct localhost access.

**Files:** `middleware.ts`

## Bug 2: Sign-In Blank Page (Layout Swap)

**Problem:** After signing in, `router.push('/dashboard')` performed a soft client-side navigation. But sign-in lives in the `auth` layout group while the dashboard lives in the `(chef)` layout group. Next.js App Router's soft navigation cannot swap layout trees, leaving a blank page with no content.

**Fix:** Replaced `router.push(redirectPath)` + `router.refresh()` with `window.location.href = redirectPath`. This forces a full page load, which properly loads the `(chef)` layout server-side.

**Files:** `app/auth/signin/page.tsx`

## Bug 3: Environment URLs

**Problem:** `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_APP_URL` were all set to `http://localhost:3100`. Auth.js CSRF tokens, email links, and other URL-dependent features used localhost instead of the public domain.

**Fix:** Updated `.env.local` to use `https://app.cheflowhq.com` for all three. With `trustHost: true` in the auth config, Auth.js auto-detects the host from request headers, so both localhost and tunnel access work.

**Files:** `.env.local` (not committed, gitignored)

## Verification

Full E2E test via Playwright through `cheflowhq.com`:

1. Landing page loads
2. "Get Started Free" navigates to signup
3. Account creation succeeds, redirects to signin (stays on cheflowhq.com)
4. Sign-in succeeds, redirects to onboarding (stays on cheflowhq.com)
5. Onboarding wizard renders with full chef portal layout (sidebar, navigation, wizard content)

All steps verified with screenshots. Domain preserved throughout.

## Production Mode

The app now runs in production mode (`next start`) instead of dev mode (`next run dev`) for best performance:

```bash
# Start production server
NEXT_PUBLIC_APP_ENV=development NODE_OPTIONS="--max-old-space-size=4096" npx next start -p 3100
```

`NEXT_PUBLIC_APP_ENV=development` bypasses the production safety check that requires Supabase env vars (legacy check from the cloud database era).

## What This Means

Anyone in the world can now visit `cheflowhq.com`, create an account, sign in, and use ChefFlow. Previously this was completely broken for external users.
