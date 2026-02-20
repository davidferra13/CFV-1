# Client Inquiry Tracking & Full Journey Notification System

## Why This Exists

Before this feature, clients submitted an inquiry and entered a black hole. There was no in-app notification system for clients (only chefs had one), no visibility into inquiry status, no pre-event reminder emails beyond 24 hours, no quote expiry warnings, and no way to add events to a calendar. Chefs were doing a lot of manual follow-up that should be handled automatically.

This feature gives clients a complete, clear picture of where they stand at every step — from first inquiry to post-event photos — without being invasive or noisy.

---

## Architecture Overview

Six interconnected layers, all built additively on top of existing infrastructure:

1. **Database migration** — extends the `notifications` table for client recipients and adds dedup-tracking columns
2. **Client notification infrastructure** — `createClientNotification()` fire-and-forget helper
3. **Client portal navigation bell** — reuses the existing chef `NotificationBell` component
4. **Journey stepper** — visual timeline showing the client's full path from inquiry to photos
5. **Enhanced email sequence** — 7-day prepare, 2-day reminder, quote expiry warning, photos-ready
6. **Calendar integration** — Google Calendar deep-link + `.ics` download (Apple Calendar / Outlook)

---

## Layer 1: Database Migration

**File:** `supabase/migrations/20260303000015_client_journey_notifications.sql`

### Changes

#### `notifications` table — `recipient_role` column

```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS recipient_role TEXT NOT NULL DEFAULT 'chef'
    CHECK (recipient_role IN ('chef', 'client'));
```

**Why one table, not two:** The existing `NotificationProvider` and `NotificationBell` components are already role-agnostic — they subscribe to `notifications WHERE recipient_id = auth.uid()`. Adding a discriminator column is sufficient to let each portal filter to its own notifications. Splitting into two tables would require duplicating the Realtime subscription logic and the bell component.

**Default `'chef'`:** All existing rows are chef notifications. The default ensures zero data migration is needed.

