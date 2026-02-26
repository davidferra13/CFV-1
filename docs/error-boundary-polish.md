# Error Boundary Polish

## What Changed

Three scoped `error.tsx` files added to the Next.js route groups:

- `app/(chef)/error.tsx` — Chef portal error boundary
- `app/(client)/error.tsx` — Client portal error boundary
- `app/(public)/error.tsx` — Public pages error boundary

---

## Why This Was a Gap

Next.js has a global `app/error.tsx` which catches all unhandled errors. That file existed and worked. However, Next.js also supports route-group–level error boundaries, which catch errors before they bubble to the global handler.

Without these scoped boundaries:

- A crash in the chef dashboard showed the same generic page as a crash on the public homepage
- There was no way to offer role-specific recovery navigation ("Go to Dashboard" vs "Go to My Events" vs "Go to Homepage")
- Error analytics couldn't distinguish which portal the error came from by error boundary source

---

## What Each File Does

**`app/(chef)/error.tsx`**

- Shows "An error occurred in your chef dashboard."
- Recovery: Try Again + Go to Dashboard (`/dashboard`)
- Logs with tag `[Chef Portal Error]`

**`app/(client)/error.tsx`**

- Shows "An error occurred. Your data is safe."
- Recovery: Try Again + Go to My Events (`/my-events`)
- Logs with tag `[Client Portal Error]`

**`app/(public)/error.tsx`**

- Shows minimal message — visitor may not be logged in
- Does NOT expose the error.message (could expose internal details to the public)
- Shows only Error ID if digest is available
- Recovery: Try Again + Go to Homepage (`/`)
- Logs with tag `[Public Error]`

---

## How Next.js Error Boundaries Work

In the Next.js App Router, `error.tsx` files must be Client Components (`'use client'`). They receive:

- `error`: the Error object (includes optional `digest` for tracing)
- `reset`: a function that attempts to re-render the route segment

The boundary catches errors in the **component tree below the layout** of the same route group. It does not catch errors in the layout itself (those still bubble up to the parent's error boundary or the global one).

---

## Existing Architecture (Unchanged)

The global `app/error.tsx` still exists and acts as the final fallback. The route-group boundaries just intercept errors first and provide better context.

The global `app/not-found.tsx` also exists and handles 404s — unrelated to these error boundaries.
