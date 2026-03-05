import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  parseCatalogTabularRows,
  parseInvoiceDraftFromTabular,
  parseExpenseDraftFromTabular,
  parseInvoiceDraftFromExtractedText,
  parseExpenseDraftFromExtractedText,
  inferPriceFormat,
} = require('../../lib/vendors/document-intake-parsers.ts')

test('inferPriceFormat chooses dollars for decimal amounts', () => {
  assert.equal(inferPriceFormat([12.5, 8.25, 1.99]), 'dollars')
})

test('inferPriceFormat chooses cents for mostly integer cent values', () => {
  assert.equal(inferPriceFormat([1299, 845, 2500, 100]), 'cents')
})

test('parseCatalogTabularRows parses item rows and normalizes dollars to cents', () => {
  const parsed = parseCatalogTabularRows({
    headers: ['SKU', 'Item Name', 'Unit Price', 'Size', 'Unit'],
    rows: [
      ['A1', 'Mozzarella 5lb', '27.50', '5', 'lb'],
      ['B2', 'Tomato Sauce', '14.25', '1', 'case'],
    ],
  })

  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.priceFormat, 'dollars')
  assert.equal(parsed.rows[0].unit_price_cents, 2750)
  assert.equal(parsed.rows[1].unit_price_cents, 1425)
})

test('parseInvoiceDraftFromTabular builds invoice draft summary', () => {
  const draft = parseInvoiceDraftFromTabular({
    headers: ['Description', 'Qty', 'Unit Price', 'Invoice #', 'Invoice Date'],
    rows: [
      ['Flour 25lb', '2', '18.50', 'INV-101', '2026-03-01'],
      ['Olive Oil', '1', '32.00', 'INV-101', '2026-03-01'],
    ],
  })

  assert.equal(draft.line_items_count, 2)
  assert.equal(draft.inferred_total_cents, 6900)
  assert.equal(draft.invoice_number_guess, 'INV-101')
  assert.equal(draft.invoice_date_guess, '2026-03-01')
})

test('parseExpenseDraftFromTabular maps categories and totals', () => {
  const draft = parseExpenseDraftFromTabular({
    headers: ['Date', 'Description', 'Amount', 'Category'],
    rows: [
      ['2026-03-02', 'Fuel for delivery van', '55.20', 'Gas'],
      ['2026-03-03', 'Disposable gloves', '12.50', 'Supplies'],
    ],
  })

  assert.equal(draft.expense_rows_count, 2)
  assert.equal(draft.inferred_total_cents, 6770)
  assert.equal(draft.rows[0].category, 'gas_mileage')
  assert.equal(draft.rows[1].category, 'supplies')
})

test('parseInvoiceDraftFromExtractedText parses OCR-style invoice text', () => {
  const draft = parseInvoiceDraftFromExtractedText(`
ACME FOODS
Invoice #: INV-2048
Invoice Date: 03/02/2026
2 x Mozzarella 5lb 54.00
Tomato Sauce Case 18.50
Subtotal 72.50
Tax 5.80
Total 78.30
`)

  assert.equal(draft.line_items_count, 2)
  assert.equal(draft.invoice_number_guess, 'INV-2048')
  assert.equal(draft.invoice_date_guess, '2026-03-02')
  assert.equal(draft.inferred_total_cents, 7250)
})

test('parseInvoiceDraftFromExtractedText falls back to total-only draft', () => {
  const draft = parseInvoiceDraftFromExtractedText(`
South City Produce
Invoice No: 9917
Date: 2026-03-04
Amount Due $123.45
`)

  assert.equal(draft.line_items_count, 1)
  assert.equal(draft.line_items[0].description, 'Invoice total')
  assert.equal(draft.inferred_total_cents, 12345)
  assert.ok(draft.warnings.some((entry: string) => entry.includes('total amount only')))
})

test('parseExpenseDraftFromExtractedText parses expense rows from OCR text', () => {
  const draft = parseExpenseDraftFromExtractedText(`
03/01/2026 Fuel for delivery van 55.20
03/02/2026 Disposable gloves 12.50
Total 67.70
`)

  assert.equal(draft.expense_rows_count, 2)
  assert.equal(draft.inferred_total_cents, 6770)
  assert.equal(draft.rows[0].category, 'gas_mileage')
  assert.equal(draft.rows[1].category, 'supplies')
})

test('parseExpenseDraftFromExtractedText falls back to total-only expense', () => {
  const draft = parseExpenseDraftFromExtractedText(`
Restaurant Depot
Purchase Date: 2026-03-03
Total 86.22
`)

  assert.equal(draft.expense_rows_count, 1)
  assert.equal(draft.rows[0].description, 'Imported expense total')
  assert.equal(draft.inferred_total_cents, 8622)
  assert.ok(draft.warnings.some((entry: string) => entry.includes('total amount only')))
})
