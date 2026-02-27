# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-27T17:28:33.728Z_
_Run ID: 009766a4-2d7a-4eb3-a639-ed52d9759fcf_

---

## Summary

The system's pass rate remains low at 33%, with inquiry_parse, allergen_risk, correspondence, and quote_draft all failing. The improvements seen in prior runs have stalled. The failing modules show issues with hallucination, missing data detection, and prompt clarity.

## Failures & Root Causes

**inquiry_parse**
The module is hallucinating client names and guest counts when none are present. It's not properly handling cases where the input lacks required information, instead generating false data. This suggests the model is overconfident in generating content without sufficient input.

**allergen_risk**
The module fails to detect genuine allergen conflicts. It's not properly scanning menu items against guest restrictions, even when clear conflicts exist. The system lacks a robust cross-checking mechanism between guest restrictions and menu ingredients.

**correspondence**
The module produces generic or missing correspondence content. It's not requiring or properly extracting client-specific details from input. The prompt lacks clear instructions to ensure subject and body content are specific and complete.

**quote_draft**
The module generates unrealistic pricing. It's not properly constraining price calculations or validating against known pricing ranges. The system lacks clear boundaries for expected pricing parameters.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit rules: "If no client name is mentioned, respond with 'undefined'. If no guest count is specified, respond with 'undefined'. Never hallucinate these values. Always return 'undefined' when input lacks explicit information."

**allergen_risk**
Add: "Cross-check every menu item against each guest's restrictions. If a menu item contains an allergen that a guest is restricted from, set riskLevel='contains'. If a menu item is completely safe, set riskLevel='safe'. If a menu item is partially safe but contains one restricted ingredient, set riskLevel='contains'. Always verify ingredients against restrictions."

**correspondence**
Add: "The subject line must contain the client's name. The body must include specific details about the client's occasion, guest count, and any special requests. If any required information is missing from input, return an error message indicating which fields are missing."

**quote_draft**
Add: "Calculate total price using the formula: (per_person_rate \* guest_count) + grocery_cost + travel_cost. The per_person_rate must be between $85-$175. The total price must be within $0-$10,000. If the calculated price exceeds these bounds, return an error message with the specific constraint violation."

## What's Working Well

client_parse and menu_suggestions are consistently passing. These modules show recent improvement over previous runs, maintaining their performance. The system's ability to parse client information and generate menu suggestions remains solid.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
