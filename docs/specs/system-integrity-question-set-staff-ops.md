# System Integrity Question Set: Staff Operations

> 40 questions across 10 domains. Covers all 16 staff pages (10 chef-side + 6 staff-portal), 18 lib/staff files, 2 API routes, and the staff AI agent.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                                   | Answer                                                                                                                                   | Status |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Do all 10 chef-side staff pages gate with `requireChef()`?                 | Yes. All 10 pages call `requireChef()` directly. `permissions/page.tsx` additionally uses `requirePermission('users', 'view')`.          | BUILT  |
| 2   | Do all 6 staff-portal pages gate with `requireStaff()`?                    | Yes. All 6 pages (dashboard, time, schedule, station, recipes, tasks) call `requireStaff()`.                                             | BUILT  |
| 3   | Does the `[id]` page check staff member existence and return `notFound()`? | Yes. Fixed this session: added `notFound()` after `getStaffMember()` returns null. Previously crashed with error boundary on invalid ID. | BUILT  |
| 4   | Does the error boundary hide raw error messages?                           | Yes. `staff/error.tsx` does not expose `error.message`. Fixed in systemic 17-file sweep.                                                 | BUILT  |

## Domain 2: Tenant Scoping & Data Isolation

| #   | Question                                                       | Answer                                                                                                                                                                          | Status |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Do all `lib/staff/actions.ts` functions scope by `chef_id`?    | Yes. All 20+ functions use `.eq('chef_id', user.tenantId!)` from `requireChef()`.                                                                                               | BUILT  |
| 6   | Does `acknowledgeCOC` scope updates by tenant?                 | Yes. Fixed this session: added `.eq('chef_id', chef.tenantId!)` to both `acknowledgeCOC` and `getCOCStatus`. Previously updated/read by assignment ID only (cross-tenant risk). | BUILT  |
| 7   | Do staff portal actions scope by both tenant and staff member? | Yes. All `staff-portal-actions.ts` functions double-scope by `chef_id: user.tenantId` AND `staff_member_id: user.staffMemberId`. Staff can only see/modify their own data.      | BUILT  |
| 8   | Does the permissions page scope raw SQL by tenant?             | Yes. `permissions/page.tsx` uses parameterized SQL with `tenantId` in all 3 queries (team members, overrides, role defaults).                                                   | BUILT  |

## Domain 3: Staff CRUD & Lifecycle

| #   | Question                                               | Answer                                                                                                                                                           | Status |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 9   | Does staff creation validate input with Zod?           | Yes. `CreateStaffSchema` (Zod) in `actions.ts`. API v2 uses `CreateStaffBody`.                                                                                   | BUILT  |
| 10  | Is staff deactivation a soft delete?                   | Yes. `deactivateStaffMember` sets `status: 'inactive'` and revokes JWT sessions. API v2 DELETE sets `is_active: false`. No hard delete of staff records.         | BUILT  |
| 11  | Does `createStaffLogin` clean up on partial failure?   | Yes. If role insert fails after auth user creation, it deletes the orphan auth user. Checks for duplicate logins and verifies staff ownership before proceeding. | BUILT  |
| 12  | Does `removeStaffFromEvent` guard against live events? | Yes. Checks event status before removal. Blocks removal during `in_progress` events. Scoped by `chef_id`.                                                        | BUILT  |

## Domain 4: Scheduling & Availability

