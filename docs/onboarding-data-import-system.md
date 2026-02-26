# Onboarding & Data Import System

**Branch:** `feature/packing-list-system`
**Date:** 2026-02-19 (initial) · 2026-02-19 (follow-up fixes)
**Scope:** Phase 1 onboarding overhaul — CSV import, historical events, bug fixes, and dashboard guidance.

---

## Why This Was Built

The single biggest adoption risk for ChefFlow is Day 1 friction. A chef signing up has years of data: a contact list, past gig history, recipes, receipts. Forcing them to enter any of this manually — one form at a time — causes immediate churn.

This work makes it possible for a chef to **bring their entire existing business onto the platform in a single session**.

---

## What Changed

### 1. CSV / Spreadsheet Client Import (new)

**Files:**

- `lib/ai/parse-csv-clients.ts` — deterministic CSV parser, no AI required
- `components/import/csv-import.tsx` — full import flow UI
- `components/import/smart-import-hub.tsx` — new "CSV / Spreadsheet" tab
- `app/(chef)/import/page.tsx` — `'csv'` added to IMPORT_MODES

**What it does:**

A chef can drop a `.csv` file or paste CSV text directly. The parser auto-detects the format:

- **Google Contacts CSV** (exported from contacts.google.com) — picks up Name, Given Name, Family Name, Phone N - Value, E-mail N - Value, Notes
- **Generic CSV** — detects columns by header name matching (name, full_name, email, phone, notes, address, city, state, zip and many variants)

**Review flow:**

1. Upload or paste → "Detect Columns" button
2. See a column mapping preview + first 5 rows of data
3. Duplicate check runs automatically (by email + name match against existing clients)
4. Chef can skip individual clients before saving
5. Confirm + "Import N Clients" → `importClients()` server action saves to DB

**No AI required.** This is pure deterministic column detection, so it works even without a `GEMINI_API_KEY`.

---

### 2. Historical Events Import (new)

**Files:**

- `lib/events/historical-import-actions.ts` — `importHistoricalEvent()`, `importHistoricalEvents()`, `getClientsForHistoricalImport()`
- `components/import/past-events-import.tsx` — multi-row form UI
- `components/import/smart-import-hub.tsx` — new "Past Events" tab
- `app/(chef)/import/page.tsx` — `'past-events'` added to IMPORT_MODES

**What it does:**

A chef fills out a spreadsheet-style form with their past events. Each row has:

- **Date** (required)
- **Client** (required — select from existing or type a new name)
- Occasion, Guest Count, City, Service Style
- Amount Paid + Payment Method

**How events are created:**

- Inserted directly as `status: 'completed'` — no FSM traversal
- If a client name doesn't match an existing client, a minimal client record is created automatically
- If amount > $0, a `ledger_entries` record is inserted (entry_type: `payment`) so the chef's financial history is accurate in reports
- Payment records are flagged with `internal_notes: 'Imported from historical records during chef onboarding'`

