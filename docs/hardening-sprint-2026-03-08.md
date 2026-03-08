# Hardening Sprint - 2026-03-08

## What Changed

### 1. Beta Survey Pages: Removed @ts-nocheck (runtime crash risk)

**Files:**

- `app/(admin)/admin/beta-surveys/page.tsx` - removed `@ts-nocheck`
- `app/(admin)/admin/beta-surveys/[id]/page.tsx` - removed `@ts-nocheck`, extracted direct supabase query

**Problem:** Both admin pages had `@ts-nocheck` because the beta survey tables don't exist yet. But the underlying actions file (`lib/beta-survey/actions.ts`) already uses `(supabase as any)` casts and graceful error handling, so the pages didn't need the suppression.

**Fix:**

- Removed `@ts-nocheck` from both pages
- Moved the direct `supabase.from('beta_survey_definitions')` query from `[id]/page.tsx` into a new `getBetaSurveyById()` server action in `lib/beta-survey/actions.ts`
- Fixed the `params` type to `Promise<{ id: string }>` (Next.js 15 async params)
- Pages now cleanly compile without type suppression

**Note:** 3 other files I initially flagged (`fire-order.ts`, `waste/actions.ts`, `generate-ics.ts`) were already clean. They mentioned `@ts-nocheck` in comments about having _removed_ it, which triggered the grep match.

### 2. Simulation: inquiry_parse and client_parse (0% pass rate fix)

**Files:**

- `lib/simulation/quality-evaluator.ts` - fixed both evaluators
- `lib/simulation/pipeline-runner.ts` - improved client_parse prompt

**Root Causes Found:**

**inquiry_parse (evaluator bug):**
The LLM sometimes returns `{ "parsed": { "clientName": "X", ... } }` (wrapped format from production prompt) instead of flat `{ "clientName": "X", ... }`. The evaluator tried to read `out.clientName` directly and got `undefined`. Also, the `dietaryRestrictions` field check didn't handle the `confirmed_dietary_restrictions` naming convention.

Fix: Added `parsed` wrapper unwrapping at the top of `evaluateInquiryParseDeterministic`. Added fallback for `confirmed_dietary_restrictions` field name.

**client_parse (prompt + evaluator bug):**
Two problems:

1. The pipeline prompt explicitly asked for `preferences` and `referralSource` fields, then the Ollama-based evaluator penalized the parser for "inventing" those fields. The prompt was telling the LLM to do something, then punishing it for doing it.
2. The evaluator was Ollama-based (subjective), violating Formula > AI. Different Ollama runs gave different scores for the same output.

Fix:

- Rewrote the client_parse pipeline prompt with clear rules, examples, and only the 5 essential fields (fullName, email, phone, dietaryRestrictions, allergies)
- Replaced the Ollama-based evaluator with a deterministic one that uses fuzzyMatch for name/email and string-contains for dietary items
- The deterministic evaluator combines `dietaryRestrictions` + `allergies` arrays before checking against ground truth, so the field split no longer causes false failures

### Architecture Principle Applied

Formula > AI: Both evaluators are now deterministic (4 of 6 modules). Only `allergen_risk` and `menu_suggestions` still use Ollama for evaluation, which is appropriate since those require subjective quality judgment.
