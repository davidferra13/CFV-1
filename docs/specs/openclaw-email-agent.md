# Spec: OpenCLAW Email Agent (Wholesale Price Harvesting)

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-data-completeness-engine.md` Phase A (USDA import, need canonical ingredients to match against)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** Claude Code session 2026-03-30
> **Note:** Email credentials (IMAP/SMTP) need to be configured in ~/openclaw-email/.env before the agent can send/receive.

---

## What This Does (Plain English)

OpenCLAW gets its own email address (`openclaw@cheflowhq.com`). The Pi uses this email to send templated requests to wholesale distributors, vendor reps, and price list services asking for current pricing. When responses come back (often as PDFs or spreadsheets), the Pi processes them: OCRs the PDF locally via Ollama, extracts prices, matches them to canonical ingredients, and feeds them into the price database. Wholesale prices fill the gap between retail scraping and government baselines, giving chefs access to the real bulk pricing that no grocery website shows.

---

## Why It Matters

Wholesale pricing is the missing tier in the 10-tier resolution chain. Sysco, US Foods, Restaurant Depot, and local distributors all have price lists they share on request. Currently none of that data enters ChefFlow. A chef who buys wholesale has zero price intelligence for their actual purchasing channel. This spec fills that gap using nothing but email (free, no API keys, no scraping ethics concerns).

---

## Architecture

```text
Pi (OpenCLAW Email Agent)
  |
  |-- SEND: templated emails to distributors (10/day max)
  |-- RECEIVE: check inbox every 30 minutes via IMAP
  |-- PROCESS: PDF/XLS -> OCR via Ollama -> extract prices
  |-- STORE: wholesale prices in price database
  |-- MATCH: link extracted items to canonical ingredients
  |
  v
ChefFlow (existing sync pipeline picks up new wholesale prices)
```

**Privacy:** All processing is local. PDFs are OCR'd by Ollama on the Pi. No vendor data leaves the machine. This follows the existing Private AI boundary.

---

## Email Infrastructure

### Email Setup

- **Address:** `openclaw@cheflowhq.com`
- **Provider:** Use existing domain's email (Cloudflare Email Routing or add a mailbox)
- **IMAP access:** For reading incoming responses
- **SMTP access:** For sending outbound requests
- **Credentials:** Stored in Pi environment variables, never in code

### Email Templates

**Template 1: Initial Price List Request**

```text
Subject: Price list request - small catering operation, {region}

Hi,

I run a small catering operation in {city}, {state} and I'm looking into
setting up a wholesale account. Could you send me your current price list
or catalog?

I'm primarily interested in:
- Proteins (chicken, beef, pork, seafood)
- Produce (seasonal and staples)
- Dairy and eggs
- Dry goods and pantry staples

A PDF or spreadsheet works great. Thanks for your time.

Best,
OpenCLAW Price Intelligence
ChefFlow - cheflowhq.com
```

**Template 2: Follow-up (14 days after initial, no response)**

```text
Subject: Re: Price list request - small catering operation, {region}

Hi, just following up on my price list request from two weeks ago.
If there's a better contact for wholesale inquiries, I'd appreciate
being pointed in the right direction. Thanks!
```

**Template 3: Weekly Update Request (for established contacts)**

```text
Subject: Weekly price check - {distributor_name}

Hi {contact_name},

Do you have an updated price list for this week? Particularly interested
in any changes to proteins and seasonal produce.

