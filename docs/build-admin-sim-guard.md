# Admin Guard — Simulation Lab

## What Changed

Added `requireAdmin()` to `lib/auth/get-user.ts` and wired it into every simulation entry point.

## Why

`/dev/simulate` was previously guarded only by `requireChef()` — meaning any chef account on the platform could access the simulation lab, trigger Ollama runs, and read internal quality metrics. This is a developer/admin tool and must be restricted to the platform owner.

## How It Works

```
ADMIN_EMAILS=davidferra13@gmail.com   ← in .env.local
```

`requireAdmin()` builds on top of `requireChef()`:

1. Calls `requireChef()` — must be authenticated, have chef role, and not be suspended
2. Checks `user.email` against the comma-separated `ADMIN_EMAILS` env var (case-insensitive)
3. Throws `"Unauthorized: Admin access required"` if not in the list → Next.js error boundary redirects to sign-in

## Files Modified

| File                                   | Change                                        |
| -------------------------------------- | --------------------------------------------- |
| `lib/auth/get-user.ts`                 | Added `requireAdmin()` export                 |
| `app/(chef)/dev/simulate/page.tsx`     | `requireChef` → `requireAdmin`                |
| `lib/simulation/simulation-actions.ts` | All 5 actions: `requireChef` → `requireAdmin` |

## To Add More Admins

Edit `.env.local`:

```
ADMIN_EMAILS=davidferra13@gmail.com,another@email.com
```

Restart the dev server. No code change needed.

## Access Path

Navigate to `/dev/simulate` while signed in as `davidferra13@gmail.com`. Any other account hitting that URL gets a thrown error (Next.js handles the redirect).
