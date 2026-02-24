# Deterministic Formulas — Session Summary

**Date:** 2026-02-24
**Branch:** `feature/risk-gap-closure`
**Goal:** Build reliable, formula-based versions of features that currently depend on AI (Ollama)

---

## Why This Exists

ChefFlow was using local LLM calls (Ollama) for features that are solved problems — multiplication, keyword lookups, percentile math, fill-in-the-blank templates. These are things every recipe site, catering app, and accounting tool has done with formulas for decades.

**The problem:**

- If Ollama is offline, these features throw `OllamaOfflineError` and stop working
- An LLM takes seconds for what a formula does in milliseconds
- An LLM can give different (wrong) answers each time; a formula is always correct

**The fix:**

- Formula versions are the foundation — always available, always correct
- AI versions stay as optional enhancement — adds narrative/tone when Ollama is running
- New `withAiFallback` wrapper: tries AI first (if online), falls back to formula (if offline)

---

## What Was Built

### Foundation

- `lib/ai/with-ai-fallback.ts` — Wrapper utility for formula-first + optional AI enhancement

### Tier 1 — Pure Math (formulas are objectively better than AI)

- `lib/formulas/temp-anomaly.ts` — FDA Food Code thresholds, cooking temps, danger zone detection
- `lib/formulas/depreciation.ts` — Straight-line depreciation (IRS Publication 946)
- `lib/formulas/unit-conversions.ts` — Temperature (F↔C), weight (oz↔g, lb↔kg), volume (cups↔mL, etc.), length (in↔cm)

### Tier 2 — Lookup Tables & Weighted Rules

- `lib/formulas/expense-categorizer.ts` — Keyword map: store names + expense descriptions → categories
- `lib/formulas/allergen-matrix.ts` — FDA Big 9 allergens + common allergens, ingredient keyword lookup
- `lib/formulas/pricing-intelligence.ts` — Percentile math (P25, P50, P75) on historical quotes
- `lib/formulas/tax-categories.ts` — IRS rules for mileage, home office, depreciation, missed deductions
- `lib/formulas/carry-forward.ts` — Levenshtein distance + culinary substitution map
- `lib/formulas/gratuity-calc.ts` — Industry-standard gratuity rules based on event type/value/relationship

### Tier 3 — Templates

- `lib/templates/email-drafts.ts` — 12 email types (thank-you, referral, testimonial, quote cover, decline, cancellation, payment reminder, re-engagement, milestone, food safety, follow-up, review request)
- `lib/templates/contract.ts` — Service agreement with standard sections (parties, details, pricing, cancellation, liability)
- `lib/templates/staff-briefing.ts` — Pre-event briefing (service protocol, menu, allergens, timings, dress code, cleanup)
- `lib/templates/prep-timeline.ts` — Backward-scheduled prep timeline from service time with guest scaling
- `lib/templates/social-captions.ts` — Instagram/Facebook/Twitter captions by tone (personal/elegant/casual)
- `lib/templates/aar.ts` — After-action report (what went well, improve, financial reflection, next time)
- `lib/templates/contingency.ts` — Rule-based contingency plans (weather, allergens, staffing, equipment, transport)

---

## What Still Needs to Be Done (Next Session)

### Phase 2: Wire Up Fallbacks

Each existing AI action file needs to be updated to use `withAiFallback`, importing the formula version as the fallback. Files to modify:

- `lib/ai/temp-log-anomaly.ts` → use `analyzeTempLogFormula`
- `lib/ai/equipment-depreciation-explainer.ts` → use `calculateDepreciationFormula`
- `lib/ai/expense-categorizer.ts` → use `categorizeExpenseFormula`
- `lib/ai/allergen-risk.ts` → use `buildAllergenMatrixFormula`
- `lib/ai/pricing-intelligence.ts` → use `calculatePricingFormula`
- `lib/ai/tax-deduction-identifier.ts` → use `identifyDeductionsFormula`
- `lib/ai/carry-forward-match.ts` → use `matchCarryForwardFormula`
- `lib/ai/gratuity-framing.ts` → use `calculateGratuityFormula`
- `lib/ai/draft-actions.ts` → use email templates
- `lib/ai/contract-generator.ts` → use `generateContractTemplate`
- `lib/ai/staff-briefing-ai.ts` → use `generateStaffBriefingTemplate`
- `lib/ai/prep-timeline-actions.ts` → use `buildPrepTimelineFormula`

### Phase 3: AI Features That Stay AI-Only (no formula needed)

- Remy conversational chat
- Inquiry/client/event parsing from raw text
- Sentiment analysis
- Business insights narrative
- Menu suggestions (creative pairing)
- Client preference profiling
- Remy intent classification

---

## Architecture Principle (New Rule for CLAUDE.md)

**Formulas first, AI second.** Every feature that can be solved with deterministic logic (math, lookups, templates) must have a working formula version. AI is an optional enhancement, never the only implementation. If Ollama is offline, every feature still works.
