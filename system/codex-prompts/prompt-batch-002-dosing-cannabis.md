---
batch_id: 'batch-002'
category: 'dosing-cannabis'
item_count: 5
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 002 - Dosing Cannabis (5 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 5 items from the dosing-cannabis category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-002 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-002 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-002 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-002 --actor codex

## Item 1 of 5: Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal [HIGH]

**Source persona:** Jordan Hale
**Confidence:** medium (PARTIAL)
**Category:** dosing-cannabis
**Queue file:** system/build-queue/001-high-guest-cannabis-tolerance-history-is-not-modeled-as-a-first-class.md
**Current codebase state:**
Search hints suggest these terms should be checked: guest.cannabis, cannabis.tolerance, tolerance.history, history.modeled, modeled.longitudinal, longitudinal.safety, safety.signal, guest
Confirm this state before implementing.
**What to build:**
Read system/build-queue/001-high-guest-cannabis-tolerance-history-is-not-modeled-as-a-first-class.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal
**Affected files (from validation):**

- lib/chef/cannabis-actions.ts
- lib/db/migrations/schema.ts
- lib/db/schema/schema.ts
  **Search hints:**
- guest.cannabis
- cannabis.tolerance
- tolerance.history
- history.modeled
- modeled.longitudinal
- longitudinal.safety
- safety.signal
- guest

---

## Item 2 of 5: No cannabis outcome intelligence loop [HIGH]

**Source persona:** Dr. Julien Armand
**Confidence:** medium (PARTIAL)
**Category:** dosing-cannabis
**Queue file:** system/build-queue/003-high-no-cannabis-outcome-intelligence-loop.md
**Current codebase state:**
Search hints suggest these terms should be checked: cannabis.outcome, outcome.intelligence, intelligence.loop, cannabis, outcome, intelligence
Confirm this state before implementing.
**What to build:**
Read system/build-queue/003-high-no-cannabis-outcome-intelligence-loop.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No cannabis outcome intelligence loop
**Affected files (from validation):**

- lib/admin/audit.ts
- lib/admin/cannabis-actions.ts
- lib/ai/ace-ollama.ts
  **Search hints:**
- cannabis.outcome
- outcome.intelligence
- intelligence.loop
- cannabis
- outcome
- intelligence

---

## Item 3 of 5: No deterministic dose-curve engine [HIGH]

**Source persona:** Dr. Julien Armand
**Confidence:** medium (PARTIAL)
**Category:** dosing-cannabis
**Queue file:** system/build-queue/004-high-no-deterministic-dose-curve-engine.md
**Current codebase state:**
Search hints suggest these terms should be checked: deterministic.dose-curve, deterministic, dose-curve
Confirm this state before implementing.
**What to build:**
Read system/build-queue/004-high-no-deterministic-dose-curve-engine.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No deterministic dose-curve engine
**Affected files (from validation):**

- lib/ai/ace-ollama.ts
- lib/ai/agent-actions/inquiry-response-actions.ts
- lib/ai/agent-actions/lifecycle-circle-actions.ts
  **Search hints:**
- deterministic.dose-curve
- deterministic
- dose-curve

---

## Item 4 of 5: No molecule-level culinary data model [HIGH]

**Source persona:** Dr. Julien Armand
**Confidence:** medium (PARTIAL)
**Category:** dosing-cannabis
**Queue file:** system/build-queue/007-high-no-molecule-level-culinary-data-model.md
**Current codebase state:**
Search hints suggest these terms should be checked: molecule-level.culinary, culinary.data, molecule-level, culinary
Confirm this state before implementing.
**What to build:**
Read system/build-queue/007-high-no-molecule-level-culinary-data-model.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No molecule-level culinary data model
**Affected files (from validation):**

- lib/activity/breadcrumb-types.ts
- lib/activity/resume.ts
- lib/ai/carry-forward-match.ts
  **Search hints:**
- molecule-level.culinary
- culinary.data
- molecule-level
- culinary

---

## Item 5 of 5: Product System (SKUs, Batches, Units) [HIGH]

**Source persona:** Maya Rios
**Confidence:** medium (PARTIAL)
**Category:** dosing-cannabis
**Queue file:** system/build-queue/011-high-product-system-skus-batches-units.md
**Current codebase state:**
Search hints suggest these terms should be checked: product.skus, skus.batches, batches.units, product, batches, units
Confirm this state before implementing.
**What to build:**
Read system/build-queue/011-high-product-system-skus-batches-units.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: Product System (SKUs, Batches, Units)
**Affected files (from validation):**

- lib/admin/platform-stats.ts
- lib/ai/command-intent-parser.ts
- lib/ai/command-orchestrator.ts
  **Search hints:**
- product.skus
- skus.batches
- batches.units
- product
- batches
- units

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-002 --actor codex
```

This generates a receipt of your work for Claude to review later.
