# Codex Build Spec: P1 Allergen Matching Word Boundary Fix

> Priority: P1. False positives in allergen matching can cause chefs to unnecessarily remove dishes.
> Risk: LOW. Single function change in one file. No DB, no migrations.

---

## The Problem

**File:** `lib/menus/allergen-check.ts`
**Line:** 248
**Current code:**

```ts
return terms.some((term) => normalized.includes(term))
```

This uses simple substring matching. It produces false positives:

- "butternut squash" matches "butter" (dairy) -- WRONG
- "peanut oil" matches "pea" if "pea" were ever added -- WRONG
- "coconut" matches "nut" if checked against tree_nuts -- WRONG (coconut is FDA-classified as tree nut but this catch is too broad)

## The Fix

Replace line 248 with word-boundary matching:

```ts
return terms.some((term) => {
  // Word boundary match: term must appear as a whole word or at a word boundary
  // "butter" should match "butter sauce" but NOT "butternut"
  const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return regex.test(normalized)
})
```

Also update the direct string match fallback on line 245:

```ts
// Current:
return normalized.includes(allergen.toLowerCase())
// Change to:
const escapedAllergen = allergen.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
return new RegExp(`\\b${escapedAllergen}\\b`, 'i').test(normalized)
```

## IMPORTANT: Multi-word terms must still work

Some terms in the ALLERGEN_INGREDIENT_MAP are multi-word (e.g., "sour cream", "ice cream", "pine nut"). Word boundary matching handles these correctly because `\b` matches at spaces too. "sour cream" will still match "sour cream sauce". Verify this mentally before committing.

## What NOT to change

- DO NOT modify the ALLERGEN_INGREDIENT_MAP entries
- DO NOT change the `checkDishAgainstAllergens` function
- DO NOT add new allergen categories
- DO NOT change any other file
- DO NOT add AI/LLM to allergen checking

## Verification

After making the change, mentally verify these cases:

- "butternut squash" should NOT match dairy (term "butter")
- "butter" should match dairy
- "butter sauce" should match dairy
- "peanut butter" should match peanuts (term "peanut")
- "sour cream" should match dairy
- "ice cream cake" should match dairy

Run `npx tsc --noEmit --skipLibCheck` to verify no type errors.
