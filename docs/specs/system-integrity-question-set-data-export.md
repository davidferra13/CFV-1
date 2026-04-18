# System Integrity Question Set: Data Export (Takeout)

> **Spec:** `docs/specs/p1-data-export-takeout.md`
> **Created:** 2026-04-18
> **Purpose:** Expose every failure point, cross-boundary dependency, and ambiguity in the Data Export feature. Force the system into a fully specified, verifiable state.

---

## Domain 1: Schema Accuracy (Does the spec describe reality?)

**Q1. The spec references `recipe_tags` as a source table for Recipes. Does this table exist?**
NO. Recipes store tags as a `text[]` column directly on the `recipes` table. There is no `recipe_tags` join table. The spec must reference `recipes.tags` as a column, not a separate table.
**Verdict: SPEC ERROR. Fix required.**

**Q2. The spec references `menu_sections` and `menu_items` as source tables for Menus. Do these accurately describe the menu data model?**
PARTIALLY. `menu_items` exists, but the actual menu hierarchy is `menus -> dishes -> components -> recipes`. The `dishes` table is entirely missing from the spec. `menu_sections` does not exist as a standalone table. Components belong to dishes (via `dish_id`), and reference recipes (via `recipe_id`). The spec needs: `menus`, `dishes`, `menu_items`, `components`.
**Verdict: SPEC ERROR. Fix required.**

**Q3. The spec references `ingredient_prices` as a source table for Ingredients. Does this table exist?**
NO. Price data lives in `ingredient_price_history` (per-vendor price over time), `vendor_price_points`, `vendor_price_entries`, and `grocery_price_entries`. The `ingredients` table itself has `cost_per_unit_cents`, `last_price_cents`, and `last_price_date` inline columns. The spec should reference `ingredient_price_history` at minimum.
**Verdict: SPEC ERROR. Fix required.**

**Q4. The spec lists `chat_messages` for Conversations. Does this capture all communication channels?**
NO. Communication system includes: `conversations`, `chat_messages`, `messages` (email/SMS), `communication_events`, `conversation_threads`, `sms_messages`, `sms_send_log`, `guest_messages`, `guest_communication_logs`. The `unified_inbox` view merges all channels. The current spec would export Remy/chat data but miss email and SMS records.
**Verdict: SPEC GAP. Conversations category must be widened or renamed to "Communications."**

---

## Domain 2: Missing Data Categories (What falls through the cracks?)

**Q5. A chef has 45 commerce/POS transactions, 3 shift reports, and daily reconciliation records. The spec has 10 export categories. Which category captures this data?**
NONE. Commerce data (`sales`, `sale_items`, `commerce_payments`, `register_sessions`, `cash_drawer_movements`, `daily_reconciliation_reports`) is entirely absent. The financial category mentions `commerce_payments` in passing but does not export sale items, shift reports, POS product catalog, or register sessions. The `generate-commerce-receipt.ts` PDF generator and shift report CSV/PDF route exist in code but have no Takeout representation.
**Verdict: CRITICAL GAP. New "Commerce/POS" category required, or fold into Financials with explicit sub-sections.**

**Q6. A chef receives 30 inquiries per month. Inquiries convert to events. Conversations and documents reference `inquiry_id`. Which category exports inquiry data?**
NONE. The `inquiries` table (with `inquiry_notes`, `inquiry_state_transitions`, `inquiry_recipe_links`) falls outside all 10 categories. Events reference `inquiry_id`; conversations reference `inquiry_id`; documents reference `inquiry_id`. Exporting events/conversations/documents without inquiries produces dangling foreign key references.
**Verdict: CRITICAL GAP. Inquiries must be folded into Events or get their own category.**

**Q7. A chef sends 12 quotes and 8 proposals to clients over 6 months. Which category exports this pricing and proposal history?**
NONE. `quotes`, `quote_line_items`, `quote_state_transitions`, `quote_addons`, `quote_selected_addons`, `proposals`, `proposal_tokens`, `proposal_sections`, `proposal_views`, `client_proposals` are orphaned from all 10 categories. These are business-critical records (the price offered to the client, their viewing/acceptance behavior). Quote PDFs can be generated, but the raw structured data is not exported.
**Verdict: CRITICAL GAP. Quotes and proposals must go into Events (as pre-event pipeline) or a new "Sales Pipeline" category.**

