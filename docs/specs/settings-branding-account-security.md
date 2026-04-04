# Spec: Settings - Branding, Account & Security

> **Status:** built
> **Priority:** P2 (queued)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files) - actual: 13 files (7 new, 7 modified)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session      | Commit |
| --------------------- | ---------------- | ------------------ | ------ |
| Created               | 2026-04-04 14:00 | Planner            |        |
| Status: draft         | 2026-04-04 14:00 | Planner            |        |
| Claimed (in-progress) | 2026-04-04 14:30 | Builder (Opus 4.6) |        |
| Type check passed     | 2026-04-04 17:50 | Builder (Opus 4.6) |        |
| Build completed       | 2026-04-04 17:50 | Builder (Opus 4.6) |        |
| Playwright verified   |                  |                    |        |
| Status: built         | 2026-04-04 17:50 | Builder (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

The developer wants a clean, intentional Settings experience where Branding, Account, and Security are clearly separated. Users should be able to upload and manage a brand logo, change their password and email, and find all account-level controls in one obvious place. The instruction explicitly says: don't rebuild what exists, audit first, then extend or reorganize.

### Developer Intent

- **Core goal:** Make the settings experience feel structured and intentional, with clear separation between branding (logo/visual identity), account management (email, password), and security controls, instead of the current layout where these concerns are mixed together or scattered.
- **Key constraints:** Do not rebuild existing systems. Extend and reorganize. No orphaned assets, no broken propagation, no duplicated data.
- **Motivation:** The current settings hub has 50+ pages organized into 5 groups. Branding (logo upload) is buried inside "My Profile" alongside 15 other fields (bio, social links, phone, etc.). Account and security controls are separate pages linked from a single settings hub category. There is no email change flow at all. The result feels like a feature directory, not a structured system.
- **Success from the developer's perspective:** A chef opens Settings and immediately sees three distinct, obvious paths: "How my brand looks," "My account credentials," and "Security." Each path leads to a focused, single-purpose interface. Logo changes propagate everywhere. Email can be changed securely. No confusion, no overlap.

---

## What This Does (Plain English)

This spec reorganizes and fills gaps in the existing settings infrastructure. It does three things:

1. **Branding section** - Elevates logo management out of the crowded "My Profile" form into its own focused card within the settings hub. Adds server-side image optimization on upload (resize to max 400px wide, compress to WebP) so large uploads don't break layouts. Adds a default fallback logo (business name initials) for surfaces that conditionally render nothing when no logo exists. Audits and fixes logo propagation to surfaces that currently don't use it (chef sidebar header, generated proposals/contracts).

2. **Account section** - Consolidates the existing password change page and adds an email change flow (with verification) into a unified "Account" page. The current email is displayed read-only with a "Change" action. Password change stays as-is (current password required, rate limited). No new credentials system needed.

3. **Settings hub reorganization** - The "Account & Security" category in the settings hub (currently Group E, category 20) gets restructured into two distinct cards: "Your Brand" (under the existing "Profile & Branding" group) and "Account & Security" (stays in Group E but becomes a proper detail page instead of just links).

---

## Why It Matters

Branding controls are buried in a 15-field profile form. There is no email change flow. Account and security controls are scattered links with no unified page. The result feels like navigating a database, not managing your business identity.

---

## Existing Infrastructure (Audit Results)

**What already exists and works (do NOT rebuild):**

| Feature                                     | Location                                                                | Status  |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| Logo upload (JPEG/PNG/WebP/SVG, 5MB max)    | `lib/chef/profile-actions.ts:230-303` (`uploadChefLogo`)                | Working |
| Logo preview + remove                       | `app/(chef)/settings/my-profile/chef-profile-form.tsx:413-453`          | Working |
| Logo DB column                              | `chefs.logo_url` (migration `20260304000010`)                           | Working |
| Logo on public chef page                    | `app/(public)/chef/[slug]/page.tsx:258-261`                             | Working |
| Logo on client preview                      | `app/(chef)/settings/client-preview/public-profile-preview.tsx:191-195` | Working |
| Logo in proposal builder                    | `components/quotes/proposal-live-preview.tsx:42-44`                     | Working |
| Logo in stories                             | `lib/stories/story-data.ts:52,94`                                       | Working |
| Logo in onboarding status                   | `lib/onboarding/onboarding-actions.ts:20,55`                            | Working |
| Password change (bcrypt, rate-limited 5/hr) | `lib/auth/actions.ts:593-629` + `app/(chef)/settings/change-password/`  | Working |
| Account deletion (30-day grace)             | `app/(chef)/settings/delete-account/`                                   | Working |
| Device management (kiosk PINs)              | `app/(chef)/settings/devices/`                                          | Working |
| System health                               | `app/(chef)/settings/health/`                                           | Working |
| Profile photo upload (separate from logo)   | `lib/network/actions.ts:20-35`                                          | Working |
| Local file storage + signed URLs            | `lib/storage/index.ts`                                                  | Working |

**What's missing (gaps to fill):**

| Gap                                       | Impact                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| No image optimization on logo upload      | Large images break layouts; inconsistent rendering across surfaces                               |
| No default fallback when no logo uploaded | Surfaces show nothing (conditional `{chef.logo_url && ...}`) instead of a meaningful placeholder |
| Logo not used in chef sidebar/header      | The most-seen surface in the app doesn't show the chef's brand                                   |
| Logo not used in generated contracts/PDFs | Documents don't carry the chef's branding                                                        |
| No email change flow                      | Chef cannot update their account email at all                                                    |
| Branding buried in 15-field profile form  | Hard to find, easy to miss, mixes identity with contact info                                     |
| No unified Account & Security page        | Password, devices, deletion, health are separate disconnected pages                              |

---

## Files to Create

| File                                        | Purpose                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `app/(chef)/settings/account/page.tsx`      | Unified Account & Security page (email, password, devices, deletion) |
| `components/settings/email-change-form.tsx` | Client component for email change with verification                  |
| `components/settings/branding-card.tsx`     | Standalone branding card (logo upload, preview, optimize, fallback)  |
| `lib/images/optimize.ts`                    | Server-side image optimization utility (sharp: resize + WebP)        |
| `components/ui/logo-fallback.tsx`           | Default logo component (business name initials in a styled circle)   |

---

## Files to Modify

| File                                                   | What to Change                                                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/settings/page.tsx`                         | Add "Your Brand" card to Profile & Branding group. Replace "Account & Security" links with single link to new `/settings/account` page. |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx` | Remove the logo upload section (lines 413-453). Keep profile photo. Add a link: "Manage your brand logo in Branding settings."          |
| `lib/chef/profile-actions.ts`                          | Add image optimization step in `uploadChefLogo()` before storage. Call `optimizeImage()` to resize and convert to WebP.                 |
| `lib/auth/actions.ts`                                  | Add `requestEmailChange(newEmail)` and `confirmEmailChange(token)` server actions.                                                      |
| `lib/email/templates/`                                 | Add email verification template for email change confirmation.                                                                          |

---

## Database Changes

None. All needed columns already exist:

- `chefs.logo_url` (text, nullable) - migration `20260304000010`
- `chefs.email` (text, unique, not null) - Layer 1
- `auth.users.email` - managed by Auth.js

The email change flow uses a time-limited token (stored in-memory or a short-lived DB row) rather than a new permanent table. If the builder prefers a `pending_email_changes` table for reliability, that's acceptable as an additive migration (builder's call based on spike findings).

