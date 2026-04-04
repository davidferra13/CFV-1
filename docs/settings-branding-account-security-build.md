# Settings: Branding, Account & Security - Build Report

**Spec:** `docs/specs/settings-branding-account-security.md`
**Date:** 2026-04-04
**Agent:** Builder (Claude Opus 4.6)

---

## What Changed

### 1. Unified Image Optimization Infrastructure

All image uploads now use a single local `sharp`-based optimization pipeline instead of the previous split (resmush.it for some, no optimization for others).

| Upload Type   | Max Width | Previous Method           | New Method                         |
| ------------- | --------- | ------------------------- | ---------------------------------- |
| Business logo | 400px     | None (raw upload)         | `optimizeLogo()` via sharp         |
| Profile photo | 512px     | resmush.it (external API) | `optimizeProfilePhoto()` via sharp |
| Event photos  | 1024px    | resmush.it (external API) | `optimizePhoto()` via sharp        |

All three call `optimizeImage()` in `lib/images/optimize.ts`, which resizes and converts to WebP. SVGs pass through untouched. If optimization fails for any reason, the original file is uploaded (never blocks the upload).

**Files:**

- `lib/images/optimize.ts` (new) - Core optimization utility with three exported functions
- `lib/chef/profile-actions.ts` - Logo upload now optimizes before storage
- `lib/network/actions.ts` - Profile photo upload switched from resmush to sharp
- `lib/events/photo-actions.ts` - Event photo upload switched from resmush to sharp

**Why:** Eliminates dependency on an external compression API (resmush.it), makes uploads faster (local processing), ensures consistent image quality across all surfaces, and prevents UI breakage from oversized images.

### 2. Branding Card on Settings Hub

Logo management is now a dedicated, self-contained card in the "Profile & Branding" section of the settings page, instead of being buried in the 15-field profile form.

**Files:**

- `components/settings/branding-card.tsx` (new) - Standalone logo upload/preview/remove card
- `components/ui/logo-fallback.tsx` (new) - Business name initials when no logo uploaded
- `app/(chef)/settings/page.tsx` - BrandingCard added to Profile & Branding group
- `app/(chef)/settings/my-profile/chef-profile-form.tsx` - Logo upload section removed, replaced with link to branding settings

### 3. Dedicated `removeChefLogo` Server Action

Previously, removing a logo was done by setting `logo_url` to empty string via the profile save. Now there's a proper `removeChefLogo()` action that:

- Clears `chefs.logo_url`
- Deletes the file from storage
- Busts all relevant caches (layout, settings paths)

**File:** `lib/chef/profile-actions.ts`

### 4. Email Change Flow (New)

Chefs can now change their account email address. The flow:

1. Chef enters new email on `/settings/account`
2. Server validates uniqueness, sends verification email to the new address
3. Chef clicks the link in the email
4. Server updates both `auth.users.email` and `chefs.email` atomically

**Security:**

- Rate limited: 3 requests per hour per user
- Token is SHA-256 hashed before storage (plaintext only in the email link)
- Token expires after 1 hour
- Uniqueness re-checked at confirmation time (prevents race conditions)
- Uses existing `auth.users` columns (`email_change`, `email_change_token_new`, `email_change_sent_at`) from the Supabase auth schema (no new migration needed)

**Files:**

- `lib/auth/actions.ts` - `requestEmailChange()` and `confirmEmailChange()` actions
- `lib/email/templates/email-change-verification.tsx` (new) - Verification email template
- `components/settings/email-change-form.tsx` (new) - Client component for requesting change
- `app/auth/confirm-email-change/page.tsx` (new) - Token verification page

### 5. Unified Account & Security Page

New page at `/settings/account` consolidates:

- Email management (with change flow)
- Password change (reuses existing `ChangePasswordForm`)
- Devices & staff access (link to existing `/settings/devices`)
- Danger zone / account deletion (link to existing `/settings/delete-account`)

The settings hub's "Account & Security" category now links to this unified page instead of scattering separate links to individual pages.

**Files:**

- `app/(chef)/settings/account/page.tsx` (new) - Unified account page
- `app/(chef)/settings/page.tsx` - Account section restructured

### 6. Layout Cache Enhancement

`logo_url` and `profile_image_url` added to `ChefLayoutData` so:

- Logo/photo changes properly bust the layout cache via `revalidateTag('chef-layout-{id}')`
- Both values are available for any future sidebar/header branding

**File:** `lib/chef/layout-cache.ts`

---

## Files Created (6)

| File                                                | Purpose                                |
| --------------------------------------------------- | -------------------------------------- |
| `lib/images/optimize.ts`                            | Unified sharp-based image optimization |
| `components/ui/logo-fallback.tsx`                   | Business name initials fallback        |
| `components/settings/branding-card.tsx`             | Standalone logo management card        |
| `components/settings/email-change-form.tsx`         | Email change request form              |
| `lib/email/templates/email-change-verification.tsx` | Verification email                     |
| `app/auth/confirm-email-change/page.tsx`            | Token confirmation page                |
| `app/(chef)/settings/account/page.tsx`              | Unified account settings page          |

## Files Modified (7)

| File                                                   | What Changed                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `lib/chef/profile-actions.ts`                          | Logo optimization + `removeChefLogo` action + cache busting    |
| `lib/auth/actions.ts`                                  | `requestEmailChange` + `confirmEmailChange` actions            |
| `lib/network/actions.ts`                               | Profile photo: resmush -> sharp, added cache tag busting       |
| `lib/events/photo-actions.ts`                          | Event photos: resmush -> sharp                                 |
| `lib/chef/layout-cache.ts`                             | Added `logo_url` + `profile_image_url` to cache type and query |
| `lib/profile/actions.ts`                               | `getChefSlug` now returns `logo_url` + `business_name`         |
| `app/(chef)/settings/page.tsx`                         | BrandingCard added, Account section restructured               |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx` | Logo section removed, link to branding settings                |

---

## Database Changes

None. All columns already exist. The email change flow uses existing Supabase auth schema columns.

## Design Decisions

1. **LogoFallback only in settings** - Public-facing surfaces (chef page, proposals) intentionally show nothing when no logo exists. The fallback initials are useful in admin/settings context where the chef is managing their brand, not in client-facing contexts where a missing logo should just be absent.

2. **Sharp over resmush** - Local processing is faster, more reliable (no external API dependency), and gives us consistent quality control. The resmush.it module (`lib/images/resmush.ts`) is now unused by any server action but kept in the codebase as it's not harmful.

3. **Email change uses existing auth columns** - No new migration needed. The Supabase auth schema already has `email_change`, `email_change_token_new`, and `email_change_sent_at` columns.

4. **Old routes preserved** - `/settings/change-password` still works as its own page. The unified `/settings/account` page embeds the same `ChangePasswordForm` component.
