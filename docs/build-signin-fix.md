# Fix: Sign-In Button Did Nothing

## Problem

Clicking "Sign In" on the sign-in page at `/auth/signin` produced zero response — no loading spinner, no error message, no navigation. The form appeared completely frozen.

## Root Cause

### `strict-dynamic` in Content Security Policy blocked ALL JavaScript (primary cause)

`next.config.js` line 84 had:

```
script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com
```

The comment claimed this was "the recommended pattern," but it was wrong. In CSP Level 3 browsers (all modern browsers), `strict-dynamic` **overrides both `'self'` and `'unsafe-inline'`**. This means scripts can ONLY load via nonce or hash. Next.js 14 does not add nonces to its script tags, so **every JavaScript file was blocked**:

- `webpack.js` — blocked
- `main-app.js` — blocked
- `app/auth/signin/page.js` — blocked
- All inline hydration scripts — blocked

With no JavaScript executing, React never hydrated the page. Event handlers were never attached. Clicking the button did literally nothing.

**Fix:** Removed `'strict-dynamic'`, added `'unsafe-eval'` (required by Next.js dev mode for HMR):

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com
```

### Secondary: `NEXT_REDIRECT` swallowed in role-selection catch block

`app/auth/role-selection/page.tsx` had a `try/catch` that caught _all_ errors from `await assignRole(role)`. The `assignRole` server action calls `redirect()` on success, which in Next.js App Router throws a special `NEXT_REDIRECT` error. Catching it without re-throwing would have left users stuck on the role-selection screen after choosing their role.

**Fix:** Added `if (isRedirectError(err)) throw err` in the catch block.

## Files Changed

### `next.config.js`

- Removed `'strict-dynamic'` from CSP `script-src` directive
- Added `'unsafe-eval'` (needed for Next.js dev mode / HMR / webpack)
- Updated comment explaining why `strict-dynamic` must NOT be used with Next.js 14

### `app/auth/role-selection/page.tsx`

- Added `import { isRedirectError } from 'next/dist/client/components/redirect'`
- Added re-throw guard in the catch block: `if (isRedirectError(err)) throw err`
- Removed stale TODO comment

### `lib/auth/actions.ts` — signOut

- Removed `redirect('/')` from `signOut()` — it threw `NEXT_REDIRECT` which was unhandled when called from `onClick` (not a form action)
- Now returns `{ success: true }` so callers handle navigation client-side
- Also clears the `chefflow-role-cache` cookie on sign-out to prevent stale role data

### `components/navigation/chef-nav.tsx`, `client-nav.tsx`, `admin/admin-sidebar.tsx`

- Changed all sign-out handlers from `onClick={() => signOut()}` to `onClick={async () => { await signOut(); window.location.href = '/' }}`
- Using `window.location.href` (full page reload) instead of `router.push` to ensure all client-side state (Supabase auth, cached data) is fully cleared

## Tertiary: Unstyled page after `.next/` corruption

After the CSP fix, the app appeared completely unstyled — no CSS, no fonts, raw HTML. Investigation with Playwright revealed that **every static asset** (CSS, JS) was returning 404 and being served as `text/html` (the error page). The `.next/` build cache was corrupted from the rapid server restarts during debugging.

**Fix:** Full clean restart:

```bash
# Kill all Node processes
taskkill /F /IM node.exe
# Remove corrupted build cache
rm -rf .next/
# Start fresh
npx next dev
```

After restart, Playwright confirmed:

- CSS: 1 file loaded (200 OK)
- JS: 8 files loaded (200 OK)
- Body background: `rgb(250, 249, 247)` (warm stone — correct)
- Font: Inter loaded and applied
- Submit button: brand orange `rgb(212, 117, 48)` — correct

## Verification

Tested with headless Playwright:

1. Page loads, form renders (3 inputs, 4 buttons, 1 form)
2. Email and password fill correctly
3. Submit button click triggers server action POST
4. Server action reaches Supabase and returns proper error response
5. Error message displays on page ("Invalid email or password" with test credentials)
6. Zero CSP violations in console
7. All CSS and JS assets load with 200 status
8. Computed styles match expected design (Inter font, brand colors, rounded inputs)

## How This Was Diagnosed

1. Initial inspection of auth code, middleware, and layout found no bugs
2. Headless browser test revealed **every JS bundle blocked by CSP**
3. The `strict-dynamic` directive was the culprit — it silently invalidated the `'self'` and `'unsafe-inline'` directives that Next.js depends on
4. After CSP fix, app appeared unstyled — Playwright showed all static assets returning 404 with `text/html` MIME type (corrupted `.next/` cache)
5. Clean `rm -rf .next/` + fresh `npx next dev` resolved the asset serving issue

## Lessons Learned

1. Never add `'strict-dynamic'` to CSP unless the framework generates nonces for every `<script>` tag. Next.js 14 does not. The `strict-dynamic` + `'unsafe-inline'` pattern is a CSP3 "progressive enhancement" intended for frameworks that DO emit nonces — adding it to one that doesn't turns off all JavaScript.
2. When the app looks unstyled, always check if `.next/static/` assets are returning 404. A corrupted `.next/` directory serves HTML error pages for CSS/JS requests. The fix is always `rm -rf .next/` followed by a fresh dev server start.
3. The `signOut()` server action must NOT call `redirect()` when invoked from `onClick` handlers — only from form actions. Client-side navigation via `window.location.href` after `await signOut()` is the correct pattern.
