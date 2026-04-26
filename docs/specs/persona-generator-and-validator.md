# Build Spec: Persona Generator + Validator

> Two scripts. Validator checks persona quality. Generator creates personas via Ollama.
> Generator calls validator before saving. Both integrate into existing pipeline.

## Context

The persona pipeline v2 exists and works:

- `devtools/persona-analyzer.mjs` - analyzes persona against codebase, outputs gap report
- `devtools/persona-planner.mjs` - turns gap report into build tasks
- `devtools/persona-orchestrator.mjs` - chains analyzer + planner, manages state
- `devtools/persona-inbox-server.mjs` - web UI at :3977, paste personas, triggers pipeline
- Personas live in `Chef Flow Personas/Uncompleted/{Type}/` (pending) and `Chef Flow Personas/Completed/{Type}/` (done)
- Gap reports go to `docs/stress-tests/persona-{slug}-{date}.md`
- Build tasks go to `system/persona-build-plans/{slug}/task-{n}.md`

What's missing: auto-generation of personas and quality validation before they enter the pipeline.

## Quality Standard

Read `docs/specs/persona-quality-standard.md` FIRST. It defines:

- 6 required sections every persona must have
- PASS/FAIL criteria
- Celebrity seed strategy
- Validator behavior rules

That document is the source of truth. This spec implements it.

---

## Build 1: `devtools/persona-validator.mjs`

### Purpose

Standalone CLI that validates a persona file against the quality standard. Returns pass/fail with reasons. Can be imported as a module by other scripts.

### Interface

```bash
# Validate a single file
node devtools/persona-validator.mjs "Chef Flow Personas/Uncompleted/Chef/gordon-ramsay.txt"

# Validate all pending personas
node devtools/persona-validator.mjs --all

# Output JSON instead of human-readable
node devtools/persona-validator.mjs --json "path/to/persona.txt"
```

### Validation checks (in order)

1. **Section presence**: All 6 required sections must exist:
   - Identity Header (line matching `**Chef Profile:` or `**Client Profile:` etc.)
   - Business Reality (contains specific numbers: digits followed by "clients", "events", "$", "employees", "locations", etc.)
   - Primary Failure (section with "failure" or "problem" in heading)
   - Structural Issues (minimum 3 sub-sections after primary failure)
   - Psychological Model (section about how they think/decide)
   - Pass/Fail Conditions (minimum 5 testable conditions)

2. **Specificity check**: Business Reality must contain at least 3 concrete numbers (regex: `\b\d+\b` near business terms)

3. **Depth check**: Total word count >= 500. Personas under 500 words lack the detail needed for meaningful analysis.

