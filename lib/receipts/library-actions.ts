'use server'

// Receipt Library Server Actions
// Handles upload-anywhere (any event state, no event required) and the chef-wide receipt library.
//
// Key differences from quick-capture.ts:
//   - No event state restriction (any state, or no event at all)
//   - Stores storage_path in DB for permanent signed URL regeneration
//   - getAllReceiptsForChef() returns all receipts across all events with fresh signed URLs

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { processReceiptOCR } from './actions'

const RECEIPTS_BUCKET = 'receipts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

// Signed URL expiry for display (1 hour is enough for a browsing session)
const DISPLAY_URL_EXPIRY_SECONDS = 3600

export type UploadStandaloneResult =
  | { success: true; receiptPhotoId: string }
  | { success: false; error: string }

// ─── Upload ──────────────────────────────────────────────────────────────────

/**
 * Upload a receipt from anywhere — no event state restriction, event optional.
 * Works for:
 *   - Active events (same as quick-capture)
 *   - Past events (completed, cancelled)
 *   - Draft events
 *   - No event at all (supply runs, annual purchases, etc.)
 *
 * formData key: 'receipt' (File)
 * opts.eventId  — optional, if provided must belong to this chef
 * opts.clientId — optional, direct client association
 * opts.notes    — optional context note
 */
