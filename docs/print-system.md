# ChefFlow Print System

> Established February 2026. Ensures every chef can print from ChefFlow to any printer — thermal, impact, inkjet, laser — without struggling.

---

## Architecture Overview

The print system has three layers:

```
Layer 1: CSS @media print (globals.css)     — Works everywhere, zero dependencies
Layer 2: PDF generators (lib/documents/)     — Server-side PDFs for download/email
Layer 3: Thermal receipt PDF (PDFKit)         — 80mm-width PDFs for POS printers
```

Future layers (not yet implemented):

```
Layer 4: Vendor SDK (Epson ePOS / Star WebPRNT) — Silent network printing
Layer 5: Bridge software (QZ Tray)               — Universal silent printing
```

---

## Shared Print CSS (globals.css)

All print styles live in `app/globals.css` under the `PRINT SYSTEM` section. No more inline `@media print` blocks scattered across components.

### Classes

| Class               | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `.print-standard`   | Standard paper layout (Letter/A4) — 12px font, normal margins |
| `.print-thermal-80` | 80mm thermal paper — 72mm print width, monospace, compact     |
| `.print-thermal-58` | 58mm thermal paper — 48mm print width, extra compact          |
| `.print-table`      | Table with borders, header background, proper padding         |
| `.print-meta`       | Subtitle/date line — smaller, muted color                     |
| `.print-row-warn`   | Yellow highlight row (expiring items)                         |
| `.print-row-danger` | Red highlight row (expired items)                             |
| `.print-no-break`   | Prevent page break inside element                             |
| `.print-divider`    | Dashed line separator (thermal receipts)                      |
| `.print-total`      | Bold right-aligned total line (thermal receipts)              |
| `.no-print`         | Hidden when printing                                          |
| `.print-only`       | Only visible when printing                                    |
| `[data-no-print]`   | Attribute-based hide on print (alternative to class)          |

### Screen Preview Classes

| Class                    | What it does                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `.print-preview`         | Screen preview container for standard paper (8.5in max, white bg, shadow) |
| `.print-preview-thermal` | Screen preview for thermal paper (80mm max, monospace)                    |

---

## PrintableDocument Component

**File:** `components/print/printable-document.tsx`

Dual-mode wrapper that handles both screen preview and print output. Drop any content inside it.

```tsx
import { PrintableDocument } from '@/components/print/printable-document'

// Standard paper
<PrintableDocument title="Order Sheet" subtitle="Monday, March 2">
  <table className="print-table">...</table>
</PrintableDocument>

// Thermal 80mm
<PrintableDocument title="Station Clipboard" mode="thermal-80">
  <table className="print-table">...</table>
</PrintableDocument>

// Thermal 58mm (mobile printers)
<PrintableDocument title="Quick List" mode="thermal-58">
  <ul>...</ul>
</PrintableDocument>
```

### Props

| Prop       | Type                                         | Default        | Description                |
| ---------- | -------------------------------------------- | -------------- | -------------------------- |
| `title`    | `string`                                     | required       | Document heading           |
| `subtitle` | `string`                                     | —              | Date/meta line below title |
| `footer`   | `string`                                     | Auto-generated | Bottom-of-page text        |
| `mode`     | `'standard' \| 'thermal-80' \| 'thermal-58'` | `'standard'`   | Paper format               |
| `children` | `ReactNode`                                  | required       | Document body              |

### URL Query Param

Pages that use `PrintableDocument` support `?mode=thermal` to switch to 80mm thermal layout:

```
/stations/abc123/clipboard/print              → standard paper
/stations/abc123/clipboard/print?mode=thermal  → 80mm thermal
/stations/orders/print?mode=thermal            → 80mm thermal
```

---

## PDF Generators (Server-Side)

| Generator         | File                                            | Format               | Output                       |
| ----------------- | ----------------------------------------------- | -------------------- | ---------------------------- |
| Invoice (PDFKit)  | `lib/documents/pdf-generator.ts`                | Letter               | Professional branded invoice |
| Invoice (jsPDF)   | `lib/documents/generate-invoice.ts`             | Letter               | Compact 1-page invoice       |
| Receipt           | `lib/documents/generate-receipt.ts`             | Letter               | Event receipt                |
| Commerce Receipt  | `lib/documents/generate-commerce-receipt.ts`    | 80mm thermal (226pt) | POS-style receipt            |
| FOH Menu          | `lib/documents/generate-front-of-house-menu.ts` | Letter               | Client dinner menu           |
| Quote             | `lib/documents/generate-quote.ts`               | Letter               | Pricing proposal             |
| Financial Summary | `lib/documents/generate-financial-summary.ts`   | Letter               | Event cost breakdown         |

