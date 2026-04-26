# Persona Stress Test: Maya Rios

**Type:** Chef
**Date:** 2026-04-25
**Method:** local-ollama-v2

## Summary

ChefFlow is fundamentally designed for event-based dining workflows and lacks any product-centric systems for batch production, unit dosing, or traceability — making it entirely incompatible with Maya's consumer-facing cannabis product manufacturing needs.

## Score: 15/100

- Workflow Coverage (0-40): 0 -- ChefFlow has no product-based batch systems; all workflows are event-driven
- Data Model Fit (0-25): 0 -- Data model tracks events/guests, not products/batches/units
- UX Alignment (0-15): 0 -- Interface targets dining operations, not product manufacturing
- Financial Accuracy (0-10): 0 -- No product sales tracking or inventory flow
- Onboarding Viability (0-5): 0 -- Requires building custom product system from scratch
- Retention Likelihood (0-5): 0 -- Immediate abandonment due to critical gaps

## Top 5 Gaps

### Gap 1: Product System (SKUs, Batches, Units)

**Severity:** HIGH
ChefFlow has no concept of products, batches, or units. Maya needs to track 100+ brownies with exact 5mg dosing per unit — but ChefFlow only manages event courses and guests. Without this foundation, she cannot even define what constitutes a "batch" or "unit" in her workflow.

### Gap 2: Batch Dosing Engine

**Severity:** HIGH
The system lacks any mechanism to calculate THC distribution per unit in a batch. Maya requires precise calculation of total THC input → unit distribution (e.g., 100 brownies at exactly 5mg each), but ChefFlow's recipe system is designed for event courses, not batch production.

### Gap 3: Product Traceability

**Severity:** HIGH
ChefFlow cannot track the full lifecycle from raw cannabis → infused components → finished products. Maya needs batch-level traceability to ensure safety and compliance, but the system only tracks event-based ingredient usage.

### Gap 4: Label Generation

**Severity:** HIGH\*\*
ChefFlow has no functionality to generate compliant product labels (dose per unit, batch potency, ingredient list). Maya's consumer products require legal labeling, but the system lacks integration with batch data to create accurate labels.

### Gap 5: Sales Channel Tracking

**Severity:** HIGH\*\*
ChefFlow only tracks event sales (dinners), not product sales through pop-ups, drops, or direct channels. Maya's multi-channel sales require movement tracking across channels, but ChefFlow has no product-level sales history.

## Quick Wins

1. Add product batch system with unit-level dosing calculations
2. Implement potency calculator linking recipes to THC distribution
3. Build label generator using batch data for compliance

## Verdict

Maya should not use ChefFlow today because it lacks the fundamental batch dosing engine and product system required for consistent cannabis product manufacturing — the single biggest blocker is the absence of a unit-level dosing calculation capability.
