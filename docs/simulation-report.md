# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-04-03T21:49:36.784Z_
_Run ID: 49c31bb0-b68e-4443-989b-bffe4e6e02b6_

---

## Summary

The system is currently failing at 80% pass rate due to two modules failing completely. The inquiry_parse and client_parse modules require immediate attention. Notably, the allergen_risk module has shown consistent 100% performance and is not included in this report.

## Failures & Root Causes

### inquiry_parse

The module is failing completely with 0% pass rate. Based on the failure examples, the module is not properly extracting or recognizing key information from client inquiries. It appears to be missing critical dietary restrictions and referral sources that are explicitly mentioned in the original notes.

### client_parse

The module is failing completely with 0% pass rate. It's failing to accurately extract dietary restrictions and referral sources from client notes. The module is both missing required information and inventing information not present in the original notes.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly instruct the module to:

- Extract all dietary restrictions mentioned in the original note
- Identify and extract referral sources from the note
- Only include information that is explicitly stated in the original text
- Use exact wording from the original note when extracting information
- Return a structured output with clear fields for dietary restrictions and referral sources

### client_parse

Update the prompt to explicitly instruct the module to:

- Extract all dietary restrictions mentioned in the original note
- Identify and extract referral sources from the note
- Only include information that is explicitly stated in the original text
- Avoid inventing or hallucinating information not present in the original note
- Return a structured output with clear fields for dietary restrictions and referral sources
- Match the exact phrasing from the original note when extracting information

## What's Working Well

The allergen_risk, correspondence, menu_suggestions, and quote_draft modules are all performing consistently at 100% pass rate. These modules have shown stable performance across multiple test runs and require no changes at this time. The allergen_risk module in particular has maintained perfect performance since the previous test run.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
