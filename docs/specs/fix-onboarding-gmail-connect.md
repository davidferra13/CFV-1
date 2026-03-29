# Spec: Fix Onboarding Gmail Connect Button

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (3 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)
> **SPEC IS BUILT**

---

## What This Does (Plain English)

The "Connect Gmail" button on onboarding step 5 ("Import leads automatically") currently fails silently. After clicking, the button shows "Redirecting to Google..." but the OAuth flow never completes successfully. This spec fixes the button so it either completes the Google OAuth flow or shows a clear, actionable error message explaining what went wrong.

---

## Why It Matters

New chefs hitting a dead button during onboarding lose trust in the product immediately. Gmail auto-import is a core value prop. A broken connect flow during first-run means chefs skip it and never come back to set it up.

---

## Files to Create

None.

---

## Files to Modify

| File                                                            | What to Change                                                                                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/auth/google/connect/route.ts`                          | Fix silent error swallowing in catch block (line 74). Redirect back to `returnTo` with error message instead of dumping user at `/auth/signin`. |
| `components/onboarding/onboarding-steps/connect-gmail-step.tsx` | Add redirect timeout recovery. Make error display more prominent.                                                                               |
| `components/onboarding/onboarding-wizard.tsx`                   | Pass `gmailAlreadyConnected` prop by checking existing connection status on mount.                                                              |

---

## Database Changes

None.

---

## Root Cause Analysis

The code logic across all files is structurally correct. There are **three compounding issues** that make the button fail or appear to fail:

### Issue 1: Silent error swallowing in the connect route

`app/api/auth/google/connect/route.ts` line 74-76:

```ts
// CURRENT: catch-all silently redirects to signin page
} catch {
  return NextResponse.redirect(new URL('/auth/signin', redirectBase))
}
```

If `requireChef()` throws, or any other error occurs, the user lands on the sign-in page with zero explanation. Since they're already signed in, this is confusing. The error is never surfaced.

**Fix:** Redirect back to the `returnTo` URL (or `/onboarding`) with an `error` query param, using the existing `buildGoogleConnectResultPath` helper. Log the error server-side for debugging.

```ts
} catch (err) {
  console.error('[Google OAuth] Connect initiation failed:', err)
  return NextResponse.redirect(
    new URL(
      buildGoogleConnectResultPath({
        returnTo,
        key: 'error',
        value: err instanceof Error ? err.message : 'Failed to start Google connection',
      }),
      redirectBase
    )
  )
}
```

### Issue 2: No timeout recovery on the button

`connect-gmail-step.tsx` sets `loading = true` and calls `window.location.assign()`. If the redirect fails for any reason (network, CORS, JS error after setState), the button stays stuck on "Redirecting to Google..." forever with no way to retry.

**Fix:** Add a `useEffect` that resets `loading` to `false` with an error message after 10 seconds.

```ts
useEffect(() => {
  if (!loading) return
  const timeout = setTimeout(() => {
    setLoading(false)
    setError(
      'Could not redirect to Google. Please try again, or skip and connect later from Settings.'
    )
  }, 10_000)
  return () => clearTimeout(timeout)
}, [loading])
```

### Issue 3: `gmailAlreadyConnected` is never passed

The wizard renders `ConnectGmailStep` without checking existing Gmail connection status:

```tsx
// CURRENT (onboarding-wizard.tsx line 481-486)
<ConnectGmailStep onComplete={handleComplete} onSkip={handleSkip} oauthError={gmailOAuthError} />
// gmailAlreadyConnected is never passed - always defaults to false
```

The `ConnectGmailStep` component supports a `gmailAlreadyConnected` prop that shows a "Gmail is connected" state with a Continue button. But the wizard never checks. If a chef connected Gmail from Settings before reaching this onboarding step, they'd be asked to connect again.

**Fix:** Add a new state variable and a non-blocking loader in the wizard. The call must NOT block rendering or delay the step. If it fails, default to `false` (show the connect button).

In `onboarding-wizard.tsx`:

```tsx
// New state (add near existing useState declarations)
const [gmailConnected, setGmailConnected] = useState(false)

// New loader (add inside the existing useEffect that calls loadProgress, or as a separate useEffect)
async function checkGmailStatus() {
  try {
    const status = await getGoogleConnection()
    setGmailConnected(status.gmail.connected)
  } catch {
    // Non-blocking: default to false, user can still connect manually
  }
}

// Call on mount alongside loadProgress() and loadExistingData()
useEffect(() => {
  loadProgress()
  loadExistingData()
  checkGmailStatus()
}, [])

// Pass the prop when rendering the step (line ~481-486)
<ConnectGmailStep
  onComplete={handleComplete}
  onSkip={handleSkip}
  oauthError={gmailOAuthError}
  gmailAlreadyConnected={gmailConnected}
