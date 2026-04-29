# Persona Eval Case Compiler

`devtools/persona-eval-case-compiler.mjs` turns persona corpus factory reports
into machine-readable product evaluation assets.

It does not generate personas. It consumes existing corpus reports from
`reports/persona-corpus-factory/` and compiles the next layer:

- coverage gaps by domain and edge case
- requirement specs with acceptance criteria and data contracts
- workflow DSL scripts with actors, initial state, steps, failure paths, and coverage tags
- review queue states (`gold`, `useful`, `duplicate_requirement`, `too_generic`)
- golden persona candidates
- mutation backlog
- negative prompt bank
- next generation commands aimed at uncovered areas

## Commands

List available corpus reports:

```bash
npm run personas:compile-evals -- --list-reports
```

Compile all reports to stdout:

```bash
npm run personas:compile-evals
```

Compile the latest 10 reports and write a JSON artifact:

```bash
npm run personas:compile-evals -- --latest 10 --write
```

Use a custom target file:

```bash
npm run personas:compile-evals -- --target-file system/persona-corpus-targets.json --write
```

## Inputs

The compiler expects JSON reports from `persona-corpus-factory`, especially:

- `accepted`
- `requirements`
- `edge_coverage`
- `scenario_packs`
- `mutation_plans`
- `build_gap_ranking`

If no corpus reports exist yet, the compiler still emits an empty but valid
artifact with target gaps and next commands.

## Target File

Optional target file shape:

```json
{
  "minimumAcceptedPerDomain": 25,
  "minimumRequirementsPerDomain": 30,
  "minimumAcceptedPerEdgeCase": 3,
  "minimumGoldenCandidates": 100,
  "priorityDomains": ["dinner-circles", "pricing-checkout"],
  "domainTargets": {
    "pricing-checkout": { "accepted": 100, "requirements": 150 }
  },
  "edgeTargets": {
    "global.the-primary-decision-maker-is-not-the-payer-and-the-payer-refuses-extra-steps": 10
  }
}
```

## Output Schemas

Requirement specs use:

```text
chefflow.requirement_spec.v1
```

Workflow DSL scripts use:

```text
chefflow.workflow_dsl.v1
```

These are not executable Playwright tests yet. They are structured fixtures that
can be turned into test specs, build prompts, or manual QA scripts.
