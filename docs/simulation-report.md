# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-03-26T15:36:19.678Z_
_Run ID: 349520a8-a397-4f61-9471-67093bad192a_

---

## Summary

The system is currently at 83% pass rate, with `inquiry_parse` failing at 0% and all other modules passing. The `inquiry_parse` module has been consistently failing across multiple runs and needs immediate attention. The `client_parse` module has shown improvement, moving from 0% to 100% pass rate in recent runs.

## Failures & Root Causes

### inquiry_parse

The module is failing because it's not correctly extracting client name and guest count from inquiry text. Instead of parsing the expected values, it's returning "undefined" for both fields. This suggests the prompt doesn't properly guide the model to extract these specific fields from natural language input, or the examples provided are insufficient for training the extraction logic.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly define the expected output format and provide clear examples of how to extract client name and guest count from inquiry text. Include specific instructions like:

- "Extract the client name as a string"
- "Extract the guest count as a number"
- "If no guest count is mentioned, return null"
- "If no client name is mentioned, return null"
- Provide multiple examples showing various inquiry formats and expected outputs

## What's Working Well

The `client_parse`, `allergen_risk`, `correspondence`, `menu_suggestions`, and `quote_draft` modules are all passing at 100% with no failures. Notably, `client_parse` has improved significantly, moving from 0% to 100% pass rate in recent runs. The `allergen_risk` module has also maintained consistent performance, passing in all recent runs.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
