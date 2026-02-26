# Notification System

## What Changed

Added a complete real-time notification system for the chef portal. Chefs now get persistent, categorized notifications for everything happening across their business - delivered via a bell icon in the nav and optional toast popups for time-sensitive events.

## Why

Previously, chefs had to manually check each section (inquiries, quotes, events, chat, payments) to know what was happening. The queue system helped prioritize work, but there was no real-time alerting or notification history. A chef running a business needs to know immediately when a client accepts a proposal or a payment fails - without being overwhelmed by noise.

## Design Philosophy

**Quiet by default, always available.** The bell icon sits in the nav header with an unread badge count. Click it to see everything. Toast notifications only appear for truly time-sensitive events (new inquiries, payments, client actions). No modals, no sounds, no blocking UI.

## Architecture

### Data Flow

```
Action happens (event transition, payment, etc.)
  -> createNotification() called as non-blocking side effect
    -> Row inserted into notifications table
      -> Supabase Realtime broadcasts INSERT to subscribed clients
        -> NotificationProvider receives event
          -> Badge count increments
          -> Toast fires (if enabled for that category)
```

### Database (Migration: 20260221000003)

**`notifications`** - Persistent notification history

- Tenant-scoped, recipient-scoped
- Classified by category (inquiry/quote/event/payment/chat/client/system) and action (new_inquiry, payment_received, etc.)
- Tracks read_at and archived_at for state management
- Links to related entities (event_id, inquiry_id, client_id) for context
- action_url for click-through navigation
- Partial indexes on unread and non-archived for fast queries
- RLS: recipients read own, chefs read tenant, no hard deletes

**`notification_preferences`** - Per-category toast toggles

- Per-user, per-category on/off for toast notifications
- Missing row = toast enabled (default behavior from NOTIFICATION_CONFIG)

**`get_unread_notification_count()`** - SQL function for badge count

**Realtime** enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`

### Server Actions (lib/notifications/actions.ts)

- `createNotification()` - Admin client, used by other actions as side effect
- `getNotifications()` - Paginated fetch for panel
- `getUnreadCount()` - Badge count via RPC
- `markAsRead()` / `markAllAsRead()` - State updates
- `archiveNotification()` - Soft remove
- `getNotificationPreferences()` / `updateNotificationPreference()` - Preferences CRUD
- `getChefAuthUserId()` - Resolves tenant_id to auth_user_id for webhook contexts

### Real-time (lib/notifications/realtime.ts)

Uses `postgres_changes` on the notifications table filtered by `recipient_id`. Same pattern as the chat real-time module. Returns an unsubscribe function for cleanup.

### UI Components (components/notifications/)

- **ToastProvider** - Sonner `<Toaster>` configured for ChefFlow's design system
- **NotificationProvider** - Context that manages unread count, real-time subscription, and toast display
- **NotificationBell** - Bell icon with red badge, toggles dropdown panel
- **NotificationPanel** - Dropdown showing recent notifications with category icons, relative timestamps, unread dots, mark-all-read

### Nav Integration (components/navigation/chef-nav.tsx)

Bell appears in three places:

1. **Desktop expanded sidebar** - Next to the collapse toggle in the header
2. **Desktop collapsed/rail mode** - Below the expand toggle, above nav items
3. **Mobile top bar** - Between the logo and hamburger menu

### Integration Points

Notifications are created as **non-blocking side effects** (try/catch, console.error on failure) at:

1. **Event transitions** (lib/events/transitions.ts) - Client accepts proposal, payment received, client cancels
2. **Stripe webhooks** (app/api/webhooks/stripe/route.ts) - Payment succeeded/failed, refund processed, dispute created

Pattern follows the existing `postEventSystemMessage()` approach at transitions.ts:178.

## Notification Categories & Actions

| Category | Actions                                                             | Toast by Default               |
| -------- | ------------------------------------------------------------------- | ------------------------------ |
| inquiry  | new_inquiry, inquiry_reply, inquiry_expired                         | Yes (except expired)           |
| quote    | quote_accepted, quote_rejected, quote_expiring                      | Yes (except expiring)          |
| event    | proposal_accepted, event_paid, event_completed, event_cancelled     | Yes (except completed)         |
| payment  | payment_received, payment_failed, refund_processed, dispute_created | Always                         |
| chat     | new_message                                                         | No (has its own unread system) |
| client   | client_signup, review_submitted                                     | Yes                            |
| system   | system_alert                                                        | Yes                            |

## Files Created

| File                                                 | Purpose                             |
| ---------------------------------------------------- | ----------------------------------- |
| supabase/migrations/20260221000003_notifications.sql | Database schema                     |
| lib/notifications/types.ts                           | Type definitions and display config |
| lib/notifications/actions.ts                         | Server actions (CRUD)               |
| lib/notifications/realtime.ts                        | Real-time subscription              |
| components/notifications/toast-provider.tsx          | Sonner toast config                 |
| components/notifications/notification-provider.tsx   | Context + real-time + toast logic   |
| components/notifications/notification-bell.tsx       | Bell button with badge              |
| components/notifications/notification-panel.tsx      | Dropdown notification list          |

## Files Modified

| File                               | Change                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------ |
| app/(chef)/layout.tsx              | Added ToastProvider + NotificationProvider wrapping                      |
| components/navigation/chef-nav.tsx | Added NotificationBell to desktop header, rail mode, and mobile top bar  |
| lib/events/transitions.ts          | Added non-blocking notification creation on client-initiated transitions |
| app/api/webhooks/stripe/route.ts   | Added non-blocking notifications for payment/refund/dispute events       |
| package.json                       | Added `sonner` dependency                                                |

## Post-Implementation Steps

1. **Apply migration**: `npx supabase db push --linked` (requires user approval)
2. **Regenerate types**: `npx supabase gen types typescript --linked > types/database.ts`
3. **Remove `as any` casts** in lib/notifications/actions.ts after types are regenerated
4. **Future integrations** (incremental, same pattern):
   - Inquiry creation/replies (lib/inquiries/actions.ts)
   - Quote accepted/rejected (lib/quotes/actions.ts)
   - Client signup (lib/clients/actions.ts)
   - Review submitted (lib/reviews/actions.ts)

## How It Connects

- Follows the **non-blocking side effect** pattern established by chat system messages
- Uses **Supabase Realtime** infrastructure already in place for chat
- Respects **tenant isolation** at the database level (same RLS patterns as all other tables)
- **AI policy compliant** - notifications are informational displays, not autonomous actions
- Fits within the **defense-in-depth** model - server actions check auth, RLS enforces at DB level
