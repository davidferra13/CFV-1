# Remy — Complete Capability Reference

> **Last updated:** 2026-02-28
> This file persists across sessions. Update it when Remy tools, context, or architecture change.

---

## Quick Stats

| Metric                                              | Count |
| --------------------------------------------------- | ----- |
| **Tier 1 tools** (auto-execute, read-only)          | ~35   |
| **Tier 2 tools** (chef approval, drafts/reversible) | ~55   |
| **Tier 3 tools** (permanently restricted)           | 8     |
| **Context data sections**                           | 25+   |
| **System prompt sections**                          | 40+   |
| **Memory categories**                               | 8     |
| **Agent action files**                              | 20    |
| **Few-shot examples**                               | 8     |

---

## Architecture Overview

### Pipeline: Message → Response

1. **Input validation** (`remy-input-validation.ts`) — sanitize, length-cap, block recipe generation, neutralize prompt injection
2. **Intent classification** (`remy-actions.ts`) — QUESTION / COMMAND / MIXED
3. **Context loading** (`remy-context.ts`) — 3-tier cache, 25+ data sections
4. **Memory loading** (`remy-memory.ts`) — relevant memories from DB, grouped by category
5. **System prompt assembly** (`stream/route.ts` or `remy-actions.ts`) — 40+ sections
6. **Task execution** (if COMMAND/MIXED) — DAG pipeline with parallel rounds
7. **LLM response** — streaming SSE via `/api/remy/stream` or non-streaming via `sendRemyMessage()`
8. **Memory extraction** — auto-saves new memories from conversation

### Key Files

| File                                  | Purpose                                          |
| ------------------------------------- | ------------------------------------------------ |
| `app/api/remy/stream/route.ts`        | Streaming API (SSE), system prompt builder       |
| `lib/ai/remy-actions.ts`              | Non-streaming fallback, intent classification    |
| `lib/ai/remy-personality.ts`          | Personality constants, few-shot examples         |
| `lib/ai/remy-context.ts`              | Context loading (25+ data sections)              |
| `lib/ai/remy-types.ts`                | RemyContext interface, types                     |
| `lib/ai/remy-input-validation.ts`     | Input sanitization, recipe block, anti-injection |
| `lib/ai/remy-memory.ts`               | Memory system (load, save, format)               |
| `lib/ai/remy-memory-types.ts`         | Memory types (8 categories)                      |
| `lib/ai/command-orchestrator.ts`      | Tier 1 task execution (switch dispatch)          |
| `lib/ai/command-task-descriptions.ts` | Task descriptions (feeds intent parser)          |
| `lib/ai/agent-registry.ts`            | AgentActionDefinition interface, registry        |
| `lib/ai/agent-actions/index.ts`       | Barrel — registers all Tier 2/3 actions          |
| `lib/ai/agent-actions/*.ts`           | 20 domain-specific action files                  |
| `components/ai/remy-drawer.tsx`       | UI — chat drawer component                       |

---

## Tier 1 Tools (Auto-Execute, Read-Only)

No chef confirmation needed. Instant data lookups.

### Client

| Tool                 | Description                  |
| -------------------- | ---------------------------- |
| `client.search`      | Find client by name/keyword  |
| `client.list_recent` | Recent clients               |
| `client.details`     | Full client profile          |
| `client.event_recap` | Client's event history recap |

### Events

| Tool                   | Description               |
| ---------------------- | ------------------------- |
| `event.list_upcoming`  | Next events               |
| `event.details`        | Full event details        |
| `event.list_by_status` | Events filtered by status |

### Inquiries

| Tool                | Description            |
| ------------------- | ---------------------- |
| `inquiry.list_open` | Open/pending inquiries |
| `inquiry.details`   | Inquiry details        |

### Financial

| Tool                       | Description                |
| -------------------------- | -------------------------- |
| `finance.summary`          | Revenue summary            |
| `finance.monthly_snapshot` | Monthly financial snapshot |

### Calendar & Scheduling

| Tool                        | Description             |
| --------------------------- | ----------------------- |
| `calendar.availability`     | Check date availability |
| `scheduling.next_available` | Find next open date     |

### Recipes & Menus

| Tool                      | Description                               |
| ------------------------- | ----------------------------------------- |
| `recipe.search`           | Search chef's own recipe book (read-only) |
| `menu.list`               | List menus                                |
| `client.menu_explanation` | Menu explanation for client               |

### Email

| Tool                  | Description   |
| --------------------- | ------------- |
| `email.recent`        | Recent emails |
| `email.search`        | Search emails |
| `email.thread`        | Email thread  |
| `email.inbox_summary` | Inbox summary |

