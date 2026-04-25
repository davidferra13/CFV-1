# Codex Task: Circle Reminder Cascade (Day-of Notifications)

**Status:** ready-to-build
**Scope:** 1 type edit, 1 cron file edit, 0 new files
**Risk:** LOW (additive notification, non-blocking, no existing behavior changes)
**Dependencies:** None

---

## Problem

The lifecycle cron (`app/api/scheduled/lifecycle/route.ts`) sends email reminders at 30d/14d/7d/2d/1d before events, but these only go to the client via direct email. Dinner Circle members (other guests, co-hosts) get zero pre-event notifications. The `circleFirstNotify` infrastructure exists and works but is not called from the lifecycle cron.

A high-value repeat client with multiple upcoming dinners has no passive visibility into event state through the circle. They have to text their chef to ask "is tomorrow still happening?"

## What to Build

Wire the existing 1-day reminder in the lifecycle cron to also post a notification to the Dinner Circle via `circleFirstNotify`. Add one new notification type.

---

## Task 1: Add Notification Type

**File to edit:** `lib/hub/types.ts`

Find the `HubNotificationType` type definition. It is a string union type. Add `'event_reminder'` to it.

**Current value (approximately):**

```typescript
export type HubNotificationType =
  | 'quote_sent'
  | 'quote_accepted'
  | 'payment_received'
  | 'event_confirmed'
  | 'event_completed'
  | 'menu_shared'
  | 'photos_ready'
  | 'contract_ready'
  | 'invoice_sent'
  | 'guest_count_updated'
  | 'dietary_updated'
  | 'running_late'
  | 'repeat_booking_request'
```

**Add to the end:**

```typescript
  | 'event_reminder'
```

---

## Task 2: Add Label in circle-first-notify.ts

**File to edit:** `lib/hub/circle-first-notify.ts`

Find the `NOTIFICATION_LABELS` object (around line 20). Add one entry:

```typescript
  event_reminder: 'Event Reminder',
```

Add it at the end of the object, before the closing brace.

---

## Task 3: Wire circleFirstNotify into Lifecycle Cron

**File to edit:** `app/api/scheduled/lifecycle/route.ts`

### Step 3a: Add import

At the top of the file, add this import:

```typescript
import { circleFirstNotify } from '@/lib/hub/circle-first-notify'
```

### Step 3b: Add circle notification counter

In the `results` object (around line 59), add:

```typescript
circleReminders: 0,
```

### Step 3c: Post to circle after 1-day reminder email

Find **Section 5** (the pre-event reminder cascade). Within that section, find where the 1-day reminder email is sent. It will be inside a conditional block that checks for the 1-day threshold (`1` day). After the email is sent successfully for a 1-day reminder, add a non-blocking `circleFirstNotify` call.

**The code to add** (inside a try/catch, AFTER the 1-day email send succeeds):

```typescript
// Post to Dinner Circle (non-blocking)
try {
  await circleFirstNotify({
    eventId: event.id,
    notificationType: 'event_reminder',
    body: `Reminder: Your dinner is tomorrow, ${tomorrowFormatted}. ${event.guest_count ? event.guest_count + ' guests expected.' : ''}`,
    actionUrl: `/e/${event.share_token || ''}`,
    actionLabel: 'View Event Details',
  })
  results.circleReminders++
} catch (circleErr) {
  // Non-blocking: circle notification failure must not affect the cron
  console.error(`[lifecycle] Circle reminder failed for event ${event.id}:`, circleErr)
}
```

**Important context for finding the right location:**

The lifecycle cron iterates over events and checks time thresholds (30d, 14d, 7d, 2d, 1d). The 1-day threshold will be the tightest check. Look for where `threshold === 1` or a comparison that identifies "1 day before event". The circle notification goes right after the email send for that specific threshold.

**If you cannot identify the exact 1-day threshold location:** Look for references to `event_reminder_1d` or `_1d_sent_at` or `reminder-1d` in the file. The 1-day dedup column is `client_reminder_1d_sent_at`.

### Step 3d: Format the date

You need `tomorrowFormatted` for the notification body. Use the event's `event_date` field. Format it as a readable date string. Look at how existing code in the file formats dates and follow the same pattern. A simple approach:

```typescript
const tomorrowFormatted = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})
```

Define this variable inside the 1-day threshold block, before the circleFirstNotify call.

---

## What NOT to Do

- Do NOT modify the existing email reminder logic (it stays as-is)
- Do NOT add circle notifications for 30d/14d/7d/2d thresholds (only 1-day)
- Do NOT create any new files
- Do NOT create any new database tables or columns
- Do NOT modify the event progression cron (`app/api/cron/event-progression/route.ts`) - that is a different file
- Do NOT use em dashes anywhere
- Do NOT make `circleFirstNotify` failure block the cron (always wrap in try/catch)

---

## Verification

After making changes:

1. Run `npx tsc --noEmit --skipLibCheck` and fix any type errors
2. Confirm `HubNotificationType` includes `'event_reminder'`
3. Confirm `NOTIFICATION_LABELS` has the `event_reminder` key
4. Confirm the import of `circleFirstNotify` is at the top of the lifecycle route
5. Confirm the circleFirstNotify call is wrapped in try/catch
6. Confirm the circleFirstNotify call is only in the 1-day threshold block
