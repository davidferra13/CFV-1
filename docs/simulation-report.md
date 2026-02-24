# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-24T00:53:31.441Z_
_Run ID: 81941807-9958-4a97-9f97-165a851a9af3_

---

## Summary

The system's pass rate remains low at 17%, with five modules failing to meet expectations. The inquiry_parse, client_parse, allergen_risk, correspondence, and quote_draft modules require immediate attention. The menu_suggestions module has improved to 100% pass rate, showing recent progress. All failing modules show persistent issues with data extraction, validation, and output formatting.

## Failures & Root Causes

**inquiry_parse**
The module fails to extract client names and guest counts from inquiries. It hallucinates information when none exists, suggesting the LLM lacks clear guidance on when to return undefined values. The module also doesn't properly handle ambiguous or incomplete input.

**client_parse**
The module misses specific dietary restrictions from client notes. It fails to extract all relevant dietary information, indicating insufficient prompt guidance for identifying and mapping dietary restrictions. The system doesn't properly validate that all restrictions from the original note are preserved.

**allergen_risk**
The module incorrectly assigns "safe" status to dishes despite clear guest allergies. It fails to properly cross-reference guest restrictions with dish ingredients. The system lacks a clear protocol for handling allergen conflicts and doesn't enforce mandatory safety checks.

**correspondence**
The module ignores subject lines and produces generic, client-unspecific body content. It doesn't properly extract and incorporate client-specific details from the original inquiry. The system lacks clear instructions for generating personalized correspondence.

**quote_draft**
The module produces incorrect pricing calculations that exceed expected ranges. It fails to properly interpret pricing formulas and doesn't validate that calculated totals fall within expected bounds. The system lacks clear constraints on pricing parameters.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit rules: "If client name is not mentioned in inquiry, return undefined. If guest count is not specified, return undefined. Never hallucinate client information. Always return undefined when information is not clearly stated."

**client_parse**
Add explicit rules: "Extract all dietary restrictions mentioned in the note. If a restriction is not explicitly mentioned, do not include it. Return all restrictions found in the original note. Map all restrictions to standard dietary categories."

**allergen_risk**
Add explicit rules: "For each guest, cross-reference their dietary restrictions with all dish ingredients. If a guest has a restriction that matches an ingredient, the dish must be marked as 'unsafe'. Always check all ingredients against all guest restrictions. Never mark a dish as safe if a guest has a matching restriction."

**correspondence**
Add explicit rules: "Include the client name in the subject line. Extract and incorporate specific client details from the original inquiry into the body. Never use generic or placeholder text. The body must reference specific details from the original note."

**quote_draft**
Add explicit rules: "Calculate total price using the formula: (per-person rate × guest count) + grocery cost + travel cost. The per-person rate must not exceed $500. The total must not exceed $10,000. Validate all calculations against the pricing formula."

## What's Working Well

The menu_suggestions module has reached 100% pass rate, showing that the system can successfully generate appropriate menu recommendations when properly prompted. This demonstrates that the core architecture and prompt engineering for menu generation is sound. The module's success suggests the fixes applied in previous runs have been effective for this component.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
