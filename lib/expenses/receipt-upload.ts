// Receipt Upload - local storage
// Handles receipt photo upload, signed URL retrieval, and cleanup

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

const RECEIPTS_BUCKET = 'receipts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

/**
 * Upload a receipt photo to local storage.
 * Returns the storage path (not a signed URL - use getReceiptUrl for that).
 *
 * NOTE: The 'receipts' bucket must be created in local storage:
 *   1. Go to the database Dashboard → Storage
 *   2. Create a new bucket named 'receipts' (private, not public)
 *   3. Add RLS policy: allow authenticated users to INSERT/SELECT where
 *      the path starts with their tenant_id
 */
export async function uploadReceipt(eventId: string, expenseId: string, formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()

  const file = formData.get('receipt') as File | null
  if (!file) {
    throw new Error('No file provided')
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Accepted: JPEG, PNG, HEIC, WebP`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`)
  }

  // Determine file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${user.tenantId}/${eventId}/${expenseId}.${ext}`

  // Upload to local storage
  const { error: uploadError } = await db.storage.from(RECEIPTS_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  })

  if (uploadError) {
    console.error('[uploadReceipt] Storage upload error:', uploadError)
    throw new Error(`Failed to upload receipt: ${uploadError.message}`)
  }

  // Update the expense record with the storage path
  const { error: updateError } = await db
    .from('expenses')
    .update({
      receipt_photo_url: storagePath,
      receipt_uploaded: true,
      updated_by: user.id,
    })
    .eq('id', expenseId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[uploadReceipt] Expense update error:', updateError)
    throw new Error(`Receipt uploaded but failed to update expense: ${updateError.message}`)
  }

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)
  revalidatePath(`/events/${eventId}`)

  return { success: true, storagePath }
}

/**
 * Get a signed URL for a receipt image.
 * Signed URLs expire after 1 hour.
 */
export async function getReceiptUrl(expenseId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the storage path from the expense record
  const { data: expense, error } = await db
    .from('expenses')
    .select('receipt_photo_url')
    .eq('id', expenseId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !expense?.receipt_photo_url) {
    return null
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrlData, error: signError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(expense.receipt_photo_url, 3600)

  if (signError) {
    console.error('[getReceiptUrl] Signed URL error:', signError)
    return null
  }

  return signedUrlData.signedUrl
}

/**
 * Delete a receipt from storage and clear the reference on the expense.
 */
export async function deleteReceipt(expenseId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the storage path
  const { data: expense } = await db
    .from('expenses')
    .select('receipt_photo_url')
    .eq('id', expenseId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (expense?.receipt_photo_url) {
    await db.storage.from(RECEIPTS_BUCKET).remove([expense.receipt_photo_url])
  }

  // Clear the reference on the expense
  const { error } = await db
    .from('expenses')
    .update({
      receipt_photo_url: null,
      receipt_uploaded: false,
      updated_by: user.id,
    })
    .eq('id', expenseId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteReceipt] Error:', error)
    throw new Error('Failed to delete receipt')
  }

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${expenseId}`)

  return { success: true }
}
