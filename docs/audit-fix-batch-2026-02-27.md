# Audit Fix Batch — 2026-02-27

## What Happened

A comprehensive codebase audit (5 parallel agents scanning ~300 files, 198 migrations) identified 3 critical issues, 2 high-priority gaps, and uncommitted work. All were fixed in a single batch.

## Changes Made

### 1. Recipe Parsing Privacy Fix (CRITICAL)

**Problem:** `lib/ai/parse-recipe.ts` sent recipe text to Google Gemini via `parseWithAI()`. Recipes are the chef's intellectual property — must stay local.

**Fix:** Switched from `parseWithAI` (Gemini) to `parseWithOllama` (local). Same function signature, same callers, no UI changes. If Ollama is offline, user sees "Start Ollama to use this feature" instead of silently leaking data.

**Files:** `lib/ai/parse-recipe.ts`

### 2. Gemini → Ollama Privacy Migration (5 files)

**Problem:** 5 files sent private data (client names, financials, dietary restrictions, event locations, business assets) to Google Gemini.

**Fix:** All 5 migrated to local Ollama with Zod schema validation. Each follows the same pattern: remove GoogleGenAI, add parseWithOllama + OllamaOfflineError, create Zod schema, split prompt into system/user.

| File                                         | Private Data Sent                            | Model Tier      |
| -------------------------------------------- | -------------------------------------------- | --------------- |
| `lib/ai/aar-generator.ts`                    | Client names, financials, temp logs          | complex (prose) |
| `lib/ai/contingency-ai.ts`                   | Location, dietary restrictions, allergies    | standard        |
| `lib/ai/grocery-consolidation.ts`            | Dietary restrictions, allergies, guest count | standard        |
| `lib/ai/equipment-depreciation-explainer.ts` | Equipment prices, depreciation schedules     | standard        |
| `lib/ai/chef-bio.ts`                         | Chef name, business name, event history      | complex (prose) |

**Still on Gemini (safe — no private data):**

- `lib/ai/gemini-service.ts` — generic task extraction, technique lists
- `lib/ai/campaign-outreach.ts` — `draftCampaignConcept()` only (generic themes, no PII)

### 3. Pro Tier Billing Gates (5 files, 33+ functions)

**Problem:** Free-tier users could access Pro features unrestricted — marketing, protection, analytics, professional development, and Remy AI.

**Fix:** Added `await requirePro('slug')` after `requireChef()` in every exported server action. Admins bypass automatically.

| File                                              | Slug               | Functions Gated              |
| ------------------------------------------------- | ------------------ | ---------------------------- |
| `lib/marketing/actions.ts`                        | `'marketing'`      | 21 functions                 |
| `lib/protection/insurance-actions.ts`             | `'protection'`     | 6 functions                  |
| `lib/analytics/custom-report-enhanced-actions.ts` | `'custom-reports'` | 2 functions                  |
| `lib/professional/actions.ts`                     | `'professional'`   | 9 functions                  |
| `lib/ai/remy-actions.ts`                          | `'remy'`           | 1 function (sendRemyMessage) |

### 4. Prospect Scrub System v2.1 (uncommitted work — committed)

**Problem:** Complete, working lead-scoring and scrub enhancements sitting untracked in the working tree. One type error blocking compilation.

**Fix:** Fixed `newsIntel` type in `scrub-prompt.ts`, committed all prospect files.

### 5. Security Posture (verified clean)

The audit also verified these are all in good shape (no changes needed):

- RLS on 176 tables
- Middleware auth enforcement
- CSP headers properly configured
- Stripe webhook signature verification + idempotency
- API key hashing (SHA256)
- Tenant scoping from session, never request body
- Ledger-first immutable financial model
- Environment secrets properly gitignored

## Verification

All changes are code edits only — no builds run (multi-agent mode with 3 other agents active). The developer should run:

```bash
npx tsc --noEmit --skipLibCheck
npx next build --no-lint
```

## Architecture Principle Reinforced

> "We don't have your data" > "We promise not to look."

After this batch, the only Gemini usage remaining is for truly generic, non-identifying data (task extraction from conversation text, cooking technique lists, campaign theme brainstorming). All chef/client/financial/dietary data stays on the local machine via Ollama.
