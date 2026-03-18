'use server'

// Unified Document Linking Actions
// Attach/detach any chef_document to/from events, clients, and inquiries.
// Supports batch linking and retrieval of all documents for a given entity.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Link/Unlink ──────────────────────────────────────────────────────────────

export type LinkDocumentInput = {
  documentId: string
  eventId?: string | null
  clientId?: string | null
  inquiryId?: string | null
}

/**
 * Link a document to an event, client, and/or inquiry.
 * Additive: sets the provided fields without clearing others unless explicitly null.
 */
export async function linkDocument(
  input: LinkDocumentInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (input.eventId !== undefined) updates.event_id = input.eventId
  if (input.clientId !== undefined) updates.client_id = input.clientId
  if (input.inquiryId !== undefined) updates.inquiry_id = input.inquiryId

  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'No link target provided' }
  }

  // Verify document belongs to this chef
  const { error } = await supabase
    .from('chef_documents')
    .update(updates)
    .eq('id', input.documentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[linkDocument] Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/documents')
  return { success: true }
}

/**
 * Remove all entity links from a document (set event_id, client_id, inquiry_id to null).
 */
export async function unlinkDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_documents')
    .update({ event_id: null, client_id: null, inquiry_id: null } as any)
    .eq('id', documentId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[unlinkDocument] Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/documents')
  return { success: true }
}

// ─── Entity Document Retrieval ────────────────────────────────────────────────

export type LinkedDocument = {
  id: string
  title: string
  documentType: string
  summary: string | null
  createdAt: string
  folderName: string | null
}

/**
 * Get all documents linked to a specific event.
 */
export async function getDocumentsForEvent(eventId: string): Promise<LinkedDocument[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_documents')
    .select('id, title, document_type, summary, created_at, chef_folders(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(50)

  return mapDocuments(data)
}

/**
 * Get all documents linked to a specific client.
 */
export async function getDocumentsForClient(clientId: string): Promise<LinkedDocument[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_documents')
    .select('id, title, document_type, summary, created_at, chef_folders(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)

  return mapDocuments(data)
}

/**
 * Get all documents linked to a specific inquiry.
 */
export async function getDocumentsForInquiry(inquiryId: string): Promise<LinkedDocument[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('chef_documents')
    .select('id, title, document_type, summary, created_at, chef_folders(name)')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })
    .limit(50)

  return mapDocuments(data)
}

function mapDocuments(data: any[] | null): LinkedDocument[] {
  return (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    documentType: d.document_type,
    summary: d.summary,
    createdAt: d.created_at,
    folderName: (d.chef_folders as any)?.name ?? null,
  }))
}
