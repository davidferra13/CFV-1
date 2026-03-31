/**
 * Spreadsheet Parser
 * Extracts price data from XLS, XLSX, and CSV attachments.
 */

import XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'

/**
 * Parse a spreadsheet buffer into price rows.
 * Returns array of { product, price, unit, case_size }
 */
export function parseSpreadsheet(buffer, filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase()

  if (ext === 'csv') return parseCsv(buffer)
  return parseExcel(buffer)
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const results = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    results.push(...extractPricesFromRows(rows))
  }

  return results
}

function parseCsv(buffer) {
  const text = buffer.toString('utf8')
  const rows = csvParse(text, { skip_empty_lines: true, relax_column_count: true })
  return extractPricesFromRows(rows)
}

/**
 * Heuristic extraction: find columns that look like product names and prices.
 * Handles various spreadsheet formats from different distributors.
 */
function extractPricesFromRows(rows) {
  if (rows.length < 2) return []

  // Try to identify header row and column mapping
  const headerIdx = findHeaderRow(rows)
  const headers = rows[headerIdx] || []

  const colMap = identifyColumns(headers)
  if (!colMap.product || colMap.price === undefined) {
    // No clear headers - try positional extraction
    return extractPositional(rows)
  }

  const results = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const product = String(row[colMap.product] || '').trim()
    const rawPrice = row[colMap.price]
    const price = parsePrice(rawPrice)
    const unit = colMap.unit !== undefined ? normalizeUnit(String(row[colMap.unit] || '')) : 'each'
    const caseSize = colMap.caseSize !== undefined ? String(row[colMap.caseSize] || '') : null

    if (!product || product.length < 3 || product.length > 100) continue
    if (isNaN(price) || price <= 0 || price > 500) continue
    if (/^(total|subtotal|tax|delivery)/i.test(product)) continue

    results.push({
      product,
      price: price.toFixed(2),
      unit: unit || 'each',
      case_size: caseSize || null
    })
  }

  return results
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    if (!row) continue
    const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
    if (/product|item|description|name/.test(rowStr) && /price|cost|rate/.test(rowStr)) {
      return i
    }
  }
  return 0
}

function identifyColumns(headers) {
  const map = { product: null, price: null, unit: null, caseSize: null }
  const lower = headers.map(h => String(h || '').toLowerCase())

  for (let i = 0; i < lower.length; i++) {
    if (/product|item|description|name/i.test(lower[i]) && map.product === null) map.product = i
    if (/price|cost|rate/i.test(lower[i]) && !/case/i.test(lower[i]) && map.price === null) map.price = i
    if (/unit|uom|measure/i.test(lower[i]) && map.unit === null) map.unit = i
    if (/case|pack|size/i.test(lower[i]) && map.caseSize === null) map.caseSize = i
  }

  return map
}

function extractPositional(rows) {
  // Assume first column with text is product, first column with numbers is price
  const results = []
  for (const row of rows) {
    if (!row || row.length < 2) continue

    let product = null
    let price = null

    for (const cell of row) {
      const s = String(cell || '').trim()
      if (!s) continue
      if (!product && s.length >= 3 && isNaN(parsePrice(s))) {
        product = s
      } else if (!price && !isNaN(parsePrice(s)) && parsePrice(s) > 0) {
        price = parsePrice(s)
      }
    }

    if (product && price && price <= 500) {
      results.push({ product, price: price.toFixed(2), unit: 'each', case_size: null })
    }
  }

  return results
}

function parsePrice(val) {
  if (val == null) return NaN
  const s = String(val).replace(/[$,]/g, '').trim()
  return parseFloat(s)
}

function normalizeUnit(unit) {
  const map = {
    'lb': 'lb', 'lbs': 'lb', 'pound': 'lb',
    'oz': 'oz', 'ounce': 'oz',
    'each': 'each', 'ea': 'each', 'ct': 'each',
    'case': 'case', 'cs': 'case',
    'gal': 'gal', 'gallon': 'gal',
    'dz': 'dozen', 'dozen': 'dozen'
  }
  return map[unit.toLowerCase()] || unit.toLowerCase() || 'each'
}