---

## Data Model

**Logo lifecycle:** Upload -> optimize (resize to max 400px wide, convert to WebP, preserve transparency for PNG/SVG input) -> store in `chef-logos` bucket -> update `chefs.logo_url` -> delete previous file. No new columns needed.

**Email change lifecycle:** Chef requests change -> server validates new email is unique -> sends verification email with HMAC-signed token (expires 1 hour) -> chef clicks link -> server updates both `auth.users.email` and `chefs.email` atomically -> invalidates all sessions except current.

**Logo fallback:** Not stored. Computed at render time from `chefs.business_name` (first letter of first two words, or first two letters of single word). Rendered as a styled SVG/div with the chef's `portal_primary_color` as background.

---

## Server Actions

| Action                         | Auth            | Input                  | Output                          | Side Effects                                                                                        |
| ------------------------------ | --------------- | ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `uploadChefLogo(formData)`     | `requireChef()` | FormData with file     | `{ success, logoUrl?, error? }` | Optimizes image, stores file, updates `chefs.logo_url`, deletes previous, revalidates profile paths |
| `removeChefLogo()`             | `requireChef()` | none                   | `{ success, error? }`           | Deletes file, sets `chefs.logo_url` to null, revalidates                                            |
| `requestEmailChange(newEmail)` | `requireChef()` | `{ newEmail: string }` | `{ success, error? }`           | Validates uniqueness, sends verification email with token                                           |
| `confirmEmailChange(token)`    | `requireChef()` | `{ token: string }`    | `{ success, error? }`           | Updates `auth.users.email` + `chefs.email`, revalidates session                                     |
| `changePassword(current, new)` | `requireChef()` | existing               | existing                        | No changes needed (already works)                                                                   |

