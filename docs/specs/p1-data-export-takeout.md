# Spec: Data Export (Takeout)

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date             | Agent/Session     | Commit |
| --------------------- | ---------------- | ----------------- | ------ |
| Created               | 2026-04-18 22:00 | opus main session |        |
| Status: ready         | 2026-04-18 22:00 | opus main session |        |
| Claimed (in-progress) | 2026-04-18       | opus main session |        |
| Build completed       | 2026-04-18       | opus main session |        |
| Type check passed     | 2026-04-18       | opus main session |        |
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

| Category               | Source Tables                                                                                                                                                                                                     | Output Format                                | Notes                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recipes**            | `recipes` (tags from `recipes.tags` column), `recipe_ingredients`, `recipe_sub_recipes`, `recipe_families`                                                                                                        | JSON + optional PDF (recipe cards)           | Chef IP. Most important category. JSON includes full ingredient lists, instructions, tags, yield, timing. Sub-recipes and families preserve hierarchical relationships  |
| **Clients**            | `clients`, `client_preferences`, `client_allergy_records`, `client_taste_profiles`                                                                                                                                | CSV (primary) + JSON (full)                  | Reuses existing `/clients/csv-export` logic. JSON adds preferences/allergies/taste profiles. Includes soft-deleted clients marked `archived: true`                      |
| **Events**             | `events`, `event_guests`, `event_staff_assignments`, `event_state_transitions`, `inquiries`, `inquiry_notes`, `inquiry_state_transitions`, `after_action_reviews`, `aar_recipe_feedback`, `aar_ingredient_issues` | CSV (summary) + JSON (full) + ICS (calendar) | Includes full inquiry-to-event pipeline. AARs folded in per-event. Includes soft-deleted events marked `archived: true`. Staff/client names resolved inline             |
| **Financials**         | `ledger_entries`, `expenses`, `commerce_payments`, `event_financial_summary` view, `sales`, `sale_items`, `register_sessions`, `daily_reconciliation_reports`, `commerce_refunds`                                 | CSV (ledger + expenses + commerce) + JSON    | Reuses CPA export patterns. Includes Commerce/POS transactions. Event/client names resolved inline. Always complete (includes records from soft-deleted events/clients) |
| **Quotes & Proposals** | `quotes`, `quote_line_items`, `quote_state_transitions`, `quote_addons`, `client_proposals`, `proposal_sections`                                                                                                  | JSON + optional PDF                          | Business-critical pricing history. Each quote references client + event by name (resolved inline). Reuses `generate-quote.ts` for PDFs                                  |
| **Menus**              | `menus`, `dishes`, `menu_items`, `components`, `tasting_menus`, `tasting_menu_courses`                                                                                                                            | JSON + optional PDF                          | Full hierarchy: menus -> dishes -> components -> recipes. Recipe names resolved inline. Tasting menus included. Reuses `generate-menu-pdf.ts`                           |
| **Documents**          | `chef_documents`, `event_contracts`, `event_contract_versions`, `event_contract_signers`, `document_intelligence_items`, stored files in `./storage/`                                                             | Original files + JSON metadata               | Copies stored files as-is. Contract structured data (signers, versions, status) exported as JSON alongside PDFs. Includes invoices, contracts, generated docs           |
| **Communications**     | `conversations`, `chat_messages`, `messages`, `communication_events`, `conversation_threads`, `remy_conversations`, `remy_messages`                                                                               | JSON                                         | All channels: client conversations, email/SMS records, Remy AI chat. Grouped by thread. Excludes soft-deleted messages. Client/event names resolved inline              |
| **Photos**             | `entity_photos`, `event_photos`, `client_photos`, `recipe_step_photos`, `plating_guides`                                                                                                                          | Original image files                         | Largest category by size. Organized into subfolders by entity. Includes recipe visual documentation. Excludes soft-deleted photos                                       |
| **Profile & Settings** | `chefs`, `chef_profiles`, `chef_preferences`, `chef_service_config`, `chef_pricing_config`, `chef_tax_config`, `chef_certifications`                                                                              | JSON                                         | Business name, bio, service types, pricing rules, tax config, certifications. Portable config. Internal IDs (`tenant_id`, `auth_user_id`) stripped                      |
| **Ingredients**        | `ingredients`, `ingredient_price_history`, `ingredient_aliases`, `ingredient_substitutions`                                                                                                                       | CSV + JSON                                   | Chef's ingredient catalog with vendor price history, aliases, and substitution relationships                                                                            |
| **Vendors**            | `vendors`, `vendor_items`, `vendor_invoices`, `vendor_invoice_items`, `vendor_preferred_ingredients`, `vendor_event_assignments`, `purchase_orders`, `purchase_order_items`                                       | CSV + JSON                                   | Vendor directory, pricing, invoices, purchase orders. Event assignments resolved inline. Sourcing relationships preserved                                               |
| **Staff**              | `staff_members`, `staff_availability`, `staff_clock_entries`, `staff_performance_scores`, `employees`, `payroll_records`, `contractor_payments`                                                                   | CSV + JSON                                   | Team roster, availability, time tracking, payroll, contractor payments. Event assignments are in Events category                                                        |

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
  relationships: Array<{
    from: string // e.g. "events/events.json:menu_id"
    to: string // e.g. "menus/menus.json:id"
    description: string // e.g. "Event references its assigned menu"
  }>
  errors?: { category: string; file: string; message: string }[]
}
```

### Soft-Delete Policy

| Category       | Include soft-deleted?        | Rationale                                                   |
| -------------- | ---------------------------- | ----------------------------------------------------------- |
| Financials     | ALWAYS                       | Tax records cannot have holes. Ledger is immutable          |
| Clients        | YES, marked `archived: true` | Financial/event references would dangle otherwise           |
| Events         | YES, marked `archived: true` | Real events that happened; financial records reference them |
| Communications | NO                           | Chef deliberately removed messages                          |
| Photos         | NO                           | Chef deliberately removed photos                            |
| All others     | NO                           | Respect user intent on deletions                            |

### FK Inline Resolution Strategy

When a category is exported alone, foreign keys to OTHER categories are resolved inline:

- `client_id` -> include `client_name` alongside the ID
- `event_id` -> include `event_occasion` and `event_date` alongside the ID
- `recipe_id` -> include `recipe_name` alongside the ID
- `menu_id` -> include `menu_name` alongside the ID
- `vendor_id` -> include `vendor_name` alongside the ID
- `staff_member_id` -> include `staff_name` alongside the ID
- `tenant_id`, `auth_user_id` -> STRIP from export (internal-only)

This ensures every exported file is self-contained and human-readable, regardless of which other categories were selected.

---

## UI / Component Spec

### Page Layout

`/settings/data-export` -- single-page, no tabs.

```text
+-------------------------------------------------------+
|  Data Export                                          |
|  Download a copy of your ChefFlow data.                |
|  Nothing is deleted. This is a copy.                  |
|                                                       |
|  [ ] Select All                                       |
|  -----------------------------------------------------|
|  CORE DATA                                            |
|  [x] Recipes (47 recipes)                    ~2 MB    |
|  [x] Clients (23 clients)                    ~1 MB    |
|  [x] Events + Inquiries (112 events)         ~3 MB    |
|  [ ] Quotes & Proposals (45 quotes)          ~500 KB  |
|  [ ] Menus (8 menus)                         ~500 KB  |
|  [ ] Ingredients (156 items)                 ~200 KB  |
|                                                       |
|  BUSINESS                                             |
|  [ ] Financials + Commerce (ledger, POS)     ~2 MB    |
|  [ ] Vendors (5 vendors, 23 POs)             ~300 KB  |
|  [ ] Staff (3 members, payroll)              ~200 KB  |
|  [ ] Documents (contracts, invoices)         ~12 MB   |
|                                                       |
|  OTHER                                                |
|  [ ] Communications (31 threads)             ~4 MB    |
|  [ ] Photos (245 photos)                     ~890 MB  |
|  [ ] Profile & Settings                      ~50 KB   |
|  -----------------------------------------------------|
|  Options:                                             |
|  [x] Include PDFs (recipe cards, menus, quotes)       |
|  [ ] Include original photos                          |
|                                                       |
|  Estimated size: ~6 MB                                |
|                                                       |
|  [ Download My Data ]                                 |
|                                                       |
|  Last export: April 12, 2026                          |
+-------------------------------------------------------+
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

