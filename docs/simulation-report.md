# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-28T21:22:24.669Z_
_Run ID: 500709dc-8f3b-483b-acc5-8b2f7e9df49e_

---

## Summary

The system's pass rate remains low at 50%, with inquiry_parse, correspondence, and quote_draft continuing to fail. All previously failing modules are still failing, and no modules have shown improvement since the last run. The core issue is that modules are hallucinating data or ignoring explicit instructions.

## Failures & Root Causes

**inquiry_parse**
The module is hallucinating client names and guest counts. It's generating fake data instead of returning undefined when information is missing. This happens because the system prompt doesn't clearly enforce that missing data must be undefined, not fabricated.

**correspondence**
The module generates generic content that doesn't include required client-specific details. The subject line fails to indicate the inquiry is about a private dinner. The module ignores explicit instructions to include client name, occasion, and guest count in the body and subject.

**quote_draft**
The module produces prices that exceed defined limits. It's ignoring the pricing formula and range constraints. The system prompt lacks clear enforcement of the $85/$125/$175 per person pricing structure and the $150 travel fee with 50% deposit rule.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit rules: "If client name is not mentioned, return undefined. If guest count is not mentioned, return undefined. Never hallucinate names or numbers. Always return undefined for missing data."

**correspondence**
Add explicit requirements: "Subject line must clearly state 'Private Dinner Inquiry' and include client name. Body must contain client name, occasion, and guest count. All fields are required. Do not generate generic content."

**quote_draft**
Add explicit pricing rules: "Use exact formula: $85/$125/$175 per person based on guest count. Include $150 travel fee. Require 50% deposit. Total must be within $0-$10,000 range. Per-person rate must not exceed $500."

## What's Working Well

client_parse, allergen_risk, and menu_suggestions are passing consistently. These modules have stable performance and don't require immediate attention. The system shows that when clear rules are applied, modules can function correctly.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
