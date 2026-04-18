# Spec: Data Export (Takeout)

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date             | Agent/Session     | Commit |
| --------------------- | ---------------- | ----------------- | ------ |
| Created               | 2026-04-18 22:00 | opus main session |        |
| Status: ready         |                  |                   |        |
| Claimed (in-progress) |                  |                   |        |
| Spike completed       |                  |                   |        |
| Pre-flight passed     |                  |                   |        |
| Build completed       |                  |                   |        |
| Type check passed     |                  |                   |        |
| Build check passed    |                  |                   |        |
| Playwright verified   |                  |                   |        |
| Status: verified      |                  |                   |        |

---

## Developer Notes

### Raw Signal

Developer asked "how can ChefFlow adopt things Google Takeout does?" The motivation: data portability as chef autonomy. ChefFlow already has scattered individual exports (client CSV, event CSV, CPA tax ZIP, 20+ PDF generators), but no unified "take your data and go" surface. The developer sees this as a natural extension of the platform philosophy: self-hosted, no lock-in, chef owns everything.

### Developer Intent

- **Core goal:** One page where a chef can select data categories and download everything as a single organized ZIP.
- **Key constraints:** Free tier (not paid), no new tables, reuse existing export infrastructure (fflate, csvRowSafe, PDF generators, ICS). Self-hosted, $0 cost. No cloud dependency.
- **Motivation:** Data portability = trust. Chefs are more likely to commit to a platform they can leave. Also useful for backups, accountant handoffs, and platform migration.
- **Success from the developer's perspective:** A chef clicks "Export My Data," picks categories, gets a ZIP with organized folders containing human-readable files. Works for a chef with 1 event or 500.

---

## What This Does (Plain English)

Adds a "Data Export" page under Settings where a chef can select which categories of data to export (recipes, clients, events, financials, menus, documents, conversations, photos, profile), choose formats where applicable (CSV vs JSON, with/without PDFs), and download everything as a single ZIP file organized into folders. Small exports download instantly; large exports (100MB+ of photos) stream progressively. No new database tables. Reuses every existing export module.

---

## Why It Matters

ChefFlow holds a chef's entire business: recipes (their IP), client relationships, financial history, and operational records. A chef who cannot take their data with them is trapped. This feature eliminates lock-in fear and doubles as a self-serve backup. The CPA export proved the pattern works; this generalizes it to the whole platform.

---

## Files to Create

