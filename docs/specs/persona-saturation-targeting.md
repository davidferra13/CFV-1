# Build Spec: Saturation-Driven Persona Targeting

> Codex task. Modify ONE existing file + create ONE new file.

## What This Does

Right now `persona-generator.mjs` generates random personas. The saturation data in `system/persona-batch-synthesis/saturation.json` shows which persona types and gap categories are well-covered vs starved. This task connects them: a new script reads saturation data and tells the generator what to produce.

## Files

1. **CREATE** `devtools/persona-targeting.mjs` - reads saturation.json, computes targeting recommendations, optionally spawns generator with constraints
2. **MODIFY** `devtools/persona-generator.mjs` - add a `--target-categories` CLI flag that biases generation toward specific gap categories

## Part 1: persona-targeting.mjs (NEW FILE)

### CLI Interface

```
node devtools/persona-targeting.mjs                    # print recommendations
node devtools/persona-targeting.mjs --execute          # print recs AND spawn generator
node devtools/persona-targeting.mjs --execute --count 3  # generate 3 targeted personas
```

### Algorithm

1. Read `system/persona-batch-synthesis/saturation.json`
2. Read persona type coverage from `Chef Flow Personas/Completed/` - count files per type subfolder (Chef, Client, Guest, Vendor, Staff, Partner, Public)
3. Compute type coverage percentages: `type_count / total_completed * 100`
4. Identify STARVED types: any type with < 15% of total completed personas
5. From `saturation.json` -> `priority_ranking`, take the top 5 categories by `priority_score`
6. From `saturation.json` -> `saturation` -> `new_categories_by_persona`, identify which recent personas contributed zero new categories (saturated personas)
7. Cross-reference: for starved types, pick the top-priority gap categories that have low persona count

### Output Format (stdout)

```
=== Persona Pipeline Targeting Report ===

Type Coverage:
  Chef:    14/19 (74%) [SATURATED]
  Client:   2/19 (11%) [STARVED]
  Guest:    1/19  (5%) [STARVED]
  Vendor:   1/19  (5%) [STARVED]
  Staff:    1/19  (5%) [STARVED]
  Partner:  0/19  (0%) [STARVED]
  Public:   0/19  (0%) [STARVED]

Top Priority Gap Categories (underserved):
  1. recipe-menu (score: 29, 7 personas)
  2. reporting-analytics (score: 27, 8 personas)
  3. payment-financial (score: 26, 11 personas)

Recommendation:
  Generate 3 personas of types: Client, Guest, Vendor
  Focus categories: recipe-menu, reporting-analytics, payment-financial
  Rationale: Chef type saturated at 74%. Client/Guest/Vendor have <15% coverage.

Command:
  node devtools/persona-generator.mjs --type Client --count 1 --target-categories recipe-menu,payment-financial
  node devtools/persona-generator.mjs --type Guest --count 1 --target-categories dietary-medical,onboarding-ux
  node devtools/persona-generator.mjs --type Vendor --count 1 --target-categories sourcing-supply,payment-financial
```

When `--execute` is passed, spawn each recommended generator command as a child process (sequentially, not parallel). Print each command before running it.

### Implementation Rules

1. Use only Node.js built-in modules: `fs`, `path`, `child_process`, `url`
2. ROOT is resolved from `__dirname` up one level
3. Read completed persona counts by scanning `Chef Flow Personas/Completed/{Type}/` directories. Count `.txt` and `.md` files only.
4. If a type directory doesn't exist, count is 0
5. STARVED threshold: < 15% of total
6. SATURATED threshold: > 50% of total
7. When `--execute` is passed, use `spawnSync('node', ['devtools/persona-generator.mjs', ...args], { stdio: 'inherit', cwd: ROOT })`. Run commands one at a time.
8. If saturation.json doesn't exist, print "No saturation data. Run: node devtools/persona-batch-synthesizer.mjs" and exit 1
9. Use `#!/usr/bin/env node` shebang

## Part 2: Modify persona-generator.mjs

### What To Change

Add a new CLI flag `--target-categories` that accepts a comma-separated list of gap category IDs (from the 20 categories defined in `persona-batch-synthesizer.mjs`).

### WHERE to add the flag parsing

In the `parseArgs` function (around line 230-270 of persona-generator.mjs), add:

```js
} else if (argv[i] === '--target-categories' && argv[i + 1]) {
  opts.targetCategories = argv[++i].split(',').map(s => s.trim());
}
```

Initialize `opts.targetCategories` to `null` in the options object at the top of parseArgs.

### WHERE to use it

In the `generatePrompt` function (search for `function generatePrompt`), the function builds a prompt string that gets sent to Ollama. Find the line where `constraints` is interpolated into the prompt. APPEND to the constraints string (do not replace it):

```js
if (opts.targetCategories && opts.targetCategories.length > 0) {
  const categoryDescriptions = {
    'event-lifecycle': 'event lifecycle management, ephemeral events, pop-ups',
    'access-control': 'access control, invite-only, waitlists, tiered permissions',
    'ticketing-drops': 'ticketing, controlled releases, demand management',
    'audience-community': 'audience tracking, repeat guests, community curation',
    'location-venue': 'location adaptation, venue constraints, mobile setups',
    'payment-financial': 'payment workflows, billing, pricing, deposits, invoices',
    'compliance-legal': 'compliance, legal, regulation, audit trails, licensing',
    'dosing-cannabis': 'cannabis dosing, THC/CBD precision, compliance',
    'dietary-medical': 'dietary restrictions, allergies, medical constraints',
    'recipe-menu': 'recipe management, menu building, ingredient tracking, prep',
    'scheduling-calendar': 'scheduling, calendar, booking, availability, conflicts',
    communication: 'client communication, notifications, messaging',
    'staffing-team': 'staff management, team coordination, delegation',
    'sourcing-supply': 'sourcing, suppliers, procurement, farm relationships',
    'costing-margin': 'food cost, margins, per-head costing, waste tracking',
    'reporting-analytics': 'reporting, analytics, dashboards, performance metrics',
    'onboarding-ux': 'onboarding, first-time experience, learning curve',
    'scaling-multi': 'scaling, multi-location, growth, franchise',
    'delivery-logistics': 'delivery, logistics, transport, packaging',
    'documentation-records': 'documentation, records, archives, audit trails',
  }

  const targetDescs = opts.targetCategories.map((id) => categoryDescriptions[id] || id).join('; ')

  constraints += `. IMPORTANT: This persona MUST have strong operational needs in these areas: ${targetDescs}. Design their business reality so these categories are central pain points.`
}
```

### IMPORTANT: Where NOT to touch

- Do NOT modify the SEED_CATEGORIES object
- Do NOT modify the validatePersonaContent import or call
- Do NOT modify the vaultStore import or call
- Do NOT modify any existing CLI flags or their behavior
- Do NOT change the file's existing imports
- Do NOT change the output file naming or directory structure

### Testing

After implementation:

```
node devtools/persona-targeting.mjs
node devtools/persona-generator.mjs --type Client --count 1 --target-categories recipe-menu,payment-financial --dry-run
```

The dry-run should show the generated persona text includes operational needs around recipe/menu and payment/financial workflows.

## Do NOT

- Add npm dependencies
- Modify any file other than `devtools/persona-generator.mjs`
- Change existing behavior of persona-generator.mjs when `--target-categories` is not passed
- Import from persona-pipeline-core.mjs in the new targeting script (keep it self-contained)
