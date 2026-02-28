# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-28T20:50:59.661Z_
_Run ID: 9340bab2-510c-456c-9143-08e4124cc0ae_

---

## Summary

The system's pass rate remains low at 50%, with inquiry_parse, correspondence, and quote_draft failing consistently. All previously failing modules are still failing. No modules have shown improvement since the last run.

## Failures & Root Causes

**inquiry_parse**
The module fails to extract client name and guest count from inquiries. It hallucinates or ignores required fields. The system expects these values but receives undefined, indicating the parsing logic does not properly identify or extract these critical data points from natural language input.

**correspondence**
The module produces generic or empty correspondence messages. It fails to include required client-specific details in the body and often omits the subject line entirely. The system requires specific client information in both subject and body, but the module does not enforce or extract this information reliably.

**quote_draft**
The module generates quotes with prices that exceed defined limits. It produces unrealistic per-person rates and total amounts that are outside the expected ranges. The pricing logic does not properly constrain outputs to match the established formula ($85/$125/$175 per person, 30% grocery, $150 travel, 50% deposit).

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit rules requiring extraction of client name and guest count. Include examples of common inquiry formats and their expected extractions. Specify that undefined values should trigger a failure response. Add validation steps to verify required fields are present and non-empty.

**correspondence**
Require the system prompt to explicitly state that subject line and body must contain client-specific information. Add examples of complete correspondence with proper client details. Include validation that checks for presence of required fields before generating output.

**quote_draft**
Replace the pricing formula with explicit constraints that prevent outputs exceeding $500 per person or $10,000 total. Add validation rules that check all calculated values against these limits. Include examples of valid quote outputs that match the expected pricing structure.

## What's Working Well

client_parse, allergen_risk, and menu_suggestions modules are passing consistently. These modules have shown stable performance and do not require immediate attention. The system's ability to parse client information and assess allergen risks remains reliable.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
