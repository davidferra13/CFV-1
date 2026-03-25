# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-03-25T19:24:07.939Z_
_Run ID: 3809616b-a5c4-486c-879e-cc964fa3bc1c_

---

## Summary

The system is currently at 80% pass rate, with two modules failing: `inquiry_parse` and `client_parse`. The `inquiry_parse` module is completely non-functional, while `client_parse` has issues with data extraction accuracy. Both modules showed no improvement since the last run.

## Failures & Root Causes

### inquiry_parse

The module fails completely with 0% pass rate. All test cases fail because the module does not extract any data from the input text. The prompt likely lacks clear instructions for identifying and extracting inquiry components like guest count, event type, and dietary restrictions from natural language input.

### client_parse

The module fails with 0% pass rate due to two main issues:

1. **Incomplete data extraction**: The module misses dietary restrictions that are present in the input text but not included in the output
2. **Inventing information**: The module adds fields like phone numbers that are not present in the original note, treating them as valid extracted data

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly define the expected output structure and include clear examples of how to parse different inquiry patterns. Add instructions to:

- Identify and extract guest count, event type, and dietary restrictions
- Return empty values for missing fields rather than omitting them
- Use a consistent format for all extracted fields

### client_parse

Revise the prompt to:

- Require strict adherence to input data only (no invented fields)
- Add explicit instructions to only extract dietary restrictions that are clearly stated in the text
- Define clear rules for handling ambiguous or missing information (e.g., return null/empty for unspecified fields)
- Include examples showing correct vs. incorrect extraction behavior

## What's Working Well

The `allergen_risk`, `correspondence`, `menu_suggestions`, and `quote_draft` modules are all passing at 100% with no regressions. The `client_parse` module showed improvement from 0% to 100% pass rate in the previous run (2026-03-25 08:20 UTC), but has regressed again in this latest run. The `inquiry_parse` module remains completely non-functional since the last run.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
