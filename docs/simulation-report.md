# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-24T19:10:42.575Z_
_Run ID: ff600558-7589-4763-b184-fe53512b8529_

---

## Summary

The system's overall pass rate has dropped to 50% compared to the previous run's 17%. The inquiry_parse, correspondence, and quote_draft modules are currently failing. The client_parse, allergen_risk, and menu_suggestions modules are now passing consistently, showing improvement since the last run.

## Failures & Root Causes

**inquiry_parse**
The module is hallucinating client names and guest counts when none are present in the inquiry. It's not properly detecting the absence of structured data and is generating false information. This suggests the module lacks clear instructions to return undefined when data is missing.

**correspondence**
The module generates generic responses that don't incorporate client-specific details. It's not properly parsing the inquiry to extract client name, occasion, and guest count for inclusion in the response. The system prompt lacks clear guidance on how to personalize the correspondence.

**quote_draft**
The module is producing unrealistic pricing. It's not properly applying the previously defined pricing formula ($85/$125/$175 per person, 30% grocery, $150 travel, 50% deposit) and is generating prices outside the expected range. The module appears to be using incorrect calculation logic or ignoring the defined constraints.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit instructions to return undefined for client name, guest count, and occasion when not present in the inquiry. Include examples of what constitutes missing data. Add a validation step that checks if data exists before generating a response.

**correspondence**
Require the system prompt to explicitly state that the subject line must reference the client name and occasion, and the body must include guest count and client name. Add a rule that the response must incorporate all parsed information from the inquiry.

**quote_draft**
Replace the current pricing logic with the explicit formula: (person_rate × guest_count) + (person_rate × guest_count × 0.3) + 150 + (person_rate × guest_count × 0.5). Add a constraint that the total must fall within the $0-$10,000 range. Include examples of correct calculations.

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules are consistently passing. These modules have shown improvement since the last run, with allergen_risk now reliably detecting safety flags when guest restrictions are present. The system's ability to parse client information and generate menu suggestions demonstrates strong foundational capabilities.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
