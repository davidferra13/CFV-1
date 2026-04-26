# Build Spec: Gap Deduplication in Synthesis

> Codex task. Modify ONE existing file only: `devtools/persona-batch-synthesizer.mjs`

## What This Does

Adds deduplication to the aggregate phase so that near-identical gaps from different personas are merged instead of counted separately. Right now "Workflow coverage gap" from Samantha Green and "Workflow coverage gap" from Tommy Thompson count as 2 separate gaps, inflating the category's priority score.

## File To Modify

`devtools/persona-batch-synthesizer.mjs`

## What To Add

### 1. Add a `normalizeGapTitle` function

Add this function IMMEDIATELY AFTER the `isLowQualityGap` function (which you may have just added from the quality-gate spec, or which may already exist). If `isLowQualityGap` does not exist, add it immediately before the `categorizeGaps` function.

```js
function normalizeGapTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

function areSimilarGaps(gapA, gapB) {
  const a = normalizeGapTitle(gapA.title)
  const b = normalizeGapTitle(gapB.title)

  // Exact match after normalization
  if (a === b) return true

  // One contains the other (handles "No X" vs "X" variations)
  if (a.length > 5 && b.length > 5) {
    if (a.includes(b) || b.includes(a)) return true
  }

  return false
}
```

### 2. Modify the `aggregate` function to deduplicate within categories

Find the `aggregate` function (starts around line 475). Inside it, find the loop that builds `representative_gaps` for each category. The relevant code block is (around lines 507-531):

```js
for (const persona of personas) {
  const seenCategories = new Set()
  for (const gap of persona.gaps) {
    for (const catId of gap.categories) {
      if (!categories[catId]) continue
      const cat = categories[catId]
      cat.severity_breakdown[gap.severity] = (cat.severity_breakdown[gap.severity] || 0) + 1
      const representativeGap = {
        title: gap.title,
        from: persona.slug,
        from_name: persona.name,
        severity: gap.severity,
        description: gap.description,
        search_hints: gap.search_hints || null,
      }
      representativeGap.likely_built = gapMatchesKnownBuiltFeature(representativeGap)
      cat.representative_gaps.push(representativeGap)
      if (!seenCategories.has(catId)) {
        seenCategories.add(catId)
        cat.count++
        cat.personas.push(persona.slug)
      }
    }
  }
}
```

Replace ONLY the inner part where `representativeGap` is created and pushed. Change it to check for duplicates before pushing:

```js
for (const persona of personas) {
  const seenCategories = new Set()
  for (const gap of persona.gaps) {
    for (const catId of gap.categories) {
      if (!categories[catId]) continue
      const cat = categories[catId]
      cat.severity_breakdown[gap.severity] = (cat.severity_breakdown[gap.severity] || 0) + 1
      const representativeGap = {
        title: gap.title,
        from: persona.slug,
        from_name: persona.name,
        severity: gap.severity,
        description: gap.description,
        search_hints: gap.search_hints || null,
      }
      representativeGap.likely_built = gapMatchesKnownBuiltFeature(representativeGap)

      // Deduplication: check if a similar gap already exists in this category
      const existingMatch = cat.representative_gaps.find((existing) =>
        areSimilarGaps(existing, representativeGap)
      )
      if (existingMatch) {
        // Merge: keep the higher severity, track additional persona
        if (SEVERITY_WEIGHT[representativeGap.severity] > SEVERITY_WEIGHT[existingMatch.severity]) {
          existingMatch.severity = representativeGap.severity
        }
        if (!existingMatch.also_from) existingMatch.also_from = []
        existingMatch.also_from.push({ slug: persona.slug, name: persona.name })
      } else {
        cat.representative_gaps.push(representativeGap)
      }

      if (!seenCategories.has(catId)) {
        seenCategories.add(catId)
        cat.count++
        cat.personas.push(persona.slug)
      }
    }
  }
}
```

## What NOT To Change

- Do NOT modify the `categorizeGaps` function
- Do NOT modify the `extractGaps` function
- Do NOT modify the output JSON schema structure (the `also_from` field is additive)
- Do NOT modify the saturation tracking logic
- Do NOT modify the priority ranking calculation
- Do NOT modify the CLI parsing or any imports
- Do NOT modify `writeBuildPlan` or `writeSynthesisReport`
- The `SEVERITY_WEIGHT` constant already exists at line 121: `const SEVERITY_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 }`

## Testing

After implementation, run:

```
node devtools/persona-batch-synthesizer.mjs --dry-run
```

The output saturation.json should show fewer `gap_count` values per category (duplicates merged). The `representative_gaps` arrays should be shorter. Some gaps should have an `also_from` array showing which other personas reported the same thing.

## What This Fixes

Before: `payment-financial` has 12 gaps, many duplicated ("Workflow coverage gap" x3, "Data Sovereignty:" x3). Priority score inflated to 26.

After: Duplicates merge. Priority scores reflect unique problems, not how many personas said the same thing. Build queue gets cleaner priorities.
