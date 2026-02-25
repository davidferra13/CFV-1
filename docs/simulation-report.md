# ChefFlow AI Simulation Report

_Auto-generated — last run: 2026-02-25T17:11:54.496Z_
_Run ID: 401cc64d-0c96-4a3a-ab5b-60e8e610b8da_

---

## Summary

The system's pass rate remains low at 50%, with inquiry_parse, correspondence, and quote_draft modules failing consistently. All previously failing modules show no improvement since the last run. The core issues involve hallucination, missing required fields, and incorrect data generation.

## Failures & Root Causes

**inquiry_parse**
The module hallucinates client names and guest counts when none are present in input. It fails to recognize that "Hi there" is not a client name and "a few of us" is not a guest count. The module also incorrectly parses "12" as a guest count when no such number exists in the input.

**correspondence**
The module generates generic responses without client-specific details. It fails to include a subject line and does not incorporate client name, occasion, or guest count from the input. The response feels generic and lacks personalization.

**quote_draft**
The module generates unrealistic pricing. It produces a per-person rate of $162.50 and a total of $1,625, both exceeding expected ranges. The pricing formula is incorrect and does not match the previously defined $85/$125/$175 per person rates with 30% grocery, $150 travel, and 50% deposit.

## Prompt Fix Recommendations

**inquiry_parse**
Add explicit null rules to reject hallucinated patterns:

- "Hi there" → null client name
- "a few of us" → null guest count
- "we're a group of" → null guest count
- "I'm" → null client name
- "we're" → null client name

**correspondence**
Require specific fields in both system and user prompts:

- System prompt: "Include client name in subject line"
- User prompt: "Body must reference client name, occasion, and guest count from input"
- Add rule: "If no client name in input, do not hallucinate one"

**quote_draft**
Replace pricing logic with explicit formula:

- "Per-person rate = $85/$125/$175 based on menu tier"
- "Grocery cost = 30% of per-person rate"
- "Travel cost = $150"
- "Deposit = 50% of total"
- "Total = (per-person rate × guest count) + grocery + travel + deposit"

## What's Working Well

client_parse, allergen_risk, and menu_suggestions modules are passing consistently. These modules have shown improvement since the first run, with allergen_risk specifically implementing a mandatory scan protocol that prevents empty safety flags when restrictions exist.

---

_This report shows the latest run only. Full history: docs/simulation-history.md_
