// CSV Inquiry Parser
// Deterministic column-detection parser for historical inquiry data - no AI required.
// Mirrors the pattern established in parse-csv-clients.ts and parse-csv-events.ts.

// ============================================
// TYPES
// ============================================

type InquiryCsvColumnType =
  | 'client_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'date'
  | 'occasion'
  | 'guests'
  | 'location'
  | 'budget'
  | 'channel'
  | 'status'
  | 'notes'
  | 'source_message'
  | 'dietary'
  | 'decline_reason'
  | 'skip'

export type InquiryCsvColumnMapping = {
  index: number
  header: string
  detected: InquiryCsvColumnType
}

export type ParsedInquiryRow = {
  id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  first_contact_at: string
  confirmed_occasion: string | null
  confirmed_guest_count: number | null
  confirmed_location: string | null
  confirmed_budget_cents: number | null
  channel: string | null
  status: string | null
  notes: string | null
  source_message: string | null
  dietary_restrictions: string[] | null
  decline_reason: string | null
}

export type CsvInquiriesParseResult = {
  rows: ParsedInquiryRow[]
  columnMappings: InquiryCsvColumnMapping[]
  headers: string[]
  previewRows: string[][]
  totalRows: number
  skippedRows: number
  warnings: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ============================================
// CSV TOKENIZER (same algorithm as parse-csv-clients.ts)
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

function detectInquiryColumn(header: string): InquiryCsvColumnType {
  const h = normalizeHeader(header)

  const nameExact = [
    'name',
    'full_name',
    'fullname',
    'client',
    'client_name',
    'contact',
    'contact_name',
    'customer',
    'customer_name',
    'lead',
    'lead_name',
  ]
  const firstExact = ['first_name', 'firstname', 'first', 'given_name']
  const lastExact = ['last_name', 'lastname', 'last', 'family_name', 'surname']
  const emailExact = ['email', 'email_address', 'e_mail', 'email_1', 'mail']
  const phoneExact = ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'tel']
  const dateExact = [
    'date',
    'inquiry_date',
    'event_date',
    'first_contact',
    'contact_date',
    'received',
    'received_date',
    'when',
    'submitted',
    'submitted_at',
    'created',
    'created_at',
  ]
  const occasionExact = ['occasion', 'event', 'event_type', 'type', 'service', 'service_type']
  const guestsExact = [
    'guests',
    'guest_count',
    'headcount',
    'pax',
    'people',
    'attendees',
    'party_size',
    'covers',
  ]
  const locationExact = ['location', 'city', 'address', 'venue', 'where', 'place']
  const budgetExact = ['budget', 'amount', 'price', 'rate', 'quoted', 'quote', 'estimate', 'total']
  const channelExact = [
    'channel',
    'source',
    'platform',
    'via',
    'how_found',
    'lead_source',
    'referral_source',
  ]
  const statusExact = ['status', 'outcome', 'result', 'state', 'disposition']
  const notesExact = ['notes', 'note', 'comments', 'comment', 'memo', 'details', 'remarks']
  const messageExact = [
    'message',
    'source_message',
    'inquiry_message',
    'request',
    'description',
    'inquiry_text',
  ]
  const dietaryExact = [
    'dietary',
    'allergies',
    'restrictions',
    'diet',
    'dietary_restrictions',
    'food_allergies',
  ]
  const declineExact = ['reason', 'decline_reason', 'lost_reason', 'why_lost', 'rejection_reason']

  if (nameExact.includes(h)) return 'client_name'
  if (firstExact.includes(h)) return 'first_name'
  if (lastExact.includes(h)) return 'last_name'
  if (emailExact.includes(h)) return 'email'
  if (phoneExact.includes(h)) return 'phone'
  if (dateExact.includes(h)) return 'date'
  if (occasionExact.includes(h)) return 'occasion'
  if (guestsExact.includes(h)) return 'guests'
  if (locationExact.includes(h)) return 'location'
  if (budgetExact.includes(h)) return 'budget'
  if (channelExact.includes(h)) return 'channel'
  if (statusExact.includes(h)) return 'status'
  if (messageExact.includes(h)) return 'source_message'
  if (notesExact.includes(h)) return 'notes'
  if (dietaryExact.includes(h)) return 'dietary'
  if (declineExact.includes(h)) return 'decline_reason'

  return 'skip'
}

// ============================================
// DATE NORMALIZATION
// Returns YYYY-MM-DD or the original string if unparseable.
// ============================================

