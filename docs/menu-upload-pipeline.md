# Menu Upload Pipeline & Dish Index — Design Document

> **Status:** Design phase — not yet implemented
> **Created:** 2026-02-27
> **Purpose:** Allow chefs to bulk-upload historical menus (PDFs, images, text, DOCX, and RTF files) and automatically build a master Dish Index from 10+ years of service history.

---

## Problem Statement

A private chef with 10 years of experience may have 100+ menus scattered across PDFs, photos of printed menus, Word documents, and plain text files. Today, they must manually re-enter every dish into ChefFlow. This is prohibitively slow — most chefs won't do it, which means ChefFlow loses access to their most valuable data: their complete culinary history.

**The goal:** Upload 100 menus → get a searchable, deduplicated, costed Dish Index in minutes, not months.

---

## Architecture Overview

```
Upload Files (PDF, JPG/JPEG/PNG/HEIC/WEBP, DOCX, TXT, RTF)
    ↓
Text Extraction (deterministic — Tesseract OCR, pdf-parse, mammoth)
    ↓
Structure Recognition (Ollama, local — identifies courses & dishes)
    ↓
Chef Review & Correction (UI — approve/edit parsed results)
    ↓
Deduplication Engine (deterministic + chef confirmation)
    ↓
Master Dish Index (new table: dish_index)
    ↓
Recipe Linking (manual — chef links existing recipes or creates new ones)
    ↓
Costing & Analytics (formula-driven from existing systems)
```

**AI boundary:** Ollama handles ONLY the text-comprehension step (parsing unstructured menu text into structured dish entries). Everything else is deterministic. AI never generates recipes, suggests dishes, or creates content the chef didn't write.

---

## Phase 1: Upload

### Supported Formats

| Format                       | Parser                   | Notes                                      |
| ---------------------------- | ------------------------ | ------------------------------------------ |
| PDF                          | `pdf-parse` (npm)        | Text-based PDFs extracted directly         |
| Image (JPG, JPEG, PNG, HEIC, WEBP) | Tesseract.js (local OCR) | Photos of printed menus and scans          |
| Word (.docx)                 | `mammoth` (npm)          | Common format for emailed menus            |
| Plain text (.txt)            | Pass-through             | Copy-pasted menu text                      |
| Rich text (.rtf)             | Plain-text extraction    | Formatting is ignored                      |

### Upload UX

- **Bulk drag-and-drop zone** — accepts multiple files at once (100+ files)
- **Progress bar per file** — shows extraction → parsing → review status
- **Optional metadata per file:**
  - Event date (helps timeline analytics)
  - Event type (wedding, corporate, intimate dinner, weekly meal prep)
  - Client name (links to client history)
  - Notes (any context the chef wants to add)
- **Batch metadata:** "Apply to all" option for common fields (e.g., all files are from 2019)

### Storage

- Raw uploaded files → Supabase Storage bucket (`menu-uploads`)
- Extracted text → stored in `menu_upload_jobs` table for audit trail
- Files are tenant-scoped and RLS-protected

### Database: `menu_upload_jobs`

