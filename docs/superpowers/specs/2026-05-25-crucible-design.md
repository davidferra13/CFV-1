# The Crucible: Adversarial Post-Build Evaluator

> **Status:** approved
> **Priority:** P1
> **Created:** 2026-05-25
> **Revised:** 2026-05-25 (added complexity gate, lens floors, fix cap, persistence, measurable L4)
> **Approach:** Adversarial Opus agent, auto-fires after builds, full product vision evaluation

---

## Problem

ChefFlow has serious evaluation infrastructure (Definition of Done, Failure Rubric, Interface Philosophy, VIF QA Rubric, regression firewall, wire-audit). But no single system synthesizes all of them into an adversarial "is this actually good enough?" verdict. Builds pass mechanical checks but may still fall short of product potential. There is no strict co-developer who grades the work.

## Solution

An Opus-tier adversarial agent called "The Crucible" that fires after build completion (gated by complexity). It assumes the build is insufficient until proven otherwise. It grades against the full product vision. It fixes what it can (once). It queues what it can't.

---

## Identity

**Name:** `/crucible`

**Behavior:** Direct verdicts. Exact fixes. No praise, no hedging. When something passes, it says nothing. When something fails, it says exactly what's wrong and exactly how to fix it.

---

## Complexity Gate

Not every build warrants full Opus evaluation. Crucible triages before evaluating.

### Skip (no evaluation)

- Config-only changes (`.env`, `tsconfig`, `eslint`, `tailwind.config`)
- Documentation-only changes (`docs/`, `*.md`, `CLAUDE.md`)
- Test-only changes (`tests/`, `*.test.*`, `*.spec.*`)
- Asset-only changes (images, fonts, static files)

### Lightweight Mode (single-lens fast check)

- Style-only changes (CSS, Tailwind classes, layout tweaks with no logic changes)
- Single-file fixes under 30 lines touching one component
- Lightweight mode runs only the most relevant lens (usually L3: Interface Philosophy or L5: Zero Hallucination) and reports pass/flag without a composite grade

### Full Evaluation

- Any route `page.tsx` or `layout.tsx` change
- Server action changes (`'use server'` files)
- Multi-file changes spanning 2+ domains
- Any lib/ module change touching business logic
- Intelligence layer changes (PIE, CIL, Rail, Remy, Dinner Circles)
- Manual invocation always runs full

---

## Evaluation Framework

Five lenses, each scored independently. Final grade = weighted composite with floor rules.

### Lens 1: Definition of Done (25%)

Source: `docs/definition-of-done.md`

- Is the feature verified, honest, and resilient against drift?
- Can a real user complete the full flow start to finish?
- Every button does what it says? Every success state backed by real confirmation?
- Empty, loading, error states treated as first-class?
- At least one automated check catches future drift?
- Proof of real execution in the app?

### Lens 2: Void / Island / Facade (25%)

Source: `docs/specs/failure-rubric.md`, `docs/specs/void-island-facade-qa-rubric.md`

- **Void:** User takes an action with no visible proof anything happened?
- **Island:** Data exists but disconnected from where decisions happen?
- **Facade:** Surface promises something it doesn't deliver?
- Evaluated against the relevant product mirror domain (CRM, Events, Recipes, Finance, Proposals, Kitchen Ops, Inventory, Staff, Marketing, Pipeline, Calendar, Guests)

### Lens 3: Interface Philosophy Compliance (20%)

Source: `docs/specs/universal-interface-philosophy.md`, `docs/specs/surface-grammar-governance.md`

- Surface mode declared? Shell budget correct?
- Max 1 primary button per screen?
- Max 7 items per group? Max 2 hero metrics?
- All 5 data states handled (Empty, Loading, Loaded, Error, Partial)?
- No banned anti-patterns (cluttered dashboards, vanity metrics, competing CTAs, hidden critical actions, empty feature shells)?
- Vanity metric test: "What decision would I make differently based on this number?"
- Notepad test: routine data entry under 10 seconds?
- Responsive verified at 375px, 768px, 1024px, 1440px?

### Lens 4: Integration Completeness (20%)

Source: `docs/product-blueprint.md`, `scripts/wiring-audit-results.json`

