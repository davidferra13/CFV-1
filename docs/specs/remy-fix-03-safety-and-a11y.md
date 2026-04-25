# Remy Fix 03: Grounding Rule Position + Unicode Normalization + Accessibility

> **Priority:** P1 - Safety and accessibility fixes
> **Risk level:** LOW - prompt reordering, string normalization, HTML attribute additions
> **Estimated scope:** 4 files modified

---

## Problem

1. The anti-hallucination GROUNDING RULE is appended near the END of the system prompt (line 946 of `route-prompt-utils.ts`). When the prompt exceeds Gemma 4's context window, this critical safety instruction gets silently truncated first.
2. `validateRemyInput()` in `remy-guardrails.ts` does NOT normalize Unicode before running injection detection regexes. Cyrillic homoglyphs (e.g., Cyrillic "o" instead of Latin "o") bypass injection patterns.
3. No `aria-live` region on any chat message container across all 4 surfaces. Screen readers cannot detect new messages.

## Exact Changes Required

### Change 1: Move grounding rule to the START of the prompt

**File:** `app/api/remy/stream/route-prompt-utils.ts`

The `buildRemySystemPrompt` function builds an array called `parts` and joins them. The grounding rule is currently appended at line 946:

```ts
parts.push(`\nGROUNDING RULE (CRITICAL):
You may ONLY reference data that actually appears in the sections above.
Some context sections are intentionally omitted when the question is narrow. If a section is absent, treat it as unavailable rather than guessing.
If a section is present with "0", an empty list, or no items, that means there are none.
Use page-level or entity-level context when it is present. If it is not present, do not imply you can see it.
NEVER fabricate names, dates, amounts, metrics, or details to sound helpful.`)
```

**Step A:** DELETE this entire `parts.push(...)` block from line 946.

**Step B:** Find the first `parts.push(...)` call in the function (this should be where the personality/system prompt text is first added). IMMEDIATELY AFTER the first `parts.push(...)`, add a NEW push:

```ts
parts.push(`\nGROUNDING RULE (CRITICAL - APPLIES TO ENTIRE CONVERSATION):
You may ONLY reference data that actually appears in the context sections of this prompt.
Some context sections are intentionally omitted when the question is narrow. If a section is absent, treat it as unavailable rather than guessing.
If a section is present with "0", an empty list, or no items, that means there are none.
Use page-level or entity-level context when it is present. If it is not present, do not imply you can see it.
NEVER fabricate names, dates, amounts, metrics, or details to sound helpful.`)
```

The wording is nearly identical, just moved to position 2 in the parts array (right after personality) so it is never truncated.

### Change 2: Add Unicode normalization to guardrail validation

**File:** `lib/ai/remy-guardrails.ts`

Find the `validateRemyInput` function. It takes a `message: string` parameter. At the very start of the function body (before any regex checks), add:

```ts
// Normalize Unicode to prevent homoglyph bypasses (e.g., Cyrillic "о" vs Latin "o")
message = message.normalize('NFC')
```

This must be the first line inside the function, before the empty/whitespace check and before any `DANGEROUS_PATTERNS`, `ABUSE_PATTERNS`, or `INJECTION_PATTERNS` regex tests.

NOTE: The `message` parameter may need to be changed from `const` to `let`, or you can create a new variable:

```ts
const normalized = message.normalize('NFC')
```

and use `normalized` for all subsequent regex checks. Either approach is fine, pick whichever compiles.

### Change 3: Add `aria-live` to message containers

Add `aria-live="polite"` to the scrollable message container div in each of these 4 files. Find the div that wraps the `messages.map(...)` call and add the attribute.

**File 1:** `components/public/remy-concierge-widget.tsx`
Find (around line 394):

```tsx
<div className="flex-1 overflow-y-auto bg-stone-800 p-4" style={{ minHeight: '120px' }}>
```

Add `aria-live="polite"` to this div.

**File 2:** `components/ai/remy-public-widget.tsx`
Find the scrollable messages container div. Add `aria-live="polite"`.

**File 3:** `components/ai/remy-client-chat.tsx`
Find the scrollable messages container div. Add `aria-live="polite"`.

**File 4:** `components/ai/remy-mascot-chat.tsx`
Find the scrollable messages container div. Add `aria-live="polite"`.

The pattern for all 4 files is the same: find the div that has `overflow-y-auto` and contains the `messages.map(...)` rendering, and add `aria-live="polite"` as an attribute.

## IMPORTANT: Do NOT

- Do NOT change ANY prompt content beyond the grounding rule move (no rewording personality, no changing context sections)
- Do NOT modify any regex patterns in the guardrails (only add the normalization step)
- Do NOT touch `remy-drawer.tsx` for aria-live (the drawer has its own accessibility concerns that are out of scope)
- Do NOT modify any API route logic, streaming behavior, or response handling
- Do NOT add any new dependencies
- Do NOT change any existing function signatures

## Verification

1. `npx tsc --noEmit --skipLibCheck` must pass
2. In `route-prompt-utils.ts`, confirm the GROUNDING RULE text appears near the TOP of the parts array (position 2, right after personality), and does NOT appear at the bottom
3. In `remy-guardrails.ts`, confirm `.normalize('NFC')` is called before any regex test
4. In all 4 widget files, confirm the message container div has `aria-live="polite"`