#### `events` table — pre-event reminder dedup tracking

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS client_reminder_7d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reminder_2d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_reminder_1d_sent_at TIMESTAMPTZ;
```

**Naming convention:** Mirrors the existing `payment_reminder_3d_sent_at` / `payment_reminder_7d_sent_at` pattern. NULL = not yet sent; populated timestamp = already sent.

**Why `client_reminder_1d` instead of date-match dedup:** The previous 24h reminder used `event_date = today` as its dedup guard. This was fragile if the cron ran twice in the same day at different times. The column-based approach is idempotent regardless of cron frequency.

#### `quotes` table — expiry warning dedup

```sql
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;
```

Tracks when the 48-hour quote expiry warning was sent. Prevents duplicate emails across cron runs.

### RLS Note

The existing `notifications` SELECT policy is `recipient_id = auth.uid()`. Clients have `auth.users` entries, so a notification with `recipient_id = client_auth_user_id` is automatically readable by that client. All inserts use the admin client (service role bypasses RLS on insert), so no insert policy changes were needed.

---

## Layer 2: Client Notification Infrastructure

### New file: `lib/notifications/client-actions.ts`

Two exports:

**`getClientAuthUserId(clientId: string): Promise<string | null>`**
Looks up `user_roles` WHERE `entity_id = clientId AND role = 'client'` to find the Supabase auth UID. Returns `null` if the client has no portal account (inquiry-only clients who haven't activated their portal yet).

**`createClientNotification(params): Promise<void>`**
1. Calls `getClientAuthUserId()` to resolve the auth UID
2. If no auth UID, returns silently (client has no portal — notification would be unreadable)
3. Calls the existing `createNotification()` with the resolved UID and `metadata.recipient_role: 'client'`
4. Never throws — all errors are swallowed. The calling code wraps in try/catch regardless.

### Modified: `lib/notifications/types.ts`

Eight new `NotificationAction` union members for client-facing events:

| Action | Category | Trigger |
|---|---|---|
| `quote_sent_to_client` | `quote` | Chef marks quote as sent |
| `event_proposed_to_client` | `event` | Chef transitions event → proposed |
| `event_confirmed_to_client` | `event` | Chef transitions event → confirmed |
| `event_reminder_7d` | `event` | Lifecycle cron, 7 days before |
| `event_reminder_2d` | `event` | Lifecycle cron, 2 days before |
| `event_reminder_1d` | `event` | Lifecycle cron, 1 day before |
| `quote_expiring_soon` | `quote` | Lifecycle cron, 48h before expiry |
| `photos_ready` | `event` | Chef uploads first photo |

Each has a corresponding `NOTIFICATION_CONFIG` entry (category, Lucide icon, `toastByDefault`).

---

## Layer 3: Client Portal Notification Bell

### Modified: `app/(client)/layout.tsx`

Wrapped the layout content with `<NotificationProvider userId={user.id}>` and `<ToastProvider />`. The `NotificationProvider` opens a Supabase Realtime subscription scoped to `recipient_id = userId`, so it receives both chef and client notifications for whoever is logged in — no code changes to the provider itself were needed.

### Modified: `components/navigation/client-nav.tsx`

Added `<NotificationBell />` to:
- Desktop sidebar bottom section (before sign-out, in a `div.mb-1`)
- Mobile header (between "Book Now" link and hamburger button)

The `NotificationBell` component is unchanged — it reads from context and works identically for both portals.

Note: `/my-inquiries` with the `ClipboardList` icon was **already present** in the `navItems` array. No inquiry nav changes were needed.

---

## Layer 4: Journey Stepper

### New file: `lib/events/journey-steps.ts`

Pure function `buildJourneySteps(params)` — takes event/quote/photo data and returns a `JourneyStep[]` array. No DB access; purely derived from data already fetched by the page.

**8 steps:**

| # | Label | Completed when |
|---|---|---|
| 1 | Inquiry Received | Always (inquiry exists) |
| 2 | Quote Sent | Event status is `accepted+` or quote transition shows it was sent |
| 3 | Quote Accepted | Event status is `accepted+` |
| 4 | Payment Received | Event status is `paid+` |
| 5 | Event Confirmed | Event status is `confirmed+` |
| 6 | Chef on the Way | Event status is `in_progress+` |
| 7 | Dinner Complete | Event status is `completed` |
| 8 | Photos Ready | `hasPhotos === true` |

**`isCurrent`:** The last step that has a `completedAt` and is not marked as `isFuture`.

### New file: `components/events/event-journey-stepper.tsx`

`'use client'` component, props: `{ steps: JourneyStep[] }`.

- **Desktop (md+):** Horizontal stepper with connector lines between nodes
- **Mobile:** Vertical stepper with connector lines running down the left column
- **Completed step:** Filled emerald circle with `Check` icon + timestamp
- **Current step:** Brand-colored pulsing circle
- **Future step:** Stone-300 empty circle, muted label

### Modified: `lib/events/client-actions.ts`

`getClientEventById()` now also fetches:
- `event_state_transitions` (to_status, transitioned_at) ordered ascending — used by `buildJourneySteps`
- Photo count from `event_photos` WHERE `deleted_at IS NULL` — used to set `hasPhotos`

### Modified: `app/(client)/my-events/[id]/page.tsx`

Added a "Your Journey" card above the Event Details card. Hidden when event is cancelled (a cancelled journey isn't useful to display).

---

## Layer 5: Enhanced Email Sequence

### New templates

| File | Subject | Trigger |
|---|---|---|
| `lib/email/templates/event-prepare.tsx` | `{Chef} is coming in 7 days — here's what to know` | 7d lifecycle cron |
| `lib/email/templates/event-reminder-2d.tsx` | `Reminder: {Occasion} is in 2 days` | 2d lifecycle cron |
| `lib/email/templates/quote-expiring.tsx` | `Your quote for {Occasion} expires in 48 hours` | Quote expiry lifecycle cron |
| `lib/email/templates/photos-ready.tsx` | `Your {Occasion} photos are ready` | Chef uploads first photo |

All use `BaseLayout` and match the existing email visual language.

### Modified: `lib/email/notifications.ts`

