---
batch_id: 'batch-010'
category: 'staffing-team'
item_count: 2
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 010 - Staffing Team (2 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 2 items from the staffing-team category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-010 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-010 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-010 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-010 --actor codex

## Item 1 of 2: Director-level cross-event risk cockpit is incomplete for this persona [HIGH]

**Source persona:** Jordan Hale
**Confidence:** high (MISSING)
**Category:** staffing-team
**Queue file:** system/build-queue/013-high-director-level-cross-event-risk-cockpit-is-incomplete-for-this-p.md
**Current codebase state:**
Search hints suggest these terms should be checked: director-level.cross-event, cross-event.risk, risk.cockpit, cockpit.incomplete, incomplete.persona, director-level, cross-event, cockpit
Confirm this state before implementing.
**What to build:**
Read system/build-queue/013-high-director-level-cross-event-risk-cockpit-is-incomplete-for-this-p.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: Director-level cross-event risk cockpit is incomplete for this persona
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- director-level.cross-event
- cross-event.risk
- risk.cockpit
- cockpit.incomplete
- incomplete.persona
- director-level
- cross-event
- cockpit

---

## Item 2 of 2: V1 strategy conflicts with multi-chef governance need [HIGH]

**Source persona:** Jordan Hale
**Confidence:** medium (PARTIAL)
**Category:** staffing-team
**Queue file:** system/build-queue/027-high-v1-strategy-conflicts-with-multi-chef-governance-need.md
**Current codebase state:**
Search hints suggest these terms should be checked: strategy.conflicts, conflicts.multi-chef, multi-chef.governance, strategy, conflicts, multi-chef, governance
Confirm this state before implementing.
**What to build:**
Read system/build-queue/027-high-v1-strategy-conflicts-with-multi-chef-governance-need.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: V1 strategy conflicts with multi-chef governance need
**Affected files (from validation):**

- lib/ai/remy-actions.ts
- lib/ai/remy-personality.ts
- lib/analytics/revenue-engine.ts
  **Search hints:**
- strategy.conflicts
- conflicts.multi-chef
- multi-chef.governance
- strategy
- conflicts
- multi-chef
- governance

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-010 --actor codex
```

This generates a receipt of your work for Claude to review later.
