# Password Reset Flow

## What Changed

Added a complete password reset flow to the ChefFlow V1 authentication system. Users can now request a password reset email from the sign-in page and set a new password via a secure token-based link.

## Files Created

### `app/auth/forgot-password/page.tsx`
Client component with a single email input form. On submit, calls the `requestPasswordReset` server action. Displays a success message after submission regardless of whether the email exists (prevents email enumeration). Includes a "Try Again" button and "Back to Sign In" link. Matches the existing auth page visual style exactly.

### `app/auth/reset-password/page.tsx`
Client component with new password and confirm password inputs. This page is the destination after a user clicks the reset link in their email. By the time the user arrives here, the auth callback route has already exchanged the recovery code for a Supabase session. On submit, calls the `updatePassword` server action. Validates password match and minimum length client-side before submitting. On success, shows a confirmation message and auto-redirects to sign-in after 2 seconds.

## Files Edited

### `lib/auth/actions.ts`
Added two new Zod schemas and two new server actions:

- **`PasswordResetRequestSchema`** -- validates email format
- **`UpdatePasswordSchema`** -- validates password minimum 8 characters
- **`requestPasswordReset(email)`** -- calls `supabase.auth.resetPasswordForEmail()` with a `redirectTo` URL that routes through `/auth/callback?next=/auth/reset-password`. Always returns success to prevent email enumeration. Uses `NEXT_PUBLIC_SITE_URL` env var for the redirect base URL.
- **`updatePassword(newPassword)`** -- verifies the user is authenticated (session exists from the recovery code exchange), then calls `supabase.auth.updateUser()` to set the new password.

### `app/auth/callback/route.ts`
Updated the comment from "OAuth callback handler" to "Auth callback handler" since it now serves both OAuth and password recovery flows. Added context-aware error handling: when the `next` parameter indicates a password reset flow, the error redirects to `/auth/forgot-password` with an appropriate expiration message instead of the generic sign-in error.

### `app/auth/signin/page.tsx`
Added a "Forgot password?" link next to the "Stay signed in" checkbox. The two elements are now in a flex row with `justify-between`, placing the checkbox on the left and the link on the right.

## How the Flow Works

1. **User clicks "Forgot password?"** on the sign-in page, navigating to `/auth/forgot-password`
2. **User enters their email** and submits the form
3. **Server action `requestPasswordReset`** calls Supabase's `resetPasswordForEmail` with `redirectTo` set to `{siteUrl}/auth/callback?next=/auth/reset-password`
4. **Supabase sends an email** with a link containing a one-time `code` parameter
5. **User clicks the email link**, which hits `/auth/callback?code=...&next=/auth/reset-password`
6. **The callback route** exchanges the `code` for a Supabase session via `exchangeCodeForSession()`, then redirects to `/auth/reset-password`
7. **User enters their new password** (with confirmation) on the reset password page
8. **Server action `updatePassword`** verifies the session exists, then calls `supabase.auth.updateUser()` to set the new password
9. **Success message** appears, and the user is auto-redirected to sign-in after 2 seconds

## Security Considerations

- **No email enumeration**: The forgot password form always shows a success message regardless of whether the email exists in the system
- **Zod validation**: Both server actions validate input with Zod schemas before processing
- **Session verification**: `updatePassword` checks that the user has a valid authenticated session before allowing password changes
- **Token expiration**: If the recovery code has expired or is invalid, the callback route redirects to the forgot password page with a clear error message
- **Client-side validation**: Password match and minimum length are checked before server submission for a better UX, but the server-side Zod schema is the authoritative validation

## Connection to the System

This flow integrates with the existing auth infrastructure:
- Uses the same `createServerClient()` from `lib/supabase/server.ts`
- Follows the established `'use server'` action pattern with Zod validation
- Reuses the existing `/auth/callback` route for code exchange
- Middleware already skips all `/auth` routes, so no middleware changes needed
- Matches the exact visual style of the existing sign-in and sign-up pages (same Card/Input/Button/Alert components, same layout structure, same color scheme)

## Environment Requirements

- `NEXT_PUBLIC_SITE_URL` must be set to the production URL (e.g., `https://app.chefflow.com`). Falls back to `http://localhost:3000` in development.
- Supabase project must have email templates configured for password recovery (this is a Supabase dashboard setting, enabled by default).
