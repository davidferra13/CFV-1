export type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

export type ParsedCatalogRows = {
  rows: {
    vendor_item_name: string
    vendor_sku: string | null
    unit_price_cents: number
    unit_size: number | null
    unit_measure: string | null
    notes: string | null
    source_row_number: number
  }[]
  totalRows: number
  skippedRows: number
  lineErrors: string[]
  priceFormat: 'dollars' | 'cents'
}

export type DraftInvoiceLineItem = {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export type DraftInvoiceSummary = {
  line_items_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  invoice_date_guess: string | null
  invoice_number_guess: string | null
  line_items: DraftInvoiceLineItem[]
  line_items_preview: DraftInvoiceLineItem[]
  warnings: string[]
}

export type DraftExpenseRow = {
  description: string
  amount_cents: number
  expense_date: string | null
  category: string
}

export type DraftExpenseSummary = {
  expense_rows_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  rows: DraftExpenseRow[]
  rows_preview: DraftExpenseRow[]
  warnings: string[]
}

const SUPPORTED_EXPENSE_CATEGORIES = new Set([
  'groceries',
  'alcohol',
  'specialty_items',
  'gas_mileage',
  'vehicle',
  'equipment',
  'supplies',
  'venue_rental',
  'labor',
  'uniforms',
  'subscriptions',
  'marketing',
  'insurance_licenses',
  'professional_services',
  'education',
  'utilities',
  'other',
])

function cleanString(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  const pushCell = () => {
    row.push(current.trim())
    current = ''
  }

  const pushRow = () => {
    const hasValue = row.some((cell) => cell.length > 0)
    if (hasValue) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '"') {
      const next = text[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ',') {
      pushCell()
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      pushCell()
      pushRow()
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    pushCell()
    pushRow()
  }

  const headers = rows[0] ?? []
  return {
    headers,
    rows: rows.slice(1),
  }
}

export async function parseSpreadsheet(buffer: Buffer): Promise<ParsedCsv> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Spreadsheet does not contain any sheets')
  }

  const rows: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = (row.values as unknown[]).slice(1).map((cell) => String(cell ?? '').trim())
    rows.push(cells)
  })

  const filtered = rows.filter((row) => row.some((cell) => cell.length > 0))
  const headers = filtered[0] ?? []
  return {
    headers,
    rows: filtered.slice(1),
  }
}

function detectColumnIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((header) => {
    const normalized = header.toLowerCase()
    return keywords.some((keyword) => normalized.includes(keyword))
  })
}

