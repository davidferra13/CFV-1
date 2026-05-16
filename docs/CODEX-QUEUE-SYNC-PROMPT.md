# CODEX: Adopt Unified Build Queue Contract

You have been maintaining your own internal task queue separately from Claude Code. This caused a split: Claude had ~75 items from specs/memory, you had 123 items from GSD analysis. Neither agent saw the other's work.

This is now fixed. A unified build queue exists at `docs/UNIFIED-BUILD-QUEUE.md`. It contains ALL items from both your queue and Claude's queue, deduplicated and categorized.

## Your Task

1. **Read `docs/UNIFIED-BUILD-QUEUE.md`** in full. This is now your queue too.

2. **Read the contract in `CLAUDE.md`** (search for "BUILD QUEUE CONTRACT"). The rules:
   - `docs/UNIFIED-BUILD-QUEUE.md` is the single source of truth
   - Before building: mark items `IN-FLIGHT`
   - After building: mark `PARTIAL` (built, unverified) or `DONE` (verified)
   - New work discovered: add to appropriate category with correct status
   - Never rebuild the queue from scratch; update in place
   - Status tags: `SPEC-READY`, `PARTIAL`, `DRAFT`, `UNSPECCED`, `BLOCKED`, `IN-FLIGHT`, `DONE`

3. **Reconcile your current active/blocked items.** If any of your tracked items are missing from the unified queue or have wrong status, update the queue file. Specifically:
   - Your 1 in-flight item (Legal Readiness Center) should be `IN-FLIGHT`
   - Your 13 blocked items should be `BLOCKED` with reasons
   - Your 109 active items should be `SPEC-READY` (or `PARTIAL` if code exists)

4. **Stop maintaining a separate queue.** From now on:
   - When you discover new work: add it to `docs/UNIFIED-BUILD-QUEUE.md`
   - When you start work: mark it `IN-FLIGHT` in that file
   - When you finish: mark it `PARTIAL` or `DONE`
   - When you read your backlog: read that file

5. **Verify your blocked items are still blocked.** For each BLOCKED item, check if the blocker has been resolved. If yes, update status to `SPEC-READY`.

## Why This Matters

The developer runs both Claude Code and Codex on the same codebase. When you maintain separate queues:

- Work gets duplicated (both agents build the same thing)
- Work gets missed (one agent's discoveries are invisible to the other)
- Status diverges (Claude thinks something is spec-ready, you think it's done)
- The developer has to manually reconcile, which defeats the purpose of AI agents

One file. Both agents update it. No more drift.

## After Completing This Task

Commit the updated `docs/UNIFIED-BUILD-QUEUE.md` with message:

```
chore: sync Codex queue state into unified build queue
```
