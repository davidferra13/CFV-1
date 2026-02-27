# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-27T19:04:52.183Z_
_Run ID: 30e05b31-10ca-42d8-8a2d-afbe2c522e6b_

---

## Summary

The system is still struggling with core parsing and validation tasks. Three modules remain completely failing: inquiry_parse, client_parse, and correspondence. The quote_draft module is also failing due to incorrect pricing logic. The allergen_risk and menu_suggestions modules are now stable and passing consistently.

## Failures & Root Causes

### inquiry_parse

The module fails to extract basic client information from inquiry notes. It's not reliably identifying client names or guest counts, even when these are clearly stated in the input. The module appears to be missing explicit instructions to prioritize structured data extraction over hallucination.

### client_parse

The parser is making incorrect assumptions about contact details and dietary information. It's incorrectly identifying phone numbers without explicit labeling and is adding empty allergies arrays when the original note only mentions dietary restrictions. The module lacks clear boundaries on what information it should extract versus what it should ignore.

### correspondence

The module fails to generate properly structured correspondence with required elements. It's not including subject lines or client-specific content in the body, suggesting it's not properly following the prompt's requirements for content structure and personalization.

### quote_draft

The pricing module produces unrealistic values that exceed expected ranges. It's not properly applying the pricing formula or respecting the maximum price thresholds defined in the system. The module lacks validation logic to ensure outputs fall within acceptable ranges.

## Prompt Fix Recommendations

### inquiry_parse

Add explicit extraction rules:

- "Extract client name only if clearly stated as a person's name (e.g., 'Sarah Johnson')"
- "Extract guest count only if explicitly mentioned as a number of people"
- "If client name or guest count cannot be clearly identified, return undefined for that field"
- "Do not infer or hallucinate missing information"

### client_parse

Add explicit exclusion rules:

- "Only extract phone numbers if explicitly labeled as such in the original note"
- "Do not add allergies unless explicitly mentioned as allergies in the original note"
- "If dietary restrictions are mentioned but not specific allergies, return allergies: []"
- "Do not assume contact details are phone numbers unless explicitly labeled"

### correspondence

Add explicit structure requirements:

- "Generate subject line with client name and occasion"
- "Include client name in body text"
- "Include specific details about the event or request"
- "Do not use generic or empty body content"

### quote_draft

Add explicit pricing validation:

- "Apply the formula: $85/$125/$175 per person based on party size"
- "Calculate total price with 30% grocery cost, $150 travel, 50% deposit"
- "Ensure per-person rate does not exceed $500"
- "Ensure total price does not exceed $10,000"

## What's Working Well

The allergen_risk and menu_suggestions modules are consistently passing. These modules have stabilized after previous fixes and are reliably processing their respective inputs. The system's ability to handle complex dietary and menu logic has improved significantly since the initial run.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
