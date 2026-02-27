# Dish Index & Menu Upload Pipeline — Implementation Summary

> **Date:** 2026-02-27
> **Status:** Core implementation complete
> **Design doc:** `docs/menu-upload-pipeline.md`

---

## What Was Built

### Database (Migration: `20260327000004_dish_index.sql`)

**4 new enums:**

- `dish_rotation_status` — active, resting, retired, testing
- `dish_prep_complexity` — quick, moderate, intensive
- `dish_plating_difficulty` — simple, moderate, architectural
- `upload_job_status` — uploaded, extracting, parsing, review, completed, failed

**5 new tables:**

| Table              | Purpose                                          | Key Features                                                        |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| `menu_upload_jobs` | Tracks uploaded files through the parse pipeline | Status machine, file hash dedup, OCR confidence                     |
| `dish_index`       | Master catalog of every unique dish              | Canonical name dedup, rotation lifecycle, DNA JSONB, recipe linking |
| `dish_appearances` | Every time a dish appeared on a menu             | Links to jobs, menus, events; client name tracking                  |
| `dish_variations`  | Groups dishes that are variations                | Parent/child with relationship type                                 |
| `dish_feedback`    | Chef's self-assessment per dish                  | 1-5 rating, client reaction, execution notes                        |

**1 new view:**

- `dish_index_summary` — joins dish_index with recipes, cost summary, and feedback averages

**21 indexes, 2 triggers, 5 RLS policies** — all tenant-scoped with chef-only access.

### Dependencies Installed

- `pdf-parse` — PDF text extraction
- `mammoth` — DOCX text extraction
- `tesseract.js` — Local OCR for images (no cloud API)

### Server Actions

**`lib/menus/extract-text.ts`** — Text extraction router

- `extractTextFromPdf()` — pdf-parse
- `extractTextFromDocx()` — mammoth
- `extractTextFromImage()` — Tesseract.js (returns text + confidence)
- `extractTextFromTxt()` — UTF-8 pass-through
- `extractTextFromFile()` — Routes by file extension

**`lib/menus/parse-menu-text.ts`** — Ollama menu parser

- `parseMenuText()` — Structured dish extraction from raw text
- `parseMenuFromPastedText()` — Direct text input
- Course normalization with 30+ aliases (e.g., "main course" → "entrée")
- Uses `qwen3:4b` (fast tier) for classification

**`lib/menus/upload-actions.ts`** — Upload pipeline

- `createUploadJob()` — Create job record
- `getUploadJobs()` / `getUploadJobById()` — Query jobs
- `processUploadJob()` — Full pipeline: extract → parse → save
- `processFromPastedText()` — Paste mode pipeline
- `approveAndIndexDishes()` — Chef-reviewed dishes → dish index (with dedup)
- `checkDuplicateUpload()` — File hash duplicate detection
- `deleteUploadJob()` — Remove incomplete jobs

**`lib/menus/dish-index-actions.ts`** — Dish Index CRUD + analytics

- `createDishIndexEntry()` / `updateDishIndexEntry()` — CRUD with canonical dedup
- `getDishIndex()` — Search with 10 filter types + sort + pagination
- `getDishById()` — Full detail with linked recipe
- `archiveDish()` / `restoreDish()` — Soft delete
- `linkRecipeToDish()` / `unlinkRecipeFromDish()` — Recipe linking
- `getDishAppearances()` / `addDishAppearance()` — History tracking
- `getClientDishHistory()` — Client collision detection
- `addDishFeedback()` / `getDishFeedback()` — Post-event assessment
- `findPotentialDuplicates()` — Sørensen–Dice similarity grouping
- `mergeDishes()` — Merge with appearance/feedback transfer
- `getDishIndexStats()` — Summary stats (totals, coverage, course breakdown)
- `getSeasonalDistribution()` — Monthly appearance heatmap
- `getDishPairings()` — Historical co-occurrence analysis

**`lib/menus/dish-index-constants.ts`** — Shared constants

- Course types, rotation statuses, complexities, seasons
- Labels, colors, and `canonicalizeDishName()` normalizer

### API Route

- `app/api/menus/upload/route.ts` — POST endpoint for file upload + paste processing

### UI Components

- `components/menus/menu-upload-zone.tsx` — Drag-and-drop + paste text upload
- `components/menus/upload-review-panel.tsx` — Side-by-side review (source ↔ parsed)
- `components/menus/dish-index-card.tsx` — Individual dish card with stats

### Pages

| Route                           | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `/menus/upload`                 | Upload menus (files + paste text)                         |
| `/culinary/dish-index`          | Browse/search/filter dish index                           |
| `/culinary/dish-index/[id]`     | Dish detail: appearances, pairings, feedback, recipe link |
| `/culinary/dish-index/insights` | Analytics: course breakdown, seasonal heatmap, duplicates |

---

## Architecture Decisions

1. **Dish Index is separate from Menus** — it's an encyclopedia, not a document. Existing `menus → dishes → components` hierarchy is untouched.
2. **Dedup uses canonical names** — `canonicalizeDishName()` normalizes case, whitespace, and punctuation. Unique constraint on `(tenant_id, canonical_name, course)`.
3. **Fuzzy matching is Sørensen–Dice** — no pg_trgm extension needed. Groups dishes with >70% bigram similarity for chef review.
4. **AI is limited to text parsing** — Ollama reads menu text and identifies dishes. It never generates recipes, suggests content, or creates anything the chef didn't write.
5. **All OCR is local** — Tesseract.js runs in Node.js, no cloud API calls. Data stays on the machine.
6. **File hash dedup** — SHA-256 (when implemented at upload time) prevents reprocessing the same file.

---

## What's NOT Yet Built (Future Phases)

- **Dish DNA fingerprinting** — JSONB field exists but no UI to populate it
- **Dish variation linking UI** — Table exists but no management UI
- **Menu complexity scoring** — Equipment conflicts, hot/cold balance, prep timeline
- **Multi-format export** — PDF catalog, CSV, Markdown
- **Bridge to menu builder** — Search dish index when creating new menus
- **Backfill existing menus** — Migration script to index existing `dishes` records
- **Email/voice upload** — Forwarded email parsing, voice dictation input
- **Progressive trust** — Auto-approve high-confidence parsed dishes
- **Photo vault** — `photo_storage_path` column exists but no upload UI

---

## File Inventory

```
supabase/migrations/20260327000004_dish_index.sql
lib/menus/dish-index-constants.ts
lib/menus/extract-text.ts
lib/menus/parse-menu-text.ts
lib/menus/upload-actions.ts
lib/menus/dish-index-actions.ts
app/api/menus/upload/route.ts
app/(chef)/menus/upload/page.tsx
app/(chef)/menus/upload/upload-client.tsx
app/(chef)/culinary/dish-index/page.tsx
app/(chef)/culinary/dish-index/dish-index-client.tsx
app/(chef)/culinary/dish-index/[id]/page.tsx
app/(chef)/culinary/dish-index/[id]/dish-detail-client.tsx
app/(chef)/culinary/dish-index/insights/page.tsx
app/(chef)/culinary/dish-index/insights/insights-client.tsx
components/menus/menu-upload-zone.tsx
components/menus/upload-review-panel.tsx
components/menus/dish-index-card.tsx
docs/menu-upload-pipeline.md (design doc)
docs/dish-index-implementation.md (this file)
```
