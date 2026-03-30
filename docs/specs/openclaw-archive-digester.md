# Spec: OpenClaw Archive Digester Cartridge

> **Status:** ready
> **Priority:** P2 (high value, not blocking current work)
> **Depends on:** openclaw-cartridge-infrastructure (verified)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-30

---

## What This Does (Plain English)

A new OpenClaw cartridge that ingests the developer's entire 10-year archive of unorganized business artifacts (scanned receipts, emails, handwritten menus, Google Docs, text messages, Wix form screenshots, dish photos, invoices, recipe notebooks) and produces a structured business database. This is not a scraper like the other cartridges. It is a one-time (or incremental) document processor that turns chaos into structured data using Ollama for classification and entity extraction.

The output is a complete business history: client ledger, event timeline, menu archive, recipe archive, financial records, communication logs, and lead history. This data then syncs to ChefFlow, populating the database that makes every feature (loyalty, financials, client insights, menu library) actually meaningful.

**OpenClaw IS the business database. ChefFlow is the frontend that reads from it.**

---

## Why It Matters

The developer has been a private chef for 10+ years with hundreds of clients and hundreds of dinners. Every artifact exists (receipts, emails, menus, notes, photos) but none of it is organized or digitized into structured records. Features like the loyalty program, financial reports, and client insights are only useful with real historical data behind them. Without this cartridge, ChefFlow starts from zero. With it, ChefFlow starts from day one of the business.

---

## How It Works

### Input: The Dump Folder

The developer creates one massive folder on the PC. No organization required. Just dump everything in:

```
F:\ChefArchive\
  ├── *.jpg, *.png, *.heic     (photos of dishes, receipts, handwritten notes)
  ├── *.pdf                     (invoices, contracts, printed menus)
  ├── *.eml, *.mbox            (Gmail export via Google Takeout)
  ├── *.docx, *.doc, *.txt     (Google Docs export, notes)
  ├── *.csv                     (Wix form exports, payment exports)
  ├── *.html                    (saved web pages, Wix form screenshots)
  └── subfolders/               (any depth, scanner will recurse)
```

Google Takeout provides Gmail (mbox), Google Docs (docx), Google Drive files, and Google Photos in bulk. The developer can also use a phone scanner app (Microsoft Lens, Adobe Scan) to digitize physical receipts and handwritten notes into PDFs/images.

### Processing Pipeline

The cartridge runs on the Pi. It processes files from a staging area (copied from the PC dump folder via `scp` or USB drive).

**Stage 1: Ingest and Classify**

For each file in the staging folder:

1. Hash the file (SHA-256) to prevent duplicate processing
2. Detect file type (image, PDF, email, document, CSV, audio)
3. For images/PDFs: run through the **3-tier OCR pipeline** (see below)
4. For audio files (.m4a, .mp3, .wav): transcribe via Whisper on Ollama
5. Send extracted text + filename + metadata to Ollama for classification

#### 3-Tier OCR Pipeline (images and PDFs)

Documents go through three tiers in order. Each tier is tried; if confidence is too low, the next tier runs. Results from all tiers are merged (best text wins).

| Tier                             | Method                                              | Cost                    | Best For                                                | Accuracy                                                   |
| -------------------------------- | --------------------------------------------------- | ----------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| **Tier 1: Multimodal Vision**    | Send image directly to LLaVA/Llama-Vision on Ollama | Free (local)            | Photos, handwritten notes, context-dependent documents  | High for understanding WHAT it is; moderate for exact text |
| **Tier 2: Cloud Vision OCR**     | Google Cloud Vision API or Azure Computer Vision    | ~$1.50 per 1,000 images | Blurry receipts, faded thermal paper, messy handwriting | 90-95% on worst-case documents                             |
| **Tier 3: Tesseract (fallback)** | Local Tesseract OCR                                 | Free                    | Clean typed/printed text, digital screenshots           | 95%+ on clean text, 60% on handwriting                     |

**How it works:**

- Tier 3 (Tesseract) runs first on every image (free, fast, handles clean text perfectly)
- If Tesseract confidence is below 70% OR the document is classified as handwritten: Tier 1 (multimodal vision) runs. The LLM sees the actual image and extracts meaning, not just characters. This catches context that pure OCR misses ("this is a grocery list for 12 people" vs raw text)
- If both Tier 3 and Tier 1 produce low-confidence results: Tier 2 (Cloud Vision) runs. This is the heavy hitter for faded/blurry/damaged documents. Costs pennies per image but reads almost anything

**Privacy note:** Tier 2 sends the image to Google/Azure for OCR only. No client PII is in receipt images (just store names, item names, prices). For documents that DO contain client PII (handwritten client notes with names/phones), Tier 1 (local multimodal) is preferred. The pipeline can be configured to skip Tier 2 for PII-classified documents.

