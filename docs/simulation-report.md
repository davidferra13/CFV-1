# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-21T17:49:05.874Z_
_Run ID: af113c06-d718-4db0-9a4c-7eefb5e89b78_

---

## Summary

The AI system has serious issues with three modules failing completely: inquiry_parse, correspondence, and quote_draft. These failures indicate fundamental problems with prompt design and data extraction that need immediate attention. The client_parse and allergen_risk modules are working correctly and can serve as reference for proper implementation.

## Failures & Root Causes

**inquiry_parse module**
The module fails to extract basic client information and guest counts from inquiries. The prompt lacks clear instructions for identifying and parsing client names and guest numbers from natural language input. The system appears to be looking for specific formatting that doesn't exist in real-world inquiries.

**correspondence module**
The module generates generic, unpersonalized responses that don't include client-specific details. The prompt doesn't require the AI to reference client names, previous interactions, or specific service details. The system treats all clients the same regardless of their unique circumstances.

**quote_draft module**
The module produces unrealistic pricing that exceeds expected ranges by significant margins. The prompt doesn't include clear constraints on pricing calculations or budget parameters. The system lacks guidance on how to properly calculate per-person rates and total costs based on realistic service parameters.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit instructions to extract client names using pattern matching for "name" or "client" keywords. Include examples of various name formats (first last, full name, nickname). Require extraction of guest count using numeric pattern matching and clear variable assignment. Add a validation step to ensure all required fields are populated before returning results.

**correspondence**
Modify the prompt to require referencing the client's name at least twice per response. Include specific instructions to incorporate previous interaction details, service preferences, and client-specific information. Add a rubric item requiring personalized content that references at least three specific client details from the conversation history.

**quote_draft**
Add clear pricing constraints to the prompt: specify maximum per-person rate ($500) and total budget range ($0-$10,000). Include calculation rules for proper pricing based on service type, guest count, and menu selections. Require validation that final prices fall within acceptable ranges before generating quotes.

## What's Working Well

The client_parse and allergen_risk modules demonstrate proper prompt design with clear instructions and successful data extraction. These modules can serve as templates for fixing the failing modules.

---

_This report is overwritten after each simulation run. View history in the Simulation Lab at /dev/simulate._
