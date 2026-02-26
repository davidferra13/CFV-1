# Communication Inbox — Launch

**Date:** 2026-02-19
**Status:** Live

---

## What Changed

The Communication Inbox is now fully operational. This launches the triage pipeline that has been running silently in the background and makes it visible to chefs via a dedicated inbox interface with thread-level drill-down.

### Files Added or Modified

| File                                                      | Change                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/communication/actions.ts`                            | Added `getThreadWithEvents()` server action + `ThreadDetail` type                |
| `app/(chef)/inbox/triage/[threadId]/page.tsx`             | New — thread detail server page                                                  |
| `components/communication/thread-detail-client.tsx`       | New — thread detail UI with message timeline and reply bar                       |
| `components/communication/communication-inbox-client.tsx` | Thread names now link to detail page; fixed accessibility on `<select>` elements |

### Feature Flag

The inbox is gated by `COMM_TRIAGE_ENABLED=true` in `.env.local` (and Vercel environment variables for production). This flag was already set.

When `false`, the legacy `InboxFeed` renders instead.

---

## Why

Communication is the source of all business truth for a private chef. Every inquiry originates from a message. Every confirmation is a conversation. Every cancellation starts with a client reaching out.

ChefFlow already had a full communication triage pipeline — thread grouping, client resolution, classification rules, silence timers, suggested links to inquiries and events. But none of it was visible. The data was being collected with nowhere to go.

This launch makes that intelligence accessible.

---

## Architecture

### The Pipeline (Already Running)

```
Gmail sync (cron) → lib/gmail/sync.ts
     └─→ ingestCommunicationEvent() (lib/communication/pipeline.ts)
          ├─ Resolves client by email/phone
          ├─ Groups into conversation_threads (by sender/thread key)
          ├─ Classifies against chef-defined rules
          ├─ Suggests links to inquiries + events (confidence-scored)
          └─ Creates follow_up_timers (24h silence = reply needed)

Manual log → createManualCommunicationLog() → same pipeline
```

### The Inbox (Now Live)

```
/inbox → app/(chef)/inbox/page.tsx
  └─→ getCommunicationInbox() → communication_inbox_items view
       └─→ CommunicationInboxClient (components/communication/)
            ├─ Tab: Unassigned (unlinked threads)
            ├─ Tab: Action Required (overdue/attention-needed)
            ├─ Tab: Snoozed
            └─ Tab: Done

/inbox/triage/[threadId] → app/(chef)/inbox/triage/[threadId]/page.tsx
  └─→ getThreadWithEvents() → conversation_threads + communication_events
       └─→ ThreadDetailClient (components/communication/)
            ├─ Full chronological message timeline
            ├─ Inbound (stone bubbles, left) / Outbound (indigo bubbles, right)
            ├─ Quick actions: star, snooze, mark done, reopen
            ├─ Linked inquiry/event with direct links
            └─ Reply bar: log inbound or outbound messages
```

### Data Model

```
conversation_threads
  id, tenant_id, client_id, state, snoozed_until, is_starred, last_activity_at

communication_events
  id, thread_id, source, direction, sender_identity, raw_content,
  linked_entity_type, linked_entity_id, status, timestamp

suggested_links
  communication_event_id, suggested_entity_type, suggested_entity_id, confidence_score, status

follow_up_timers
  thread_id, due_at, status, reason

communication_inbox_items (view)
  Latest event per thread + tab classification + follow-up state
```

---

## How to Use

### Inbox List (`/inbox`)

- **Tabs** filter threads by state: Unassigned, Action Required, Snoozed, Done
- **Source filters** narrow to email, SMS, manual log, etc.
- **Response Turn**: "My Turn" = chef must reply, "Their Turn" = waiting on client
- **Follow-up**: "Past Due" = timer expired, "Upcoming" = due within 24h
- Click the client name to open the full thread
- Quick actions (Create Inquiry, Snooze, Mark Done) work directly from the list

### Thread Detail (`/inbox/triage/[threadId]`)

- Full chronological message history for the conversation
- Reply bar at the bottom logs new messages (inbound or outbound)
- Header shows linked inquiry/event with clickable link
- Star, snooze, and mark done from the header

### Logging a Manual Message

Use "+ Log New Message" in the inbox list. Useful when a client calls, texts, or messages on a channel not yet integrated.

---

## Testing

1. Enable flag: `COMM_TRIAGE_ENABLED=true` in `.env.local`, restart dev server
2. Go to `/inbox` — the new triage inbox should render
3. If no threads exist, click "+ Log New Message" and log a test message
4. The thread should appear in "Unassigned" tab
5. Click the client name → thread detail page opens
6. Log a reply from the reply bar → it should appear in the timeline
7. Click "Mark Done" → thread moves to "Done" tab
8. Test snooze → thread appears in "Snoozed" tab with timer

---

## What's Next

- **SMS intake**: Wire Twilio to `ingestCommunicationEvent()` so texts flow in automatically
- **FSM bridge**: Surface one-click FSM transitions when a communication event has detected intent (e.g., "client said yes" → propose event acceptance)
- **Proactive surfacing**: Dashboard alerts when threads need attention or events have open gaps
- **Classification rules UI**: Let chefs configure their own auto-labeling rules from settings
