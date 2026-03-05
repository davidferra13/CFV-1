# Quarterly Pricing Review Guide

Use with:

- `spreadsheets/monthly-pl-review.csv`
- `spreadsheets/quarterly-pricing-review.csv` (generated)

## Command

`npm run ops:pricing-review -- --input docs/event-ops-kit/spreadsheets/monthly-pl-review.csv --target-margin 35`

## What It Calculates

- Quarterly total revenue and total cost
- Gross profit and gross margin
- Food cost percent and labor cost percent
- Recommendation based on target margin

## Action Thresholds

- Below target: increase pricing and reduce cost leakage
- Near target: hold pricing and monitor
- Above target: test premium upsell strategy
