// CSV Payments Parser
// Deterministic column-detection parser for historical payment/ledger data.
// No AI required - handles any spreadsheet format a chef might export.
// Mirrors the pattern established in parse-csv-events.ts.

// ============================================
// TYPES
// ============================================

type PaymentCsvColumnType =
  | 'date'
  | 'client'
  | 'amount'
  | 'method'
  | 'description'
  | 'type'
  | 'skip'

type PaymentCsvColumnMapping = {
  index: number
  header: string
  detected: PaymentCsvColumnType
}

export type ParsedPaymentRow = {
  date: string // YYYY-MM-DD or raw string if date is unparseable
  client_name: string
  amount_dollars: string // dollar string e.g. "1500.00" - empty if not found
  payment_method: string // empty if not found
  description: string
  entry_type: string // payment, deposit, tip, refund
}

export type CsvPaymentsParseResult = {
  rows: ParsedPaymentRow[]
  headers: string[]
  totalRows: number
  skippedRows: number
  warnings: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ============================================
// CSV TOKENIZER (same algorithm as parse-csv-events.ts)
// ============================================

function parseRawCsv(text: string): string[][] {
  const lines: string[][] = []
  let current: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      current.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++
      current.push(cell)
      cell = ''
      if (current.some((c) => c.trim())) lines.push(current)
      current = []
    } else {
      cell += ch
    }
  }

  current.push(cell)
  if (current.some((c) => c.trim())) lines.push(current)

  return lines
}

// ============================================
// COLUMN DETECTION
// ============================================

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function detectPaymentColumn(header: string): PaymentCsvColumnType {
  const h = normalizeHeader(header)

  const dateKeys = [
    'date',
    'payment_date',
    'received',
    'received_date',
    'paid_date',
    'transaction_date',
  ]
  const clientKeys = ['client', 'client_name', 'customer', 'from', 'payer', 'name']
  const amountKeys = ['amount', 'paid', 'payment', 'total', 'received', 'income', 'revenue']
  const methodKeys = [
    'method',
    'payment_method',
    'how_paid',
    'paid_via',
    'paid_by',
    'payment_type',
    'pay_method',
  ]
  const descriptionKeys = [
    'description',
    'for',
    'occasion',
    'event',
    'gig',
    'service',
    'memo',
    'notes',
    'reason',
  ]
  const typeKeys = ['type', 'entry_type']

  if (dateKeys.includes(h)) return 'date'
  if (clientKeys.includes(h)) return 'client'
  if (amountKeys.includes(h)) return 'amount'
  if (methodKeys.includes(h)) return 'method'
  if (descriptionKeys.includes(h)) return 'description'
  if (typeKeys.includes(h)) return 'type'

  return 'skip'
}

// ============================================
// DATE NORMALIZATION
// Returns YYYY-MM-DD or the original string if it can't be parsed.
// ============================================

function normalizeDate(raw: string): string {
  const s = raw.trim()
  if (!s) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Try JS Date parsing - handles "Jan 15, 2024", "1/15/2024", "15/01/2024", etc.
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear()
    const mm = String(parsed.getMonth() + 1).padStart(2, '0')
    const dd = String(parsed.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Return raw for chef to correct
  return s
}

// ============================================
// AMOUNT NORMALIZATION
// Strips currency symbols, commas. Returns "1500.00" style or empty.
// ============================================

function normalizeAmount(raw: string): string {
  const s = raw.trim().replace(/[$,\s]/g, '')
  if (!s) return ''
  const n = parseFloat(s)
  if (isNaN(n) || n < 0) return ''
  return n.toFixed(2)
}

// ============================================
// PAYMENT METHOD NORMALIZATION
// Maps common aliases to the canonical enum values.
// ============================================

const METHOD_MAP: Record<string, string> = {
  cash: 'cash',
  venmo: 'venmo',
  zelle: 'zelle',
  paypal: 'paypal',
  card: 'card',
  credit: 'card',
  debit: 'card',
  'credit card': 'card',
  'debit card': 'card',
  check: 'check',
  cheque: 'check',
  other: 'other',
}

function normalizeMethod(raw: string): string {
  const s = raw.trim().toLowerCase()
  return METHOD_MAP[s] || ''
}

// ============================================
// ENTRY TYPE NORMALIZATION
// Maps common aliases to canonical ledger entry types.
// ============================================

const TYPE_MAP: Record<string, string> = {
  payment: 'payment',
  full: 'payment',
  final: 'payment',
  deposit: 'deposit',
  down_payment: 'deposit',
  retainer: 'deposit',
  tip: 'tip',
  gratuity: 'tip',
  refund: 'refund',
  return: 'refund',
  credit: 'refund',
}

function normalizeEntryType(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '_')
  return TYPE_MAP[s] || 'payment'
}

