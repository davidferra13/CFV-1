# Vendor Scorecard Guide

Use with:

- `spreadsheets/vendor-scorecard-entries.csv`
- `spreadsheets/vendor-scorecard-summary.csv` (generated)

## Scoring Scale

- 1 = poor
- 3 = acceptable
- 5 = excellent

## Command

`npm run ops:vendor-scorecard -- --input docs/event-ops-kit/spreadsheets/vendor-scorecard-entries.csv --out docs/event-ops-kit/spreadsheets/vendor-scorecard-summary.csv`

## Review Actions

- Preferred vendor candidate: composite score >= 4.5 with low issue rate
- Watchlist: composite score 3.0-3.9 or repeated issues
- Replace candidate: composite score < 3.0
