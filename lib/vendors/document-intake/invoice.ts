import { recordVendorPricePoint } from '@/lib/vendors/price-point-actions'
import type { DraftInvoiceLineItem, DraftInvoiceSummary, ParsedCsv } from './types'
import {
  cleanString,
  detectColumnIndex,
  inferPriceFormat,
  parseDateGuess,
  parseNumberish,
  toCents,
} from './shared'

export async function recordInvoiceLineItemPricePoints(params: {
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

export async function findPotentialInvoiceDuplicates(params: {
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
