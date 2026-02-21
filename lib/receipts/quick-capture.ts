'use server'

// Quick Receipt Capture — Server Action
// Used by the QuickReceiptCapture widget on the event detail page.
// Handles: storage upload → signed URL → receipt_photos record → background OCR trigger.
// Only allowed for events in 'confirmed' or 'in_progress' state.

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

// 24-hour signed URL — long enough for OCR to process after upload
const SIGNED_URL_EXPIRY_SECONDS = 86400

const ALLOWED_EVENT_STATUSES = ['confirmed', 'in_progress']

export type QuickCaptureResult =
  | { success: true; receiptPhotoId: string }
  | { success: false; error: string }

/**
 * Upload a receipt photo during a live event.
 * Handles Supabase Storage upload, receipt_photos record creation, and background OCR.
 * formData key: 'receipt' (File)
 */
export async function quickCaptureReceipt(
  eventId: string,
  formData: FormData
): Promise<QuickCaptureResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the event belongs to this chef and is in an active state
  const { data: event } = await supabase
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }
  if (!ALLOWED_EVENT_STATUSES.includes(event.status)) {
    return { success: false, error: 'Receipts can only be captured for confirmed or active events' }
  }

  const file = formData.get('receipt') as File | null
  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Use JPEG, PNG, HEIC, or WebP.' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    }
  }

  // Generate storage path using a random key (separate from DB-generated record ID)
  const pathKey = crypto.randomUUID()
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const storagePath = `${user.tenantId}/${eventId}/${pathKey}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[quickCaptureReceipt] Storage upload error:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Create a signed URL long enough for OCR processing
  const { data: signedData, error: signError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

  if (signError || !signedData?.signedUrl) {
    await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to generate access URL — please try again' }
  }

  // Register the receipt photo record
  const { data: photoRecord, error: dbError } = await (supabase as any)
    .from('receipt_photos')
    .insert({
      event_id: eventId,
      tenant_id: user.tenantId!,
      photo_url: signedData.signedUrl,
      upload_status: 'pending',
    })
    .select('id')
    .single()

  if (dbError || !photoRecord) {
    console.error('[quickCaptureReceipt] DB insert error:', dbError)
    await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { success: false, error: 'Failed to register receipt — please try again' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/receipts`)

  // Trigger OCR in the background — non-blocking so the UI gets a fast response
  processReceiptOCR(photoRecord.id).catch((err) => {
    console.error('[quickCaptureReceipt] Background OCR error:', err)
  })

  return { success: true, receiptPhotoId: photoRecord.id }
}