Note: `uploadChefLogo` already exists in `lib/chef/profile-actions.ts`. The modification adds the optimization step. `removeChefLogo` may already exist (check during spike). `requestEmailChange` and `confirmEmailChange` are new.

---

## UI / Component Spec

### Branding Card (on Settings Hub)

Located in the "Profile & Branding" group of the settings page. A self-contained card, not a link to a sub-page.

**Layout:**

- Card title: "Brand Logo"
- Description: "Your business mark, shown on proposals, your public page, and client-facing documents."
- Left side: current logo preview (or fallback initials) at 80x80px in a bordered container
- Right side: "Upload new logo" file input + "Remove" button (if logo exists)
- Below: accepted formats hint, size limit

**States:**

- **No logo:** Shows `<LogoFallback>` with initials + "Upload your first logo" prompt
- **Has logo:** Shows current logo image + Replace/Remove actions
- **Uploading:** Spinner overlay on the preview area, file input disabled
- **Error:** Toast with specific message (file too large, wrong type, upload failed)

### Account & Security Page (`/settings/account`)

A dedicated page (not inline in the settings hub) accessed via a single link from the "Account & Security" category.

**Layout:** Max-width container with stacked cards:

1. **Email card**
   - Shows current email (read-only display)
   - "Change email" button opens inline form: new email input + "Send verification" button
   - After sending: info banner "Check your new email for a verification link. Your email won't change until you confirm."
   - Rate limit: 3 requests per hour

2. **Password card**
   - Current password, new password, confirm password fields (reuse existing `ChangePasswordForm`)
   - Embedded directly, not a link to `/settings/change-password`

3. **Devices card**
   - Link to `/settings/devices` with description
   - Shows count of active devices/PINs if available

4. **Danger zone card** (red border)
   - Link to `/settings/delete-account`
   - Clear warning text

**States:**

- **Loading:** Skeleton cards
- **Error (page load):** Error banner with retry
- **Success (email change sent):** Info toast + banner in email card
- **Success (password changed):** Success toast, form resets

### Logo Fallback Component

A small, reusable component that renders business name initials in a colored circle.

```
Props: { businessName: string, primaryColor?: string, size?: 'sm' | 'md' | 'lg' }
Sizes: sm=32px, md=48px, lg=80px
```

Used anywhere `logo_url` is conditionally rendered today. The pattern changes from:

```tsx
{chef.logo_url && <img src={chef.logo_url} ... />}
```

to:

```tsx
{chef.logo_url ? <img src={chef.logo_url} ... /> : <LogoFallback businessName={chef.business_name} />}
```

---

## Edge Cases and Error Handling