function normalizeDate(raw: string): string {
  const s = raw.trim()
  if (!s) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear()
    const mm = String(parsed.getMonth() + 1).padStart(2, '0')
    const dd = String(parsed.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return s
}

// ============================================
// BUDGET NORMALIZATION
// Strips currency symbols/commas, converts dollars to cents.
// ============================================

function normalizeBudgetCents(raw: string): number | null {
  const s = raw.trim().replace(/[$,\s]/g, '')
  if (!s) return null
  const n = parseFloat(s)
  if (isNaN(n) || n < 0) return null
  return Math.round(n * 100)
}

// ============================================
// STATUS NORMALIZATION
// Maps common status words to the four import-friendly statuses.
// ============================================

function normalizeStatus(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null

  const confirmedAliases = [
    'confirmed',
    'booked',
    'won',
    'yes',
    'accepted',
    'converted',
    'hired',
    'completed',
    'done',
  ]
  const declinedAliases = ['declined', 'lost', 'no', 'rejected', 'cancelled', 'canceled', 'passed']
  const expiredAliases = [
    'expired',
    'ghost',
    'ghosted',
    'no_response',
    'no response',
    'stale',
    'dead',
    'inactive',
    'cold',
  ]
  const newAliases = ['new', 'open', 'active', 'pending', 'follow_up', 'follow up', 'hot', 'warm']

  if (confirmedAliases.includes(s)) return 'confirmed'
  if (declinedAliases.includes(s)) return 'declined'
  if (expiredAliases.includes(s)) return 'expired'
  if (newAliases.includes(s)) return 'new'

  return null
}

// ============================================
// CHANNEL NORMALIZATION
// ============================================

function normalizeChannel(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null

  const map: Record<string, string> = {
    website: 'website',
    web: 'website',
    site: 'website',
    online: 'website',
    wix: 'wix',
    email: 'email',
    gmail: 'email',
    mail: 'email',
    phone: 'phone',
    call: 'phone',
    telephone: 'phone',
    text: 'text',
    sms: 'text',
    instagram: 'instagram',
    ig: 'instagram',
    insta: 'instagram',
    referral: 'referral',
    referred: 'referral',
    word_of_mouth: 'referral',
    'word of mouth': 'referral',
    take_a_chef: 'take_a_chef',
    takeachef: 'take_a_chef',
    tac: 'take_a_chef',
    yhangry: 'other',
    walk_in: 'walk_in',
    'walk in': 'walk_in',
    walkin: 'walk_in',
  }

  return map[s] || 'other'
}

// ============================================
// DIETARY PARSING
// ============================================

function parseDietary(raw: string): string[] | null {
  const s = raw.trim()
  if (!s) return null
  return s
    .split(/[,;|]/)
    .map((d) => d.trim())
    .filter(Boolean)
}

// ============================================
// ROW → ParsedInquiryRow
// ============================================

function rowToInquiry(row: string[], mappings: InquiryCsvColumnMapping[]): ParsedInquiryRow | null {
  const get = (type: InquiryCsvColumnType): string => {
    const m = mappings.find((m) => m.detected === type)
    if (!m || m.index >= row.length) return ''
    return row[m.index]?.trim() || ''
  }

  // Support multiple email/phone columns - use first non-empty
  const emailMappings = mappings.filter((m) => m.detected === 'email')
  const emailVal =
    emailMappings.map((m) => row[m.index]?.trim()).find((v) => v && v.length > 0) || null

  const phoneMappings = mappings.filter((m) => m.detected === 'phone')
  const phoneVal =
    phoneMappings.map((m) => row[m.index]?.trim()).find((v) => v && v.length > 0) || null

  // Build full name
  let clientName = get('client_name')
  if (!clientName) {
    const first = get('first_name')
    const last = get('last_name')
    if (first || last) {
      clientName = [first, last].filter(Boolean).join(' ')
    }
  }

  // Client name is required
  if (!clientName || clientName.trim().length < 2) return null

  const rawGuests = get('guests')
  const guestCount = rawGuests ? parseInt(rawGuests, 10) : null

  return {
    id: Math.random().toString(36).slice(2),
    client_name: clientName.trim(),
    client_email: emailVal,
    client_phone: phoneVal,
    first_contact_at: normalizeDate(get('date')),
    confirmed_occasion: get('occasion') || null,
    confirmed_guest_count: isNaN(guestCount!) ? null : guestCount,
    confirmed_location: get('location') || null,
    confirmed_budget_cents: normalizeBudgetCents(get('budget')),
    channel: normalizeChannel(get('channel')),
    status: normalizeStatus(get('status')),
    notes: get('notes') || null,
    source_message: get('source_message') || null,
    dietary_restrictions: parseDietary(get('dietary')),
    decline_reason: get('decline_reason') || null,
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export function parseInquiriesCsv(csvText: string): CsvInquiriesParseResult {
  const warnings: string[] = []
  const text = csvText.trim()

  if (!text) {
    return {
      rows: [],
      columnMappings: [],
      headers: [],
      previewRows: [],
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
      columnMappings: [],
      headers: rawRows[0] || [],
      previewRows: [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ['CSV appears to have only a header row and no data'],
      confidence: 'low',
    }
  }

  const headers = rawRows[0].map((h) => h.trim().replace(/^"|"$/g, ''))
  const dataRows = rawRows.slice(1)

  const columnMappings: InquiryCsvColumnMapping[] = headers.map((header, index) => ({
    index,
    header,
    detected: detectInquiryColumn(header),
  }))

  // Quality checks
  const hasName = columnMappings.some(
    (m) => m.detected === 'client_name' || m.detected === 'first_name' || m.detected === 'last_name'
  )
  const hasDate = columnMappings.some((m) => m.detected === 'date')
  const hasEmail = columnMappings.some((m) => m.detected === 'email')

  if (!hasName) {
    warnings.push(
      'No name column detected. Make sure your CSV has a "Name", "Client", or "Contact" column.'
    )
  }
  if (!hasDate) {
    warnings.push('No date column detected. You can set dates manually in the preview.')
  }
  if (!hasEmail) {
    warnings.push(
      'No email column detected. Inquiries will be imported without email - client auto-linking will rely on name matching.'
    )
  }

  // Parse all rows
  const rows: ParsedInquiryRow[] = []
  let skippedRows = 0

  for (const row of dataRows) {
    if (!row.some((c) => c.trim())) continue
    const parsed = rowToInquiry(row, columnMappings)
    if (parsed) {
      rows.push(parsed)
    } else {
      skippedRows++
    }
  }

  if (rows.length === 0) {
    warnings.push('No valid inquiry records could be extracted from this CSV.')
  }

  const previewRows = dataRows.slice(0, 5)

  const confidence: CsvInquiriesParseResult['confidence'] =
    hasName && hasDate ? 'high' : hasName ? 'medium' : 'low'

  return {
    rows,
    columnMappings,
    headers,
    previewRows,
    totalRows: dataRows.filter((r) => r.some((c) => c.trim())).length,
    skippedRows,
    warnings,
    confidence,
  }
}
