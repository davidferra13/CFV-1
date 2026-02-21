# Build: Command Center — Agent Swarm Orchestration Layer

## What Was Built

A dedicated `/commands` page that lets the chef type any multi-part instruction and have ChefFlow decompose it into parallel tasks, execute them simultaneously, and return results through a three-tier approval system.

---

## Why

ChefFlow had 60+ discrete AI capabilities scattered across detail pages and a floating drawer, with no unified way for the chef to issue multi-step commands. Each capability required navigating to a specific page. This build wires them into a single orchestration layer that the chef will use daily.

The parallel execution model (inspired by the agent swarm pattern) means independent tasks — find a client, check a date, look up events — all fire simultaneously instead of waiting for each other. A command that would have taken 3 sequential page navigations now returns in a single response.

---

## Three-Tier Approval System

Every task result is classified before being shown to the chef:

| Tier          | Color  | Behavior                                                             | Examples                                                   |
| ------------- | ------ | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| **1 — Auto**  | Green  | Fires immediately, no approval needed                                | Client lookup, calendar check, event list, revenue summary |
| **2 — Draft** | Yellow | Executes to draft state — nothing sent/saved until chef taps Approve | Follow-up emails, event drafts                             |
| **3 — Hold**  | Red    | Parks with explanation — never executes                              | Low confidence, ambiguous entities, financial writes       |

This matches the existing AI Policy (no autonomous mutations, draft-and-approve pattern).

---

## Files Created

| File                                      | Role                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib/ai/command-types.ts`                 | Shared TypeScript types: `CommandRun`, `TaskResult`, `PlannedTask`, `ApprovalTier`                            |
| `lib/ai/command-task-descriptions.ts`     | Task metadata (name, description, input schema, tier) used in system prompt and UI labels                     |
| `lib/ai/command-intent-parser.ts`         | Ollama-backed parser: converts freeform chef input → structured `CommandPlan` with per-task confidence scores |
| `lib/ai/command-orchestrator.ts`          | Core engine: builds dependency DAG, executes rounds in parallel, returns `CommandRun`                         |
| `app/(chef)/commands/page.tsx`            | Route wrapper — server component, calls `requireChef()`                                                       |
| `components/ai/command-center-client.tsx` | Main client UI: textarea, quick prompts, results panel                                                        |
| `components/ai/command-result-card.tsx`   | Single task result card with tier-based styling and approve/reject actions                                    |

## Files Modified

| File                                   | Change                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------- | --- | ------- | --- | --------------------- |
| `lib/clients/actions.ts`               | Added `searchClientsByName(query)` — ILIKE search, tenant-scoped                      |
| `lib/scheduling/calendar-sync.ts`      | Added `checkCalendarAvailability(date)` — queries ChefFlow events table for conflicts |
| `components/navigation/nav-config.tsx` | Added `Bot` icon import + `/commands` as second item in `standaloneTop`               |
| `lib/gmail/sync.ts`                    | Fixed `eventDate: ...                                                                 |     | null`→` |     | undefined` (type fix) |
| `lib/quotes/client-actions.ts`         | Removed non-existent `quote_name` column from select                                  |

---

## How It Works (Execution Flow)

```
Chef types: "Find Sarah Johnson and draft her a follow-up"
                 ↓
parseCommandIntent() — Ollama parses → CommandPlan:
  t1: client.search  (tier 1, confidence: 0.95)
  t2: email.followup (tier 2, confidence: 0.90, dependsOn: ["t1"])
                 ↓
Round 1 (parallel): t1 fires → returns Sarah Johnson's client record
                 ↓
Round 2 (t2 gets t1's result): email.followup calls generateFollowUpDraft(clientId)
                 ↓
UI renders:
  🟢 Find Client    — Done: "Sarah Johnson, active"
  🟡 Draft Email    — Awaiting approval: [email text] [Approve] [Dismiss]
```

---

## Registered Tasks (v1)

**Tier 1 (auto-execute):**

- `client.search` → `searchClientsByName()`
- `calendar.availability` → `checkCalendarAvailability()`
- `event.list_upcoming` → Supabase query
- `finance.summary` → events + ledger_entries queries

**Tier 2 (draft + approve):**

- `email.followup` → `generateFollowUpDraft()`
- `event.create_draft` → `parseEventFromText()`

---

## Privacy

The intent parser calls `parseWithOllama()` — all commands stay local regardless of content. Individual task executors respect their own existing privacy routing (already enforced in the underlying functions). `OllamaOfflineError` propagates to the UI: "Start Ollama to use this feature."

---

## Navigation

`Command Center` is the second item in `standaloneTop` (after Dashboard), visible on every chef page in the primary nav with the `Bot` icon.

---

## What's Next (Backlog)

The architecture is designed to grow. Adding a new capability = adding one entry to `TASK_DESCRIPTIONS` and one case to the switch in `command-orchestrator.ts`. Suggested additions based on chef workflows:

- `reminder.set` — Set a timed reminder (Tier 2)
- `sms.draft` — Draft an SMS to a client (Tier 2)
- `client.segment_email` — Draft email to filtered client segment, e.g. "clients under 30" (Tier 2)
- `event.prep_doc` — Generate prep document for next event with allergies highlighted (Tier 2)
- `client.rank` — List clients ranked by booking count or revenue (Tier 1)
- `allergy.report` — Most common allergies across client roster (Tier 1)
- `menu.send` — Send a specific menu to a specific client (Tier 2, explicit approval required)
- `event.summary_sms` — Event summary formatted for SMS (Tier 2)
- Voice input — Web Speech API overlay on the textarea
- Command history — Persistent log of past runs
