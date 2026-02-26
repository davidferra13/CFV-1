# Phase 15 — Messaging System & Response Templates

## What Changed

Phase 15 adds a **communication log** to ChefFlow. This is not a sending system — it records what was said, to whom, on which channel, about which event. The value is unified conversation history attached to the right context, instead of scattered across Instagram, text, email, and Take a Chef.

### New Files

| File                                       | Purpose                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `lib/messages/actions.ts`                  | 10 server actions for messages and templates CRUD |
| `components/messages/message-log-form.tsx` | Quick inline form for logging a message           |
| `components/messages/message-thread.tsx`   | Chronological conversation thread display         |
| `components/messages/template-manager.tsx` | Full CRUD management UI for response templates    |
| `app/(chef)/settings/templates/page.tsx`   | Templates management page                         |

### Modified Files

| File                                 | Change                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| `app/(chef)/inquiries/[id]/page.tsx` | Added Communication section with thread + log form                           |
| `app/(chef)/events/[id]/page.tsx`    | Added Communication section; combined thread shows inquiry + event messages  |
| `app/(chef)/clients/[id]/page.tsx`   | Added Communication History showing ALL messages across all inquiries/events |
| `app/(chef)/settings/page.tsx`       | Added link to Response Templates sub-page                                    |

## Architecture Decisions

### Communication Log, Not Dispatcher

V1 does not send texts or emails. The chef communicates through normal channels (phone, text, Instagram) and LOGS the communication in ChefFlow. This was a deliberate scope decision — the value is the unified history, not automation.

### Messages Must Be Attached

Every message links to at least one of: `inquiry_id`, `event_id`, `client_id`. The Zod schema enforces this with a `.refine()` check. No orphaned messages.

### Combined Event Threads

When an event was converted from an inquiry, the event detail page shows the combined message thread (inquiry messages + event messages). This gives the chef the full conversation arc from first contact through event execution.

### Client-Level History

The client detail page shows ALL messages for that client across every inquiry and every event. This is the full relationship record — everything ever said to/from that client.

### Default Templates Are Suggestions

The 7 default templates are seeded on first visit to the templates page if the chef has no templates. They're written in a professional but warm tone. The chef can edit, delete, or replace them entirely.

### Template Quick-Fill, Not Auto-Send

Selecting a template pre-fills the message body textarea. The chef edits it, sends it on their phone/text/email, then clicks "Log Message." Templates reduce "what do I say?" friction without any automation.

## Schema Mapping

The spec used slightly different names than the actual DB schema:

| Spec Term                   | Actual DB Column                   |
| --------------------------- | ---------------------------------- |
| `content`                   | `body`                             |
| `channel: in_person, other` | `channel: internal_note` (DB enum) |
| template `content`          | `template_text`                    |
| template `category` enum    | `category` as plain TEXT           |
| `status: logged` (default)  | `status: 'logged'` (correct)       |

## Server Actions (10 Functions)

1. **`createMessage`** — Log a message with direction, channel, body, linked entity
2. **`getMessages`** — Filtered query (by inquiry, event, client, channel, direction, date range)
3. **`getMessageThread`** — Chronological conversation for an entity; supports combined event+inquiry threads
4. **`updateMessage`** — Update body, status, subject, sent_at
5. **`deleteMessage`** — Remove a message record
6. **`createResponseTemplate`** — Create a new template with name, content, category
7. **`getResponseTemplates`** — List active templates, optionally filtered by category
8. **`updateResponseTemplate`** — Edit template name, content, category, active status
9. **`deleteResponseTemplate`** — Remove a template
10. **`getDefaultTemplates`** — Returns 7 built-in starter templates
11. **`seedDefaultTemplates`** (bonus helper) — Seeds defaults for a chef with no templates

## UI Components

### MessageLogForm

- Direction toggle: "I sent" / "I received"
- Channel dropdown: Text, Email, Instagram, Take a Chef, Phone, Internal Note
- Datetime picker defaulting to now
- Conditional email subject field
- "Use Template" dropdown for quick-fill
- Compact form designed for inline use on detail pages

### MessageThread

- Chat-style layout: outbound messages right-aligned with brand color, inbound left-aligned
- Internal notes displayed full-width with dashed border
- Channel badge per message (color-coded)
- Timestamp display
- Optional entity links for client-level threads (shows "Inquiry" / "Event" tags)
- Empty state messaging

### TemplateManager

- Grouped by category with sorted display
- Inline create/edit form
- Delete with confirmation
- "Load Default Templates" button for new chefs
- Category selector with predefined options

## Verification Checklist

- [x] `lib/messages/actions.ts` exists with 10+ functions
- [x] Default response templates provided (7 templates)
- [x] Message thread component shows chronological conversation
- [x] Quick log form works inline on inquiry and event pages
- [x] Template quick-fill pre-populates the message form
- [x] Client detail shows all messages across all inquiries/events
- [x] Response templates management page exists at `/settings/templates`
- [x] 0 type errors in messaging files, clean compilation
- [x] Pre-existing `lib/loyalty/actions.ts` errors are unrelated (references non-existent `loyalty_config` table)
