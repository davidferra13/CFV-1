'use server'

// Document Intelligence Router
// Takes classified document_intelligence_items and routes them to the correct destination:
//   - receipt -> receipt pipeline (receipt_photos + OCR)
//   - document -> chef_documents
//   - recipe -> recipes table (via import)
//   - client_info -> clients table (via import)
//
// This wires the existing document_intelligence_items table to actual processing.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type RouteResult = {
  success: boolean
  destination?: string
  recordType?: string
  entityId?: string
  error?: string
}

/**
 * Route a classified document intelligence item to its destination.
 * The item must already have detected_type set (from classification step).
 */
export async function routeIntelligenceItem(itemId: string): Promise<RouteResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date().toISOString()

  // Fetch the item
  const { data: item, error: fetchError } = await (db
    .from('document_intelligence_items' as any)
    .select('*')
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (fetchError || !item) {
    return { success: false, error: 'Intelligence item not found' }
  }

  if (item.status === 'completed') {
    return {
      success: true,
      destination: item.suggested_destination,
      recordType: item.routed_record_type,
      entityId: item.routed_record_id,
    }
  }

  const detectedType = item.detected_type as string | null
  if (!detectedType) {
    return { success: false, error: 'Item has not been classified yet' }
  }

  // Mark as routing
  await (db
    .from('document_intelligence_items' as any)
    .update({ status: 'routing', updated_at: now })
    .eq('id', itemId) as any)

  try {
    let result: RouteResult

    switch (detectedType) {
      case 'receipt':
        result = await routeToReceipt(db, user, item)
        break
      case 'document':
      case 'contract':
      case 'policy':
      case 'checklist':
      case 'note':
        result = await routeToDocument(db, user, item, detectedType)
        break
      case 'recipe':
        result = await routeToRecipe(db, user, item)
        break
      case 'client_info':
        result = await routeToClient(db, user, item)
        break
      default:
        // Unknown type: store as generic document
        result = await routeToDocument(db, user, item, 'general')
    }

    if (result.success) {
      await (db
        .from('document_intelligence_items' as any)
        .update({
          status: 'completed',
          suggested_destination: result.destination,
          routed_record_type: result.recordType ?? null,
          routed_record_id: result.entityId ?? null,
          processed_at: now,
          updated_at: now,
        })
        .eq('id', itemId) as any)
    } else {
      await (db
        .from('document_intelligence_items' as any)
        .update({
          status: 'failed',
          error_message: result.error,
          processed_at: now,
          updated_at: now,
        })
        .eq('id', itemId) as any)
    }

    revalidatePath('/documents')
    revalidatePath('/receipts')
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Routing failed'
    await (db
      .from('document_intelligence_items' as any)
      .update({ status: 'failed', error_message: msg, processed_at: now, updated_at: now })
      .eq('id', itemId) as any)
    return { success: false, error: msg }
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────────

const RECEIPTS_BUCKET = 'receipts'
const RECEIPT_URL_EXPIRY_SECONDS = 86400

function mapChefDocumentType(
  value: string
): 'contract' | 'policy' | 'checklist' | 'note' | 'general' {
  switch (value) {
    case 'contract':
      return 'contract'
    case 'policy':
      return 'policy'
    case 'checklist':
      return 'checklist'
    case 'note':
      return 'note'
    default:
      return 'general'
  }
}

async function routeToReceipt(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any
): Promise<RouteResult> {
  if (!item.file_storage_path) {
    return { success: false, error: 'Receipt item is missing a storage path' }
  }

  const sourceBucket = item.file_storage_bucket || RECEIPTS_BUCKET
  const { data: sourceFile, error: downloadError } = await db.storage
    .from(sourceBucket)
    .download(item.file_storage_path)

  if (downloadError || !sourceFile) {
    return { success: false, error: 'Failed to read receipt file from storage' }
  }

  const extension =
    typeof item.source_filename === 'string' && item.source_filename.includes('.')
      ? item.source_filename.split('.').pop()?.toLowerCase()
      : null
  const receiptStoragePath = `${user.tenantId}/general/${crypto.randomUUID()}.${extension || 'jpg'}`

  const { error: uploadError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .upload(receiptStoragePath, sourceFile, {
      contentType: item.file_mime_type || sourceFile.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: 'Failed to copy receipt into receipt storage' }
  }

  const { data: signedData, error: signError } = await db.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(receiptStoragePath, RECEIPT_URL_EXPIRY_SECONDS)

  if (signError || !signedData?.signedUrl) {
    return { success: false, error: 'Failed to generate receipt access URL' }
  }

  const { data: photo, error } = await db
    .from('receipt_photos')
    .insert({
      tenant_id: user.tenantId!,
      photo_url: signedData.signedUrl,
      storage_path: receiptStoragePath,
      upload_status: 'pending',
      notes: `Auto-routed from document upload: ${item.source_filename}`,
    })
    .select('id')
    .single()

  if (error || !photo) {
    return { success: false, error: 'Failed to create receipt record' }
  }

  return {
    success: true,
    destination: 'receipt',
    recordType: 'receipt_photo',
    entityId: photo.id,
  }
}

async function routeToDocument(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any,
  docType: string
): Promise<RouteResult> {
  const extractedData = item.extracted_data as any
  const { data: doc, error } = await db
    .from('chef_documents')
    .insert({
      tenant_id: user.tenantId!,
      title: extractedData?.title ?? item.source_filename ?? 'Untitled Document',
      document_type: mapChefDocumentType(docType),
      content_text: item.extracted_text ?? null,
      summary: extractedData?.summary ?? null,
      source_type: 'file_upload',
      source_filename: item.source_filename,
      original_filename: item.source_filename ?? null,
      storage_bucket: item.file_storage_bucket ?? null,
      storage_path: item.file_storage_path ?? null,
      mime_type: item.file_mime_type ?? null,
      file_size_bytes: item.file_size_bytes ?? null,
      file_hash: item.file_hash ?? null,
      extraction_status: item.extracted_text ? 'completed' : 'not_requested',
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select('id')
    .single()

  if (error || !doc) {
    return { success: false, error: 'Failed to create document record' }
  }

  return {
    success: true,
    destination: 'document',
    recordType: 'chef_document',
    entityId: doc.id,
  }
}

async function routeToRecipe(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any
): Promise<RouteResult> {
  const extractedData = item.extracted_data as any
  // Create a minimal recipe record; chef will review and complete it
  const { data: recipe, error } = await db
    .from('recipes')
    .insert({
      tenant_id: user.tenantId!,
      name: extractedData?.name ?? item.source_filename ?? 'Imported Recipe',
      method: extractedData?.method ?? item.extracted_text ?? '',
      category: extractedData?.category ?? 'other',
      source: 'document_upload',
    })
    .select('id')
    .single()

  if (error || !recipe) {
    return { success: false, error: 'Failed to create recipe record' }
  }

  return { success: true, destination: 'recipe', recordType: 'recipe', entityId: recipe.id }
}

async function routeToClient(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any
): Promise<RouteResult> {
  const extractedData = item.extracted_data as any
  const extractedName = typeof extractedData?.name === 'string' ? extractedData.name.trim() : ''

  if (!extractedName) {
    return { success: false, error: 'No client name found in extracted data' }
  }

  // Check for duplicate before inserting
  const { data: existing } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .ilike('full_name', extractedName)
    .limit(1)
    .single()

  if (existing) {
    return {
      success: true,
      destination: 'client',
      recordType: 'client',
      entityId: existing.id,
    }
  }

  const { data: client, error } = await db
    .from('clients')
    .insert({
      tenant_id: user.tenantId!,
      full_name: extractedName,
      email:
        extractedData.email ??
        `${extractedName.toLowerCase().replace(/\s+/g, '.')}@placeholder.import`,
      phone: extractedData.phone ?? null,
      notes: extractedData.notes ?? `Imported from document: ${item.source_filename}`,
    })
    .select('id')
    .single()

  if (error || !client) {
    return { success: false, error: 'Failed to create client record' }
  }

  return { success: true, destination: 'client', recordType: 'client', entityId: client.id }
}
