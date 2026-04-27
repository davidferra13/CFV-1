# ECS Gap: Partner Change Request Notifications

> Source: ECS Scorecard 2026-04-27 | User Type: Partner (86/100) | Dimension: Polish (16/20)

## Problem
Partners have no way to know when chef approves/rejects a location change request except manually checking the location detail page.

## Spec
1. When chef approves/rejects a change request, create a notification for the partner
2. Show notification count on partner dashboard
3. Option: send email notification to partner on change request status change
4. Add a "Recent Activity" or "Notifications" section to partner dashboard

## Files
- `lib/partners/location-change-requests.ts` (where approval/rejection happens)
- `app/(partner)/partner/dashboard/page.tsx`

## Acceptance
- Partner notified when change request is approved or rejected
- Visible on dashboard without navigating to location detail
- Email notification optional but preferred
