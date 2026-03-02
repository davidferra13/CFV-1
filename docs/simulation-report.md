# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-02T20:00:49.783Z_
_Run ID: e957ec2a-4c62-4f62-b3b5-abe1c4d787b5_

---

## Summary

The system's overall pass rate remains at 50%, with three modules failing: inquiry_parse, correspondence, and quote_draft. These modules show persistent issues with data parsing, content generation, and price calculation. The client_parse, allergen_risk, and menu_suggestions modules continue to perform well, with no recent regressions.

## Failures & Root Causes

### inquiry_parse

The module fails to correctly extract client information and guest counts from inquiries. It's returning hardcoded or incorrect values instead of parsing actual input data. This suggests the prompt lacks clear instructions for extracting specific fields or doesn't properly define expected data types.

### correspondence

The module generates generic or empty correspondence content. It's not incorporating client-specific details into the subject line or body, indicating the prompt doesn't adequately guide the model to use provided client information or context.

### quote_draft

The module produces quotes with incorrect pricing and missing line items. It's either calculating prices outside the expected range or failing to include required components like service fees or grocery estimates. This points to insufficient guidance on quote structure and calculation logic.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly state: "Extract and return only the client name and guest count from the inquiry. If these fields are not mentioned, return undefined for both. Do not make assumptions or generate placeholder values."

### correspondence

Revise the prompt to require: "Use the client's name in the subject line and include at least one specific detail about the client's request or preferences in the body. Do not use generic templates or empty content."

### quote_draft

Modify the prompt to specify: "Calculate the total price using the formula: (base_price + service_fee + grocery_estimate). Ensure all line items are included and the final price falls within the range of $1,320–$1,980. If any line item is missing, return an error message."

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules maintain 100% pass rates. These modules show no signs of regression and continue to produce reliable outputs. The consistent performance of these modules indicates their prompts are well-defined and effective.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
