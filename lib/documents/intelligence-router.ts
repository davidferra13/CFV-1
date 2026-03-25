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

  // Fetch the item
  const { data: item, error: fetchError } = await (db
    .from('document_intelligence_items' as any)
    .select('*')
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)
    .single() as any)

  if (fetchError || !item) {
    return { success: false, error: 'Intelligence item not found' }
  }

  if (item.status === 'completed') {
    return {
      success: true,
      destination: item.suggested_destination,
      entityId: item.routed_entity_id,
    }
  }

  const detectedType = item.detected_type as string | null
  if (!detectedType) {
    return { success: false, error: 'Item has not been classified yet' }
  }

  // Mark as routing
  await (db
    .from('document_intelligence_items' as any)
    .update({ status: 'routing' })
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
          routed_entity_id: result.entityId,
        })
        .eq('id', itemId) as any)
    } else {
      await (db
        .from('document_intelligence_items' as any)
        .update({ status: 'failed', error_message: result.error })
        .eq('id', itemId) as any)
    }

    revalidatePath('/documents')
    revalidatePath('/receipts')
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Routing failed'
    await (db
      .from('document_intelligence_items' as any)
      .update({ status: 'failed', error_message: msg })
      .eq('id', itemId) as any)
    return { success: false, error: msg }
  }
}

// ─── Route handlers ────────────────────────────────────────────────────────────

async function routeToReceipt(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any
): Promise<RouteResult> {
  // Create receipt_photo record from the intelligence item's stored file
  const { data: photo, error } = await db
    .from('receipt_photos')
    .insert({
      tenant_id: user.tenantId!,
      photo_url: item.file_storage ?? '',
      storage_path: item.file_storage,
      upload_status: 'pending',
      notes: `Auto-routed from document upload: ${item.source_filename}`,
    })
    .select('id')
    .single()

  if (error || !photo) {
    return { success: false, error: 'Failed to create receipt record' }
  }

  return { success: true, destination: 'receipt_photos', entityId: photo.id }
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
      document_type: docType,
      content_text: item.extracted_text ?? null,
      summary: extractedData?.summary ?? null,
      source_type: 'intelligence_router',
      source_filename: item.source_filename,
    } as any)
    .select('id')
    .single()

  if (error || !doc) {
    return { success: false, error: 'Failed to create document record' }
  }

  return { success: true, destination: 'chef_documents', entityId: doc.id }
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

  return { success: true, destination: 'recipes', entityId: recipe.id }
}

async function routeToClient(
  db: any,
  user: { id: string; tenantId: string | null },
  item: any
): Promise<RouteResult> {
  const extractedData = item.extracted_data as any
  if (!extractedData?.name) {
    return { success: false, error: 'No client name found in extracted data' }
  }

  // Check for duplicate before inserting
  const { data: existing } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', extractedData.name)
    .limit(1)
    .single()

  if (existing) {
    return { success: true, destination: 'clients', entityId: existing.id }
  }

  const { data: client, error } = await db
    .from('clients')
    .insert({
      tenant_id: user.tenantId!,
      name: extractedData.name,
      email:
        extractedData.email ??
        `${extractedData.name.toLowerCase().replace(/\s+/g, '.')}@placeholder.import`,
      phone: extractedData.phone ?? null,
      notes: extractedData.notes ?? `Imported from document: ${item.source_filename}`,
    })
    .select('id')
    .single()

  if (error || !client) {
    return { success: false, error: 'Failed to create client record' }
  }

  return { success: true, destination: 'clients', entityId: client.id }
}
