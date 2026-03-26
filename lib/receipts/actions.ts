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
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseReceiptImage } from '@/lib/ai/parse-receipt'
import { ensureReceiptFolder, createReceiptDocument } from '@/lib/documents/auto-organize'
import { logDocumentActivity } from '@/lib/documents/activity-logging'

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
 * The photo must already be in local storage - this records the URL only.
 */
export async function uploadReceiptPhoto(input: z.infer<typeof UploadSchema>) {
  const user = await requireChef()
  const { eventId, photoUrl } = UploadSchema.parse(input)
  const db: any = createServerClient()

  // Verify event belongs to chef
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')

  const { data, error } = await db
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
  const db: any = createServerClient()

  // Fetch the photo record
  const { data: photo } = await db
    .from('receipt_photos')
    .select('id, event_id, photo_url, upload_status')
    .eq('id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) throw new Error('Receipt photo not found')
  if (photo.upload_status === 'approved')
    throw new Error('Receipt already approved - cannot re-process')

  // Mark as processing
  await db.from('receipt_photos').update({ upload_status: 'processing' }).eq('id', receiptPhotoId)

  // Fetch the image as base64 - the photo_url is a local storage public URL
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
    await db.from('receipt_photos').update({ upload_status: 'pending' }).eq('id', receiptPhotoId)
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
  await db
    .from('receipt_photos')
    .update({ ocr_raw: JSON.stringify(extraction) })
    .eq('id', receiptPhotoId)

  // Upsert extraction record (delete old if re-running)
  await db
    .from('receipt_extractions')
    .delete()
    .eq('receipt_photo_id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)

  const { data: extractionRecord, error: extractionError } = await db
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
    await db.from('receipt_photos').update({ upload_status: 'pending' }).eq('id', receiptPhotoId)
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
    const { error: lineItemsError } = await db.from('receipt_line_items').insert(lineItemRows)

    if (lineItemsError) {
      console.error('[processReceiptOCR] Line items error:', lineItemsError)
      // Non-fatal - extraction stored, line items can be added manually
    }
  }

  // Mark as extracted or needs_review based on confidence
  await db
    .from('receipt_photos')
    .update({ upload_status: needsReview ? 'needs_review' : 'extracted' })
    .eq('id', receiptPhotoId)

  // Log OCR activity (non-blocking)
  logDocumentActivity({
    tenantId: user.tenantId!,
    userId: user.id,
    action: needsReview ? 'receipt_ocr_needs_review' : 'receipt_ocr_completed',
    entityType: 'receipt',
    entityId: receiptPhotoId,
    metadata: {
      confidence: confidenceScore,
      lineItemCount: lineItemRows.length,
      storeName: extraction.storeName,
    },
  })

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
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (fields.expenseTag !== undefined) updates.expense_tag = fields.expenseTag
  if (fields.ingredientCategory !== undefined)
    updates.ingredient_category = fields.ingredientCategory
  if (fields.description !== undefined) updates.description = fields.description
  if (fields.priceCents !== undefined) updates.price_cents = fields.priceCents

  const { error } = await db
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
  const db: any = createServerClient()

  // Fetch photo + extraction + line items
  const { data: photo } = await db
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

    // Import line item and matching functions for the cost loop
    const { createExpenseLineItems, suggestIngredientMatches } =
      await import('@/lib/finance/expense-line-item-actions')

    // Collect created expense IDs to create line items after
    const createdExpenseLineItemInputs: Array<{
      expenseId: string
      receiptLineItemId: string
      description: string
      amountCents: number
    }> = []

    for (const item of businessItems) {
      const category = categoryMap[item.ingredientCategory ?? 'unknown'] ?? 'groceries'
      const { data: expenseData, error } = await db
        .from('expenses')
        .insert({
          event_id: photo.event_id ?? null,
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
        .select('id')
        .single()

      if (!error && expenseData) {
        expensesCreated++
        createdExpenseLineItemInputs.push({
          expenseId: expenseData.id,
          receiptLineItemId: item.id,
          description: item.description,
          amountCents: item.priceCents!,
        })
      } else if (error) {
        console.error('[approveReceiptSummary] Expense insert error:', error)
      }
    }

    // Create expense line items with auto-matched ingredients (non-blocking)
    // This closes the cost loop: receipt → expense → line items → ingredients → price updates
    try {
      const { applyLineItemPrices } = await import('@/lib/finance/expense-line-item-actions')
      const { logIngredientPrice } = await import('@/lib/ingredients/pricing')

      const lineItemInputs = await Promise.all(
        createdExpenseLineItemInputs.map(async (input) => {
          // Try to auto-match to an ingredient
          let ingredientId: string | null = null
          let matchConfidence: number | null = null
          try {
            const matches = await suggestIngredientMatches(input.description, 1)
            if (matches.length > 0 && matches[0].confidence >= 0.7) {
              ingredientId = matches[0].ingredientId
              matchConfidence = matches[0].confidence
            }
          } catch {
            // Match failure is non-blocking
          }
          return {
            expenseId: input.expenseId,
            receiptLineItemId: input.receiptLineItemId,
            description: input.description,
            amountCents: input.amountCents,
            ingredientId,
            matchedBy: ingredientId ? ('receipt_ocr' as const) : ('manual' as const),
            matchConfidence,
          }
        })
      )
      if (lineItemInputs.length > 0) {
        await createExpenseLineItems(lineItemInputs)

        // Auto-apply prices: update ingredient.last_price_cents from matched line items
        // and log to ingredient_price_history for trend tracking.
        // This is the critical wiring that closes the cost feedback loop.
        const matchedExpenseIds = [
          ...new Set(lineItemInputs.filter((li) => li.ingredientId).map((li) => li.expenseId)),
        ]

        for (const eid of matchedExpenseIds) {
          try {
            await applyLineItemPrices(eid)
          } catch (err) {
            console.error('[approveReceiptSummary] Price apply error (non-blocking):', err)
          }
        }

        // Log to price history for trend tracking (cheapest store, averages, alerts)
        for (const li of lineItemInputs) {
          if (!li.ingredientId) continue
          try {
            await logIngredientPrice({
              ingredient_id: li.ingredientId,
              expense_id: li.expenseId,
              store_name: vendorName ?? null,
              price_cents: li.amountCents,
              quantity: 1,
              purchase_date: expenseDate,
            })
          } catch {
            // Price logging is non-blocking
          }
        }
      }
    } catch (err) {
      console.error('[approveReceiptSummary] Expense line items error (non-blocking):', err)
    }
  }

  // Mark approved
  await db
    .from('receipt_photos')
    .update({ upload_status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', receiptPhotoId)

  // Auto-organize: create chef_document in year/month folder (non-blocking)
  try {
    const receiptDate = extraction?.purchase_date ?? new Date().toISOString().split('T')[0]
    const folderId = await ensureReceiptFolder(user.tenantId!, receiptDate)
    await createReceiptDocument(user.tenantId!, {
      receiptPhotoId,
      storeName: extraction?.store_name ?? null,
      purchaseDate: extraction?.purchase_date ?? null,
      totalCents: extraction?.total_cents ?? null,
      eventId: photo.event_id ?? null,
      clientId: (photo as any).client_id ?? null,
      folderId,
      photoUrl: photo.photo_url,
    })
  } catch (err) {
    console.error('[approveReceiptSummary] Auto-organize error (non-blocking):', err)
  }

  // Log approval activity (non-blocking)
  logDocumentActivity({
    tenantId: user.tenantId!,
    userId: user.id,
    action: 'receipt_approved',
    entityType: 'receipt',
    entityId: receiptPhotoId,
    metadata: {
      expensesCreated,
      storeName: extraction?.store_name,
      totalCents: extraction?.total_cents,
    },
  })

  revalidatePath('/receipts')
  revalidatePath('/financials')
  revalidatePath('/documents')
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
  const db: any = createServerClient()

  const { data, error } = await db
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
