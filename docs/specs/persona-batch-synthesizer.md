# Build Spec: Batch Synthesizer + Saturation Tracker

> Reads all gap reports from analyzed personas, tags gaps by category, tracks saturation across the corpus, groups overlapping gaps, and produces consolidated build plans ready for Claude/Codex handoff.

## Context

The persona pipeline v2 exists and produces two outputs per persona:

1. **Gap report** at `docs/stress-tests/persona-{slug}-{date}.md` - contains Score, Top 5 Gaps (with severity + description), Quick Wins, Verdict
2. **Build tasks** at `system/persona-build-plans/{slug}/task-{n}.md` - individual build specs per gap

Right now these accumulate as flat files. Nobody reads across them. After 10+ personas, there's no way to see:

- Which categories of gaps keep appearing
- Which gaps are unique vs. duplicated across personas
- Whether new personas are still finding new problems
- What to build FIRST based on cross-persona priority

This script solves that.

## What to build: `devtools/persona-batch-synthesizer.mjs`

### Interface

```bash
# Synthesize all gap reports into a consolidated batch report
node devtools/persona-batch-synthesizer.mjs

# Only process reports from a specific date range
node devtools/persona-batch-synthesizer.mjs --since 2026-04-25

# Show saturation status only (no synthesis)
node devtools/persona-batch-synthesizer.mjs --saturation-only

# Dry run (analyze but don't write files)
node devtools/persona-batch-synthesizer.mjs --dry-run

# Use Ollama for intelligent gap clustering (optional, default is deterministic)
node devtools/persona-batch-synthesizer.mjs --use-llm --model hermes3:8b
```

### Phase 1: Extract (deterministic, no LLM)

Read every `docs/stress-tests/persona-*.md` file. Parse each one to extract:

```js
{
  slug: 'kai-donovan',
  date: '2026-04-25',
  score: 35,
  score_breakdown: {
    workflow_coverage: 15,
    data_model_fit: 10,
    ux_alignment: 5,
    financial_accuracy: 2,
    onboarding_viability: 1,
    retention_likelihood: 1
  },
  gaps: [
    {
      number: 1,
      title: 'Ephemeral Event Lifecycle Management',
      severity: 'HIGH',
      description: 'ChefFlow lacks a dedicated workflow for one-night events...',
      category: null  // assigned in Phase 2
    },
    // ... up to 5 gaps
  ],
  quick_wins: ['Add auto-archiving...', 'Build tiered access...'],
  verdict: 'Kai Donovan should not use ChefFlow today...'
}
```

Parsing is regex-based on the known gap report format:

- Score: `/## Score:\s*(\d+)\/100/`
- Score breakdown: each line matching `- Category (0-N): value`
- Gaps: `### Gap N: Title` followed by `**Severity:** X` and description text
- Quick wins: numbered list under `## Quick Wins`

### Phase 2: Categorize (deterministic, no LLM)

Assign each gap a category using keyword matching. Categories are predefined:

