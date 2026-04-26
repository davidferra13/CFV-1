# Build Spec: Gap Quality Gate

> Codex task. Modify ONE existing file only: `devtools/persona-batch-synthesizer.mjs`

## What This Does

Adds a quality filter that rejects garbage gap titles before they enter synthesis. Right now the synthesizer accepts gap titles like "Efficiency:", "Automation:", "Searchability:", "Traceability:" - single-word junk from poorly parsed Ollama output. These inflate priority scores and pollute the build queue.

## File To Modify

`devtools/persona-batch-synthesizer.mjs`

## What To Add

### 1. Add a `isLowQualityGap` function

Add this function IMMEDIATELY BEFORE the `categorizeGaps` function (which starts around line 447). Place it between the `inferSeverity` function and the `categorizeGaps` function.

```js
// ---------------------------------------------------------------------------
// Gap Quality Gate
// Rejects low-quality gap titles that would pollute synthesis.
// ---------------------------------------------------------------------------

function isLowQualityGap(gap) {
  const title = (gap.title || '').trim()

  // Reject empty or very short titles
  if (title.length < 5) return true

  // Reject titles that are just a single word with optional colon
  // Examples: "Efficiency:", "Automation:", "Traceability:"
  if (/^[A-Za-z]+:?\s*$/.test(title)) return true

  // Reject titles that are just two words with colon
  // Examples: "Manual Tracking:", "Vendor Management:", "Audit Trail:"
  if (/^[A-Za-z]+\s+[A-Za-z]+:?\s*$/.test(title)) return true

  // Reject generic filler titles
  const FILLER_TITLES = [
    'workflow coverage gap',
    'data model gap',
    'manual review required',
    'retry candidate',
    'analyzer incomplete',
    'planner input degraded',
    'report confidence unavailable',
  ]
  if (FILLER_TITLES.includes(title.toLowerCase().replace(/:$/, ''))) return true

  return false
}
```

### 2. Add filtering in the `parseReport` function

Find the `parseReport` function (around line 420). It returns an object with a `gaps` array. After the line that assigns `const gaps = extractGaps(text)` (or right before the return statement), add a filter:

Find this exact pattern in the code:

```js
return {
  slug: file.slug,
  name,
  date: file.date,
  score,
  score_breakdown,
  gaps,
  quick_wins,
  verdict,
}
```

Change it to:

```js
const filteredGaps = gaps.filter((gap) => {
  if (isLowQualityGap(gap)) {
    console.log(`${TAG}     [quality-gate] Rejected: "${gap.title}" (from ${file.slug})`)
    return false
  }
  return true
})

return {
  slug: file.slug,
  name,
  date: file.date,
  score,
  score_breakdown,
  gaps: filteredGaps,
  quick_wins,
  verdict,
}
```

## What NOT To Change

- Do NOT modify any other function
- Do NOT modify the GAP_CATEGORIES array
- Do NOT modify the KNOWN_BUILT_FEATURES array
- Do NOT modify the aggregate function
- Do NOT modify the CLI parsing
- Do NOT modify any imports
- Do NOT change the output JSON schema
- Do NOT add new CLI flags
- The TAG constant already exists at line 13: `const TAG = '[persona-batch-synthesizer]'`

## Testing

After implementation, run:

```
node devtools/persona-batch-synthesizer.mjs --dry-run
```

You should see `[quality-gate] Rejected:` log lines for garbage titles. The output saturation.json should have fewer total gaps than before (was 121, should drop to ~90-95 after filtering).

## What This Fixes

Before: `uncategorized` category has 25 gaps with priority_score 52 (ranked #1). Most are garbage like "Efficiency:", "Coordination:", "System Rigidity:".

After: `uncategorized` drops significantly. Real categories like `recipe-menu` and `dosing-cannabis` rise to the top where they belong.
