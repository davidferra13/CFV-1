# Admin Panel Improvements

**Date:** 2026-02-20
**Branch:** fix/grade-improvements
**Migrations:** 20260307000003, 20260307000004

---

## What Changed

This update completes the admin panel from "read-only dashboards + scaffolding" to a fully actionable control surface. Every previously disabled feature has been wired up.

---

## New Capabilities

### 1. Feature Flag Toggles (`/admin/flags`)
**Before:** Read-only dot indicators. Toggle controls disabled.
**After:** Live toggle switches per chef. Optimistic updates with rollback on failure.

- **New files:** `lib/admin/flag-actions.ts`, `components/admin/flag-toggle-panel.tsx`
- `toggleChefFlag(chefId, flagName, enabled)` — upserts `chef_feature_flags`, audit-logged
- `setBulkChefFlags(chefId, flags)` — batch update for future presets feature
- Toggle state is optimistic — UI updates immediately, reverts if server returns error

---

### 2. Platform Announcement Banner (`/admin/communications`)
**Before:** Disabled textarea.
**After:** Fully functional. Three severity levels (info/warning/critical). Live preview. Persists across sessions until cleared.

- **New files:** `lib/admin/platform-actions.ts`, `components/admin/announcement-form.tsx`, `components/admin/platform-announcement-banner.tsx`
- **New migration:** `20260307000003_platform_settings.sql` — key-value `platform_settings` table (service-role only, RLS enabled)
- `getAnnouncement()` fetches from DB; returns `null` if empty — safe to call anywhere
- Banner shown in chef layout (`app/(chef)/layout.tsx`). Dismissable per session via `sessionStorage`.
- Chef layout calls `getAnnouncement()` with `.catch(() => null)` so a missing `platform_settings` table never breaks the portal.

---

### 3. Direct Email (`/admin/communications`)
**Before:** Disabled form.
**After:** Fully functional. Sends via Resend (already configured in env).

- **New files:** `lib/admin/email-actions.ts`, `components/admin/direct-email-form.tsx`
- `sendAdminDirectEmail(to, subject, body)` — plain-text body converted to simple HTML, reply-to set to admin email
- Audit-logged as `admin_sent_email`

---

### 4. Broadcast Email (`/admin/communications`)
**Before:** Disabled buttons.
**After:** Fully functional. Two targets: all chefs, inactive chefs (60+ days).

- **New files:** `lib/admin/email-actions.ts`, `components/admin/broadcast-email-form.tsx`
- `sendAdminBroadcastEmail(target, subject, body)` — batches in groups of 50 using BCC to protect recipient privacy
- Returns `sentCount` so the UI confirms exactly how many received the email
- Audit-logged as `admin_broadcast_email`

---

### 5. Chef Deactivation / Reactivation (`/admin/users/[chefId]`)
**Before:** No mechanism to block a bad-actor chef.
**After:** Full suspend/reactivate flow with confirmation gate.

- **New migration:** `20260307000004_chef_account_status.sql` — adds `account_status TEXT DEFAULT 'active'` CHECK (`active` | `suspended`) to `chefs` table
- **New files:** `lib/admin/chef-admin-actions.ts`, `components/admin/chef-danger-zone.tsx`
- Suspension requires typing the chef's business name to confirm
- `requireChef()` in `lib/auth/get-user.ts` now checks `account_status === 'suspended'` and throws, causing the layout to redirect to sign-in
- Suspended badge shown on chef detail header
- Audit-logged as `account_deactivated` / `account_reactivated`

---

### 6. Admin Ledger Correction (`/admin/users/[chefId]`)
**Before:** Ledger was read-only from admin panel; required direct DB access.
**After:** Admin can issue credits (+) or debits (–) via the UI.

- **New files:** `lib/admin/chef-admin-actions.ts`, `components/admin/admin-credit-form.tsx`
- `issueAdminCredit({ chefId, eventId?, amountCents, description })` — appends an `adjustment` entry to `ledger_entries`
- Respects ledger immutability — never modifies existing entries, only appends
- Optional event linkage via dropdown (populated from chef's events)
- Description is prefixed `[Admin Credit]` and includes issuing admin's email for auditability

---

### 7. Referral Partners Page (`/admin/referral-partners`)
**Before:** No admin visibility into referral partner data.
**After:** Full cross-tenant view of all partners.

- **New files:** `app/(admin)/admin/referral-partners/page.tsx`
- Shows: total count, active count, showcase count, tenant count, type breakdown
- Full table: partner name, which chef tenant, type, status, contact email, showcase flag, join date
- Links chef name to their chef detail page
- Added `Handshake` icon + entry to `AdminSidebar` nav

---

## Types Regenerated

`types/database.ts` regenerated from remote schema. The following tables now have proper TypeScript types (removing previous `as any` workarounds):

- `admin_audit_log`
- `chef_feature_flags`
- `platform_settings`
- `chefs.account_status` column

---

## Migration Summary

| File | What It Does |
|---|---|
| `20260307000003_platform_settings.sql` | Key-value store for platform config (announcement text/type, future settings). Service-role only RLS. |
| `20260307000004_chef_account_status.sql` | Adds `account_status` column to `chefs` (active/suspended). Safe default = active. |

Both migrations applied to remote Supabase as of this build.

---

## What Was Skipped

**View-as / Chef Impersonation** — deferred. This would require either a parallel route group replicating the entire chef portal under admin auth, or a cookie-injection mechanism that the chef layout reads. The risk of getting this wrong (data leakage, privilege escalation) outweighs the current benefit. The admin can already see everything about a chef via the chef detail page.

---

## How to Test

1. Go to `/admin/flags` → click any toggle → confirm dot changes color and DB row updates
2. Go to `/admin/communications` → set an announcement → visit any chef page and confirm banner appears
3. Go to `/admin/users/{chefId}` → scroll to Danger Zone → type chef name → suspend → confirm chef portal redirects to sign-in
4. Go to `/admin/users/{chefId}` → issue a $10 credit → confirm new `adjustment` row appears in ledger
5. Go to `/admin/communications` → send direct email to your own address → confirm receipt
6. Go to `/admin/referral-partners` → confirm partners table loads
