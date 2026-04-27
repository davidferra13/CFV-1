# ECS Gap: Staff Offline Resilience

> Source: ECS Scorecard 2026-04-27 | User Type: Staff (86/100) | Dimension: Polish (16/20)

## Problem
Staff are often on phones in kitchens with spotty connectivity. No offline detection, no queued operations, no reconnect handling. The kiosk has offline queues but the staff portal does not.

## Spec
1. Create `components/staff/offline-detector.tsx` using `navigator.onLine` + `online`/`offline` events
2. Show a fixed banner at top: "You're offline. Changes will sync when reconnected." (amber background)
3. For task completion (the most critical staff action): queue in localStorage when offline, replay when back online
4. Pattern: copy from `lib/devices/offline-queue.ts` (kiosk offline queue) and adapt for staff task mutations

## Acceptance
- Amber banner appears when offline
- Task completions queue locally and replay on reconnect
- No data loss on connectivity drop
- Banner dismisses automatically when back online
