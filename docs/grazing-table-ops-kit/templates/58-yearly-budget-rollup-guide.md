# Yearly Budget Rollup Guide

Use with:

- `spreadsheets/monthly-pl-review.csv`
- `spreadsheets/yearly-budget-planner.csv`
- `spreadsheets/yearly-budget-rollup.csv` (generated)

## Command

`node scripts/grazing-annual-budget-rollup.mjs --input docs/grazing-table-ops-kit/spreadsheets/monthly-pl-review.csv --planner docs/grazing-table-ops-kit/spreadsheets/yearly-budget-planner.csv`

## Output

Generates a yearly rollup comparing actual performance against targets:

- Event count
- Revenue
- Gross margin
- Variance vs annual plan
