# Circle-First Communication - Implementation Complete

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`
**Status:** All 5 phases implemented
**Goal:** Make the Dinner Circle the single source of truth for all chef-client communication. Email becomes a notification layer that points back to the circle, not a parallel channel.

---

## Current State (the problem)

- 60+ email functions in `lib/email/notifications.ts` fire independently
- The circle gets lifecycle updates (menu shared, quote sent, payment received, etc.)
- Emails send the SAME information separately (quote email, invoice email, confirmation email)
- Client gets the same update twice in different formats, in different places
- Inbound email replies (Gmail sync) don't appear in the circle
- Chef has to check email AND circle for the full conversation history
- After the event, there's no unified record - it's scattered across emails and circle messages

## Target State (what we're building)

```
Every chef-client interaction flows through the circle.
Email is just the doorbell - it tells you something happened and links you there.
The circle is the room where everything lives.
```

---

## Phase 1: Circle-Canonical Messages (the foundation)

**What changes:** Lifecycle emails stop sending standalone content. Instead, the circle gets the rich message, and the email becomes a short notification with a "View in your Dinner Circle" CTA.

### 1A. New message type: `notification`

Add a new `message_type` to `hub_messages` for rich, structured notifications that replace standalone emails.

**Migration:** `20260330000062_hub_notification_messages.sql`

```sql
-- Expand message_type CHECK constraint to include 'notification'
ALTER TABLE hub_messages DROP CONSTRAINT IF EXISTS hub_messages_message_type_check;
ALTER TABLE hub_messages ADD CONSTRAINT hub_messages_message_type_check
  CHECK (message_type IN (
    'text', 'image', 'system', 'poll',
    'rsvp_update', 'menu_update', 'note', 'photo_share',
    'notification'
  ));

-- Add notification_type for rendering (quote_sent, payment_received, etc.)
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS notification_type TEXT;

