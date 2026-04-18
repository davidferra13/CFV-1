// Receipt Text Parser - Deterministic (Formula > AI)
// Extracts structured data from raw OCR text using regex patterns.
// No LLM, no Ollama, no cloud AI. Pure deterministic parsing.
//
// All monetary amounts returned in CENTS (integers).

export type ParsedLineItem = {
  name: string
  priceCents: number
  quantity: number | null
  unit: string | null
}

export type ParsedReceipt = {
  storeName: string | null
  date: string | null // ISO YYYY-MM-DD format
  totalCents: number | null
  subtotalCents: number | null
  taxCents: number | null
  items: ParsedLineItem[]
}

// --- Store Name Detection ---

// Common grocery/retail store names. OCR often puts the store name in the first
// few lines of the receipt, usually in ALL CAPS or as a recognizable brand.
const KNOWN_STORES = [
  'WALMART',
  'WAL-MART',
  'TARGET',
  'COSTCO',
  'KROGER',
  'PUBLIX',
  'SAFEWAY',
  'ALBERTSONS',
  'WHOLE FOODS',
  'TRADER JOE',
  'ALDI',
  'LIDL',
  'H-E-B',
  'HEB',
  'WEGMANS',
  'FOOD LION',
  'STOP & SHOP',
  'STOP AND SHOP',
  'GIANT',
  'MEIJER',
  'SPROUTS',
  'WINN-DIXIE',
  'WINN DIXIE',
  'PIGGLY WIGGLY',
  'HARRIS TEETER',
  'FRESH MARKET',
  'WINCO',
  'SMART & FINAL',
  'FOOD 4 LESS',
  'GROCERY OUTLET',
  'MARKET BASKET',
  "BJ'S",
  "SAM'S CLUB",
  'SAMS CLUB',
  'DOLLAR GENERAL',
  'DOLLAR TREE',
  'CVS',
  'WALGREENS',
  'RITE AID',
  'HOME DEPOT',
  'LOWES',
  "LOWE'S",
  'RESTAURANT DEPOT',
  'US FOODS',
  'SYSCO',
  'GORDON FOOD',
  'CHEF STORE',
  'CASH & CARRY',
  'SHOPRITE',
  'ACME',
  'RALPH',
  'VONS',
  'PAVILIONS',
  'STATER BROS',
  'FOOD MAXX',
]

/**
 * Attempt to extract store name from OCR text.
 * Checks the first 5 lines for known store names, then falls back to the
 * first non-empty, non-numeric line that looks like a store name.
 */
function extractStoreName(lines: string[]): string | null {
  const headerLines = lines.slice(0, 8)

  // Check for known stores (case-insensitive)
  for (const line of headerLines) {
    const upper = line.toUpperCase().trim()
    for (const store of KNOWN_STORES) {
      if (upper.includes(store)) {
        // Return the matched store name in title case
        return store
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      }
    }
  }

  // Fallback: first line that looks like a name (not a number, not too long, not empty)
  for (const line of headerLines) {
    const trimmed = line.trim()
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 50 &&
      !/^\d+$/.test(trimmed) && // not purely numeric
      !/^\$/.test(trimmed) && // not a price
      !/^#/.test(trimmed) && // not a receipt number
      !/^\d{1,2}[\/\-]\d{1,2}/.test(trimmed) && // not a date
      !/^tel|^phone|^fax|^store\s*#/i.test(trimmed) // not phone/store number
    ) {
      return trimmed
    }
  }

  return null
}

// --- Date Extraction ---

// Common date patterns found on receipts
const DATE_PATTERNS = [
  // MM/DD/YYYY or MM-DD-YYYY
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})/,
  // YYYY-MM-DD (ISO)
  /(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  // Month DD, YYYY
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{1,2}),?\s+(20\d{2}|\d{2})/i,
  // DD Month YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(20\d{2}|\d{2})/i,
]

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function parseMonthName(name: string): string {
  return MONTH_MAP[name.toLowerCase().slice(0, 3)] || '01'
}

function normalizeYear(year: string): string {
  if (year.length === 2) {
    const num = parseInt(year, 10)
    return num > 50 ? `19${year}` : `20${year}`
  }
  return year
}

/**
 * Extract date from OCR text.
 * Returns ISO YYYY-MM-DD format or null.
 */