function parseNumberish(value: string): number | null {
  if (!value) return null
  const normalized = value.replace(/[$,%\s,]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function inferPriceFormat(values: number[]): 'dollars' | 'cents' {
  if (values.length === 0) return 'dollars'
  const maybeCents = values.filter((value) => Number.isInteger(value) && value >= 100).length
  return maybeCents >= Math.ceil(values.length * 0.7) ? 'cents' : 'dollars'
}

export function parseDateGuess(value: string): string | null {
  const cleaned = value.trim()
  if (!cleaned) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  const parsed = new Date(cleaned)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function toCents(amount: number, format: 'dollars' | 'cents'): number {
  return format === 'dollars' ? Math.round(amount * 100) : Math.round(amount)
}

export function normalizeCategory(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, '_')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!normalized) return 'other'

  if (
    normalized.includes('grocery') ||
    normalized.includes('food') ||
    normalized.includes('produce')
  ) {
    return 'groceries'
  }
  if (
    normalized.includes('alcohol') ||
    normalized.includes('wine') ||
    normalized.includes('beer')
  ) {
    return 'alcohol'
  }
  if (
    normalized.includes('supply') ||
    normalized.includes('glove') ||
    normalized.includes('paper') ||
    normalized.includes('container') ||
    normalized.includes('cleaning')
  ) {
    return 'supplies'
  }
  if (normalized.includes('equip')) return 'equipment'
  if (
    normalized.includes('labor') ||
    normalized.includes('payroll') ||
    normalized.includes('staff')
  ) {
    return 'labor'
  }
  if (normalized.includes('gas') || normalized.includes('mileage') || normalized.includes('fuel')) {
    return 'gas_mileage'
  }
  if (normalized.includes('vehicle') || normalized.includes('car')) return 'vehicle'
  if (normalized.includes('rent') || normalized.includes('venue')) return 'venue_rental'
  if (normalized.includes('marketing') || normalized.includes('ad')) return 'marketing'
  if (normalized.includes('subscription') || normalized.includes('software')) return 'subscriptions'
  if (normalized.includes('insurance') || normalized.includes('license'))
    return 'insurance_licenses'
  if (
    normalized.includes('professional') ||
    normalized.includes('legal') ||
    normalized.includes('accounting')
  ) {
    return 'professional_services'
  }
  if (normalized.includes('utility')) return 'utilities'
  if (normalized.includes('uniform')) return 'uniforms'
  if (normalized.includes('education') || normalized.includes('training')) return 'education'

  return SUPPORTED_EXPENSE_CATEGORIES.has(normalized) ? normalized : 'other'
}

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

export function parseInvoiceDraftFromTabular(parsed: ParsedCsv): DraftInvoiceSummary {
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    throw new Error('Invoice sheet must include a header row and data rows')
  }

  const descriptionIdx = detectColumnIndex(parsed.headers, ['description', 'item', 'product'])
  const quantityIdx = detectColumnIndex(parsed.headers, ['quantity', 'qty'])
  const unitPriceIdx = detectColumnIndex(parsed.headers, ['unit price', 'price', 'cost'])
  const totalIdx = detectColumnIndex(parsed.headers, ['line total', 'total', 'amount', 'extended'])
  const dateIdx = detectColumnIndex(parsed.headers, ['invoice date', 'date', 'bill date'])
  const invoiceNumberIdx = detectColumnIndex(parsed.headers, [
    'invoice #',
    'invoice number',
    'inv #',
    'inv no',
  ])

  if (descriptionIdx < 0 || (unitPriceIdx < 0 && totalIdx < 0)) {
    throw new Error('Could not detect invoice columns (description + amount)')
  }

  const monetaryValues: number[] = []
  for (const row of parsed.rows) {
    const rawUnit = unitPriceIdx >= 0 ? parseNumberish(row[unitPriceIdx] ?? '') : null
    const rawTotal = totalIdx >= 0 ? parseNumberish(row[totalIdx] ?? '') : null
    if (rawUnit != null && rawUnit >= 0) monetaryValues.push(rawUnit)
    if (rawTotal != null && rawTotal >= 0) monetaryValues.push(rawTotal)
  }
  const format = inferPriceFormat(monetaryValues)

  const warnings: string[] = []
  const lineItems: DraftInvoiceLineItem[] = []

  for (const row of parsed.rows) {
    const description = (row[descriptionIdx] ?? '').trim()
    if (!description) continue

    const quantityRaw = quantityIdx >= 0 ? parseNumberish(row[quantityIdx] ?? '') : null
    const unitRaw = unitPriceIdx >= 0 ? parseNumberish(row[unitPriceIdx] ?? '') : null
    const totalRaw = totalIdx >= 0 ? parseNumberish(row[totalIdx] ?? '') : null

    const quantity = quantityRaw != null && quantityRaw > 0 ? Number(quantityRaw.toFixed(3)) : 1
    let unitPriceCents = unitRaw != null ? toCents(unitRaw, format) : null
    let totalCents = totalRaw != null ? toCents(totalRaw, format) : null

    if (totalCents == null && unitPriceCents != null) {
      totalCents = Math.round(quantity * unitPriceCents)
    }
    if (unitPriceCents == null && totalCents != null && quantity > 0) {
      unitPriceCents = Math.round(totalCents / quantity)
    }

    if (unitPriceCents == null || totalCents == null || totalCents <= 0) {
      warnings.push(`Skipped row "${description}" due to missing/invalid price`)
      continue
    }

    lineItems.push({
      description,
      quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
    })
  }

  const inferredTotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0)
  const firstRow = parsed.rows[0] ?? []

  const invoiceDateGuess =
    dateIdx >= 0
      ? parseDateGuess(firstRow[dateIdx] ?? '')
      : ((_dipd) =>
          `${_dipd.getFullYear()}-${String(_dipd.getMonth() + 1).padStart(2, '0')}-${String(_dipd.getDate()).padStart(2, '0')}`)(
          new Date()
        )
  const invoiceNumberGuess =
    invoiceNumberIdx >= 0 ? cleanString(firstRow[invoiceNumberIdx] ?? '') : null

  return {
    line_items_count: lineItems.length,
    inferred_total_cents: inferredTotalCents,
    inferred_price_format: format,
    invoice_date_guess: invoiceDateGuess,
    invoice_number_guess: invoiceNumberGuess,
    line_items: lineItems,
    line_items_preview: lineItems.slice(0, 12),
    warnings,
  }
}