-- Add action_url for CTA buttons inside notification cards
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Add action_label for CTA button text
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS action_label TEXT;
```

**Why a new type, not just `system`?** System messages are gray pills ("Sarah joined"). Notifications are rich cards with structured data, CTAs, and styled rendering (quote summary, payment confirmation, invoice link). They need distinct UI treatment.

### 1B. Notification card component

**New file:** `components/hub/hub-notification-card.tsx`

Renders `message_type = 'notification'` messages as styled cards inside the chat feed. Each `notification_type` gets its own layout:

| notification_type  | Card Content                                             | CTA                   |
| ------------------ | -------------------------------------------------------- | --------------------- |
| `quote_sent`       | Line items summary, total, deposit required, expiry date | "View & Accept Quote" |
| `quote_accepted`   | "Quote accepted!" + total confirmed                      | "View Event"          |
| `payment_received` | Amount, method, remaining balance                        | "View Invoice"        |
| `event_confirmed`  | Date, time, location, guest count                        | "View Event Details"  |
| `event_completed`  | Thank you + summary stats                                | "Leave a Review"      |
| `menu_shared`      | Menu name, course count, dietary tags                    | "View Menu"           |
| `photos_ready`     | Thumbnail grid (first 4 photos)                          | "View All Photos"     |
| `contract_ready`   | Contract name, signature status                          | "Review & Sign"       |
| `invoice_sent`     | Amount due, due date, payment link                       | "Pay Now"             |

Each card uses `system_metadata` JSONB for structured data (amounts, dates, counts). The `action_url` is a deep link into the app or a public-access URL.

### 1C. Post-to-circle-first helper

**New file:** `lib/hub/circle-first-notify.ts`

Single entry point that replaces the current pattern of "send email + post to circle separately."

```typescript
export async function circleFirstNotify(input: {
  // Where
  eventId?: string
  inquiryId?: string
  tenantId: string

  // What
  notificationType: NotificationType
  body: string
  metadata: Record<string, unknown>
  actionUrl?: string
  actionLabel?: string

  // Fallback (if no circle exists yet)
  fallbackEmail?: {
    to: string
    subject: string
    template: React.ReactElement
  }
}): Promise<void>
```

**Logic:**

1. Find the circle via `getCircleForContext({ eventId, inquiryId })`
2. If circle exists:
   a. Post the notification message to the circle
   b. Send a SHORT notification email to all members: "{Chef name} posted an update in your Dinner Circle" + "View Update" CTA button linking to the circle
3. If no circle exists (legacy events, edge cases):
   a. Send the full standalone email as fallback (same as current behavior)
   b. Log a warning so we can track how often this happens

This is the ONLY function that lifecycle code calls. It replaces both `postXToCircle()` AND `sendXEmail()` in one call.

### 1D. Migrate lifecycle hooks to circle-first

**Files modified:** Each lifecycle trigger point switches from dual-send to `circleFirstNotify()`.

| Trigger Location                                     | Current Pattern                                                    | New Pattern                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `lib/quotes/actions.ts` (transitionQuote to 'sent')  | `sendQuoteSentEmail()` + `postQuoteSentToCircle()`                 | `circleFirstNotify({ notificationType: 'quote_sent', ... })`       |
| `lib/quotes/client-actions.ts` (acceptQuote)         | `sendQuoteAcceptedChefEmail()` + `postQuoteAcceptedToCircle()`     | `circleFirstNotify({ notificationType: 'quote_accepted', ... })`   |
| `app/api/webhooks/stripe/route.ts` (payment success) | `sendPaymentConfirmationEmail()` + `postPaymentReceivedToCircle()` | `circleFirstNotify({ notificationType: 'payment_received', ... })` |
| `lib/events/transitions.ts` (confirmed)              | `sendEventConfirmedEmail()` + `postEventConfirmedToCircle()`       | `circleFirstNotify({ notificationType: 'event_confirmed', ... })`  |
| `lib/events/transitions.ts` (completed)              | `sendEventCompletedEmail()` + `postEventCompletedToCircle()`       | `circleFirstNotify({ notificationType: 'event_completed', ... })`  |
| `lib/menus/actions.ts` (menu shared)                 | `sendFrontOfHouseMenuReadyEmail()` + `postMenuSharedToCircle()`    | `circleFirstNotify({ notificationType: 'menu_shared', ... })`      |
| `lib/events/photo-actions.ts` (first photo)          | `sendPhotosReadyEmail()` + `postPhotosToCircle()`                  | `circleFirstNotify({ notificationType: 'photos_ready', ... })`     |

**Chef-only notifications stay as email.** Things like `sendNewInquiryChefEmail()`, `sendPaymentReceivedChefEmail()`, `sendQuoteAcceptedChefEmail()` are internal alerts to the chef. These don't go in the client-facing circle. They stay as standalone emails.

**What we're NOT touching (yet):**

- Reminder emails (14d, 7d, 2d, 1d before event) - these are time-based nudges, not conversation items
- Post-event drip sequence (thank you 3d, review request 7d, referral ask 14d) - these are marketing automation, not circle content
- Gift card / referral / availability signal emails - different context entirely

---

## Phase 2: Inbound Email Routing (close the loop)

**What changes:** When a client replies to any ChefFlow email, their reply appears in the Dinner Circle as a message. The chef sees it in one place.

### 2A. Reply-to address routing

**Current state:** Emails sent via Resend use `hello@cheflowhq.com` as FROM. Client replies go to that address and are either lost or hit a generic inbox.

**New approach:** Each circle gets a unique reply-to address.

**Option A (simple, recommended): Use Gmail sync**

The chef's Gmail already syncs via `lib/gmail/sync.ts`. When a client replies to a ChefFlow email:

1. The reply lands in the chef's Gmail inbox
2. Gmail sync picks it up on next sync cycle
3. Gmail sync already identifies the inquiry/event thread via subject matching + GOLDMINE
4. **NEW:** After identifying the thread, also post the email body as a message in the associated circle

**File modified:** `lib/gmail/sync.ts`

In the existing thread reply handler (around line 580+), add:

```typescript
// After linking reply to inquiry, also post to circle
try {
  const circle = await getCircleForContext({
    inquiryId: inquiry.id,
    eventId: inquiry.event_id,
  })
  if (circle) {
    const clientProfile = await findOrCreateClientHubProfile({
      email: email.from.email,
      name: email.from.name,
      circleGroupId: circle.groupId,
    })
    await postHubMessage({
      groupId: circle.groupId,
      profileToken: clientProfile.profileToken,
      body: `[via email]\n\n${cleanedEmailBody}`,
      // No notification to circle members - chef already sees it in Gmail
    })
  }
} catch (err) {
  console.error('[non-blocking] Failed to post email reply to circle', err)
}
```

**New helper:** `lib/hub/email-to-circle.ts`

```typescript
export async function findOrCreateClientHubProfile(input: {
  email: string
  name: string
  circleGroupId: string
}): Promise<{ profileToken: string; profileId: string }>
```

Finds existing hub_guest_profile by email, or creates one and adds them as a member of the circle. Returns the profile token for posting.

**Email body cleaning:** Strip signatures, quoted text, and HTML. Extract just the reply content. Use the existing email parsing infra in `scripts/email-references/deterministic-extractors.ts` patterns.

### 2B. Visual treatment for email-sourced messages

Messages posted via email routing get a subtle "via email" badge in the circle UI, so the chef knows the client replied by email rather than directly in the circle.

**File modified:** `components/hub/hub-message.tsx`

Check for `[via email]` prefix in body (or better, a `metadata.source: 'email'` field on the message) and render a small mail icon + "via email" tag below the message bubble.

**Migration addition to 20260330000062:**

```sql
-- Track message source for display purposes
ALTER TABLE hub_messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'circle'
  CHECK (source IN ('circle', 'email', 'remy', 'system'));