```sql
CREATE TABLE menu_upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,               -- 'pdf', 'jpg', 'png', 'docx', 'txt', 'rtf', etc.
  file_storage_path TEXT,                -- Supabase Storage path
  extracted_text TEXT,                   -- Raw OCR/parsed text
  parsed_dishes JSONB,                   -- Structured output from Ollama
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded → extracting → parsing → review → completed → failed
  event_date DATE,                       -- Optional: when was this menu served?
  event_type TEXT,                       -- Optional: wedding, corporate, etc.
  client_name TEXT,                      -- Optional: who was this for?
  notes TEXT,                            -- Optional: chef's notes
  error_message TEXT,                    -- If extraction or parsing failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Text Extraction

### Pipeline

```
file → detect format → extract text → normalize whitespace → store
```

### Implementation

```typescript
// lib/menus/extract-text.ts

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'pdf':
      return extractFromPdf(file) // pdf-parse
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'heic':
    case 'webp':
      return extractFromImage(file) // Tesseract.js (local)
    case 'docx':
      return extractFromDocx(file) // mammoth
    case 'txt':
    case 'rtf':
      return extractFromText(file) // read as UTF-8
    default:
      throw new Error(`Unsupported format: ${ext}`)
  }
}
```

### OCR Considerations

- **Tesseract.js** runs in-browser or server-side (no external API, data stays local)
- **Language:** English default, configurable per upload
- **Confidence threshold:** Flag low-confidence OCR results for manual review
- **Image preprocessing:** Auto-rotate, deskew, contrast enhancement before OCR
- **Handwriting:** Tesseract handles printed text well; handwritten menus flagged for manual transcription

---

## Phase 3: Structure Recognition (Ollama — Local AI)

### Why AI Is Appropriate Here

Menu text is inherently unstructured. The same information can be presented in dozens of formats:

```
-- Format A: Course headers with descriptions
FIRST COURSE
Pan-Seared Diver Scallops
with cauliflower purée, brown butter, and microgreens

-- Format B: Numbered courses, no descriptions
1. Amuse-Bouche: Tuna Tartare
2. Soup: Butternut Squash Bisque
3. Entrée: Rack of Lamb

-- Format C: Free-form prose
To start, we'll have a selection of passed canapés including
beef tartare on crostini and smoked salmon blinis, followed by
a seated first course of...

-- Format D: Simple list
Bruschetta
Caesar Salad
Grilled Salmon
Chocolate Mousse
```

A formula can't reliably parse all of these. Ollama can — and it's reading text the chef already wrote, not generating anything new.

### Ollama Prompt

```
You are a menu parser for a private chef platform. Extract dishes from this menu text.

For each dish, identify:
- dish_name: The name of the dish (e.g., "Pan-Seared Diver Scallops")
- course: Which course this belongs to (appetizer, soup, salad, fish, entrée, cheese, dessert, amuse, canapé, side, beverage, other)
- description: Any description text that accompanies the dish (e.g., "with cauliflower purée, brown butter, and microgreens")
- dietary_tags: Any dietary indicators mentioned (GF, V, VG, DF, NF, etc.)

Rules:
- Extract ONLY what is written on the menu. Do NOT add, infer, or generate any information.
- If a course heading is missing, infer the most likely course from the dish name and position.
- If a dish has no description, leave description empty.
- Return a JSON array of objects.

Menu text:
"""
{extracted_text}
"""
```

### Output Schema

```typescript
interface ParsedDish {
  dish_name: string
  course: string
  description: string
  dietary_tags: string[]
  confidence: number // 0-1, how confident the parser is
}

