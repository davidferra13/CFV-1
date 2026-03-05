# Quality Summary Guide

Use with:

- `spreadsheets/event-quality-score-log.csv`
- `spreadsheets/event-quality-summary.csv` (generated)

## Command

`node scripts/grazing-quality-summary.mjs --input docs/grazing-table-ops-kit/spreadsheets/event-quality-score-log.csv --threshold 75`

## Output

Monthly quality summary including:

- Number of scored events
- Average quality percent
- Count below threshold
- Lowest average category for coaching focus