### Chef Profile

| Tool                    | Description         |
| ----------------------- | ------------------- |
| `chef.favorite_chefs`   | Favorite chefs list |
| `chef.culinary_profile` | Culinary profile    |

### Safety & Dietary

| Tool                     | Description                               |
| ------------------------ | ----------------------------------------- |
| `dietary.check`          | Dietary/allergy check                     |
| `safety.event_allergens` | Cross-check all guests' allergies vs menu |

### Operations & Analytics

| Tool                      | Description                       |
| ------------------------- | --------------------------------- |
| `ops.portion_calc`        | Portion calculator                |
| `ops.packing_list`        | Packing list                      |
| `ops.cross_contamination` | Cross-contamination risk analysis |
| `analytics.break_even`    | Break-even analysis               |
| `analytics.client_ltv`    | Client lifetime value             |
| `analytics.recipe_cost`   | Recipe cost optimization          |

### Web

| Tool         | Description                   |
| ------------ | ----------------------------- |
| `web.search` | Web search (public info only) |
| `web.read`   | Read web page                 |

### Loyalty & Navigation (added 2026-02-28)

| Tool             | Description                                     |
| ---------------- | ----------------------------------------------- |
| `loyalty.status` | Client loyalty tier, points, next-tier progress |
| `nav.go`         | Navigate chef to any app page                   |
| `waitlist.list`  | View waitlisted clients                         |
| `quote.compare`  | Side-by-side quote versions for event           |

### Other Tier 1

| Tool                    | Description             |
| ----------------------- | ----------------------- |
| `grocery.quick_add`     | Quick-add grocery items |
| `document.search`       | Search documents        |
| `document.list_folders` | List document folders   |

---

## Tier 2 Tools (Chef Approval Required)

Chef reviews a preview/draft, then confirms or edits before anything is saved.

### Client Management

| Tool                    | Description             |
| ----------------------- | ----------------------- |
| `agent.create_client`   | Create new client       |
| `agent.update_client`   | Update client details   |
| `agent.invite_client`   | Invite client to portal |
| `agent.add_client_note` | Add note to client      |
| `agent.add_client_tag`  | Tag a client            |

### Event Management

| Tool                              | Description               |
| --------------------------------- | ------------------------- |
| `agent.create_event`              | Create event              |
| `agent.update_event`              | Update event details      |
| `agent.transition_event`          | Move event to next status |
| `agent.clone_event`               | Clone/duplicate event     |
| `agent.save_debrief`              | Save event debrief        |
| `agent.complete_safety_checklist` | Complete safety checklist |

### Inquiry Management

| Tool                       | Description             |
| -------------------------- | ----------------------- |
| `agent.create_inquiry`     | Log new inquiry         |
| `agent.transition_inquiry` | Move inquiry forward    |
| `agent.convert_inquiry`    | Convert inquiry → event |
| `agent.add_inquiry_note`   | Add note to inquiry     |

### Quote Management

| Tool                     | Description        |
| ------------------------ | ------------------ |
| `agent.create_quote`     | Create quote       |
| `agent.transition_quote` | Move quote forward |

### Menu Management

| Tool                       | Description                   |
| -------------------------- | ----------------------------- |
| `agent.create_menu`        | Create menu                   |
| `agent.update_menu`        | Update menu                   |
| `agent.link_menu_event`    | Link menu to event            |
| `agent.add_dish`           | Add dish to menu              |
| `agent.update_dish`        | Update dish                   |
| `agent.add_component`      | Add component to dish         |
| `agent.duplicate_menu`     | Duplicate menu                |
| `agent.save_menu_template` | Save menu as template         |
| `agent.transition_menu`    | Change menu status            |
| `agent.send_menu_approval` | Send menu for client approval |

### Email Drafts (DRAFTS ONLY — never auto-sends)

| Tool                          | Description                 |
| ----------------------------- | --------------------------- |
| `agent.draft_email`           | Draft generic email         |
| `draft.thank_you`             | Thank-you note              |
| `draft.referral_request`      | Referral request            |
| `draft.testimonial_request`   | Testimonial request         |
| `draft.quote_cover_letter`    | Quote cover letter          |
| `draft.decline_response`      | Decline response            |
| `draft.cancellation_response` | Cancellation response       |
| `draft.payment_reminder`      | Payment reminder            |
| `draft.re_engagement`         | Re-engagement email         |
| `draft.milestone_recognition` | Milestone recognition       |
| `draft.food_safety_incident`  | Food safety incident report |
| `email.followup`              | Draft follow-up email       |
| `email.generic`               | Draft email (generic)       |
| `email.draft_reply`           | Draft email reply           |

