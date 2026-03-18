'use server'

// Document Activity Logging
// Non-blocking audit trail for all document management operations.
// Logs to the existing activity table for full traceability.

import { createServerClient } from '@/lib/supabase/server'

type DocumentActivityAction =
  | 'receipt_uploaded'
  | 'receipt_batch_uploaded'
  | 'receipt_ocr_completed'
  | 'receipt_ocr_needs_review'
  | 'receipt_approved'
  | 'receipt_expense_created'
  | 'document_created'
  | 'document_linked'
  | 'document_unlinked'
  | 'document_moved_to_folder'
  | 'folder_auto_created'
  | 'document_routed'
  | 'document_search'

type DocumentActivityInput = {
  tenantId: string
  userId: string
  action: DocumentActivityAction
  entityType: 'receipt' | 'document' | 'expense' | 'folder'
  entityId: string
  metadata?: Record<string, unknown>
}

/**
 * Log a document management activity. Non-blocking: failures are logged but never thrown.
 * Wraps the activity insert in a try/catch so it never disrupts the main operation.
 */
export async function logDocumentActivity(input: DocumentActivityInput): Promise<void> {
  try {
    const supabase: any = createServerClient()

    await supabase.from('activity' as any).insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata ?? {},
    } as any)
  } catch (err) {
    console.error('[doc-activity] Non-blocking logging error:', err)
  }
}

/**
 * Log multiple document activities in one call (batch insert).
 * Non-blocking: failures are logged but never thrown.
 */
export async function logDocumentActivities(inputs: DocumentActivityInput[]): Promise<void> {
  if (inputs.length === 0) return

  try {
    const supabase: any = createServerClient()

    const rows = inputs.map((input) => ({
      tenant_id: input.tenantId,
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata ?? {},
    }))

    await supabase.from('activity' as any).insert(rows as any)
  } catch (err) {
    console.error('[doc-activity] Non-blocking batch logging error:', err)
  }
}