Thanks,
OpenCLAW Price Intelligence
```

---

## Files to Create (on Pi)

| File                                      | Purpose                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `~/openclaw-email/agent.mjs`              | Main agent: send requests, check inbox, dispatch processing                       |
| `~/openclaw-email/templates.mjs`          | Email templates with variable substitution                                        |
| `~/openclaw-email/pdf-extractor.mjs`      | OCR PDFs via Ollama, extract structured price data                                |
| `~/openclaw-email/spreadsheet-parser.mjs` | Parse XLS/XLSX/CSV attachments into price rows                                    |
| `~/openclaw-email/price-matcher.mjs`      | Match extracted product names to canonical ingredients                            |
| `~/openclaw-email/contacts.json`          | Distributor contact database (name, email, region, last_contacted, response_rate) |
| `~/openclaw-email/package.json`           | Dependencies: nodemailer, imap, pdf-parse, xlsx, better-sqlite3                   |
| `~/openclaw-email/openclaw-email.service` | systemd unit for the inbox checker                                                |

---

## Files to Create (in ChefFlow)

| File                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `lib/openclaw/wholesale-handler.ts` | Sync handler for wholesale prices from Pi |

## Files to Modify (in ChefFlow)

| File                                 | What to Change                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `lib/openclaw/sync-receiver.ts`      | Register new `wholesale-prices` cartridge                                                                    |
| `lib/openclaw/cartridge-registry.ts` | Add wholesale-prices definition                                                                              |
| `lib/pricing/resolve-price.ts`       | Add wholesale tier between API_QUOTE and DIRECT_SCRAPE (new tier 2.5, becomes tier 3 in the reordered chain) |

---

## Database Changes

### On Pi (SQLite)

```sql
CREATE TABLE IF NOT EXISTS wholesale_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  distributor_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  region TEXT,
  category TEXT,                    -- 'broadline', 'produce', 'protein', 'specialty'
  first_contacted_at TEXT,
  last_contacted_at TEXT,
  last_response_at TEXT,
  response_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new'         -- 'new', 'contacted', 'responsive', 'unresponsive', 'opted_out'
);

CREATE TABLE IF NOT EXISTS wholesale_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER REFERENCES wholesale_contacts(id),
  canonical_ingredient_id TEXT,     -- matched to canonical_ingredients
  raw_product_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  unit TEXT,                        -- 'lb', 'case', 'each', 'oz'
  case_size TEXT,                   -- '4x5lb', '30lb case', '12ct'
  case_price_cents INTEGER,
  per_unit_cents INTEGER,           -- computed: price per standard unit
  min_order TEXT,
  source_file TEXT,                 -- filename of the PDF/XLS this came from
  extracted_at TEXT DEFAULT (datetime('now')),
  confidence TEXT DEFAULT 'wholesale_email'
);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL,          -- 'sent' or 'received'
  contact_id INTEGER REFERENCES wholesale_contacts(id),
  subject TEXT,
  template_used TEXT,
  attachment_count INTEGER DEFAULT 0,
  processed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### On ChefFlow (PostgreSQL)

No new migration needed. Wholesale prices sync via the existing `ingredient_price_history` table with `source = 'openclaw_wholesale'`. The cartridge handler maps wholesale_prices rows to the standard format.

---

## Processing Pipeline

### Outbound (Sending Requests)

1. Read `contacts.json` for distributor list
2. Filter: only contacts with `status != 'opted_out'` and `last_contacted_at` > 14 days ago
3. For new contacts: send Template 1
4. For contacts with no response after 14 days: send Template 2 (once only)
5. For responsive contacts: send Template 3 weekly
6. Log every sent email in `email_log`
7. Rate limit: max 10 emails per day (avoid spam flags)

### Inbound (Processing Responses)

1. Check IMAP inbox every 30 minutes
2. For each unread email:
   - Match sender to `wholesale_contacts` by email
   - If unknown sender, skip (could be spam)
   - Extract attachments (PDF, XLS, XLSX, CSV)
   - For PDFs: run through `pdf-extractor.mjs` (Ollama OCR locally)
   - For spreadsheets: run through `spreadsheet-parser.mjs`
   - Match extracted product names to `canonical_ingredients` using fuzzy matching
   - Insert matched prices into `wholesale_prices`
   - Update contact's `last_response_at` and `response_count`
   - Mark email as read
3. Log everything in `email_log`

### PDF Extraction (Ollama Local OCR)

```javascript
// Uses Ollama's vision model to extract structured data from PDF pages
// Each page is converted to an image, sent to Ollama with a structured prompt
const prompt = `Extract all food product prices from this price list image.
Return JSON array: [{"product": "name", "price": "X.XX", "unit": "lb/case/each", "case_size": "if applicable"}]
Only include food items. Skip headers, footers, and non-food items.`

// Process page by page, merge results, deduplicate by product name
```