function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    // ISO format: YYYY-MM-DD
    if (pattern === DATE_PATTERNS[1]) {
      const yyyy = match[1]
      const mm = match[2].padStart(2, '0')
      const dd = match[3].padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    // Month name formats
    if (pattern === DATE_PATTERNS[2]) {
      const mm = parseMonthName(match[1])
      const dd = match[2].padStart(2, '0')
      const yyyy = normalizeYear(match[3])
      return `${yyyy}-${mm}-${dd}`
    }

    if (pattern === DATE_PATTERNS[3]) {
      const dd = match[1].padStart(2, '0')
      const mm = parseMonthName(match[2])
      const yyyy = normalizeYear(match[3])
      return `${yyyy}-${mm}-${dd}`
    }

    // MM/DD/YYYY or MM-DD-YYYY
    if (pattern === DATE_PATTERNS[0]) {
      const mm = match[1].padStart(2, '0')
      const dd = match[2].padStart(2, '0')
      const yyyy = normalizeYear(match[3])
      return `${yyyy}-${mm}-${dd}`
    }
  }

  return null
}

// --- Dollar Amount Extraction ---

/**
 * Parse a dollar string (e.g., "$12.99", "12.99", "1,299.50") to cents.
 * Returns the integer amount in cents, or null if unparseable.
 */
function dollarsToCents(raw: string): number | null {
  // Remove $ sign, commas, and leading/trailing whitespace
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  // Must look like a number with optional decimal
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return null
  return Math.round(num * 100)
}

// --- Total / Subtotal / Tax Extraction ---

// Patterns for matching total, subtotal, and tax lines
// These appear as label + price on receipts, e.g., "TOTAL $23.45"
const TOTAL_PATTERNS = [
  /(?:^|\s)(?:TOTAL|GRAND\s*TOTAL|AMOUNT\s*DUE|BALANCE\s*DUE|(?:TOTAL\s*)?SALE)\s*:?\s*\$?\s*([\d,]+\.\d{2})/im,
  /\$?\s*([\d,]+\.\d{2})\s*(?:TOTAL|GRAND\s*TOTAL)/im,
]

const SUBTOTAL_PATTERNS = [
  /(?:^|\s)(?:SUBTOTAL|SUB[\s-]*TOTAL)\s*:?\s*\$?\s*([\d,]+\.\d{2})/im,
  /\$?\s*([\d,]+\.\d{2})\s*(?:SUBTOTAL|SUB[\s-]*TOTAL)/im,
]

const TAX_PATTERNS = [
  /(?:^|\s)(?:TAX|SALES\s*TAX|STATE\s*TAX|HST|GST|VAT)\s*:?\s*\$?\s*([\d,]+\.\d{2})/im,
  /\$?\s*([\d,]+\.\d{2})\s*(?:TAX|SALES\s*TAX)/im,
]

function extractAmount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const cents = dollarsToCents(match[1])
      if (cents !== null && cents > 0) return cents
    }
  }
  return null
}

// --- Line Item Extraction ---

// Receipt line items typically look like:
// "ITEM NAME          $X.XX"
// "ITEM NAME     X.XX"
// "ITEM NAME         X.XX F"  (F = food stamp eligible, T = taxable, etc.)
// Some have quantity: "2 x ITEM NAME    $X.XX" or "ITEM NAME  2@$3.99  $7.98"
// Weight-priced: "CHICKEN BREAST  2.31 LB @ $4.99/LB  $11.53"

// Unit keywords recognized on receipts
const UNIT_KEYWORDS: Record<string, string> = {
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  kg: 'kg',
  kilogram: 'kg',
  gal: 'gallon',
  gallon: 'gallon',
  gallons: 'gallon',
  ea: 'each',
  each: 'each',
  ct: 'each',
  count: 'each',
  dz: 'dozen',
  dozen: 'dozen',
  pk: 'pack',
  pack: 'pack',
  packs: 'pack',
  bunch: 'bunch',
  bunches: 'bunch',
  can: 'can',
  cans: 'can',
  bag: 'bag',
  bags: 'bag',
  btl: 'bottle',
  bottle: 'bottle',
  bottles: 'bottle',
}

// Pattern: "2.31 LB @ $4.99/LB  $11.53" (weight-priced items)
const WEIGHT_PRICED_PATTERN =
  /^(.+?)\s+(\d+\.?\d*)\s*(LB|LBS|OZ|KG|GAL)\s*@\s*\$?\s*(\d+\.\d{2})\s*\/\s*\w+\s+\$?\s*(\d+\.\d{2})\s*[A-Z]?\s*$/i

// Pattern: "2 x ITEM NAME  $X.XX" or "3x ITEM  $X.XX" (quantity prefix)
const QTY_PREFIX_PATTERN = /^(\d+)\s*[xX]\s+(.+?)\s+\$?\s*(\d{1,6}\.\d{2})\s*[A-Z]?\s*$/

// Pattern: "ITEM NAME  2@$3.99  $7.98" (quantity-at-price)
const QTY_AT_PRICE_PATTERN =
  /^(.+?)\s+(\d+)\s*@\s*\$?\s*(\d+\.\d{2})\s+\$?\s*(\d+\.\d{2})\s*[A-Z]?\s*$/

// Fallback: plain "ITEM NAME  $X.XX"
const LINE_ITEM_PATTERN = /^(.+?)\s+\$?\s*(\d{1,6}\.\d{2})\s*[A-Z]?\s*$/

