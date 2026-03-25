'use server'

// Batch Receipt Upload Server Actions
// Handles concurrent upload of multiple receipt photos (up to 20 per batch).
// Processes 3 files concurrently via Promise.allSettled for resilience.
// Each file goes through: validate -> upload to storage -> DB record -> background OCR.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { processReceiptOCR } from './actions'

const RECEIPTS_BUCKET = 'receipts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BATCH_SIZE = 20
const CONCURRENCY = 3
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

export type BatchFileResult = {
  filename: string
  success: boolean
  receiptPhotoId?: string
  error?: string
}

export type BatchUploadResult = {
  total: number
  succeeded: number
  failed: number
  results: BatchFileResult[]
}

/**
 * Upload multiple receipt photos concurrently (max 20 per batch, 3 concurrent).
 * Each file is independently uploaded to storage, registered in the DB, and queued for OCR.
 * Failures on individual files don't block others.
 */
export async function uploadReceiptBatch(
  formData: FormData,
  opts: { eventId?: string; clientId?: string; notes?: string } = {}
): Promise<BatchUploadResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify event ownership if provided
  if (opts.eventId) {
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', opts.eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!event) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [{ filename: '', success: false, error: 'Event not found' }],
      }
    }
  }

  // Verify client ownership if provided
  if (opts.clientId) {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('id', opts.clientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!client) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [{ filename: '', success: false, error: 'Client not found' }],
      }
    }
  }

  // Collect all files from formData (key: 'receipts' with multiple files)
  const files: File[] = []
  const entries = formData.getAll('receipts')
  for (const entry of entries) {
    if (entry instanceof File && entry.size > 0) {
      files.push(entry)
    }
  }

  if (files.length === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [{ filename: '', success: false, error: 'No files provided' }],
    }
  }

  if (files.length > MAX_BATCH_SIZE) {
    return {
      total: files.length,
      succeeded: 0,
      failed: files.length,
      results: [
        { filename: '', success: false, error: `Maximum ${MAX_BATCH_SIZE} files per batch` },
      ],
    }
  }

  // Process files in batches of CONCURRENCY
  const allResults: BatchFileResult[] = []

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map((file) => uploadSingleFile(db, user, file, opts))
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      const file = batch[j]
      if (result.status === 'fulfilled') {
        allResults.push(result.value)
      } else {
        allResults.push({
          filename: file.name,
          success: false,
          error: result.reason?.message ?? 'Unexpected error',
        })
      }
    }
  }

  // Revalidate paths once after all uploads
  revalidatePath('/receipts')
  if (opts.eventId) {
    revalidatePath(`/events/${opts.eventId}`)
    revalidatePath(`/events/${opts.eventId}/receipts`)
  }

  const succeeded = allResults.filter((r) => r.success).length
  return {
    total: allResults.length,
    succeeded,
    failed: allResults.length - succeeded,
    results: allResults,
  }
}

// ─── Internal: upload a single file ──────────────────────────────────────────

async function uploadSingleFile(
  db: any,
  user: { id: string; tenantId: string | null },
  file: File,
  opts: { eventId?: string; clientId?: string; notes?: string }
): Promise<BatchFileResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      filename: file.name,
      success: false,
      error: 'Invalid file type. Use JPEG, PNG, HEIC, or WebP.',
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      filename: file.name,
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    }
  }

  const pathKey = crypto.randomUUID()
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const contextFolder = opts.eventId ?? 'general'
  const storagePath = `${user.tenantId}/${contextFolder}/${pathKey}.${ext}`

  // Upload to storage
  const { error: uploadError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { filename: file.name, success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Generate signed URL for OCR processing window
  const { data: signedData, error: signError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, 86400)

  if (signError || !signedData?.signedUrl) {
    await db.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { filename: file.name, success: false, error: 'Failed to generate access URL' }
  }

  // Create DB record
  const { data: photoRecord, error: dbError } = await db
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
    await db.storage.from(RECEIPTS_BUCKET).remove([storagePath])
    return { filename: file.name, success: false, error: 'Failed to register receipt' }
  }

  // Background OCR (non-blocking)
  processReceiptOCR(photoRecord.id).catch((err) => {
    console.error(`[batch-upload] Background OCR error for ${file.name}:`, err)
  })

  return { filename: file.name, success: true, receiptPhotoId: photoRecord.id }
}