#### Voice Memo Fallback

For documents that all three OCR tiers cannot read (badly damaged, illegible handwriting), the developer can record a voice memo describing what the document says. Drop the audio file in the same staging folder. The cartridge:

1. Detects audio files (.m4a, .mp3, .wav, .ogg)
2. Transcribes via Whisper model on Ollama (free, local)
3. Links the transcription to the source document (by filename convention: `receipt_003.jpg` pairs with `receipt_003.m4a`)
4. Extracts entities from the transcription instead of from OCR

This means the developer can flip through a stack of illegible papers and just narrate: "Whole Foods receipt, March 3, 2024, about $340 for the Henderson dinner." Thirty seconds of talking replaces 30 minutes of squinting at faded ink.

Classification categories:

- `receipt` (grocery, equipment, supply purchase)
- `invoice` (sent to client, or received from vendor)
- `menu` (printed menu, handwritten menu, menu draft)
- `recipe` (full recipe, partial recipe, recipe notes)
- `email_thread` (client communication, vendor communication, inquiry)
- `text_message` (screenshot of text/iMessage conversation)
- `form_submission` (Wix inquiry form, contact form)
- `photo_dish` (photo of a prepared dish)
- `photo_event` (photo from an event/dinner)
- `client_notes` (handwritten or typed notes about a client)
- `financial_record` (bank statement, payment confirmation, Venmo/Zelle screenshot)
- `contract` (service agreement, terms)
- `unknown` (cannot classify - flagged for manual review)

**Stage 2: Entity Extraction**

For each classified document, Ollama extracts structured entities:

| Entity         | Examples                                |
| -------------- | --------------------------------------- |
| Client name    | "Sarah Johnson", "The Hendersons"       |
| Date           | Event date, invoice date, receipt date  |
| Dollar amount  | Total, line items, tips                 |
| Location       | Event address, store name               |
| Food items     | Ingredients purchased, dishes served    |
| Guest count    | Number of guests at an event            |
| Occasion       | Birthday, anniversary, corporate dinner |
| Contact info   | Email, phone number                     |
| Payment method | Venmo, Zelle, check, cash, credit card  |

**Stage 3: Cross-Reference and Link**

The linker connects extracted entities into coherent records:

- Receipt from Whole Foods on March 3 + email thread about "Henderson dinner March 5" + menu PDF titled "Henderson Anniversary" = one event with shopping, communication, and menu
- Multiple receipts near the same date for the same client = same event's expenses
- Client name appearing across emails, invoices, and menus = same client entity (fuzzy matching on names)

Linking rules:

