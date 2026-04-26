---
batch_id: 'batch-009'
category: 'sourcing-supply'
item_count: 2
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 009 - Sourcing Supply (2 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 2 items from the sourcing-supply category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-009 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-009 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-009 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-009 --actor codex

## Item 1 of 2: No destination-first store intelligence for travel [HIGH]

**Source persona:** Noah Kessler
**Confidence:** medium (PARTIAL)
**Category:** sourcing-supply
**Queue file:** system/build-queue/015-high-no-destination-first-store-intelligence-for-travel.md
**Current codebase state:**
Search hints suggest these terms should be checked: destination-first.store, store.intelligence, intelligence.travel, destination-first, store, intelligence, travel
Confirm this state before implementing.
**What to build:**
Read system/build-queue/015-high-no-destination-first-store-intelligence-for-travel.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No destination-first store intelligence for travel
**Affected files (from validation):**

- app/(public)/nearby/\_components/nearby-collection-modules.tsx
  **Search hints:**
- destination-first.store
- store.intelligence
- intelligence.travel
- destination-first
- store
- intelligence
- travel

---

## Item 2 of 2: No multi-store route and split-cart optimizer [HIGH]

**Source persona:** Noah Kessler
**Confidence:** medium (PARTIAL)
**Category:** sourcing-supply
**Queue file:** system/build-queue/024-high-no-multi-store-route-and-split-cart-optimizer.md
**Current codebase state:**
Search hints suggest these terms should be checked: multi-store.route, route.split-cart, split-cart.optimizer, multi-store, route, split-cart, optimizer
Confirm this state before implementing.
**What to build:**
Read system/build-queue/024-high-no-multi-store-route-and-split-cart-optimizer.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No multi-store route and split-cart optimizer
**Affected files (from validation):**

- components/pricing/event-shopping-planner.tsx
- components/pricing/shopping-optimizer.tsx
  **Search hints:**
- multi-store.route
- route.split-cart
- split-cart.optimizer
- multi-store
- route
- split-cart
- optimizer

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-009 --actor codex
```

This generates a receipt of your work for Claude to review later.
