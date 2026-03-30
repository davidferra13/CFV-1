# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-03-30T01:32:41.955Z_
_Run ID: 5250dcab-8e1e-4343-a3ec-bf8c41070f2a_

---

## Summary

The system is currently failing at 80% pass rate due to two modules failing completely. The inquiry_parse module is entirely non-functional, while client_parse is failing on validation despite correct extractions. The allergen_risk module has improved from previous runs where it was also failing, and is now passing consistently.

## Failures & Root Causes

### inquiry_parse

The module is completely failing with 0% pass rate. The system cannot process any inquiry text into structured data. This appears to be a fundamental parsing failure where the module is not recognizing valid input patterns or is crashing during processing. The module likely lacks proper error handling or input validation logic.

### client_parse

The module is failing validation despite correctly extracting name and email. The error messages indicate the system is rejecting valid extractions, suggesting a problem with the validation logic or the expected output format. The module may be expecting specific formatting or data types that don't match the actual extracted values, or the validation rules have been updated without corresponding prompt adjustments.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to include explicit examples of valid inquiry formats and clear output schema requirements. Add error handling instructions to guide the module on how to process ambiguous or malformed inputs. Include specific instructions for handling edge cases like empty fields or unusual inquiry structures.

### client_parse

Revise the prompt to clearly define the expected output format for client data. Ensure the validation criteria match the actual extraction capabilities. Add examples showing exactly how the extracted data should be formatted for validation to pass. Clarify any specific requirements for name or email formatting that might be causing rejections.

## What's Working Well

The allergen_risk module has shown consistent improvement, now passing 100% of tests after previous failures. The correspondence, menu_suggestions, and quote_draft modules are all performing well with 100% pass rates. These modules demonstrate stable functionality and proper handling of their respective data processing tasks.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
