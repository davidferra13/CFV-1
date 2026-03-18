// Receipt Digitization Server Actions
// Manages the upload → OCR → review → approve pipeline for receipt photos.
// On approval, business line items are written to the expenses table.
//
// Pipeline:
//   uploadReceiptPhoto() → creates receipt_photos record (status: pending)
//   processReceiptOCR()  → runs AI extraction, writes receipt_extractions + receipt_line_items (status: extracted)
//   updateLineItem()     → chef edits tags/categories inline
//   approveReceiptSummary() → marks status: approved, writes business items to expenses

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseReceiptImage } from '@/lib/ai/parse-receipt'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReceiptPhoto = {
  id: string
  eventId: string | null
  photoUrl: string
  ocrRaw: string | null
  uploadStatus: 'pending' | 'processing' | 'extracted' | 'needs_review' | 'approved'
  approvedAt: string | null
  createdAt: string
  extraction: ReceiptExtractionRecord | null
  lineItems: ReceiptLineItemRecord[]
}

export type ReceiptExtractionRecord = {
  id: string
  storeName: string | null
  storeLocation: string | null
  purchaseDate: string | null
  paymentMethod: string | null
  subtotalCents: number | null
  taxCents: number | null
  totalCents: number | null
  extractionConfidence: number | null
}

export type ReceiptLineItemRecord = {
  id: string
  description: string
  priceCents: number | null
  expenseTag: 'business' | 'personal' | 'unknown'
  ingredientCategory: string | null
}

// ─── 1. Upload ────────────────────────────────────────────────────────────────

const UploadSchema = z.object({
  eventId: z.string().uuid(),
  photoUrl: z.string().url(),
})

/**
 * Register an uploaded receipt photo URL with the pipeline.
 * The photo must already be in Supabase Storage - this records the URL only.
 */
export async function uploadReceiptPhoto(input: z.infer<typeof UploadSchema>) {
  const user = await requireChef()
  const { eventId, photoUrl } = UploadSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify event belongs to chef
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data, error } = await supabase
    .from('receipt_photos')
    .insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      photo_url: photoUrl,
      upload_status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to register receipt photo')

  revalidatePath(`/events/${eventId}/receipts`)
  return { receiptPhotoId: data.id }
}

// ─── 2. Process OCR ──────────────────────────────────────────────────────────

/**
 * Run AI extraction on a receipt photo.
 * Fetches the photo URL, calls parseReceiptImage(), stores results.
 * Updates upload_status from 'pending' → 'processing' → 'extracted'.
 */
