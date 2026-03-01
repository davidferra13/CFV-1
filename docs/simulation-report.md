# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-01T19:12:31.599Z_
_Run ID: 989991b4-32df-4ae8-af51-4d99dd3d1c86_

---

## Summary

The system is failing across most modules with a 33% pass rate. The inquiry_parse, client_parse, correspondence, and quote_draft modules require immediate attention. The allergen_risk and menu_suggestions modules are now passing consistently, showing recent improvement.

## Failures & Root Causes

**inquiry_parse**
The module is incorrectly extracting client names and guest counts from inquiries. It's adding data that doesn't exist in the original text instead of leaving fields undefined. This suggests the prompt lacks clear instructions to avoid inventing information.

**client_parse**
The module is inconsistently handling contact details. It's including phone numbers when they were already present in the original note, and it's not properly validating phone number formats. The prompt doesn't specify to preserve original contact data exactly as written.

**correspondence**
The module is failing to generate proper subject lines and is producing generic or empty email bodies. It's not incorporating client-specific information from the original inquiry, indicating a lack of clear instructions to personalize content.

**quote_draft**
The module is calculating incorrect pricing. It's producing a total price outside the expected range and exceeding the per-person rate threshold. This suggests the pricing formula isn't being correctly applied or the module isn't properly parsing input parameters.

## Prompt Fix Recommendations

**inquiry_parse**
Update the prompt to explicitly state: "Only extract information that exists in the original inquiry. If a field is not mentioned, leave it undefined. Do not invent or add information that isn't present."

**client_parse**
Revise the prompt to include: "Preserve all original contact details exactly as written. Do not add, remove, or modify phone numbers or other contact information. If a phone number is present in the original note, include it in the output with the same format."

**correspondence**
Modify the prompt to specify: "Generate a personalized subject line using client name and event details. Create a body that includes specific client information and event details from the original inquiry. Do not use generic templates or empty content."

**quote_draft**
Update the prompt to include: "Apply the explicit pricing formula: $85/$125/$175 per person, 30% grocery cost, $150 travel fee, 50% deposit. Verify that calculated totals fall within expected ranges and per-person rates don't exceed $500."

## What's Working Well

The allergen_risk and menu_suggestions modules are consistently passing, showing that these components are functioning correctly. The recent improvement in these modules indicates that the system architecture for these functions is solid.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
