# OpenCLAW Archive Digester

Built 2026-03-30. Processes 10 years of unorganized business artifacts (receipts, invoices, menus, photos, emails) into structured data.

## Architecture

6-stage pipeline, all running on the Raspberry Pi (10.0.0.177):

| Stage        | Script                    | What it does                                                       |
| ------------ | ------------------------- | ------------------------------------------------------------------ |
| 1. Ingest    | `services/ingest.mjs`     | Scans directories, SHA-256 deduplicates, extracts text via OCR     |
| 1b. Classify | `services/classify.mjs`   | Ollama classifies each file (receipt, invoice, menu, recipe, etc.) |
| 2. Extract   | `services/extract.mjs`    | Ollama extracts structured entities (names, dates, amounts)        |
| 3. Link      | `services/linker.mjs`     | Fuzzy-matches names to build client records, creates events        |
| 4. Timeline  | `services/timeline.mjs`   | Assembles per-client chronological timelines                       |
| 5. Gaps      | `services/gap-report.mjs` | Identifies missing data and incomplete records                     |
| 6. Export    | `services/export.mjs`     | JSON export for ChefFlow sync                                      |

## API (port 8086)

- `GET /health` - service health check
- `GET /api/status` - file counts, classification breakdown, processing log
- `GET /api/archive/unsynced` - clients/events/financials not yet synced to ChefFlow
- `POST /api/archive/mark-synced` - mark records as synced (called by ChefFlow)
- `GET /api/archive/gaps` - gap report summary

## ChefFlow Integration

- Handler: `lib/openclaw/archive-digester-handler.ts`
- Registered as `archive-digester` cartridge in `lib/openclaw/sync-receiver.ts`
- Pulls unsynced clients and events, creates corresponding ChefFlow records
- Marks synced records on Pi to prevent duplicates

## Usage

Set `ARCHIVE_SCAN_DIRS` to comma-separated paths of archive directories, then run:

```bash
# Full pipeline
npm run process

# Individual stages
npm run ingest
npm run classify
npm run extract
npm run link
npm run timeline
npm run gaps
npm run export
```

## OCR Pipeline

3-tier, all local:

1. Tesseract.js (fast, free)
2. Ollama Vision / LLaVA (better for handwriting, scanned docs)
3. Skip (flag as unreadable)

## SQLite Tables

- `archive_files` - every ingested file with hash, OCR text, classification, entities
- `archive_clients` - discovered client records with name variants
- `archive_events` - reconstructed events with dates, amounts, locations
- `archive_recipes` - extracted recipe content
- `archive_financials` - individual financial line items
- `archive_processing_log` - stage run history
- `sync_log` - ChefFlow sync history

## Systemd

Service: `openclaw-archive-digester.service` (enabled, auto-starts on boot)
