---
name: pricing-engine-auditor
description: Audit ChefFlow pricing data engine reliability. Use when work touches pricing proof, OpenClaw acquisition, ingredient matching, unit normalization, menu costing, quote safety, geographic coverage, nationwide readiness, fallback pricing, or any question like "does ChefFlow work", "is pricing reliable", "what now", "audit the data engine", or "pricing data sucks".
---

# Pricing Engine Auditor

## Purpose

Prove whether ChefFlow can price real menus from system-owned data. Do not infer reliability from raw product counts, national averages, or modeled fallbacks.

## Mandatory Audit Loop

1. Inspect branch and dirty work.
2. Attach to canonical pricing files:
   - `lib/pricing/geographic-proof-query.ts`
   - `lib/pricing/geographic-proof-classifier.ts`
   - `lib/pricing/geographic-proof-evidence.ts`
   - `lib/pricing/standard-unit-normalization.ts`
   - `scripts/audit-geographic-pricing-proof.mjs`
   - `scripts/audit-openclaw-unit-normalization.mjs`
3. Run focused tests:
   - `node --test --import tsx tests/unit/geographic-pricing-proof-classifier.test.ts tests/unit/geographic-pricing-proof-coverage.test.ts tests/unit/geographic-pricing-proof-evidence.test.ts tests/unit/standard-unit-normalization.test.ts`
4. Run proof dry-run:
   - `node scripts/audit-geographic-pricing-proof.mjs --dry-run`
5. Run unit normalization dry-run:
   - `node scripts/audit-openclaw-unit-normalization.mjs`
6. Report:
   - row count
   - safe-to-quote count
   - verify-first count
   - planning-only count
   - not-usable count
   - top blockers
   - worst geographies
   - next highest-leverage build move

## Hard Rules

- Do not call ChefFlow reliable unless proof says so.
- Do not mark modeled fallback as observed truth.
- Do not hide missing local coverage behind national coverage.
- Do not treat zero-dollar prices as valid.
- Do not run write-mode normalization without DB backup and explicit approval.
- Do not apply migrations without explicit approval.
- Do not recommend generic launch validation when the blocker is pricing proof.

## Verdict Format

Always end with:

```text
VERDICT:
[reliable / regionally usable / verify-first only / planning-only / not reliable]

WHY:
[one short paragraph]

NEXT MOVE:
[one concrete build or data action]
```
