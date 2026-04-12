'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { extractTextFromFile } from '@/lib/menus/extract-text'
import { createServerClient } from '@/lib/db/server'
import {
  queueVendorCatalogRows,
  type QueueVendorCatalogResult,
} from '@/lib/vendors/catalog-import-actions'
import { recordVendorPricePoint } from '@/lib/vendors/price-point-actions'
import {
  parseExpenseDraftFromExtractedText,
  parseInvoiceDraftFromExtractedText,
} from '@/lib/vendors/document-intake-parsers'

const VENDOR_DOCUMENTS_BUCKET = 'vendor-documents'
const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB
const SIGNED_URL_EXPIRY_SECONDS = 3600

const ALLOWED_EXTENSIONS = new Set([
  'csv',
  'xlsx',
  'xls',
  'pdf',
  'txt',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
])

const TABULAR_EXTENSIONS = new Set(['csv', 'xlsx', 'xls'])
const TEXT_EXTRACTABLE_EXTENSIONS = new Set(['pdf', 'txt', 'jpg', 'jpeg', 'png', 'webp', 'docx'])
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

const VendorDocumentTypeSchema = z.enum(['catalog', 'invoice', 'expense', 'supplier_doc', 'other'])

export type VendorDocumentType = z.infer<typeof VendorDocumentTypeSchema>

export type VendorDocumentStatus = 'uploaded' | 'processing' | 'review' | 'completed' | 'failed'

export type VendorDocumentUploadRow = {
  id: string
  vendor_id: string
  document_type: VendorDocumentType
  source_filename: string
  file_mime_type: string | null
  file_size_bytes: number
  file_hash: string | null
  status: VendorDocumentStatus
  parse_summary: Record<string, unknown>
  error_message: string | null
  created_at: string
  processed_at: string | null
  download_url: string | null
}

export type UploadVendorDocumentResult =
  | {
      success: true
      uploadId: string
      status: VendorDocumentStatus
      message: string
      queueResult?: QueueVendorCatalogResult
    }
  | { success: false; error: string; existingUploadId?: string }

const ApplyVendorDocumentDraftSchema = z.object({
  upload_id: z.string().uuid(),
  preview_only: z.boolean().default(false),
  force_apply: z.boolean().default(false),
})

type ApplyVendorDocumentDraftInput = z.input<typeof ApplyVendorDocumentDraftSchema>

export type ApplyVendorDocumentDraftResult =
  | {
      success: true
      documentType: 'invoice' | 'expense'
      previewOnly?: boolean
      createdInvoiceId?: string
      createdExpenseIds?: string[]
      duplicateWarnings?: string[]
      draftSummary?: Record<string, unknown>
      message: string
    }
  | { success: false; error: string }

type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