interface ParseResult {
  dishes: ParsedDish[]
  warnings: string[] // e.g., "Low OCR quality on lines 12-15"
  raw_text: string // Original extracted text for reference
}
```

### Model Selection

- **Primary:** `qwen3:4b` (fast tier) — menu parsing is a classification task, not complex reasoning
- **Fallback:** `qwen3:30b` (complex tier) — for menus with unusual formatting or prose-style descriptions
- **Privacy:** All processing via `parseWithOllama` — data never leaves the machine

---

## Phase 4: Chef Review & Correction

### Review UI

After parsing, the chef sees a **side-by-side view:**

| Left Panel (Source)       | Right Panel (Parsed Result)       |
| ------------------------- | --------------------------------- |
| Original menu text/image  | Editable list of extracted dishes |
| Highlighted text segments | Course assignment dropdowns       |
| OCR confidence indicators | Add/remove/edit dish buttons      |

### Chef Actions

- **Approve dish** — parsed correctly, add to index
- **Edit dish** — fix name, course, description, or tags
- **Split dish** — one parsed entry is actually two dishes
- **Merge dishes** — two parsed entries are actually one dish
- **Delete dish** — parser hallucinated or this isn't a real dish
- **Add dish** — parser missed a dish, chef adds manually
- **Flag for later** — unsure, come back to this one

### Batch Operations

- **"Approve All"** — when parsing is clean, approve everything at once
- **"Apply course to selected"** — select multiple dishes, set course in one click
- **Course auto-detect confidence:** High-confidence (>0.9) dishes are pre-approved; low-confidence (<0.7) are highlighted for review

---

## Phase 5: Dish Index (Core Data Model)

### New Table: `dish_index`

```sql
CREATE TABLE dish_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,                        -- "Pan-Seared Chilean Sea Bass"
  canonical_name TEXT NOT NULL,              -- Lowercase, normalized for dedup
  course TEXT NOT NULL,                      -- appetizer, entrée, dessert, etc.
  description TEXT,                          -- "with Lemon Beurre Blanc"
  dietary_tags TEXT[] DEFAULT '{}',
  allergen_flags TEXT[] DEFAULT '{}',
  prep_complexity TEXT,                      -- quick, moderate, intensive
  can_prep_ahead BOOLEAN,                   -- yes/no/null
  special_equipment TEXT[],                  -- sous vide, torch, smoker, etc.
  plating_difficulty TEXT,                   -- simple, moderate, architectural
  photo_storage_path TEXT,                   -- Plating photo in Supabase Storage
  linked_recipe_id UUID REFERENCES recipes(id), -- Manual link to Recipe Bible
  first_served DATE,                         -- Earliest appearance
  last_served DATE,                          -- Most recent appearance
  times_served INTEGER DEFAULT 0,            -- Count of menu appearances
  is_signature BOOLEAN DEFAULT FALSE,        -- Chef's signature dishes
  season_affinity TEXT[],                    -- spring, summer, fall, winter
  tags TEXT[] DEFAULT '{}',                  -- Chef's custom tags
  notes TEXT,                                -- Chef's private notes
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, canonical_name, course)
);
```

### New Table: `dish_appearances`

Tracks every time a dish appeared on a menu — the history layer.

```sql
CREATE TABLE dish_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  menu_upload_job_id UUID REFERENCES menu_upload_jobs(id), -- Which upload this came from
  menu_id UUID REFERENCES menus(id),                        -- If linked to a ChefFlow menu
  event_id UUID REFERENCES events(id),                      -- If linked to an event
  event_date DATE,                                           -- When it was served
  event_type TEXT,                                           -- Wedding, corporate, etc.
  client_name TEXT,                                          -- Who it was served to
  variation_notes TEXT,                                      -- "Added gremolata this time"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `dish_variations`

Groups dishes that are variations of the same core dish.

```sql
CREATE TABLE dish_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  parent_dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  variant_dish_id UUID NOT NULL REFERENCES dish_index(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'variation',  -- variation, seasonal_swap, upgrade, simplified
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(parent_dish_id, variant_dish_id),
  CHECK(parent_dish_id != variant_dish_id)
);
```

### Deduplication Engine

**Step 1 — Exact match (deterministic):**

```sql
-- Normalize: lowercase, strip extra spaces, remove common filler words
SELECT * FROM dish_index
WHERE tenant_id = $1
AND canonical_name = normalize(new_dish_name)
AND course = new_course
```

**Step 2 — Fuzzy match flagging (deterministic):**

```typescript
// Levenshtein distance, trigram similarity, or pg_trgm extension
// Flag pairs with >0.7 similarity for chef review
// Examples:
//   "Pan-Seared Salmon" vs "Pan Seared Salmon" → 0.95 → auto-merge candidate
//   "Seared Salmon" vs "Grilled Salmon" → 0.75 → flag for review
//   "Salmon" vs "Salmon Tartare" → 0.55 → probably different dishes
```

**Step 3 — Chef decision (always human):**

- System presents potential duplicates in groups
- Chef decides: merge (same dish), link as variation, or keep separate
- Chef picks the "canonical" name for merged dishes

---

## Phase 6: Recipe Linking (Never Generation)

### Chef Workflow

For each dish in the index, the chef has exactly three options:

1. **Link to existing recipe** — search the Recipe Bible, select a match
2. **Create recipe manually** — opens recipe form, pre-filled with dish name and description only. Chef enters all ingredients, quantities, methods, and instructions.
3. **Skip** — dish exists in the index without a recipe (valid indefinitely)

### What AI Does Here: NOTHING

- No recipe generation
- No ingredient suggestions
- No "here's how to make this"
- No auto-fill from training data or internet
- The dish index and recipe book are separate concerns

### Linking UI

```
┌─────────────────────────────────────┐
│ Pan-Seared Chilean Sea Bass         │
│ Course: Entrée                      │
│ Served: 23 times (2016–2025)        │
│                                     │
│ Recipe: [Not linked]                │
│                                     │
│ [Search Recipe Bible]  [Create New] │
│ [Skip — No Recipe Needed]           │
└─────────────────────────────────────┘
```

---

## Phase 7: Analytics & Intelligence (All Formula-Driven)

### 7.1 Dish Popularity Dashboard

```sql
-- Top 10 most-served dishes
SELECT di.name, di.course, di.times_served, di.first_served, di.last_served
FROM dish_index di
WHERE di.tenant_id = $1 AND di.archived = false
ORDER BY di.times_served DESC
LIMIT 10;
```

### 7.2 Seasonal Pattern Analysis

```sql
-- Dishes by season
SELECT di.name,
  EXTRACT(MONTH FROM da.event_date) as month,
  COUNT(*) as times_in_month
FROM dish_index di
JOIN dish_appearances da ON da.dish_id = di.id
WHERE di.tenant_id = $1
GROUP BY di.name, EXTRACT(MONTH FROM da.event_date)
ORDER BY di.name, month;
```

### 7.3 Client Collision Detection

```sql
-- Dishes a specific client has already been served
SELECT di.name, di.course, da.event_date
FROM dish_appearances da
JOIN dish_index di ON di.id = da.dish_id
WHERE da.tenant_id = $1
AND da.client_name = $2  -- or da.event_id IN (SELECT id FROM events WHERE client_id = $3)
ORDER BY da.event_date DESC;
```

### 7.4 Allergen Cross-Reference

```sql
-- Check menu dishes against client allergies (deterministic)
SELECT di.name, di.allergen_flags,
  ARRAY(
    SELECT UNNEST(di.allergen_flags)
    INTERSECT
    SELECT UNNEST(c.allergies)
  ) AS conflicting_allergens
FROM dish_index di
JOIN client_dietary_profiles c ON c.client_id = $2
WHERE di.id = ANY($1)  -- dishes being considered for the menu
AND di.allergen_flags && c.allergies;  -- array overlap operator
```

### 7.5 Menu Structure Templates

```sql
-- Chef's most common menu structures
SELECT
  array_agg(DISTINCT da.event_type) as event_types,
  COUNT(*) as times_used,
  (
    SELECT array_agg(course ORDER BY course_order)
    FROM (
      SELECT DISTINCT di.course, MIN(di_sort.sort_order) as course_order
      FROM dish_appearances da2
      JOIN dish_index di ON di.id = da2.dish_id
      LEFT JOIN dishes di_sort ON di_sort.menu_id = da2.menu_id
      WHERE da2.menu_upload_job_id = da.menu_upload_job_id
      GROUP BY di.course
    ) sub
  ) as course_sequence
FROM dish_appearances da
WHERE da.tenant_id = $1
GROUP BY course_sequence
ORDER BY times_used DESC;
```

### 7.6 Ingredient Frequency (from linked recipes)

```sql
-- Top ingredients across all dishes with linked recipes
SELECT i.name, i.category, COUNT(DISTINCT di.id) as dish_count
FROM dish_index di
JOIN recipes r ON r.id = di.linked_recipe_id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredients i ON i.id = ri.ingredient_id
WHERE di.tenant_id = $1
GROUP BY i.name, i.category
ORDER BY dish_count DESC
LIMIT 20;
```

### 7.7 Cost Evolution