**Q8. A chef manages 5 vendors, has 23 purchase orders, and tracks vendor pricing across 3 suppliers. Which category exports vendor data?**
NONE. `vendors`, `vendor_items`, `vendor_invoices`, `vendor_invoice_items`, `vendor_preferred_ingredients`, `vendor_price_points`, `vendor_event_assignments`, `purchase_orders`, `purchase_order_items`, `sourcing_entries` are referenced by 15+ tables but have no export category. Events reference vendors via `vendor_event_assignments`; ingredients reference vendors via price history.
**Verdict: CRITICAL GAP. New "Vendors" category required, or fold into Ingredients (vendor pricing) + Events (vendor assignments).**

**Q9. A chef has 3 staff members with availability, shift records, clock entries, performance scores, and tip distributions. Which category exports staff data?**
NONE. `staff_members`, `staff_availability`, `staff_schedules`, `staff_clock_entries`, `staff_onboarding_items`, `staff_performance_scores`, `employees`, `payroll_records`, `scheduled_shifts`, `tip_pool_configs`, `tip_distributions`, `contractor_payments` all orphaned. The Events category lists `event_staff_assignments` as a source table, but those assignments contain `staff_member_id` foreign keys that point nowhere in the export.
**Verdict: SIGNIFICANT GAP. New "Staff" category or fold into Profile/Settings.**

**Q10. A chef has 15 todos, 4 active goals with check-ins, 8 reminders linked to clients, daily briefings, and prep timelines. Which category exports operational data?**
NONE. `chef_todos`, `chef_goals`, `goal_check_ins`, `chef_reminders`, `chef_daily_briefings`, `daily_plan_drafts`, `daily_checklist_completions`, `tasks`, `prep_timeline`, `shopping_lists`, `smart_grocery_lists`, `packing_checklists` are all orphaned. These represent the chef's active operational state.
**Verdict: MODERATE GAP. Consider "Operations" category or fold into Profile/Settings.**

**Q11. A chef has 6 After-Action Reviews (AARs) spanning events, recipes, and ingredients. AARs contain recipe feedback and ingredient issue reports. Which category exports AAR data?**
NONE. `after_action_reviews` reference events; `aar_recipe_feedback` references recipes; `aar_ingredient_issues` references ingredients. AARs are the chef's post-mortem learning, spanning 3 categories. They have no home in the current spec.
**Verdict: MODERATE GAP. Fold into Events (each AAR belongs to one event).**

**Q12. A chef has 12 marketing campaigns, 3 email sequences, automated follow-up rules, and scheduled messages. Which category exports marketing/automation data?**
NONE. `marketing_campaigns`, `campaign_recipients`, `email_sequences`, `automated_sequences`, `automation_rules`, `follow_up_sequences`, `scheduled_messages`, `direct_outreach_log` are orphaned. These represent business growth systems the chef built over time.
**Verdict: MODERATE GAP. Consider "Marketing/Automation" category or fold into Profile/Settings.**

**Q13. A chef uses the Remy AI assistant extensively. Remy has 45 conversations, 23 memories about clients, and artifact data. Which category exports Remy data?**
Conversations partially covers Remy via `chat_messages`, but `remy_conversations`, `remy_messages`, `remy_memories`, `remy_artifacts` are separate tables. The Conversations category as written queries `conversations` and `chat_messages`, which may or may not include Remy data depending on how Remy threads are stored.
**Verdict: AMBIGUOUS. Verify whether Remy data flows through `conversations`/`chat_messages` or through separate `remy_*` tables. If separate, add to spec.**