type ParsedCatalogRows = {
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

type DraftInvoiceLineItem = {
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

type DraftInvoiceSummary = {
  line_items_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  invoice_date_guess: string | null
  invoice_number_guess: string | null
  line_items: DraftInvoiceLineItem[]
  line_items_preview: DraftInvoiceLineItem[]
  warnings: string[]
}

type DraftExpenseRow = {
  description: string
  amount_cents: number
  expense_date: string | null
  category: string
}

type DraftExpenseSummary = {
  expense_rows_count: number
  inferred_total_cents: number
  inferred_price_format: 'dollars' | 'cents'
  rows: DraftExpenseRow[]
  rows_preview: DraftExpenseRow[]
  warnings: string[]
}

function revalidateVendorPaths(vendorId: string) {
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${vendorId}`)
  revalidatePath('/vendors/price-comparison')
  revalidatePath('/food-cost')
}

async function logVendorDocumentActivity(params: {
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

function cleanString(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function assertVendorAccess(db: any, tenantId: string, vendorId: string) {
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

function safeFileName(raw: string): string {
  const baseName = raw.split(/[\\/]/).pop() || 'upload'
  const sanitized = baseName
    .replace(/\.\./g, '')
    .replace(/[^\w.\-\s]/g, '_')
    .slice(0, 200)
    .trim()
  return sanitized.length > 0 ? sanitized : 'upload'
}

function isTabularExtension(ext: string): boolean {
  return TABULAR_EXTENSIONS.has(ext)
}

function isTextExtractableExtension(ext: string): boolean {
  return TEXT_EXTRACTABLE_EXTENSIONS.has(ext)
}

function inferExtractionMethod(ext: string): string {
  if (ext === 'pdf') return 'pdf_text'
  if (ext === 'docx') return 'docx_text'
  if (ext === 'txt') return 'plain_text'
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') return 'ocr_image'
  return 'text_extract'
}

function parseCsv(text: string): ParsedCsv {
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

async function parseSpreadsheet(buffer: Buffer): Promise<ParsedCsv> {
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

function inferPriceFormat(values: number[]): 'dollars' | 'cents' {
  if (values.length === 0) return 'dollars'
  const maybeCents = values.filter((value) => Number.isInteger(value) && value >= 100).length
  return maybeCents >= Math.ceil(values.length * 0.7) ? 'cents' : 'dollars'
}

function parseDateGuess(value: string): string | null {
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

function normalizeCategory(value: string): string {
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

async function recordInvoiceLineItemPricePoints(params: {
  db: any
  tenantId: string
  vendorId: string
  invoiceNumber: string | null
  lineItems: DraftInvoiceLineItem[]
}) {
  const dedupedByItem = new Map<string, DraftInvoiceLineItem>()

  for (const line of params.lineItems) {
    const description = cleanString(line.description)
    const price = Number(line.unit_price_cents || 0)
    if (!description || price <= 0) continue
    dedupedByItem.set(description.toLowerCase(), { ...line, description })
  }

  for (const line of dedupedByItem.values()) {
    try {
      await recordVendorPricePoint({
        db: params.db,
        tenantId: params.tenantId,
        vendorId: params.vendorId,
        itemName: line.description,
        unitMeasure: 'each',
        unitSize: 1,
        priceCents: line.unit_price_cents,
        notes: params.invoiceNumber
          ? `Imported from invoice ${params.invoiceNumber}`
          : 'Imported from invoice',
      })
    } catch (err) {
      console.error('[vendor-documents] failed to record invoice line price point', err)
    }
  }
}

function parseCatalogTabularRows(parsed: ParsedCsv): ParsedCatalogRows {
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

function parseCatalogCsvRows(csvText: string): ParsedCatalogRows {
  return parseCatalogTabularRows(parseCsv(csvText))
}

async function parseCatalogSpreadsheetRows(buffer: Buffer): Promise<ParsedCatalogRows> {
  const parsed = await parseSpreadsheet(buffer)
  return parseCatalogTabularRows(parsed)
}

function parseInvoiceDraftFromTabular(parsed: ParsedCsv): DraftInvoiceSummary {
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
      : ((_diad) =>
          `${_diad.getFullYear()}-${String(_diad.getMonth() + 1).padStart(2, '0')}-${String(_diad.getDate()).padStart(2, '0')}`)(
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

function parseExpenseDraftFromTabular(parsed: ParsedCsv): DraftExpenseSummary {
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

function normalizeCompareText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

function expenseRowKey(input: {
  expense_date: string
  amount_cents: number
  description: string
}): string {
  return `${input.expense_date}|${input.amount_cents}|${normalizeCompareText(input.description)}`
}

async function findPotentialInvoiceDuplicates(params: {
  db: any
  tenantId: string
  vendorId: string
  invoiceNumber: string | null
  invoiceDate: string
  totalCents: number
}): Promise<Array<{ id: string; reason: string }>> {
  const duplicates: Array<{ id: string; reason: string }> = []

  if (params.invoiceNumber) {
    const { data: matchesByNumber } = await params.db
      .from('vendor_invoices')
      .select('id, invoice_number')
      .eq('chef_id', params.tenantId)
      .eq('vendor_id', params.vendorId)
      .eq('invoice_number', params.invoiceNumber)
      .limit(20)

    for (const row of matchesByNumber ?? []) {
      duplicates.push({ id: row.id, reason: `same invoice number (${params.invoiceNumber})` })
    }
  }

  const { data: matchesByDateTotal } = await params.db
    .from('vendor_invoices')
    .select('id, invoice_date, total_cents')
    .eq('chef_id', params.tenantId)
    .eq('vendor_id', params.vendorId)
    .eq('invoice_date', params.invoiceDate)
    .eq('total_cents', params.totalCents)
    .limit(20)

  for (const row of matchesByDateTotal ?? []) {
    duplicates.push({
      id: row.id,
      reason: `same invoice date + total (${row.invoice_date}, $${(row.total_cents / 100).toFixed(2)})`,
    })
  }

  const byId = new Map<string, { id: string; reason: string }>()
  for (const duplicate of duplicates) {
    if (!byId.has(duplicate.id)) byId.set(duplicate.id, duplicate)
  }
  return Array.from(byId.values())
}

async function findPotentialExpenseDuplicates(params: {
  db: any
  tenantId: string
  vendorName: string | null
  rows: Array<{
    expense_date: string
    amount_cents: number
    description: string
  }>
}): Promise<
  Array<{
    rowDescription: string
    existingExpenseId: string
    reason: string
    expenseDate: string
    amountCents: number
    normalizedDescription: string
  }>
> {
  if (params.rows.length === 0) return []

  const uniqueDates = Array.from(new Set(params.rows.map((row) => row.expense_date))).slice(0, 100)
  const uniqueAmounts = Array.from(new Set(params.rows.map((row) => row.amount_cents))).slice(
    0,
    200
  )

  let query = params.db
    .from('expenses')
    .select('id, expense_date, amount_cents, description, vendor_name')
    .eq('tenant_id', params.tenantId)
    .in('expense_date', uniqueDates)
    .in('amount_cents', uniqueAmounts)
    .limit(1000)

  if (params.vendorName) {
    query = query.eq('vendor_name', params.vendorName)
  }

  const { data: existingRows } = await query
  const duplicates: Array<{
    rowDescription: string
    existingExpenseId: string
    reason: string
    expenseDate: string
    amountCents: number
    normalizedDescription: string
  }> = []

  for (const row of params.rows) {
    const normalizedIncoming = normalizeCompareText(row.description)
    const matches = (existingRows ?? []).filter((existing: any) => {
      if (existing.expense_date !== row.expense_date) return false
      if (Number(existing.amount_cents) !== row.amount_cents) return false

      const normalizedExisting = normalizeCompareText(existing.description)
      return normalizedExisting === normalizedIncoming
    })

    for (const match of matches) {
      duplicates.push({
        rowDescription: row.description,
        existingExpenseId: match.id,
        reason: `same date + amount + description (${row.expense_date}, $${(row.amount_cents / 100).toFixed(2)})`,
        expenseDate: row.expense_date,
        amountCents: row.amount_cents,
        normalizedDescription: normalizedIncoming,
      })
    }
  }

  return duplicates
}

async function attemptAutoApplyDraft(
  uploadId: string,
  documentType: 'invoice' | 'expense'
): Promise<{ status: VendorDocumentStatus; message: string }> {
  const result = await applyVendorDocumentDraft({
    upload_id: uploadId,
    force_apply: false,
  })

  if (result.success) {
    return {
      status: 'completed',
      message: result.message,
    }
  }

  if (result.error.toLowerCase().includes('duplicate')) {
    return {
      status: 'review',
      message:
        documentType === 'invoice'
          ? 'Invoice draft extracted. Potential duplicate found, review before saving.'
          : 'Expense draft extracted. Potential duplicate found, review before saving.',
    }
  }

  return {
    status: 'review',
    message:
      documentType === 'invoice'
        ? `Invoice draft extracted. Auto-save not completed: ${result.error}`
        : `Expense draft extracted. Auto-save not completed: ${result.error}`,
  }
}

export async function uploadVendorDocument(
  formData: FormData
): Promise<UploadVendorDocumentResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const vendorId = String(formData.get('vendor_id') || '')
  const documentTypeRaw = String(formData.get('document_type') || '')
  const filePart = formData.get('file')

  const parsedType = VendorDocumentTypeSchema.safeParse(documentTypeRaw)
  if (!vendorId) return { success: false, error: 'Vendor is required' }
  if (!parsedType.success) return { success: false, error: 'Invalid document type' }
  if (!filePart || typeof filePart === 'string')
    return { success: false, error: 'No file provided' }

  const file = filePart as File
  if (file.size === 0) return { success: false, error: 'File is empty' }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 30 MB.`,
    }
  }

  await assertVendorAccess(db, user.tenantId!, vendorId)

  const normalizedFileName = safeFileName(file.name)
  const ext = normalizedFileName.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      success: false,
      error: `Unsupported file type ".${ext}". Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex')

  const { data: duplicate } = await db
    .from('vendor_document_uploads')
    .select('id, status')
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .eq('file_hash', fileHash)
    .limit(1)
    .maybeSingle()

  if (duplicate?.id) {
    return {
      success: false,
      error: `This file was already uploaded (status: ${duplicate.status}).`,
      existingUploadId: duplicate.id,
    }
  }

  const { data: insertedRow, error: insertError } = await db
    .from('vendor_document_uploads')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      document_type: parsedType.data,
      source_filename: normalizedFileName,
      file_mime_type: file.type || null,
      file_size_bytes: file.size,
      file_hash: fileHash,
      status: 'uploaded',
    })
    .select('id')
    .single()

  if (insertError || !insertedRow?.id) {
    return { success: false, error: insertError?.message || 'Failed to register upload' }
  }

  const storagePath = `${user.tenantId}/${vendorId}/${insertedRow.id}/${normalizedFileName}`
  const { error: uploadError } = await db.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    await db
      .from('vendor_document_uploads')
      .update({
        status: 'failed',
        error_message: uploadError.message,
      })
      .eq('id', insertedRow.id)
      .eq('chef_id', user.tenantId!)

    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  await db
    .from('vendor_document_uploads')
    .update({ file_storage_path: storagePath, status: 'processing' })
    .eq('id', insertedRow.id)
    .eq('chef_id', user.tenantId!)

  await logVendorDocumentActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'document_uploaded',
    entityId: insertedRow.id,
    summary: `Uploaded ${parsedType.data} document: ${normalizedFileName}`,
    context: {
      vendor_id: vendorId,
      document_type: parsedType.data,
      filename: normalizedFileName,
      extension: ext,
      size_bytes: file.size,
    },
  })

  if (parsedType.data === 'catalog' && isTabularExtension(ext)) {
    try {
      const parsedCatalog =
        ext === 'csv'
          ? parseCatalogCsvRows(fileBuffer.toString('utf8'))
          : await parseCatalogSpreadsheetRows(fileBuffer)

      if (parsedCatalog.rows.length === 0) {
        const lineError = parsedCatalog.lineErrors[0] || 'No valid catalog rows found'
        await db
          .from('vendor_document_uploads')
          .update({
            status: 'failed',
            error_message: lineError,
            parse_summary: {
              total_rows: parsedCatalog.totalRows,
              skipped_rows: parsedCatalog.skippedRows,
              price_format: parsedCatalog.priceFormat,
              parser_extension: ext,
              line_errors: parsedCatalog.lineErrors.slice(0, 20),
            },
            processed_at: new Date().toISOString(),
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        return { success: false, error: lineError, existingUploadId: insertedRow.id }
      }

      const queueResult = await queueVendorCatalogRows({
        vendor_id: vendorId,
        source_type: ext === 'csv' ? 'csv' : 'xlsx',
        source_filename: normalizedFileName,
        auto_apply_high_confidence: true,
        rows: parsedCatalog.rows,
      })

      const nextStatus: VendorDocumentStatus = queueResult.needsReview > 0 ? 'review' : 'completed'
      await db
        .from('vendor_document_uploads')
        .update({
          status: nextStatus,
          parse_summary: {
            total_rows: parsedCatalog.totalRows,
            queued_rows: parsedCatalog.rows.length,
            skipped_rows: parsedCatalog.skippedRows,
            price_format: parsedCatalog.priceFormat,
            parser_extension: ext,
            line_errors: parsedCatalog.lineErrors.slice(0, 20),
            queue_result: queueResult,
          },
          error_message: queueResult.errors[0] || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'vendor_price_recorded',
        entityId: insertedRow.id,
        summary: `Processed catalog file: ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          queued_rows: parsedCatalog.rows.length,
          auto_applied: queueResult.autoApplied,
          needs_review: queueResult.needsReview,
          source_type: ext,
        },
      })
      return {
        success: true,
        uploadId: insertedRow.id,
        status: nextStatus,
        message:
          nextStatus === 'completed'
            ? 'Catalog uploaded and fully applied.'
            : 'Catalog uploaded. Some rows are waiting for review.',
        queueResult,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Catalog parsing failed'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  if ((parsedType.data === 'invoice' || parsedType.data === 'expense') && isTabularExtension(ext)) {
    try {
      const parsedTabular =
        ext === 'csv' ? parseCsv(fileBuffer.toString('utf8')) : await parseSpreadsheet(fileBuffer)

      if (parsedType.data === 'invoice') {
        const draftInvoice = parseInvoiceDraftFromTabular(parsedTabular)
        if (draftInvoice.line_items_count === 0) {
          throw new Error('No invoice line items were detected in this file')
        }

        await db
          .from('vendor_document_uploads')
          .update({
            status: 'review',
            parse_summary: {
              parser_extension: ext,
              draft_invoice: draftInvoice,
            },
            processed_at: new Date().toISOString(),
            error_message: draftInvoice.warnings[0] || null,
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        await logVendorDocumentActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'ai_document_processed',
          entityId: insertedRow.id,
          summary: `Extracted invoice draft from ${normalizedFileName}`,
          context: {
            vendor_id: vendorId,
            line_items_count: draftInvoice.line_items_count,
            inferred_total_cents: draftInvoice.inferred_total_cents,
          },
        })
        const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'invoice')
        return {
          success: true,
          uploadId: insertedRow.id,
          status: autoApply.status,
          message: autoApply.message,
        }
      }

      const draftExpense = parseExpenseDraftFromTabular(parsedTabular)
      if (draftExpense.expense_rows_count === 0) {
        throw new Error('No expense rows were detected in this file')
      }

      await db
        .from('vendor_document_uploads')
        .update({
          status: 'review',
          parse_summary: {
            parser_extension: ext,
            draft_expenses: draftExpense,
          },
          processed_at: new Date().toISOString(),
          error_message: draftExpense.warnings[0] || null,
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'ai_document_processed',
        entityId: insertedRow.id,
        summary: `Extracted expense draft from ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          expense_rows_count: draftExpense.expense_rows_count,
          inferred_total_cents: draftExpense.inferred_total_cents,
        },
      })
      const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'expense')
      return {
        success: true,
        uploadId: insertedRow.id,
        status: autoApply.status,
        message: autoApply.message,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract draft data'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  if (
    (parsedType.data === 'invoice' || parsedType.data === 'expense') &&
    isTextExtractableExtension(ext)
  ) {
    try {
      const extractionResult = await extractTextFromFile(fileBuffer, normalizedFileName)
      const extractedText = extractionResult.text.trim()
      if (!extractedText) {
        throw new Error('Could not extract readable text from this file')
      }

      const extractedLineCount = extractedText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0).length
      const extractionSummary = {
        extraction_method: inferExtractionMethod(ext),
        extraction_confidence:
          typeof extractionResult.confidence === 'number'
            ? Number(extractionResult.confidence.toFixed(2))
            : null,
        extracted_characters: extractedText.length,
        extracted_lines: extractedLineCount,
        extracted_text_preview: extractedText.slice(0, 1200),
      }

      if (parsedType.data === 'invoice') {
        const draftInvoice = parseInvoiceDraftFromExtractedText(extractedText)
        if (draftInvoice.line_items_count === 0) {
          throw new Error('No invoice line items were detected in this file')
        }

        await db
          .from('vendor_document_uploads')
          .update({
            status: 'review',
            parse_summary: {
              parser_extension: ext,
              ...extractionSummary,
              draft_invoice: draftInvoice,
            },
            processed_at: new Date().toISOString(),
            error_message: draftInvoice.warnings[0] || null,
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        await logVendorDocumentActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'ai_document_processed',
          entityId: insertedRow.id,
          summary: `Extracted invoice draft from ${normalizedFileName}`,
          context: {
            vendor_id: vendorId,
            line_items_count: draftInvoice.line_items_count,
            inferred_total_cents: draftInvoice.inferred_total_cents,
            extraction_method: extractionSummary.extraction_method,
          },
        })
        const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'invoice')
        return {
          success: true,
          uploadId: insertedRow.id,
          status: autoApply.status,
          message: autoApply.message,
        }
      }

      const draftExpense = parseExpenseDraftFromExtractedText(extractedText)
      if (draftExpense.expense_rows_count === 0) {
        throw new Error('No expense rows were detected in this file')
      }

      await db
        .from('vendor_document_uploads')
        .update({
          status: 'review',
          parse_summary: {
            parser_extension: ext,
            ...extractionSummary,
            draft_expenses: draftExpense,
          },
          processed_at: new Date().toISOString(),
          error_message: draftExpense.warnings[0] || null,
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'ai_document_processed',
        entityId: insertedRow.id,
        summary: `Extracted expense draft from ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          expense_rows_count: draftExpense.expense_rows_count,
          inferred_total_cents: draftExpense.inferred_total_cents,
          extraction_method: extractionSummary.extraction_method,
        },
      })
      const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'expense')
      return {
        success: true,
        uploadId: insertedRow.id,
        status: autoApply.status,
        message: autoApply.message,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract text from document'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  await db
    .from('vendor_document_uploads')
    .update({
      status: 'review',
      parse_summary: {
        note: 'File stored and ready for review.',
        extension: ext,
      },
      processed_at: new Date().toISOString(),
    })
    .eq('id', insertedRow.id)
    .eq('chef_id', user.tenantId!)

  revalidateVendorPaths(vendorId)
  await logVendorDocumentActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'document_uploaded',
    entityId: insertedRow.id,
    summary: `Stored document for review: ${normalizedFileName}`,
    context: {
      vendor_id: vendorId,
      document_type: parsedType.data,
      extension: ext,
    },
  })
  return {
    success: true,
    uploadId: insertedRow.id,
    status: 'review',
    message: 'File uploaded and saved for review.',
  }
}