export async function uploadStandaloneReceipt(
  formData: FormData,
  opts: { eventId?: string; clientId?: string; notes?: string } = {}
): Promise<UploadStandaloneResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // If an eventId was provided, verify it belongs to this chef (security check — no state restriction)
  if (opts.eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', opts.eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!event) return { success: false, error: 'Event not found' }
  }

  // If a clientId was provided, verify it belongs to this chef
  if (opts.clientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', opts.clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!client) return { success: false, error: 'Client not found' }
  }

  const file = formData.get('receipt') as File | null
  if (!file || file.size === 0) return { success: false, error: 'No file provided' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Use JPEG, PNG, HEIC, or WebP.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    }
  }

  const pathKey = crypto.randomUUID()
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  // Use 'general' folder for receipts not tied to an event
  const contextFolder = opts.eventId ?? 'general'
  const storagePath = `${user.tenantId}/${contextFolder}/${pathKey}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[uploadStandaloneReceipt] Storage upload error:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Generate a short-lived signed URL for the initial OCR window
  const { data: signedData, error: signError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, 86400) // 24h for OCR processing window

  if (signError || !signedData?.signedUrl) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to generate access URL — please try again' }
  }

  const { data: photoRecord, error: dbError } = await supabase
    .from('receipt_photos')
    .insert({
      event_id: opts.eventId ?? null,
      client_id: opts.clientId ?? null,
      tenant_id: user.tenantId!,
      photo_url: signedData.signedUrl,
      storage_path: storagePath,
      notes: opts.notes ?? null,
      upload_status: 'pending',
    })
    .select('id')
    .single()

  if (dbError || !photoRecord) {
    console.error('[uploadStandaloneReceipt] DB insert error:', dbError)
    await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to register receipt — please try again' }
  }

  revalidatePath('/receipts')
  if (opts.eventId) {
    revalidatePath(`/events/${opts.eventId}`)
    revalidatePath(`/events/${opts.eventId}/receipts`)
  }

  // Background OCR — non-blocking
  processReceiptOCR(photoRecord.id).catch((err) => {
    console.error('[uploadStandaloneReceipt] Background OCR error:', err)
  })

  return { success: true, receiptPhotoId: photoRecord.id }
}

// ─── Library Query ────────────────────────────────────────────────────────────

export type AllReceiptPhoto = {
  id: string
  eventId: string | null
  eventName: string | null
  eventDate: string | null
  clientId: string | null
  clientName: string | null
  photoUrl: string // Always a fresh signed URL (or best-effort legacy URL)
  storagePath: string | null
  notes: string | null
  ocrRaw: string | null
  uploadStatus: 'pending' | 'processing' | 'extracted' | 'approved'
  approvedAt: string | null
  createdAt: string
  extraction: {
    id: string
    storeName: string | null
    storeLocation: string | null
    purchaseDate: string | null
    paymentMethod: string | null
    subtotalCents: number | null
    taxCents: number | null
    totalCents: number | null
    extractionConfidence: number | null
  } | null
  lineItems: {
    id: string
    description: string
    priceCents: number | null
    expenseTag: 'business' | 'personal' | 'unknown'
    ingredientCategory: string | null
  }[]
}

export type EventOption = { id: string; label: string }
export type ClientOption = { id: string; name: string }

/**
 * Fetch all receipts across all events for this chef.
 * Regenerates signed URLs from storage_path where available (1-hour expiry).
 * Falls back to stored photo_url for legacy records without storage_path.
 */
export async function getAllReceiptsForChef(
  opts: {
    eventId?: string
    clientId?: string
    status?: string
    limit?: number
    offset?: number
  } = {}
): Promise<AllReceiptPhoto[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('receipt_photos')
    .select(
      `
      id, event_id, client_id, photo_url, storage_path, notes,
      ocr_raw, upload_status, approved_at, created_at,
      events(occasion, event_date),
      clients(name),
      receipt_extractions(
        id, store_name, store_location, purchase_date, payment_method,
        subtotal_cents, tax_cents, total_cents, extraction_confidence,
        receipt_line_items(id, description, price_cents, expense_tag, ingredient_category)
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (opts.eventId) query = query.eq('event_id', opts.eventId)
  if (opts.clientId) query = query.eq('client_id', opts.clientId)
  if (opts.status && opts.status !== 'all') query = query.eq('upload_status', opts.status)
  if (opts.limit) query = query.limit(opts.limit)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data, error } = await query

  if (error) {
    console.error('[getAllReceiptsForChef]', error)
    return []
  }

  // Regenerate signed URLs for all photos that have a storage_path stored
  const pathsToSign = (data ?? [])
    .filter((row: any) => !!row.storage_path)
    .map((row: any) => row.storage_path as string)

  // Batch-sign all paths in one call (more efficient than individual calls)
  const signedMap = new Map<string, string>()
  if (pathsToSign.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrls(pathsToSign, DISPLAY_URL_EXPIRY_SECONDS)

    for (const item of signedUrls ?? []) {
      if (item.signedUrl && item.path) signedMap.set(item.path, item.signedUrl)
    }
  }

  return (data ?? []).map((row: any) => {
    const ext = (row.receipt_extractions as any)?.[0] ?? null
    const event = row.events as any
    const client = row.clients as any

    // Use fresh signed URL if available; fall back to stored URL (may be expired for legacy records)
    const photoUrl = (row.storage_path && signedMap.get(row.storage_path)) || row.photo_url

    return {
      id: row.id,
      eventId: row.event_id ?? null,
      eventName: event?.occasion ?? null,
      eventDate: event?.event_date ?? null,
      clientId: row.client_id ?? null,
      clientName: client?.name ?? null,
      photoUrl,
      storagePath: row.storage_path ?? null,
      notes: row.notes ?? null,
      ocrRaw: row.ocr_raw,
      uploadStatus: row.upload_status as AllReceiptPhoto['uploadStatus'],
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

// ─── Helper for selectors ─────────────────────────────────────────────────────

/** Fetch all events for the chef — used to populate the event selector on the upload form. */
export async function getEventOptionsForChef(): Promise<EventOption[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })
    .limit(200)

  return (data ?? []).map((e: any) => ({
    id: e.id,
    label: e.occasion ? `${e.occasion} (${e.event_date})` : `Event — ${e.event_date}`,
  }))
}

/** Fetch all clients for the chef — used to populate the client selector on the upload form. */
export async function getClientOptionsForChef(): Promise<ClientOption[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', user.tenantId!)
    .order('name', { ascending: true })
    .limit(200)

  return (data ?? []).map((c: any) => ({ id: c.id, name: c.name }))
}
