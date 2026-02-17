# Google OAuth Sign-In Integration

## What Changed

Added Google OAuth as a sign-in/sign-up method alongside the existing email+password flow.

## Files Created

- **`app/auth/callback/route.ts`** — OAuth callback route handler. When Google redirects back after authentication, this exchanges the auth `code` for a Supabase session, then redirects the user to `/` (where middleware routes them to their role-based dashboard).

## Files Modified

- **`lib/supabase/client.ts`** — Added `signInWithGoogle()` helper. This calls `supabase.auth.signInWithOAuth({ provider: 'google' })` which triggers a full-page redirect to Google's consent screen. Must run client-side (not a server action) because it initiates a browser redirect.

- **`app/auth/signin/page.tsx`** — Added "Continue with Google" button with the Google logo SVG below the email/password form, separated by an "or" divider.

- **`app/auth/signup/page.tsx`** — Same Google button added to the chef sign-up form. Not added to the client invitation form (which requires a token and specific email match).

## How It Works

1. User clicks "Continue with Google"
2. `signInWithGoogle()` calls Supabase OAuth → browser redirects to Google
3. User authenticates with Google
4. Google redirects to `https://luefkpakzvxcsqroxyhz.supabase.co/auth/v1/callback`
5. Supabase processes the auth, then redirects to `app/auth/callback/route.ts`
6. The route handler exchanges the code for a session
7. User is redirected to `/` → middleware routes to dashboard

## Prerequisites (already completed)

1. Google Cloud Console: OAuth client ID created with redirect URI pointing to Supabase
2. Supabase Dashboard: Google provider enabled with Client ID and Secret

## Important Note

This gives **authentication only** (sign in with Google). It does **not** grant access to Gmail, Google Calendar, or other Google APIs. Those require additional OAuth scopes and a separate integration.

## Role Assignment for Google OAuth Users

When a user signs in via Google for the first time, Supabase creates an auth user automatically. However, they won't have a `user_roles` entry or a `chefs`/`clients` record yet. The existing middleware role-resolution flow will need to handle this — either by prompting them to complete their profile or by auto-creating a chef record on first Google sign-in. This is a follow-up concern if the current flow doesn't handle it gracefully.