```sql
-- How a dish's cost has changed over time (requires recipe + ingredient price history)
SELECT di.name,
  iph.recorded_at,
  SUM(ri.quantity * iph.price_cents / iph.quantity) as estimated_cost_cents
FROM dish_index di
JOIN recipes r ON r.id = di.linked_recipe_id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredient_price_history iph ON iph.ingredient_id = ri.ingredient_id
WHERE di.tenant_id = $1 AND di.id = $2
GROUP BY di.name, iph.recorded_at
ORDER BY iph.recorded_at;
```

---

## Phase 8: Additional Improvements (Round 3)

### 8.1 Dish DNA Fingerprinting

Every dish gets a computed "DNA" — a set of attributes that make it findable by characteristics, not just name:

```sql
ALTER TABLE dish_index ADD COLUMN dna JSONB DEFAULT '{}';

-- Example DNA:
{
  "protein": "salmon",
  "cooking_method": "pan-seared",
  "sauce_family": "beurre blanc",
  "starch": "fingerling potatoes",
  "cuisine_influence": "french",
  "temperature": "hot",
  "texture_profile": ["crispy_skin", "flaky_flesh", "creamy_sauce"],
  "flavor_profile": ["rich", "bright", "buttery"],
  "color_palette": ["golden", "white", "green"]
}
```

**Use case:** Chef is building a menu and needs "something with a crispy element" or "a cold starter" or "something with Asian influence." DNA search finds dishes by characteristics, not names.

**Who fills this in:** The chef — manually, over time. Fields are optional. The system never auto-fills DNA from AI. But the UI makes it easy: dropdown selectors for common values, not free text.

### 8.2 Dish Retirement & Rotation Tracking

```sql
ALTER TABLE dish_index ADD COLUMN retired_at TIMESTAMPTZ;
ALTER TABLE dish_index ADD COLUMN retirement_reason TEXT;
ALTER TABLE dish_index ADD COLUMN rotation_status TEXT DEFAULT 'active';
  -- active: in regular rotation
  -- resting: intentionally benched (overused, seasonal break)
  -- retired: no longer served (recipe lost, ingredient unavailable, etc.)
  -- testing: new dish being tried out
```

**Use case:** "I've served Braised Short Ribs 31 times — it needs a rest." Chef marks it as "resting" with a note. System excludes resting dishes from menu builder suggestions (dish index search, not AI suggestions). Chef can reactivate anytime.

### 8.3 Event-to-Dish Satisfaction Scoring

```sql
CREATE TABLE dish_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES dish_index(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  event_id UUID REFERENCES events(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- Chef's own assessment
  client_reaction TEXT,     -- "loved it", "asked for seconds", "left some"
  execution_notes TEXT,     -- "Overcooked slightly", "Plating was perfect"
  would_serve_again BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Use case:** After every event, the chef can rate how each dish went. Over time, this builds a "batting average" per dish. The chef sees: "Braised Short Ribs: 4.8/5 across 31 servings, 100% would serve again" vs. "Tuna Tartare: 3.2/5, two clients left it untouched."

**This is the chef's own judgment** — not client reviews, not AI scoring. The chef knows their food better than anyone.

### 8.4 Menu Pairing Intelligence (Formula, Not AI)

When a chef adds a dish to a menu, the system surfaces **historical pairings** — what other dishes have accompanied this one in previous menus:

```sql
-- "When you served Pan-Seared Sea Bass, you usually paired it with:"
SELECT paired.name, paired.course, COUNT(*) as times_paired
FROM dish_appearances da1
JOIN dish_appearances da2 ON da2.menu_upload_job_id = da1.menu_upload_job_id
  AND da2.dish_id != da1.dish_id
