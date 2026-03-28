# Spec: Inquiry Parse Simulation Reliability Fix

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** small (1-2 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)
>
> SPEC IS BUILT

---

## What This Does (Plain English)

Fixes the `inquiry_parse` simulation module that fluctuates between 0% and 100% pass rate. After this change, the simulation pipeline prompt matches the production parser's field names, the evaluator handles both naming conventions, and the scenario generator produces unambiguous test data. The production parser (`lib/ai/parse-inquiry.ts`) is already solid and stays untouched.

---

## Why It Matters

Spring surge is live. The simulation is supposed to give confidence that the inquiry parsing pipeline works reliably. A module that randomly passes or fails tells us nothing. Fixing the sim/eval mismatch means the simulation actually tests what matters: can Ollama extract structured data from real inquiry emails?

---

## Files to Create

None.

---

## Files to Modify

| File                                   | What to Change                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/simulation/pipeline-runner.ts`    | Align `inquiry_parse` prompt to use snake_case field names matching production schema (`client_name`, `confirmed_guest_count`, `confirmed_dietary_restrictions`, etc.) |
| `lib/simulation/quality-evaluator.ts`  | Fix `dietaryRestrictions` check (line 84) to also accept `confirmed_dietary_restrictions`. Add `confirmed_date`/`eventDate` fallback.                                  |
| `lib/simulation/scenario-generator.ts` | Tighten inquiry_parse scenario generator to produce less ambiguous test data                                                                                           |

---

## Database Changes

None.

---

## Root Cause Analysis

Three compounding issues create the flaky 0%/100% behavior:

### Issue 1: Field Name Mismatch (Pipeline vs Evaluator)

The **pipeline prompt** (pipeline-runner.ts lines 22-67) asks Ollama to return **camelCase** fields:

```json
{ "clientName": "...", "guestCount": 12, "dietaryRestrictions": [] }
```

The **production parser** (parse-inquiry.ts) uses **snake_case** fields:

```json
{ "client_name": "...", "confirmed_guest_count": 12, "confirmed_dietary_restrictions": [] }
```

The **evaluator** (quality-evaluator.ts) tries to handle both with fallbacks:

- Line 45: `out.clientName ?? out.client_name` (OK)
- Line 59: `out.guestCount ?? out.confirmed_guest_count` (OK)
- Line 75: `out.occasion ?? out.confirmed_occasion` (OK)
- Line 84: `out.dietaryRestrictions` only (BUG - no snake_case fallback)

When Ollama returns snake_case (which it does unpredictably), the dietary check always fails (-10 points). Combined with any other minor extraction miss, the score drops below 70.

### Issue 2: Ambiguous Generated Scenarios

The scenario generator asks Ollama to create test emails with ground truth. But Ollama sometimes:

- Sets `expectedName: "Sarah"` but writes the email as "Hi there, I'm looking for a chef..." (name only in greeting context, which the pipeline prompt says to treat as null)
- Sets `expectedGuestCount: 6` but writes "having a few friends over" (vague, no number)

This creates impossible-to-pass scenarios: the ground truth says a value exists, but the email doesn't contain it in a parseable form.

### Issue 3: Prompt Divergence from Production

The simulation pipeline prompt is simpler than the production prompt. Production has 3 detailed real-world examples with every field. The sim prompt has 4 short examples. When Ollama gets confused, the production prompt recovers better because the examples are richer.

---

## The Fix (Three Changes)

### Change 1: Align Pipeline Prompt to Production Schema

In `lib/simulation/pipeline-runner.ts`, replace the `inquiry_parse` case (lines 23-67) with a prompt that:

1. Uses **snake_case** field names matching `ParsedInquirySchema` from production
2. Includes the same 3 rich examples from the production prompt (adapted for the sim's simpler output)
3. Keeps the strict null-extraction rules (rules 1-10 are good, keep them)

**New field mapping for the prompt's JSON template:**

```
"client_name": null or "exact name",
"client_email": null or "exact email",
"client_phone": null or "exact phone",
"confirmed_date": null or "YYYY-MM-DD",
"event_time": null or "time as written",
"confirmed_guest_count": null or exact number,
"confirmed_occasion": null or "occasion type",
"confirmed_location": null or "location as written",
"confirmed_dietary_restrictions": [],
"confirmed_budget_cents": null or number in cents,
"notes": null or "any other details"
```

The system prompt rules (1-10) stay the same. The examples get updated to use the new field names.

### Change 2: Fix Evaluator Field Fallbacks

In `lib/simulation/quality-evaluator.ts`, line 84:

**Before:**

```ts
const dietary = out.dietaryRestrictions
```

**After:**

```ts
const dietary = out.dietaryRestrictions ?? out.confirmed_dietary_restrictions
```

Also add date checking if useful for future expansion (not strictly needed now since date isn't scored).

### Change 3: Tighten Scenario Generator

In `lib/simulation/scenario-generator.ts`, the `inquiry_parse` generator prompt (lines 18-43):

Add this rule to the system prompt:

```
- VALIDATION: Before returning, verify each scenario: if expectedName is non-null,
  search the email text for that exact name in a signature or introduction. If the
  name doesn't appear verbatim, change expectedName to null. Same for expectedGuestCount:
  if no specific number appears in the email, change to null.
```

Add to the user prompt:

```
IMPORTANT: Each email must be self-consistent with its ground truth.
Do NOT set expectedName to a value unless that exact name string appears
in the email as a signature ("- Name", "Best, Name") or introduction
("I'm Name", "My name is Name"). If unsure, set to null.
```

---

## Verification Steps

1. Run the simulation: navigate to Mission Control or run `npm run sim` (however the sim is triggered)
2. Check `inquiry_parse` module specifically
3. Run it 3 times to verify consistency (the whole point is eliminating flakiness)
4. All 3 runs should show `inquiry_parse` at >= 70% pass rate
5. No other modules should regress

---

## Out of Scope

- Changing the production parser (`lib/ai/parse-inquiry.ts`) - it's already well-structured with Zod validation
- Changing how `parseWithOllama` works
- Adding new simulation modules
- The `computeReadinessScore` async question (separate issue, confirmed not actually broken)

---

## Notes for Builder Agent

- The production prompt in `parse-inquiry.ts` (lines 42-67) is the gold standard. The sim prompt should converge toward it, not the other way around.
- The `format: 'json'` flag is already passed to Ollama in pipeline-runner.ts (line 335). This helps but doesn't guarantee field names.
- The sim uses raw Ollama calls (no Zod validation), unlike production which uses `parseWithOllama` + `ParsedInquirySchema`. This is intentional (sim tests the raw LLM, not the validation layer). Don't add Zod to the sim pipeline.
- The evaluator's passing threshold is 70 (line 91). A -10 for dietary + -15 or -20 for any other miss = instant fail. That's why the dietary bug alone is enough to cause 0%.
- History shows `inquiry_parse` has passed before (2026-03-24 and 2026-03-25 runs). The fix isn't about making something new work; it's about making something intermittent work consistently.