- Date proximity (receipts within 3 days before an event date = likely that event's expenses)
- Name matching (fuzzy, handles "Sarah", "Sarah J", "Sarah Johnson", "The Johnsons")
- Dollar amount correlation (invoice total vs receipt totals)
- Thread grouping (emails in same thread = same conversation)

**Stage 4: Timeline Assembly**

Build chronological records per client:

- First contact (earliest email or form submission)
- Events (date, occasion, guest count, menu, expenses, revenue)
- Communication history (key exchanges, not every email)
- Financial summary (total revenue, total expenses, payment patterns)

**Stage 5: Gap Detection**

Report what's missing:

- "Found 47 events but only 31 have menus attached"
- "Client 'Henderson' has 3 events but no contact info found"
- "12 receipts could not be linked to any event"
- "8 files could not be classified"

**Stage 6: ChefFlow Export**

Produce structured JSON that ChefFlow's sync handler can import:

- Clients (name, email, phone, preferences, allergies, notes)
- Events (date, client, occasion, guest count, location, status: completed)
- Menus (linked to events, course structure if detectable)
- Recipes (title, ingredients if extractable, notes)
- Financial records (revenue per event, expenses, tips)
- Loyalty points (calculated retroactively from triggers that would have fired)

---

## SQLite Schema (Pi-side)

```sql
-- Raw ingested files
CREATE TABLE archive_files (
  id TEXT PRIMARY KEY,           -- UUID
  file_hash TEXT UNIQUE NOT NULL, -- SHA-256 (dedup)
  original_path TEXT NOT NULL,
  file_type TEXT NOT NULL,        -- image, pdf, email, document, csv
  file_size_bytes INTEGER,
  classification TEXT,            -- receipt, invoice, menu, recipe, etc.
  classification_confidence REAL, -- 0.0-1.0
  ocr_text TEXT,                  -- extracted text (OCR or direct)
  extracted_entities TEXT,        -- JSON blob of extracted entities
  linked_client_id TEXT,          -- FK to archive_clients
  linked_event_id TEXT,           -- FK to archive_events
  status TEXT DEFAULT 'pending',  -- pending, classified, extracted, linked, exported, error
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);

-- Deduplicated client records
CREATE TABLE archive_clients (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  name_variants TEXT,             -- JSON array of all name forms found
  email TEXT,
  phone TEXT,
  address TEXT,
  dietary_notes TEXT,
  allergen_notes TEXT,
  first_seen_date TEXT,
  last_seen_date TEXT,
  total_events INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  notes TEXT,
  chefflow_client_id TEXT,        -- mapped after sync
  created_at TEXT DEFAULT (datetime('now'))
);

-- Reconstructed events
CREATE TABLE archive_events (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES archive_clients(id),
  event_date TEXT,
  occasion TEXT,
  guest_count INTEGER,
  location TEXT,
  menu_summary TEXT,              -- plain text summary of what was served
  revenue_cents INTEGER,
  expense_cents INTEGER,
  tip_cents INTEGER,
  payment_method TEXT,
  notes TEXT,
  confidence TEXT DEFAULT 'low',  -- low, medium, high (how much evidence)
  source_file_ids TEXT,           -- JSON array of archive_files.id that built this
  chefflow_event_id TEXT,         -- mapped after sync
  created_at TEXT DEFAULT (datetime('now'))
);

-- Extracted recipes
CREATE TABLE archive_recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ingredients TEXT,               -- JSON array if extractable
  instructions TEXT,              -- raw text
  source_file_id TEXT REFERENCES archive_files(id),
  completeness TEXT DEFAULT 'partial', -- partial, full
  created_at TEXT DEFAULT (datetime('now'))
);

-- Financial line items
CREATE TABLE archive_financials (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES archive_events(id),
  type TEXT NOT NULL,             -- revenue, expense, tip
  amount_cents INTEGER NOT NULL,
  description TEXT,
  vendor TEXT,                    -- store name for expenses
  date TEXT,
  source_file_id TEXT REFERENCES archive_files(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Processing log
CREATE TABLE archive_processing_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage TEXT NOT NULL,             -- ingest, classify, extract, link, export
  files_processed INTEGER,
  files_succeeded INTEGER,
  files_failed INTEGER,
  duration_ms INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sync tracking
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,         -- clients, events, recipes, financials, loyalty
  records_sent INTEGER,
  records_accepted INTEGER,
  records_rejected INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Pi-Side File Structure

```
F:\OpenClaw-Vault\profiles\archive-digester\
  ├── profile.json
  ├── package.json
  ├── services/
  │   ├── ingest.mjs              -- Stage 1: file scanning, hashing, OCR
  │   ├── classify.mjs            -- Stage 1b: Ollama classification
  │   ├── extract.mjs             -- Stage 2: Ollama entity extraction
  │   ├── linker.mjs              -- Stage 3: cross-reference and link
  │   ├── timeline.mjs            -- Stage 4: per-client timeline assembly
  │   ├── gap-report.mjs          -- Stage 5: gap detection report
  │   ├── export.mjs              -- Stage 6: JSON export for ChefFlow
  │   └── sync-api.mjs            -- HTTP API (port 8086)
  ├── lib/
  │   ├── db.mjs                  -- SQLite schema init
  │   ├── ocr-pipeline.mjs        -- 3-tier OCR (Tesseract -> LLaVA -> Cloud Vision)
  │   ├── cloud-vision.mjs        -- Google Cloud Vision API wrapper (Tier 2)
  │   ├── whisper.mjs             -- Audio transcription via Ollama Whisper
  │   ├── ollama-prompts.mjs      -- Classification and extraction prompts
  │   └── fuzzy-match.mjs         -- Name matching utilities
  ├── storage/
  │   ├── staging/                -- Raw files copied from PC
  │   └── exports/                -- JSON exports for ChefFlow
  └── data/
      └── archive.db              -- SQLite database
```

---

## Ollama Prompts (Key Examples)

### Classification Prompt

```
You are classifying a business document for a private chef.
File name: {filename}
File type: {type}
Text content (first 2000 chars):
{text}

Classify this document as exactly ONE of:
receipt, invoice, menu, recipe, email_thread, text_message, form_submission,
photo_dish, photo_event, client_notes, financial_record, contract, unknown

Respond with JSON: { "classification": "...", "confidence": 0.0-1.0, "reasoning": "..." }
```

### Entity Extraction Prompt

```
You are extracting business entities from a private chef's {classification}.
Text content:
{text}

Extract all entities you can find. Respond with JSON:
{
  "client_names": [],
  "dates": [],
  "dollar_amounts": [{ "amount": 0.00, "context": "..." }],
  "locations": [],
  "food_items": [],
  "guest_count": null,
  "occasion": null,
  "contact_info": { "email": null, "phone": null },
  "payment_method": null,
  "notes": "any other relevant details"
}

Only include entities you are confident about. Do not guess.
```

---

## ChefFlow-Side Handler

**File:** `lib/openclaw/archive-digester-handler.ts`

Receives exported JSON from the Archive Digester and writes to ChefFlow tables:

| Export Type | ChefFlow Target        | Logic                                                                  |
| ----------- | ---------------------- | ---------------------------------------------------------------------- |
| Clients     | `clients` table        | Create or match existing by name/email. Set `source: 'archive_import'` |
| Events      | `events` table         | Create with status `completed`, link to client                         |
| Menus       | `menus` table          | Link to event if possible                                              |
| Recipes     | `recipes` table        | Import with `is_draft: true` for partials                              |
| Financials  | `ledger_entries`       | Revenue as income, expenses as costs                                   |
| Loyalty     | `loyalty_transactions` | Retroactive points via `adjustClientLoyalty()`                         |

**Registration:** Add `archive-digester` to `lib/openclaw/cartridge-registry.ts` on port 8086.

---

## Sync API Endpoints (Port 8086)

```
GET  /api/status                    -- processing stats, queue depth
GET  /api/files?status=pending      -- list unprocessed files
GET  /api/clients                   -- all deduplicated clients
GET  /api/events                    -- all reconstructed events
GET  /api/gaps                      -- gap report
GET  /api/export/chefflow           -- full export package for sync
POST /api/ingest                    -- trigger processing run
POST /api/reprocess/{fileId}        -- reprocess a single file
```

---

## What the Developer Needs to Do (Their Part)

1. **Create `F:\ChefArchive\`** on the PC
2. **Digital dump:** Run Google Takeout (Gmail + Docs + Drive + Photos). Unzip into ChefArchive
3. **Payment exports:** Download Venmo/Zelle/PayPal/Square history as CSV. Drop in ChefArchive
4. **Physical scanning:** Use phone scanner app on all physical receipts, menus, notes, recipes. Save to ChefArchive
5. **Screenshots:** Save any text message screenshots, Wix form screenshots to ChefArchive
6. **Transfer to Pi:** `scp -r /f/ChefArchive/ pi:~/archive-staging/` (or USB drive)
7. **Run the cartridge:** SSH to Pi, start processing
8. **Review gap report:** See what's missing, scan more if needed
9. **Approve sync:** When satisfied, trigger sync to ChefFlow

---

## What This Does NOT Do

- Does not scrape external websites (this is an internal archive processor)
- Does not run on a cron schedule (manual trigger, not automated)
- Does not interfere with price-intel or any other cartridge
- Does not send PII to cloud services. Cloud Vision OCR is used only for receipts/invoices (store names, prices, no client data). All client-facing documents processed locally via Ollama
- Does not generate recipes (extracts them from the developer's own documents)
- Does not auto-import to ChefFlow without approval (export + review + manual sync trigger)

---

## Dependencies

- **Tesseract OCR** installed on Pi (`sudo apt install tesseract-ocr`) - Tier 3 fallback
- **Ollama** running on Pi with: text model (qwen2.5 or similar), multimodal model (LLaVA or Llama-Vision) for Tier 1 image understanding, Whisper model for audio transcription
- **Google Cloud Vision API key** (or Azure Computer Vision) - Tier 2 OCR for blurry/faded/handwritten documents. ~$1.50 per 1,000 images. Only used for non-PII documents (receipts, invoices)
- **Cartridge infrastructure** (verified, shared library available)
- **ChefFlow sync pipeline** (cartridge registry, cron endpoint)

---

## Success Criteria

1. Developer dumps 100+ files into staging folder
2. Cartridge classifies each file with >80% accuracy
3. Entities are extracted and cross-referenced into client/event records
4. Gap report clearly shows what's missing vs what's reconstructed
5. Export produces valid JSON that ChefFlow's sync handler accepts
6. After sync, ChefFlow shows real historical clients, events, and financial data
7. Loyalty points are retroactively calculated and applied correctly

---

## Open Questions (For Developer to Decide Later)

1. **Volume estimate:** How many total files are we talking? Hundreds? Thousands? Affects processing time estimates.
2. **Priority clients:** Process everyone equally, or prioritize active/recent clients first?
3. **Confidence threshold:** Auto-import high-confidence records, manual review for low-confidence? Or review everything?
4. **Recipe handling:** Import partial recipes as drafts, or only import complete recipes?
5. **Photo storage:** Import dish photos into ChefFlow's storage, or just catalog them in the archive DB?
