# Fix: Google Connect Buttons (Gmail + Calendar)

## Date: 2026-02-22

## Problem

The "Connect Gmail" and "Connect Google Calendar" buttons on the Settings page were non-functional. Clicking them appeared to do nothing.

## Root Causes Found & Fixed

### 1. ServiceCard loading state never reset on error

**File:** `components/settings/google-integrations.tsx`

The `handleConnect` in `ServiceCard` called `setLoading(true)` then `await onConnect()` with no try/catch/finally. If the server action threw (network error, missing env var, auth failure), the button became permanently disabled with no error feedback.

**Fix:** Wrapped in try/catch/finally so loading always resets.

### 2. Callback handler overwrote the other service's connected flag

**File:** `app/api/auth/google/connect/callback/route.ts`

The upsert blindly wrote `gmail_connected` and `calendar_connected` from the current OAuth scope grant. Connecting Calendar would set `gmail_connected = false`, disconnecting Gmail (and vice versa).

**Fix:** Now reads the existing `google_connections` row first and merges flags — `gmail_connected = newGmail || existingGmail`.

### 3. Refresh token lost on second service connect

**Same file as #2**

Google only returns a `refresh_token` on the first consent grant. When connecting the second service, the upsert would overwrite `refresh_token` with `null`, breaking token refresh for both services.

**Fix:** `refreshToken = tokens.refresh_token || existing?.refresh_token || null`

### 4. No user feedback after OAuth redirect

**File:** `components/settings/google-integrations.tsx`

The callback redirected to `/settings?connected=gmail` or `/settings?error=...`, but the settings page never read those query params. The user completed OAuth, got sent back, and saw zero feedback.

**Fix:** Added `useSearchParams()` + `useEffect` that shows a toast on return and cleans the URL.

### 5. Missing email/profile scopes

**File:** `lib/google/auth.ts`

Calendar-only connects sent only `calendar.events` + `calendar.readonly` scopes. The callback handler calls the Google userinfo endpoint to get the connected email, which requires `userinfo.email` scope. Without it, the email was stored as `'unknown'`.

**Fix:** `initiateGoogleConnect` now always includes `userinfo.email` and `userinfo.profile` scopes.

### 6. CSRF cookie cleanup

**File:** `app/api/auth/google/connect/callback/route.ts`

The old code called `cookieStore.delete()` which doesn't work reliably in Next.js route handlers. Changed to `response.cookies.delete()` on the redirect response.

## Files Changed

| File                                            | Change                                                  |
| ----------------------------------------------- | ------------------------------------------------------- |
| `components/settings/google-integrations.tsx`   | Loading state fix, toast feedback on OAuth return       |
| `app/api/auth/google/connect/callback/route.ts` | Merge flags, preserve refresh token, fix cookie cleanup |
| `lib/google/auth.ts`                            | Always include email+profile scopes                     |

## Testing

1. Go to Settings → Connected Accounts
2. Click "Connect Gmail" → should redirect to Google OAuth
3. Complete OAuth → should return to Settings with a success toast
4. Click "Connect Google Calendar" → same flow, Gmail should stay connected
5. Both services should show "Connected" with the correct email
