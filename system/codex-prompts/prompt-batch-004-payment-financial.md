---
batch_id: 'batch-004'
category: 'payment-financial'
item_count: 1
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 004 - Payment Financial (1 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 1 items from the payment-financial category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-004 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-004 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-004 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-004 --actor codex

## Item 1 of 1: No real-time store-level price truth contract [HIGH]

**Source persona:** Noah Kessler
**Confidence:** high (MISSING)
**Category:** payment-financial
**Queue file:** system/build-queue/030-high-no-real-time-store-level-price-truth-contract.md
**Current codebase state:**
Search hints suggest these terms should be checked: store-level.price, price.truth, truth.contract, store-level, price, truth, contract
Confirm this state before implementing.
**What to build:**
Read system/build-queue/030-high-no-real-time-store-level-price-truth-contract.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No real-time store-level price truth contract
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- store-level.price
- price.truth
- truth.contract
- store-level
- price
- truth
- contract

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-004 --actor codex
```

This generates a receipt of your work for Claude to review later.
