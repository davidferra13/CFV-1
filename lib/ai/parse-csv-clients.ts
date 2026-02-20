// CSV Client Parser
// Deterministic column-detection parser — no AI required.
// Handles Google Contacts CSV, generic CSVs, iPhone/Android exports.

import type { ParsedClient } from './parse-client'

// ============================================
// TYPES
// ============================================

type CsvColumnType =
  | 'full_name'
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'notes'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'skip'

export type CsvColumnMapping = {
  index: number
  header: string
  detected: CsvColumnType
}

export type CsvParseResult = {
  clients: ParsedClient[]
  columnMappings: CsvColumnMapping[]
  headers: string[]
  previewRows: string[][]
  totalRows: number
  skippedRows: number
  warnings: string[]
  format: 'google_contacts' | 'generic' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
}

// ============================================
// CSV TOKENIZER
// Handles quoted fields, escaped quotes, CRLF/LF
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
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      current.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++ // skip \r\n pair
      current.push(cell)
      cell = ''
      if (current.some(c => c.trim())) lines.push(current)
      current = []
    } else {
      cell += ch
    }
  }

  // Last cell / row
  current.push(cell)
  if (current.some(c => c.trim())) lines.push(current)

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

function isGoogleContacts(headers: string[]): boolean {
  const n = headers.map(normalizeHeader)
  return n.includes('name') && n.includes('given_name') && n.includes('family_name')
}

function detectColumnType(header: string, format: string): CsvColumnType {
  const h = normalizeHeader(header)

  if (format === 'google_contacts') {
    if (h === 'name') return 'full_name'
    if (h === 'given_name') return 'first_name'
    if (h === 'family_name') return 'last_name'
    if (/^e_mail_\d+_value$/.test(h)) return 'email'
    if (/^phone_\d+_value$/.test(h)) return 'phone'
    if (h === 'notes') return 'notes'
    return 'skip'
  }

  // Generic detection — order matters (more specific first)
  const nameExact = ['name', 'full_name', 'fullname', 'contact', 'contact_name', 'client', 'client_name', 'display_name']
  const firstExact = ['first_name', 'firstname', 'first', 'given_name', 'forename']
  const lastExact = ['last_name', 'lastname', 'last', 'family_name', 'surname']
  const emailExact = ['email', 'email_address', 'e_mail', 'email_1', 'primary_email', 'mail']
  const phoneExact = ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'tel', 'phone_1', 'primary_phone', 'cell_phone', 'mobile_phone']
  const notesExact = ['notes', 'note', 'comments', 'comment', 'memo', 'description', 'remarks', 'additional_info']
  const addressExact = ['address', 'street', 'street_address', 'address_1', 'street_line_1']
  const cityExact = ['city', 'town']
  const stateExact = ['state', 'province', 'region']
  const zipExact = ['zip', 'zip_code', 'postal_code', 'postal', 'postcode']

  if (nameExact.includes(h)) return 'full_name'
  if (firstExact.includes(h)) return 'first_name'
  if (lastExact.includes(h)) return 'last_name'
  if (emailExact.includes(h)) return 'email'
  if (phoneExact.includes(h)) return 'phone'
  if (notesExact.includes(h)) return 'notes'
  if (addressExact.includes(h)) return 'address'
  if (cityExact.includes(h)) return 'city'
  if (stateExact.includes(h)) return 'state'
  if (zipExact.includes(h)) return 'zip'

  return 'skip'
}

// ============================================
// ROW → ParsedClient
// ============================================