This lens measures whether the build connects to the systems it should, not subjective "would a chef like it" opinions.

- Does this build connect to existing intelligence layers (PIE, CIL, Rail, Remy, Dinner Circles) where the domain requires it?
- Are relevant Rail actions wired for the affected route?
- Does the data flow end-to-end (creation -> storage -> display -> decision surface)?
- If this feature mirrors a product blueprint pillar, does it advance that pillar's completion criteria?
- Is there an orphan: new data written but never surfaced, or new UI reading data that's never populated?

**Advisory note (unscored):** Crucible may append a brief product-quality observation ("this flow requires 4 clicks where 2 would suffice") but this does not affect the score. Product judgment belongs to the developer.

### Lens 5: Zero Hallucination (10%)

Source: CLAUDE.md Zero Hallucination Rule

- No optimistic updates without try/catch + rollback
- Failed loads show errors, not $0.00 or empty arrays
- No no-op buttons rendered as functional
- Cache invalidation correct (revalidateTag not just revalidatePath)
- No `return { success: true }` on no-ops

---

## Grading Rules

### Scale

| Grade | Score  | Meaning                                                                |
| ----- | ------ | ---------------------------------------------------------------------- |
| **A** | 90-100 | Exceeds standards. Ship it.                                            |
| **B** | 80-89  | Meets standards. Minor polish items noted but not blocking.            |
| **C** | 70-79  | Below bar. Specific gaps identified. Crucible auto-fixes what it can.  |
| **D** | 50-69  | Significant gaps. Multiple fixes needed. Blocks "done" status.         |
| **F** | <50    | Fundamental problems. Likely Facade or Void failure. Rebuild required. |

### Lens Floor Rules (Override Composite)

These prevent a catastrophic failure in one lens from being averaged away:

- **Any lens below 50** = automatic **F** regardless of composite
- **Any lens below 70** = grade capped at **C** regardless of composite
- **Lens 2 (VIF) below 60** = automatic **F** (Facade/Void failures are product-breaking)

The composite score is still reported for trend tracking, but the final grade applies floors first.

---

## Runtime Flow

### Step 1: Complexity Triage

- Read `git diff` of the build (staged + unstaged changes)
- Classify: Skip / Lightweight / Full (see Complexity Gate above)
- If Skip: exit with `CRUCIBLE: SKIP (config/docs/test only)`
- If Lightweight: run single relevant lens, report pass/flag, exit

### Step 2: Detect What Changed (Full mode only)

- Identify affected routes, components, server actions, lib modules
- Map each changed file to its product mirror domain
- Load the relevant spec if one exists in `docs/specs/`

### Step 3: Load Evaluation Context

Based on what changed, load only relevant documents:

- **Always:** Definition of Done, Failure Rubric, Interface Philosophy
- **If route changed:** relevant page x-ray from `docs/xrays/pages/`
- **If domain touched:** that domain's failure rubric section + product blueprint pillar
- **If UI changed:** surface grammar governance
- **If server action changed:** server action quality checklist from CLAUDE.md
- **If intelligence touched (PIE/CIL/Rail/Remy):** relevant integration spec

### Step 4: Adversarial Evaluation

The Crucible agent evaluates each lens. Not mechanical checkbox. Hard questions:

- "A chef sees this page. Do they know what to do next, or do they have to think?"
- "If the backend fails right now, what does the user see? Is that honest?"
- "This data exists. Is it surfaced where the decision happens, or is it an Island?"
- "What would make this feature embarrassingly wrong in front of a customer?"

### Step 5: Verdict

Structured output:

```
CRUCIBLE VERDICT: [Grade] (composite: [0-100], floor-adjusted: [yes/no])
Scores: L1: xx | L2: xx | L3: xx | L4: xx | L5: xx
Mode: [full/lightweight]

FAILURES (if any):
- [Lens]: [What failed] -> [Exact fix]

ADVISORY (unscored):
- [Product observation, if any]

FIXES APPLIED (if fix pass ran):
- [file:line] [what was fixed]

QUEUED (needs human decision):
- [description] -> [why Crucible can't decide this alone]
```

### Step 6: Single Fix Pass (Grade C or below only)

