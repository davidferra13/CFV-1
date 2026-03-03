# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-03T00:53:06.828Z_
_Run ID: d2034884-8501-4e28-be74-144848dc0954_

---

## Summary

The system is failing across most modules with a 33% pass rate. The inquiry_parse, allergen_risk, correspondence, and quote_draft modules require immediate attention. There is no improvement over recent runs — all previously failing modules remain broken.

## Failures & Root Causes

### inquiry_parse

The module fails to extract client name and guest count from inquiries. It's returning hardcoded values instead of parsing actual input data. The module likely lacks proper entity extraction logic for client names and numeric values.

### allergen_risk

The module is not detecting known allergen conflicts. It's marking dishes as safe when they contain allergens like nuts in Quinoa Salad or shellfish in Grilled Salmon. The module lacks proper allergen database matching or conflict detection logic.

### correspondence

The module fails to generate proper correspondence with required fields. It's producing generic or empty content instead of client-specific messages with proper subject lines and content. The module likely doesn't validate required fields or lacks templates with dynamic content.

### quote_draft

The module produces incorrect pricing calculations and missing deposit values. It's not properly calculating totals or applying deposit rules. The module likely lacks proper financial calculation logic or validation for required fields.

## Prompt Fix Recommendations

### inquiry_parse

Update the prompt to explicitly require:

- "Extract client name from the inquiry text and return as 'client_name'"
- "Extract guest count and return as 'guest_count'"
- "If no client name or guest count found, return 'undefined' for both fields"
- "Use regex patterns to identify numeric values and names"

### allergen_risk

Update the prompt to explicitly require:

- "Cross-reference dish ingredients with known allergen database"
- "Flag any dish containing nuts, shellfish, or other allergens as 'allergen_conflict'"
- "Return specific allergen conflicts for each dish"
- "Mark dishes as 'safe' only if no allergen conflicts exist"

### correspondence

Update the prompt to explicitly require:

- "Generate subject line with client name and service type"
- "Include client-specific details in body content"
- "Validate that subject line and body are not empty"
- "Use templates with dynamic placeholders for client information"

### quote_draft

Update the prompt to explicitly require:

- "Calculate total price based on menu items and quantities"
- "Apply deposit rules (e.g., 25% of total)"
- "Validate that total price is within expected range"
- "Include deposit amount in quote output"

## What's Working Well

The client_parse and menu_suggestions modules are passing consistently. The client_parse module has shown improvement over recent runs, maintaining 100% pass rate. The menu_suggestions module also maintains 100% pass rate. These modules should serve as reference for fixing the failing ones.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