**Q14. A chef has event contracts with structured data (signers, versions, status). The spec says Documents = `chef_documents` + stored files. Are contracts covered?**
PARTIALLY. Contract PDFs in storage are copied as files. But `event_contracts`, `event_contract_versions`, `event_contract_signers` contain structured data (who signed, when, which version, signature status) that is NOT in the stored PDF. The JSON metadata would be lost.
**Verdict: GAP. Add contract tables to Documents or Events source tables.**

---

## Domain 3: Cross-Category Dependencies (What breaks when exported alone?)

**Q15. A chef exports only Menus (without Recipes). Each menu item references a `recipe_id`. The exported JSON contains recipe IDs with no corresponding recipe data. Is the export useful?**
NO. Menu items are literally recipe assignments. A menu export without recipes is a list of course names with opaque UUIDs. The `components` table (bridge between dishes and recipes) compounds this: every component has a `recipe_id`.
**Verdict: DESIGN DECISION NEEDED. Either (a) auto-include Recipes when Menus is selected, (b) inline recipe names/summaries into menu export, or (c) document that menus-only export has limited utility. Recommendation: (b) resolve foreign keys inline.**

**Q16. A chef exports only Financials (without Events or Clients). Ledger entries reference `event_id` and `client_id`. The exported CSV has event/client UUIDs with no names. Is the export useful?**
BARELY. A CSV with "Payment: $500, event_id: abc-123, client_id: def-456" is meaningless to an accountant. The CPA export already resolves these by joining event/client names.
**Verdict: DESIGN DECISION NEEDED. Financial exports must resolve event names and client names inline, regardless of whether Events/Clients categories are selected. Same pattern as CPA export.**

**Q17. A chef exports only Events (without Clients). Every event has a `client_id`. The exported JSON contains client UUIDs with no client details. Is the export useful?**
PARTIALLY. Event dates, occasions, and financials are useful alone. But "dinner for client def-456" is not.
**Verdict: SAME AS Q16. Resolve client names inline in event exports.**

**Q18. A chef exports Recipes and Ingredients separately. Recipe ingredients reference `ingredient_id`. If both are in the ZIP, can a consumer cross-reference them?**
YES, but only if both JSONs use the same `id` field as the join key and this is documented in the manifest. Without documentation, the relationship is invisible.
**Verdict: Manifest must document cross-file relationships. Add a `relationships` field to `manifest.json` that describes FK links between exported files.**

**Q19. The `event_financial_summary` view joins events, ledger_entries, and expenses. It is listed under Financials. If Events is not selected, does the financial summary still work?**
YES, because the view is computed server-side at export time. The query works regardless of what categories the user selected. But the exported summary references event names that won't exist in the ZIP if Events was not selected.
**Verdict: ACCEPTABLE. View queries are self-contained. Inline names resolve the cross-reference.**

---

## Domain 4: Soft-Delete and Data Completeness

**Q20. A chef soft-deleted 3 clients (`deleted_at IS NOT NULL`). Those clients have 8 events, $12,000 in payments, and 5 conversations. Should the export include soft-deleted clients?**
DEPENDS on category:

- **Financials:** MUST include. Tax records cannot have holes. The ledger is immutable and complete.
- **Clients:** SHOULD include, marked as archived. Otherwise financial references dangle.
- **Events:** SHOULD include. Events from deleted clients are still real events that happened.
- **Conversations:** REASONABLE to exclude if the chef deliberately archived the client.
  **Verdict: SPEC MUST DEFINE soft-delete policy per category. Current spec is silent.**

**Q21. A chef soft-deleted 2 events. Those events have ledger entries and expenses. The financial export references these events by ID. What happens?**
Same issue as Q20. Financial integrity requires including transactions from deleted events. The event export should include soft-deleted events with a clear `archived: true` flag.
**Verdict: SPEC MUST DEFINE. Recommendation: financials always complete, events include archived with flag.**

**Q22. A chef deleted 5 photos and 3 chat messages. Should the export include soft-deleted photos and messages?**
NO. Unlike financial records, deleted photos and messages were deliberately removed by the chef. Exporting them violates user intent. Exception: if the photo is still referenced by a non-deleted entity.
**Verdict: SPEC MUST DEFINE. Recommendation: exclude soft-deleted photos/messages.**

