# Grazing Table Ops Kit (Legacy)

This kit is a legacy vertical variant.
Use the generic website-wide kit at `docs/event-ops-kit` for current operations templates and automation.

This folder is a working operating system for a grazing-table catering business.
It is designed for fast execution with clear templates, logs, and repeatable event packets.

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
`npm run grazing:packet -- --event-date 2026-05-22 --client "Jordan Lee" --venue "Willow Manor" --event-name "wedding-reception"`

Output:

- Creates a folder in `docs/grazing-table-ops-kit/packets/`
- Copies all templates and spreadsheet logs
- Adds `EVENT_METADATA.md` with next steps
- Auto-generates `spreadsheets/event-task-board.csv` with dated milestones

## Standalone Task Board Generator

Command:
`npm run grazing:task-board -- --event-date 2026-05-22 --out docs/grazing-table-ops-kit/packets/2026-05-22-client-event/spreadsheets/event-task-board.csv`

## Apply Business Defaults to a Packet

1. Copy `config/business-defaults.example.json` to your own file.
2. Fill your business values.
3. Run:
   `npm run grazing:prefill -- --packet docs/grazing-table-ops-kit/packets/2026-05-22-client-event --defaults docs/grazing-table-ops-kit/config/business-defaults.example.json`

This updates placeholder values like `[Business Name]`, `[Your Name]`, and contact details in packet templates.

## Event Reconciliation

1. Fill `spreadsheets/pricing-calculator.csv`, `spreadsheets/labor-model.csv`, and `spreadsheets/event-actuals.csv`.
2. Run:
   `npm run grazing:reconcile -- --packet docs/grazing-table-ops-kit/packets/2026-05-22-client-event --event-id EVT-001`
3. Review output in `spreadsheets/event-financial-recon.csv`.

## Proposal Bundle Export

Command:
`npm run grazing:bundle -- --packet docs/grazing-table-ops-kit/packets/2026-05-22-client-event`

This creates a `proposal-bundle` folder with client-facing proposal docs.

## Quarterly Pricing Review

Command:
`npm run grazing:pricing-review -- --input docs/grazing-table-ops-kit/spreadsheets/monthly-pl-review.csv --target-margin 35`

This writes `spreadsheets/quarterly-pricing-review.csv` with margin analysis and pricing recommendations.

## Vendor Scorecard Summary

Command:
`npm run grazing:vendor-scorecard -- --input docs/grazing-table-ops-kit/spreadsheets/vendor-scorecard-entries.csv --out docs/grazing-table-ops-kit/spreadsheets/vendor-scorecard-summary.csv`

This writes an averaged vendor performance summary and classification.

## Annual Budget Rollup

Command:
`npm run grazing:annual-rollup -- --input docs/grazing-table-ops-kit/spreadsheets/monthly-pl-review.csv --planner docs/grazing-table-ops-kit/spreadsheets/yearly-budget-planner.csv`

This writes `spreadsheets/yearly-budget-rollup.csv` with actual vs target variance.

## Quality Summary

Command:
`npm run grazing:quality-summary -- --input docs/grazing-table-ops-kit/spreadsheets/event-quality-score-log.csv --threshold 75`

This writes `spreadsheets/event-quality-summary.csv` for monthly quality tracking.

## Important

- This is an operations template kit, not legal advice.
- Food and permit requirements are local. Confirm county/city rules for each event jurisdiction.