function rowToClient(
  row: string[],
  mappings: CsvColumnMapping[]
): ParsedClient | null {
  const get = (type: CsvColumnType): string | null => {
    const m = mappings.find(m => m.detected === type)
    if (!m || m.index >= row.length) return null
    return row[m.index]?.trim() || null
  }

  // Support multiple email/phone columns — use first non-empty
  const emailMappings = mappings.filter(m => m.detected === 'email')
  const emailVal = emailMappings
    .map(m => row[m.index]?.trim())
    .find(v => v && v.length > 0) || null

  const phoneMappings = mappings.filter(m => m.detected === 'phone')
  const phoneVal = phoneMappings
    .map(m => row[m.index]?.trim())
    .find(v => v && v.length > 0) || null

  // Build full name
  let fullName = get('full_name')
  if (!fullName) {
    const first = get('first_name')
    const last = get('last_name')
    if (first || last) {
      fullName = [first, last].filter(Boolean).join(' ')
    }
  }

  if (!fullName || fullName.trim().length < 2) return null

  // Build address
  const addr = get('address')
  const city = get('city')
  const state = get('state')
  const zip = get('zip')
  const addressParts = [addr, city, state, zip].filter(Boolean)

  return {
    full_name: fullName.trim(),
    email: emailVal ?? null,
    phone: phoneVal ?? null,
    partner_name: null,
    address: addressParts.length > 0 ? addressParts.join(', ') : null,
    addresses: [],
    dietary_restrictions: [],
    allergies: [],
    dislikes: [],
    spice_tolerance: null,
    favorite_cuisines: [],
    favorite_dishes: [],
    preferred_contact_method: null,
    referral_source: null,
    referral_source_detail: null,
    regular_guests: [],
    household_members: [],
    parking_instructions: null,
    access_instructions: null,
    kitchen_size: null,
    kitchen_constraints: null,
    house_rules: null,
    equipment_available: [],
    equipment_must_bring: [],
    vibe_notes: get('notes') ?? null,
    what_they_care_about: null,
    wine_beverage_preferences: null,
    average_spend_cents: null,
    payment_behavior: null,
    tipping_pattern: null,
    status: 'active' as const,
    children: [],
    farewell_style: null,
    personal_milestones: null,
    field_confidence: {
      full_name: 'confirmed',
      ...(emailVal ? { email: 'confirmed' as const } : {}),
      ...(phoneVal ? { phone: 'confirmed' as const } : {}),
    },
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export function parseClientsCsv(csvText: string): CsvParseResult {
  const warnings: string[] = []
  const text = csvText.trim()

  if (!text) {
    return {
      clients: [],
      columnMappings: [],
      headers: [],
      previewRows: [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ['No CSV content found'],
      format: 'unknown',
      confidence: 'low',
    }
  }

  const rows = parseRawCsv(text)

  if (rows.length < 2) {
    return {
      clients: [],
      columnMappings: [],
      headers: rows[0] || [],
      previewRows: [],
      totalRows: 0,
      skippedRows: 0,
      warnings: ['CSV appears to have only a header row and no data'],
      format: 'unknown',
      confidence: 'low',
    }
  }

  const headers = rows[0].map(h => h.trim().replace(/^"|"$/g, ''))
  const dataRows = rows.slice(1)

  const format: CsvParseResult['format'] = isGoogleContacts(headers)
    ? 'google_contacts'
    : 'generic'

  const columnMappings: CsvColumnMapping[] = headers.map((header, index) => ({
    index,
    header,
    detected: detectColumnType(header, format),
  }))

  const previewRows = dataRows.slice(0, 5)

  // Quality checks
  const hasName = columnMappings.some(
    m => m.detected === 'full_name' || m.detected === 'first_name' || m.detected === 'last_name'
  )
  const hasEmail = columnMappings.some(m => m.detected === 'email')

  if (!hasName) {
    warnings.push(
      'No name column detected. Make sure your CSV has a "Name", "First Name", or "Last Name" column.'
    )
  }
  if (!hasEmail) {
    warnings.push(
      'No email column detected. Clients will be imported without email addresses — you can add them later.'
    )
  }
  if (format === 'google_contacts') {
    warnings.push(
      'Google Contacts format detected. Importing: name, email, phone, and notes.'
    )
  }

  // Parse all rows
  const clients: ParsedClient[] = []
  let skippedRows = 0

  for (const row of dataRows) {
    // Skip entirely blank rows
    if (!row.some(c => c.trim())) continue
    const client = rowToClient(row, columnMappings)
    if (client) {
      clients.push(client)
    } else {
      skippedRows++
    }
  }

  if (clients.length === 0) {
    warnings.push('No valid client records could be extracted from this CSV.')
  }

  const confidence: CsvParseResult['confidence'] =
    hasName && hasEmail ? 'high' : hasName ? 'medium' : 'low'

  return {
    clients,
    columnMappings,
    headers,
    previewRows,
    totalRows: dataRows.filter(r => r.some(c => c.trim())).length,
    skippedRows,
    warnings,
    format,
    confidence,
  }
}
