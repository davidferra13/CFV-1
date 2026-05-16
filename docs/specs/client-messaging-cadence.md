# Client Messaging Cadence

> Maps professional service texting best practices into ChefFlow's existing communication infrastructure. Every outbound client message is lifecycle-anchored, chef-approved, and frequency-capped.

## Core Principle

**Every text must be expected, actionable, or time-sensitive.** If it fails all three, it does not get sent.

---

## The Golden Rules

1. **Chef sends, system drafts.** ChefFlow auto-drafts messages at the right lifecycle moment. Chef reviews and hits send. Never fully automated outbound to clients.
2. **Max 5 texts per engagement.** From booking to post-event thank-you, a client receives at most 5 text messages. Email handles everything else.
3. **One unanswered follow-up, then switch channels.** If a client does not reply to a text, the next nudge goes via email. Never double-text.
4. **Text = short. Email = long.** Texts are under 160 characters when possible. Details, menus, contracts, receipts go via email.
5. **Silence between engagements.** Zero texts between events unless the client texts first. Re-engagement goes via email only.
6. **Mirror the client's channel.** If a client always emails back when you text, future drafts default to email. The system tracks response channel preference per client.

---

## Lifecycle-Anchored Messaging Cadence

Each message maps to a service lifecycle stage. The system creates a draft in `scheduled_messages` at the right moment. Chef reviews in the Message Center, edits if needed, and sends.

### Per-Engagement Cadence (Max 5 Texts)

| #   | Lifecycle Stage                     | Trigger                             | Channel | Auto-Draft? | Message Template                                                                                                      |
| --- | ----------------------------------- | ----------------------------------- | ------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Stage 3: Quote Sent**             | Quote created + client has phone    | Text    | Yes (draft) | "Hi {name}, {chef} here. Sent you a proposal for {date}. Check your email when you get a chance."                     |
| 2   | **Stage 4: Agreement Signed**       | Contract signed or deposit received | Text    | Yes (draft) | "Confirmed: {occasion} for {guest_count} on {date}. Looking forward to it. I will be in touch as we get closer."      |
| 3   | **Stage 6: Pre-Service (7 days)**   | Event date minus 7 days             | Text    | Yes (draft) | "Hi {name}, your dinner is one week out. Need your final guest count by {deadline}. Any dietary changes? Reply here." |
| 4   | **Stage 6: Pre-Service (48 hours)** | Event date minus 2 days             | Text    | Yes (draft) | "Quick reminder: {occasion} {day_of_week} at {time}. Everything is on track. See you soon."                           |
| 5   | **Stage 9: Post-Service**           | Event marked completed              | Text    | Yes (draft) | "Thanks for a wonderful evening, {name}. Itemized receipt coming to your email tomorrow."                             |

### What Goes Via Email Only (Never Text)

| Lifecycle Stage            | Content                                | Why Email                       |
| -------------------------- | -------------------------------------- | ------------------------------- |
| Stage 3: Quote details     | Full proposal, pricing breakdown, menu | Too long for text               |
| Stage 4: Contract          | Agreement, terms, signature link       | Legal document                  |
| Stage 5: Menu planning     | Menu drafts, revision requests         | Detailed content                |
| Stage 6: Prep details      | Shopping lists, timing, logistics      | Chef-internal mostly            |
| Stage 7: Payment reminders | Balance due, payment link              | Financial, needs receipt trail  |
| Stage 9: Receipt           | Itemized invoice                       | Accounting document             |
| Stage 10: Re-engagement    | "Would love to cook for you again"     | Between-engagement = email only |

### What Gets No Message At All

