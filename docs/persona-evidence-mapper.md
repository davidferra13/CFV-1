# Persona Evidence Mapper

`devtools/persona-evidence-mapper.mjs` connects compiled persona requirements
to actual ChefFlow code evidence.

It is the bridge between synthetic training data and build execution:

1. Generate or import personas.
2. Compile them into requirement specs and workflow DSL.
3. Map every requirement to implementation evidence.
4. Turn missing or partial requirements into scoped build tasks.

The mapper is static. It does not run app flows, mutate data, call AI, or touch
the database.

## Commands

List compiled eval reports:

```bash
npm run personas:map-evidence -- --list-compiled
```

Map the latest compiled eval report to stdout:

```bash
npm run personas:map-evidence
```

Map the latest 10 compiled eval reports and write a JSON artifact:

```bash
npm run personas:map-evidence -- --latest 10 --write
```

Map a specific compiled eval report:

```bash
npm run personas:map-evidence -- --compiled reports/persona-eval-case-compiler/persona-eval-cases-example.json
```

Write missing and partial requirements as build queue tasks:

```bash
npm run personas:map-evidence -- --write --write-build-queue --max-build-tasks 25
```

Use a custom output path:

```bash
npm run personas:map-evidence -- --write --out reports/persona-evidence-mapper/latest.json
```

## Inputs

The mapper consumes JSON artifacts from `persona-eval-case-compiler`, especially
the `requirement_specs` array.

Each requirement can include:

- `statement`
- `domain`
- `feature_area`
- `type`
- `priority`
- `quality_score`
- `test_export.route_hint`
- `data_contract`
- `source.edge_case_ids`

## Output

The output schema is:

```text
chefflow.persona_evidence_map.v1
```

Each requirement receives:

- `status`: `covered`, `partial`, or `missing`
- `confidence`: static confidence score from 0 to 100
- `route`: route hint and discovered app route files
- `evidence`: matching implementation files with token hits
- `tests`: matching test files
- `data_contract`: checks for cents, ledger, actor ID, tenant scope, and timestamps
- `missing`: concrete missing pieces
- `recommended_files`: likely files for follow-up implementation

## Build Queue

With `--write-build-queue`, the mapper writes markdown tasks to
`system/codex-build-queue/` by default. This is optional because the queue may
already contain work from other agents.

The generated tasks are designed to be additive:

- implement the requirement without duplicating existing logic
- preserve auth and tenant scoping
- use cents for money fields
- add or update focused tests
- re-run the evidence mapper after implementation

## Notes

This tool is intentionally conservative. Static evidence is not proof that a
workflow is correct, and missing evidence is not proof that the app lacks the
feature. It is a prioritization layer that finds the highest-value gaps for
human or agent review.
