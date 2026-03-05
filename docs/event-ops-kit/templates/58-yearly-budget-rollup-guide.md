# Yearly Budget Rollup Guide

Use with:

- `spreadsheets/monthly-pl-review.csv`
- `spreadsheets/yearly-budget-planner.csv`
- `spreadsheets/yearly-budget-rollup.csv` (generated)

## Command

`npm run ops:annual-rollup -- --input docs/event-ops-kit/spreadsheets/monthly-pl-review.csv --planner docs/event-ops-kit/spreadsheets/yearly-budget-planner.csv`

## Output

Generates a yearly rollup comparing actual performance against targets:

- Event count
- Revenue
- Gross margin
- Variance vs annual plan
