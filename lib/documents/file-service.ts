import 'server-only'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { canDeterministicallyEnhanceDocumentImage } from '@/lib/documents/image-enhancement'

export const CHEF_DOCUMENTS_BUCKET = 'chef-documents'

export const SUPPORTED_CHEF_DOCUMENT_TYPES = [
  'contract',
  'template',
  'policy',
  'checklist',
  'note',
  'general',
] as const

export type SupportedChefDocumentType = (typeof SUPPORTED_CHEF_DOCUMENT_TYPES)[number]

type RawBusinessDocumentRow = {
  id: string
  title: string
  document_type: string
  summary: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  source_type: string
  source_filename: string | null
  original_filename: string | null
  mime_type: string | null
  file_size_bytes: number | null
  storage_bucket: string | null
  storage_path: string | null
  file_hash: string | null
  entity_type: string | null
  entity_id: string | null
  extraction_status: string
  extraction_confidence: number | null
}

export type BusinessDocumentListItem = {
  id: string
  title: string
  documentType: string
  summary: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  sourceType: string
  sourceFilename: string | null
  originalFilename: string | null
  mimeType: string | null
  fileSizeBytes: number | null
  storageBucket: string | null
  storagePath: string | null
  fileHash: string | null
  entityType: string | null
  entityId: string | null
  extractionStatus: string
  extractionConfidence: number | null
  viewUrl: string | null
  enhancedViewUrl: string | null
  canEnhancePreview: boolean
}

export type BusinessDocumentVaultOverview = {
  documents: BusinessDocumentListItem[]
  totalUploaded: number
  filteredCount: number
  extractionCompletedCount: number
  typeCounts: Array<{ documentType: string; count: number }>
  activeQuery: string
  activeDocumentType: string
}

export function getBusinessDocumentViewUrl(documentId: string): string {
  return `/api/chef-documents/${documentId}/download`
}

export function getBusinessDocumentEnhancedViewUrl(documentId: string): string {
  return `/api/chef-documents/${documentId}/download?variant=enhanced`
}

export function canEnhanceBusinessDocumentPreview(mimeType: string | null | undefined): boolean {
  return canDeterministicallyEnhanceDocumentImage(mimeType)
}

function mapBusinessDocumentRow(row: RawBusinessDocumentRow): BusinessDocumentListItem {
  const canEnhancePreview = canEnhanceBusinessDocumentPreview(row.mime_type)
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    summary: row.summary,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceType: row.source_type,
    sourceFilename: row.source_filename,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileHash: row.file_hash,
    entityType: row.entity_type,
    entityId: row.entity_id,
    extractionStatus: row.extraction_status,
    extractionConfidence: row.extraction_confidence,
    viewUrl: row.storage_path ? getBusinessDocumentViewUrl(row.id) : null,
    enhancedViewUrl:
      row.storage_path && canEnhancePreview ? getBusinessDocumentEnhancedViewUrl(row.id) : null,
    canEnhancePreview,
  }
}

export async function listBusinessDocuments(options?: {
  query?: string
  documentType?: string | null
  limit?: number
  entityType?: string | null
  entityId?: string | null
  uploadedOnly?: boolean
}): Promise<BusinessDocumentListItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('chef_documents')
    .select(
      'id, title, document_type, summary, tags, created_at, updated_at, source_type, source_filename, original_filename, mime_type, file_size_bytes, storage_bucket, storage_path, file_hash, entity_type, entity_id, extraction_status, extraction_confidence'
    )
    .eq('tenant_id', user.tenantId!)
    .order('updated_at', { ascending: false })
    .limit(options?.limit ?? 20)

  if (options?.uploadedOnly) {
    query = query.not('storage_path', 'is', null)
  }

  if (options?.documentType) {
    query = query.eq('document_type', options.documentType)
  }

  if (options?.query) {
    query = query.ilike('title', `%${options.query}%`)
  }

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType)
  }

  if (options?.entityId) {
    query = query.eq('entity_id', options.entityId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load business documents: ${error.message}`)
  }

  return ((data ?? []) as RawBusinessDocumentRow[]).map(mapBusinessDocumentRow)
}

export async function getBusinessDocumentVaultOverview(
  options?: {
    limit?: number
    query?: string
    documentType?: string | null
  }
): Promise<BusinessDocumentVaultOverview> {
  const limit = options?.limit ?? 12
  const activeQuery = options?.query?.trim() ?? ''
  const activeDocumentType = options?.documentType?.trim() ?? 'all'

  const [documents, summaryRows, filteredCount] = await Promise.all([
    listBusinessDocuments({
      uploadedOnly: true,
      limit,
      query: activeQuery || undefined,
      documentType: activeDocumentType !== 'all' ? activeDocumentType : null,
    }),
    (async () => {
      const user = await requireChef()
      const supabase: any = createServerClient()
      const { data, error } = await supabase
        .from('chef_documents')
        .select('document_type, extraction_status')
        .eq('tenant_id', user.tenantId!)
        .not('storage_path', 'is', null)

      if (error) {
        throw new Error(`Failed to summarize business documents: ${error.message}`)
      }

      return (data ?? []) as Array<{ document_type: string; extraction_status: string }>
    })(),
    (async () => {
      const user = await requireChef()
      const supabase: any = createServerClient()

      let query = supabase
        .from('chef_documents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .not('storage_path', 'is', null)

      if (activeQuery) {
        query = query.ilike('title', `%${activeQuery}%`)
      }

      if (activeDocumentType !== 'all') {
        query = query.eq('document_type', activeDocumentType)
      }

      const { count, error } = await query
      if (error) {
        throw new Error(`Failed to count business documents: ${error.message}`)
      }

      return count ?? 0
    })(),
  ])

  const typeCounts = new Map<string, number>()
  let extractionCompletedCount = 0

  for (const row of summaryRows) {
    typeCounts.set(row.document_type, (typeCounts.get(row.document_type) ?? 0) + 1)
    if (row.extraction_status === 'completed') extractionCompletedCount += 1
  }

  return {
    documents,
    totalUploaded: summaryRows.length,
    filteredCount,
    extractionCompletedCount,
    typeCounts: Array.from(typeCounts.entries())
      .map(([documentType, count]) => ({ documentType, count }))
      .sort((a, b) => b.count - a.count),
    activeQuery,
    activeDocumentType,
  }
}

export async function getBusinessDocumentRecordForDownload(documentId: string): Promise<{
  id: string
  title: string
  originalFilename: string | null
  mimeType: string | null
  storageBucket: string | null
  storagePath: string | null
} | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_documents')
    .select('id, title, original_filename, mime_type, storage_bucket, storage_path')
    .eq('id', documentId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    title: data.title,
    originalFilename: data.original_filename,
    mimeType: data.mime_type,
    storageBucket: data.storage_bucket,
    storagePath: data.storage_path,
  }
}
