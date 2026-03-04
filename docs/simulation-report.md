# ChefFlow AI Simulation Report
*Auto-generated — last run: 2026-03-04T02:03:57.264Z*
*Run ID: 2a0886f2-ca33-43ca-a4bc-94b2430ee7d6*

---

## Summary

The system's overall pass rate remains low at 33%, with three modules failing consistently: inquiry_parse, client_parse, and correspondence. The quote_draft module also continues to fail. The allergen_risk and menu_suggestions modules are now passing, showing improvement from prior runs. These failures indicate persistent parsing and tone issues that need targeted fixes.

## Failures & Root Causes

**inquiry_parse**
The module is returning incorrect data that doesn't match expected ground truth. It's providing client names and guest counts when they should be undefined, suggesting the parser is over-optimistically extracting information from vague prompts. This likely stems from insufficient constraints on what data to extract.

**client_parse**
The module fails to extract essential client details like phone numbers and dietary restrictions. It's missing critical fields from the input data, indicating the parser isn't properly configured to identify and extract all required information from client profiles.

**correspondence**
The module generates emails that don't match the expected tone for the inquiry stage. It's producing overly formal messages instead of friendly, approachable ones. Additionally, it's not personalizing the email body with client-specific details, which suggests a lack of proper context injection in the prompt.

**quote_draft**
The module produces quotes with incorrect pricing and missing deposit information. The total price exceeds the expected range, and the deposit field is omitted, indicating the prompt doesn't properly enforce required fields or pricing validation.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit constraints to only extract data when clearly specified in the input. Require that fields like client name and guest count are only populated if explicitly mentioned. Add a "return undefined" instruction when data is ambiguous or absent.

**client_parse**
Modify the prompt to explicitly list required fields (phone number, dietary restrictions) and require extraction of all specified elements. Add a validation step that checks for presence of each required field before considering the parse complete.

**correspondence**
Update the prompt to specify tone requirements for each inquiry stage and require inclusion of client-specific details like name and previous interactions. Add a step to verify that personalization elements are present in the generated text.

**quote_draft**
Revise the prompt to enforce strict pricing validation within the expected range and require inclusion of all required fields including deposit amount. Add a final check that verifies all required fields are populated before outputting the quote.

## What's Working Well

The allergen_risk and menu_suggestions modules are now passing, showing consistent performance. These modules demonstrate that the system can correctly process structured data when properly prompted. The improvement in these modules suggests the fixes applied to the prompt structure are effective and should be considered for other failing modules.

---
*This report shows the latest run only. Full history: docs/simulation-history.md*