export function parseExpenseDraftFromTabular(parsed: ParsedCsv): DraftExpenseSummary {
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    throw new Error('Expense sheet must include a header row and data rows')
  }

  const descriptionIdx = detectColumnIndex(parsed.headers, [
    'description',
    'item',
    'expense',
    'memo',
  ])
  const amountIdx = detectColumnIndex(parsed.headers, ['amount', 'total', 'price', 'cost'])
  const dateIdx = detectColumnIndex(parsed.headers, ['date', 'purchase date', 'expense date'])
  const categoryIdx = detectColumnIndex(parsed.headers, ['category', 'type', 'tag'])

  if (descriptionIdx < 0 || amountIdx < 0) {
    throw new Error('Could not detect expense columns (description + amount)')
  }

  const rawAmounts = parsed.rows
    .map((row) => parseNumberish(row[amountIdx] ?? ''))
    .filter((value): value is number => value != null && value >= 0)
  const format = inferPriceFormat(rawAmounts)
  const warnings: string[] = []

  const rows: DraftExpenseRow[] = []
  for (const row of parsed.rows) {
    const description = (row[descriptionIdx] ?? '').trim()
    const amountRaw = parseNumberish(row[amountIdx] ?? '')
    if (!description || amountRaw == null) continue

    const amountCents = toCents(amountRaw, format)
    if (amountCents <= 0) {
      warnings.push(`Skipped row "${description}" due to non-positive amount`)
      continue
    }

    rows.push({
      description,
      amount_cents: amountCents,
      expense_date: dateIdx >= 0 ? parseDateGuess(row[dateIdx] ?? '') : null,
      category: categoryIdx >= 0 ? normalizeCategory(row[categoryIdx] ?? '') : 'other',
    })
  }

  const inferredTotalCents = rows.reduce((sum, row) => sum + row.amount_cents, 0)

  return {
    expense_rows_count: rows.length,
    inferred_total_cents: inferredTotalCents,
    inferred_price_format: format,
    rows,
    rows_preview: rows.slice(0, 12),
    warnings,
  }
}

const TRAILING_AMOUNT_PATTERN = /^(.*?)\s+\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/
const INVOICE_TOTAL_LABEL_PATTERN =
  /(invoice\s*total|grand\s*total|amount\s*due|balance\s*due|total)/i
const NON_TOTAL_LABEL_PATTERN = /(sub\s*total|tax|vat|shipping|discount|tip|change|deposit)/i
const DATE_TOKEN_PATTERN =
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i
const INVOICE_NUMBER_PATTERNS = [
  /\binvoice\s*(?:number|#|no\.?)?\s*[:\-]?\s*([a-z0-9][a-z0-9\-\/]*)/i,
  /\binv[\s\-#]*([a-z0-9][a-z0-9\-\/]*)/i,
] as const
const EXPENSE_SKIP_PATTERNS = [
  /subtotal/i,
  /sub total/i,
  /total/i,
  /tax/i,
  /change/i,
  /balance/i,
  /amount due/i,
  /payment/i,
  /cash/i,
  /credit/i,
  /debit/i,
  /receipt/i,
  /invoice\s*#/i,
  /invoice\s*number/i,
  /invoice\s*no/i,
  /^invoice\b/i,
  /^inv\b/i,
  /^date\b/i,
  /purchase\s*date/i,
] as const

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function splitTextLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 0)
}