- Weekly tips or newsletters (not a chef's job)
- Promotional offers to past clients (text is personal, not marketing)
- "Just checking in" with no purpose
- Birthday/holiday texts (unless chef manually writes one)
- Survey or review requests via text

---

## Frequency Cap Implementation

### Per-Client Engagement Counter

```
engagement_message_count: tracks texts sent per (client_id, event_id)
- Incremented when a text is actually sent (not just drafted)
- Hard cap at 5 per engagement
- Resets when a new event is created for the same client
- Draft creation is NOT capped (chef can always see drafts)
- Sending is capped (system blocks send if count >= 5)
```

### Response Channel Tracking

```
client_preferred_channel: derived from client behavior
- Track which channel the client replies on
- If client replies to texts via email 3+ times: flag as "prefers email"
- Surface this preference in the Message Center
- Future drafts default to the preferred channel
```

### Unanswered Message Escalation

```
When a text gets no reply within 48 hours:
1. Mark the message as "unanswered" in scheduled_messages
2. Next lifecycle message for this client defaults to email
3. After the client replies (on any channel), reset to their preferred channel
4. Never send a second text about the same topic
```

---

## Integration with Existing Infrastructure

### What Already Works (No Changes Needed)

| Component                       | Location                               | Status |
| ------------------------------- | -------------------------------------- | ------ |
| SMS delivery via Twilio         | `lib/sms/send.ts`                      | Built  |
| SMS rate limiting               | `lib/sms/rate-limit.ts`                | Built  |
| Channel router (email/push/sms) | `lib/notifications/channel-router.ts`  | Built  |
| Tier-based routing              | `lib/notifications/tier-config.ts`     | Built  |
| Quiet hours suppression         | `lib/notifications/off-hours-check.ts` | Built  |
| Client SMS auto-suppression     | Channel router (requires chef review)  | Built  |
| Draft creation for CIL signals  | `lib/cil/signal-actions.ts`            | Built  |
| Communication pipeline (ingest) | `lib/communication/pipeline.ts`        | Built  |
| Notification delivery log       | `notification_delivery_log` table      | Built  |

### What Needs to Be Built

| Component                       | Purpose                                                     | Scope                                                    |
| ------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| **Lifecycle message scheduler** | Watches event dates, creates drafts at the right time       | New: `lib/communication/lifecycle-cadence.ts`            |
| **Engagement message counter**  | Tracks texts per (client, event), enforces cap of 5         | New column on `scheduled_messages` or new tracking table |
| **Client channel preference**   | Tracks which channel client prefers based on reply behavior | New field on `clients` table                             |
| **Message Center "Send" flow**  | Chef reviews draft, edits, sends via preferred channel      | Extend existing Message Center UI                        |
| **Template engine**             | Interpolates {name}, {date}, {occasion} into draft text     | New: `lib/communication/message-templates.ts`            |
| **Unanswered tracker**          | Flags unanswered texts, shifts next message to email        | Extend `scheduled_messages` status tracking              |

---

## Message Center UX (Chef's View)

### Draft Queue

When a lifecycle trigger fires, a draft appears in the chef's Message Center:

```
+----------------------------------------------------------+
| DRAFTS (3 ready to send)                                 |
+----------------------------------------------------------+
| Sarah M. - Dinner Confirmation     [Edit] [Send] [Skip] |
| "Confirmed: Anniversary dinner for 8 on June 7.         |
|  Looking forward to it."                                 |
|  Channel: Text  |  2 of 5 texts this engagement         |
+----------------------------------------------------------+
| James R. - 7-Day Reminder          [Edit] [Send] [Skip] |
| "Hi James, your dinner is one week out. Need your       |
|  final guest count by Wednesday."                        |
|  Channel: Text  |  3 of 5 texts this engagement         |
+----------------------------------------------------------+
| Lisa P. - Post-Dinner Thanks       [Edit] [Send] [Skip] |
| "Thanks for a wonderful evening, Lisa. Receipt           |
|  coming to your email tomorrow."                         |
|  Channel: Email (prefers email)  |  N/A                 |
+----------------------------------------------------------+
```

### Per-Draft Controls

- **Edit**: Modify the text before sending (chef's voice, not template voice)
- **Send**: Deliver via the indicated channel
- **Skip**: Dismiss this draft (not every client needs every touchpoint)
- **Channel toggle**: Switch between Text and Email for this specific message

### Visual Cues

- Engagement counter shows "X of 5 texts" (amber at 4, red at 5)
- Client channel preference badge: "Prefers text" / "Prefers email" / "No preference"
- Unanswered flag: orange dot if previous text got no reply

---

## Template Philosophy

Templates are starting points, not scripts. They should sound like the chef, not a CRM.

### What Makes a Good Template

- First person ("I" not "we")
- Chef's name, not business name
- Conversational, not corporate
- Under 160 characters for texts when possible
- No exclamation marks (professionals do not shout)
- No emoji (unless the chef adds them manually)

### Template Variables

| Variable        | Source                              | Example              |
| --------------- | ----------------------------------- | -------------------- |
| `{name}`        | `clients.name` (first name only)    | "Sarah"              |
| `{chef}`        | `chefs.business_name` or first name | "Chef David"         |
| `{date}`        | `events.event_date` formatted       | "Saturday, June 7"   |
| `{time}`        | `events.start_time` formatted       | "6:30 PM"            |
| `{occasion}`    | `events.occasion`                   | "anniversary dinner" |
| `{guest_count}` | `events.guest_count`                | "8"                  |
| `{day_of_week}` | Derived from event_date             | "Saturday"           |
| `{deadline}`    | event_date minus 3 days             | "Wednesday"          |
| `{balance}`     | Outstanding amount from ledger      | "$625"               |

### Remy Integration

When Gemma 4 is available, Remy can personalize templates based on:

- Client history (returning client vs first-time)
- Occasion type (corporate vs intimate)
- Chef's archetype/voice setting
- Previous conversation tone

Draft still goes to chef for review. Remy just makes the starting draft better.

---

## Anti-Spam Safeguards

| Safeguard                  | Rule                                                | Enforcement                   |
| -------------------------- | --------------------------------------------------- | ----------------------------- |
| Engagement cap             | Max 5 texts per (client, event)                     | Hard block at send time       |
| Daily cap                  | Max 10 outbound texts per chef per day              | Hard block at send time       |
| Unanswered escalation      | No second text on same topic if first unanswered    | Auto-channel-switch           |
| Quiet hours                | No texts during client's local evening (after 8 PM) | Existing off-hours check      |
| Between-engagement silence | Zero texts unless client initiates                  | No drafts created             |
| Client opt-out             | Client replies STOP: permanent text block           | Twilio handles + local flag   |
| Automated SMS block        | AI/automated origin cannot send client SMS          | Existing channel-router guard |

---

## Build Priority

This spec builds on top of fully operational infrastructure. Suggested order:

1. **Template engine** (pure logic, no UI, no DB changes)
2. **Lifecycle message scheduler** (cron or event-driven, creates drafts)
3. **Engagement counter** (DB field + send-time guard)
4. **Message Center draft queue UI** (extend existing inbox)
5. **Client channel preference tracking** (behavioral, builds over time)
6. **Remy template personalization** (enhancement, not blocking)

Items 1-3 can ship without any UI changes. Drafts appear in existing scheduled_messages and the chef can review them today. Item 4 makes the experience polished.

---

## What This Does NOT Cover

- **Inbound message handling**: Already built in `lib/communication/pipeline.ts`
- **Chef-to-chef communication**: Different domain entirely
- **Marketing/newsletter**: ChefFlow is not a marketing platform
- **Client portal notifications**: Separate system (in-app for clients)
- **Payment reminders**: Already handled by lifecycle payment flow via email
