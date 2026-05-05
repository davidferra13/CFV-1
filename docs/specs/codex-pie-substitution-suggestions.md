# Codex Build Spec: PIE Substitution Suggestions on High-Risk Ingredients

> **Priority:** P1 - Law 11: "consider pork loin at $4.20/lb for similar application"
> **Risk:** MEDIUM - adds UI to ingredient/recipe surfaces
> **Estimated scope:** ~180 lines across 3 files

## Context

`lib/pricing/predictive-supply.ts` (581 LOC) has a substitution engine that returns alternatives when an ingredient is high-risk or expensive. This data never reaches the chef. When chicken breast spikes to $8.50/lb, the chef should see "pork loin at $4.20/lb" as an alternative.

## What to Build

### 1. Server action for substitution suggestions

Create or extend an action in `lib/pricing/` that:

- Takes an ingredientId
- Returns top 3 substitutes with: name, priceCents, unit, savingsPct, similarityScore
- Only returns substitutes when the ingredient is HIGH or CRITICAL risk, or when price is > 20% above 90-day average
- Returns empty array for normal-priced, low-risk ingredients (don't spam suggestions)

### 2. UI: Substitution chip on recipe ingredient rows

Find where recipe ingredients are displayed with prices (likely `components/pricing/` or `components/recipe/`). When substitutions are available:

- Show a subtle "Alternatives available" link/badge
- On click/expand: show 2-3 alternatives with prices and savings %
- Format: "Pork Loin - $4.20/lb (save 51%)"
- Dismiss-able (chef can hide suggestions for this ingredient)

### 3. Integration with event costing

When costing an event, if any ingredient has high-risk + available substitutes:

- Show a summary line: "3 ingredients have cheaper alternatives (save ~$45 total)"
- Link to the specific ingredients

## Do NOT

- Auto-substitute anything. Chef always decides
- Show substitutions for every ingredient (only high-risk or spiked)
- Modify the substitution engine logic itself
- Add new database tables

## Acceptance Criteria

- High-risk ingredients show substitution suggestions
- Normal ingredients show nothing extra
- Chef can dismiss suggestions
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