**One pass. No loops.**

- Fix mechanical issues only: missing error states, unhandled loading states, missing cursor-pointer, cache invalidation bugs, missing data state handling
- Commit fixes with `fix(crucible): [description]`
- Re-evaluate once to get updated scores
- If still below B after one fix pass: report remaining gaps. Do not fix again.
- Product decisions (new UI layout, feature scope, data model changes) get queued, never guessed at

### Step 7: Gate

- Grade B or above = build passes, move on
- Below B after fix pass = blocks "done" status, remaining gaps reported

---

## Persistence

Crucible writes every verdict to `docs/crucible/` for historical tracking.

### Verdict Log

File: `docs/crucible/verdicts.jsonl` (append-only)

Each line:

```json
{
  "date": "2026-05-25T14:30:00Z",
  "grade": "B",
  "composite": 84,
  "floors_applied": false,
  "scores": { "L1": 85, "L2": 90, "L3": 80, "L4": 78, "L5": 95 },
  "mode": "full",
  "files_changed": 7,
  "domains": ["events", "recipes"],
  "fixes_applied": 0
}
```

### Trend Query

`/crucible --trend` reads the verdict log and reports:

- Last 10 verdicts with grades
- Average composite over last 30 days
- Domains with recurring low scores (pattern detection)
- Whether overall trajectory is improving or declining

---

## Integration

### Trigger Point

Fires after the existing closeout chain:

```
regression:firewall -> wire-audit -> crucible
```

Firewall catches mechanical breakage. Wire-audit catches missing integrations. Crucible catches "built but not good enough."

If firewall or wire-audit fails, Crucible does not run.

**Trigger mechanism:** No new hook. The CLAUDE.md closeout instructions tell Claude to run `/crucible` as step 3 of the required closeout sequence. Same mechanism as wire-audit today: Claude reads the instructions and invokes the skill as part of post-build protocol.

### Skill Definition

Claude Code skill: `/crucible`

- Auto-triggered by post-build closeout flow (subject to complexity gate)
- Also manually invocable anytime (manual = always full mode)

### Manual Invocation

- `/crucible` - evaluate current build (git diff)
- `/crucible /app/events` - evaluate a specific route deeply
- `/crucible --full` - evaluate entire product against all 12 mirror domains
- `/crucible --trend` - show verdict history and trajectory

### Agent Configuration

- **Model:** Opus (non-negotiable; requires judgment)
- **Isolation:** Runs as subagent, doesn't pollute main session context
- **Read-only first pass:** Evaluates without editing. Fix mode only if grade < B
- **Context budget:** Evaluation docs + changed files only. Never the whole codebase.
- **Fix cap:** One fix pass maximum. No recursive evaluation loops.

### Relationship to Existing Tools

| Tool                  | Purpose                  | Crucible Relationship                                             |
| --------------------- | ------------------------ | ----------------------------------------------------------------- |
| `regression:firewall` | Mechanical checks        | Prerequisite. Crucible runs after.                                |
| `/wire-audit`         | Integration wiring       | Prerequisite. Crucible consumes wiring data as L4 input.          |
| `/page-xray`          | Route developer notes    | Crucible reads as input context.                                  |
| `/review`             | Code review              | Complementary. Review = code quality. Crucible = product quality. |
| `/qa`                 | Test execution           | Complementary. QA = tests pass. Crucible = product passes.        |
| VIF QA Rubric         | Build closeout checklist | Subsumed into L2. Crucible scores it.                             |

### CLAUDE.md Changes

Add to post-build closeout chain:

```
Required closeout:
1. Run `npm run regression:firewall`
2. Run `/wire-audit`
3. Run `/crucible`
4. Grade B required to mark done
```

---

## What Crucible Is NOT

- Not a code linter (that's typecheck/eslint)
- Not a test runner (that's the test suite)
- Not a wiring checker (that's wire-audit; Crucible consumes its output)
- Not a code reviewer (that's /review)
- Not a product manager (advisory notes are unscored; product judgment belongs to the developer)

It is the product-level adversarial evaluator that asks: "Is this actually good enough to put in front of a chef who's trusting this app to run their business?"
