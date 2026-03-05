'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CatalogRowSchema = z.object({
  vendor_sku: z.string().trim().max(120).optional().nullable(),
  vendor_item_name: z.string().trim().min(1).max(300),
  unit_price_cents: z.number().int().min(0),
  unit_size: z.number().nullable().optional(),
  unit_measure: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const ImportVendorCatalogSchema = z.object({
  vendor_id: z.string().uuid(),
  rows: z.array(CatalogRowSchema).min(1).max(5000),
})

const QueueCatalogRowSchema = CatalogRowSchema.extend({
  source_row_number: z.number().int().min(1).optional(),
})

const QueueVendorCatalogSchema = z.object({
  vendor_id: z.string().uuid(),
  source_type: z.enum(['csv', 'xlsx', 'pdf', 'manual']).default('csv'),
  source_filename: z.string().trim().max(255).optional().nullable(),
  auto_apply_high_confidence: z.boolean().default(true),
  rows: z.array(QueueCatalogRowSchema).min(1).max(5000),
})

const QueueStatusSchema = z.enum(['pending', 'applied', 'rejected', 'error'])

const ReviewVendorCatalogRowSchema = z.object({
  row_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional().nullable(),
})

export type CatalogImportRowInput = z.infer<typeof CatalogRowSchema>

export type ImportVendorCatalogInput = z.infer<typeof ImportVendorCatalogSchema>

export type ImportVendorCatalogResult = {
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

export type QueueVendorCatalogInput = z.infer<typeof QueueVendorCatalogSchema>

export type QueueVendorCatalogResult = {
  queued: number
  autoApplied: number
  needsReview: number
  errors: string[]
}

export type VendorCatalogQueueStatus = z.infer<typeof QueueStatusSchema>

export type VendorCatalogQueueRow = {
  id: string
  source_row_number: number
  vendor_sku: string | null
  vendor_item_name: string
  unit_price_cents: number
  unit_size: number | null
  unit_measure: string | null
  notes: string | null
  confidence: 'high' | 'medium' | 'low'
  parse_flags: string[]
  status: VendorCatalogQueueStatus
  decision_reason: string | null
  created_at: string
}

function cleanString(value?: string | null): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanUnitSize(value?: number | null): number | null {
  if (value == null) return null
  if (!Number.isFinite(value) || value <= 0) return null
  return Number(value.toFixed(3))
}

type NormalizedCatalogRow = {
  vendor_sku: string | null
  vendor_item_name: string
  unit_price_cents: number
  unit_size: number | null
  unit_measure: string | null
  notes: string | null
}

function normalizeCatalogRow(row: CatalogImportRowInput): NormalizedCatalogRow {
  return {
    vendor_sku: cleanString(row.vendor_sku),
    vendor_item_name: row.vendor_item_name.trim(),
    unit_price_cents: row.unit_price_cents,
    unit_size: cleanUnitSize(row.unit_size),
    unit_measure: cleanString(row.unit_measure),
    notes: cleanString(row.notes),
  }
}

function assessConfidence(row: NormalizedCatalogRow): {
  confidence: 'high' | 'medium' | 'low'
  flags: string[]
} {
  const flags: string[] = []

  if (!row.vendor_sku) flags.push('missing_sku')
  if (!row.unit_measure) flags.push('missing_unit_measure')
  if (!row.unit_size) flags.push('missing_unit_size')
  if (row.unit_price_cents === 0) flags.push('zero_price')

  if (row.unit_price_cents === 0) {
    return { confidence: 'low', flags }
  }

  if (!row.vendor_sku && !row.unit_measure && !row.unit_size) {
    return { confidence: 'medium', flags }
  }

  return { confidence: 'high', flags }
}

async function assertVendorAccess(supabase: any, tenantId: string, vendorId: string) {
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)
    .single()

  if (error || !vendor) {
    throw new Error('Vendor not found or access denied')
  }

  return vendor
}

