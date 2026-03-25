# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-03-25T14:22:49.920Z_
_Run ID: 7ec42518-6959-4609-bc01-77bfbb37b54c_

---

## Summary

The system's overall health is currently degraded with a 83% pass rate. The `inquiry_parse` module is completely failing and needs immediate attention. The `client_parse` module has improved since previous runs and is now passing. All other modules are currently passing.

## Failures & Root Causes

### inquiry_parse

The module is failing because it's not correctly extracting client information from inquiry text. It's returning `undefined` for client name and guest count when it should extract "Sarah Johnson" and 24 respectively. This suggests the prompt lacks clear instructions for identifying and parsing these specific fields from natural language input.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly instruct the model to:

1. Extract client name from the inquiry text and return it as `clientName`
2. Extract guest count and return it as `guestCount`
3. Use clear examples showing expected input/output format
4. Specify that if fields are not mentioned, return `undefined` for those fields
5. Include explicit instructions to parse numbers from text like "24 guests" or "for 24 people"

## What's Working Well

The `client_parse` module has shown improvement since the last run, now passing 100% of tests. All other modules (`allergen_risk`, `correspondence`, `menu_suggestions`, `quote_draft`) are currently passing and functioning correctly. The system's core parsing capabilities are stable for these modules.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