// ============================================
// ROW -> ParsedPaymentRow
// ============================================

function rowToPayment(row: string[], mappings: PaymentCsvColumnMapping[]): ParsedPaymentRow | null {
  const get = (type: PaymentCsvColumnType): string => {
    const m = mappings.find((m) => m.detected === type)
    if (!m || m.index >= row.length) return ''
    return row[m.index]?.trim() || ''
  }

  const rawDate = get('date')
  const clientName = get('client')
  const rawAmount = get('amount')

  // Date and amount are the minimum required fields for a payment
  if (!rawDate && !rawAmount) return null
  if (!rawDate) return null

  return {
    date: normalizeDate(rawDate),
    client_name: clientName,
    amount_dollars: normalizeAmount(rawAmount),
    payment_method: normalizeMethod(get('method')),
    description: get('description'),
    entry_type: normalizeEntryType(get('type')),
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export function parsePaymentsCsv(csvText: string): CsvPaymentsParseResult {
  const warnings: string[] = []
  const text = csvText.trim()

  if (!text) {
    return {
      rows: [],
      headers: [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ['No CSV content found'],
      confidence: 'low',
    }
  }

  const rawRows = parseRawCsv(text)

  if (rawRows.length < 2) {
    return {
      rows: [],
      headers: rawRows[0] || [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ['CSV appears to have only a header row and no data'],
      confidence: 'low',
    }
  }

  const headers = rawRows[0].map((h) => h.trim().replace(/^"|"$/g, ''))
  const dataRows = rawRows.slice(1)

  const columnMappings: PaymentCsvColumnMapping[] = headers.map((header, index) => ({
    index,
    header,
    detected: detectPaymentColumn(header),
  }))

  // Quality checks
  const hasDate = columnMappings.some((m) => m.detected === 'date')
  const hasClient = columnMappings.some((m) => m.detected === 'client')
  const hasAmount = columnMappings.some((m) => m.detected === 'amount')

  if (!hasDate) {
    warnings.push(
      'No date column detected. Make sure your CSV has a "Date" or "Payment Date" column.'
    )
  }
  if (!hasClient) {
    warnings.push(
      'No client column detected. Make sure your CSV has a "Client" or "Customer" column.'
    )
  }
  if (!hasAmount) {
    warnings.push('No amount column detected. Make sure your CSV has an "Amount" or "Paid" column.')
  }

  const rows: ParsedPaymentRow[] = []
  let skippedRows = 0

  for (const row of dataRows) {
    if (!row.some((c) => c.trim())) continue
    const parsed = rowToPayment(row, columnMappings)
    if (parsed) {
      rows.push(parsed)
    } else {
      skippedRows++
    }
  }

  if (rows.length === 0) {
    warnings.push('No valid payment records could be extracted from this CSV.')
  }

  const confidence: CsvPaymentsParseResult['confidence'] =
    hasDate && hasClient && hasAmount ? 'high' : hasDate && hasAmount ? 'medium' : 'low'

  return {
    rows,
    headers,
    totalRows: dataRows.filter((r) => r.some((c) => c.trim())).length,
    skippedRows,
    warnings,
    confidence,
  }
}
