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

## Type Check Status

- `tsc --noEmit --skipLibCheck` = 0 errors (verified 2026-04-03)

## What's NOT Installed (Intentionally)

- `zustand` / `jotai` - Server components minimize client state needs
- `redis` / `@upstash/ratelimit` - `rate-limiter-flexible` with PostgreSQL avoids new service
- `puppeteer` - `pdfkit` handles server PDFs, `react-to-print` handles browser printing
- Cloud storage SDKs - Local filesystem is the intentional architecture
- `react-beautiful-dnd` - Archived/unmaintained. `@dnd-kit/*` already installed
