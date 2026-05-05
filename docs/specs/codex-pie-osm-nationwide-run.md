# Codex Build Spec: PIE OSM Nationwide Store Ingestion Runner

> **Priority:** P0 - Stores went from 422 to 37K but still NE-heavy. Scripts exist, need execution harness
> **Risk:** LOW - additive data ingestion, no existing data modified
> **Estimated scope:** ~150 lines, 1 new orchestrator script

## Context

Three ingestion scripts exist but lack an orchestrator to run them systematically across all 50 states:

- `scripts/ingest-osm-stores.mjs` (849 LOC) - grocery, supermarket, convenience, specialty
- `scripts/ingest-snap-retailers.mjs` - SNAP/EBT authorized retailers
- `scripts/ingest-usda-farmers-markets.mjs` (285 LOC) - farmers markets

Each supports `--state XX` flag. No script runs all 50 states in sequence with progress tracking, error recovery, or dedup protection.

## File to Create

`scripts/pie-nationwide-ingestion.mjs`

## What to Build

### 1. State iteration with progress tracking

```javascript
const ALL_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DC',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
]
```

### 2. Orchestration logic

- Run each script for each state sequentially (Overpass rate limits)
- 15-second delay between Overpass queries (respect existing DELAY_BETWEEN_QUERIES_MS)
- Log: `[STATE] [SCRIPT] started/completed/failed (X stores inserted, Y skipped)`
- On failure for one state: log error, continue to next state (never abort entire run)
- Write progress to `scripts/pie-ingestion-progress.json`: `{ state, script, status, count, timestamp }`

### 3. Resume capability

- On start, read `pie-ingestion-progress.json`
- Skip state+script combos already marked "completed"
- `--force` flag to re-run everything regardless
- `--script osm|snap|farmers` flag to run only one script type
- `--start-from XX` flag to begin from a specific state

### 4. Summary report

- At end, print table: state | osm_stores | snap_retailers | farmers_markets | errors
- Total counts across all states
- Write summary to `scripts/pie-ingestion-summary.json`

## Usage

```bash
node scripts/pie-nationwide-ingestion.mjs                    # run all
node scripts/pie-nationwide-ingestion.mjs --script osm       # OSM only
node scripts/pie-nationwide-ingestion.mjs --start-from TX    # resume from Texas
node scripts/pie-nationwide-ingestion.mjs --force             # re-run all
```

## Do NOT Modify

- `ingest-osm-stores.mjs`
- `ingest-snap-retailers.mjs`
- `ingest-usda-farmers-markets.mjs`

Call them as child processes via `child_process.execSync` or `spawn`.

## Acceptance Criteria

- Script runs `--dry-run` mode (add `--dry-run` passthrough to child scripts) without errors
- Progress JSON written correctly
- Resume works (run twice, second run skips completed states)
- Summary table printed at end