---

## Domain 5: Size, Performance, and Delivery

**Q23. A chef has 500 recipes. The export with "Include PDFs" generates 500 recipe card PDFs. Each takes 200ms. Total: 100 seconds of PDF generation. What happens to the user during this time?**
Progress bar shows "Generating recipe cards (47/500)..." Cancel button available. But: is the server action holding a single request open for 100 seconds? Server actions have timeout limits. For large PDF batches, the current architecture (single server action returning base64) will fail.
**Verdict: SPEC MUST ADDRESS. Large PDF batches need streaming route handler, not server action. Or: generate PDFs incrementally and add to ZIP stream.**

**Q24. A chef has 2,000 event photos totaling 4GB. They select only Photos. The browser downloads a 4GB file. Does this work?**
UNLIKELY. Most browsers cap blob/download size at 2GB. Some modern browsers handle larger via streams, but it is unreliable. Safari is particularly problematic.
**Verdict: SPEC ADDRESSES THIS (size warning at 2GB) but should add: split into multiple ZIPs (Part 1, Part 2) at 1.5GB boundary for safety. Or: provide a "download folder" API route that serves individual files for large photo collections.**

**Q25. The `estimateTakeoutSize` action counts records and estimates bytes. How accurate does the estimate need to be?**
Within 2x is fine for UX (showing "~6 MB" vs actual 8 MB is acceptable). Photos are the wild card (image sizes vary 100KB to 10MB). For non-photo categories, row count \* average row size is sufficient. For photos, sum actual file sizes from storage metadata.
**Verdict: Estimate photos by summing actual file sizes (from DB `file_size` columns or `fs.stat`). Estimate everything else with row count heuristics.**

---

## Domain 6: Security and Privacy

**Q26. The export ZIP contains client names, dietary restrictions, allergies, financial data, and conversation history. A chef downloads this to a shared computer. What protects this data?**
Nothing, by design. This is a local self-hosted app. The chef is the data controller. The ZIP is their data on their machine. No password protection, no encryption, no DRM. Same as Google Takeout.
**Verdict: ACCEPTABLE for self-hosted. If ChefFlow ever becomes multi-tenant SaaS, revisit. For now: no encryption needed.**

**Q27. Could a malicious client component manipulate the `categories` array to request data outside the chef's tenant?**
NO, if implemented correctly. Server actions derive `tenant_id` from session, not from input. The categories array only controls WHICH tables are queried, not WHOSE data. As long as every query filters by `tenant_id`, cross-tenant data leakage is impossible.
**Verdict: SAFE. Standard tenant-scoping pattern. No additional mitigation needed.**

**Q28. CSV formula injection: the existing `csvRowSafe` sanitizer prefixes dangerous characters with `'`. Is this applied to ALL CSV outputs in the Takeout?**
It must be. Every string field that ends up in a CSV (client names, notes, event descriptions, expense notes) must go through `csvRowSafe`. The spec mentions this in Notes for Builder Agent but should be a hard requirement, not a suggestion.
**Verdict: PROMOTE from "note" to "mandatory requirement" in spec.**

---

## Domain 7: Format and Portability

**Q29. The JSON exports use ChefFlow-internal field names (`tenant_id`, `quoted_price_cents`, `event_state_transitions`). A chef migrating to another platform cannot interpret these. Should exports use human-readable field names?**
PARTIALLY. `tenant_id` should be stripped (it is internal). `quoted_price_cents` should be accompanied by `quoted_price_dollars` for human readability. State transition enums should include labels. But full field renaming is excessive for V1.
**Verdict: Strip internal IDs (`tenant_id`, `auth_user_id`). Add human-readable computed fields for money (dollars alongside cents) and enums (labels alongside codes). Do not rename all fields.**

**Q30. The Recipes JSON includes `instructions` as a text blob. If a chef's recipe has structured steps (step 1, step 2), are they exported as structured data?**
Depends on DB schema. If `recipes.instructions` is a single text field, it exports as-is. If there are `recipe_steps` or similar tables, they should be included.
**Verdict: CHECK whether `recipe_steps`, `recipe_methods`, or similar structured step tables exist. If so, include them.**

