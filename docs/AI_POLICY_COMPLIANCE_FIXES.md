# AI Policy Compliance Fixes

**Date:** 2026-02-17
**Triggered by:** Audit of codebase against `docs/AI_POLICY.md`

## Summary

Three compliance gaps were identified during an audit of existing AI features against the AI policy. All were UX/language issues — no functional violations existed. The core architecture (AI never mutates canonical state) was already correct.

## Changes Made

### 1. Fixed Misleading System Prompt — `lib/ai/gemini-service.ts`

**Before:**

```
Role: You are the Autonomous Operations Manager for ChefFlow.
Authority: You manage the business lifecycle for a private chef.
```

**After:**

```
Role: You are a drafting assistant for a private chef's correspondence.
Purpose: You generate editable draft responses for the chef to review, modify, and send.
You do NOT send messages, confirm events, modify records, or take any autonomous action.
```

**Why:** The function only generates draft text — it has no authority over anything. The old language contradicted the AI policy's core principle that AI never owns truth. Even though the code behavior was correct, the prompt language should match reality to prevent confusion if the prompt is reused or inspected.

### 2. Added "AI-Extracted" Labels — `components/import/smart-import-hub.tsx`

**What changed:**

- Added an `Alert` banner at the top of the review phase: _"The content below was extracted by AI. Please review carefully before saving."_
- Added `<Badge variant="info">AI-Extracted</Badge>` to:
  - Parse summary bar
  - `ReceiptReviewCard` header
  - `DocumentReviewCard` header
  - `ClientReviewCard` header
  - `RecipeReviewCard` header

**Why:** The AI policy requires AI output to be _"visually distinct from canonical data"_ and _"clearly labeled as Suggestion"_. The review cards had confidence badges but lacked explicit AI provenance labeling.

### 3. Added "AI-Extracted" Banner — `components/expenses/expense-form.tsx`

**What changed:**

- Added `Alert` banner above extracted data: _"These line items were extracted by AI. Please review amounts and categories before saving."_
- Added `<Badge variant="info">AI-Extracted</Badge>` next to the "Extracted Data" heading
- Imported `Badge` component

**Why:** Same policy requirement as above. The expense form's receipt extraction had no visual indicator that data was AI-generated.

### 4. Added Confirmation Checkbox — `components/import/smart-import-hub.tsx`

**What changed:**

- Added `aiReviewConfirmed` state (boolean, defaults to `false`)
- Added a checkbox in the review phase: _"I have reviewed the AI-extracted data above and confirm it is accurate"_
- Save button is disabled until checkbox is checked
- Checkbox resets when state resets

**Why:** The AI policy states all AI output requires _"explicit chef confirmation before becoming canonical"_. While the existing "Save All" button was already an explicit action, the checkbox makes the confirmation intentional — the chef actively attests they reviewed the AI output rather than blindly clicking save.

## What Was NOT Changed

- No server-side logic was modified
- No import actions, ledger functions, or lifecycle transitions were touched
- The `importReceiptAsExpense` action was left as-is — the confirmation gate is correctly in the UI layer
- No changes to AI parsing logic

## Policy Alignment

| Policy Requirement                | Status                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| AI output visually distinct       | Now compliant — blue "AI-Extracted" badges on all cards       |
| AI output labeled as suggestion   | Now compliant — alert banner + badges                         |
| Explicit confirmation before save | Now compliant — checkbox required                             |
| System prompt accuracy            | Now compliant — "drafting assistant" not "operations manager" |

## Architecture Note

These changes reinforce the existing separation:

```
AI Parsing (pure extraction) → Review Phase (labeled, gated) → Chef Confirms → Normal System Write
```

The AI layer remains a suggestion engine. The chef remains the decision-maker. The system remains deterministic.
