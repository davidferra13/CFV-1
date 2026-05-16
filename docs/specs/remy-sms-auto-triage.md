# Remy SMS Auto-Triage & Intelligent Response

> P0 CRITICAL. Stops reputation bleeding from dropped texts while chef is cooking.

---

## Problem

Chef gets texts from clients while hands are in food. 4 hours pass. Client thinks they're being ghosted. Reputation bleeds. With 10+ active dinners, dozens of texts per week fall through cracks.

## Solution

Remy reads inbound texts in real-time, instantly acknowledges receipt, classifies urgency, drafts contextual responses, and queues them for chef approval. Chef opens phone between courses, sees prioritized cards, taps approve. Zero dropped texts.

---

## Architecture

### Flow

```
Client texts chef's number
  → SMS Bridge ingests (lib/sms/ingest.ts, ALREADY BUILT)
  → Auto-Triage classifies message (NEW)
  → Instant acknowledgment sent (<60s) (NEW)
  → Priority queue entry created (NEW)
  → Remy drafts contextual response (NEW)
  → Push notification to chef (EXISTING: lib/notifications/)
  → Chef opens triage UI, reviews drafts (NEW)
  → Approve / Edit / Defer
  → Response sent via SMS (EXISTING: lib/sms/actions.ts)
```

### Existing Infrastructure (No Rebuild)

| Component             | Location                                 | Role                       |
| --------------------- | ---------------------------------------- | -------------------------- |
| SMS Bridge ingest     | `lib/sms/ingest.ts`                      | Receives inbound texts     |
| SMS Bridge config     | `database/migrations/20260515000003`     | Token auth, blocklist      |
| Twilio SMS client     | `lib/sms/twilio-client.ts`               | Send/receive SMS           |
| SMS content policy    | `lib/phone/sms-content-policy.ts`        | PII sanitization, 160-char |
| Phone routing         | `lib/phone/sms-routing.ts`               | Resolve best number        |
| Cadence scheduler     | `lib/communication/cadence-scheduler.ts` | Timing intelligence        |
| Notification channels | `lib/notifications/channel-router.ts`    | Push to chef               |
| Remy agent actions    | `lib/ai/agent-actions/`                  | Action patterns            |
| Brand voice           | `lib/email/brand-voice.ts`               | Tone presets               |
| Client lookup         | `lib/clients/`                           | Match phone to client      |

### New Code

| File                                   | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `lib/sms/auto-triage.ts`               | Classification engine (category + urgency + context) |
| `lib/sms/acknowledgment-templates.ts`  | Instant reply templates per category                 |
| `lib/sms/triage-queue.ts`              | Priority scoring, queue CRUD, escalation             |
| `lib/sms/draft-engine.ts`              | Remy draft generation using client/event context     |
| `lib/sms/triage-actions.ts`            | Server actions (approve, edit, defer, bulk)          |
| `app/(chef)/inbox/sms-triage/page.tsx` | Mobile-first approval UI                             |
| `components/sms/triage-card.tsx`       | Individual message + draft card                      |
| `components/sms/triage-queue-view.tsx` | Priority-sorted card stack                           |
| Migration: `sms_triage_queue` table    | Queue persistence                                    |

---

## Classification Engine

### Categories

| Category                | Signal                                            | Urgency Base | Example                                                |
| ----------------------- | ------------------------------------------------- | ------------ | ------------------------------------------------------ |
| `new_inquiry`           | Unknown number OR no client match                 | MEDIUM       | "Hi, I found you on Google. Do you do dinners for 12?" |
| `existing_confirmation` | Known client + event <7d + affirm words           | HIGH         | "Yes Saturday works! See you at 6"                     |
| `schedule_change`       | Known client + event <7d + time/date/cancel words | CRITICAL     | "Can we push to 7pm instead of 6?"                     |
| `question`              | Known client + question mark or "wondering"       | MEDIUM       | "What should I have on hand for Saturday?"             |
| `payment_related`       | Known client + money/pay/invoice/tip words        | MEDIUM       | "Just sent the deposit!"                               |
| `urgent`                | Event <48h + any substantive message              | CRITICAL     | Any text from client with dinner tomorrow              |
| `social`                | Known client + no business content                | LOW          | "Happy birthday!"                                      |
| `spam`                  | Blocklist match or marketing patterns             | IGNORE       | "Your car warranty..."                                 |

### Priority Score Formula

```
score = base_urgency
  + (event_within_48h ? 50 : event_within_7d ? 20 : 0)
  + (response_age_minutes > 120 ? 30 : response_age_minutes > 60 ? 15 : 0)
  + (client_lifetime_value > $5000 ? 10 : 0)
  + (repeat_client ? 5 : 0)
```

