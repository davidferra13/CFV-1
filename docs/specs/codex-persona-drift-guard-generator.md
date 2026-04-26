# Codex Build Spec: Generator Anti-Drift Prompt

> **Scope:** One file, one function. Add anti-drift instructions to the LLM prompt in `persona-generator.mjs`.
> **Risk:** LOW. No architecture changes. Only modifies the text prompt sent to Ollama.

---

## Problem

The persona generator (`devtools/persona-generator.mjs`) can produce personas that demand features belonging to a completely different product (LMS, marketplace, warehouse system). The validator now catches these at Stage 0, but we waste Ollama tokens generating garbage that gets immediately rejected.

Fix: tell the LLM not to generate drifted content in the first place.

---

## What to Change

### File: `devtools/persona-generator.mjs`

### Change 1: Update `SEED_CATEGORIES` entry for `culinary-educator` (line ~61-66)

The current constraints for the `culinary-educator` category include `student tracking` and `scheduling classes` which actively encourage LMS drift.

**Current:**

```js
{
  id: 'culinary-educator',
  label: 'Culinary Educator / School',
  seeds: ['Jacques Pepin', 'Samin Nosrat', 'Thomas Keller'],
  constraints: 'Curriculum, student tracking, recipe documentation, technique library, scheduling classes',
},
```

**Replace with:**

```js
{
  id: 'culinary-educator',
  label: 'Culinary Educator / School',
  seeds: ['Jacques Pepin', 'Samin Nosrat', 'Thomas Keller'],
  constraints: 'Recipe documentation, technique library, class scheduling as events, menu planning for teaching sessions, ingredient sourcing for demos, costing per class, managing bookings',
},
```

### Change 2: Add anti-drift block to `buildPrompt()` function (line ~258)

Find the `CRITICAL RULES:` block at the end of the prompt string (around line 344-352). Add the following block AFTER the existing rules, BEFORE the closing backtick of the template literal:

**Add this text right before the final backtick (`` ` ``) that closes the prompt string:**

```

PRODUCT DRIFT RULES (MANDATORY):
ChefFlow is a chef operations platform: events, clients, recipes, menus, ingredients, pricing, costing, sourcing, scheduling, staff, vendors, compliance, tickets, bookings.
ChefFlow is NOT: an LMS, a marketplace, a warehouse system, a social network, a generic CRM, or project management software.
- NEVER include pass/fail conditions about: student tracking, skill progression, learning paths, curriculum systems, enrollment, grades, seller dashboards, fleet tracking, supply chain management, lead scoring, sales pipelines, or kanban boards.
- If the persona involves teaching/education (e.g. culinary educator), frame ALL problems as chef ops problems: class scheduling = event management, recipe library = recipe documentation, class costing = event costing, student bookings = client bookings.
- Every pass/fail condition must map to something a chef operations platform would handle. If it sounds like it belongs in a different product category, rewrite it as a chef ops problem or remove it.
```

---

## What NOT to Change

- Do NOT modify the validator (`persona-validator.mjs`). It already has drift detection.
- Do NOT modify any other files.
- Do NOT change the function signatures, imports, or CLI argument handling.
- Do NOT change the Ollama call logic, temperature, or model selection.

---

## Verification

After making changes, run:

```bash
node devtools/persona-generator.mjs --category culinary-educator --dry-run --model hermes3:8b
```

The generated persona should:

1. Pass validation (exit code 0)
2. Have `drift_ratio` below 0.4 (check with `--json` flag on the validator)
3. Pass/fail conditions should reference events, recipes, clients, menus, pricing (not students, curriculum, learning paths)

If Ollama is not running, the verification will fail with a connection error. That is expected and acceptable.