4. **Contradiction scan (best-effort)**: Flag obvious contradictions using simple heuristics:
   - "solo" + "team management" in same persona
   - "no clients" + specific client count
   - This is NOT an LLM call. Simple keyword co-occurrence only. False positives are OK (flag, don't reject).

5. **Duplication check**: Compare persona name against `Chef Flow Personas/Completed/` and existing gap reports in `docs/stress-tests/`. If name matches an existing persona (fuzzy: lowercase, strip punctuation, Levenshtein <= 3), flag as potential duplicate.

### Output format

```json
{
  "file": "path/to/persona.txt",
  "valid": true,
  "score": 85,
  "name": "Gordon Ramsay",
  "type": "Chef",
  "word_count": 1240,
  "sections_found": [
    "identity",
    "business_reality",
    "primary_failure",
    "structural_issues",
    "psychological_model",
    "pass_fail"
  ],
  "sections_missing": [],
  "numbers_found": 7,
  "structural_issues_count": 5,
  "pass_fail_conditions_count": 7,
  "flags": ["Possible duplicate: existing persona 'gordon-ramsay-multi-unit'"],
  "rejection_reasons": []
}
```

`score` is simple: 100 base, -20 per missing section, -10 if fewer than 3 numbers, -10 if fewer than 3 structural issues, -10 if fewer than 5 pass/fail conditions, -5 per flag.

### On rejection

If `valid: false` (score < 40 OR any required section missing):

- Move file to `Chef Flow Personas/Failed/{Type}/`
- Append rejection reasons as a comment block at the bottom of the file

### Export as module

The validation function must be importable:

```js
import { validatePersona } from './persona-validator.mjs'
const result = validatePersona(filePath)
// or
const result = validatePersonaContent(text, { name: 'optional', type: 'Chef' })
```

### npm script

```json
"personas:validate": "node devtools/persona-validator.mjs --all"
```

---

## Build 2: `devtools/persona-generator.mjs`

### Purpose

Generates persona files using Ollama from seed categories. Validates each one. Saves valid personas to `Chef Flow Personas/Uncompleted/{Type}/`. Rejects invalid ones.

### Interface

```bash
# Generate 1 random persona
node devtools/persona-generator.mjs

# Generate 5 personas
node devtools/persona-generator.mjs --count 5

# Generate from a specific category
node devtools/persona-generator.mjs --category "farm-to-table"

# Generate based on a celebrity seed
node devtools/persona-generator.mjs --seed "Gordon Ramsay"

# Generate 50 personas across all categories
node devtools/persona-generator.mjs --count 50 --spread

# Use specific model
node devtools/persona-generator.mjs --model hermes3:8b

# Dry run (generate + validate but don't save)
node devtools/persona-generator.mjs --dry-run
```

### Seed categories (hardcoded)

These categories are the generation pool. Each has example seeds and constraints:

```js
const SEED_CATEGORIES = [
  {
    id: 'multi-unit-empire',
    label: 'Multi-Unit Restaurant Empire',
    seeds: ['Gordon Ramsay', 'Jose Andres', 'Danny Meyer', 'David Chang'],
    constraints: 'Multiple locations, delegation, brand management, high revenue, large teams',
  },
  {
    id: 'farm-to-table',
    label: 'Farm-to-Table Purist',
    seeds: ['Alice Waters', 'Dan Barber', 'Sean Brock'],
    constraints: 'Sourcing obsession, seasonal menus, supplier relationships, small-medium scale',
  },
  {
    id: 'street-food-truck',
    label: 'Street Food / Food Truck',
    seeds: ['Roy Choi', 'Aaron Sanchez'],
    constraints: 'High volume, low margin, mobile, weather-dependent, cash-heavy, permit chaos',
  },
  {
    id: 'private-personal-chef',
    label: 'Private / Personal Chef',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Solo or tiny team, 2-8 clients, retainer model, discretion, dietary management, travel',
  },
  {
    id: 'catering-operator',
    label: 'Catering Company',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Large events 50-500 guests, staffing, logistics, costing per head, seasonal demand',
  },
  {
    id: 'culinary-educator',
    label: 'Culinary Educator / School',
    seeds: ['Jacques Pepin', 'Samin Nosrat', 'Thomas Keller'],
    constraints:
      'Curriculum, student tracking, recipe documentation, technique library, scheduling classes',
  },
  {
    id: 'cannabis-culinary',
    label: 'Cannabis Culinary',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Compliance, dosing precision, guest safety, documentation, legal variation by state',
  },
  {
    id: 'meal-prep-subscription',
    label: 'Meal Prep / Subscription Service',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Batch production, delivery logistics, recurring clients, nutritional tracking, packaging',
  },
  {
    id: 'popup-supper-club',
    label: 'Pop-Up / Supper Club',
    seeds: ['fictional - generate realistic'],
    constraints: 'Ephemeral events, waitlists, venue scouting, one-night menus, controlled access',
  },
  {
    id: 'medical-dietary',
    label: 'Medical / Dietary Specialist',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Health conditions, doctor coordination, allergen enforcement, liability, documentation',
  },
  {
    id: 'pastry-bakery',
    label: 'Pastry Chef / Bakery',
    seeds: ['Dominique Ansel', 'Christina Tosi'],
    constraints:
      'Production scheduling, perishability, retail + wholesale, recipe precision, seasonal items',
  },
  {
    id: 'institutional-relief',
    label: 'Institutional / Disaster Relief',
    seeds: ['Jose Andres (WCK)', 'school lunch programs'],
    constraints:
      'Massive scale, nutrition requirements, cost constraints, regulatory compliance, volunteers',
  },
  {
    id: 'celebrity-media',
    label: 'Celebrity Chef / Media Personality',
    seeds: ['Guy Fieri', 'Ina Garten', 'Alton Brown'],
    constraints:
      'Brand management, content production, licensing, restaurant oversight from distance',
  },
  {
    id: 'ghost-kitchen',
    label: 'Ghost Kitchen / Virtual Brand',
    seeds: ['fictional - generate realistic'],
    constraints:
      'No dining room, delivery-only, multiple brands from one kitchen, data-driven menu optimization',
  },
  {
    id: 'hotel-resort',
    label: 'Hotel / Resort Executive Chef',
    seeds: ['fictional - generate realistic'],
    constraints:
      'Multiple outlets, banquets, room service, cost control, large brigade, seasonal tourism',
  },
  {
    id: 'food-scientist',
    label: 'Food Scientist / R&D Chef',
    seeds: ['Nathan Myhrvold', 'Heston Blumenthal'],
    constraints:
      'Experimentation, documentation, equipment tracking, ingredient science, long development cycles',
  },
]
```

### Generation prompt

The prompt sent to Ollama must:

1. Include the full persona template from the quality standard (all 6 sections)
2. Include the specific seed/category being used
3. Instruct: "Write in first person. Use specific numbers. Describe real workarounds. Minimum 3 structural issues. Minimum 5 testable pass/fail conditions."
4. Instruct: "Do NOT write generic pain points. Every gap must be specific to this person's business model."
5. Instruct: "If based on a real person, use their actual business model, cuisine, philosophy, and scale as the foundation. Adapt to operational reality, not media personality."

### Generation flow

```
1. Pick category (random if --spread, specified if --category)
2. Pick seed from category (random)
3. Build prompt with template + seed + constraints
4. Call Ollama (streaming, token counter on stderr)
5. Validate output with persona-validator
6. If valid: save to Chef Flow Personas/Uncompleted/{Type}/{slug}.txt
7. If invalid: retry ONCE with temperature 0.1 and explicit fix instructions
8. If still invalid: save to Chef Flow Personas/Failed/ with rejection reason
9. Log result to stderr
10. If --count > 1: repeat from step 1
```

### Deduplication

Before generating, read all existing persona names from:

- `Chef Flow Personas/Completed/`
- `Chef Flow Personas/Uncompleted/`
- `Chef Flow Personas/Failed/`

If the seed name matches an existing persona (case-insensitive), pick a different seed or add a variation modifier ("Gordon Ramsay's early career food truck days" vs "Gordon Ramsay").

### Model selection

Default: `hermes3:8b` (needs reasoning to write good personas). Override with `--model` or `PERSONA_GENERATOR_MODEL` env var.

Do NOT use qwen3:4b for generation. It follows templates but lacks the creativity to write diverse, grounded personas.

### npm scripts

```json
"personas:generate": "node devtools/persona-generator.mjs",
"personas:generate:batch": "node devtools/persona-generator.mjs --count 10 --spread"
```

---

## Build 3: Wire validator into orchestrator

Modify `devtools/persona-orchestrator.mjs`:

1. Import `validatePersona` from `persona-validator.mjs`
2. Before calling the analyzer, validate the persona file
3. If invalid: skip analysis, move to Failed/, log reason, continue to next
4. If valid: proceed with existing analyze → plan flow

This is a small change (~15 lines). The orchestrator already handles skipping files.

---

## Files created

| File                             | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `devtools/persona-validator.mjs` | Standalone validator, also importable as module |
| `devtools/persona-generator.mjs` | Generates personas from seeds via Ollama        |

## Files modified

| File                                | Change                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `devtools/persona-orchestrator.mjs` | Import validator, add pre-analysis validation step                                   |
| `package.json`                      | Add npm scripts: `personas:validate`, `personas:generate`, `personas:generate:batch` |

## Files read (do not modify, use as reference)

| File                                                                                 | Why                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `docs/specs/persona-quality-standard.md`                                             | Source of truth for validation rules and template |
| `devtools/persona-analyzer.mjs`                                                      | Understand existing pipeline interface            |
| `devtools/persona-planner.mjs`                                                       | Understand existing pipeline interface            |
| `devtools/persona-orchestrator.mjs`                                                  | Understand where to wire in validator             |
| `Chef Flow Personas/Completed/Chef/Kai Donovan.txt`                                  | Example of a good persona                         |
| `Chef Flow Personas/Completed/Chef/jordan-hale-cannabis-culinary-director-multi.txt` | Example of a good persona                         |

## Testing

1. `node devtools/persona-validator.mjs "Chef Flow Personas/Completed/Chef/Kai Donovan.txt"` should PASS
2. Create a deliberately bad persona (50 words, no sections), validator should FAIL it
3. `node devtools/persona-generator.mjs --dry-run --seed "Alice Waters"` should produce a valid persona and print it
4. `node devtools/persona-generator.mjs --count 2 --spread` should save 2 valid personas to Uncompleted/
5. `node devtools/persona-orchestrator.mjs --once --dry-run` should show the new personas in queue

## DO NOT

- Use any cloud API. Ollama only.
- Modify the analyzer or planner scripts.
- Change the gap report format.
- Add any npm dependencies.
- Create React components or touch the Next.js app.
- Use Sonnet for any Agent tool calls (use `model: "haiku"` or `model: "opus"`).
