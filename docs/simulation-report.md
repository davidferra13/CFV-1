# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-28T02:42:58.820Z_
_Run ID: b2b46aae-07c7-4a1d-a893-f54c17297b7b_

---

## Summary

The system's overall pass rate remains at 50%, with inquiry_parse, correspondence, and quote_draft still failing. All previously failing modules have returned to 0% pass rate, indicating no recent improvements. The core issue lies in over-generous LLM outputs and insufficient grounding in prompts.

## Failures & Root Causes

**inquiry_parse**
The module is hallucinating client names and guest counts. It's extracting values when none exist, likely due to insufficient constraints in the prompt. The LLM is generating plausible-sounding but incorrect data, possibly because the system prompt doesn't explicitly require "undefined" when no data is present.

**correspondence**
The module fails to generate subject lines or body content with client-specific details. It's producing generic or empty responses, suggesting the prompt doesn't clearly require specific client information in both subject and body. The LLM is defaulting to generic templates instead of using provided client data.

**quote_draft**
The module is producing unrealistic pricing. It's calculating prices that exceed expected ranges by large margins. This indicates the prompt doesn't properly constrain the pricing logic or provide clear boundaries for per-person rates and total calculations.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit instruction: "If no client name is mentioned, return undefined. If no guest count is mentioned, return undefined. Never hallucinate names or numbers." Add a rule: "When in doubt, return undefined for any field that is not explicitly stated in the input."

**correspondence**
Add explicit instruction: "Subject line must contain the client's name. Body must include specific details about the client's occasion and guest count." Add rule: "If client name, occasion, or guest count are not mentioned in the input, do not generate generic placeholders. Return an error or indicate missing information."

**quote_draft**
Add explicit instruction: "Calculate total price using the formula: (per-person rate) × (guest count) + (grocery cost) + (travel cost). Per-person rate must be between $85-$175. Total must be within $0-$10,000. If input doesn't specify guest count, assume 10 guests." Add rule: "Reject any calculation that exceeds the specified price ranges or uses unrealistic assumptions."

## What's Working Well

client_parse, allergen_risk, and menu_suggestions are all passing consistently. These modules have stable performance and show no signs of regression. The recent improvement in quote_draft from 0% to 33% pass rate indicates the fix for pricing constraints is working, though it still needs refinement.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