Added 4 new dispatcher functions:

- **`sendEventPrepareEmail(params)`** — 7-day prepare email with a prep checklist
- **`sendEventReminder2dEmail(params)`** — 2-day reminder with event details
- **`sendQuoteExpiringEmail(params)`** — 48h expiry warning with red CTA
- **`sendPhotosReadyEmail(params)`** — post-event photos notification

All follow the same pattern as existing dispatchers (subject, `sendEmail()`, Resend).

### Modified: `app/api/scheduled/lifecycle/route.ts`

**Section 5 — 7d / 2d / 1d pre-event reminders:**
- Queries events in `[paid, confirmed, in_progress]` where `event_date` is within the next 7 days
- For each event, checks the three dedup columns in descending order (7d first, then 2d, then 1d)
- Sends the appropriate email, marks the column, then `break`s (only one email per cron run per event)
- Respects the same double opt-out as existing payment reminders: chef `client_event_reminders_enabled` AND client `automated_emails_enabled`

**Section 6 — Quote expiry warnings:**
- Queries `quotes` WHERE `status = 'sent'` AND `valid_until BETWEEN now() AND now() + interval '48 hours'` AND `expiry_warning_sent_at IS NULL`
- For each quote: fetches client/chef/occasion, checks double opt-out, sends email, marks column, creates in-app notification

### Dual opt-out pattern

Both new sections respect the same two-flag pattern used throughout the lifecycle cron:
1. **Chef flag:** `chef.client_event_reminders_enabled` (or similar per-feature flag) — the chef can disable automated client emails globally
2. **Client flag:** `client.automated_emails_enabled` — the client can opt out of all automated emails

---

## Layer 6: Notification Trigger Points

Added `createClientNotification()` calls (non-blocking try/catch) at exactly five trigger points:

| File | When | Action fired |
|---|---|---|
| `lib/quotes/actions.ts` | Quote status → `sent` (inside email try/catch, after `sendQuoteSentEmail`) | `quote_sent_to_client` |
| `lib/events/transitions.ts` | Event → `proposed` | `event_proposed_to_client` |
| `lib/events/transitions.ts` | Event → `confirmed` | `event_confirmed_to_client` |
| `lib/events/photo-actions.ts` | Chef uploads a photo | `photos_ready` (every upload) + `sendPhotosReadyEmail` (first upload only) |

### First-upload gating for photos-ready email

The email fires only when `displayOrder === 0`, which is set when `lastPhoto` is null — i.e., there are currently no active photos for this event. This is a reliable first-upload gate that costs no extra DB query. Subsequent uploads fire the in-app notification only.

### Non-blocking pattern

Every trigger point wraps `createClientNotification()` in its own `try/catch` that swallows errors. Notification failure must never block or roll back the primary operation (quote transition, event transition, photo upload).

---

## Layer 7: Calendar Integration

### Design decision: deep-link vs OAuth

Google Calendar OAuth requires a project, consent screen, token refresh infrastructure, and user grant. All of that can be deferred. A prefilled Google Calendar URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) gives clients 95% of the value with zero backend complexity. The user clicks, Google pre-fills the form, the client confirms. This is the approach used here.

For Apple Calendar and Outlook, an `.ics` file download is the standard mechanism and requires no OAuth at all.

### New file: `components/events/calendar-add-buttons.tsx`

`'use client'` component with two buttons:

1. **Google Calendar** — `<a href={googleUrl} target="_blank">` where `googleUrl` is built from `buildGoogleCalendarUrl()` inside the component (no server needed, no API call)
2. **Apple / Outlook (.ics)** — `<a href={icsUrl} download>` pointing to the API endpoint below

Google Calendar URL format:
```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text={occasion}
  &dates={YYYYMMDDTHHMMSS}/{YYYYMMDDTHHMMSS}
  &details=Event booked via ChefFlow
  &location={location}
```

Times: uses `startTime` from the event if available; defaults to 6pm–9pm.

Shown only when `event.status` is in `['paid', 'confirmed', 'in_progress']`.