```js
const GAP_CATEGORIES = [
  {
    id: 'event-lifecycle',
    keywords: [
      'event lifecycle',
      'ephemeral',
      'one-night',
      'pop-up',
      'temporary event',
      'event management',
      'event flow',
    ],
  },
  {
    id: 'access-control',
    keywords: [
      'access control',
      'invite-only',
      'tiered access',
      'waitlist',
      'permissions',
      'visibility control',
    ],
  },
  {
    id: 'ticketing-drops',
    keywords: ['ticket', 'drop', 'sell-out', 'controlled release', 'demand', 'allocation'],
  },
  {
    id: 'audience-community',
    keywords: [
      'audience',
      'community',
      'guest tracking',
      'repeat guest',
      'curation',
      'composition',
    ],
  },
  { id: 'location-venue', keywords: ['location', 'venue', 'setup', 'mobile', 'site', 'space'] },
  {
    id: 'payment-financial',
    keywords: [
      'payment',
      'financial',
      'billing',
      'pricing',
      'cost',
      'revenue',
      'commitment',
      'deposit',
      'invoice',
    ],
  },
  {
    id: 'compliance-legal',
    keywords: [
      'compliance',
      'legal',
      'regulation',
      'documentation',
      'audit',
      'license',
      'liability',
    ],
  },
  {
    id: 'dosing-cannabis',
    keywords: ['dose', 'dosing', 'cannabis', 'thc', 'cbd', 'infusion', 'potency', 'terpene'],
  },
  {
    id: 'dietary-medical',
    keywords: [
      'dietary',
      'medical',
      'allergy',
      'allergen',
      'restriction',
      'health',
      'constraint',
      'intolerance',
    ],
  },
  {
    id: 'recipe-menu',
    keywords: ['recipe', 'menu', 'dish', 'course', 'ingredient', 'prep', 'archive'],
  },
  {
    id: 'scheduling-calendar',
    keywords: ['schedule', 'calendar', 'booking', 'availability', 'time', 'conflict', 'timeline'],
  },
  {
    id: 'communication',
    keywords: [
      'communication',
      'email',
      'message',
      'notification',
      'client communication',
      'staff communication',
    ],
  },
  {
    id: 'staffing-team',
    keywords: [
      'staff',
      'team',
      'hire',
      'brigade',
      'delegation',
      'assistant',
      'subcontractor',
      'multi-chef',
    ],
  },
  {
    id: 'sourcing-supply',
    keywords: ['sourcing', 'supplier', 'vendor', 'procurement', 'supply chain', 'farm', 'seasonal'],
  },
  {
    id: 'costing-margin',
    keywords: ['food cost', 'margin', 'per head', 'costing', 'markup', 'profitability', 'waste'],
  },
  {
    id: 'reporting-analytics',
    keywords: [
      'report',
      'analytics',
      'dashboard',
      'data',
      'metrics',
      'performance',
      'insight',
      'history',
    ],
  },
  {
    id: 'onboarding-ux',
    keywords: [
      'onboarding',
      'first time',
      'setup',
      'learning curve',
      'user experience',
      'confusing',
      'overwhelming',
    ],
  },
  {
    id: 'scaling-multi',
    keywords: [
      'scale',
      'multi-location',
      'multi-unit',
      'growth',
      'franchise',
      'brand',
      'expansion',
    ],
  },
  {
    id: 'delivery-logistics',
    keywords: ['delivery', 'logistics', 'transport', 'packaging', 'temperature', 'routing'],
  },
  {
    id: 'documentation-records',
    keywords: ['document', 'record', 'archive', 'history', 'trail', 'log', 'retention'],
  },
]
```

Each gap gets assigned the category with the most keyword matches in its title + description. If no category matches (< 2 keyword hits), assign `'uncategorized'`.

A gap can have multiple categories if there are ties. Store as array.

### Phase 3: Aggregate

Build the cross-persona view:

```js
{
  total_personas: 6,
  average_score: 42,
  score_distribution: { '0-20': 1, '21-40': 3, '41-60': 1, '61-80': 1, '81-100': 0 },

  categories: {
    'event-lifecycle': {
      count: 4,           // how many personas surfaced this
      personas: ['kai-donovan', 'leo-varga', ...],
      severity_breakdown: { HIGH: 3, MEDIUM: 1, LOW: 0 },
      representative_gaps: [  // deduplicated, best description per unique sub-problem
        { title: '...', from: 'kai-donovan', severity: 'HIGH', description: '...' }
      ]
    },
    // ... all categories
  },

  saturation: {
    new_categories_by_persona: [
      { slug: 'kai-donovan', new_categories: ['event-lifecycle', 'access-control', 'ticketing-drops', 'audience-community', 'location-venue'] },
      { slug: 'rina-solis', new_categories: ['dietary-medical'] },
      { slug: 'leo-varga', new_categories: [] },  // found nothing new
      // ...
    ],
    consecutive_zero_new: 1,  // how many recent personas found zero new categories
    saturated: false,          // true if consecutive_zero_new >= 5
    categories_never_seen: ['delivery-logistics', 'ghost-kitchen-ops']  // defined but never triggered
  },

  priority_ranking: [
    // categories sorted by: count * severity_weight (HIGH=3, MEDIUM=2, LOW=1)
    { category: 'event-lifecycle', priority_score: 14, count: 4, avg_severity: 'HIGH' },
    { category: 'compliance-legal', priority_score: 10, count: 3, avg_severity: 'HIGH' },
    // ...
  ]
}
```

### Phase 4: Write outputs

#### 4a. Synthesis report: `system/persona-batch-synthesis/synthesis-{date}.md`

Human-readable markdown summarizing the batch:

