# Persona Stress Test: michael-greger

**Type:** Chef
**Date:** 2026-04-30
**Method:** local-ollama-v2
**Normalized:** true

## Summary

Overall Fit: High Potential, but requires significant customization in the compliance and traceability modules. Risk Level: Medium-High (Due to liability associated with specialized diets). Recommendation: Pilot testing focused exclusively on the Inventory/Compliance module before full rollout.

## Score: 50/100

- Workflow Coverage (0-40): 20 -- Normalized from non-standard analyzer output.
- Data Model Fit (0-25): 13 -- Normalized from non-standard analyzer output.
- UX Alignment (0-15): 8 -- Normalized from non-standard analyzer output.
- Financial Accuracy (0-10): 5 -- Normalized from non-standard analyzer output.
- Onboarding Viability (0-5): 3 -- Normalized from non-standard analyzer output.
- Retention Likelihood (0-5): 1 -- Normalized from non-standard analyzer output.

## Top 5 Gaps

### Gap 1: Develop a "Compliance Gate":

**Severity:** HIGH
The analyzer identified this as a major product fit concern. Review the raw analyzer output below for the original wording and supporting context.

### Gap 2: Integrate Supplier Vetting:

**Severity:** HIGH
This gap affects whether ChefFlow can support the persona's full operating workflow without manual reconciliation.

### Gap 3: Pilot Focus:

**Severity:** MEDIUM
This gap should be considered during build planning because it creates repeated operational friction.

### Gap 4: Workflow coverage gap

**Severity:** MEDIUM
This gap may reduce confidence in pricing, planning, communication, or execution for the persona.

### Gap 5: Data model gap

**Severity:** LOW
This gap is lower priority but still useful for product fit assessment.

## Quick Wins

1. Preserve the analyzer's original recommendations in the raw output section.
2. Convert the highest severity gap into a planner task.
3. Re-run analysis later if a fully templated report is required.

## Verdict

ChefFlow can use this normalized report for triage, but the raw analyzer output should be reviewed before making product decisions.

## Raw Analyzer Output

```markdown
# Persona Evaluation: Michael Green

**Persona:** Michael Green
**Role:** High-End Culinary Director / Operational Lead
**Industry:** Fine Dining / Specialized Catering
**Key Needs:** Absolute traceability, compliance documentation, managing complex dietary restrictions, and maintaining impeccable quality control across all touchpoints.

---

## Evaluation Summary

**Overall Fit:** High Potential, but requires significant customization in the compliance and traceability modules.
**Risk Level:** Medium-High (Due to liability associated with specialized diets).
**Recommendation:** Pilot testing focused exclusively on the Inventory/Compliance module before full rollout.

---

## Detailed Analysis

### 1. Core Strengths (Where the system excels)

- **Inventory Management:** The ability to track ingredients by lot number and expiration date is excellent for high-end kitchens.
- **Scheduling/Resource Allocation:** Managing multiple staff roles and specialized equipment booking is straightforward.
- **Basic Order Taking:** For standard, non-restricted orders, the workflow is intuitive.

### 2. Critical Gaps & Risks (Where the system fails the persona)

- **Dietary/Allergen Compliance (CRITICAL FAILURE):** The system treats allergies as simple tags. It cannot enforce cross-contamination protocols, track ingredient substitutions based on medical necessity, or generate a legally defensible "Allergen Matrix" for a meal.
- **Traceability Depth:** While it tracks _what_ was used, it doesn't easily link the _source_ of the ingredient (e.g., "Organic, Certified Gluten-Free, Lot XYZ from Farm ABC") to the final plate documentation required for liability.
- **Documentation Burden:** The system requires manual data entry for compliance checks, which is too slow for a high-volume, high-stakes environment.

---

## Feature Mapping & Recommendations

| Persona Need                     | System Feature Match | Gap/Risk Level | Recommendation                                                                                                                                                                     |
| :------------------------------- | :------------------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Allergen Safety Protocol**     | Basic Tagging        | **Critical**   | Must build a dedicated, mandatory "Allergen Workflow" that forces confirmation of ingredient sourcing and preparation area segregation.                                            |
| **Source Traceability**          | Inventory Tracking   | Medium         | Enhance to require mandatory input of supplier certifications (uploadable PDFs) linked to the ingredient lot number.                                                               |
| **Complex Menu Engineering**     | Recipe Builder       | Medium         | Needs a "Restriction Layer" that allows users to build a base recipe, then apply mandatory exclusion/inclusion rules (e.g., "Must be Vegan AND Must contain high-protein source"). |
| **Compliance Reporting**         | Basic Reporting      | High           | Needs pre-built, exportable reports specifically for health inspectors and liability defense (e.g., "Proof of Temperature Logging for Refrigerated Goods").                        |
| **Staff Training/Certification** | User Roles           | Low            | Good, but needs to link certifications directly to _allowed tasks_ (e.g., only certified staff can operate the deep fryer).                                                        |

---

## Conclusion & Action Plan

**Verdict:** The system is currently a strong _Kitchen Management Tool_, but it is **not yet a specialized _Food Safety & Compliance Platform_** required by Michael Green.

**Immediate Action Items for Development:**

1.  **Develop a "Compliance Gate":** No order can be finalized without passing through a mandatory, multi-step allergen/dietary confirmation workflow.
2.  **Integrate Supplier Vetting:** Build a module to store and reference supplier certifications to prove due diligence.
3.  **Pilot Focus:** Test the system only on the inventory intake and recipe modification process for 30 days, ignoring scheduling until the compliance module is robust.
```
