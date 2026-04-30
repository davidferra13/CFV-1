# Builder-Agent Memory

This directory is the file-based memory area for the internal ChefFlow builder-agent runtime.

## Layout

- `index/manifest.json` stores the current normalized memory index and source fingerprints.
- `journal/*.jsonl` stores append-only execution journals, one file per run.
- Human-readable summaries may live in this directory when they explain builder-agent operation.

## Rules

- Store only repo-native operating context here.
- Do not store customer data, private chef or client records, secrets, auth files, or scraped third-party source.
- Dry-run and maintenance modes may write here.
- Writes outside this directory require an explicit implementation path and are not performed by maintenance.