| Scenario                                            | Correct Behavior                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Upload file exceeds 5MB                             | Reject client-side before upload. Toast: "Logo must be under 5MB."                                 |
| Upload wrong file type                              | Reject client-side. Toast: "Accepted formats: JPEG, PNG, WebP, SVG."                               |
| Image optimization fails (sharp error)              | Store original file without optimization. Log warning. Don't block the upload.                     |
| SVG upload (can't resize with sharp)                | Store as-is. SVGs scale naturally. Skip optimization step for SVG.                                 |
| Email change to already-taken email                 | Return error: "This email is already associated with another account." Don't reveal which account. |
| Email verification token expired                    | Show: "This link has expired. Please request a new email change."                                  |
| Email change while another is pending               | Cancel previous pending change, start new one.                                                     |
| Chef changes password while email change is pending | Email change stays pending (independent flows).                                                    |
| Logo URL in proposal uses old cached URL            | `revalidateTag` on all caches that read `logo_url` after upload.                                   |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/settings` and verify the "Brand Logo" card appears in the Profile & Branding group
3. Upload a logo (JPEG, > 1MB) and verify:
   - Preview updates immediately
   - File is stored as optimized WebP (check storage bucket)
   - `chefs.logo_url` is updated in DB
4. Navigate to public chef page (`/chef/[slug]`) and verify logo appears
5. Navigate to client preview and verify logo appears
6. Remove the logo, verify fallback initials appear on all surfaces
7. Navigate to `/settings/account` and verify all four cards render
8. Test password change (enter wrong current password, verify rejection)
9. Test password change (enter correct current password, verify success)
10. Test email change flow (enter new email, verify email sent, click verification link, verify both `auth.users.email` and `chefs.email` updated)
11. Screenshot final results

---

## Out of Scope

- **Portal theming** (colors, background images) - already exists at `/settings/public-profile`, not part of this spec
- **Profile photo management** - stays in My Profile form, not moved
- **Two-factor authentication (2FA)** - separate future spec if needed
- **OAuth account linking** (Google sign-in management) - separate concern
- **Session management** (view/revoke active sessions) - separate future spec
- **Appearance settings** (light/dark mode) - already exists at `/settings/appearance`
- **Chef-shell-clarity spec overlap** - that spec reorganizes the settings hub layout broadly; this spec focuses specifically on branding + account content. If both are built, the builder should check for conflicts in the settings page layout.

---

## Notes for Builder Agent

1. **`sharp` dependency** - Check if `sharp` is already in `package.json` (Next.js uses it internally for `next/image`). If not available as a direct import, use `next/image` optimization API or a lightweight alternative. Do not add a heavy new dependency without checking.

2. **Storage bucket** - Logo upload currently uses `chef-logos` bucket naming from the Supabase era. The actual storage is local filesystem via `lib/storage/index.ts`. The `uploadChefLogo` function in `lib/chef/profile-actions.ts` is the canonical upload path. Modify it, don't create a parallel one.

3. **Email change token** - The simplest approach: store a signed HMAC token in the verification URL (similar to how signed storage URLs work in `lib/storage/index.ts`). The token encodes `{userId}:{newEmail}:{expires}`. No new DB table needed. If the builder finds this insufficient during spike (e.g., need to revoke pending changes), a lightweight `pending_email_changes` table is acceptable.

4. **Auth.js email update** - Updating the email requires changing both `auth.users.email` (the Auth.js identity) and `chefs.email` (the app record). These must be updated atomically. Check how Auth.js v5 handles email changes; there may be a built-in mechanism.

5. **Existing `/settings/change-password` route** - After building the unified account page, the old `/settings/change-password` route should redirect to `/settings/account` (or be kept as an alias) so bookmarks and existing links in the settings hub don't break.

6. **Logo propagation audit** - During spike, grep for all places that conditionally render `logo_url` and add the fallback. Known locations: public chef page, client preview, proposal live preview, stories. Check if the chef sidebar/header, email templates, or contract generator should also show the logo.

7. **Cache invalidation** - After logo upload, bust any `unstable_cache` tags that include chef profile data. Search for `revalidateTag` patterns in `lib/chef/profile-actions.ts` to follow the existing pattern.

8. **Anti-clutter rule context** - This spec reorganizes existing infrastructure and fills clear gaps (no email change, no image optimization, scattered controls). It does not add new features. The branding card is a UI reorganization of the existing logo upload, not a new surface.
