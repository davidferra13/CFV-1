# Consolidated Build: Dosing Cannabis

**Priority rank:** 2 of 14
**Personas affected:** 3 (Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef), Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef), Maya Rios Cannabis Pastry Chef Micro)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 7 related gaps in dosing cannabis. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **No cannabis outcome intelligence loop** - from Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef) - MEDIUM
   (cross-event analysis of dose patterns, tolerance, adverse signals, and optimal progression templates).
2. **No canonical central dosing engine** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - HIGH
   Why it matters: Jordan’s highest-risk failure mode is inconsistent per-course dose allocation across chefs and events. Current state: cannabis pages and dosage fields exist, but there is no explicitly...
3. **Compliance evidence is fragmented across multiple screens** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - MEDIUM
   Why it matters: legal defensibility depends on one coherent chain from intake → dosing decisions → execution → outcome logs. Current state: compliance tracker + cannabis ledger + events + RSVPs exist,...
4. **Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - HIGH
   Why it matters: repeat guest dosing should improve with historical response and adverse-reaction memory. Current state: CRM and event history are strong, but explicit cannabis tolerance evolution and ...
5. **Director-level cross-event risk cockpit is incomplete for this persona** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - HIGH
   Why it matters: Jordan needs one glance to see which event/chef/course combinations are dose-risky now. Current state: strong dashboards exist, but no explicit cannabis-risk heatmap or multi-chef exce...
6. **Batch Dosing Engine** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   The system lacks any mechanism to calculate THC distribution per unit in a batch. Maya requires precise calculation of total THC input → unit distribution (e.g., 100 brownies at exactly 5mg each), but...
7. **Label Generation** - from Maya Rios Cannabis Pastry Chef Micro - HIGH
   \*\* ChefFlow has no functionality to generate compliant product labels (dose per unit, batch potency, ingredient list). Maya's consumer products require legal labeling, but the system lacks integration...

## Recommended Build Scope

A single consolidated build addressing all dosing cannabis gaps should cover:

- No cannabis outcome intelligence loop
- No canonical central dosing engine
- Compliance evidence is fragmented across multiple screens
- Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal
- Director-level cross-event risk cockpit is incomplete for this persona
- Batch Dosing Engine
- Label Generation

## Existing Build Tasks

- `system/persona-build-plans/maya-rios-cannabis-pastry-chef-micro/task-1.md`

## Acceptance Criteria (merged from all personas)

1. Dr. Julien Armand (Michelin-Level Cannabis Tasting Chef): No cannabis outcome intelligence loop is addressed
2. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): No canonical central dosing engine is addressed
3. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): Compliance evidence is fragmented across multiple screens is addressed
4. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal is addressed
5. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): Director-level cross-event risk cockpit is incomplete for this persona is addressed
6. Maya Rios Cannabis Pastry Chef Micro: Batch Dosing Engine is addressed
7. Maya Rios Cannabis Pastry Chef Micro: Label Generation is addressed
