# Gmail Send, Notifications, Schedule Holds — Reflection

**Date:** 2026-02-17
**Scope:** Three interconnected features that close the inquiry-to-response loop

---

## What Changed

### 1. Outbound Gmail Send — Full Correspondence Pipeline

**Problem:** The app could draft AI responses but had no way to send them to clients through Gmail. The OAuth scope was read-only.

**What was built:**

#### `lib/gmail/client.ts` — New send functions
- `sendEmail(accessToken, options)` — Composes an RFC 2822 email, encodes to URL-safe base64, sends via Gmail API `messages.send` endpoint
- `getMessageHeaders(accessToken, messageId)` — Fetches `Message-Id` and `Subject` headers from a Gmail message for reply threading
- Supports `In-Reply-To` and `References` headers for proper Gmail thread linking
- Supports `threadId` to keep replies in the same Gmail thread

#### `lib/gmail/actions.ts` — New server actions
- `createDraftMessage(input)` — Creates a message record in `draft` status, ready for chef review
- `approveAndSendMessage(messageId)` — The chef's "send" action. Fetches the draft, gets a Gmail access token, finds threading info from the last inbound message, sends via Gmail API, updates message status to `sent`, and updates the inquiry's next-action tracking
- `updateDraftMessage(messageId, updates)` — Chef edits the AI draft before sending
- `getMessagesForInquiry(inquiryId)` — Full email thread ordered chronologically
- `deleteDraftMessage(messageId)` — Remove unwanted drafts

#### `components/inquiries/inquiry-response-composer.tsx` — New UI component
- "Generate Draft" button calls `draftResponseForInquiry()` (the ACE engine)
- Shows lifecycle state, email stage, confidence level, pricing permission, missing data
- Displays review flags (escalation, pricing violations, forbidden phrases)
- Editable subject and body fields
- "Approve & Send" creates the message record and sends via Gmail in one flow
- "Regenerate" and "Discard" options
- Guards: no Gmail = info message, no client email = preview only

#### `components/settings/connected-accounts.tsx` — Updated OAuth scope
- Now requests both `gmail.readonly` and `gmail.send` scopes
- Existing users will need to reconnect to grant send permission

#### `app/(chef)/inquiries/[id]/page.tsx` — Updated inquiry detail page
- Added `InquiryResponseComposer` between the Quotes and Communication sections
- Fetches Gmail connection status to enable/disable the composer
- Only shown for active inquiries (not declined/expired)

### 2. Notification System — Wired Into Gmail Pipeline

**Problem:** The notifications table and actions existed but weren't connected to the remote database, and no code triggered notifications.

**What was done:**

#### Migrations applied (3 pending + 1 with conflicts resolved)
- `20260221000003_notifications.sql` — `notifications` table, `notification_preferences` table, `get_unread_notification_count()` RPC, RLS policies, Realtime broadcast
- `20260221000004_client_notes.sql` — `client_notes` table (renamed from conflicting version)
- `20260221000005_client_conversation_create.sql` — Client conversation creation RLS policies (made idempotent with DROP IF EXISTS)
- `20260221000006_households.sql` — Household linking system (renamed from conflicting version)

#### Migration version conflicts resolved
- Files `20260220000003_client_notes.sql` and `20260220000004_client_conversation_create.sql` had version numbers identical to already-applied `chat_file_sharing` and `chat_insights` migrations
- Renamed to `20260221000004` and `20260221000005` respectively
- `households` renamed from `20260220000005` to `20260221000006`

#### `lib/gmail/sync.ts` — Notification triggers added
- **New inquiry notification:** When Gmail sync creates a new inquiry, the chef gets a notification with the lead name and subject
- **Client reply notification:** When an existing thread gets a new message, the chef gets a notification with the client name
- Both are non-blocking (wrapped in try/catch) — sync continues even if notification fails

### 3. Tentative Schedule Holds — Inquiries on the Calendar

**Problem:** When an inquiry has a confirmed date, that date should be visible on the chef's calendar as a tentative hold, not just buried in the inquiry detail page.

**What was built:**

#### `lib/scheduling/actions.ts` — Extended calendar data
- `CalendarEvent.extendedProps.dayType` now supports `'event' | 'prep' | 'inquiry'`
- `getCalendarEvents()` now also queries `inquiries` with `confirmed_date` that are not declined/expired/confirmed
- Inquiry calendar entries use `id: inquiry-{id}`, `allDay: true`, `dayType: 'inquiry'`
- Skips inquiries that already converted to events (no duplication)

#### `components/scheduling/calendar-view.tsx` — Visual differentiation
- New `inquiry` color in `STATUS_COLORS`: light gray background (#f3f4f6), gray border, gray text
- `eventDidMount`: inquiry holds get dashed border + 0.8 opacity
- `eventClassNames`: adds `cf-event--inquiry` class
- Legend updated with "Tentative Hold" entry (dashed border style)
- Drag-and-drop prevented on inquiry holds

#### `components/scheduling/event-detail-popover.tsx` — Inquiry-aware popover
- Detects `dayType === 'inquiry'` for distinct header styling (gray instead of brand)
- Shows "Tentative Hold" badge with dashed border
- Footer shows "View Inquiry" button (links to `/inquiries/{id}` instead of `/events/{id}`)
- Added inquiry status labels (new, awaiting_client, awaiting_chef, quoted)

### 4. Pre-existing Bug Fixes

- **`types/database.ts`** — Removed duplicate closing lines (4463-4466) that broke module exports
- **`lib/ai/agent-brain.ts`** — Removed `'use server'` directive (it's a utility module, not a server action module; was causing "must be async" errors)
- **`lib/ai/chat-insights.ts`** — Fixed `z.record(z.unknown())` to `z.record(z.string(), z.unknown())` for Zod v4 compatibility
- **`lib/events/transitions.ts`** — Fixed `event.title` to `event.occasion` (events table uses `occasion`, not `title`)
- **`lib/contact/actions.ts`** — Added type assertion for `contact_submissions` table (not yet migrated)

---

## How These Connect

```
Email arrives via Gmail sync
  → Classify → Create inquiry → Auto-create client → ✅ Notify chef (NEW)
  → Inquiry appears on calendar as tentative hold (NEW)
  → Chef opens inquiry → Clicks "Generate Draft"
  → ACE engine: lifecycle detection → agent-brain rules → Gemini draft
  → Chef reviews draft, edits if needed
  → Chef clicks "Approve & Send"
  → Draft → Gmail API → Client's inbox (NEW)
  → Message logged as 'sent' with gmail_message_id and gmail_thread_id
  → Next sync picks up client's reply → ✅ Notify chef of reply (NEW)
  → Reply threaded by gmail_thread_id
```

The loop is now closed: email in → AI draft → chef review → email out → reply detected.

---

## What's Next

Remaining gaps from the dinner walkthrough:

1. **Auto follow-up scheduling** — 48hr timer when awaiting client response
2. **Payment link in booking emails** — Stripe link auto-included when quote is accepted
3. **Lifecycle auto-advancement** — Status progresses automatically when data is complete
4. **Document scaffolding on payment** — Prep sheets start generating when event is paid
5. **Grocery list ↔ menu component chain verification** — Ensure menu → grocery → shopping list pipeline is complete
6. **Notification bell UI** — Component to show unread count and notification list (data layer is ready)
