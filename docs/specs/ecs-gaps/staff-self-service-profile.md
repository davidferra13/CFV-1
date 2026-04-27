# ECS Gap: Staff Self-Service Profile

> Source: ECS Scorecard 2026-04-27 | User Type: Staff (86/100) | Dimension: Flow Continuity (18/20)

## Problem
Staff cannot update their own profile (name, phone, email, availability). They must ask the chef to do it.

## Spec
1. Create `app/(staff)/staff-profile/page.tsx` with a self-service profile form
2. Fields: display name, phone number, email (read-only or with verification), availability preferences
3. Create server action `updateMyStaffProfile` in `lib/staff/staff-portal-actions.ts`
4. Gate with `requireStaff()`, scope to the staff member's own record
5. Add "My Profile" to the staff nav (`components/staff/staff-nav.tsx`)

## Pattern
Read `app/(partner)/partner/profile/page.tsx` for partner self-service profile pattern. Adapt for staff.

## Acceptance
- Staff can edit their own name and phone
- Email changes require verification or are read-only
- Profile link in staff nav
- Auth-gated to own record only
- Dark theme matching staff portal
