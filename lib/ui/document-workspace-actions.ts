'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ProofPackDocument,
  ProofPack,
  DocumentApproval,
  DocumentWorkspaceSummary,
  DocumentType,
  DocumentStatus,
  ProofPackStatus,
  ApprovalStatus,
} from './document-workspace-types'

// ---- helpers ----

function fromDocuments(db: any): any {
  return (db as any).from('proof_pack_documents')
}

function fromPacks(db: any): any {
  return (db as any).from('proof_packs')
}

function fromApprovals(db: any): any {
  return (db as any).from('document_approvals')
}

// ---- actions ----

export async function getProofPackDocuments(eventId?: string): Promise<ProofPackDocument[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromDocuments(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load documents: ${error.message}`)
  return (data ?? []).map(mapDocument)
}

export async function createDocument(params: {
  eventId?: string
  documentType: DocumentType
  title: string
  filePath?: string
  status?: DocumentStatus
}): Promise<ProofPackDocument> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    document_type: params.documentType,
    title: params.title,
    version: 1,
    status: params.status ?? 'draft',
    uploaded_by: user.id,
  }
  if (params.eventId) payload.event_id = params.eventId
  if (params.filePath) payload.file_path = params.filePath

  const { data, error } = await fromDocuments(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create document: ${error.message}`)
  return mapDocument(data)
}

export async function updateDocument(
  documentId: string,
  params: {
    title?: string
    filePath?: string
    status?: DocumentStatus
    version?: number
  }
): Promise<ProofPackDocument> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (params.title !== undefined) payload.title = params.title
  if (params.filePath !== undefined) payload.file_path = params.filePath
  if (params.status !== undefined) payload.status = params.status
  if (params.version !== undefined) payload.version = params.version

  const { data, error } = await fromDocuments(db)
    .update(payload)
    .eq('id', documentId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update document: ${error.message}`)
  return mapDocument(data)
}

export async function getProofPacks(eventId?: string): Promise<ProofPack[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromPacks(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load proof packs: ${error.message}`)
  return (data ?? []).map(mapPack)
}

export async function createProofPack(params: {
  eventId?: string
  title: string
  documentIds?: string[]
  status?: ProofPackStatus
}): Promise<ProofPack> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    title: params.title,
    document_ids: JSON.stringify(params.documentIds ?? []),
    status: params.status ?? 'assembling',
  }
  if (params.eventId) payload.event_id = params.eventId

  const { data, error } = await fromPacks(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create proof pack: ${error.message}`)
  return mapPack(data)
}

export async function updateProofPack(
  packId: string,
  params: {
    title?: string
    documentIds?: string[]
    status?: ProofPackStatus
    sentTo?: string
    sentAt?: string
  }
): Promise<ProofPack> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {}
  if (params.title !== undefined) payload.title = params.title
  if (params.documentIds !== undefined) payload.document_ids = JSON.stringify(params.documentIds)
  if (params.status !== undefined) payload.status = params.status
  if (params.sentTo !== undefined) payload.sent_to = params.sentTo
  if (params.sentAt !== undefined) payload.sent_at = params.sentAt

  const { data, error } = await fromPacks(db)
    .update(payload)
    .eq('id', packId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update proof pack: ${error.message}`)
  return mapPack(data)
}

export async function getDocumentApprovals(documentId?: string): Promise<DocumentApproval[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromApprovals(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (documentId) {
    query = query.eq('document_id', documentId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load approvals: ${error.message}`)
  return (data ?? []).map(mapApproval)
}

export async function submitApproval(
  documentId: string,
  status: ApprovalStatus,
  comments?: string
): Promise<DocumentApproval> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    document_id: documentId,
    approver_id: user.id,
    status,
    decided_at: status !== 'pending' ? new Date().toISOString() : null,
  }
  if (comments !== undefined) payload.comments = comments

  const { data, error } = await fromApprovals(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to submit approval: ${error.message}`)
  return mapApproval(data)
}

export async function getDocumentWorkspaceSummary(): Promise<DocumentWorkspaceSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: docs, error: docErr } = await fromDocuments(db)
    .select('document_type')
    .eq('tenant_id', user.tenantId)

  if (docErr) throw new Error(`Failed to load document summary: ${docErr.message}`)

  const documentsByType: Record<string, number> = {}
  for (const d of docs ?? []) {
    documentsByType[d.document_type] = (documentsByType[d.document_type] || 0) + 1
  }

  const { data: packs, error: packErr } = await fromPacks(db)
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (packErr) throw new Error(`Failed to load pack summary: ${packErr.message}`)

  const { data: approvals, error: appErr } = await fromApprovals(db)
    .select('status')
    .eq('tenant_id', user.tenantId)
    .eq('status', 'pending')

  if (appErr) throw new Error(`Failed to load approval summary: ${appErr.message}`)

  return {
    totalDocuments: (docs ?? []).length,
    totalProofPacks: (packs ?? []).length,
    pendingApprovals: (approvals ?? []).length,
    documentsByType,
  }
}

// ---- mappers ----

function mapDocument(row: any): ProofPackDocument {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id ?? null,
    documentType: row.document_type,
    title: row.title,
    filePath: row.file_path ?? null,
    version: row.version ?? 1,
    status: row.status ?? 'draft',
    uploadedBy: row.uploaded_by ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at ?? row.created_at),
  }
}

function mapPack(row: any): ProofPack {
  let documentIds: string[] = []
  try {
    documentIds =
      typeof row.document_ids === 'string' ? JSON.parse(row.document_ids) : (row.document_ids ?? [])
  } catch {
    documentIds = []
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id ?? null,
    title: row.title,
    documentIds,
    status: row.status ?? 'assembling',
    sentTo: row.sent_to ?? null,
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    createdAt: new Date(row.created_at),
  }
}

function mapApproval(row: any): DocumentApproval {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    documentId: row.document_id,
    approverId: row.approver_id ?? null,
    status: row.status ?? 'pending',
    comments: row.comments ?? null,
    decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    createdAt: new Date(row.created_at),
  }
}
