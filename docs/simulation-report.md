# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-02T15:17:25.136Z_
_Run ID: 394647ea-6630-4aad-b685-4a7b176995a0_

---

## Summary

The system's overall pass rate remains at 50%, with three modules failing consistently: inquiry_parse, correspondence, and quote_draft. These modules show persistent issues with data handling, tone matching, and pricing accuracy. The client_parse, allergen_risk, and menu_suggestions modules continue to perform well, with no recent regressions.

## Failures & Root Causes

### inquiry_parse

The module is failing because it's incorrectly extracting client names and guest counts from inquiries. It's returning hardcoded values instead of parsing actual inquiry text. This suggests the parsing logic doesn't properly identify and extract key information from natural language input.

### correspondence

The module generates emails that don't match the required tone or content for each inquiry stage. It's producing overly formal messages for QUALIFIED_INQUIRY stages and lacks personalization. The system appears to be using generic templates without adapting to client-specific details or inquiry context.

### quote_draft

The module is producing quotes with incorrect pricing that falls outside acceptable ranges. It's not properly calculating totals or per-person rates based on the provided parameters. The system seems to be using incorrect formulas or failing to validate calculated values against expected thresholds.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly require parsing of client names and guest counts from natural language input. Add examples showing how to extract these values from various inquiry formats. Specify that the module should return undefined when information is not present in the inquiry text.

### correspondence

Revise the prompt to include specific tone guidelines for each inquiry stage. Require that emails reference client-specific details and previous interactions. Add examples showing how to personalize messages based on client information and inquiry context. Include rules for appropriate formality levels.

### quote_draft

Modify the prompt to require validation of calculated totals against specified ranges. Include explicit instructions for calculating per-person rates and checking against thresholds. Add examples showing how to properly handle edge cases and ensure pricing accuracy within expected bounds.

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules maintain 100% pass rates. These modules show no recent regressions and continue to handle their respective tasks reliably. The consistent performance of these modules indicates stable core functionality.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
