# Stay Signed In Feature

## What Changed

Added a "Stay signed in" checkbox to the sign-in page, allowing users to choose whether their session persists after closing the browser.

### Files Modified

1. **lib/auth/actions.ts** — Extended `SignInSchema` with an optional `rememberMe` boolean (defaults to `true`). After successful sign-in, when `rememberMe` is `false`, a `chefflow-session-only` marker cookie is set as a session cookie (no `maxAge`). When `true`, the marker is cleared if it existed from a prior session.

2. **app/auth/signin/page.tsx** — Added a checkbox input below the password field, defaulting to checked. Wired to `formData.rememberMe` and passed through to the `signIn` server action.

3. **middleware.ts** — Reads the `chefflow-session-only` cookie on each request. When present, strips `maxAge` from all Supabase auth cookies during the `setAll` callback, converting them to session cookies that are cleared when the browser closes.

## How It Works

| User choice | Behavior |
|---|---|
| **Stay signed in** (checked, default) | Standard Supabase cookie behavior — persistent `maxAge`, session survives browser restarts |
| **Don't stay signed in** (unchecked) | `chefflow-session-only=1` marker cookie set as session cookie. Middleware strips `maxAge` from Supabase auth cookies on every refresh. All cookies expire when the browser closes. |

### Why a marker cookie?

Supabase's `signInWithPassword` sets auth cookies internally with `maxAge` before we get control. We can't intercept that first write. Instead:

1. The marker cookie signals intent on the very next request
2. Middleware runs on every navigation, refreshing the session and resetting cookies
3. On that first middleware pass, cookies are rewritten WITHOUT `maxAge`
4. From that point forward, all auth cookies are session-scoped

The marker itself is a session cookie, so when the browser closes, both the marker and the auth cookies are cleared together.

## Connection to System

- **No schema changes** — purely a UI + server action + middleware concern
- **No security impact** — the session token security (HttpOnly, Secure, SameSite) is unchanged; only persistence duration is affected
- **Role-based routing unaffected** — middleware still performs the same role checks regardless of session type
- **Default is "stay signed in"** — matches user expectations for a business tool; the option exists for shared/public computers
