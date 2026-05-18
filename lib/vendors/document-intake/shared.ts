import { revalidatePath } from 'next/cache'
import {
  SUPPORTED_EXPENSE_CATEGORIES,
  TABULAR_EXTENSIONS,
  TEXT_EXTRACTABLE_EXTENSIONS,
} from './constants'
import type { ParsedCsv } from './types'

export function revalidateVendorPaths(vendorId: string) {
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${vendorId}`)
  revalidatePath('/vendors/price-comparison')
  revalidatePath('/food-cost')
}

export async function logVendorDocumentActivity(params: {
  tenantId: string
  actorId: string
  action:
    | 'document_uploaded'
    | 'document_imported'
    | 'expense_created'
    | 'vendor_price_recorded'
    | 'ai_document_processed'
  summary: string
  entityId?: string
  context?: Record<string, unknown>
}) {
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      domain: params.action === 'expense_created' ? 'financial' : 'document',
      entityType: 'vendor_document_upload',
      entityId: params.entityId,
      summary: params.summary,
      context: params.context,
    })
  } catch {
    // Non-blocking: activity logging should never break user actions.
  }
}

export function cleanString(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function assertVendorAccess(db: any, tenantId: string, vendorId: string) {
  const { data: vendor, error } = await db
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)
    .single()

  if (error || !vendor) {
    throw new Error('Vendor not found or access denied')
  }
}

export function safeFileName(raw: string): string {
  const baseName = raw.split(/[\\/]/).pop() || 'upload'
  const sanitized = baseName
    .replace(/\.\./g, '')
    .replace(/[^\w.\-\s]/g, '_')
    .slice(0, 200)
    .trim()
  return sanitized.length > 0 ? sanitized : 'upload'
}

export function isTabularExtension(ext: string): boolean {
  return TABULAR_EXTENSIONS.has(ext)
}

export function isTextExtractableExtension(ext: string): boolean {
  return TEXT_EXTRACTABLE_EXTENSIONS.has(ext)
}

export function inferExtractionMethod(ext: string): string {
  if (ext === 'pdf') return 'pdf_text'
  if (ext === 'docx') return 'docx_text'
  if (ext === 'txt') return 'plain_text'
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return 'ocr_image'
  return 'text_extract'
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

export function detectColumnIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((header) => {
    const normalized = header.toLowerCase()
    return keywords.some((keyword) => normalized.includes(keyword))
  })
}

export function parseNumberish(value: string): number | null {
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

export function toCents(amount: number, format: 'dollars' | 'cents'): number {
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