### Operations

| Tool                   | Description      |
| ---------------------- | ---------------- |
| `agent.schedule_call`  | Schedule call    |
| `agent.create_todo`    | Create todo item |
| `agent.log_expense`    | Log expense      |
| `agent.update_expense` | Update expense   |

### Staff Management

| Tool                       | Description             |
| -------------------------- | ----------------------- |
| `agent.create_staff`       | Create staff member     |
| `agent.assign_staff`       | Assign staff to event   |
| `agent.remove_staff`       | Remove staff from event |
| `agent.record_staff_hours` | Record staff hours      |

### Calendar

| Tool                          | Description                           |
| ----------------------------- | ------------------------------------- |
| `agent.create_calendar_entry` | Add calendar entry                    |
| `agent.update_calendar_entry` | Update calendar entry                 |
| `agent.delete_calendar_entry` | Delete calendar entry                 |
| `agent.hold_date`             | Tentatively block a date (reversible) |

### Grocery

| Tool                      | Description             |
| ------------------------- | ----------------------- |
| `agent.run_grocery_quote` | Run grocery price quote |

### Proactive / Briefing

| Tool                   | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `agent.daily_briefing` | Morning briefing (today's events, prep, overdue, inquiries) |
| `agent.whats_next`     | What should I do next?                                      |
| `nudge.list`           | Proactive nudges                                            |
| `prep.timeline`        | Prep timeline                                               |

### Intake / Parsing

| Tool                | Description                                         |
| ------------------- | --------------------------------------------------- |
| (intake-actions.ts) | Transcript parsing, bulk client import, brain dumps |

### Documents

| Tool                     | Description   |
| ------------------------ | ------------- |
| `document.create_folder` | Create folder |

---

## Tier 3 Tools (Permanently Restricted)

Always returns a refusal message with manual workaround instructions. AI cannot execute these — ever.

| Tool                   | Why Restricted                                | Manual Workaround                            |
| ---------------------- | --------------------------------------------- | -------------------------------------------- |
| `agent.ledger_write`   | Financial ledger is immutable, audit-critical | Event → Payments tab → Record Payment        |
| `agent.modify_roles`   | Security — role changes need manual action    | Settings → Team                              |
| `agent.delete_data`    | Prevents accidental data loss                 | Navigate to record → Delete button           |
| `agent.send_email`     | Remy drafts, never sends                      | Review draft → copy → send from email client |
| `agent.refund`         | Financial ledger operation                    | Event → Payments → Record Adjustment         |
| `agent.create_recipe`  | AI must NEVER generate recipes (chef IP)      | Recipes → New Recipe (manual)                |
| `agent.update_recipe`  | AI must NEVER modify recipes                  | Recipes → Edit (manual)                      |
| `agent.add_ingredient` | AI must NEVER modify recipe ingredients       | Recipes → Ingredients section (manual)       |

---

## Context Data Sections (loaded in `loadDetailedContext()`)

### Tier 1 — Always Fresh (per request)

- Chef profile (business_name, tagline)
- Quick counts (clients, events, inquiries)
- Daily plan stats

### Tier 2 — Cached 5 Minutes (shared across requests)

1. Upcoming events (next 7 days, limit 10, with loyalty data)
2. Recent clients (limit 5, with loyalty tier/points)
3. Month revenue (current month ledger sum)
4. Pending quote count
5. Calendar summary (blocked dates + entries + waitlist, next 30 days)
6. Staff roster (active members)
7. Equipment summary (by category)
8. Active goals
9. Active todos (pending/in_progress)
10. Upcoming calls (scheduled/confirmed)
11. Document summary (counts)
12. Recent Remy artifacts (limit 5)
13. Yearly stats (revenue, expenses, event counts, top clients)
14. Recipe library stats (count + categories)
15. Client vibe notes (personality/communication style)
16. Recent AAR insights (last 3 after-action reviews)
17. Pending menu approvals
18. Unread inquiry messages

### Tier 3 — Non-Blocking (fail gracefully)

- Email digest (last 24h)
- Page entity context (what chef is viewing)
- Mentioned entities (auto-resolved from message)

---

## System Prompt Assembly Order

41 sections assembled in `buildRemySystemPrompt()`:

1. REMY_PERSONALITY (core persona)
2. Personality archetype modifier
3. REMY_FEW_SHOT_EXAMPLES (8 conversation demos)
4. REMY_DRAFT_INSTRUCTIONS
5. REMY_PRIVACY_NOTE
6. REMY_TOPIC_GUARDRAILS
7. REMY_ANTI_INJECTION
8. Chef's culinary identity (optional)
9. Chef's culinary heroes (optional)
10. Current time
11. Business context (counts, revenue)
12. Upcoming events
13. Recent clients
14. Today's daily plan
15. Email inbox digest
16. Calendar & availability
17. Year-to-date stats
18. Staff roster
19. Equipment
20. Active goals
21. Todo list
22. Upcoming calls
23. Documents
24. Recent Remy work (artifacts)
25. Recipe library stats
26. Client vibe notes
27. Recent lessons learned (AAR)
28. Pending menu approvals
29. Unread inquiry messages
30. Session navigation trail
31. Recent actions
32. Recent errors
33. Session duration
34. Currently working on (activeForm)
35. Current page
36. Page entity detail
37. Mentioned entities
38. Chef memories (grouped by category)
39. Available pages (NAV_ROUTE_MAP)
40. Grounding rule
41. Response format instructions

---

## Memory System

### 8 Categories

1. `chef_preference` — likes/dislikes
2. `client_insight` — client-specific details
3. `business_rule` — pricing, booking policies
4. `communication_style` — tone, writing preferences
5. `culinary_note` — cuisine styles, techniques
6. `scheduling_pattern` — work schedule, prep habits
7. `pricing_pattern` — event pricing, margins
8. `workflow_preference` — tools, organization

### How It Works

- Memories stored in DB with `importance` (1-10), `accessCount`, optional `relatedClientId`
- SHA256 dedup prevents duplicates
- Max 30 memories in context per request
- Auto-extracted from conversations
- Manual adds via `addRemyMemoryManual()`
- Grouped by category in system prompt

---

## Input Validation & Security

### Limits

- Message: max 2000 chars
- History: max 20 messages, 4000 chars each, 30K total
- Recent pages/actions: max 10 each
- Recent errors: max 5
- Session: max 24 hours

### Security Layers

1. **Recipe generation block** — regex detects "create/make/write recipe" patterns, returns refusal before LLM
2. **Prompt injection sanitization** — strips "ignore previous instructions", "act as", "reveal prompt" patterns
3. **SSRF protection** — blocks localhost, private IPs, cloud metadata endpoints
4. **Error sanitization** — strips file paths, stack traces, DB details from client-facing errors
5. **Anti-injection prompt** — system prompt section instructs LLM to reject jailbreaks

---

## Agent Action Files (20 total)

| File                        | Domain                                  |
| --------------------------- | --------------------------------------- |
| `client-actions.ts`         | Client CRUD                             |
| `event-actions.ts`          | Event CRUD + transitions                |
| `inquiry-actions.ts`        | Inquiry CRUD + conversion               |
| `menu-actions.ts`           | Menu creation + linking                 |
| `menu-edit-actions.ts`      | Dishes, components, templates, approval |
| `quote-actions.ts`          | Quote creation + transitions            |
| `operations-actions.ts`     | Calls, todos, expenses                  |
| `draft-email-actions.ts`    | 10+ email draft templates               |
| `event-ops-actions.ts`      | Clone, debrief, checklists              |
| `staff-actions.ts`          | Staff CRUD + hours                      |
| `calendar-actions.ts`       | Calendar entries CRUD                   |
| `financial-call-actions.ts` | Expense updates, call outcomes          |
| `notes-tags-actions.ts`     | Client/inquiry notes + tags             |
| `grocery-actions.ts`        | Grocery price quoting                   |
| `proactive-actions.ts`      | What's next, nudges, contingency        |
| `intake-actions.ts`         | Transcript parsing, bulk import         |
| `briefing-actions.ts`       | Daily briefing, date holds              |
| `restricted-actions.ts`     | 8 permanently banned tools              |
| `index.ts`                  | Barrel file — registers all             |

---

## Streaming

- **Endpoint:** `POST /api/remy/stream`
- **Protocol:** Server-Sent Events (SSE)
- **Event types:** `token`, `tasks`, `nav`, `memories`, `done`, `error`, `intent`
- **Non-streaming fallback:** `sendRemyMessage()` in `remy-actions.ts`

---

## What Remy CANNOT Do (Hard Limits)

1. **Generate recipes** — ever, in any form
2. **Send emails** — drafts only, chef sends manually
3. **Write ledger entries** — payments/refunds recorded manually
4. **Change user roles** — security boundary
5. **Delete records** — manual confirmation required
6. **Access private data via cloud AI** — Ollama only for PII
7. **Make lifecycle transitions without approval** — all state changes are Tier 2
8. **Skip chef confirmation on writes** — everything that mutates is Tier 2+
