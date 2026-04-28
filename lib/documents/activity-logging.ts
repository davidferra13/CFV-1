'use server'

// Document Activity Logging
// Non-blocking audit trail for all document management operations.
// Logs to chef_activity_log for full traceability.

import { createServerClient } from '@/lib/db/server'
import type { TablesInsert } from '@/types/database'

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
  | 'folder_created'
  | 'folder_auto_created'
  | 'folder_deleted'
  | 'document_routed'
  | 'document_search'

type DocumentActivityInput = {
  tenantId: string
  userId: string
  action: DocumentActivityAction
  entityType: 'receipt' | 'document' | 'expense' | 'folder'
  entityId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log a document management activity. Non-blocking: failures are logged but never thrown.
 * Wraps the activity insert in a try/catch so it never disrupts the main operation.
 */
export async function logDocumentActivity(input: DocumentActivityInput): Promise<void> {
  try {
    const db = createServerClient({ admin: true })

    if (!(await shouldLogDocumentActivity(db, input.tenantId))) return

    const { error } = await db.from('chef_activity_log').insert(toActivityRow(input))

    if (error) {
      console.error('[doc-activity] Non-blocking logging insert error:', error)
    }
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
    const db = createServerClient({ admin: true })
    const rows: TablesInsert<'chef_activity_log'>[] = []
    const logPreferenceByTenant = new Map<string, boolean>()

    for (const input of inputs) {
      let shouldLog = logPreferenceByTenant.get(input.tenantId)
      if (shouldLog === undefined) {
        shouldLog = await shouldLogDocumentActivity(db, input.tenantId)
        logPreferenceByTenant.set(input.tenantId, shouldLog)
      }
      if (shouldLog) rows.push(toActivityRow(input))
    }

    if (rows.length === 0) return

    const { error } = await db.from('chef_activity_log').insert(rows)

    if (error) {
      console.error('[doc-activity] Non-blocking batch logging insert error:', error)
    }
  } catch (err) {
    console.error('[doc-activity] Non-blocking batch logging error:', err)
  }
}

async function shouldLogDocumentActivity(db: any, tenantId: string): Promise<boolean> {
  try {
    const { data: prefs } = await db
      .from('chef_preferences')
      .select('activity_log_enabled')
      .eq('tenant_id', tenantId)
      .single()

    return !prefs || (prefs as Record<string, unknown>).activity_log_enabled !== false
  } catch {
    return true
  }
}

function toActivityRow(input: DocumentActivityInput): TablesInsert<'chef_activity_log'> {
  return {
    tenant_id: input.tenantId,
    actor_id: input.userId,
    action: input.action,
    domain: 'document',
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    summary: summarizeDocumentActivity(input),
    context: (input.metadata ?? {}) as TablesInsert<'chef_activity_log'>['context'],
    client_id:
      typeof input.metadata?.clientId === 'string'
        ? input.metadata.clientId
        : typeof input.metadata?.client_id === 'string'
          ? input.metadata.client_id
          : null,
  }
}

function summarizeDocumentActivity(input: DocumentActivityInput): string {
  const title =
    typeof input.metadata?.title === 'string'
      ? input.metadata.title
      : typeof input.metadata?.folderName === 'string'
        ? input.metadata.folderName
        : null

  const suffix = title ? `: ${title}` : ''

  switch (input.action) {
    case 'receipt_uploaded':
      return `Receipt uploaded${suffix}`
    case 'receipt_batch_uploaded':
      return `Receipt batch uploaded${suffix}`
    case 'receipt_ocr_completed':
      return `Receipt OCR completed${suffix}`
    case 'receipt_ocr_needs_review':
      return `Receipt OCR needs review${suffix}`
    case 'receipt_approved':
      return `Receipt approved${suffix}`
    case 'receipt_expense_created':
      return `Receipt expense created${suffix}`
    case 'document_created':
      return `Document created${suffix}`
    case 'document_linked':
      return `Document linked${suffix}`
    case 'document_unlinked':
      return `Document unlinked${suffix}`
    case 'document_moved_to_folder':
      return `Document moved to folder${suffix}`
    case 'folder_created':
      return `Folder created${suffix}`
    case 'folder_auto_created':
      return `Folder auto-created${suffix}`
    case 'folder_deleted':
      return `Folder deleted${suffix}`
    case 'document_routed':
      return `Document routed${suffix}`
    case 'document_search':
      return 'Documents searched'
    default:
      return `Document activity recorded${suffix}`
  }
}
