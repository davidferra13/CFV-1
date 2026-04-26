# Build Spec: Smart Selective Rescore

> Codex task. Modify ONE existing file only: `devtools/persona-regression-guard.mjs`

## What This Does

Adds a `--smart` flag to the regression guard that skips rescoring personas whose gap categories have no overlap with recently changed files. This cuts Ollama calls by 60-80% per regression check.

## File To Modify

`devtools/persona-regression-guard.mjs`

## How Smart Mode Works

1. Read the most recent build receipt from `system/build-receipts/` (sort files by name descending, take first)
2. From the receipt, get `gaps_likely_addressed` and `gaps_possibly_addressed` - these contain `category` fields
3. Collect all unique categories from the receipt
4. For each persona, load their stress test report from `docs/stress-tests/persona-{slug}-*.md` (most recent by date in filename)
5. Extract gap categories from the report (look for category keywords in gap titles/descriptions using the same keyword list)
6. If a persona's gap categories overlap with the receipt's categories, rescore it
7. If no overlap, skip it (print skip message to stderr)

## Changes To Make

### 1. Add `--smart` flag to `parseArgs`

Find the `parseArgs` function (starts around line 34). Add to the opts object:

```js
smart: false,
```

Add to the argument parsing switch:

```js
} else if (arg === '--smart') {
  opts.smart = true;
```

### 2. Add constants for gap category keywords

Add these constants AFTER the existing constants at the top of the file (after the TYPES array, around line 28):

```js
const SATURATION_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json')
const BUILD_RECEIPTS_DIR = join(ROOT, 'system', 'build-receipts')
const STRESS_TEST_DIR = join(ROOT, 'docs', 'stress-tests')

const GAP_CATEGORY_KEYWORDS = {
  'event-lifecycle': ['event lifecycle', 'ephemeral', 'pop-up', 'temporary event'],
  'access-control': ['access control', 'invite-only', 'tiered access', 'waitlist'],
  'ticketing-drops': ['ticket', 'drop', 'sell-out', 'controlled release'],
  'audience-community': ['audience', 'community', 'guest tracking', 'repeat guest'],
  'location-venue': ['location', 'venue', 'setup', 'mobile', 'site'],
  'payment-financial': [
    'payment',
    'financial',
    'billing',
    'pricing',
    'cost',
    'revenue',
    'deposit',
    'invoice',
  ],
  'compliance-legal': ['compliance', 'legal', 'regulation', 'audit', 'license', 'liability'],
  'dosing-cannabis': ['dose', 'dosing', 'cannabis', 'thc', 'cbd', 'infusion', 'potency'],
  'dietary-medical': ['dietary', 'medical', 'allergy', 'allergen', 'restriction'],
  'recipe-menu': ['recipe', 'menu', 'dish', 'course', 'ingredient', 'prep'],
  'scheduling-calendar': ['schedule', 'calendar', 'booking', 'availability', 'conflict'],
  communication: ['communication', 'email', 'message', 'notification'],
  'staffing-team': ['staff', 'team', 'hire', 'brigade', 'delegation'],
  'sourcing-supply': ['sourcing', 'supplier', 'vendor', 'procurement', 'farm'],
  'costing-margin': ['food cost', 'margin', 'costing', 'markup', 'waste'],
  'reporting-analytics': ['report', 'analytics', 'dashboard', 'metrics', 'performance'],
  'onboarding-ux': ['onboarding', 'first time', 'setup', 'learning curve'],
  'scaling-multi': ['scale', 'multi-location', 'growth', 'franchise'],
  'delivery-logistics': ['delivery', 'logistics', 'transport', 'packaging'],
  'documentation-records': ['document', 'record', 'archive', 'history', 'trail'],
}
```

### 3. Add helper functions

Add these functions BEFORE the `main` function (before line 366):