JOIN dish_index paired ON paired.id = da2.dish_id
WHERE da1.dish_id = $1  -- the dish being added
AND da1.tenant_id = $2
GROUP BY paired.name, paired.course
ORDER BY times_paired DESC
LIMIT 10;
```

**This is a database query, not a suggestion engine.** It's showing the chef their own history: "You've paired sea bass with risotto 8 times and with fingerling potatoes 12 times." The chef decides what to pair — the system just surfaces their own patterns.

### 8.5 Multi-Format Export

The Dish Index should be exportable for uses outside ChefFlow:

| Format                   | Use Case                               |
| ------------------------ | -------------------------------------- |
| **PDF catalog**          | Print-ready dish catalog for marketing |
| **CSV/Excel**            | Accounting, external analysis, backup  |
| **Markdown**             | Website content, proposals             |
| **Branded PDF per menu** | Client-facing menu presentation        |

All exports use the chef's brand colors and typography (terracotta orange, DM Serif Display).

### 8.6 Dish Index ↔ Existing Menu System Bridge

The Dish Index must integrate with the existing menu system, not replace it:

- **When creating a new menu** (`/menus/new`): Chef can search the Dish Index and add dishes directly → creates the corresponding `dishes` record in the existing menu hierarchy
- **When a menu is finalized** (status → locked): Any new dishes automatically get indexed into the Dish Index with an appearance record
- **Backfill existing menus:** One-time migration script scans all existing `menus → dishes` records and creates Dish Index entries + appearances

```
Existing system:          menus → dishes → components → recipes
New Dish Index:           dish_index → dish_appearances

Bridge:
  - dish_index.linked_recipe_id → recipes.id (same Recipe Bible)
  - dish_appearances.menu_id → menus.id (links back to existing menus)
  - dish_appearances.event_id → events.id (links to events)
  - New menus pull from dish_index (search + add)
  - Locked menus push into dish_index (auto-index)