| #   | Question                                               | Answer                                                                                                                                                                                      | Status |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 13  | Does availability management validate input?           | Yes. `SetAvailabilitySchema`, `BulkSetAvailabilitySchema`, `DateRangeSchema` (Zod). `getAvailableStaffForDate` validates date with regex.                                                   | BUILT  |
| 14  | Does shift management scope by tenant?                 | Yes. `CreateShiftSchema`/`UpdateShiftSchema` validated. `deleteShift` hard-deletes but scoped by `chef_id`. `setStaffAvailability` delete+reinsert scoped by `chef_id` + `staff_member_id`. | BUILT  |
| 15  | Does the schedule page show real scheduling data?      | Yes. `schedule/page.tsx` calls `requireChef()` + `requirePro('staff-management')` and reads from tenant-scoped scheduling actions.                                                          | BUILT  |
| 16  | Does the availability page derive from actual records? | Yes. `availability/page.tsx` calls `requireChef()` and reads from `getAvailableStaffForDate()` which queries tenant-scoped availability entries.                                            | BUILT  |

## Domain 5: Time Tracking & Clock

| #   | Question                                               | Answer                                                                                                                                                                           | Status |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 17  | Does clock-in/out validate input with Zod?             | Yes. `ClockInSchema`, `ClockOutSchema`, `ClockFiltersSchema` (Zod). `getEventClockSummary` validates eventId with `z.string().uuid()`.                                           | BUILT  |
| 18  | Does `clockOut` verify entry exists and is clocked-in? | Yes. Validates entry has `status: 'clocked_in'` before updating. Prevents double clock-out.                                                                                      | BUILT  |
| 19  | Can staff clock in other staff members?                | No. `clockInFromTimeTracker` enforces `staffMemberId !== staffUser.staffMemberId` check in staff path. `clockOutFromTimeTracker` scopes by both `chef_id` and `staff_member_id`. | BUILT  |
| 20  | Does the clock page show real time entries?            | Yes. `clock/page.tsx` calls `requireChef()` and reads from tenant-scoped clock actions.                                                                                          | BUILT  |

## Domain 6: Performance & Labor

| #   | Question                                                   | Answer                                                                                                                                                                     | Status |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 21  | Does performance scoring use real assignment data?         | Yes. `computePerformanceScore` validates staffMemberId with UUID, reads from tenant-scoped assignment history, computes on-time rate, cancellations, average rating.       | BUILT  |
| 22  | Does the labor dashboard derive from actual clock entries? | Yes. `labor/page.tsx` calls `getPayrollReportForPeriod()` which aggregates from tenant-scoped clock entries and staff hourly rates. `.catch()` returns safe zero-fallback. | BUILT  |
| 23  | Does the performance page show real metrics?               | Yes. `performance/page.tsx` calls `requireChef()` + `requirePro('staff-management')`. Reads from tenant-scoped performance data.                                           | BUILT  |
| 24  | Does the labor cost report use proper date validation?     | Yes. `LaborByMonthSchema` and `DateRangeSchema` (Zod) validate date inputs. `getLaborByEvent` validates eventId with UUID.                                                 | BUILT  |

## Domain 7: Tips & Payroll

| #   | Question                                                    | Answer                                                                                                                                   | Status |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 25  | Does tip entry management validate input?                   | Yes. `TipEntrySchema`, `PoolConfigSchema` (Zod). UUID validation on entryId/configId in update/delete. Date validation with regex.       | BUILT  |
| 26  | Are tip deletions tenant-scoped?                            | Yes. `deleteTipEntry` hard-deletes but scoped by `tenant_id`. `finalizeTipDistribution` delete+reinsert is idempotent and tenant-scoped. | BUILT  |
| 27  | Does tax report generation scope by tenant?                 | Yes. `generate1099Report` uses `requirePro('payroll')` and scopes all queries by `chef_id: user.tenantId!`.                              | BUILT  |
| 28  | Does the payroll history on staff detail show real records? | Yes. `[id]/page.tsx` queries `payroll_records` scoped by `chef_id` + linked `employee_id`. Shows actual gross/net pay, hours, dates.     | BUILT  |

## Domain 8: Staff Portal (Staff-Facing)