```

---

## Phase 3: Notification Intelligence (reduce noise, increase signal)

### 3A. Notification preferences per circle

**Migration:** `20260330000063_member_notification_prefs.sql`

```sql
-- Per-member notification preferences
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
  ADD COLUMN IF NOT EXISTS digest_mode TEXT DEFAULT 'instant'
    CHECK (digest_mode IN ('instant', 'hourly', 'daily'));
```

### 3B. Digest batching

**New file:** `lib/hub/circle-digest.ts`

For members with `digest_mode = 'hourly'` or `'daily'`:

- Don't send individual notification emails
- Instead, accumulate messages and send a single digest email
- Digest template: list of new messages since last digest, grouped by circle
- Trigger: cron job (Vercel cron or Supabase pg_cron)

**New file:** `lib/email/templates/circle-digest.tsx`

Digest email template:

- Header: "You have {N} new messages in {circle name}"
- Each message: author avatar + name + first 100 chars + timestamp
- Single CTA: "Open Dinner Circle"
- Footer: "Change notification settings" link

### 3C. Quiet hours enforcement

**File modified:** `lib/hub/circle-notification-actions.ts`

In `notifyCircleMembers()`, before sending email:

```typescript
if (member.quiet_hours_start && member.quiet_hours_end) {
  const now = getCurrentTimeInMemberTimezone(member)
  if (isWithinQuietHours(now, member.quiet_hours_start, member.quiet_hours_end)) {
    // Queue for digest instead of sending now
    continue
  }
}
```

Push notifications respect quiet hours too. Only `notification_type` values marked as urgent bypass quiet hours: `payment_received`, `event_confirmed`, `arrival_notification`.

### 3D. Smart notification grouping

**File modified:** `lib/hub/circle-notification-actions.ts`

Current: every circle message triggers a notification check.
New: batch messages from the same author within 2 minutes into a single notification.

"Chef Sarah sent 3 messages in your Dinner Circle" instead of 3 separate emails.

---

## Phase 4: Client Quick Actions (structured input)

### 4A. Quick action cards in circle

**New file:** `components/hub/hub-quick-actions.tsx`

Below the message input, show contextual quick-action chips based on the event's current state:

| Event State                    | Quick Actions Available                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| Quote sent (awaiting response) | "Accept Quote", "Ask a Question"                                       |
| Confirmed (pre-event)          | "Update Guest Count", "Update Dietary Needs", "Share Location Details" |
| Day-of                         | "Running Late", "On My Way", "Change of Plans"                         |
| Completed                      | "Leave Review", "Book Again", "Share Photos"                           |

Each chip opens a mini-form or posts a structured message.

### 4B. Guest count update action

**New file:** `lib/hub/client-quick-actions.ts`

```typescript
export async function postGuestCountUpdate(input: {
  groupId: string
  profileToken: string
  newCount: number
  note?: string
}): Promise<void>
```

Posts a `notification` type message: "Guest count updated to {N}" with optional note. Also updates the event's `guest_count` field if the client has permission (or flags it for chef approval).

### 4C. Dietary update action

```typescript
export async function postDietaryUpdate(input: {
  groupId: string
  profileToken: string
  guestName: string
  restrictions: string[]
  allergies: string[]
  note?: string
}): Promise<void>
```

Posts a structured message and updates the guest's dietary profile. Critical for safety (allergies).

### 4D. "Running late" quick message

Pre-formatted message with ETA selector (5 min, 15 min, 30 min, custom). Posts to circle with a clock icon. Chef gets an instant push notification (bypasses quiet hours).

---

## Phase 5: Circle as Event Archive

### 5A. Post-event circle view

**New file:** `components/hub/circle-archive-view.tsx`

After `event.status = 'completed'`, the circle switches to archive mode:

- Read-only message history (can still post new messages for follow-up)
- Collapsible timeline: shows lifecycle milestones (inquiry, quote, payment, event, photos)
- Photo gallery section (pulls from hub_media)
- Event summary card at top (date, location, guest count, menu)
- "Book Again" CTA

### 5B. Client event history via circles

**File modified:** `app/(client)/my-events/page.tsx`

Client's "My Events" page links to the circle for each event instead of a separate event detail page. The circle IS the event detail, with the full conversation history.

### 5C. Repeat booking from circle

**New action in** `lib/hub/client-quick-actions.ts`:

```typescript
export async function requestRepeatBooking(input: {
  groupId: string
  profileToken: string
  preferredDate?: string
  sameMenu: boolean
  guestCount?: number
  note?: string
}): Promise<void>
```

Posts a structured "Repeat Booking Request" notification to the circle. Chef receives it as an actionable card in their circle view with a "Create Event" CTA that pre-fills from the previous event's data.

---

## Implementation Order

```
Phase 1A + 1B + 1C  (3-4 hours)  - Foundation: migration, component, helper
Phase 1D             (2-3 hours)  - Migrate 7 lifecycle hooks to circle-first
Phase 2A + 2B       (2-3 hours)  - Inbound email routing into circle
Phase 3A + 3B       (2-3 hours)  - Notification prefs + digest
Phase 3C + 3D       (1-2 hours)  - Quiet hours + smart grouping
Phase 4A-4D         (3-4 hours)  - Client quick actions
Phase 5A-5C         (3-4 hours)  - Archive view + repeat booking
```

Total: ~16-23 hours across 5 phases. Each phase is independently shippable.

---

## Files Created (new)

| File                                                               | Purpose                                            |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| `supabase/migrations/20260330000062_hub_notification_messages.sql` | notification message type + source column          |
| `supabase/migrations/20260330000063_member_notification_prefs.sql` | quiet hours, digest mode, per-channel toggles      |
| `components/hub/hub-notification-card.tsx`                         | Rich notification cards in chat feed               |
| `components/hub/hub-quick-actions.tsx`                             | Contextual quick-action chips                      |
| `components/hub/circle-archive-view.tsx`                           | Post-event archive mode                            |
| `lib/hub/circle-first-notify.ts`                                   | Single entry point for circle-first notifications  |
| `lib/hub/email-to-circle.ts`                                       | Route inbound email replies into circle            |
| `lib/hub/circle-digest.ts`                                         | Digest batching logic                              |
| `lib/hub/client-quick-actions.ts`                                  | Guest count, dietary, running late, repeat booking |
| `lib/email/templates/circle-digest.tsx`                            | Digest email template                              |
| `lib/email/templates/circle-notification.tsx`                      | Short "you have an update" notification email      |

## Files Modified

| File                                     | Change                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `lib/quotes/actions.ts`                  | Replace dual-send with `circleFirstNotify()`       |
| `lib/quotes/client-actions.ts`           | Replace dual-send with `circleFirstNotify()`       |
| `app/api/webhooks/stripe/route.ts`       | Replace dual-send with `circleFirstNotify()`       |
| `lib/events/transitions.ts`              | Replace dual-send with `circleFirstNotify()`       |
| `lib/menus/actions.ts`                   | Replace dual-send with `circleFirstNotify()`       |
| `lib/events/photo-actions.ts`            | Replace dual-send with `circleFirstNotify()`       |
| `lib/gmail/sync.ts`                      | Route thread replies into circle                   |
| `lib/hub/circle-notification-actions.ts` | Quiet hours, smart grouping, digest routing        |
| `components/hub/hub-message.tsx`         | Render notification cards, "via email" badge       |
| `components/hub/hub-feed.tsx`            | Quick actions bar, archive mode toggle             |
| `app/(client)/my-events/page.tsx`        | Link to circle as event detail                     |
| `lib/hub/types.ts`                       | New types for notification messages, quick actions |

## What We're NOT Building

- **Chef-to-chef circle:** This is client-facing only. Chef internal comms stay as-is.
- **SMS integration:** Email and push are sufficient. SMS adds cost and complexity for marginal gain.
- **AI-generated circle summaries:** Violates Formula > AI. The timeline view IS the summary.
- **Video/voice in circle:** Out of scope. Text, images, files, polls cover all use cases.
- **Public circle discovery:** Circles are private by default. No directory, no search, no social network features.