```

### 8.7 Upload Queue & Background Processing

100 menus shouldn't block the UI. The upload pipeline should be queue-based:

1. Chef drops 100 files → all uploaded to Supabase Storage immediately
2. `menu_upload_jobs` records created with status `uploaded`
3. Background worker processes one file at a time:
   - `uploaded → extracting` (OCR/text extraction)
   - `extracting → parsing` (Ollama structure recognition)
   - `parsing → review` (ready for chef review)
4. Chef sees a dashboard: "47 of 100 menus processed, 12 ready for review"
5. Chef can review processed menus while others are still being parsed

### 8.8 Handwriting Mode

For handwritten menus (common with experienced chefs who sketch menus on paper):

- **Enhanced OCR pipeline:** Preprocessing (binarization, line detection, word segmentation) before Tesseract
- **Confidence flagging:** Handwriting OCR is less reliable — aggressively flag low-confidence words
- **Manual transcription fallback:** If OCR confidence is too low, show the image and let the chef type the menu text manually
- **The system never guesses.** If it can't read a word, it shows `[???]` and lets the chef fill it in.

### 8.9 Dish Index Search & Filtering

The Dish Index needs a powerful search UI:

| Filter          | Type         | Example                |
| --------------- | ------------ | ---------------------- |
| Name            | Text search  | "salmon"               |
| Course          | Multi-select | Appetizer, Entrée      |
| Dietary tags    | Multi-select | GF, V, DF              |
| Season          | Multi-select | Spring, Summer         |
| Times served    | Range        | 5–20                   |
| Date range      | Date picker  | 2020–2023              |
| Has recipe      | Boolean      | Yes/No                 |
| Rotation status | Multi-select | Active, Resting        |
| Prep complexity | Multi-select | Quick, Moderate        |
| Client          | Autocomplete | "Johnson"              |
| Custom tags     | Multi-select | "Signature", "Holiday" |

**Sort options:** Most served, recently served, alphabetical, recently added, highest rated.

### 8.10 Dish Index Insights Dashboard

A dedicated analytics page showing:

- **Total dishes:** 247 unique dishes across 100 events
- **Course breakdown:** Pie chart (42 appetizers, 68 entrées, etc.)
- **Seasonal heatmap:** Which months have the most dish variety
- **Growth over time:** Line chart of cumulative unique dishes by year
- **Recipe coverage:** "193 of 247 dishes have linked recipes (78%)"
- **Top 10 most served:** Bar chart
- **Retirement tracker:** "12 dishes retired, 5 resting, 230 active"
- **Client diversity:** "Average client has been served 14 unique dishes"
- **Signature dishes:** Chef's self-selected best work

All computed from SQL queries. No AI. Pure data visualization.

---

## Integration with Existing Systems

### How This Connects to What Already Exists

| Existing System                       | Integration Point                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Menus** (`menus` table)             | Dish Index entries created when menus are locked; Dish Index searchable when creating new menus |
| **Dishes** (`dishes` table)           | Existing dishes backfilled into Dish Index on migration                                         |
| **Recipes** (`recipes` table)         | Dish Index links to Recipe Bible via `linked_recipe_id`                                         |
| **Ingredients** (`ingredients` table) | Accessible through recipe link chain                                                            |
| **Events** (`events` table)           | Dish appearances linked to events for history                                                   |
| **Clients** (`clients` table)         | Client collision detection via appearance history                                               |
| **Grocery Quote**                     | Available for any dish with a linked recipe                                                     |
| **Menu Approval**                     | No change — approval workflow operates on `menus`, not dish index                               |
| **Recipe Scaling**                    | Available for any linked recipe                                                                 |
| **Nutrition Panel**                   | Available for any linked recipe (USDA integration)                                              |
| **Menu Muse**                         | Can pull from Dish Index instead of just Recipe Bible                                           |
| **Costing Views**                     | `recipe_cost_summary` already exists — Dish Index leverages it                                  |

### What This Does NOT Replace

- The existing `menus → dishes → components` hierarchy stays exactly as-is
- The existing Recipe Bible stays exactly as-is
- The Dish Index is an **additional layer** — a catalog that sits alongside the menu system
- Think of it as: menus are documents, the Dish Index is the encyclopedia

---

## Privacy & Data Safety

- **All OCR runs locally** (Tesseract.js, no cloud API)
- **All AI parsing runs locally** (Ollama, `parseWithOllama`)
- **Uploaded files stay in tenant-scoped Supabase Storage** (same security as existing uploads)
- **No menu data is ever sent to external AI** — not Gemini, not OpenAI, not any cloud LLM
- **Recipe generation ban applies** — AI parses what the chef wrote, never generates new content

---

## Tier Assignment

- **Upload & parse:** Pro feature (module: `culinary-tools` or new `dish-intelligence` module)
- **Dish Index basic CRUD:** Free tier (viewing, manual entry, linking recipes)
- **Analytics dashboard:** Pro feature
- **Bulk operations:** Pro feature
- **Export:** Pro feature

---

## Implementation Priority

| Phase | What                                       | Effort | Value                                              |
| ----- | ------------------------------------------ | ------ | -------------------------------------------------- |
| 1     | Upload + text extraction                   | Medium | Foundation — nothing works without this            |
| 2     | Ollama parsing + review UI                 | Medium | The "magic" — turns documents into structured data |
| 3     | Dish Index table + basic CRUD              | Small  | The core data model                                |
| 4     | Deduplication engine                       | Medium | Makes 100 menus useful instead of messy            |
| 5     | Bridge to existing menu system             | Small  | Connects new to old                                |
| 6     | Recipe linking UI                          | Small  | Leverages existing Recipe Bible                    |
| 7     | Analytics & insights                       | Medium | The long-term value proposition                    |
| 8     | Advanced features (DNA, feedback, pairing) | Large  | Differentiators                                    |

---

## Open Questions

1. **OCR library choice:** Tesseract.js (browser-side) vs. Tesseract on server (Node binding)? Server-side is faster but requires native dependencies.
2. **Queue implementation:** Simple database polling vs. proper job queue (BullMQ, pg-boss)? Database polling is simpler and ChefFlow already uses Supabase.
3. **Backfill scope:** Should the migration auto-index ALL existing `dishes` records, or only from `locked`/`archived` menus?
4. **Dish Index page location:** `/culinary/dish-index` (under existing culinary nav) or `/dishes` (top-level)?
5. **Storage limits:** Should there be a cap on uploaded files per tenant? (Pro tier consideration)
