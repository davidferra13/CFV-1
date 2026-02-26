# Auth Improvements - Implementation Notes

**Date:** 2026-02-17
**Scope:** Email verification, password management, account deletion, invitation revocation

---

## What Changed

### 1. Email Verification Flow

**Files modified:**

- `lib/auth/actions.ts` -- Changed `email_confirm: true` to `email_confirm: false` in both `signUpChef()` and `signUpClient()` admin.createUser calls. This tells Supabase to send a verification email instead of auto-confirming the user.
- `app/auth/signup/page.tsx` -- Both `handleChefSubmit` and `handleClientSubmit` now redirect to `/auth/verify-email` instead of `/auth/signin?message=Account created successfully`.

**Files created:**

- `app/auth/verify-email/page.tsx` -- Static server component matching the auth page layout (centered card, ChefFlow branding). Instructs the user to check their email and provides a link back to sign in.

**Why:** Auto-confirming emails is a security gap. Real email verification ensures the user owns the email address they signed up with, prevents throwaway signups, and aligns with standard auth practices.

### 2. Change Password

**Files created:**

- `app/(chef)/settings/change-password/page.tsx` -- Server component that calls `requireChef()` and renders the client form. Follows the same layout pattern as the main settings page.
- `components/settings/change-password-form.tsx` -- Client component with three fields: current password, new password, confirm new password. Client-side validation for 8-char minimum and password match. Uses `useTransition` for the async action call, consistent with `preferences-form.tsx` patterns.

**Server action added to `lib/auth/actions.ts`:**

- `changePassword(currentPassword, newPassword)` -- Re-verifies identity by attempting `signInWithPassword` with the current password before calling `updateUser`. This prevents session hijacking from allowing a password change without knowledge of the old password.

**Why:** Users need to be able to change their password without going through the forgot-password email flow. Re-verification with the current password is a standard security measure.

### 3. Account Deletion

**Files created:**

- `app/(chef)/settings/delete-account/page.tsx` -- Server component with `requireChef()` guard and a prominent warning alert about permanent data loss. Renders the deletion form below.
- `components/settings/delete-account-form.tsx` -- Client component requiring two confirmations: typing "DELETE" literally and entering their password. Uses the `danger` button variant for visual severity. Calls server action and lets server-side redirect handle the post-deletion navigation.

**Server action added to `lib/auth/actions.ts`:**

- `deleteAccount(password)` -- Verifies password via `signInWithPassword`, then uses the admin client to call `admin.deleteUser(user.id)` (which cascades via DB foreign key constraints), signs out the session, and redirects to `/`.

**Why:** GDPR and general user rights require the ability to delete an account. The double confirmation (type DELETE + password) prevents accidental deletion.

### 4. Invitation Revocation

**File modified:**

- `lib/auth/invitations.ts` -- Added `revokeInvitation(invitationId)` function. Added imports for `requireChef` and `revalidatePath`.

**How it works:** Sets `used_at` to the current timestamp on the invitation, but only if the invitation belongs to the chef's tenant and hasn't already been used (`used_at IS NULL`). This effectively invalidates the token without deleting the record, preserving the audit trail. Revalidates `/clients` to update any displayed invitation list.

**Why:** Chefs need the ability to revoke an invitation they sent to the wrong email or that is no longer needed, without waiting for it to expire naturally.

### 5. Settings Page Navigation

**File modified:**

- `app/(chef)/settings/page.tsx` -- Added an "Account" section at the bottom with links to Change Password and Delete Account. The delete account link uses red-tinted border/hover styling to signal danger.

---

## How It Connects

- All new server actions live in `lib/auth/actions.ts` (password changes, account deletion) or `lib/auth/invitations.ts` (revocation), keeping auth logic centralized.
- New settings pages follow the existing `(chef)/settings/*` routing convention with `requireChef()` guards.
- Client components use the same UI primitives (`Card`, `Input`, `Button`, `Alert`) and `useTransition` pattern established by `preferences-form.tsx`.
- The verify-email page matches the visual style of `signin/page.tsx` and `signup/page.tsx` (centered card, `bg-surface-muted`, ChefFlow header).
- Invitation revocation is tenant-scoped (`tenant_id` check) consistent with ChefFlow's multi-tenant model.

---

## Testing Notes

- **Email verification:** Requires Supabase email templates to be configured. Test by signing up and checking for the verification email. Unverified users should not be able to sign in.
- **Change password:** Test with correct and incorrect current passwords. Verify the new password works on next sign-in.
- **Delete account:** Test that typing anything other than "DELETE" keeps the button disabled. Test with wrong password. After deletion, verify the user cannot sign in and that cascaded data is removed.
- **Invitation revocation:** Test that only unused invitations can be revoked. Test that the revoked token is no longer valid for signup. Test that a chef cannot revoke another chef's invitation (tenant scoping).