async function applyNormalizedRowToVendorItems(
  supabase: any,
  tenantId: string,
  vendorId: string,
  row: NormalizedCatalogRow
): Promise<{ action: 'inserted' | 'updated'; vendorItemId: string }> {
  let existingItem: { id: string } | null = null

  if (row.vendor_sku) {
    const { data: existingBySku, error: skuError } = await supabase
      .from('vendor_items')
      .select('id')
      .eq('chef_id', tenantId)
      .eq('vendor_id', vendorId)
      .eq('vendor_sku', row.vendor_sku)
      .limit(1)
      .maybeSingle()

    if (skuError) throw new Error(skuError.message)
    existingItem = existingBySku ?? null
  }

  if (!existingItem) {
    const { data: existingByName, error: nameError } = await supabase
      .from('vendor_items')
      .select('id')
      .eq('chef_id', tenantId)
      .eq('vendor_id', vendorId)
      .eq('vendor_item_name', row.vendor_item_name)
      .limit(1)
      .maybeSingle()

    if (nameError) throw new Error(nameError.message)
    existingItem = existingByName ?? null
  }

  const payload = {
    vendor_id: vendorId,
    chef_id: tenantId,
    vendor_sku: row.vendor_sku,
    vendor_item_name: row.vendor_item_name,
    unit_price_cents: row.unit_price_cents,
    unit_size: row.unit_size,
    unit_measure: row.unit_measure,
    notes: row.notes,
  }

  if (existingItem) {
    const { error: updateError } = await supabase
      .from('vendor_items')
      .update({ ...payload, last_updated: new Date().toISOString() })
      .eq('id', existingItem.id)
      .eq('chef_id', tenantId)

    if (updateError) throw new Error(updateError.message)

    return { action: 'updated', vendorItemId: existingItem.id }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('vendor_items')
    .insert(payload)
    .select('id')
    .single()

  if (insertError) throw new Error(insertError.message)

  return { action: 'inserted', vendorItemId: inserted.id }
}

function revalidateVendorCatalogPaths(vendorId: string) {
  revalidatePath('/vendors')
  revalidatePath(`/vendors/${vendorId}`)
  revalidatePath('/vendors/price-comparison')
  revalidatePath('/food-cost')
}

export async function importVendorCatalogRows(
  input: ImportVendorCatalogInput
): Promise<ImportVendorCatalogResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = ImportVendorCatalogSchema.parse(input)

  await assertVendorAccess(supabase, user.tenantId!, data.vendor_id)

  const result: ImportVendorCatalogResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  for (let i = 0; i < data.rows.length; i += 1) {
    const line = i + 1

    try {
      const normalized = normalizeCatalogRow(data.rows[i])

      if (!normalized.vendor_item_name) {
        result.skipped += 1
        continue
      }

      const applied = await applyNormalizedRowToVendorItems(
        supabase,
        user.tenantId!,
        data.vendor_id,
        normalized
      )

      if (applied.action === 'inserted') result.inserted += 1
      else result.updated += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown import error'
      result.errors.push(`Row ${line}: ${message}`)
    }
  }

  revalidateVendorCatalogPaths(data.vendor_id)
  return result
}

export async function queueVendorCatalogRows(
  input: QueueVendorCatalogInput
): Promise<QueueVendorCatalogResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = QueueVendorCatalogSchema.parse(input)

  await assertVendorAccess(supabase, user.tenantId!, data.vendor_id)

  const result: QueueVendorCatalogResult = {
    queued: 0,
    autoApplied: 0,
    needsReview: 0,
    errors: [],
  }

  for (let i = 0; i < data.rows.length; i += 1) {
    const line = data.rows[i].source_row_number ?? i + 2

    try {
      const normalized = normalizeCatalogRow(data.rows[i])
      if (!normalized.vendor_item_name) continue

      const confidenceResult = assessConfidence(normalized)

      const { data: queuedRow, error: queueError } = await supabase
        .from('vendor_catalog_import_rows')
        .insert({
          chef_id: user.tenantId!,
          vendor_id: data.vendor_id,
          source_type: data.source_type,
          source_filename: cleanString(data.source_filename),
          source_row_number: line,
          vendor_sku: normalized.vendor_sku,
          vendor_item_name: normalized.vendor_item_name,
          unit_price_cents: normalized.unit_price_cents,
          unit_size: normalized.unit_size,
          unit_measure: normalized.unit_measure,
          notes: normalized.notes,
          confidence: confidenceResult.confidence,
          parse_flags: confidenceResult.flags,
          status: 'pending',
        })
        .select('id')
        .single()

      if (queueError || !queuedRow) {
        throw new Error(queueError?.message || 'Failed to queue row')
      }

      result.queued += 1

      if (data.auto_apply_high_confidence && confidenceResult.confidence === 'high') {
        try {
          const applied = await applyNormalizedRowToVendorItems(
            supabase,
            user.tenantId!,
            data.vendor_id,
            normalized
          )

          const { error: markAppliedError } = await supabase
            .from('vendor_catalog_import_rows')
            .update({
              status: 'applied',
              applied_vendor_item_id: applied.vendorItemId,
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id,
              decision_reason: 'Auto-applied (high confidence)',
            })
            .eq('id', queuedRow.id)
            .eq('chef_id', user.tenantId!)

          if (markAppliedError) {
            throw new Error(markAppliedError.message)
          }

          result.autoApplied += 1
        } catch (applyErr) {
          const applyMessage =
            applyErr instanceof Error ? applyErr.message : 'Failed to auto-apply row'

          await supabase
            .from('vendor_catalog_import_rows')
            .update({
              status: 'error',
              decision_reason: applyMessage,
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id,
            })
            .eq('id', queuedRow.id)
            .eq('chef_id', user.tenantId!)

          result.errors.push(`Row ${line}: ${applyMessage}`)
        }
      } else {
        result.needsReview += 1
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown queue error'
      result.errors.push(`Row ${line}: ${message}`)
    }
  }

  result.needsReview = Math.max(0, result.queued - result.autoApplied)
  revalidateVendorCatalogPaths(data.vendor_id)
  return result
}