| File                                                     | Purpose                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/(chef)/settings/data-export/page.tsx`               | Settings page: category picker, format options, download trigger  |
| `app/(chef)/settings/data-export/data-export-client.tsx` | Client component: interactive checkboxes, progress bar, download  |
| `lib/exports/data-takeout-actions.ts`                    | Server actions: build per-category data, assemble ZIP, stream     |
| `lib/exports/takeout-categories.ts`                      | Category registry: what to export, which tables, which formatters |

## Files to Modify

| File                                    | What to Change                                 |
| --------------------------------------- | ---------------------------------------------- |
| `components/navigation/nav-config.tsx`  | Add "Data Export" entry under Settings section |
| `lib/billing/feature-classification.ts` | Register `data-export` as `tier: 'free'`       |

---

## Database Changes

None. Pure read-only feature. Queries existing tables, formats, zips, downloads.

---

## Data Model

No new entities. The feature reads from existing tables organized into export categories:

### Export Categories

| Category               | Source Tables                                                                              | Output Format                                | Notes                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Recipes**            | `recipes`, `recipe_ingredients`, `components`, `recipe_tags`                               | JSON + optional PDF (recipe cards)           | Chef IP. Most important category. JSON includes full ingredient lists, instructions, tags, yield, timing |
| **Clients**            | `clients`, `client_preferences`, `client_allergy_records`, `client_taste_profiles`         | CSV (primary) + JSON (full)                  | Reuses existing `/clients/csv-export` logic. JSON adds preferences/allergies/taste profiles              |
| **Events**             | `events`, `event_guests`, `event_staff_assignments`, `event_state_transitions`             | CSV (summary) + JSON (full) + ICS (calendar) | Reuses existing `/events/csv-export` + `generateICS`. JSON includes guest lists, staff, state history    |
| **Financials**         | `ledger_entries`, `expenses`, `commerce_payments`, `event_financial_summary` view          | CSV (ledger + expenses) + JSON               | Reuses existing `lib/exports/actions.ts` + CPA export patterns. Ledger-derived, always accurate          |
| **Menus**              | `menus`, `menu_sections`, `menu_items`                                                     | JSON + optional PDF                          | Reuses `generate-menu-pdf.ts` for PDFs                                                                   |
| **Documents**          | `chef_documents`, stored files in `./storage/`                                             | Original files (PDF, images)                 | Copies stored files as-is. Includes contracts, invoices, generated PDFs                                  |
| **Conversations**      | `conversations`, `chat_messages`                                                           | JSON                                         | Client conversation history. Messages grouped by conversation thread                                     |
| **Photos**             | `entity_photos`, `event_photos`, `client_photos`                                           | Original image files                         | Largest category by size. Organized into subfolders by entity                                            |
| **Profile & Settings** | `chefs`, `chef_profiles`, `chef_preferences`, `chef_service_config`, `chef_pricing_config` | JSON                                         | Business name, bio, service types, pricing rules, preferences. Portable config                           |
| **Ingredients**        | `ingredients`, `ingredient_prices`                                                         | CSV + JSON                                   | Chef's ingredient catalog with price history                                                             |

---

## Server Actions

| Action                                  | Auth            | Input                                                                    | Output                                                                | Side Effects                                                                    |
| --------------------------------------- | --------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `estimateTakeoutSize(categories)`       | `requireChef()` | `{ categories: string[] }`                                               | `{ totalEstimateBytes: number, perCategory: Record<string, number> }` | None (read-only)                                                                |
| `buildTakeoutZip(categories, options)`  | `requireChef()` | `{ categories: string[], includePhotos: boolean, includePDFs: boolean }` | `{ zipBase64: string, filename: string, manifest: TakeoutManifest }`  | None (read-only). For small exports (<50MB)                                     |
| `streamTakeoutZip(categories, options)` | `requireChef()` | Same as above                                                            | Streams ZIP chunks via response                                       | For large exports. Falls back from `buildTakeoutZip` when estimated size > 50MB |

### TakeoutManifest (included in every ZIP as `manifest.json`)

```ts
type TakeoutManifest = {
  version: '1.0'
  exportedAt: string // ISO timestamp
  chefName: string
  businessName: string | null
  categories: string[] // which categories were selected
  counts: Record<string, number> // e.g. { recipes: 47, clients: 23, events: 112 }
  format: 'chefflow-takeout-v1'
}
```

---

## UI / Component Spec

### Page Layout

`/settings/data-export` -- single-page, no tabs.

```
+--------------------------------------------------+
|  Data Export                                      |
|  Download a copy of your ChefFlow data.           |
|  Nothing is deleted. This is a copy.             |
|                                                  |
|  [ ] Select All                                  |
|  ------------------------------------------------|
|  [x] Recipes (47 recipes)              ~2 MB     |
|  [x] Clients (23 clients)              ~1 MB     |
|  [x] Events (112 events)               ~3 MB     |
|  [ ] Financials (ledger + expenses)     ~1 MB     |
|  [ ] Menus (8 menus)                    ~500 KB   |
|  [ ] Documents (contracts, invoices)    ~12 MB    |
|  [ ] Conversations (31 threads)         ~4 MB     |
|  [ ] Photos (245 photos)               ~890 MB   |
|  [ ] Ingredients (156 items)            ~200 KB   |
|  [ ] Profile & Settings                 ~50 KB    |
|  ------------------------------------------------|
|  Options:                                        |
|  [x] Include PDFs (recipe cards, menus)          |
|  [ ] Include original photos                     |
|                                                  |
|  Estimated size: ~6 MB                           |
|                                                  |
|  [ Download My Data ]                            |
|                                                  |
|  Last export: April 12, 2026                     |
+--------------------------------------------------+
```

### States

- **Loading:** Skeleton cards while category counts and size estimates load
- **Empty:** "You don't have any data to export yet. Start by adding your first recipe or client." (Not zeros, not a dead end)
- **Error:** "Something went wrong preparing your export. Try again or export fewer categories." Toast with error detail
- **Populated:** Category checklist with counts and estimated sizes (as shown above)
- **Exporting:** Progress bar replaces download button. "Preparing your data..." with category-by-category progress. Cancel button available
- **Complete:** "Your download is ready." Auto-triggers browser download. Button reverts to "Download My Data"

### Interactions

1. **Category toggle:** Checkbox per category. "Select All" toggles everything. Estimated total size recalculates on every toggle
2. **Download button:** Disabled until at least one category selected. Click triggers `buildTakeoutZip` (small) or `streamTakeoutZip` (large). Shows progress bar during generation
3. **Size warning:** If estimated size > 500MB, show info banner: "Large export. This may take a minute." If > 2GB, warn about browser download limits and suggest excluding photos
4. **Photos toggle:** Separate from category checkboxes because photos dominate size. "Include original photos" defaults to OFF to avoid accidental huge downloads

---

## ZIP Structure

```
chefflow-export-2026-04-18/
  manifest.json
  recipes/
    recipes.json              # all recipes as JSON array
    recipe-cards/             # optional PDFs, one per recipe
      mushroom-risotto.pdf
      grilled-salmon.pdf
  clients/
    clients.csv               # spreadsheet-ready
    clients.json              # full data with preferences
  events/
    events.csv                # summary spreadsheet
    events.json               # full data with guests, staff, transitions
    events.ics                # importable calendar file (all events)
  financials/
    ledger.csv                # all ledger entries
    expenses.csv              # all expenses
    financials.json           # combined with computed summaries
  menus/
    menus.json
    menu-pdfs/                # optional
      tasting-menu-march.pdf
  documents/
    contracts/
    invoices/
    generated/
  conversations/
    conversations.json        # all threads with messages
  photos/
    events/
      [event-name]/
        photo1.jpg
    clients/
    recipes/
  ingredients/
    ingredients.csv
    ingredients.json
  profile/
    profile.json              # chef profile, preferences, config
    services.json             # service types and pricing rules