/**
 * Extract line items from OCR text.
 * Returns an array of { name, priceCents, quantity, unit } objects.
 * quantity and unit are null when not parseable from the receipt text.
 */
function extractLineItems(lines: string[]): ParsedLineItem[] {
  const items: ParsedLineItem[] = []

  // Words that indicate header/footer lines to skip
  const SKIP_KEYWORDS = [
    'subtotal',
    'sub total',
    'total',
    'tax',
    'change',
    'cash',
    'credit',
    'debit',
    'visa',
    'mastercard',
    'amex',
    'discover',
    'balance',
    'savings',
    'you saved',
    'member',
    'rewards',
    'coupon',
    'discount',
    'transaction',
    'approval',
    'auth',
    'ref #',
    'store #',
    'cashier',
    'register',
    'terminal',
    'receipt',
    'thank you',
    'card ending',
    'chip read',
    'payment',
    'amount due',
    'tendered',
    'grand total',
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 4) continue

    // Skip lines that are headers/footers
    const lower = trimmed.toLowerCase()
    if (SKIP_KEYWORDS.some((kw) => lower.includes(kw))) continue

    // Try weight-priced pattern first: "CHICKEN 2.31 LB @ $4.99/LB $11.53"
    const weightMatch = trimmed.match(WEIGHT_PRICED_PATTERN)
    if (weightMatch) {
      const name = weightMatch[1].trim()
      const qty = parseFloat(weightMatch[2])
      const unitRaw = weightMatch[3].toLowerCase()
      const totalCents = dollarsToCents(weightMatch[5])
      if (name.length >= 2 && totalCents !== null && totalCents > 0 && /[a-zA-Z]/.test(name)) {
        items.push({
          name,
          priceCents: totalCents,
          quantity: qty,
          unit: UNIT_KEYWORDS[unitRaw] ?? unitRaw,
        })
        continue
      }
    }

    // Try quantity prefix: "2 x ITEM $X.XX"
    const qtyPrefixMatch = trimmed.match(QTY_PREFIX_PATTERN)
    if (qtyPrefixMatch) {
      const qty = parseInt(qtyPrefixMatch[1], 10)
      const name = qtyPrefixMatch[2].trim()
      const totalCents = dollarsToCents(qtyPrefixMatch[3])
      if (name.length >= 2 && totalCents !== null && totalCents > 0 && /[a-zA-Z]/.test(name)) {
        items.push({ name, priceCents: totalCents, quantity: qty, unit: 'each' })
        continue
      }
    }

    // Try quantity-at-price: "ITEM 2@$3.99 $7.98"
    const qtyAtMatch = trimmed.match(QTY_AT_PRICE_PATTERN)
    if (qtyAtMatch) {
      const name = qtyAtMatch[1].trim()
      const qty = parseInt(qtyAtMatch[2], 10)
      const totalCents = dollarsToCents(qtyAtMatch[4])
      if (name.length >= 2 && totalCents !== null && totalCents > 0 && /[a-zA-Z]/.test(name)) {
        items.push({ name, priceCents: totalCents, quantity: qty, unit: 'each' })
        continue
      }
    }

    // Fallback: plain line item (no quantity/unit)
    const match = trimmed.match(LINE_ITEM_PATTERN)
    if (match) {
      const name = match[1].trim()
      const cents = dollarsToCents(match[2])

      // Sanity checks: name should be at least 2 chars, price should be reasonable
      if (name.length >= 2 && cents !== null && cents > 0 && cents < 1000000) {
        // Skip if the name is just numbers or punctuation
        if (/[a-zA-Z]/.test(name)) {
          items.push({ name, priceCents: cents, quantity: null, unit: null })
        }
      }
    }
  }

  return items
}

// --- Main Parser ---

/**
 * Parse raw OCR text from a receipt into structured data.
 *
 * This is a deterministic parser using regex (Formula > AI principle).
 * It extracts: store name, date, total, subtotal, tax, and line items.
 * All monetary amounts are in CENTS.
 *
 * Returns gracefully with nulls/empty arrays if parsing fails.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  if (!rawText || rawText.trim().length === 0) {
    return {
      storeName: null,
      date: null,
      totalCents: null,
      subtotalCents: null,
      taxCents: null,
      items: [],
    }
  }

  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0)

  const storeName = extractStoreName(lines)
  const date = extractDate(rawText)
  const totalCents = extractAmount(rawText, TOTAL_PATTERNS)
  const subtotalCents = extractAmount(rawText, SUBTOTAL_PATTERNS)
  const taxCents = extractAmount(rawText, TAX_PATTERNS)
  const items = extractLineItems(lines)

  return {
    storeName,
    date,
    totalCents,
    subtotalCents,
    taxCents,
    items,
  }
}
