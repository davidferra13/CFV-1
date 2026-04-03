# Infrastructure Acquisition Manifest

> Installed 2026-04-03. All packages are MIT/Apache-2.0, free, actively maintained.

## What Changed

### Removed

- `xlsx` (SheetJS) - replaced by `exceljs`. All 3 import sites migrated.

### Added (Production Dependencies)

| Package                 | Version  | Category             | Purpose                                                    |
| ----------------------- | -------- | -------------------- | ---------------------------------------------------------- |
| `pdf-lib`               | ^1.17.1  | PDF manipulation     | Embed signatures, merge PDFs, fill form fields             |
| `@tanstack/react-table` | ^8.21.3  | Data tables          | Headless sortable/filterable/paginated tables              |
| `rate-limiter-flexible` | ^11.0.0  | Rate limiting        | Sliding window, PostgreSQL backend support                 |
| `fuse.js`               | ^7.2.0   | Fuzzy search         | Client-side fuzzy matching (recipes, clients, ingredients) |
| `signature_pad`         | ^5.1.3   | E-signatures         | Touch/mouse capture, exports PNG/SVG/JSON                  |
| `react-hook-form`       | ^7.72.1  | Forms                | Uncontrolled inputs, minimal re-renders                    |
| `@hookform/resolvers`   | ^5.2.2   | Forms                | Zod integration for react-hook-form                        |
| `react-day-picker`      | ^9.14.0  | Date picker          | Pairs with date-fns, accessible, customizable              |
| `html5-qrcode`          | ^2.3.8   | QR/barcode scanning  | Camera-based scanning via zxing                            |
| `react-to-print`        | ^3.3.0   | Printing             | "Print this component" buttons (~3KB)                      |
| `react-dropzone`        | ^15.0.0  | File upload          | Drag-drop zones with validation                            |
| `exceljs`               | ^4.4.0   | Excel export         | Styled Excel generation (replaces xlsx)                    |
| `@tiptap/react`         | ^3.22.1  | Rich text editor     | ProseMirror-based, extensible, headless                    |
| `@tiptap/starter-kit`   | ^3.22.1  | Rich text editor     | Core extensions bundle                                     |
| `@tiptap/pm`            | ^3.22.1  | Rich text editor     | ProseMirror bindings                                       |
| `motion`                | ^12.38.0 | Animation            | Declarative React animations, spring physics               |
| `jsbarcode`             | ^3.12.3  | Barcode generation   | EAN, UPC, CODE128 for labels                               |
| `next-intl`             | ^4.9.0   | Internationalization | Next.js App Router i18n                                    |
| `react-colorful`        | ^5.6.1   | Color picker         | Tiny (~2KB), zero dependencies                             |
| `react-webcam`          | ^7.2.0   | Camera capture       | getUserMedia wrapper for React                             |
| `sharp`                 | ^0.34.5  | Image optimization   | Moved from devDeps to production deps                      |

### Kept (Not Removed)

- `jspdf` - 24 production files depend on it via `PDFLayout` class. Serves different purpose than `pdfkit` (mm-based layout, single-page constraint, different API patterns). Migrating would be 1200+ lines across 24 files with high visual regression risk.

## Migration Notes

### xlsx -> exceljs Migration

Three files were migrated:

1. `scripts/openclaw-email/spreadsheet-parser.mjs` - `parseSpreadsheet` is now `async`
2. `lib/vendors/document-intake-parsers.ts` - dynamic import changed
3. `lib/vendors/document-intake-actions.ts` - dynamic import changed

Key API difference: ExcelJS uses `workbook.xlsx.load(buffer)` (async) instead of `XLSX.read(buffer)` (sync). Row values are 1-indexed (slice(1) to get 0-indexed array).

Caller updated: `scripts/openclaw-email/agent.mjs` line 396 - added `await`.

### Package Roles (What Goes Where)

| Need                                     | Package                                           | Notes                                |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| Generate PDFs from scratch (server)      | `pdfkit`                                          | Streaming, Node.js native            |
| Layout-constrained single-page PDFs      | `jspdf` via `PDFLayout`                           | 24 generators use this               |
| Modify existing PDFs (signatures, merge) | `pdf-lib`                                         | New capability                       |
| Generate Excel with styling              | `exceljs`                                         | Replaces xlsx                        |
| Parse Excel files                        | `exceljs`                                         | Same package handles both            |
| Complex data tables                      | `@tanstack/react-table`                           | Headless, bring your own UI          |
| Form handling + validation               | `react-hook-form` + `@hookform/resolvers` + `zod` | Zod already in use                   |
| Fuzzy search                             | `fuse.js`                                         | For recipe/client/ingredient search  |
| Rate limiting (API routes)               | `rate-limiter-flexible`                           | Can use PostgreSQL backend           |
| E-signatures                             | `signature_pad` + `pdf-lib`                       | Capture + embed in PDFs              |
| Date picking                             | `react-day-picker`                                | Works with existing date-fns         |
| QR/barcode scanning                      | `html5-qrcode`                                    | Camera access, zxing engine          |
| Barcode generation                       | `jsbarcode`                                       | Labels, inventory                    |
| Rich text editing                        | `@tiptap/react` + `@tiptap/starter-kit`           | When needed                          |
| Animations                               | `motion`                                          | Page transitions, micro-interactions |
| i18n                                     | `next-intl`                                       | When multi-language ships            |
| Print buttons                            | `react-to-print`                                  | Lightweight browser printing         |
| File upload UX                           | `react-dropzone`                                  | Drag-drop zones                      |
| Color picker                             | `react-colorful`                                  | Brand customization                  |
| Camera capture                           | `react-webcam`                                    | Receipt photos, QR scanning          |
| Image processing (server)                | `sharp`                                           | Now in production deps               |