```markdown
# Persona Batch Synthesis

**Date:** 2026-04-25
**Personas analyzed:** 6
**Average score:** 42/100

## Priority Categories (by cross-persona frequency x severity)

### 1. Event Lifecycle (4 personas, avg severity HIGH)

**Personas:** Kai Donovan, Leo Varga, ...
**Common pattern:** ChefFlow assumes permanent, recurring operations. Operators running ephemeral, one-time, or pop-up events have no native workflow.
**Gaps in this category:**

- Ephemeral event lifecycle management (Kai Donovan, HIGH)
- Event data retention after completion (Jordan Hale, HIGH)
- ...

### 2. Compliance & Legal (3 personas, avg severity HIGH)

...

## Saturation Status

- Categories discovered: 14/20
- Last 3 personas found 1 new category
- NOT saturated. Keep generating.
- Categories never triggered: delivery-logistics, ...

## Score Trends

- Lowest: Kai Donovan (35) - underground supper club
- Highest: ... (58) - ...
- Weakest dimension across all personas: Workflow Coverage (avg 12/40)
```

#### 4b. Consolidated build plans: `system/persona-batch-synthesis/build-{category}.md`

One file per category that had 2+ personas hit it:

```markdown
# Consolidated Build: Event Lifecycle

**Priority rank:** 1 of 14
**Personas affected:** 4 (Kai Donovan, Leo Varga, ...)
**Average severity:** HIGH

## The Pattern

[2-3 sentence description of what's consistently broken across personas]

## Individual Gaps (deduplicated)

1. [Gap title] - from [persona] - [severity]
   [1-2 sentence description]
2. ...

## Recommended Build Scope

[What a single consolidated build should cover to address ALL gaps in this category at once.
NOT individual task specs. A high-level description of the feature/system change needed.]

## Existing Build Tasks

[List of any existing task files in system/persona-build-plans/ that relate to this category, with file paths]

## Acceptance Criteria (merged from all personas)

1. [Testable condition from persona 1]
2. [Testable condition from persona 2]
3. ...
```

#### 4c. Saturation dashboard: `system/persona-batch-synthesis/saturation.json`

Machine-readable JSON of the full aggregation (the data structure from Phase 3). Updated on every run. The inbox server or any other tool can read this.

### Phase 5 (optional, --use-llm flag): Intelligent clustering

If `--use-llm` is passed, AFTER the deterministic categorization:

1. Send all gaps that landed in the same category to Ollama
2. Ask: "These gaps were grouped by keyword matching. Are any of them actually the same problem described differently? Merge duplicates. Are any miscategorized? Reassign."
3. Use the LLM output to refine the categories and deduplication
4. Write a `synthesis-{date}-refined.md` alongside the deterministic version

This is optional. The deterministic version is the default and must always be produced.

---

## npm scripts

```json
"personas:synthesize": "node devtools/persona-batch-synthesizer.mjs",
"personas:saturation": "node devtools/persona-batch-synthesizer.mjs --saturation-only"
```

---

## Files created

| File                                                 | Purpose                                       |
| ---------------------------------------------------- | --------------------------------------------- |
| `devtools/persona-batch-synthesizer.mjs`             | The synthesizer script                        |
| `system/persona-batch-synthesis/synthesis-{date}.md` | Human-readable batch report (output)          |
| `system/persona-batch-synthesis/build-{category}.md` | Consolidated build plan per category (output) |
| `system/persona-batch-synthesis/saturation.json`     | Machine-readable aggregation data (output)    |

## Files read (do not modify)

| File                                     | Why                                                     |
| ---------------------------------------- | ------------------------------------------------------- |
| `docs/stress-tests/persona-*.md`         | All gap reports - the input                             |
| `system/persona-build-plans/*/task-*.md` | Existing build tasks - referenced in consolidated plans |
| `docs/specs/persona-quality-standard.md` | Category definitions reference                          |

## Files modified

| File           | Change                                                        |
| -------------- | ------------------------------------------------------------- |
| `package.json` | Add npm scripts: `personas:synthesize`, `personas:saturation` |

## Testing

1. `node devtools/persona-batch-synthesizer.mjs --dry-run` should parse all 6 existing gap reports and print aggregation to stdout
2. `node devtools/persona-batch-synthesizer.mjs` should create files in `system/persona-batch-synthesis/`
3. Saturation should show NOT saturated with only 6 personas
4. Priority ranking should put the most frequently seen HIGH-severity categories first
5. Each `build-{category}.md` should reference the correct persona sources

## DO NOT

- Use any cloud API. Ollama only (and only when --use-llm flag is passed).
- Modify any existing gap reports or build task files.
- Touch the Next.js app, React components, or database.
- Add any npm dependencies.
- Invent categories not in the predefined list. Use 'uncategorized' for anything that doesn't match.
- Use Sonnet for any Agent tool calls (use `model: "haiku"` or `model: "opus"`).