| #   | Question                                                            | Answer                                                                                                                                                            | Status |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 29  | Do staff portal actions verify resource ownership before mutations? | Yes. `completeMyTask` checks task is assigned to the requesting staff. `updateClipboardEntry` limits writable fields. All double-scoped by tenant + staff member. | BUILT  |
| 30  | Does the staff station view scope to assigned stations?             | Yes. `staff-station/page.tsx` uses `requireStaff()` and reads only stations assigned to the authenticated staff member via `staff_member_id`.                     | BUILT  |
| 31  | Does the staff recipes view scope properly?                         | Yes. `staff-recipes/page.tsx` uses `requireStaff()` and reads recipes shared with the staff member's tenant.                                                      | BUILT  |
| 32  | Does the staff schedule view scope to assigned shifts?              | Yes. `staff-schedule/page.tsx` uses `requireStaff()` and reads only shifts assigned to the authenticated staff member.                                            | BUILT  |

## Domain 9: Token-Based Staff Access

| #   | Question                                                 | Answer                                                                                                                                                                                | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 33  | Are staff event tokens properly generated and revocable? | Yes. `generateStaffEventToken` uses `requireChef()`. Tokens have expiry. `revokeStaffEventToken` soft-revokes (sets `is_revoked: true`).                                              | BUILT  |
| 34  | Do public token-gated endpoints validate token state?    | Yes. `getStaffEventView`, `markStaffTaskComplete`, `submitStaffHours` all check token validity including revocation and expiry before proceeding.                                     | BUILT  |
| 35  | Does `submitStaffHours` validate input range?            | Yes. Validates `hoursWorked` range (0-24). `markStaffTaskComplete` validates `taskIndex` bounds.                                                                                      | BUILT  |
| 36  | Are token-gated endpoints intentionally unauthenticated? | Yes. By design for field staff who may not have app logins. Security relies on UUID unguessability + expiry + revocation. No rate limiting on lookups (defense-in-depth gap, ACCEPT). | ACCEPT |

## Domain 10: API & AI Integration

| #   | Question                                             | Answer                                                                                                                                                                                | Status |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 37  | Does the v2 staff API enforce auth and validation?   | Yes. All routes use `withApiAuth()` with scope checking. POST uses `CreateStaffBody`, PATCH uses `UpdateStaffBody.strict()`. All scoped by `chef_id: ctx.tenantId`.                   | BUILT  |
| 38  | Does v2 staff DELETE use soft delete?                | Yes. Sets `is_active: false`. Also revokes JWT sessions for the deactivated staff member.                                                                                             | BUILT  |
| 39  | Does the AI staff agent respect tenant boundaries?   | Yes. `staff-actions.ts` passes `tenantId` from agent context. All underlying actions use `requireChef()` + tenant scoping. Event lookup scoped by `tenant_id`.                        | BUILT  |
| 40  | Does the live activity board refresh from real data? | Yes. `live/page.tsx` uses `requireChef()` + `requirePro`. `getStaffActivityBoard()` reads tenant-scoped data. `StaffBoardRefresher` client component auto-refreshes every 30 seconds. | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

| #   | Item                                              | Rationale                                                                                                                 |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 36  | Token-gated staff endpoints have no rate limiting | UUID tokens are 128-bit random. Brute force infeasible. Tokens expire + revocable. Defense-in-depth gap, not exploitable. |

**Sweep score: 39/40 BUILT, 1 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All 16 pages auth-gated (chef-side with `requireChef()`, staff-portal with `requireStaff()`), all DB queries tenant-scoped, Zod validation on all critical inputs, soft delete on staff records, clock-in/out prevents impersonation, error boundary sanitized, staff AI agent tenant-bounded.

**Key fixes from this session:**

- Q3: Added `notFound()` to `staff/[id]/page.tsx` (was crashing with error boundary on invalid staff ID instead of 404).
- Q6: Added `.eq('chef_id', chef.tenantId!)` to `acknowledgeCOC` and `getCOCStatus` in `coc-actions.ts` (were operating by ID/event_id only without tenant scoping, cross-tenant risk).
