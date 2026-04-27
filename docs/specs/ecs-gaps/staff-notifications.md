# ECS Gap: Staff In-App Notifications

> Source: ECS Scorecard 2026-04-27 | User Type: Staff (86/100) | Dimension: Polish (16/20)

## Problem
No in-app messaging or notification system for staff. No way to receive alerts about schedule changes or new task assignments.

## Spec
1. Create `app/(staff)/staff-notifications/page.tsx` listing staff notifications
2. Create server action `getMyStaffNotifications` in `lib/staff/staff-portal-actions.ts`
3. Notification types: new_task_assigned, schedule_changed, shift_reminder, message_from_chef
4. Use existing SSE infrastructure (`useSSE` hook) for real-time push
5. Add notification bell with unread count to staff nav
6. Store in existing notification tables or create `staff_notifications` if needed

## Pattern
Read `app/(chef)/network/notifications/page.tsx` for notification list pattern.

## Acceptance
- Staff see notification list
- Unread badge on bell icon
- Real-time via SSE
- Chef can trigger notifications from staff management