export async function applyVendorDocumentDraft(
  input: ApplyVendorDocumentDraftInput
): Promise<ApplyVendorDocumentDraftResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = ApplyVendorDocumentDraftSchema.parse(input)

  const { data: uploadRow, error: uploadError } = await db
    .from('vendor_document_uploads')
    .select('id, vendor_id, document_type, source_filename, status, parse_summary')
    .eq('id', data.upload_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (uploadError || !uploadRow) {
    return { success: false, error: 'Upload record not found' }
  }

  const parseSummary = (uploadRow.parse_summary ?? {}) as Record<string, unknown>
  const nowIso = new Date().toISOString()

  if (uploadRow.document_type === 'invoice') {
    const draft = (parseSummary.draft_invoice ?? null) as DraftInvoiceSummary | null
    if (!draft || !Array.isArray(draft.line_items) || draft.line_items.length === 0) {
      return { success: false, error: 'No invoice draft found on this upload' }
    }

    const alreadyAppliedId =
      typeof parseSummary.applied_invoice_id === 'string' &&
      parseSummary.applied_invoice_id.length > 0
        ? parseSummary.applied_invoice_id
        : null

    const invoiceDate =
      parseDateGuess(String(draft.invoice_date_guess ?? '')) || nowIso.slice(0, 10)
    const invoiceNumber = cleanString(draft.invoice_number_guess) ?? null
    const sanitizedLineItems = draft.line_items
      .map((line) => ({
        description: cleanString(line.description) ?? '',
        quantity: Number(line.quantity || 0),
        unit_price_cents: Number(line.unit_price_cents || 0),
        total_cents: Number(line.total_cents || 0),
      }))
      .filter((line) => line.description && line.total_cents > 0)

    if (sanitizedLineItems.length === 0) {
      return { success: false, error: 'Invoice draft has no valid line items' }
    }

    const inferredTotal = Number(draft.inferred_total_cents || 0)
    const computedTotal = sanitizedLineItems.reduce((sum, line) => sum + line.total_cents, 0)
    const invoiceTotal = inferredTotal > 0 ? inferredTotal : computedTotal

    const duplicateCandidates = await findPotentialInvoiceDuplicates({
      db,
      tenantId: user.tenantId!,
      vendorId: uploadRow.vendor_id,
      invoiceNumber,
      invoiceDate,
      totalCents: invoiceTotal,
    })
    const duplicateWarnings = duplicateCandidates.map(
      (candidate) => `Invoice ${candidate.id}: ${candidate.reason}`
    )

    const draftSummary: Record<string, unknown> = {
      invoice_date: invoiceDate,
      invoice_number: invoiceNumber,
      total_cents: invoiceTotal,
      line_items_count: sanitizedLineItems.length,
      line_items_preview: sanitizedLineItems.slice(0, 12),
      duplicate_candidates: duplicateCandidates,
      already_applied_invoice_id: alreadyAppliedId,
    }

    if (data.preview_only) {
      return {
        success: true,
        documentType: 'invoice',
        previewOnly: true,
        createdInvoiceId: alreadyAppliedId ?? undefined,
        duplicateWarnings,
        draftSummary,
        message: alreadyAppliedId
          ? 'Invoice draft preview generated. This draft was already saved earlier.'
          : 'Invoice draft preview generated.',
      }
    }

    if (alreadyAppliedId) {
      return {
        success: true,
        documentType: 'invoice',
        createdInvoiceId: alreadyAppliedId,
        duplicateWarnings,
        draftSummary,
        message: 'Invoice was already created from this draft.',
      }
    }

    if (duplicateCandidates.length > 0 && !data.force_apply) {
      const existingInvoiceId = duplicateCandidates[0]?.id ?? null
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'completed',
          processed_at: nowIso,
          parse_summary: {
            ...parseSummary,
            applied_invoice_id: existingInvoiceId,
            applied_at: nowIso,
            duplicate_candidates: duplicateCandidates,
            duplicate_resolution: 'linked_existing_invoice',
            duplicate_resolution_invoice_id: existingInvoiceId,
          },
        })
        .eq('id', uploadRow.id)
        .eq('chef_id', user.tenantId!)

      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'document_imported',
        entityId: uploadRow.id,
        summary: `Skipped duplicate invoice from ${uploadRow.source_filename}`,
        context: {
          vendor_id: uploadRow.vendor_id,
          duplicate_candidates_count: duplicateCandidates.length,
          linked_invoice_id: existingInvoiceId,
          duplicate_resolution: 'linked_existing_invoice',
        },
      })

      revalidateVendorPaths(uploadRow.vendor_id)
      return {
        success: true,
        documentType: 'invoice',
        createdInvoiceId: existingInvoiceId ?? undefined,
        duplicateWarnings,
        draftSummary,
        message:
          'Duplicate invoice detected. Linked to existing record and skipped creating a new invoice.',
      }
    }

    const { data: invoice, error: invoiceInsertError } = await db
      .from('vendor_invoices')
      .insert({
        chef_id: user.tenantId!,
        vendor_id: uploadRow.vendor_id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        total_cents: invoiceTotal,
        notes: `Imported from vendor file: ${uploadRow.source_filename}`,
      })
      .select('id')
      .single()

    if (invoiceInsertError || !invoice?.id) {
      return { success: false, error: invoiceInsertError?.message || 'Failed to create invoice' }
    }

    const { error: lineItemsError } = await db.from('vendor_invoice_line_items').insert(
      sanitizedLineItems.map((line) => ({
        invoice_id: invoice.id,
        chef_id: user.tenantId!,
        description: line.description,
        quantity: line.quantity > 0 ? line.quantity : 1,
        unit_price_cents: line.unit_price_cents >= 0 ? line.unit_price_cents : 0,
        total_cents: line.total_cents,
      }))
    )

    if (lineItemsError) {
      return { success: false, error: lineItemsError.message }
    }

    await recordInvoiceLineItemPricePoints({
      db,
      tenantId: user.tenantId!,
      vendorId: uploadRow.vendor_id,
      invoiceNumber,
      lineItems: sanitizedLineItems,
    })

    await db
      .from('vendor_document_uploads')
      .update({
        status: 'completed',
        processed_at: nowIso,
        parse_summary: {
          ...parseSummary,
          applied_invoice_id: invoice.id,
          applied_at: nowIso,
          duplicate_candidates: duplicateCandidates,
        },
      })
      .eq('id', uploadRow.id)
      .eq('chef_id', user.tenantId!)

    await logVendorDocumentActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'document_imported',
      entityId: uploadRow.id,
      summary: `Saved invoice draft from ${uploadRow.source_filename}`,
      context: {
        vendor_id: uploadRow.vendor_id,
        created_invoice_id: invoice.id,
        total_cents: invoiceTotal,
        duplicate_candidates_count: duplicateCandidates.length,
        forced: data.force_apply,
      },
    })

    revalidateVendorPaths(uploadRow.vendor_id)
    revalidatePath('/vendors')
    revalidatePath('/food-cost')
    return {
      success: true,
      documentType: 'invoice',
      createdInvoiceId: invoice.id,
      duplicateWarnings,
      draftSummary,
      message: 'Invoice created from draft.',
    }
  }

  if (uploadRow.document_type === 'expense') {
    const draft = (parseSummary.draft_expenses ?? null) as DraftExpenseSummary | null
    if (!draft || !Array.isArray(draft.rows) || draft.rows.length === 0) {
      return { success: false, error: 'No expense draft found on this upload' }
    }

    const alreadyAppliedIds = Array.isArray(parseSummary.applied_expense_ids)
      ? parseSummary.applied_expense_ids.filter((id): id is string => typeof id === 'string')
      : []

    const { data: vendorRow } = await db
      .from('vendors')
      .select('name')
      .eq('id', uploadRow.vendor_id)
      .eq('chef_id', user.tenantId!)
      .single()
    const vendorName = cleanString(vendorRow?.name ?? '') ?? null

    const today = nowIso.slice(0, 10)
    const expenseRows = draft.rows
      .map((row, index) => ({
        draft_index: index,
        tenant_id: user.tenantId!,
        event_id: null,
        expense_date: parseDateGuess(String(row.expense_date ?? '')) ?? today,
        category: normalizeCategory(String(row.category ?? '')),
        vendor_name: vendorName,
        amount_cents: Number(row.amount_cents || 0),
        description: cleanString(row.description) ?? '',
        notes: `Imported from vendor file: ${uploadRow.source_filename}`,
        payment_method: 'other',
        is_business: true,
        is_reimbursable: false,
        receipt_uploaded: false,
        created_by: user.id,
        updated_by: user.id,
      }))
      .filter((row) => row.amount_cents > 0 && row.description.length > 0)

    if (expenseRows.length === 0) {
      return { success: false, error: 'Expense draft has no valid rows' }
    }

    const duplicateRows = await findPotentialExpenseDuplicates({
      db,
      tenantId: user.tenantId!,
      vendorName,
      rows: expenseRows.map((row) => ({
        expense_date: row.expense_date,
        amount_cents: row.amount_cents,
        description: row.description,
      })),
    })

    const duplicateWarnings = duplicateRows.map(
      (row) => `${row.rowDescription}: ${row.reason} (existing ${row.existingExpenseId})`
    )

    const draftSummary: Record<string, unknown> = {
      rows_count: expenseRows.length,
      total_cents: expenseRows.reduce((sum, row) => sum + row.amount_cents, 0),
      rows_preview: expenseRows.slice(0, 12).map((row) => ({
        expense_date: row.expense_date,
        amount_cents: row.amount_cents,
        description: row.description,
        category: row.category,
      })),
      duplicate_rows: duplicateRows,
      already_applied_expense_ids: alreadyAppliedIds,
    }

    if (data.preview_only) {
      return {
        success: true,
        documentType: 'expense',
        previewOnly: true,
        createdExpenseIds: alreadyAppliedIds.length > 0 ? alreadyAppliedIds : undefined,
        duplicateWarnings,
        draftSummary,
        message:
          alreadyAppliedIds.length > 0
            ? 'Expense draft preview generated. This draft was already saved earlier.'
            : 'Expense draft preview generated.',
      }
    }

    if (alreadyAppliedIds.length > 0) {
      return {
        success: true,
        documentType: 'expense',
        createdExpenseIds: alreadyAppliedIds,
        duplicateWarnings,
        draftSummary,
        message: 'Expenses were already created from this draft.',
      }
    }

    const duplicateKeySet = new Set(
      duplicateRows.map((row) =>
        expenseRowKey({
          expense_date: row.expenseDate,
          amount_cents: row.amountCents,
          description: row.rowDescription,
        })
      )
    )
    const rowsToInsert =
      data.force_apply || duplicateKeySet.size === 0
        ? expenseRows
        : expenseRows.filter((row) => !duplicateKeySet.has(expenseRowKey(row)))

    let insertedExpenses: Array<{ id: string }> = []
    if (rowsToInsert.length > 0) {
      const { data: inserted, error: expenseInsertError } = await db
        .from('expenses')
        .insert(
          rowsToInsert.map((row) => ({
            tenant_id: row.tenant_id,
            event_id: row.event_id,
            expense_date: row.expense_date,
            category: row.category,
            vendor_name: row.vendor_name,
            amount_cents: row.amount_cents,
            description: row.description,
            notes: row.notes,
            payment_method: row.payment_method,
            is_business: row.is_business,
            is_reimbursable: row.is_reimbursable,
            receipt_uploaded: row.receipt_uploaded,
            created_by: row.created_by,
            updated_by: row.updated_by,
          }))
        )
        .select('id')

      if (expenseInsertError) {
        return { success: false, error: expenseInsertError.message }
      }
      insertedExpenses = (inserted ?? []) as Array<{ id: string }>
    }

    const createdExpenseIds = insertedExpenses.map((row) => row.id)
    const skippedDuplicateRowsCount = data.force_apply ? 0 : duplicateRows.length
    const duplicateResolution =
      skippedDuplicateRowsCount > 0
        ? createdExpenseIds.length > 0
          ? 'skipped_duplicate_rows'
          : 'all_rows_matched_existing'
        : null

    await db
      .from('vendor_document_uploads')
      .update({
        status: 'completed',
        processed_at: nowIso,
        parse_summary: {
          ...parseSummary,
          applied_expense_ids: createdExpenseIds,
          applied_at: nowIso,
          duplicate_rows: duplicateRows,
          duplicate_resolution: duplicateResolution,
          skipped_duplicate_rows_count: skippedDuplicateRowsCount,
        },
      })
      .eq('id', uploadRow.id)
      .eq('chef_id', user.tenantId!)

    await logVendorDocumentActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'expense_created',
      entityId: uploadRow.id,
      summary: `Saved expense draft from ${uploadRow.source_filename}`,
      context: {
        vendor_id: uploadRow.vendor_id,
        created_count: createdExpenseIds.length,
        duplicate_rows_count: duplicateRows.length,
        skipped_duplicates_count: skippedDuplicateRowsCount,
        forced: data.force_apply,
      },
    })

    revalidateVendorPaths(uploadRow.vendor_id)
    revalidatePath('/expenses')
    revalidatePath('/financials')
    revalidatePath('/finance')
    let expenseMessage = `Created ${createdExpenseIds.length} expense record(s) from draft.`
    if (!data.force_apply && skippedDuplicateRowsCount > 0) {
      expenseMessage =
        createdExpenseIds.length > 0
          ? `Created ${createdExpenseIds.length} expense record(s) and skipped ${skippedDuplicateRowsCount} duplicate row(s).`
          : 'All expense rows matched existing records. No new expenses were created.'
    }

    return {
      success: true,
      documentType: 'expense',
      createdExpenseIds,
      duplicateWarnings,
      draftSummary,
      message: expenseMessage,
    }
  }

  return { success: false, error: 'This upload does not support draft apply' }
}