```

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chef has zero data in all categories         | Show empty state, not checkboxes with "0 items"                                                                   |
| Chef has data in some categories, not others | Show all categories. Empty ones show "(0 items)" and are unchecked by default                                     |
| Photos exceed 2GB                            | Warn about browser download limits. Suggest excluding photos or exporting photos separately                       |
| ZIP generation fails mid-stream              | Show error toast. Partial ZIP is not downloaded. "Try again with fewer categories"                                |
| PDF generation fails for one recipe          | Skip that PDF, include a `_errors.txt` in the recipes folder noting which PDFs failed. Do not abort entire export |
| Very large recipe collection (500+)          | Batch PDF generation. Progress bar shows "Generating recipe cards (47/500)..."                                    |
| Concurrent export requests                   | Ignore duplicate clicks. Button disabled while export is in progress                                              |
| Browser disconnects during large download    | No server-side state to clean up (stateless). Chef can retry                                                      |
| Storage files missing on disk                | Skip missing files, note in `_errors.txt`. Do not abort                                                           |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/settings/data-export`
3. Verify: page loads with category checklist, counts are accurate
4. Toggle "Select All" on/off, verify all checkboxes respond and size estimate updates
5. Select only "Recipes" and "Clients," click Download
6. Verify: ZIP downloads with correct folder structure
7. Open `manifest.json`, verify counts match
8. Open `recipes/recipes.json`, verify recipe data is complete (ingredients, instructions, tags)
9. Open `clients/clients.csv` in a spreadsheet, verify headers and data are correct
10. Enable "Include PDFs" option, re-export with Recipes selected
11. Verify: `recipes/recipe-cards/` folder contains PDF files
12. Select all categories except Photos, export
13. Verify: all folders present, no empty folders for categories with data
14. Select Photos only (if test account has photos), verify originals download
15. Screenshot the page in default state and during export progress

---

## Out of Scope

- Scheduled/recurring exports (future enhancement; could use cron)
- Export to external storage (Drive, Dropbox, etc.); self-hosted, no cloud
- Import from ZIP (separate spec if needed for platform migration)
- Admin-level bulk export across all tenants
- Encryption/password-protected ZIPs (not needed for self-hosted)
- Email notification when export is ready (instant download model)

---

## Notes for Builder Agent

1. **Reuse everything.** The hard work is done:
   - `fflate` (`zipSync`) already handles ZIP creation (see `lib/finance/cpa-export-actions.ts`)
   - `csvRowSafe` / `buildCsvSafe` from `lib/security/csv-sanitize.ts` for all CSV output
   - `generateICS` from `lib/scheduling/generate-ics.ts` for calendar export
   - 20+ PDF generators in `lib/documents/generate-*.ts`
   - Client CSV export logic in `app/(chef)/clients/csv-export/route.ts`
   - Event CSV export logic in `app/(chef)/events/csv-export/route.ts`
   - Financial export logic in `lib/exports/actions.ts` and `lib/finance/cpa-export-actions.ts`

2. **Tenant scoping is critical.** Every query must filter by `tenant_id` from session. Never accept tenant from client input.

3. **CSV sanitization is mandatory.** All string values through `csvRowSafe` before writing to CSV. Formula injection protection is not optional.

4. **Photos are the size problem.** Everything else combined is likely < 50MB. Photos can be gigabytes. Keep photo export opt-in and separate from the size estimate.

5. **For large exports**, consider streaming the ZIP via a Route Handler (`app/api/exports/takeout/route.ts`) rather than returning base64 from a server action. Server actions have response size limits. The CPA export uses base64 because it is small; a full takeout with photos will not fit.

6. **`manifest.json` is the receipt.** Always include it. It proves what was exported, when, and how much. Useful for the chef, useful for debugging.

7. **Free tier.** Register in `lib/billing/feature-classification.ts` as `tier: 'free'`. Data portability is not a paid feature. It is a right.

8. **Interface philosophy.** One primary button (Download). Max 7 visible toggles without scrolling (10 categories is OK because it is a checklist, not action buttons). All 5 data states covered. Progress feedback during export.
