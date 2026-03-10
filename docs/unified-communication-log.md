# Unified Communication Log (U18)

## Overview

A single timeline per client showing every interaction: emails sent, SMS messages, feedback received, orders placed, events completed, and notes from phone calls. One page to see the full relationship history.

## Database

**Table:** `communication_log`

| Column            | Type               | Description                                                |
| ----------------- | ------------------ | ---------------------------------------------------------- |
| id                | uuid PK            | Auto-generated                                             |
| tenant_id         | uuid FK            | References chefs(id), RLS-enforced                         |
| client_id         | uuid FK (nullable) | References clients(id)                                     |
| client_identifier | text (nullable)    | Email or phone for non-client contacts                     |
| channel           | text               | email, sms, phone, note, system, feedback, order, event    |
| direction         | text               | inbound, outbound, internal                                |
| subject           | text (nullable)    | Email subject or brief summary                             |
| content           | text (nullable)    | Message body or note content                               |
| entity_type       | text (nullable)    | event, bakery_order, quote, invoice, feedback, reservation |
| entity_id         | uuid (nullable)    | Link to the related entity                                 |
| metadata          | jsonb (nullable)   | Extra data (email_id, sms_sid, duration, etc.)             |
| logged_by         | text (nullable)    | Who logged it (auto or manual)                             |
| created_at        | timestamptz        | Default now()                                              |

**Migration:** `supabase/migrations/20260331000026_communication_log.sql`

**Indexes:**

- `(tenant_id, client_id, created_at desc)` for client timeline queries
- `(tenant_id, client_identifier, created_at desc)` for identifier-based lookups
- GIN index on `to_tsvector(subject || content)` for full-text search

**RLS:** All operations scoped to tenant via `chefs.user_id = auth.uid()`.

## Server Actions

**File:** `lib/communications/comm-log-actions.ts`

| Action                                             | Purpose                                                 |
| -------------------------------------------------- | ------------------------------------------------------- |
| `logCommunication(data)`                           | Log any interaction (manual or automated)               |
| `addCallNote(clientId, subject, notes, duration?)` | Quick shortcut for phone call notes                     |
| `getClientTimeline(clientId, limit?, offset?)`     | Merged timeline from comm_log + SMS + feedback + events |
| `getTimelineByIdentifier(emailOrPhone, limit?)`    | Timeline for contacts not yet in clients table          |
| `searchCommunications(query, limit?)`              | Search across subject and content                       |
| `getRecentCommunications(days?, limit?)`           | All recent entries across all clients                   |
| `getCommunicationStats(clientId?)`                 | Total interactions, last contact, preferred channel     |
| `getClientLastContact(clientId)`                   | When was the last interaction                           |

All actions use `requireChef()` and scope by `user.tenantId!`. All deterministic (no AI).

## Timeline Merge

`getClientTimeline` queries multiple sources and merges into a single chronological feed:

1. **communication_log** entries (direct)
2. **sms_messages** table (if available)
3. **feedback_responses** table (if available)
4. **events** table (milestones)

Each source entry gets a prefixed ID (`sms-`, `fb-`, `ev-`) to avoid collisions. Results are sorted by date descending and paginated.

## UI Components

**`components/communications/client-timeline.tsx`** (client component)

- Vertical timeline layout with channel-colored icons
- Direction arrows (inbound/outbound/internal)
- Click to expand full content
- "Log Interaction" form (channel, direction, subject, content)
- Search bar
- Load more pagination

**`components/communications/quick-note.tsx`** (client component)

- Compact form for phone calls and notes
- Channel selector, subject, notes, duration
- Embeddable on client detail pages

**`components/communications/comm-stats.tsx`** (client component)

- Summary cards: Total Interactions, Last Contact, Preferred Channel, Logged Entries
- For embedding on client profile pages

## Pages

| Route                          | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `/clients/[id]/communications` | Client-specific timeline with stats and quick note sidebar  |
| `/communications`              | All recent communications across all clients (last 30 days) |

## Channel Colors

| Channel  | Color  | Badge   |
| -------- | ------ | ------- |
| email    | Blue   | info    |
| sms      | Green  | success |
| phone    | Purple | default |
| note     | Gray   | default |
| system   | Gray   | default |
| feedback | Yellow | warning |
| order    | Orange | warning |
| event    | Indigo | info    |

## Integration Points

Other features can log to the communication_log by calling `logCommunication()`:

- Email system: log sent/received emails with `channel: 'email'`
- SMS system: log sent messages with `channel: 'sms'`
- Feedback collection: log feedback with `channel: 'feedback'`
- System automations: log with `channel: 'system'`

The timeline merge in `getClientTimeline` also pulls from existing tables (sms_messages, feedback_responses, events) so historical data appears without needing to backfill.
