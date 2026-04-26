---
batch_id: 'batch-008'
category: 'scheduling-calendar'
item_count: 2
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 008 - Scheduling Calendar (2 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 2 items from the scheduling-calendar category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-008 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-008 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-008 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-008 --actor codex

## Item 1 of 2: No documented conflict-safe sync model [HIGH]

**Source persona:** Leo Varga
**Confidence:** medium (PARTIAL)
**Category:** scheduling-calendar
**Queue file:** system/build-queue/018-high-no-documented-conflict-safe-sync-model.md
**Current codebase state:**
Search hints suggest these terms should be checked: documented.conflict-safe, conflict-safe.sync, documented, conflict-safe
Confirm this state before implementing.
**What to build:**
Read system/build-queue/018-high-no-documented-conflict-safe-sync-model.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No documented conflict-safe sync model
**Affected files (from validation):**

- lib/auth/server-action-inventory.ts
- lib/clients/completeness.ts
- lib/completion/evaluators/client.ts
  **Search hints:**
- documented.conflict-safe
- conflict-safe.sync
- documented
- conflict-safe

---

## Item 2 of 2: No explicit offline-first guarantee for mission-critical workflows [HIGH]

**Source persona:** Leo Varga
**Confidence:** high (MISSING)
**Category:** scheduling-calendar
**Queue file:** system/build-queue/019-high-no-explicit-offline-first-guarantee-for-mission-critical-workflo.md
**Current codebase state:**
Search hints suggest these terms should be checked: offline-first.guarantee, guarantee.mission-critical, mission-critical.workflows, offline-first, guarantee, mission-critical, workflows
Confirm this state before implementing.
**What to build:**
Read system/build-queue/019-high-no-explicit-offline-first-guarantee-for-mission-critical-workflo.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No explicit offline-first guarantee for mission-critical workflows
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- offline-first.guarantee
- guarantee.mission-critical
- mission-critical.workflows
- offline-first
- guarantee
- mission-critical
- workflows

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-008 --actor codex
```

This generates a receipt of your work for Claude to review later.
