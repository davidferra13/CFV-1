---
batch_id: 'batch-006'
category: 'reporting-analytics'
item_count: 1
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 006 - Reporting Analytics (1 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 1 items from the reporting-analytics category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-006 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-006 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-006 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-006 --actor codex

## Item 1 of 1: No explicit outcome-based reaction log as first-class feedback [HIGH]

**Source persona:** Rina Solis
**Confidence:** medium (PARTIAL)
**Category:** reporting-analytics
**Queue file:** system/build-queue/020-high-no-explicit-outcome-based-reaction-log-as-first-class-feedback.md
**Current codebase state:**
Search hints suggest these terms should be checked: outcome-based.reaction, reaction.log, log.feedback, outcome-based, reaction, feedback
Confirm this state before implementing.
**What to build:**
Read system/build-queue/020-high-no-explicit-outcome-based-reaction-log-as-first-class-feedback.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No explicit outcome-based reaction log as first-class feedback
**Affected files (from validation):**

- lib/reviews/chef-feedback-actions.ts
- components/reviews/log-feedback-button.tsx
- app/(chef)/reviews/page.tsx
  **Search hints:**
- outcome-based.reaction
- reaction.log
- log.feedback
- outcome-based
- reaction
- feedback

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-006 --actor codex
```

This generates a receipt of your work for Claude to review later.
