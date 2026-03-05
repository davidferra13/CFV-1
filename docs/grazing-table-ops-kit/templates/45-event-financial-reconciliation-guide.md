# Event Financial Reconciliation Guide

Use with:

- `spreadsheets/pricing-calculator.csv`
- `spreadsheets/labor-model.csv`
- `spreadsheets/event-actuals.csv`
- `spreadsheets/event-financial-recon.csv` (generated)

## Workflow

1. Enter quoted event values in `pricing-calculator.csv`.
2. Enter labor rows in `labor-model.csv`.
3. Enter actual costs in `event-actuals.csv`.
4. Run reconciliation script for each event id.
5. Review gross profit and margin variance.

## Command

`node scripts/reconcile-grazing-event.mjs --packet docs/grazing-table-ops-kit/packets/<event-folder> --event-id EVT-001`

## Output

Creates or updates:

- `spreadsheets/event-financial-recon.csv`
