# Fix: "Stay Signed In" Not Surviving Browser Restart

**Date:** 2026-02-20
**Branch:** `fix/grade-improvements`
**File changed:** `middleware.ts`

---

## The Problem

The "Stay signed in" checkbox on the login page had no effect. Users would sign in with the box checked, close the browser, and come back to find themselves logged out — every time.

---

## How "Stay Signed In" Works (Architecture)

The feature uses a two-part design:

1. **Sign-in action** (`lib/auth/actions.ts`): When `rememberMe = false`, a `chefflow-session-only=1` cookie is set. When `rememberMe = true`, that cookie is deleted.

2. **Middleware** (`middleware.ts`): On every request, if `chefflow-session-only` is present, `maxAge` is stripped from all Supabase auth cookies before they're sent to the browser — making them session-only. When the cookie is absent (`rememberMe = true`), Supabase's default 400-day `maxAge` passes through unchanged.

This design is correct. The bug was not in the architecture — it was in how cookies are forwarded during redirects.

---

## Root Cause

The `redirectWithCookies` helper in `middleware.ts` is responsible for copying session cookies from the middleware response onto redirect responses. This ensures that when a token refresh happens on a request that also redirects, the refreshed cookies are not lost.

**The broken implementation:**

```ts
function redirectWithCookies(url: URL, sourceResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value) // ← drops ALL options
  })
  return redirectResponse
}
```

`response.cookies.getAll()` returns full `ResponseCookie` objects that include `maxAge`, `httpOnly`, `secure`, `sameSite`, and `path`. By only passing `name` and `value` to `.set()`, all those options were silently discarded.

---

## The Failure Chain

1. User signs in with "Stay signed in" checked → `@supabase/ssr` sets auth cookies with `maxAge: 34560000` (400 days). ✓
2. User closes the browser, comes back after ~1 hour
3. Access token is now expired (1-hour JWT lifetime). The middleware's `getUser()` call automatically refreshes it using the refresh token
4. The freshly-refreshed cookies are placed on `response` with proper 400-day `maxAge`
5. The user navigated to `/` — so the middleware redirects them to `/dashboard` via `redirectWithCookies`
6. **`redirectWithCookies` copies the refreshed cookies but strips `maxAge`**
7. The browser receives those cookies as session-only (no expiry date)
8. User closes browser → session-only cookies are cleared → logged out

This triggered **every time** a user opened the app after a >1 hour gap and navigated to the domain root — which is the most common way anyone opens a web app. From the user's perspective, "Stay signed in" never worked.

---

## The Fix

**One line change** to destructure and spread the full cookie options:

```ts
// Before
sourceResponse.cookies.getAll().forEach((cookie) => {
  redirectResponse.cookies.set(cookie.name, cookie.value)
})

// After
sourceResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
  redirectResponse.cookies.set(name, value, options)
})
```

Now `maxAge`, `httpOnly`, `secure`, `sameSite`, and `path` are all preserved on redirect responses.

---

## Why This Is Safe for Session-Only Mode

When `rememberMe = false` (session-only), the middleware's `setAll()` callback already sets `maxAge: undefined` on the cookies it puts onto `response`. When `redirectWithCookies` spreads those cookies, `options.maxAge` is `undefined` — so the redirect response cookies also carry no `maxAge`. Session-only behavior is fully preserved.

---

## Verification

**Persistent session (rememberMe = true):**

1. Sign in with "Stay signed in" checked
2. Close the browser completely
3. Reopen and navigate to the app
4. Should still be logged in (no redirect to `/auth/signin`)

**Session-only (rememberMe = false):**

1. Sign in with "Stay signed in" unchecked
2. Close the browser
3. Reopen and navigate to the app
4. Should be redirected to `/auth/signin` (session expired as expected)