```js
function loadLatestReceipt() {
  if (!existsSync(BUILD_RECEIPTS_DIR)) return null
  let files
  try {
    files = readdirSync(BUILD_RECEIPTS_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
  } catch {
    return null
  }
  if (files.length === 0) return null
  try {
    return JSON.parse(readFileSync(join(BUILD_RECEIPTS_DIR, files[0]), 'utf-8'))
  } catch {
    return null
  }
}

function extractCategoriesFromReceipt(receipt) {
  const categories = new Set()
  for (const gap of receipt.gaps_likely_addressed || []) {
    if (gap.category) categories.add(gap.category)
  }
  for (const gap of receipt.gaps_possibly_addressed || []) {
    if (gap.category) categories.add(gap.category)
  }
  return categories
}

function findLatestReport(slug) {
  if (!existsSync(STRESS_TEST_DIR)) return null
  let files
  try {
    files = readdirSync(STRESS_TEST_DIR)
  } catch {
    return null
  }

  const matching = files
    .filter((f) => {
      const match = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/i.exec(f)
      if (!match) return false
      return match[1] === slug || match[1].includes(slug) || slug.includes(match[1])
    })
    .sort()
    .reverse()

  if (matching.length === 0) return null
  try {
    return readFileSync(join(STRESS_TEST_DIR, matching[0]), 'utf-8')
  } catch {
    return null
  }
}

function extractPersonaCategories(reportText) {
  const categories = new Set()
  const lower = reportText.toLowerCase()
  for (const [catId, keywords] of Object.entries(GAP_CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        categories.add(catId)
        break
      }
    }
  }
  return categories
}

function filterBySmartMode(personas, opts) {
  const receipt = loadLatestReceipt()
  if (!receipt) {
    stderr('[smart] No build receipt found. Rescoring all personas.')
    return personas
  }

  const changedCategories = extractCategoriesFromReceipt(receipt)
  if (changedCategories.size === 0) {
    stderr('[smart] Build receipt has no gap categories. Rescoring all personas.')
    return personas
  }

  stderr(`[smart] Build receipt categories: ${[...changedCategories].join(', ')}`)

  const filtered = []
  for (const persona of personas) {
    const reportText = findLatestReport(persona.slug)
    if (!reportText) {
      stderr(`[smart] ${persona.slug}: no report found, including`)
      filtered.push(persona)
      continue
    }

    const personaCats = extractPersonaCategories(reportText)
    const overlap = [...personaCats].filter((c) => changedCategories.has(c))

    if (overlap.length > 0) {
      stderr(`[smart] ${persona.slug}: overlap on ${overlap.join(', ')}, including`)
      filtered.push(persona)
    } else {
      stderr(`[smart] ${persona.slug}: no overlap, SKIPPING`)
    }
  }

  stderr(`[smart] Rescoring ${filtered.length}/${personas.length} personas`)
  return filtered
}
```

### 4. Wire it into main

Find the `main` function (starts around line 366). Find the section where `runRescore` is called (around line 395). The current code looks like:

```js
if (opts.dryRun) {
  stderr('[dry-run] Skipping rescore; comparing existing score history.')
  ;({ baselines, newest } = dryRunBaselines(initialHistory))
} else {
  baselines = latestBySlug(initialHistory)
  runRescore(personas, opts)
  newest = latestBySlug(loadScoreHistory())
}
```

Change the else branch to apply smart filtering:

```js
if (opts.dryRun) {
  stderr('[dry-run] Skipping rescore; comparing existing score history.')
  ;({ baselines, newest } = dryRunBaselines(initialHistory))
} else {
  baselines = latestBySlug(initialHistory)
  const toRescore = opts.smart ? filterBySmartMode(personas, opts) : personas
  runRescore(toRescore, opts)
  newest = latestBySlug(loadScoreHistory())
}
```

IMPORTANT: The `results` comparison on line 399 still uses the full `personas` list. Do NOT change that. Smart mode only affects which personas get RE-SCORED. All personas still appear in the final report (those that weren't rescored just show their existing scores).

## What NOT To Change

- Do NOT modify the `comparePersonas` function
- Do NOT modify the `summarize` function
- Do NOT modify the `formatResults` function
- Do NOT modify the `writeReport` function
- Do NOT modify the `discoverPersonaFiles` function
- Do NOT modify the `runRescore` function
- Do NOT change any existing imports (but you will need `readdirSync` which is already imported)

## Testing

After implementation, run:

```
node devtools/persona-regression-guard.mjs --smart --dry-run
```

In smart mode with --dry-run, it should print the smart filtering logic (which personas overlap with receipt categories) but skip actual rescoring. Without --smart, behavior is identical to before.

## CLI After This Change

```
node devtools/persona-regression-guard.mjs                    # rescore ALL (original behavior)
node devtools/persona-regression-guard.mjs --smart            # rescore only affected personas
node devtools/persona-regression-guard.mjs --smart --dry-run  # show what would be rescored
```
