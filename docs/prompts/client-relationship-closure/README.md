# Client Relationship Closure Agent Plan

## Build Order

This work has one hard dependency: the database contract needs developer approval before code can rely on it.

## Wait First

1. `docs/specs/build-client-relationship-closure-data-contract.md`

Run this first. It asks for SQL approval before creating a migration. Do not run any dependent implementation agent until this is approved and landed.

## Parallel After Data Contract Lands

These can run in parallel after the data contract and migration are landed:

1. `docs/specs/build-client-relationship-closure-server-actions.md`
2. `docs/specs/build-client-relationship-closure-communications.md`

The server-actions agent owns closure actions and enforcement helpers. The communications agent owns templates and explicit-send behavior. They must avoid editing each other's files except for a tiny integration point in `relationship-closure-actions.ts`.

## Parallel After Server Actions Land

These can run in parallel after server actions land:

1. `docs/specs/build-client-relationship-closure-ui.md`
2. `docs/specs/build-client-relationship-closure-guards-and-tests.md`

The UI agent owns client detail and table surfaces. The guards-and-tests agent owns regression tests and may make small guard fixes if tests expose missing enforcement.

## Prompt Files

- `agent-1-data-contract.md`
- `agent-2-server-actions.md`
- `agent-3-communications.md`
- `agent-4-ui.md`
- `agent-5-guards-and-tests.md`

## Do Not Run In Parallel

- Do not run UI before server actions land.
- Do not run guards-and-tests before server actions land.
- Do not run any implementation before the data contract is approved and landed.
- Do not run any migration without explicit developer approval.