**Review phase** shows a summary table + total payment value before any saves. Ledger writes are called out explicitly (they're immutable) with a warning to verify amounts.

---

### 3. Brain Dump Notes Now Save (bug fix)

**File:** `lib/ai/import-actions.ts` — `importBrainDump()`

**Before:** Brain dump parsed into clients, recipes, notes, and unstructured text. Only clients and recipes were saved. Notes and unstructured text silently disappeared after review.

**After:** All notes (including unstructured text promoted to general notes) are saved as `chef_documents` records with `document_type: 'note'` and `source_type: 'brain_dump'`. They appear in the chef's documents library for later review.

---

### 4. Duplicate Detection (new)

**File:** `lib/ai/import-actions.ts` — `checkClientDuplicates()` (new server action)

Called immediately after CSV or text parsing. Checks all candidate clients against:

- Exact email match (excluding placeholder emails)
- Case-insensitive full name match

Results are shown in the review phase as "possible duplicate" badges on affected client cards. The chef can skip duplicates individually or import anyway.

**Bug fix (follow-up):** The original name-check used PostgREST's `.or()` filter — e.g. `full_name.ilike.john smith` — which PostgREST misparsed on names containing spaces. Fixed by fetching all client names (limit 500) and comparing in JavaScript instead. Email matching (via `.in()`) is unaffected and still runs in a parallel query.

---

### 5. Dashboard Onboarding Accelerator Updated

**File:** `components/dashboard/onboarding-accelerator.tsx`

The "Get Started" card on the dashboard now:

- Leads with **"Import your contacts"** (CSV upload) as step 1
- Shows **"Log your past events"** as step 2
- Then live inquiry → quote (normal workflow)
- Quick-action buttons: Upload CSV, Log Past Events, Brain Dump
- Copy changed from "Do not upload everything first" to "Import your contacts and history first — then use ChefFlow for everything going forward"

This reverses the previous guidance. The old guidance optimized for workflow completion; the new guidance recognizes that data import is the actual Day 1 task.

---

## Smart Import Hub — Tab Order

The tabs on `/import` are now ordered by chef priority:

| Tab                   | Mode          | Requires AI            |
| --------------------- | ------------- | ---------------------- |
| Brain Dump            | `brain-dump`  | Yes (fallback without) |
| **CSV / Spreadsheet** | `csv`         | **No**                 |
| **Past Events**       | `past-events` | **No**                 |
| Import Clients        | `clients`     | Yes                    |
| Import Recipe         | `recipe`      | Yes                    |
| Import Receipt        | `receipt`     | Yes (vision)           |
| Import Document       | `document`    | Yes                    |
| Upload File           | `file-upload` | Yes (vision)           |

CSV and Past Events are placed immediately after Brain Dump because they require no API key and handle the most common Day 1 data.

---

## Architecture Notes

### Custom Component Modes

CSV and Past Events are "custom component" modes — they manage their own full state machine (form → review → saving → done) rather than using the hub's shared `phase` state. The hub renders them via a new `isCustomComponent` flag on `TabConfig`. This keeps the hub's existing AI-parse flow untouched.

### Historical Events and the Ledger

Historical payment entries are real ledger entries. This was a deliberate choice: the ledger is the source of financial truth, so historical payments belong there. They will appear in the financial dashboard, reports, and client financial summaries.

The trade-off: ledger entries are immutable. Chefs should review amounts carefully before saving (the review phase calls this out explicitly).

### Client Resolution in Historical Events

When a chef types a client name that doesn't match an existing client, the historical event importer creates a minimal client record with a placeholder email. This is the same pattern used by the brain dump importer. The chef can update the client's real email later from the Clients page.

### No Migration Required

All new features use existing database tables:

- `clients` — existing
- `events` — existing (status `'completed'` was always valid)
- `ledger_entries` — existing
- `chef_documents` — existing (brain dump notes use `document_type: 'note'`)

No schema changes needed.

---

## Follow-Up Fixes (applied same session)

### Fix 1: Broken Duplicate Name Query

**Problem:** `checkClientDuplicates()` used PostgREST `.or()` with dynamically built filters like `full_name.ilike.john smith`. PostgREST misinterpreted values that contained spaces, returning no matches and silently missing duplicates.

**Fix:** Removed the `.or()` filter entirely. Now fetches all client names for the tenant (up to 500) in parallel with the email query, and compares by `toLowerCase()` in JavaScript.

**Files changed:** `lib/ai/import-actions.ts`

---

### Fix 2: useEffect Anti-Pattern in Past Events Import

**Problem:** `PastEventsImport` called `getClientsForHistoricalImport()` inside a `useEffect` — a client-side server action call that fires after mount, flashes the UI (no dropdown until the call resolves), and adds unnecessary network round-trips.

**Fix:**

- `app/(chef)/import/page.tsx` now fetches `getClientsForHistoricalImport()` server-side in the existing `Promise.all`
- Result is passed as `existingClients` prop through `SmartImportHub` → `PastEventsImport`
- `PastEventsImport` accepts `existingClients?: { id: string; full_name: string }[]` as a prop — no fetch, no effect

**Files changed:** `app/(chef)/import/page.tsx`, `components/import/smart-import-hub.tsx`, `components/import/past-events-import.tsx`

---

### Fix 3: CSV Upload Path for Past Events

**Problem:** A chef with 3 years of past events (50+ gigs) had no bulk import path — they had to fill in every row manually.

**Fix:**

- New file `lib/ai/parse-csv-events.ts` — deterministic CSV parser for event data. Detects columns: Date, Client, Occasion, Guests, City, Amount, Payment Method, Notes. Handles `$1,500.00` amount format, normalizes dates to YYYY-MM-DD, maps payment method aliases (e.g. "card" or "credit card" → `card`).
- `past-events-import.tsx` now has two input mode tabs: **Manual Entry** (existing row form) and **Paste CSV** (textarea + file upload). After CSV parse, rows are populated into the manual form so the chef can review/edit before proceeding to the existing review phase.

**Files changed:** `lib/ai/parse-csv-events.ts` (new), `components/import/past-events-import.tsx`

---

## What's Still Missing (Future Work)

| Gap                                           | Priority | Notes                                                |
| --------------------------------------------- | -------- | ---------------------------------------------------- |
| Menu/dish import                              | Medium   | No bulk import path for menus yet — must build in UI |
| Recipe import from URL                        | Low      | Useful but not Day 1                                 |
| Edit individual clients before CSV import     | Medium   | Currently: skip or import as-is                      |
| Merge duplicate clients                       | Medium   | Can identify but not merge in-app yet                |
| Financial history import (non-event payments) | Low      | Ledger immutability makes this complex               |
