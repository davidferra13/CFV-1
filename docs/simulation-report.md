# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-01T23:57:49.922Z_
_Run ID: a28bcaa3-39d0-4359-8e6e-f40ef8b573b2_

---

## Summary

The system's overall pass rate remains at 50%, with no improvement since the last run. The inquiry_parse, correspondence, and quote_draft modules are failing consistently across all test runs. The client_parse, allergen_risk, and menu_suggestions modules are now passing, showing recent improvements.

## Failures & Root Causes

**inquiry_parse**
The module is returning client names and guest counts when it should return undefined. This indicates the module is not properly filtering out ambiguous or incomplete input. It's likely misinterpreting natural language as structured data.

**correspondence**
The module is generating messages without required subject lines or client-specific content. It's producing generic templates instead of customizing messages based on parsed client data. The system fails to enforce mandatory fields.

**quote_draft**
The module is calculating prices that exceed expected ranges by more than 50%. It's not properly applying the pricing formula ($85/$125/$175 per person, 30% grocery, $150 travel, 50% deposit) or enforcing the maximum per-person rate of $500.

## Prompt Fix Recommendations

**inquiry_parse**
Update the prompt to explicitly state: "Return undefined for client name and guest count if not clearly specified in the input. Do not infer or assume values. Only return structured data when all fields are unambiguously present."

**correspondence**
Update the prompt to require: "Include the client name in the subject line. The body must contain specific details about the client's occasion and guest count. Do not use generic placeholders or templates."

**quote_draft**
Update the prompt to specify: "Calculate total using exact formula: ($85/$125/$175 per person, 30% grocery cost, $150 travel fee, 50% deposit). Ensure per-person rate does not exceed $500. Return error if calculated price exceeds expected range by more than 50%."

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules are now consistently passing. These modules have shown improvement since the last run, indicating that recent fixes are effective. The system's ability to parse client information and generate menu suggestions has stabilized.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