**Privacy:** Ollama runs locally on the Pi. No vendor data leaves the machine. This is the same privacy boundary as all other OpenCLAW AI operations.

---

## Distributor Contact Seeding

Initial `contacts.json` includes publicly available wholesale contacts for New England:

- **Broadline:** Sysco Boston, US Foods (New England), Performance Foodservice
- **Produce:** Costa Fruit & Produce, Baldor Specialty Foods
- **Protein:** Kayem Foods, North Coast Seafoods
- **Specialty:** Chefs' Warehouse
- **Local:** Restaurant Depot (Everett, MA), Jetro Cash & Carry

All emails are publicly listed business contacts (sales departments, not personal emails). The templates are professional wholesale inquiries, not spam.

---

## Resolution Chain Update

Wholesale prices slot into the existing 10-tier chain. New order:

| Tier | Source                                | Confidence |
| ---- | ------------------------------------- | ---------- |
| 1    | Receipt (actual purchase)             | 1.0        |
| 2    | API Quote (Kroger/Spoonacular/MealMe) | 0.75       |
| 3    | **Wholesale Email (new)**             | **0.8**    |
| 4    | Direct Scrape                         | 0.85       |
| 5    | Flyer                                 | 0.7        |
| 6    | Instacart                             | 0.6        |
| 7    | Regional Average                      | 0.5        |
| 8    | Government                            | 0.4        |
| 9    | Historical                            | 0.3        |
| 10   | Category Baseline                     | 0.2        |

Wholesale gets 0.8 confidence because it's real pricing from actual distributors, but it may be list price (not negotiated price). It slots above direct scrape because wholesale is closer to what a chef actually pays.

---

## Edge Cases and Error Handling

| Scenario                                          | Correct Behavior                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| Distributor replies "remove me from list"         | Set contact status to 'opted_out', never email again                        |
| PDF is scanned/blurry, OCR fails                  | Log failure, keep attachment for manual review, don't insert bad data       |
| Spreadsheet has no price column                   | Log as "unstructured", skip processing, flag for manual review              |
| Same product at different case sizes              | Store both. Compute per_unit_cents for each. Let resolution chain pick best |
| Email bounces                                     | Log bounce, set contact status to 'unresponsive' after 2 bounces            |
| Ollama is offline                                 | Queue PDFs for later processing, don't crash the inbox checker              |
| Price seems unreasonable (< $0.01 or > $500/unit) | Flag but still store. Don't silently drop data.                             |

---

## Verification Steps

- Set up `openclaw@cheflowhq.com` email with IMAP/SMTP access
- Send a test email from the agent to a test address. Verify it arrives with correct template
- Send a test PDF to `openclaw@cheflowhq.com`. Verify inbox checker picks it up within 30 minutes
- Verify PDF is OCR'd via Ollama and prices are extracted to `wholesale_prices` table
- Run ChefFlow sync. Verify wholesale prices appear in `ingredient_price_history` with `source = 'openclaw_wholesale'`
- Query `resolvePrice` for an ingredient with a wholesale price. Verify it shows at the correct tier

---

## Out of Scope

- Automated account creation at distributors (too complex, manual process)
- Payment/ordering through the email agent (this is price intelligence only)
- International distributors (US/New England focus first)
- Phone call automation (email only)
- Negotiating prices via email (just requesting published price lists)

---

## Notes for Builder Agent

1. **Start small.** Seed 5 contacts, not 50. Verify the full pipeline works end-to-end before scaling.

2. **Respect opt-outs immediately.** If anyone replies asking to stop, that contact is permanently blocked. No exceptions.

3. **Rate limit is non-negotiable.** 10 emails/day max. This is a professional inquiry tool, not a mass mailer.

4. **Ollama vision model:** The Pi needs a vision-capable model (llava or similar). Check what's installed with `ollama list`. If no vision model, the PDF extraction falls back to `pdf-parse` (text extraction only, no OCR for scanned documents).

5. **Test with a dummy inbox first.** Don't send real emails until the full pipeline is verified with test data.

6. **The wholesale tier in resolve-price.ts is a simple addition.** Add one more source check between API_QUOTE and DIRECT_SCRAPE. Don't restructure the whole chain.
