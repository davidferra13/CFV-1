# Staff Portal (Phase 6) — Implementation Summary

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`
**Status:** Implementation complete, pending build verification

---

## What Was Built

A new route group `app/(staff)/` providing staff members their own limited portal with read-mostly views of tasks, recipes, schedules, and station clipboards.

### Files Created

| File                                        | Purpose                                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| `app/staff-login/page.tsx`                  | Staff-specific login page at `/staff-login`             |
| `app/(staff)/layout.tsx`                    | Staff portal layout with top navigation                 |
| `app/(staff)/staff-dashboard/page.tsx`      | Staff home: today's tasks, stats, stations, assignments |
| `app/(staff)/staff-station/page.tsx`        | Station clipboard view with date nav and shift controls |
| `app/(staff)/staff-recipes/page.tsx`        | Read-only recipe cards, filterable by station           |
| `app/(staff)/staff-schedule/page.tsx`       | Event assignments (upcoming + past)                     |
| `app/(staff)/staff-tasks/page.tsx`          | Tasks grouped by date with check-off                    |
| `components/staff/staff-nav.tsx`            | Top navigation bar for staff portal                     |
| `components/staff/staff-task-checkbox.tsx`  | Checkbox component for toggling task completion         |
| `components/staff/staff-clipboard-view.tsx` | Editable clipboard table (on_hand, waste, notes only)   |
| `components/staff/staff-shift-controls.tsx` | Shift check-in/out controls                             |
| `lib/staff/staff-portal-actions.ts`         | All server actions for the staff portal                 |

### Files Modified

| File                   | Change                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/auth/get-user.ts` | Added `StaffAuthUser` type and `requireStaff()` function                                            |
| `middleware.ts`        | Added `staffPaths`, `/staff-login` to skipAuthPaths, staff role in cache, staff routing enforcement |

---

## Architecture Decisions

### Authentication

- Staff members are identified by `role = 'staff'` in the `user_roles` table.
- `entity_id` maps to `staff_members.id`.
- `tenantId` is derived from `staff_members.chef_id` (the employing chef).
- `requireStaff()` uses an admin Supabase client to read `staff_members` because existing RLS policies only allow chef-role queries. This mirrors the pattern used by `requirePartner()`.

### Middleware Integration

- Staff paths (`/staff-dashboard`, `/staff-station`, `/staff-recipes`, `/staff-schedule`, `/staff-tasks`) are enforced in middleware to prevent non-staff users from accessing them.
- `/staff-login` is in `skipAuthPaths` so unauthenticated users can reach the login form.
- The role cache cookie now recognizes `staff` alongside `chef` and `client`.
- Landing page (`/`) redirects staff to `/staff-dashboard`.

### Data Access Pattern

All staff portal actions use `createServerClient({ admin: true })` to bypass RLS. This is necessary because the existing RLS policies on `tasks`, `stations`, `clipboard_entries`, `shift_logs`, `event_staff_assignments`, and `recipes` only grant access to the `chef` role.

**Security is enforced at the application layer:**

- Every action calls `requireStaff()` first (authentication).
- Every query scopes by both `chef_id = tenantId` (tenant isolation) AND `staff_member_id` / `assigned_to` (staff member scoping).

### Staff Permissions (Limited Portal)

| Action                                                    | Staff Can Do?         |
| --------------------------------------------------------- | --------------------- |
| View assigned tasks                                       | Yes                   |
| Complete/uncomplete own tasks                             | Yes                   |
| View clipboard entries                                    | Yes                   |
| Edit on_hand, waste_qty, waste_reason, notes on clipboard | Yes                   |
| Edit made, need_to_make, need_to_order on clipboard       | No (read-only)        |
| Toggle 86 status                                          | No (read-only)        |
| Shift check-in                                            | Yes                   |
| Shift check-out                                           | Yes (own shifts only) |
| View recipes                                              | Yes (read-only)       |
| View schedule/assignments                                 | Yes (read-only)       |
| Create/delete tasks                                       | No                    |
| Manage staff members                                      | No                    |
| Access financials                                         | No                    |
| Access client data                                        | No                    |

---

## What's Still Needed

### Database Migration (NOT included)

A migration is needed to add RLS policies for the `staff` role on relevant tables. Currently, the admin client bypasses RLS. For production hardening, add:

1. RLS SELECT policies on `tasks`, `stations`, `clipboard_entries`, `shift_logs`, `recipes`, `event_staff_assignments` for `get_current_user_role() = 'staff'`.
2. RLS UPDATE policy on `tasks` (status only) and `clipboard_entries` (limited fields) for staff.
3. RLS INSERT policy on `shift_logs` for staff.
4. Update `task_completion_log` RLS to allow staff inserts.

### Staff Account Creation

Currently there is no UI for chefs to create staff login accounts (Supabase auth user + user_roles row with `role = 'staff'` + link to `staff_members.id`). This will need:

- A "Create Staff Login" button on the chef's staff management page
- A server action that creates the auth user, assigns the `staff` role, and links to the `staff_members` record
- Email invitation flow (optional, can be phase 2)

### Future Enhancements

- Push notifications for task assignments
- Staff can upload photos (completed dishes, waste documentation)
- Staff can log actual hours on event assignments
- Staff can view their earnings/pay history
- Messaging between staff and chef