**Q31. Events export includes an ICS file. The ICS is generated by `generateICS()` which takes a single event. For the Takeout, should all events be in ONE .ics file or one per event?**
ONE file with multiple VEVENT blocks. This is the standard for calendar import (Google Calendar, Apple Calendar, Outlook all accept multi-event ICS files). One-per-event would create hundreds of files.
**Verdict: Single `events.ics` with all events as VEVENT blocks. The `generateICS` function needs to be called per-event and concatenated within a single VCALENDAR wrapper.**

---

## Domain 8: Existing Infrastructure Reuse

**Q32. The CPA export uses `zipSync` from fflate (synchronous, in-memory). The Takeout could include 4GB of photos. Can `zipSync` handle this?**
NO. `zipSync` loads everything into memory. 4GB of photos would require 4GB+ of RAM for the ZIP buffer. This will crash the Node.js process.
**Verdict: CRITICAL. For photo-heavy exports, must use streaming ZIP (e.g., `fflate`'s `Zip` class with async writes, or `archiver` package). The spec mentions streaming but does not specify the mechanism. `zipSync` is only safe for the non-photo path.**

**Q33. The spec says small exports use server actions returning base64. Next.js server actions have a default response size limit (varies by deployment). What is the actual limit?**
Next.js does not enforce a hard limit on server action response size, but practical limits exist: the response is serialized as JSON, base64-encoded binary inflates size by 33%, and the client must hold the entire response in memory. For 50MB of export data, the base64 response is ~67MB.
**Verdict: 50MB threshold is aggressive. Lower to 20MB for the server action path. Above 20MB, use the streaming route handler. Or: always use the route handler for simplicity.**

**Q34. The client CSV export (`/clients/csv-export/route.ts`) already exists and works. Should the Takeout duplicate this logic or call the existing route?**
NEITHER. The Takeout should extract the CSV-generation logic into a shared function that both the standalone route and the Takeout action call. Avoid duplication, avoid HTTP self-calls.
**Verdict: REFACTOR. Extract CSV builders into `lib/exports/csv-builders/` that both standalone routes and Takeout consume.**

---

## Domain 9: Manifest and Cross-Reference Integrity

**Q35. The manifest includes `counts: Record<string, number>`. If the export includes 47 recipes but 3 recipe PDFs fail to generate, does the count say 47 or 44?**
47 (total records exported as JSON). The `_errors.txt` file documents the 3 PDF failures. Counts reflect data completeness, not PDF completeness. A separate `pdfCount` field could be added if needed.
**Verdict: Counts = data records. PDF failures are documented in `_errors.txt`. Optionally add `pdfErrors: number` to manifest.**

**Q36. If a chef exports Recipes and Events, the manifest says `{ recipes: 47, events: 112 }`. Can a consumer determine which recipes were served at which events without reading both files?**
NOT from the manifest alone. The manifest lists counts, not relationships. Cross-referencing requires reading `events.json` (which includes `menu_id`) and `menus.json` (which includes recipe assignments).
**Verdict: Add `relationships` array to manifest documenting FK links between files. Example: `{ from: "events.json:menu_id", to: "menus.json:id" }`. This makes the ZIP self-documenting for migration tools.**

---

## Domain 10: Completeness and Coverage

**Q37. How many tables does ChefFlow have? How many are covered by the 10 export categories? What percentage of the chef's data is exportable?**
~703 Row types in `types/database.ts`. The 10 categories cover approximately 30-35 tables. Even accounting for admin-only, system, and infrastructure tables, roughly 200+ chef-data tables are NOT covered. Coverage is approximately 15-20% of the chef's data surface area.
**Verdict: The spec covers the "big 10" but misses the "long tail" of 150+ tables across 17 domains (Commerce, Vendors, Staff, Operations, Marketing, Contracts, Tax, Inventory, Reviews, Social, Hub, Bakery, etc.). A chef doing a full Takeout gets their core data but loses specialized operational data.**

**Q38. The spec says "No new tables." But should there be a `data_export_log` table recording when exports happened, what was included, and the manifest?**
NOT required but useful. A simple log entry per export (timestamp, categories, record counts, file size) enables "Last export: April 12, 2026" on the UI and lets the chef prove they backed up their data. One row per export, append-only.
**Verdict: RECOMMENDED. Single table, 5 columns, one INSERT per export. Tiny cost, real value.**

**Q39. The spec lists 10 categories. Google Takeout has 50+. Should ChefFlow aim for full coverage or is the "big 10" sufficient for V1?**
V1: Big 10 + the 4 critical gaps (Commerce, Inquiries/Quotes, Vendors, Staff) = 14 categories covers ~80% of a typical chef's data by importance. The long tail (social, marketing, bakery verticals, etc.) can be added incrementally without architectural changes.
**Verdict: V1 should ship with 14 categories. The architecture (category registry in `takeout-categories.ts`) makes adding new categories trivial.**

**Q40. A chef presses "Download My Data" with all 14 categories selected, no photos, no PDFs. The entire export is JSON + CSV. Estimated time?**
For a moderately active chef (50 recipes, 30 clients, 100 events, 500 ledger entries): all data fits in memory, ZIP is < 5MB, generation takes < 3 seconds. For a very active chef (500 recipes, 200 clients, 1000 events): still < 20MB, < 10 seconds. The bottleneck is only PDFs and photos.
**Verdict: FAST. The non-photo, non-PDF path should be instant for any realistic data volume. Spec should note this as a performance guarantee.**

---

## Summary Scorecard

| Domain              | Questions | Spec Errors        | Critical Gaps                            | Design Decisions Needed                          |
| ------------------- | --------- | ------------------ | ---------------------------------------- | ------------------------------------------------ |
| Schema Accuracy     | Q1-Q4     | 3 (phantom tables) | 1 (Conversations too narrow)             | 0                                                |
| Missing Categories  | Q5-Q14    | 0                  | 4 (Commerce, Inquiries, Quotes, Vendors) | 6 (Staff, Ops, AARs, Marketing, Remy, Contracts) |
| Cross-Category Deps | Q15-Q19   | 0                  | 0                                        | 3 (inline resolution strategy)                   |
| Soft-Delete         | Q20-Q22   | 0                  | 0                                        | 3 (per-category policy)                          |
| Size/Performance    | Q23-Q25   | 0                  | 1 (streaming for large PDFs)             | 1 (estimate accuracy)                            |
| Security            | Q26-Q28   | 0                  | 0                                        | 1 (promote CSV sanitization)                     |
| Format/Portability  | Q29-Q31   | 0                  | 0                                        | 3 (field naming, ICS merge, steps)               |
| Infrastructure      | Q32-Q34   | 0                  | 1 (zipSync memory limit)                 | 2 (size threshold, refactor)                     |
| Manifest            | Q35-Q36   | 0                  | 0                                        | 2 (error counts, relationships)                  |
| Completeness        | Q37-Q40   | 0                  | 0                                        | 3 (coverage target, export log, perf)            |

**Totals: 3 spec errors, 6 critical gaps, 24 design decisions needed.**

### Required Spec Fixes (Before Build)

1. Fix phantom tables: `recipe_tags` -> `recipes.tags`, `menu_sections` -> `dishes`, `ingredient_prices` -> `ingredient_price_history`
2. Add `dishes` and `tasting_menus`/`tasting_menu_courses` to Menus category
3. Widen Conversations to Communications (add `messages`, `communication_events`, `sms_messages`)
4. Add Commerce/POS category (or explicit sub-section in Financials)
5. Add Inquiries + Quotes to Events category
6. Add Vendors category (or fold into Ingredients + Events)
7. Define soft-delete policy per category
8. Define FK inline resolution strategy (resolve names, strip internal IDs)
9. Switch from `zipSync` to streaming ZIP for photo path
10. Add `relationships` array to manifest schema
11. Add `data_export_log` table (optional but recommended)
