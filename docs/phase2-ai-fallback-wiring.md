# Phase 2: AI Fallback Wiring — Complete

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`

## What Changed

Every AI action file now uses `withAiFallback()` — the formula/template runs first (always works), and AI enhances when Ollama is online. **No more `OllamaOfflineError` for these features.**

## Files Modified (12 AI action files)

### Tier 1-2: Formula Fallbacks

| File                                         | Formula Used                   | What It Does                                           |
| -------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `lib/ai/temp-log-anomaly.ts`                 | `analyzeTempLogFormula`        | FDA danger zone + standard deviation anomaly detection |
| `lib/ai/expense-categorizer.ts`              | `categorizeExpenseFormula`     | 150+ keyword matching for expense categories           |
| `lib/ai/allergen-risk.ts`                    | `buildAllergenMatrixFormula`   | FDA Big 9 + common allergen lookup                     |
| `lib/ai/pricing-intelligence.ts`             | `calculatePricingFormula`      | Percentile math on historical quotes                   |
| `lib/ai/tax-deduction-identifier.ts`         | `identifyDeductionsFormula`    | IRS category rules for chef expenses                   |
| `lib/ai/carry-forward-match.ts`              | `matchCarryForwardFormula`     | Levenshtein fuzzy match + culinary substitution groups |
| `lib/ai/gratuity-framing.ts`                 | `calculateGratuityFormula`     | Industry-standard gratuity rules                       |
| `lib/ai/equipment-depreciation-explainer.ts` | `calculateDepreciationFormula` | Straight-line depreciation (uses Gemini, not Ollama)   |

### Tier 3: Template Fallbacks

| File                              | Template Used                   | What It Does                          |
| --------------------------------- | ------------------------------- | ------------------------------------- |
| `lib/ai/contract-generator.ts`    | `generateContractTemplate`      | 8-section service agreement           |
| `lib/ai/staff-briefing-ai.ts`     | `generateStaffBriefingTemplate` | 9-section staff briefing document     |
| `lib/ai/prep-timeline-actions.ts` | `buildPrepTimelineFormula`      | Backward-from-service-time scheduling |
| `lib/ai/draft-actions.ts`         | 10 email templates              | All 10 email draft generators wired   |

## The Pattern

```
Formula runs FIRST (deterministic, always correct)
  → AI tries to enhance (if Ollama is online)
    → If AI fails → formula result returned silently (no error)
```

### withAiFallback signature:

```ts
withAiFallback<T>(
  formulaVersion: () => T | Promise<T>,   // always runs
  aiVersion: () => Promise<T>              // optional enhancement
): Promise<{ result: T; source: 'formula' | 'ai' }>
```

### Special case: Equipment Depreciation

Uses Gemini (cloud AI), not Ollama. Manual try/catch pattern — formula runs first, Gemini catch falls back to formula result.

## What This Means for Users

- **Ollama running:** Features return AI-enhanced results (richer language, personalized tone)
- **Ollama stopped:** Features return formula/template results (always correct, always fast)
- **No errors, no broken features** — everything degrades gracefully

## Verification Checklist

- [ ] Stop Ollama → open any event detail → click AI panels → all return results
- [ ] Start Ollama → click again → results should be richer
- [ ] 10 email drafts work offline (template versions)
- [ ] Contract/staff briefing/prep timeline work offline
- [ ] Equipment depreciation works without Gemini API key

## Related

- Phase 1 (formula creation): committed as `6d93049`
- Plan: `.claude/plans/imperative-honking-backus.md`
- Wrapper: `lib/ai/with-ai-fallback.ts`