### API Routes

| Route                                        | Method | Returns                    |
| -------------------------------------------- | ------ | -------------------------- |
| `/api/documents/invoice-pdf/[eventId]`       | GET    | Invoice PDF (PDFKit)       |
| `/api/documents/invoice/[eventId]`           | GET    | Invoice PDF (jsPDF)        |
| `/api/documents/receipt/[eventId]`           | GET    | Event receipt PDF          |
| `/api/documents/commerce-receipt/[saleId]`   | GET    | Thermal receipt PDF (80mm) |
| `/api/documents/foh-menu/[eventId]`          | GET    | Front-of-house menu PDF    |
| `/api/documents/quote/[quoteId]`             | GET    | Quote PDF                  |
| `/api/documents/quote-client/[quoteId]`      | GET    | Client-facing quote PDF    |
| `/api/documents/contract/[contractId]`       | GET    | Contract PDF               |
| `/api/documents/financial-summary/[eventId]` | GET    | Financial summary PDF      |
| `/api/documents/foh-preview/[menuId]`        | GET    | Menu preview               |

---

## Browser Print Pages

| Page              | Route                            | Modes             | Component                   |
| ----------------- | -------------------------------- | ----------------- | --------------------------- |
| Station Clipboard | `/stations/[id]/clipboard/print` | standard, thermal | `PrintableDocument` wrapper |
| Order Sheet       | `/stations/orders/print`         | standard, thermal | `PrintableDocument` wrapper |
| Table Card        | (via `PrintableCard` component)  | 4×6 card          | Custom layout               |
| HACCP Plan        | (inline in HACCP view)           | standard          | Tailwind `print:` modifiers |
| Staff Briefing    | (inline in panel)                | standard          | Tailwind `print:` modifiers |

---

## Printer Compatibility Matrix

| Printer Type                        | How ChefFlow Supports It                                   |
| ----------------------------------- | ---------------------------------------------------------- |
| Standard inkjet/laser               | `window.print()` + CSS. Works in all browsers.             |
| Thermal 80mm (Epson, Star, Bixolon) | `?mode=thermal` on print pages, or download 80mm PDF       |
| Thermal 58mm (mobile, budget)       | `?mode=thermal` (58mm CSS class available)                 |
| Impact/dot matrix                   | `window.print()` — text-based layout prints well on impact |
| Label printers                      | Not yet supported — future ZPL integration                 |
| Mobile/portable (Bluetooth)         | Same as thermal — pair with phone/tablet, print via OS     |

---

## Adding a New Print Page

1. Create a server component page under the appropriate route
2. Import `PrintableDocument` from `@/components/print/printable-document`
3. Wrap content in `<PrintableDocument title="..." mode="standard">`
4. Use `print-table` class for tables, `print-row-warn`/`print-row-danger` for highlights
5. Accept `?mode=thermal` search param if the page should support thermal printers
6. No inline `@media print` CSS needed — the shared styles handle everything

---

## Full Printer Market Research

See `docs/printer-market-research.md` for the complete 950-line research document covering:

- All 7 printer categories (thermal, impact, label, inkjet, laser, mobile, wide-format)
- Every major brand and model with specs
- Print protocols (ESC/POS, StarPRNT, ZPL, IPP)
- Web printing APIs (WebUSB, Web Serial, vendor SDKs)
- JavaScript libraries for direct printer communication
- Cloud/bridge solutions (QZ Tray, PrintNode)
- CSS @media print best practices for thermal printers

---

## Future Roadmap

### Phase 2: Vendor SDK Integration

- Epson ePOS SDK for JavaScript → silent printing to network Epson printers
- Star WebPRNT → silent printing to network Star printers
- Printer settings page: chef enters printer IP, we auto-detect brand
- No install needed — just printer on same WiFi

### Phase 3: QZ Tray Bridge

- Open-source bridge for universal silent printing
- Works in Safari, Firefox (where WebUSB doesn't)
- Supports all printer brands
- One-time install on chef's machine

### Phase 4: Label Printing

- Prep labels (date/time, discard date)
- Allergen warning labels
- ZPL for Zebra printers, Brother SDK for QL series