/>
```

Import needed: `import { getGoogleConnection } from '@/lib/google/auth'`

### Issue 4: Missing `type="button"` on connect button

The skip button has `type="button"` but the connect button doesn't. Add `type="button"` to prevent accidental form submission if the component is ever nested in a form.

---

## Additional Hardening

### Error display prominence

The current error display is a small `<p className="text-sm text-red-500">`. During onboarding, errors need to be unmissable.

**Fix:** Replace the error `<p>` tag on line 114 of `connect-gmail-step.tsx` with a styled error banner matching the existing privacy note pattern (but red):

```tsx
{
  error && (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
      {error}
    </div>
  )
}
```

### Origin resolution: no code change needed

`resolveGoogleConnectOrigin()` in `lib/google/connect-server.ts` builds the callback URL using `request.nextUrl.origin`. This has been verified against both environments:

- **Production mode** (Cloudflare Tunnel): uses `NEXT_PUBLIC_SITE_URL=https://app.cheflowhq.com` as the origin. Correct.
- **Dev mode** (localhost): uses `request.nextUrl.origin` which resolves to `http://localhost:3100`. Correct.

No code change required. The builder should NOT modify `resolveGoogleConnectOrigin` or `connect-server.ts`.

---

## Edge Cases and Error Handling

| Scenario                                | Correct Behavior                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID` not set              | Redirect to `/onboarding?error=Google integration is not configured` (already handled)  |
| `requireChef()` throws in connect route | Redirect to `/onboarding?error=...` (FIX: currently redirects to `/auth/signin`)        |
| Google shows redirect_uri_mismatch      | Callback route returns error message mentioning Settings page for URI (already handled) |
| User denies Google consent              | Callback returns "Google authorization was denied" (already handled)                    |
| User already connected Gmail            | Show "Gmail is connected" + Continue button (FIX: prop not passed)                      |
| Redirect hangs or never completes       | After 10s, reset button to clickable with error message (FIX: no timeout currently)     |
| CSRF validation fails on callback       | Error shown: "CSRF validation failed" (already handled)                                 |
| Token exchange fails                    | Error shown with specific Google error message (already handled)                        |

---

## Verification Steps

1. Ensure dev server is running on port 3100
2. Sign in with agent account
3. Navigate to `/onboarding` and advance to step 5 (Connect Gmail)
4. **Test 1 - Happy path:** Click "Connect Gmail". Verify the browser navigates to the Google consent screen (you should see `accounts.google.com` in the URL bar). If Google shows a consent screen, approve it. Verify redirect back to `/onboarding` with step marked complete. If Google shows an error (redirect_uri_mismatch), screenshot it and report to the developer (Google Cloud Console config is out of scope).
5. **Test 2 - Error banner styling:** Verify the error display element uses the red banner styling (rounded border, bg-red-50/bg-red-950, etc.), not a plain `<p>` tag. Inspect the DOM or trigger an error by navigating to `/onboarding?error=Test+error+message` and confirming the banner renders correctly.
6. **Test 3 - Timeout recovery (code review only):** Verify the timeout `useEffect` exists, cleans up on unmount, resets `loading` to `false`, and sets an error message. Do NOT modify env vars or restart the server to test this.
7. **Test 4 - Already connected state:** Check if Gmail is already connected (navigate to `/settings` and look at Google integrations). If connected, navigate to step 5 in onboarding. Verify it shows "Gmail is connected" with a Continue button instead of the Connect Gmail button. If Gmail is NOT connected, verify the `gmailAlreadyConnected` prop is being passed (inspect the component render).
8. **Test 5 - Type check:** Run `npx tsc --noEmit --skipLibCheck` and confirm zero errors.
9. Screenshot each visible state.

---

## Out of Scope

- Google Calendar connection (separate step, separate flow)
- Gmail sync logic (works independently once connected)
- Google Cloud Console configuration (developer responsibility, not code)
- Onboarding step ordering or skip logic (unrelated)

---

## Notes for Builder Agent

- `getGoogleConnection()` is a `'use server'` function in `lib/google/auth.ts`. Client components can import and call server actions directly. It returns `{ gmail: { connected: boolean, ... }, calendar: { ... } }`.
- `buildGoogleConnectResultPath` is already imported in `route.ts` (line 10-12). Use it in the catch block. Both `returnTo` and `redirectBase` are declared before the `try` block, so they're in scope in `catch`.
- Do NOT touch the callback route (`app/api/auth/google/connect/callback/route.ts`). Its error handling is already comprehensive.
- Do NOT touch `lib/google/connect-server.ts` or `lib/google/connect-shared.ts`. Origin resolution is correct.
- The connect-gmail-step component already has the `gmailAlreadyConnected` branch (lines 42-61) and error display (line 114). You're wiring up existing code, not building from scratch.
- The error banner style must match the privacy note pattern (line 109-112 of connect-gmail-step) but in red instead of blue.
- Add `type="button"` to the connect button (line 117). The skip button already has it (line 124).
- The `checkGmailStatus()` call in the wizard is fire-and-forget. Do NOT `await` it in the useEffect. Do NOT block step rendering on it. If it fails, the user just sees the normal connect button.
- Run `npx tsc --noEmit --skipLibCheck` after changes to confirm zero type errors.
