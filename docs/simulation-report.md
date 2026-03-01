# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-03-01T04:09:35.443Z_
_Run ID: ef06972e-67a4-4a81-a349-a1593ddaf41c_

---

## Summary

The system is currently failing at 50% pass rate, with inquiry_parse, correspondence, and quote_draft modules performing at 0%. These modules show no improvement over recent runs. The client_parse and allergen_risk modules are now stable and passing consistently.

## Failures & Root Causes

**inquiry_parse**
The module is hallucinating client names and guest counts when none are present in input. It's not properly detecting undefined values and is generating false data. This suggests the module lacks clear rules for handling missing information.

**correspondence**
The module fails to generate subject lines with specific client names and lacks client-specific details in the body. It's producing generic, non-personalized content that doesn't meet the required specificity standards.

**quote_draft**
The module is generating unrealistic pricing. It's producing total prices and per-person rates that exceed defined maximums. This indicates the module doesn't properly constrain its output to the expected pricing parameters.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit null rules to detect missing client names and guest counts. Include examples like "Hi there" is NOT a client name, "a few of us" is NOT a guest count, and "no one" is NOT a guest count. Require the module to return undefined when no valid data is present.

**correspondence**
Strengthen the requirement for client-specific content. Specify that the subject line must include the client's name and that the body must reference specific client details. Add explicit instructions that generic phrasing is not acceptable.

**quote_draft**
Replace the pricing range with a clear formula: $85/$125/$175 per person, 30% grocery cost, $150 travel fee, 50% deposit. Add explicit constraints that total price must be between $0-$10,000 and per-person rate must not exceed $500.

## What's Working Well

The client_parse and allergen_risk modules are consistently passing. The menu_suggestions module also remains stable. These modules have shown improvement over recent runs, with allergen_risk particularly stabilizing after the 4-step scan protocol was implemented.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
