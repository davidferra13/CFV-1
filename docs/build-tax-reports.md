# Build: Tax Reports Enhancement (#31)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #31 Tax & Compliance Reports (build order #19)

## What Changed

Added unified deduction tracker, SE tax worksheet, and one-click tax summary PDF export. Built on existing quarterly estimate, mileage, home office, and depreciation infrastructure.

### What Already Existed

- `lib/finance/tax-package.ts` with `getYearEndTaxPackage()` (revenue, expenses, quarterly estimates, mileage)
- `lib/tax/actions.ts` with `computeQuarterlyEstimate()`, `logMileage()`, `generateAccountantExport()`
- `lib/tax/home-office-actions.ts` (simplified + actual method)
- `lib/equipment/depreciation-actions.ts`
- `lib/finance/1099-actions.ts` (contractor 1099-NEC)
- Tax center page at `/finance/tax/` with mileage, quarterly estimates, AI deduction identifier
- Sales tax pages at `/finance/sales-tax/` (jurisdictions, remittances, settings)
- Tax summary report at `/finance/reporting/tax-summary/`

### New Files

1. **`lib/finance/tax-summary-pdf.ts`** - One-click tax summary PDF generation:
   - Uses `PDFLayout` (jsPDF wrapper) for consistent formatting
   - Sections: Income Summary, Business Deductions (with IRS line references), SE Tax Worksheet (92.35% base, 15.3% rate, 50% deduction), Quarterly Estimates
   - Disclaimer warning box
   - Returns base64-encoded PDF for client-side download

2. **`lib/finance/deduction-tracker.ts`** - Unified deduction aggregator:
   - `getDeductionSummary(taxYear)` fetches from 4 sources in parallel:
     - Business expenses by category (from `expenses` table)
     - Mileage (from `mileage_logs` table)
     - Home office (from `tax_settings` table, simplified or actual method)
     - Equipment depreciation (from `equipment_items`, straight-line annual)
   - Returns per-category breakdown with IRS Schedule C line references
   - Computes total across all deduction sources

3. **`components/finance/deduction-tracker-dashboard.tsx`** - Dashboard UI:
   - Year selector (current year + prior year)
   - Total deductions headline card
   - 4 source cards (expenses, mileage, home office, depreciation) with counts
   - Per-category IRS Schedule C breakdown
   - One-click "Download Tax Summary PDF" button
   - CPA disclaimer

### Modified Files

4. **`app/(chef)/finance/reporting/tax-summary/page.tsx`** - Replaced basic expense table with the new unified `DeductionTrackerDashboard` component.

## Design Decisions

- **No new migration**: All deduction data already exists across 4 tables. This is pure read aggregation.
- **Formula > AI**: All tax calculations are deterministic math. SE tax = 15.3% of (92.35% of net profit). Quarterly = annual / 4. No LLM.
- **PDF uses jsPDF**: Same `PDFLayout` class used by invoices, contracts, and other documents.
- **4-source model**: Expenses + Mileage + Home Office + Depreciation covers the primary deduction categories for a private chef business (Schedule C filer).
- **IRS line references**: Each category maps to its Schedule C line number so chefs (and their CPAs) can fill out the form directly.
- **Prominent disclaimer**: Both UI and PDF include a CPA disclaimer since ChefFlow is not a tax advisor.
