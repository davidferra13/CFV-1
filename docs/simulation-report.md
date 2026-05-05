# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-05-04T19:09:58.981Z_
_Run ID: 271a4b8c-71a8-4475-90e5-39e1fec909b1_

---

## Summary

The overall system pass rate is 75%, indicating moderate stability. However, the core parsing and risk assessment modules are critically failing. The `inquiry_parse`, `client_parse`, and `allergen_risk` modules are all reporting 0% pass rates and require immediate attention.

## Failures & Root Causes

### inquiry_parse

The module is failing because the pipeline is returning no output. This suggests the prompt is either too restrictive, or it is failing to correctly process the input data and generate the required structured output.

### client_parse

The module is failing, and no specific failure examples were provided. This indicates a potential structural issue within the prompt itself, likely related to how it handles the input format or how it is instructed to structure the output when data is present.

### allergen_risk

The module is failing, and no specific failure examples were provided. The root cause is likely a lack of robust error handling or insufficient instructions within the prompt to manage scenarios where dietary restrictions are missing or ambiguous.

## Prompt Fix Recommendations

### inquiry_parse

Modify the prompt to include explicit instructions for fallback behavior. If the input data is incomplete or ambiguous, the module must return a standardized, empty JSON object structure rather than returning no output.

### client_parse

Update the prompt to include a section detailing how to handle null or empty input fields. Instruct the module to output `null` for any field that cannot be determined from the input, ensuring the output structure remains consistent regardless of data completeness.

### allergen_risk

Enhance the prompt by adding a mandatory check for missing constraints. If the input does not specify any allergies or restrictions, the module must output a predefined message (e.g., "No dietary restrictions specified") instead of failing silently.

## What's Working Well

The `correspondence`, `menu_suggestions`, and `quote_draft` modules are performing perfectly at 100% pass rates and require no changes.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
