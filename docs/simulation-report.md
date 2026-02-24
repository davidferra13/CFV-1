# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-24T20:54:07.549Z_
_Run ID: 44e5a6dc-1f00-4060-9607-f1c2696192cb_

---

## Summary

The system's pass rate remains low at 50%, with inquiry_parse, correspondence, and quote_draft modules failing consistently. The improvements seen in prior runs have stalled. All three currently failing modules require specific prompt adjustments to address hallucination and lack of personalization.

## Failures & Root Causes

### correspondence

The module fails because it generates generic subject lines and body content that do not reference specific client details or event information. The LLM is not being instructed to include the client's name or event specifics in either the subject or body.

### quote_draft

The module produces unrealistic pricing that exceeds expected ranges. The LLM is not being constrained to use realistic per-person pricing formulas or total cost calculations. It appears to be generating arbitrary numbers instead of following the defined pricing structure.

## Prompt Fix Recommendations

### correspondence

Add explicit instructions to the system prompt:

- "Include the client's name in the subject line"
- "Personalize the body with specific event details and client information"
- "Ensure all correspondence references the client's name and event specifics"

### quote_draft

Add explicit constraints to the system prompt:

- "Use the formula: $85/$125/$175 per person based on party size"
- "Calculate total as: (per-person rate × guest count) + 30% grocery + $150 travel + 50% deposit"
- "Ensure total price stays within $0-$10,000 range"
- "Per-person rate must not exceed $500"

## What's Working Well

The client_parse, allergen_risk, and menu_suggestions modules are all passing consistently. These modules have shown improvement since the initial run and maintain stable performance. The system's ability to parse client information and assess allergen risks remains solid.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
