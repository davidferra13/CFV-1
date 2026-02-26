# Error Boundaries

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

---

## Summary

Next.js error boundaries are implemented via `error.tsx` files placed at the route group level. Each one catches thrown errors within that segment before they propagate to the global handler.

## What Was Already Complete

| File                     | Scope                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| `app/error.tsx`          | Global fallback — catches anything not caught by a route-level handler |
| `app/(chef)/error.tsx`   | Chef portal — links back to `/dashboard`                               |
| `app/(client)/error.tsx` | Authenticated client portal — links back to `/my-events`               |
| `app/(public)/error.tsx` | Public-facing pages                                                    |
| `app/not-found.tsx`      | Global 404 page                                                        |

## What Was Added

| File                       | Why                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(admin)/error.tsx`    | Admin panel was the only route group without an error boundary. Styled with the dark admin theme (slate-900 background) to match the admin UI.                                                                 |
| `app/auth/error.tsx`       | Auth flow (sign-in, sign-up, password reset) has its own layout; an error here should give a clear "back to sign in" path rather than a generic crash screen.                                                  |
| `app/client/error.tsx`     | The new public token-based client portal (`/client/[token]`) is outside all auth route groups. Without this, runtime errors would bubble to the global handler which has no context about magic link sessions. |
| `app/client/not-found.tsx` | When a token is invalid or revoked, the page calls `notFound()`. The global 404 page would show generic "page not found" text — this file shows "link may have expired, ask your chef to send a new one."      |

## Design Pattern

All error boundaries follow the same pattern:

- `'use client'` directive (required by Next.js)
- `useEffect` to log the error (console for now; swap for Sentry/Datadog later without changing component signatures)
- Context-appropriate copy and navigation actions
- Visual styling matches the route group's design system (dark for admin, clean stone for public portal)

## Not Added (Intentional)

Individual route pages (`events/[id]`, `clients/[id]`, etc.) do not have their own `error.tsx` — the route group boundary is the right granularity. More granular boundaries would be appropriate if specific pages need custom recovery flows (e.g., an in-service DOP view that must never crash), but that's premature optimization for now.
