# Event Ops Kit

This folder is a generic operations system for service-event businesses.
It is designed for fast execution with clear templates, logs, and repeatable event packets.
This is the canonical ops toolkit for website-wide workflows.

## What Is Included

- `BUILD_TRACKER.md`: master roadmap with status.
- `templates/`: contracts, intake forms, SOPs, and event-day docs.
- `spreadsheets/`: cost, inventory, and compliance logs.
- `packets/`: generated event packets.

## How To Use

1. Complete the templates once with your business defaults.
2. Generate a new packet for each event.
3. Fill all event-specific fields and logs.
4. Store finalized packet documents in the event folder.

## Packet Generator

Command:
`npm run ops:packet -- --event-date 2026-05-22 --client "Example Client" --venue "Example Venue" --event-name "reception"`

Output:

- Creates a folder in `docs/event-ops-kit/packets/`
- Copies all templates and spreadsheet logs
- Adds `EVENT_METADATA.md` with next steps
- Auto-generates `spreadsheets/event-task-board.csv` with dated milestones

## Standalone Task Board Generator

Command:
`npm run ops:task-board -- --event-date 2026-05-22 --out docs/event-ops-kit/packets/2026-05-22-client-event/spreadsheets/event-task-board.csv`

## Apply Business Defaults to a Packet

1. Copy `config/business-defaults.example.json` to your own file.
2. Fill your business values.
3. Run:
   `npm run ops:prefill -- --packet docs/event-ops-kit/packets/2026-05-22-client-event --defaults docs/event-ops-kit/config/business-defaults.example.json`

This updates placeholder values like `[Business Name]`, `[Your Name]`, and contact details in packet templates.

## Event Reconciliation

1. Fill `spreadsheets/pricing-calculator.csv`, `spreadsheets/labor-model.csv`, and `spreadsheets/event-actuals.csv`.
2. Run:
   `npm run ops:reconcile -- --packet docs/event-ops-kit/packets/2026-05-22-client-event --event-id EVT-001`
3. Review output in `spreadsheets/event-financial-recon.csv`.

## Proposal Bundle Export

Command:
`npm run ops:bundle -- --packet docs/event-ops-kit/packets/2026-05-22-client-event`

This creates a `proposal-bundle` folder with client-facing proposal docs.

## Quarterly Pricing Review

Command:
`npm run ops:pricing-review -- --input docs/event-ops-kit/spreadsheets/monthly-pl-review.csv --target-margin 35`

This writes `spreadsheets/quarterly-pricing-review.csv` with margin analysis and pricing recommendations.

## Vendor Scorecard Summary

Command:
`npm run ops:vendor-scorecard -- --input docs/event-ops-kit/spreadsheets/vendor-scorecard-entries.csv --out docs/event-ops-kit/spreadsheets/vendor-scorecard-summary.csv`

This writes an averaged vendor performance summary and classification.

## Annual Budget Rollup

Command:
`npm run ops:annual-rollup -- --input docs/event-ops-kit/spreadsheets/monthly-pl-review.csv --planner docs/event-ops-kit/spreadsheets/yearly-budget-planner.csv`

This writes `spreadsheets/yearly-budget-rollup.csv` with actual vs target variance.

## Quality Summary

Command:
`npm run ops:quality-summary -- --input docs/event-ops-kit/spreadsheets/event-quality-score-log.csv --threshold 75`

This writes `spreadsheets/event-quality-summary.csv` for monthly quality tracking.

## Migrate Legacy Packets

Command:
`npm run ops:migrate-legacy-packets`

Default behavior:

- Source: `docs/grazing-table-ops-kit/packets`
- Destination: `docs/event-ops-kit/packets`
- Action: copy packet folders with collision-safe naming

## Important

- This is an operations template kit, not legal advice.
- Compliance and permit requirements are local. Confirm county/city/state rules for each operating jurisdiction.