### New file: `app/api/calendar/event/[id]/route.ts`

`GET /api/calendar/event/{id}`

1. `requireClient()` — must be authenticated
2. Query event by `id` AND `client_id = user.entityId` — ownership check
3. Guard: status must be in `[paid, confirmed, in_progress, completed]`
4. Call `generateICS()` from `lib/scheduling/generate-ics.ts`
5. Return `text/calendar` response with `Content-Disposition: attachment; filename="{occasion}.ics"`

### New file: `lib/scheduling/generate-ics.ts`

Clean extraction of `generateICS()` and `escapeICS()` from `lib/scheduling/calendar-sync.ts` (which carries `@ts-nocheck` due to deferred Google OAuth code that can't be typed yet). The extracted file is fully typed with no compromises.

---

## Manual Testing Checklist

1. **Quote sent →** Chef marks quote as sent → client's notification bell badge increments; panel shows "New quote from [Chef]"
2. **Event proposed →** Chef proposes event → client bell shows "New event proposal"
3. **Event confirmed →** Chef confirms event → client bell shows "Event confirmed"
4. **Journey stepper →** Client visits `/my-events/[id]` → "Your Journey" card shows with appropriate steps highlighted
5. **7d prepare email →** Set an event to `confirmed` with `event_date = today + 7`; run lifecycle cron manually → `sendEventPrepareEmail` fires; `client_reminder_7d_sent_at` is set; second cron run does nothing
6. **2d reminder email →** Same pattern with `event_date = today + 2`
7. **1d reminder email →** Same pattern with `event_date = today + 1`; verify `client_reminder_1d_sent_at` is used instead of old date-match dedup
8. **Quote expiry warning →** Set a quote `valid_until = now() + 36h, status='sent'`; run lifecycle cron → expiry warning email fired; `expiry_warning_sent_at` set; second run skipped
9. **Photos ready →** Chef uploads first photo → client bell shows "Your event photos are ready"; `sendPhotosReadyEmail` fires; second upload increments bell again but no second email
10. **Google Calendar →** Click "Google Calendar" button on event detail → new tab opens with prefilled Google Calendar event form
11. **ICS download →** Click "Apple / Outlook (.ics)" → browser downloads `{occasion}.ics`; open in Apple Calendar → event appears with correct title, date, location
12. **Unauthenticated ICS →** `GET /api/calendar/event/{id}` without session → 401
13. **Wrong client ICS →** `GET /api/calendar/event/{id}` with a different client's session → 404 (ownership check)

---

## Files Changed

### New files
- `supabase/migrations/20260303000015_client_journey_notifications.sql`
- `lib/notifications/client-actions.ts`
- `lib/scheduling/generate-ics.ts`
- `lib/events/journey-steps.ts`
- `components/events/event-journey-stepper.tsx`
- `components/events/calendar-add-buttons.tsx`
- `lib/email/templates/event-prepare.tsx`
- `lib/email/templates/event-reminder-2d.tsx`
- `lib/email/templates/quote-expiring.tsx`
- `lib/email/templates/photos-ready.tsx`
- `app/api/calendar/event/[id]/route.ts`
- `docs/client-inquiry-journey-notifications.md` (this file)

### Modified files
- `lib/notifications/types.ts` — 8 new action types + NOTIFICATION_CONFIG entries
- `app/(client)/layout.tsx` — NotificationProvider + ToastProvider
- `components/navigation/client-nav.tsx` — NotificationBell in desktop + mobile
- `lib/events/client-actions.ts` — added transitions + hasPhotos to getClientEventById
- `app/(client)/my-events/[id]/page.tsx` — journey stepper card + CalendarAddButtons
- `lib/email/notifications.ts` — 4 new dispatcher functions
- `app/api/scheduled/lifecycle/route.ts` — Section 5 (reminders) + Section 6 (expiry warnings)
- `lib/quotes/actions.ts` — createClientNotification after quote sent
- `lib/events/transitions.ts` — createClientNotification for proposed + confirmed
- `lib/events/photo-actions.ts` — expanded event query + photos-ready notification + email