export async function processReceiptOCR(receiptPhotoId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the photo record
  const { data: photo } = await supabase
    .from('receipt_photos')
    .select('id, event_id, photo_url, upload_status')
    .eq('id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) throw new Error('Receipt photo not found')
  if (photo.upload_status === 'approved')
    throw new Error('Receipt already approved - cannot re-process')

  // Mark as processing
  await supabase
    .from('receipt_photos')
    .update({ upload_status: 'processing' })
    .eq('id', receiptPhotoId)

  // Fetch the image as base64 - the photo_url is a Supabase Storage public URL
  let imageBase64: string
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  try {
    const response = await fetch(photo.photo_url)
    if (!response.ok) throw new Error('Failed to fetch receipt image')
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (contentType.includes('png')) mediaType = 'image/png'
    else if (contentType.includes('webp')) mediaType = 'image/webp'
    const buffer = await response.arrayBuffer()
    imageBase64 = Buffer.from(buffer).toString('base64')
  } catch (err) {
    // Reset to pending on fetch failure
    await supabase
      .from('receipt_photos')
      .update({ upload_status: 'pending' })
      .eq('id', receiptPhotoId)
    throw new Error('Could not fetch receipt image for processing')
  }

  // Run AI extraction
  const extraction = await parseReceiptImage(imageBase64, mediaType)

  // Map confidence string to number
  const confidenceMap: Record<string, number> = { high: 0.9, medium: 0.65, low: 0.35 }
  const confidenceScore = confidenceMap[extraction.confidence] ?? 0.5

  // Low confidence threshold: flag for manual review instead of auto-extracted
  const needsReview = confidenceScore < 0.5

  // Store raw OCR output for debugging
  await supabase
    .from('receipt_photos')
    .update({ ocr_raw: JSON.stringify(extraction) })
    .eq('id', receiptPhotoId)

  // Upsert extraction record (delete old if re-running)
  await supabase
    .from('receipt_extractions')
    .delete()
    .eq('receipt_photo_id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)

  const { data: extractionRecord, error: extractionError } = await supabase
    .from('receipt_extractions')
    .insert({
      receipt_photo_id: receiptPhotoId,
      tenant_id: user.tenantId!,
      store_name: extraction.storeName,
      store_location: extraction.storeLocation,
      purchase_date: extraction.purchaseDate,
      payment_method: extraction.paymentMethod,
      subtotal_cents: extraction.subtotalCents,
      tax_cents: extraction.taxCents,
      total_cents: extraction.totalCents,
      extraction_confidence: confidenceScore,
    })
    .select('id')
    .single()

  if (extractionError || !extractionRecord) {
    await supabase
      .from('receipt_photos')
      .update({ upload_status: 'pending' })
      .eq('id', receiptPhotoId)
    throw new Error('Failed to store extraction results')
  }

  // Insert line items (event_id may be null for standalone receipts)
  const lineItemRows = extraction.lineItems.map((item) => ({
    receipt_extraction_id: extractionRecord.id,
    event_id: photo.event_id ?? null,
    tenant_id: user.tenantId!,
    description: item.description,
    price_cents: item.totalPriceCents,
    expense_tag: item.category === 'personal' ? 'personal' : 'business',
    ingredient_category: item.category,
  }))

  if (lineItemRows.length > 0) {
    const { error: lineItemsError } = await supabase.from('receipt_line_items').insert(lineItemRows)

    if (lineItemsError) {
      console.error('[processReceiptOCR] Line items error:', lineItemsError)
      // Non-fatal - extraction stored, line items can be added manually
    }
  }

  // Mark as extracted or needs_review based on confidence
  await supabase
    .from('receipt_photos')
    .update({ upload_status: needsReview ? 'needs_review' : 'extracted' })
    .eq('id', receiptPhotoId)

  // Always revalidate the library; per-event page only if event is set
  revalidatePath('/receipts')
  if (photo.event_id) revalidatePath(`/events/${photo.event_id}/receipts`)
  return { success: true, lineItemCount: lineItemRows.length }
}

// ─── 3. Update Line Item ──────────────────────────────────────────────────────

const UpdateLineItemSchema = z.object({
  lineItemId: z.string().uuid(),
  expenseTag: z.enum(['business', 'personal', 'unknown']).optional(),
  ingredientCategory: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  priceCents: z.number().int().nonnegative().nullable().optional(),
})

/** Chef edits a line item inline - tag, category, description, or price. */
export async function updateLineItem(input: z.infer<typeof UpdateLineItemSchema>) {
  const user = await requireChef()
  const { lineItemId, ...fields } = UpdateLineItemSchema.parse(input)
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (fields.expenseTag !== undefined) updates.expense_tag = fields.expenseTag
  if (fields.ingredientCategory !== undefined)
    updates.ingredient_category = fields.ingredientCategory
  if (fields.description !== undefined) updates.description = fields.description
  if (fields.priceCents !== undefined) updates.price_cents = fields.priceCents

  const { error } = await supabase
    .from('receipt_line_items')
    .update(updates)
    .eq('id', lineItemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error('Failed to update line item')

  return { success: true }
}

// ─── 4. Approve Receipt ───────────────────────────────────────────────────────

/**
 * Approve a receipt summary.
 * - Marks receipt_photos.upload_status = 'approved'
 * - Copies all 'business' line items to the expenses table
 * - Idempotent: business items that were already copied are skipped via notes field matching
 */
export async function approveReceiptSummary(receiptPhotoId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch photo + extraction + line items
  const { data: photo } = await supabase
    .from('receipt_photos')
    .select(
      `
      id, event_id, photo_url, upload_status,
      receipt_extractions(id, store_name, purchase_date, payment_method, total_cents,
        receipt_line_items(id, description, price_cents, expense_tag, ingredient_category)
      )
    `
    )
    .eq('id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) throw new Error('Receipt photo not found')
  if (photo.upload_status === 'approved') return { success: true, expensesCreated: 0 }

  const extraction = (photo.receipt_extractions as any)?.[0] ?? null
  const lineItems: ReceiptLineItemRecord[] = extraction?.receipt_line_items ?? []

  // Only copy business items
  const businessItems = lineItems.filter(
    (li) => li.expenseTag === 'business' && li.priceCents && li.priceCents > 0
  )

  let expensesCreated = 0

  if (businessItems.length > 0 && extraction) {
    const expenseDate = extraction.purchase_date ?? new Date().toISOString().split('T')[0]
    const vendorName = extraction.store_name ?? undefined

    // Map ingredient_category → expense category
    const categoryMap: Record<string, string> = {
      protein: 'groceries',
      produce: 'groceries',
      dairy: 'groceries',
      pantry: 'groceries',
      alcohol: 'alcohol',
      supplies: 'supplies',
      personal: 'other',
      unknown: 'groceries',
    }

    for (const item of businessItems) {
      const category = categoryMap[item.ingredientCategory ?? 'unknown'] ?? 'groceries'
      const { error } = await supabase.from('expenses').insert({
        event_id: photo.event_id ?? null, // null for standalone receipts - expenses.event_id allows NULL
        tenant_id: user.tenantId!,
        amount_cents: item.priceCents!,
        category,
        payment_method: 'card',
        description: item.description,
        expense_date: expenseDate,
        vendor_name: vendorName,
        is_business: true,
        receipt_photo_url: photo.photo_url,
        receipt_uploaded: true,
        notes: `From receipt ${receiptPhotoId} - line item ${item.id}`,
        created_by: user.id,
      })

      if (!error) expensesCreated++
      else console.error('[approveReceiptSummary] Expense insert error:', error)
    }
  }

  // Mark approved
  await supabase
    .from('receipt_photos')
    .update({ upload_status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', receiptPhotoId)

  revalidatePath('/receipts')
  revalidatePath('/financials')
  if (photo.event_id) {
    revalidatePath(`/events/${photo.event_id}/receipts`)
    revalidatePath(`/events/${photo.event_id}`)
  }

  return { success: true, expensesCreated }
}

// ─── 5. Fetch for Event ───────────────────────────────────────────────────────

/** Fetch all receipts with extractions and line items for an event. */
export async function getReceiptSummaryForEvent(eventId: string): Promise<ReceiptPhoto[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('receipt_photos')
    .select(
      `
      id, event_id, photo_url, ocr_raw, upload_status, approved_at, created_at,
      receipt_extractions(
        id, store_name, store_location, purchase_date, payment_method,
        subtotal_cents, tax_cents, total_cents, extraction_confidence,
        receipt_line_items(id, description, price_cents, expense_tag, ingredient_category)
      )
    `
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getReceiptSummaryForEvent]', error)
    return []
  }

  return (data ?? []).map((row: any) => {
    const ext = (row.receipt_extractions as any)?.[0] ?? null
    return {
      id: row.id,
      eventId: row.event_id ?? null,
      photoUrl: row.photo_url,
      ocrRaw: row.ocr_raw,
      uploadStatus: row.upload_status as ReceiptPhoto['uploadStatus'],
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      extraction: ext
        ? {
            id: ext.id,
            storeName: ext.store_name,
            storeLocation: ext.store_location,
            purchaseDate: ext.purchase_date,
            paymentMethod: ext.payment_method,
            subtotalCents: ext.subtotal_cents,
            taxCents: ext.tax_cents,
            totalCents: ext.total_cents,
            extractionConfidence: ext.extraction_confidence,
          }
        : null,
      lineItems: (ext?.receipt_line_items ?? []).map((li: any) => ({
        id: li.id,
        description: li.description,
        priceCents: li.price_cents,
        expenseTag: li.expense_tag,
        ingredientCategory: li.ingredient_category,
      })),
    }
  })
}