Higher score = shown first in queue.

---

## Instant Acknowledgment

Sent within 60 seconds of ingest. Template-based (no AI generation for speed). Respects SMS content policy (160 char, no PII).

### Templates

| Category                | Template                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| `new_inquiry`           | "Hi! Thanks for reaching out. I'll get back to you shortly with availability." |
| `existing_confirmation` | "Got it, thank you! I'll confirm details soon."                                |
| `schedule_change`       | "Received your message. Let me check and get right back to you."               |
| `question`              | "Good question! Let me get back to you on that shortly."                       |
| `payment_related`       | "Thank you! I'll confirm receipt shortly."                                     |
| `urgent`                | "Got your message. I'm on it."                                                 |
| `social`                | (no auto-reply)                                                                |
| `spam`                  | (no auto-reply, auto-archive)                                                  |

### Guardrails

- Never auto-reply more than once per sender per 4 hours (prevent loops)
- Never auto-reply to numbers on chef's blocklist
- Never auto-reply between 10pm-7am (configurable quiet hours)
- Template only, never AI-generated (speed + safety)
- Acknowledgment clearly implies chef will follow up (sets expectation, doesn't answer)

---

## Draft Engine (Remy)

After classification, Remy generates a draft response using:

1. **Client context**: name, past events, dietary notes, payment history
2. **Event context**: upcoming event details, menu, guest count, timeline
3. **Message content**: what specifically the client asked/said
4. **Brand voice**: chef's configured tone preset (from `brand-voice.ts`)
5. **Conversation history**: prior SMS thread (last 5 messages)

### Draft Quality Rules

- Match chef's natural texting style (short, friendly, direct)
- Never promise something chef hasn't confirmed
- Never discuss pricing without chef approval
- Never share other client info
- Keep under 300 chars (SMS-friendly)
- For `schedule_change`: draft includes calendar check result
- For `new_inquiry`: draft includes next available date from calendar

### Draft Confidence

Each draft gets a confidence score:

- **HIGH** (>0.8): Simple confirmations, acknowledgments, scheduling
- **MEDIUM** (0.5-0.8): Questions requiring some judgment
- **LOW** (<0.5): Complex situations, new inquiries, anything involving money

Chef sees confidence as visual indicator on triage card.

---

## Triage Queue UI

### Design Principles

- Mobile-first (chef checks between courses on phone)
- One-thumb operation
- Card stack sorted by priority score
- Batch mode for clearing multiple at once

### Card Layout

```
┌─────────────────────────────────┐
│ 🔴 CRITICAL  ·  Event tomorrow  │
│                                  │
│ Sarah Mitchell          2:34 PM  │
│ "Can we push to 7pm instead?"   │
│                                  │
│ ┌─ Remy's Draft ─────────────┐  │
│ │ "Hey Sarah! 7pm works      │  │
│ │ perfectly. See you then!"  │  │
│ └────────────── confidence: ●●●○│
│                                  │
│  [✓ Send]  [✎ Edit]  [⏸ Later] │
└─────────────────────────────────┘
```

### Actions

| Action      | Behavior                                          |
| ----------- | ------------------------------------------------- |
| **Send**    | Sends Remy's draft as-is via SMS                  |
| **Edit**    | Opens inline editor, pre-filled with draft        |
| **Later**   | Snoozes 1 hour, re-queues with escalated priority |
| **Archive** | Marks handled (no response needed)                |
| **Call**    | Opens phone dialer for this contact               |

### Batch Mode

Long-press any card enters batch mode. Select multiple, approve all drafts at once. For routine confirmations (HIGH confidence), this clears the queue fast.

---

## Escalation

| Threshold        | Action                                                               |
| ---------------- | -------------------------------------------------------------------- |
| 30 min, CRITICAL | Push notification: "Urgent text from [name] about tomorrow's dinner" |
| 2 hours, HIGH    | Push notification: "[name] is waiting on a reply"                    |
| 4 hours, MEDIUM  | Push notification: "3 texts need your attention"                     |
| 8 hours, any     | Badge count on app icon, daily digest                                |

Escalation respects quiet hours. Critical messages override quiet hours.

---

## Database

### New Table: `sms_triage_queue`

```sql
CREATE TABLE sms_triage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  sms_message_id UUID REFERENCES sms_messages(id),
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  client_id UUID REFERENCES clients(id),
  event_id UUID REFERENCES events(id),

  -- Classification
  category TEXT NOT NULL, -- new_inquiry, existing_confirmation, schedule_change, question, payment_related, urgent, social, spam
  priority_score INTEGER NOT NULL DEFAULT 0,

  -- Acknowledgment
  ack_sent_at TIMESTAMPTZ,
  ack_template TEXT,

  -- Draft
  draft_text TEXT,
  draft_confidence REAL,
  draft_context JSONB, -- what Remy used to generate

  -- Resolution
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, edited, deferred, archived
  resolved_at TIMESTAMPTZ,
  response_text TEXT, -- what was actually sent
  response_sent_at TIMESTAMPTZ,

  -- Escalation
  escalation_level INTEGER NOT NULL DEFAULT 0,
  last_escalated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_triage_chef_status ON sms_triage_queue(chef_id, status);
CREATE INDEX idx_sms_triage_priority ON sms_triage_queue(chef_id, status, priority_score DESC);
```

---

## Integration Points

### Inbound (SMS Bridge hooks into triage)

Modify `lib/sms/ingest.ts` to call auto-triage after message persistence:

```typescript
// After existing ingest logic:
await classifyAndEnqueue(message, chefId)
await sendAcknowledgmentIfEligible(message, classification)
await generateDraft(triageEntry)
await notifyChefIfUrgent(triageEntry)
```

### Outbound (triage resolution sends via existing SMS)

Uses existing `sendSmsToClient()` from `lib/sms/actions.ts`. Logs to unified messages table. Thread continuity preserved.

### CIL Signal

Triage resolution feeds CIL signal: `sms_response_time`, `client_engagement_velocity`. Wire into existing CIL scanner.

---

## Configuration (Per-Chef)

Added to chef preferences or a dedicated settings panel:

| Setting                         | Default | Description                                                          |
| ------------------------------- | ------- | -------------------------------------------------------------------- |
| `sms_auto_triage_enabled`       | false   | Master toggle                                                        |
| `sms_ack_enabled`               | true    | Send instant acknowledgments                                         |
| `sms_quiet_hours_start`         | "22:00" | No auto-replies after                                                |
| `sms_quiet_hours_end`           | "07:00" | No auto-replies before                                               |
| `sms_critical_override_quiet`   | true    | Critical msgs bypass quiet hours                                     |
| `sms_draft_auto_send_threshold` | null    | Auto-send if confidence > threshold (null = always require approval) |
| `sms_escalation_enabled`        | true    | Push notification escalation                                         |

---

## Safety & Guardrails

1. **Never auto-send without chef approval** (default). Optional threshold for HIGH confidence auto-send, but defaults to off.
2. **Never reveal chef's schedule** ("I'm cooking right now") in acknowledgments. Keep vague ("I'll get back to you shortly").
3. **PII sanitization** on all outbound via existing content policy.
4. **Rate limiting**: Max 1 ack per sender per 4 hours. Max 20 outbound SMS per chef per hour.
5. **Blocklist respected**: Chef's blocklist = no ack, no queue, auto-archive.
6. **Opt-out detection**: If client texts "STOP" or "unsubscribe", halt all automated messages immediately, flag for chef.
7. **Audit trail**: Every auto-ack and approved draft logged with timestamp, template/draft used, chef action.

---

## Success Metrics

| Metric                           | Target       | Measurement                             |
| -------------------------------- | ------------ | --------------------------------------- |
| Acknowledgment latency           | <60s         | Time from ingest to ack sent            |
| Chef response time (with triage) | <2 hours     | Time from ingest to approved response   |
| Draft acceptance rate            | >60%         | Sent as-is vs. edited                   |
| Dropped texts (no response >24h) | 0            | Queue items past 24h without resolution |
| Queue clear time                 | <5 min daily | Time chef spends in triage UI           |

---

## Build Sequence

1. Migration: `sms_triage_queue` table
2. `lib/sms/auto-triage.ts` - classifier
3. `lib/sms/acknowledgment-templates.ts` - templates + send logic
4. `lib/sms/triage-queue.ts` - queue CRUD, priority scoring
5. Wire into `lib/sms/ingest.ts` (classify + ack on inbound)
6. `lib/sms/draft-engine.ts` - Remy draft generation
7. `lib/sms/triage-actions.ts` - server actions (approve/edit/defer)
8. `app/(chef)/inbox/sms-triage/page.tsx` + components
9. Escalation logic (cron or cadence-scheduler hook)
10. Settings UI panel
11. CIL signal integration
12. Tests (unit: classifier, integration: full flow, Playwright: triage UI)

---

## Non-Goals (This Spec)

- WhatsApp triage (future: same pattern, different channel)
- AI voice response to texts (never; text stays text)
- Client self-service via SMS (future: "reply MENU to see your menu")
- Multi-chef thread handoff (future: staff delegation)
