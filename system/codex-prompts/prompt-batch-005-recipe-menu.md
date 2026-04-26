---
batch_id: 'batch-005'
category: 'recipe-menu'
item_count: 5
generated_at: '2026-04-26T06:46:16.895Z'
status: 'ready'
---

# Codex Prompt: Batch 005 - Recipe Menu (5 items)

> Copy everything below this line and paste into Codex.

---

## Instructions

You are building features for ChefFlow, a Next.js chef operations platform. You will implement 5 items from the recipe-menu category. Work through them in order.

RULES:

- Only create NEW files or add to existing files. Do NOT delete or rewrite existing code.
- Do NOT add npm dependencies.
- Do NOT modify database schema or migrations.
- Do NOT touch files outside of app/, lib/, components/ unless the item specifically requires it.
- After completing ALL items, run: node devtools/work-journal.mjs log --actor codex --action completed --batch batch-005 --item "ALL" --notes "describe what you built"
- If you skip an item (already built or not feasible), run: node devtools/work-journal.mjs log --actor codex --action skipped --batch batch-005 --item "ITEM TITLE" --notes "reason"
- If an item fails, run: node devtools/work-journal.mjs log --actor codex --action failed --batch batch-005 --item "ITEM TITLE" --notes "what went wrong"
- After ALL work is done, run: node devtools/codex-receipt.mjs --batch batch-005 --actor codex

## Item 1 of 5: Insufficient hidden-risk and cross-contact signaling at ingredient level [HIGH]

**Source persona:** Rina Solis
**Confidence:** high (MISSING)
**Category:** recipe-menu
**Queue file:** system/build-queue/002-high-insufficient-hidden-risk-and-cross-contact-signaling-at-ingredie.md
**Current codebase state:**
Search hints suggest these terms should be checked: insufficient.hidden-risk, hidden-risk.cross-contact, cross-contact.signaling, signaling.ingredient, insufficient, hidden-risk, cross-contact, signaling
Confirm this state before implementing.
**What to build:**
Read system/build-queue/002-high-insufficient-hidden-risk-and-cross-contact-signaling-at-ingredie.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: Insufficient hidden-risk and cross-contact signaling at ingredient level
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- insufficient.hidden-risk
- hidden-risk.cross-contact
- cross-contact.signaling
- signaling.ingredient
- insufficient
- hidden-risk
- cross-contact
- signaling

---

## Item 2 of 5: No deterministic inventory-to-menu execution assistant [HIGH]

**Source persona:** Leo Varga
**Confidence:** medium (PARTIAL)
**Category:** recipe-menu
**Queue file:** system/build-queue/005-high-no-deterministic-inventory-to-menu-execution-assistant.md
**Current codebase state:**
Search hints suggest these terms should be checked: deterministic.inventory-to-menu, inventory-to-menu.execution, deterministic, inventory-to-menu, execution
Confirm this state before implementing.
**What to build:**
Read system/build-queue/005-high-no-deterministic-inventory-to-menu-execution-assistant.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No deterministic inventory-to-menu execution assistant
**Affected files (from validation):**

- lib/ai/ace-ollama.ts
- lib/ai/agent-actions/inquiry-response-actions.ts
- lib/ai/agent-actions/lifecycle-circle-actions.ts
  **Search hints:**
- deterministic.inventory-to-menu
- inventory-to-menu.execution
- deterministic
- inventory-to-menu
- execution

---

## Item 3 of 5: No market-first menu builder mode [HIGH]

**Source persona:** Noah Kessler
**Confidence:** medium (PARTIAL)
**Category:** recipe-menu
**Queue file:** system/build-queue/006-high-no-market-first-menu-builder-mode.md
**Current codebase state:**
Search hints suggest these terms should be checked: market-first.menu, menu.builder, market-first, builder
Confirm this state before implementing.
**What to build:**
Read system/build-queue/006-high-no-market-first-menu-builder-mode.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No market-first menu builder mode
**Affected files (from validation):**

- lib/activity/breadcrumb-types.ts
- lib/ai/client-preference-profile.ts
- lib/ai/remy-actions.ts
  **Search hints:**
- market-first.menu
- menu.builder
- market-first
- builder

---

## Item 4 of 5: No regulator-grade traceability export [HIGH]

**Source persona:** Dr. Julien Armand
**Confidence:** medium (PARTIAL)
**Category:** recipe-menu
**Queue file:** system/build-queue/009-high-no-regulator-grade-traceability-export.md
**Current codebase state:**
Search hints suggest these terms should be checked: regulator-grade.traceability, traceability.export, regulator-grade, traceability, export
Confirm this state before implementing.
**What to build:**
Read system/build-queue/009-high-no-regulator-grade-traceability-export.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No regulator-grade traceability export
**Affected files (from validation):**

- lib/documents/activity-logging.ts
- lib/haccp/templates.ts
- lib/inventory/location-actions.ts
  **Search hints:**
- regulator-grade.traceability
- traceability.export
- regulator-grade
- traceability
- export

---

## Item 5 of 5: No safe-only menu generation mode for high-risk clients [HIGH]

**Source persona:** Rina Solis
**Confidence:** high (MISSING)
**Category:** recipe-menu
**Queue file:** system/build-queue/010-high-no-safe-only-menu-generation-mode-for-high-risk-clients.md
**Current codebase state:**
Search hints suggest these terms should be checked: safe-only.menu, menu.generation, generation.high-risk, high-risk.clients, safe-only, generation, high-risk, clients
Confirm this state before implementing.
**What to build:**
Read system/build-queue/010-high-no-safe-only-menu-generation-mode-for-high-risk-clients.md for the full gap description. Implement the smallest surface that closes this gap.
Gap summary: No safe-only menu generation mode for high-risk clients
**Affected files (from validation):**

- Unknown until codebase validation runs
  **Search hints:**
- safe-only.menu
- menu.generation
- generation.high-risk
- high-risk.clients
- safe-only
- generation
- high-risk
- clients

---

## When Done

Run these commands:

```
node devtools/codex-receipt.mjs --batch batch-005 --actor codex
```

This generates a receipt of your work for Claude to review later.
