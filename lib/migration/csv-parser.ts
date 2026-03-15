// CSV parsing utilities - shared, not a server action
// Used by csv-import-actions.ts and client components for preview

export type ParsedCSV = {
  headers: string[]
  rows: string[][]
}

/**
 * Detect the delimiter used in CSV text.
 * Checks comma, tab, semicolon - picks whichever appears most in the first line.
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const candidates = [
    { char: ',', count: (firstLine.match(/,/g) || []).length },
    { char: '\t', count: (firstLine.match(/\t/g) || []).length },
    { char: ';', count: (firstLine.match(/;/g) || []).length },
  ]
  candidates.sort((a, b) => b.count - a.count)
  return candidates[0].count > 0 ? candidates[0].char : ','
}

/**
 * Heuristic: if the first row contains mostly non-numeric values, treat it as headers.
 */
export function detectHeaders(firstRow: string[]): boolean {
  if (firstRow.length === 0) return false
  const nonNumericCount = firstRow.filter((cell) => {
    const trimmed = cell.trim()
    if (trimmed === '') return true
    return isNaN(Number(trimmed))
  }).length
  // If more than half the cells are non-numeric, likely headers
  return nonNumericCount > firstRow.length / 2
}

/**
 * Parse CSV text into rows, handling quoted fields with embedded delimiters and newlines.
 */
export function parseCSV(text: string, delimiter?: string): ParsedCSV {
  const delim = delimiter || detectDelimiter(text)
  const rows = parseCSVRows(text, delim)

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const hasHeaders = detectHeaders(rows[0])

  if (hasHeaders) {
    const headers = rows[0].map((h) => h.trim())
    return { headers, rows: rows.slice(1) }
  }

  // Generate generic column names
  const colCount = rows[0].length
  const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`)
  return { headers, rows }
}

/**
 * Low-level CSV row parser that handles quoted fields properly.
 */
function parseCSVRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      currentField += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
      continue
    }

    if (char === delimiter) {
      currentRow.push(currentField)
      currentField = ''
      i++
      continue
    }

    if (char === '\r') {
      // Skip \r, handle \r\n as single newline
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++
      }
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      i++
      continue
    }

    if (char === '\n') {
      currentRow.push(currentField)
      currentField = ''
      if (currentRow.some((cell) => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      i++
      continue
    }

    currentField += char
    i++
  }

  // Handle last field/row
  currentRow.push(currentField)
  if (currentRow.some((cell) => cell.trim() !== '')) {
    rows.push(currentRow)
  }

  return rows
}