export async function listVendorCatalogQueue(
  vendorId: string,
  status: VendorCatalogQueueStatus = 'pending',
  limit = 200
): Promise<VendorCatalogQueueRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalizedStatus = QueueStatusSchema.parse(status)
  const safeLimit = Math.min(Math.max(limit, 1), 2000)

  const { data, error } = await supabase
    .from('vendor_catalog_import_rows')
    .select(
      'id, source_row_number, vendor_sku, vendor_item_name, unit_price_cents, unit_size, unit_measure, notes, confidence, parse_flags, status, decision_reason, created_at'
    )
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .eq('status', normalizedStatus)
    .order('source_row_number', { ascending: true })
    .limit(safeLimit)

  if (error) {
    console.error('[catalog-queue] list error:', error)
    throw new Error('Failed to load catalog review queue')
  }

  return (data ?? []) as VendorCatalogQueueRow[]
}

export async function reviewVendorCatalogRow(input: z.infer<typeof ReviewVendorCatalogRowSchema>) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = ReviewVendorCatalogRowSchema.parse(input)

  const { data: row, error: rowError } = await supabase
    .from('vendor_catalog_import_rows')
    .select('*')
    .eq('id', data.row_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (rowError || !row) {
    throw new Error('Queue row not found')
  }

  if (row.status !== 'pending' && row.status !== 'error') {
    throw new Error(`This row is already ${row.status}`)
  }

  const reason = cleanString(data.reason)

  if (data.action === 'reject') {
    const { error: rejectError } = await supabase
      .from('vendor_catalog_import_rows')
      .update({
        status: 'rejected',
        decision_reason: reason ?? 'Rejected by user',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', row.id)
      .eq('chef_id', user.tenantId!)

    if (rejectError) {
      throw new Error(rejectError.message)
    }

    revalidateVendorCatalogPaths(row.vendor_id)
    return { success: true as const, action: 'rejected' as const }
  }

  const normalized: NormalizedCatalogRow = {
    vendor_sku: cleanString(row.vendor_sku),
    vendor_item_name: String(row.vendor_item_name || '').trim(),
    unit_price_cents: Number(row.unit_price_cents || 0),
    unit_size: row.unit_size == null ? null : Number(row.unit_size),
    unit_measure: cleanString(row.unit_measure),
    notes: cleanString(row.notes),
  }

  const applied = await applyNormalizedRowToVendorItems(
    supabase,
    user.tenantId!,
    row.vendor_id,
    normalized
  )

  const { error: approveError } = await supabase
    .from('vendor_catalog_import_rows')
    .update({
      status: 'applied',
      applied_vendor_item_id: applied.vendorItemId,
      decision_reason: reason ?? 'Approved by user',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', row.id)
    .eq('chef_id', user.tenantId!)

  if (approveError) {
    throw new Error(approveError.message)
  }

  revalidateVendorCatalogPaths(row.vendor_id)
  return { success: true as const, action: 'applied' as const }
}

export async function approveAllPendingVendorCatalogRows(vendorId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await assertVendorAccess(supabase, user.tenantId!, vendorId)

  const { data: pendingRows, error: listError } = await supabase
    .from('vendor_catalog_import_rows')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .eq('status', 'pending')
    .order('source_row_number', { ascending: true })
    .limit(5000)

  if (listError) {
    throw new Error(listError.message)
  }

  let appliedCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const row of pendingRows ?? []) {
    try {
      const normalized: NormalizedCatalogRow = {
        vendor_sku: cleanString(row.vendor_sku),
        vendor_item_name: String(row.vendor_item_name || '').trim(),
        unit_price_cents: Number(row.unit_price_cents || 0),
        unit_size: row.unit_size == null ? null : Number(row.unit_size),
        unit_measure: cleanString(row.unit_measure),
        notes: cleanString(row.notes),
      }

      const applied = await applyNormalizedRowToVendorItems(
        supabase,
        user.tenantId!,
        vendorId,
        normalized
      )

      const { error: markError } = await supabase
        .from('vendor_catalog_import_rows')
        .update({
          status: 'applied',
          applied_vendor_item_id: applied.vendorItemId,
          decision_reason: 'Bulk approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', row.id)
        .eq('chef_id', user.tenantId!)

      if (markError) throw new Error(markError.message)

      appliedCount += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply row'

      await supabase
        .from('vendor_catalog_import_rows')
        .update({
          status: 'error',
          decision_reason: message,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', row.id)
        .eq('chef_id', user.tenantId!)

      failedCount += 1
      errors.push(`Row ${row.source_row_number}: ${message}`)
    }
  }

  revalidateVendorCatalogPaths(vendorId)
  return { appliedCount, failedCount, errors }
}