export async function listVendorDocumentUploads(
  vendorId: string,
  limit = 40
): Promise<VendorDocumentUploadRow[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  await assertVendorAccess(db, user.tenantId!, vendorId)

  const { data, error } = await db
    .from('vendor_document_uploads')
    .select(
      'id, vendor_id, document_type, source_filename, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, parse_summary, error_message, created_at, processed_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[vendor-documents] list error:', error)
    throw new Error('Failed to load vendor documents')
  }

  const rows = (data ?? []) as Array<{
    id: string
    vendor_id: string
    document_type: VendorDocumentType
    source_filename: string
    file_storage_path: string | null
    file_mime_type: string | null
    file_size_bytes: number
    file_hash: string | null
    status: VendorDocumentStatus
    parse_summary: Record<string, unknown> | null
    error_message: string | null
    created_at: string
    processed_at: string | null
  }>

  const pathsToSign = rows
    .map((row) => row.file_storage_path)
    .filter((path): path is string => Boolean(path))

  const signedMap = new Map<string, string>()
  if (pathsToSign.length > 0) {
    const { data: signedUrls } = await db.storage
      .from(VENDOR_DOCUMENTS_BUCKET)
      .createSignedUrls(pathsToSign, SIGNED_URL_EXPIRY_SECONDS)

    for (const signed of signedUrls ?? []) {
      if (signed.path && signed.signedUrl) signedMap.set(signed.path, signed.signedUrl)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    vendor_id: row.vendor_id,
    document_type: row.document_type,
    source_filename: row.source_filename,
    file_mime_type: row.file_mime_type,
    file_size_bytes: row.file_size_bytes,
    file_hash: row.file_hash,
    status: row.status,
    parse_summary: row.parse_summary ?? {},
    error_message: row.error_message,
    created_at: row.created_at,
    processed_at: row.processed_at,
    download_url: row.file_storage_path ? (signedMap.get(row.file_storage_path) ?? null) : null,
  }))
}
