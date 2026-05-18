import type { ParsedCatalogRows, ParsedCsv } from './types'
import {
  cleanString,
  detectColumnIndex,
  inferPriceFormat,
  parseCsv,
  parseNumberish,
  parseSpreadsheet,
} from './shared'

export function parseCatalogTabularRows(parsed: ParsedCsv): ParsedCatalogRows {
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    throw new Error('File must include a header row and at least one data row')
  }

  const itemNameIdx = detectColumnIndex(parsed.headers, ['item', 'name', 'product', 'description'])
  const skuIdx = detectColumnIndex(parsed.headers, ['sku', 'item code', 'upc', 'plu'])
  const priceIdx = detectColumnIndex(parsed.headers, ['price', 'cost', 'unit price', 'unit_price'])
  const unitSizeIdx = detectColumnIndex(parsed.headers, ['size', 'pack', 'quantity size'])
  const unitMeasureIdx = detectColumnIndex(parsed.headers, ['unit', 'uom', 'measure'])
  const notesIdx = detectColumnIndex(parsed.headers, ['note', 'comment', 'memo'])

  if (itemNameIdx < 0 || priceIdx < 0) {
    throw new Error('Could not detect required catalog columns (item name + price)')
  }

  const rawPrices = parsed.rows
    .map((row) => parseNumberish(row[priceIdx] ?? ''))
    .filter((value): value is number => value != null && value >= 0)
  const inferredPriceFormat = inferPriceFormat(rawPrices)

  const resultRows: ParsedCatalogRows['rows'] = []
  const lineErrors: string[] = []
  let skippedRows = 0

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const row = parsed.rows[i]
    const sourceRowNumber = i + 2

    const itemName = (row[itemNameIdx] ?? '').trim()
    const rawPrice = row[priceIdx] ?? ''
    const parsedPrice = parseNumberish(rawPrice)

    if (!itemName || parsedPrice == null) {
      skippedRows += 1
      if (!itemName) lineErrors.push(`Row ${sourceRowNumber}: missing item name`)
      if (parsedPrice == null) lineErrors.push(`Row ${sourceRowNumber}: invalid price`)
      continue
    }

    const unitPriceCents =
      inferredPriceFormat === 'dollars' ? Math.round(parsedPrice * 100) : Math.round(parsedPrice)
    if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
      skippedRows += 1
      lineErrors.push(`Row ${sourceRowNumber}: invalid normalized price`)
      continue
    }

    const unitSizeValue = unitSizeIdx >= 0 ? parseNumberish(row[unitSizeIdx] ?? '') : null
    resultRows.push({
      vendor_item_name: itemName,
      vendor_sku: skuIdx >= 0 ? cleanString(row[skuIdx]) : null,
      unit_price_cents: unitPriceCents,
      unit_size:
        unitSizeValue != null && unitSizeValue > 0 ? Number(unitSizeValue.toFixed(3)) : null,
      unit_measure: unitMeasureIdx >= 0 ? cleanString(row[unitMeasureIdx]) : null,
      notes: notesIdx >= 0 ? cleanString(row[notesIdx]) : null,
      source_row_number: sourceRowNumber,
    })
  }

  return {
    rows: resultRows,
    totalRows: parsed.rows.length,
    skippedRows,
    lineErrors,
    priceFormat: inferredPriceFormat,
  }
}

export function parseCatalogCsvRows(csvText: string): ParsedCatalogRows {
  return parseCatalogTabularRows(parseCsv(csvText))
}

export async function parseCatalogSpreadsheetRows(buffer: Buffer): Promise<ParsedCatalogRows> {
  const parsed = await parseSpreadsheet(buffer)
  return parseCatalogTabularRows(parsed)
}
