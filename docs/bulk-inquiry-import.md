# Bulk Inquiry Import

**Date:** 2026-02-23
**Status:** Complete

## What This Does

Adds an "Import Inquiries" tab to the Smart Import Hub (`/import?mode=inquiries`) that lets any chef bulk-import historical inquiries from any source. Imported inquiries look fully native — as if ChefFlow was in use when the leads originally came in.

## Why It Exists

Chefs switching to ChefFlow have historical leads in spreadsheets, Wix form exports, text messages, email threads, and scattered notes. Without this feature, those leads are invisible — the chef's inquiry pipeline only shows leads captured after the widget was installed. This feature closes that gap so a chef's full history is in one place from day one.

## Two Input Modes

### CSV / Spreadsheet

- Upload a `.csv` file or paste CSV text
- Deterministic column auto-detection (no AI needed) — detects: name, email, phone, date, occasion, guests, location, budget, channel, status, notes, dietary, decline reason
- Status normalization: `won/booked/yes → confirmed`, `lost/no/rejected → declined`, `ghost/no_response → expired`, else `new`
- Budget auto-converts dollars to cents

### Freeform Text (AI)

- Paste anything — email threads, text messages, notes, form submissions
- Parsed by Ollama (local AI only — never cloud) into structured inquiry records
- Heuristic fallback if Ollama is offline: splits by blank lines, extracts names/dates/amounts via regex
- Each parsed inquiry shows the original source text snippet for verification

## Preview & Edit

Both modes lead to an editable preview table:

- **Batch defaults bar** — set default status and channel for all rows at once
- **Per-row overrides** — each row has its own status, channel, and date fields
- **Decline reason** — appears automatically when status is "declined"
- **Duplicate detection** — checks existing inquiries by (client name, date) and shows warning badges
- **Skip toggle** — exclude individual rows without removing them
- **Confirmation checkbox** — required before import

## What Gets Created

For each imported inquiry:

1. **Inquiry record** — with `first_contact_at` set to the original date (not the import date)
2. **Client auto-linking** — if the email matches an existing client, the inquiry links to them
3. **Unknown fields** — if no client match, lead info is stored in `unknown_fields` JSON (same as manual inquiries)
4. **State transition record** — `from: null → to: <status>` with metadata `{ action: 'bulk_import' }`

## What Does NOT Happen

Imported inquiries skip all side effects that normal inquiry creation triggers:

- No confirmation emails sent
- No Remy AI lead scoring
- No automation rule evaluation
- No activity log entries

This is intentional — these are historical records, not live leads.

## Files

| File                                          | Purpose                                                         |
| --------------------------------------------- | --------------------------------------------------------------- |
| `lib/inquiries/import-constants.ts`           | Status, channel, and decline reason options                     |
| `lib/ai/parse-csv-inquiries.ts`               | Deterministic CSV parser                                        |
| `lib/ai/parse-inquiries-bulk.ts`              | AI freeform parser (Ollama)                                     |
| `lib/inquiries/import-actions.ts`             | Server actions: `importInquiries()`, `checkInquiryDuplicates()` |
| `components/import/inquiry-import.tsx`        | Main UI component                                               |
| `components/import/inquiry-preview-table.tsx` | Editable preview table                                          |
| `components/import/smart-import-hub.tsx`      | Modified — added `inquiries` tab                                |
| `app/(chef)/import/page.tsx`                  | Modified — added `inquiries` to valid modes                     |

## How to Access

Navigate to `/import` and click the "Import Inquiries" tab, or go directly to `/import?mode=inquiries`.

## Privacy

All AI parsing uses `parseWithOllama()` (local Ollama only). Client PII never leaves the machine. If Ollama is offline, the freeform mode shows a clear error message; CSV mode still works without AI.
