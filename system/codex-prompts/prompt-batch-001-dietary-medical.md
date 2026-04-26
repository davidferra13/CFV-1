---
batch_id: 'batch-001'
category: 'dietary-medical'
item_count: 1
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 001 - Dietary Medical (1 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 1 items from the dietary-medical category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-001 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-001 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-001 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-001 --actor codex

## Item 1 of 1: No hard medical constraint enforcement engine (blocking layer) [HIGH]

**Source persona:** Rina Solis
**Confidence:** high (MISSING)
**Category:** dietary-medical
**Queue file:** system/build-queue/023-high-no-hard-medical-constraint-enforcement-engine-blocking-layer.md
**Current codebase state:**
Search hints suggest these terms should be checked: hard.medical, medical.constraint, constraint.enforcement, enforcement.blocking, medical, constraint, enforcement, blocking
Confirm this state before implementing.
**What to build:**
Read system/build-queue/023-high-no-hard-medical-constraint-enforcement-engine-blocking-layer.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No hard medical constraint enforcement engine (blocking layer)
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- hard.medical
- medical.constraint
- constraint.enforcement
- enforcement.blocking
- medical
- constraint
- enforcement
- blocking

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-001 --actor codex
```

This generates a receipt of your work for Claude to review later.