```text
chefflow-export-2026-04-18/
  manifest.json                 # receipt: counts, relationships, errors
  recipes/
    recipes.json                # all recipes with ingredients inline
    recipe-cards/               # optional PDFs, one per recipe
      mushroom-risotto.pdf
  clients/
    clients.csv                 # spreadsheet-ready (name, email, dietary, LTV)
    clients.json                # full data with preferences, allergies, taste
  events/
    events.csv                  # summary spreadsheet
    events.json                 # full: guests, staff, transitions, AARs
    inquiries.json              # full inquiry pipeline with notes, transitions
    events.ics                  # single multi-VEVENT calendar file
  quotes/
    quotes.json                 # all quotes with line items, transitions
    proposals.json              # proposals with sections
    quote-pdfs/                 # optional
      smith-dinner-quote.pdf
  financials/
    ledger.csv                  # all ledger entries (event/client names inline)
    expenses.csv                # all expenses
    commerce-sales.csv          # POS transactions with items
    commerce-sessions.json      # register sessions, reconciliation
    financials.json             # combined with computed summaries
  menus/
    menus.json                  # full hierarchy: menus->dishes->components
    tasting-menus.json          # tasting menu courses
    menu-pdfs/                  # optional
      tasting-menu-march.pdf
  documents/
    contracts/                  # stored PDFs
    contracts-metadata.json     # structured: signers, versions, status
    invoices/
    generated/
  communications/
    conversations.json          # client conversations grouped by thread
    email-sms.json              # email/SMS records from messages table
    remy-conversations.json     # AI assistant chat history
  photos/
    events/
      [event-name]/
        photo1.jpg
    clients/
    recipes/
    plating-guides/
  ingredients/
    ingredients.csv             # catalog with current prices
    ingredients.json            # full: aliases, substitutions
    price-history.json          # vendor price history over time
  vendors/
    vendors.csv                 # directory with contact info
    vendors.json                # full: items, preferred ingredients
    purchase-orders.json        # POs with line items
    vendor-invoices.json        # invoices with items
  staff/
    staff.csv                   # roster with contact info
    staff.json                  # full: availability, clock entries, performance
    payroll.json                # payroll + contractor payments
  profile/
    profile.json                # chef profile, preferences, config
    services.json               # service types and pricing rules
    tax-config.json             # tax settings
    certifications.json         # professional certifications
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
   - `fflate` (`zipSync`) for small exports; fflate streaming `Zip` class for large exports (see below)
   - `csvRowSafe` / `buildCsvSafe` from `lib/security/csv-sanitize.ts` for all CSV output
   - `generateICS` from `lib/scheduling/generate-ics.ts` for calendar export
   - 20+ PDF generators in `lib/documents/generate-*.ts`
   - Client CSV logic in `app/(chef)/clients/csv-export/route.ts`
   - Event CSV logic in `app/(chef)/events/csv-export/route.ts`
   - Financial export logic in `lib/exports/actions.ts` and `lib/finance/cpa-export-actions.ts`

2. **Tenant scoping is critical.** Every query must filter by `tenant_id` from session. Never accept tenant from client input.

3. **CSV sanitization is MANDATORY (not optional).** Every string field in every CSV goes through `csvRowSafe`. Formula injection protection is a hard requirement, not a suggestion.

4. **Photos are the size problem.** Everything else combined is likely < 20MB. Photos can be gigabytes. Keep photo export opt-in and separate from the size estimate. For photo size estimates, sum actual file sizes from DB metadata or `fs.stat`, not row count heuristics.

5. **Two ZIP paths (CRITICAL architecture decision):**
   - **< 20MB estimated (no photos, no PDFs):** `zipSync` in server action, return base64. Fast, simple.
   - **>= 20MB (photos, PDFs, or large data):** Streaming ZIP via Route Handler at `app/api/exports/takeout/route.ts`. Uses fflate's async `Zip` class to avoid loading everything into memory. `zipSync` will crash Node.js on 4GB of photos.

6. **`manifest.json` is the receipt.** Always include it. `relationships` array documents FK links between files so the ZIP is self-documenting. `errors` array documents any skipped files.

7. **Free tier.** Register in `lib/billing/feature-classification.ts` as `tier: 'free'`. Data portability is not a paid feature. It is a right.

8. **Interface philosophy.** One primary button (Download). Categories grouped into 3 sections (Core, Business, Other) for visual hierarchy. All 5 data states covered. Progress feedback during export.

9. **ICS: single file, multiple events.** Generate one VCALENDAR with multiple VEVENT blocks, not one .ics per event. Call `generateICS` per-event and concatenate within a single VCALENDAR wrapper.

10. **Refactor CSV builders.** Extract shared CSV-generation logic into `lib/exports/csv-builders/` so both standalone route handlers and the Takeout consume the same code. Do not duplicate and do not HTTP self-call.

11. **Strip internal IDs, resolve foreign keys.** Every JSON export strips `tenant_id` and `auth_user_id`. Every foreign key to another category resolves the human-readable name inline (see FK Inline Resolution Strategy above). Financial amounts include both `_cents` and computed `_dollars` fields.

12. **Question set:** Full 40-question integrity audit at `docs/specs/system-integrity-question-set-data-export.md`. Builder must review Q32 (zipSync memory limit) and Q34 (CSV builder refactor) before implementation.
