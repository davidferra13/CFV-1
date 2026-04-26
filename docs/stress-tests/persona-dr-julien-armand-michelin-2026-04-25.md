# Persona Stress Test: Dr. Julien Armand

**Type:** Chef
**Date:** 2026-04-25
**Method:** local-ollama-v2

## Summary

Dr. Julien Armand is a high-precision cannabis tasting chef running small-format, multi-course controlled dosing experiences (typically 6–10 courses for 4–10 guests). His operating model requires molecule-level ingredient provenance, per-guest dose curves mapped by course, real-time service logging, and post-event legal traceability that can stand up to compliance scrutiny. This persona is not asking for generic cannabis support; he needs an integrated system where THC/CBD/terpenes, extraction details, batch lineage, guest screening, safety constraints, and dose outcomes are treated as first-class operational data across planning, execution, and reporting.

## Score: 68/100

- Workflow Coverage (0-40): 27 -- Adequate coverage with notable gaps
- Data Model Fit (0-25): 17 -- Adequate coverage with notable gaps
- UX Alignment (0-15): 10 -- Adequate coverage with notable gaps
- Financial Accuracy (0-10): 7 -- Adequate coverage with notable gaps
- Onboarding Viability (0-5): 3 -- Adequate coverage with notable gaps
- Retention Likelihood (0-5): 4 -- Strong coverage in this area

## Top 5 Gaps

### Gap 1: No deterministic dose-curve engine

**Severity:** HIGH
For assigning and validating per-guest dose progression by course (the persona’s core workflow).

### Gap 2: No molecule-level culinary data model

**Severity:** HIGH
Tying batch/extraction/potency/terpenes to ingredients, dishes, and courses.

### Gap 3: No real-time dosing administration log

**Severity:** HIGH
That records exact delivered mg and immediate guest response in-service.

### Gap 4: No regulator-grade traceability export

**Severity:** HIGH
That proves source material, preparation mapping, delivery, and consumption chain of custody.

### Gap 5: No cannabis outcome intelligence loop

**Severity:** HIGH
(cross-event analysis of dose patterns, tolerance, adverse signals, and optimal progression templates).

## Quick Wins

1. Add structured fields to cannabis event notes payload
2. Add a “Dose Curve” JSON block to cannabis event config
3. Add a compliance checklist widget on `/cannabis/events`

## Verdict

ChefFlow is unusually well-positioned compared with generic chef tools because it already includes a cannabis vertical and broad operational infrastructure, but it does not yet satisfy the persona’s defining need: deterministic, molecule-level controlled dosing operations.

---

## Appendix (preserved from original report)

**Persona Source:** `system/codex-queue/persona-dr-julien-armand-michelin.md`
**Product References:** `docs/product-blueprint.md`, `docs/app-complete-audit.md`

### 2) Capability Fit Ratings (SUPPORTED / PARTIAL / MISSING)

| Capability Needed by Persona                                                                          | Current ChefFlow Fit | Evidence & Notes                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cannabis-focused workspace and dedicated routes                                                       | **SUPPORTED**        | ChefFlow has a dedicated cannabis vertical with hub, events, compliance, invite/consent, ledger, handbook, and RSVPs.                                                                  |
| Cannabis guest intake + participation tracking                                                        | **SUPPORTED**        | `/cannabis/rsvps` tracks guest participation/intake; `/cannabis/invite` includes age verification + consent forms.                                                                     |
| Generic compliance tooling and traceability posture                                                   | **PARTIAL**          | Cannabis compliance tracker + cannabis ledger + global immutable ledger/compliance surfaces exist, but no explicit end-to-end “ingredient→dose→guest” legal report flow is documented. |
| Per-course, per-guest dose curve planner (microdose→peak→taper)                                       | **MISSING**          | No documented feature that maps dose curves by guest across course sequence.                                                                                                           |
| Molecule-level ingredient schema (THC/CBD mg, terpene profile, extraction metadata, batch provenance) | **MISSING**          | Cannabis events mention strain pairings/dosage info, but no explicit structured schema at ingredient/dish/course granularity is documented.                                            |
| Flavor + pharmacology pairing intelligence                                                            | **MISSING**          | Menu intelligence supports allergens/dietary/client taste and pricing/context, but no terpene-aromatic or fat-absorption pharmacokinetic modeling is documented.                       |
| Real-time in-service dose delivered + response logging                                                | **PARTIAL**          | Real-time activity infrastructure exists broadly, but no explicit dose administration + physiological/subjective response log flow is documented.                                      |
| Post-event, regulator-ready cannabis dosing audit packet                                              | **MISSING**          | No explicit one-click compliance export for controlled-dose events is described in blueprint/audit docs.                                                                               |
| Longitudinal outcome analytics for dose optimization                                                  | **PARTIAL**          | Analytics hub exists, but no cannabis-specific closed-loop analytics for dose curves/tolerance progression/outcome efficacy is documented.                                             |
| Workflow breadth outside cannabis (CRM, events, finance, operations)                                  | **SUPPORTED**        | Six-pillar platform is broadly comprehensive and mature for general chef operations.                                                                                                   |

### Build Follow-Up (2026-04-25)

Implemented one focused vertical slice from Quick Win #3: a **compliance checklist widget on `/cannabis/events`** rendered on each cannabis event card.

### What was built

- Added derived checklist states for each cannabis event:
  - source batch linked
  - consent signed
  - dose plan complete
  - post-service log complete
- Wired checklist derivation into the cannabis events server action using existing tenant-scoped data:
  - `cannabis_event_details` (consent)
  - `event_cannabis_course_config` (dose plan)
  - latest `cannabis_control_packet_snapshots` + `cannabis_control_packet_reconciliations` (source batch + post-service logging)
- Added visual checklist pills to the cannabis event card UI so operators can quickly see operational readiness before opening control packets.
- Added focused unit coverage for checklist derivation logic.

### What remains

- This slice is an event-list readiness indicator only; it does not yet implement:
  - deterministic per-guest/per-course dose-curve authoring engine
  - in-service physiological/subjective response telemetry capture
  - one-click regulator-grade export packet for ingredient→dose→guest traceability
