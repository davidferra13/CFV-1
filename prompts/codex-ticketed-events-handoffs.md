# Ticketed Events: Codex Agent Handoff Prompts

## What This Fixes

5 bugs block the entire ticketed events feature. 1 was already fixed (public-event-view.tsx exists). These 2 agents fix the remaining 4. A 5th bug (no ledger entry for ticket revenue) is deferred to Claude Code because it touches the same file as Agent 2.

| Bug                                                   | Severity | Agent    |
| ----------------------------------------------------- | -------- | -------- |
| `event_share_settings` table never created            | CRITICAL | Agent 1  |
| `event_guests.event_share_id` NOT NULL blocks webhook | MEDIUM   | Agent 1  |
| Wrong shareToken passed to tickets tab                | HIGH     | Agent 2  |
| Toggle button uses wrong heuristic                    | HIGH     | Agent 2  |
| No ledger entry for ticket revenue                    | MEDIUM   | Deferred |

## Execution Order

Agent 1 and Agent 2 run in **parallel**. Zero file overlap.

- Agent 1 creates 1 new SQL file. Touches nothing else.
- Agent 2 edits 3 existing TypeScript files. Touches nothing else.

---

## Agent 1: Migration

```
Read prompts/codex-ticketed-events-agent-1-migration.md and execute it.

You are writing exactly ONE new SQL migration file. Do not edit or create any other file. Do not run drizzle-kit push. Do not touch TypeScript.

After writing, run the verification commands at the bottom of the spec and paste the output.
```

---

## Agent 2: Wiring Fixes

```
Read prompts/codex-ticketed-events-agent-2-wiring.md and execute it.

You are making surgical find-and-replace edits to exactly 3 files. Each edit has the EXACT old code to find and the EXACT new code to replace it with. If you cannot find the exact string, STOP and report what you see. Do not guess. Do not rewrite surrounding code. Do not create new files. Do not touch the database.

After all edits, run the verification commands at the bottom of the spec and paste the output.
```

---

## After Both Agents Complete

Run this combined verification:

```bash
echo "=== Migration file ===" && \
ls database/migrations/*ticketed_events_share_settings.sql 2>/dev/null && \
echo "=== shareToken wiring ===" && \
grep -c "ticketShareToken" "app/(chef)/events/[id]/page.tsx" && \
echo "=== ticketsEnabled prop ===" && \
grep -c "ticketsEnabled" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" && \
echo "=== webhook guest fix ===" && \
grep -c "eventShareId" "lib/tickets/webhook-handler.ts" && \
echo "=== Expected: migration file exists, all counts >= 1 ==="
```

Then run a type check to confirm no regressions:

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(page\.tsx|tickets-tab|webhook-handler)" | head -10
```

If the type check shows errors in the 3 edited files, those are regressions from Agent 2. If errors are in OTHER files, they are pre-existing and unrelated.

## Still Remaining After These Agents

1. **Ledger entry for ticket revenue** (Medium): Add a `ledger_entries` insert in `lib/tickets/webhook-handler.ts` after the ticket is marked as paid. Pattern: see `lib/events/historical-import-actions.ts` line 165. Do this with Claude Code, not Codex, because Agent 2 already edited this file.

2. **Apply the migration**: Developer must run `drizzle-kit push` manually after reviewing the SQL and backing up the database.

3. **End-to-end test**: After migration is applied, test the full flow: create event > enable ticketing > purchase ticket on public page > verify Stripe webhook > verify guest record + circle join.
