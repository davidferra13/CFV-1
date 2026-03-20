# ChefFlow AI Simulation Report

_Auto-generated - last run: 2026-03-20T21:35:56.932Z_
_Run ID: e1e0a009-e01e-4156-80df-b5f0f8587636_

---

## Summary

The system's overall health is moderate with an 83% pass rate. The inquiry_parse module is completely failing and requires immediate attention. All other modules are passing, including allergen_risk which showed improvement from a previous failing state to current passing status.

## Failures & Root Causes

### inquiry_parse

The module fails to extract client information and guest count from natural language input. It consistently returns undefined values instead of parsing the expected data from prompts. This suggests the module cannot properly identify and extract structured data from unstructured text input, likely due to insufficient training on client name and guest count patterns in prompts.

## Prompt Fix Recommendations

The inquiry_parse module needs updated prompts that explicitly instruct the model to:

1. Extract client names from phrases like "Client: Sarah Johnson" or "For Sarah Johnson"
2. Extract guest counts from phrases like "24 guests" or "24 people"
3. Return structured JSON with clear field names for client name and guest count
4. Use examples in the prompt showing expected input/output pairs
5. Include explicit instructions to ignore irrelevant text and focus only on client and guest data

## What's Working Well

All modules except inquiry_parse are passing. The allergen_risk module has improved from previous failures to current passing status, demonstrating successful fixes. The correspondence, menu_suggestions, and quote_draft modules continue to perform reliably. The client_parse module maintains 100% pass rate, showing consistent performance in parsing client data.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