function extractTrailingAmount(line: string): number | null {
  const match = line.match(TRAILING_AMOUNT_PATTERN)
  if (!match) return null
  return parseNumberish(match[2])
}

function isLikelyTotalLine(line: string): boolean {
  return INVOICE_TOTAL_LABEL_PATTERN.test(line) && !NON_TOTAL_LABEL_PATTERN.test(line)
}

function parseQuantityAndDescription(rawDescription: string): {
  description: string
  quantity: number
} {
  const normalized = normalizeWhitespace(rawDescription)
  if (!normalized) return { description: '', quantity: 1 }

  const prefixed = normalized.match(/^(\d+(?:\.\d+)?)\s*[xX]\s+(.+)$/)
  if (prefixed) {
    const quantity = Number(prefixed[1])
    return {
      description: normalizeWhitespace(prefixed[2]),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Number(quantity.toFixed(3)) : 1,
    }
  }

  const suffixed = normalized.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:x|qty)\b/i)
  if (suffixed) {
    const quantity = Number(suffixed[2])
    return {
      description: normalizeWhitespace(suffixed[1]),
      quantity: Number.isFinite(quantity) && quantity > 0 ? Number(quantity.toFixed(3)) : 1,
    }
  }

  return { description: normalized, quantity: 1 }
}

function stripLeadingDateToken(value: string): string {
  return normalizeWhitespace(
    value.replace(
      /^((?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(?:\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}))\s+/i,
      ''
    )
  )
}

function extractInvoiceNumber(rawText: string): string | null {
  for (const pattern of INVOICE_NUMBER_PATTERNS) {
    const match = rawText.match(pattern)
    if (!match) continue
    const value = cleanString(match[1])
    if (value) return value
  }
  return null
}

function extractDateGuessFromLines(lines: string[]): string | null {
  for (const line of lines) {
    if (!DATE_TOKEN_PATTERN.test(line)) continue
    const guess = parseDateGuess(line)
    if (guess) return guess
  }
  return null
}

export function parseInvoiceDraftFromExtractedText(rawText: string): DraftInvoiceSummary {
  const lines = splitTextLines(rawText)
  const warnings: string[] = []

  if (lines.length === 0) {
    return {
      line_items_count: 0,
      inferred_total_cents: 0,
      inferred_price_format: 'dollars',
      invoice_date_guess: null,
      invoice_number_guess: null,
      line_items: [],
      line_items_preview: [],
      warnings: ['No readable text found in uploaded file'],
    }
  }

  const rawLineItems: Array<{ description: string; quantity: number; amount: number }> = []
  const rawTotals: number[] = []

  for (const line of lines) {
    const amount = extractTrailingAmount(line)
    if (amount == null || amount <= 0) continue

    if (isLikelyTotalLine(line)) {
      rawTotals.push(amount)
      continue
    }

    const match = line.match(TRAILING_AMOUNT_PATTERN)
    if (!match) continue

    const descriptionRaw = stripLeadingDateToken(match[1])
    if (!descriptionRaw || !/[a-z]/i.test(descriptionRaw)) continue
    if (EXPENSE_SKIP_PATTERNS.some((pattern) => pattern.test(descriptionRaw))) continue

    const { description, quantity } = parseQuantityAndDescription(descriptionRaw)
    if (!description) continue

    rawLineItems.push({ description, quantity, amount })
  }

  const monetaryValues = [...rawLineItems.map((row) => row.amount), ...rawTotals]
  const format = inferPriceFormat(monetaryValues)

  const lineItems: DraftInvoiceLineItem[] = rawLineItems
    .map((row) => {
      const totalCents = toCents(row.amount, format)
      if (!Number.isFinite(totalCents) || totalCents <= 0) return null
      const unitPriceCents = Math.max(1, Math.round(totalCents / Math.max(1, row.quantity)))
      return {
        description: row.description,
        quantity: row.quantity,
        unit_price_cents: unitPriceCents,
        total_cents: totalCents,
      }
    })
    .filter((row): row is DraftInvoiceLineItem => row != null)

  let inferredTotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0)
  const totalFromLabel =
    rawTotals.length > 0 ? toCents(rawTotals[rawTotals.length - 1], format) : null

  if (lineItems.length === 0 && totalFromLabel != null && totalFromLabel > 0) {
    lineItems.push({
      description: 'Invoice total',
      quantity: 1,
      unit_price_cents: totalFromLabel,
      total_cents: totalFromLabel,
    })
    inferredTotalCents = totalFromLabel
    warnings.push('No invoice line items detected; draft created from total amount only')
  } else if (
    totalFromLabel != null &&
    totalFromLabel > 0 &&
    inferredTotalCents > 0 &&
    Math.abs(inferredTotalCents - totalFromLabel) > 150
  ) {
    warnings.push('Line-item total does not match labeled invoice total')
  }

  return {
    line_items_count: lineItems.length,
    inferred_total_cents: inferredTotalCents,
    inferred_price_format: format,
    invoice_date_guess: extractDateGuessFromLines(lines),
    invoice_number_guess: extractInvoiceNumber(rawText),
    line_items: lineItems,
    line_items_preview: lineItems.slice(0, 12),
    warnings,
  }
}