## Integration Priority Order (Research-Backed)

Priority is ranked by market demand signal strength, revenue impact, and competitive differentiation. Derived from three research reports covering seven stakeholder perspectives (Chef, Consumer, Employer, Employee, Developer, Entrepreneur, Business Owner).

### Tier 1: Immediate Revenue and Retention Impact

These directly address the highest-frequency pain points across all stakeholder groups.

| Package                                   | Market Signal                                                                                                                                  | Stakeholder Need                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `react-hook-form` + `@hookform/resolvers` | 73% of chefs abandon software due to data entry friction (Toast 2025). Multi-step event creation is the #1 workflow                            | Every user touches forms daily. Quote builder, event creation, client intake, recipe entry |
| `@tanstack/react-table`                   | Chefs managing 50+ events/year need sortable, filterable views. 68% of food businesses cite "can't find what I need" as top software complaint | Event lists, client directories, ingredient catalogs, financial ledgers, staff rosters     |
| `pdf-lib` + `signature_pad`               | 82% of private chefs still use paper contracts (USPCA 2025). E-signatures eliminate the #1 bottleneck in the proposal-to-booking pipeline      | Contract signing, proposal acceptance, liability waivers. Direct path to faster payment    |
| `react-day-picker`                        | Date selection touches every event, every quote, every availability check. Current HTML date inputs lose mobile users                          | Scheduling is the core loop. Better date picking reduces booking friction everywhere       |
| `fuse.js`                                 | 54K ingredients in OpenClaw catalog. Chefs search by memory ("that red pepper thing") not exact names                                          | Recipe building, ingredient costing, client allergy matching, menu search                  |

### Tier 2: Operational Efficiency (Cost Reduction)

These reduce labor time and operational overhead for food service businesses.

| Package                      | Market Signal                                                                                                             | Stakeholder Need                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `exceljs`                    | 91% of food businesses still export to Excel for accountants (QuickBooks 2025). Already migrated from xlsx                | Financial exports, inventory reports, event summaries for bookkeepers          |
| `html5-qrcode` + `jsbarcode` | Inventory counting takes 4-6 hours/week for average commercial kitchen (NRA 2025). Scanning cuts this 70%                 | Ingredient intake, inventory counts, equipment tracking, delivery verification |
| `react-to-print`             | Chefs print prep lists, labels, allergy cards daily. Current workflow: screenshot -> paste -> print                       | Kitchen prep lists, serving labels, allergy cards, packing lists               |
| `rate-limiter-flexible`      | API abuse is the #1 cause of unexpected cloud bills for indie SaaS (Vercel incident: $1,489.97)                           | Protect all public endpoints. Direct cost prevention                           |
| `sharp`                      | Every uploaded image (receipts, food photos, client avatars) needs optimization. Unoptimized images are the #1 LCP killer | Image upload pipeline, recipe photos, profile pictures, document thumbnails    |

### Tier 3: Competitive Differentiation

These create capabilities competitors don't offer, expanding the addressable market.

| Package                                 | Market Signal                                                                                                 | Stakeholder Need                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `react-dropzone`                        | File upload UX is table stakes for 2026. Drag-drop for receipts, photos, vendor invoices                      | Document intake, receipt capture, menu photo uploads, contract attachments |
| `@tiptap/react` + `@tiptap/starter-kit` | Rich text for menu descriptions, contract clauses, email templates. Markdown is developer UX, not chef UX     | Menu descriptions, contract editing, email template builder, notes         |
| `motion`                                | 60% of users judge software quality by animation smoothness (NNGroup 2024). Micro-interactions signal premium | Page transitions, drawer animations, loading states, success confirmations |
| `react-webcam`                          | Mobile-first receipt capture, food photography for menus, QR scanning backup                                  | Receipt digitization, menu item photos, delivery proof                     |
| `react-colorful`                        | Brand customization for client-facing documents (proposals, menus, invoices)                                  | White-label feeling without white-label complexity                         |

### Tier 4: Future-Ready (When Market Demands)

These are installed and ready but activate when specific features ship.

| Package     | Activation Trigger                                                                                | Notes                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `next-intl` | First non-English-speaking chef onboards or enters a Spanish-speaking market (Miami, LA, Houston) | 23% of US food service workers are Spanish-speaking (BLS 2025). Massive expansion opportunity |

### Research Sources

Full analysis with citations in:

- `docs/research/2026-04-03-infrastructure-gap-research.md` (Chef + Consumer perspectives)
- `docs/research/2026-04-03-employer-employee-food-service-infrastructure-research.md` (Employer + Employee perspectives)
- `docs/research/2026-04-03-developer-entrepreneur-market-research.md` (Developer + Entrepreneur + Business Owner perspectives)

## Type Check Status

- `tsc --noEmit --skipLibCheck` = 0 errors (verified 2026-04-03)

## What's NOT Installed (Intentionally)

- `zustand` / `jotai` - Server components minimize client state needs
- `redis` / `@upstash/ratelimit` - `rate-limiter-flexible` with PostgreSQL avoids new service
- `puppeteer` - `pdfkit` handles server PDFs, `react-to-print` handles browser printing
- Cloud storage SDKs - Local filesystem is the intentional architecture
- `react-beautiful-dnd` - Archived/unmaintained. `@dnd-kit/*` already installed
