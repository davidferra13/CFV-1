# Create Staff Login Feature

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## Summary

Adds the ability for a chef to create a login account for a staff member directly from the staff detail page. Once created, the staff member can sign in at `/staff-login` and access the staff portal (schedules, tasks, recipes, station clipboards).

## What Changed

### 1. Migration: `20260324000002_add_staff_user_role.sql`

Adds `'staff'` to the `user_role` PostgreSQL enum. This is required because the `user_roles` table uses this enum and `requireStaff()` checks for `role === 'staff'`. Previously the value was missing from the enum (though code already referenced it via string casts).

### 2. Server Actions: `lib/staff/actions.ts`

Two new exported functions:

- **`checkStaffHasLogin(staffMemberId)`** -- Checks if a `user_roles` row with `entity_id = staffMemberId` and `role = 'staff'` exists. Uses admin client to bypass RLS. Returns `boolean`.

- **`createStaffLogin({ staffMemberId, email, password })`** -- Full login creation flow:
  1. Zod validation (UUID, valid email, min 8 char password)
  2. Verifies staff member belongs to the chef's tenant
  3. Checks for duplicate login (prevents re-creation)
  4. Creates Supabase auth user via `auth.admin.createUser` with `email_confirm: true`
  5. Inserts `user_roles` row linking `auth_user_id` to `entity_id` (staff member)
  6. Updates `staff_members.email` if not already set
  7. On role insert failure, cleans up the orphaned auth user
  8. Revalidates the staff detail page path

### 3. Client Component: `components/staff/create-staff-login-form.tsx`

Props: `{ staffMemberId, currentEmail?, hasLogin? }`

- If `hasLogin` is true, renders a green "Portal Access Active" badge instead of the form
- Form fields: email (pre-filled from staff record), password (with built-in show/hide toggle from Input component)
- On success, shows confirmation message with link to `/staff-login`
- Error messages displayed in a red alert box
- Uses existing Button, Input, Badge components

### 4. Staff Detail Page: `app/(chef)/staff/[id]/page.tsx`

- Added `checkStaffHasLogin` call in parallel with `getStaffMember` (via `Promise.all`)
- Added "Portal Access" Card section between Contact Info and Edit Profile
- Renders `CreateStaffLoginForm` with the staff member's ID, email, and login status

## Architecture Notes

- **Admin client** (`createServerClient({ admin: true })`) is used for all operations that need the service role key: creating auth users, querying `user_roles`, and updating `staff_members` without chef RLS restrictions.
- **Tenant scoping** is enforced: the server action verifies `chef_id = user.tenantId!` before proceeding.
- **Orphan cleanup**: If the `user_roles` insert fails after the auth user is created, the auth user is deleted to prevent orphaned accounts.
- **The `as any` casts** on role values are needed because the TypeScript types (`types/database.ts`) are auto-generated and may not yet include the `'staff'` enum value until the migration is applied and types are regenerated.

## How to Test

1. Navigate to `/staff` and click on a staff member
2. The "Portal Access" card should appear between Contact Info and Edit Profile
3. Enter an email and password (min 8 chars) and click "Create Login"
4. On success, the form should be replaced with "Portal Access Active" badge
5. The staff member should be able to sign in at `/staff-login` with the created credentials

## Prerequisites

- The migration `20260324000002_add_staff_user_role.sql` must be applied to add `'staff'` to the `user_role` enum
- `SUPABASE_SERVICE_ROLE_KEY` must be set in environment variables (required for admin auth operations)