export function parseExpenseDraftFromExtractedText(rawText: string): DraftExpenseSummary {
  const lines = splitTextLines(rawText)
  const warnings: string[] = []

  if (lines.length === 0) {
    return {
      expense_rows_count: 0,
      inferred_total_cents: 0,
      inferred_price_format: 'dollars',
      rows: [],
      rows_preview: [],
      warnings: ['No readable text found in uploaded file'],
    }
  }

  const globalDate = extractDateGuessFromLines(lines)
  const rawRows: Array<{ description: string; amount: number; expenseDate: string | null }> = []
  const rawTotals: number[] = []

  for (const line of lines) {
    const amount = extractTrailingAmount(line)
    if (amount == null || amount <= 0) continue

    if (isLikelyTotalLine(line)) {
      rawTotals.push(amount)
      continue
    }

    const match = line.match(TRAILING_AMOUNT_PATTERN)
    if (!match) continue

    const description = stripLeadingDateToken(match[1])
    if (!description || !/[a-z]/i.test(description)) continue
    if (EXPENSE_SKIP_PATTERNS.some((pattern) => pattern.test(description))) continue

    rawRows.push({
      description,
      amount,
      expenseDate: DATE_TOKEN_PATTERN.test(line) ? parseDateGuess(line) : globalDate,
    })
  }

  const format = inferPriceFormat([...rawRows.map((row) => row.amount), ...rawTotals])
  const rows: DraftExpenseRow[] = rawRows
    .map((row) => {
      const amountCents = toCents(row.amount, format)
      if (!Number.isFinite(amountCents) || amountCents <= 0) return null
      return {
        description: row.description,
        amount_cents: amountCents,
        expense_date: row.expenseDate,
        category: normalizeCategory(row.description),
      }
    })
    .filter((row): row is DraftExpenseRow => row != null)

  if (rows.length === 0) {
    const fallbackTotal =
      rawTotals.length > 0 ? toCents(rawTotals[rawTotals.length - 1], format) : null
    if (fallbackTotal != null && fallbackTotal > 0) {
      rows.push({
        description: 'Imported expense total',
        amount_cents: fallbackTotal,
        expense_date: globalDate,
        category: 'other',
      })
      warnings.push('No detailed expense rows detected; draft created from total amount only')
    }
  }

  const inferredTotalCents = rows.reduce((sum, row) => sum + row.amount_cents, 0)
  return {
    expense_rows_count: rows.length,
    inferred_total_cents: inferredTotalCents,
    inferred_price_format: format,
    rows,
    rows_preview: rows.slice(0, 12),
    warnings,
  }
}
