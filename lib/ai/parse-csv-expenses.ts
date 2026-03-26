// CSV Expenses Parser
// Deterministic column-detection parser for historical expense data.
// No AI required - handles any spreadsheet format a chef might export.
// Mirrors the pattern established in parse-csv-events.ts.

import { EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'

// ============================================
// TYPES
// ============================================

type ExpenseCsvColumnType =
  | 'date'
  | 'description'
  | 'amount'
  | 'category'
  | 'vendor'
  | 'notes'
  | 'event'
  | 'tax_deductible'
  | 'skip'

type ExpenseCsvColumnMapping = {
  index: number
  header: string
  detected: ExpenseCsvColumnType
}

export type ParsedExpenseRow = {
  date: string // YYYY-MM-DD or raw string if date is unparseable
  description: string
  amount_dollars: string // dollar string e.g. "45.99" - empty if not found
  category: string // normalized category key or empty
  vendor: string
  notes: string
  event: string
  tax_deductible: boolean
}

export type CsvExpensesParseResult = {
  rows: ParsedExpenseRow[]
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

function detectExpenseColumn(header: string): ExpenseCsvColumnType {
  const h = normalizeHeader(header)

  const dateKeys = ['date', 'expense_date', 'purchased', 'purchase_date', 'transaction_date']
  const descriptionKeys = ['description', 'item', 'what', 'purchase', 'memo', 'detail']
  const amountKeys = ['amount', 'cost', 'total', 'price', 'spent', 'charge']
  const categoryKeys = ['category', 'type', 'expense_type']
  const vendorKeys = ['vendor', 'store', 'merchant', 'supplier', 'where', 'shop', 'retailer']
  const notesKeys = ['notes', 'note', 'comments', 'remarks']
  const eventKeys = ['event', 'gig', 'job', 'for']
  const taxKeys = ['deductible', 'tax_deductible', 'tax', 'write_off']

  if (dateKeys.includes(h)) return 'date'
  if (descriptionKeys.includes(h)) return 'description'
  if (amountKeys.includes(h)) return 'amount'
  if (categoryKeys.includes(h)) return 'category'
  if (vendorKeys.includes(h)) return 'vendor'
  if (notesKeys.includes(h)) return 'notes'
  if (eventKeys.includes(h)) return 'event'
  if (taxKeys.includes(h)) return 'tax_deductible'

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
// Strips currency symbols, commas. Returns "45.99" style or empty.
// ============================================

function normalizeAmount(raw: string): string {
  const s = raw.trim().replace(/[$,\s]/g, '')
  if (!s) return ''
  const n = parseFloat(s)
  if (isNaN(n) || n < 0) return ''
  return n.toFixed(2)
}

// ============================================
// CATEGORY NORMALIZATION
// Maps common aliases to the canonical expense categories.
// ============================================

const CATEGORY_ALIAS_MAP: Record<string, string> = {
  // Direct matches (canonical values)
  groceries: 'groceries',
  alcohol: 'alcohol',
  specialty_items: 'specialty_items',
  gas_mileage: 'gas_mileage',
  vehicle: 'vehicle',
  equipment: 'equipment',
  supplies: 'supplies',
  venue_rental: 'venue_rental',
  labor: 'labor',
  uniforms: 'uniforms',
  subscriptions: 'subscriptions',
  marketing: 'marketing',
  insurance_licenses: 'insurance_licenses',
  professional_services: 'professional_services',
  education: 'education',
  utilities: 'utilities',
  other: 'other',
  // Common aliases
  food: 'groceries',
  grocery: 'groceries',
  ingredients: 'groceries',
  produce: 'groceries',
  meat: 'groceries',
  seafood: 'groceries',
  dairy: 'groceries',
  beverage: 'alcohol',
  beverages: 'alcohol',
  drinks: 'alcohol',
  wine: 'alcohol',
  beer: 'alcohol',
  liquor: 'alcohol',
  spirits: 'alcohol',
  specialty: 'specialty_items',
  gas: 'gas_mileage',
  mileage: 'gas_mileage',
  fuel: 'gas_mileage',
  travel: 'gas_mileage',
  transportation: 'gas_mileage',
  car: 'vehicle',
  auto: 'vehicle',
  tools: 'equipment',
  kitchen: 'equipment',
  appliance: 'equipment',
  appliances: 'equipment',
  cleaning: 'supplies',
  disposables: 'supplies',
  packaging: 'supplies',
  rent: 'venue_rental',
  rental: 'venue_rental',
  venue: 'venue_rental',
  staff: 'labor',
  wages: 'labor',
  payroll: 'labor',
  helpers: 'labor',
  uniform: 'uniforms',
  clothing: 'uniforms',
  apron: 'uniforms',
  subscription: 'subscriptions',
  software: 'subscriptions',
  saas: 'subscriptions',
  ads: 'marketing',
  advertising: 'marketing',
  promotion: 'marketing',
  insurance: 'insurance_licenses',
  license: 'insurance_licenses',
  licenses: 'insurance_licenses',
  permit: 'insurance_licenses',
  permits: 'insurance_licenses',
  legal: 'professional_services',
  accounting: 'professional_services',
  consulting: 'professional_services',
  training: 'education',
  course: 'education',
  courses: 'education',
  class: 'education',
  classes: 'education',
  certification: 'education',
  utility: 'utilities',
  electric: 'utilities',
  water: 'utilities',
  internet: 'utilities',
  phone: 'utilities',
  misc: 'other',
  miscellaneous: 'other',
  general: 'other',
}

function normalizeCategory(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  if (!s) return ''

  // Check alias map first
  if (CATEGORY_ALIAS_MAP[s]) return CATEGORY_ALIAS_MAP[s]

  // Check if it directly matches a canonical value
  if ((EXPENSE_CATEGORY_VALUES as readonly string[]).includes(s)) return s

  return ''
}

// ============================================
// TAX DEDUCTIBLE NORMALIZATION
// ============================================

function normalizeTaxDeductible(raw: string): boolean {
  const s = raw.trim().toLowerCase()
  if (!s) return true // default to true
  const falseValues = ['false', 'no', 'n', '0', 'f']
  if (falseValues.includes(s)) return false
  return true
}

// ============================================
// ROW -> ParsedExpenseRow
// ============================================

function rowToExpense(row: string[], mappings: ExpenseCsvColumnMapping[]): ParsedExpenseRow | null {
  const get = (type: ExpenseCsvColumnType): string => {
    const m = mappings.find((m) => m.detected === type)
    if (!m || m.index >= row.length) return ''
    return row[m.index]?.trim() || ''
  }

  const rawDate = get('date')
  const description = get('description')
  const rawAmount = get('amount')

  // Date and either description or amount are required
  if (!rawDate && !description && !rawAmount) return null
  if (!rawDate) return null

  return {
    date: normalizeDate(rawDate),
    description: description,
    amount_dollars: normalizeAmount(rawAmount),
    category: normalizeCategory(get('category')),
    vendor: get('vendor'),
    notes: get('notes'),
    event: get('event'),
    tax_deductible: normalizeTaxDeductible(get('tax_deductible')),
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export function parseExpensesCsv(csvText: string): CsvExpensesParseResult {
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

  const columnMappings: ExpenseCsvColumnMapping[] = headers.map((header, index) => ({
    index,
    header,
    detected: detectExpenseColumn(header),
  }))

  // Quality checks
  const hasDate = columnMappings.some((m) => m.detected === 'date')
  const hasDescription = columnMappings.some((m) => m.detected === 'description')
  const hasAmount = columnMappings.some((m) => m.detected === 'amount')
  const hasCategory = columnMappings.some((m) => m.detected === 'category')

  if (!hasDate) {
    warnings.push(
      'No date column detected. Make sure your CSV has a "Date" or "Expense Date" column.'
    )
  }
  if (!hasDescription) {
    warnings.push(
      'No description column detected. Make sure your CSV has a "Description" or "Item" column.'
    )
  }
  if (!hasAmount) {
    warnings.push('No amount column detected. Expenses will be imported without dollar amounts.')
  }
  if (!hasCategory) {
    warnings.push('No category column detected. All expenses will default to "Other" category.')
  }

  const rows: ParsedExpenseRow[] = []
  let skippedRows = 0

  for (const row of dataRows) {
    if (!row.some((c) => c.trim())) continue
    const parsed = rowToExpense(row, columnMappings)
    if (parsed) {
      rows.push(parsed)
    } else {
      skippedRows++
    }
  }

  if (rows.length === 0) {
    warnings.push('No valid expense records could be extracted from this CSV.')
  }

  const confidence: CsvExpensesParseResult['confidence'] =
    hasDate && hasDescription && hasAmount
      ? 'high'
      : hasDate && (hasDescription || hasAmount)
        ? 'medium'
        : 'low'

  return {
    rows,
    headers,
    totalRows: dataRows.filter((r) => r.some((c) => c.trim())).length,
    skippedRows,
    warnings,
    confidence,
  }
}
