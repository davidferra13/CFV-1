import 'server-only'

import { createHash } from 'crypto'
import { extractTextFromFile } from '@/lib/menus/extract-text'
import { parseDocumentWithVision } from '@/lib/ai/parse-document-vision'
import { parseDocumentIntelligenceText } from '@/lib/ai/parse-document-intelligence-text'
import type { VisionDetectionResult } from '@/lib/ai/parse-document-vision'
import type {
  DocumentIntelligenceArchiveState,
  DocumentIntelligenceDestination,
  DocumentIntelligenceDetectedType,
  DocumentIntelligenceItem,
  DocumentIntelligenceItemStatus,
  DocumentIntelligenceJob,
} from '@/lib/document-intelligence/types'

export const DOCUMENT_INTELLIGENCE_BUCKET = 'document-intelligence'

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60
const MAX_FILE_SIZE = 50 * 1024 * 1024

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'docx',
  'txt',
  'rtf',
])

const TEXT_FIRST_EXTENSIONS = new Set(['docx', 'txt', 'rtf'])

const MIME_FALLBACKS: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  rtf: 'text/rtf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

type SupabaseClient = any

type RawDocumentIntelligenceJobRow = {
  id: string
  source: string
  title: string | null
  status: 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

type RawDocumentIntelligenceItemRow = {
  id: string
  job_id: string
  tenant_id: string
  source_filename: string
  file_storage_bucket: string
  file_storage_path: string | null
  file_mime_type: string | null
  file_size_bytes: number
  file_hash: string | null
  status: DocumentIntelligenceItemStatus
  detected_type: DocumentIntelligenceDetectedType | null
  suggested_destination: DocumentIntelligenceDestination | null
  selected_destination: DocumentIntelligenceDestination | null
  confidence: 'high' | 'medium' | 'low' | null
  warnings: unknown
  extracted_text: string | null
  extracted_data: Record<string, unknown> | null
  error_message: string | null
  routed_record_type: string | null
  routed_record_id: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

type CreateFilesResult = {
  items: DocumentIntelligenceItem[]
  rejected: string[]
  job: DocumentIntelligenceJob
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function mapJobRow(row: RawDocumentIntelligenceJobRow): DocumentIntelligenceJob {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDetectedTypeToDestination(
  detectedType: DocumentIntelligenceDetectedType
): DocumentIntelligenceDestination {
  switch (detectedType) {
    case 'menu':
      return 'menu'
    case 'receipt':
      return 'receipt'
    case 'client_info':
      return 'client'
    case 'recipe':
      return 'recipe'
    default:
      return 'document'
  }
}

function mapItemRow(
  row: RawDocumentIntelligenceItemRow,
  previewUrl: string | null
): DocumentIntelligenceItem {
  return {
    id: row.id,
    jobId: row.job_id,
    sourceFilename: row.source_filename,
    fileMimeType: row.file_mime_type,
    fileSizeBytes: row.file_size_bytes ?? 0,
    fileHash: row.file_hash,
    status: row.status,
    detectedType: row.detected_type,
    suggestedDestination: row.suggested_destination,
    selectedDestination: row.selected_destination,
    confidence: row.confidence,
    warnings: normalizeWarnings(row.warnings),
    extractedText: row.extracted_text,
    extractedData: row.extracted_data ?? {},
    errorMessage: row.error_message,
    routedRecordType: row.routed_record_type,
    routedRecordId: row.routed_record_id,
    previewUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
  }
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() || ''
}

function inferMimeType(fileName: string, mimeType: string | null | undefined): string {
  if (mimeType) return mimeType
  const ext = getFileExtension(fileName)
  return MIME_FALLBACKS[ext] || 'application/octet-stream'
}

function sanitizeFilename(fileName: string): string {
  return (
    fileName
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.\./g, '')
      .replace(/[^\w.\- ]+/g, '_')
      .slice(0, 180)
      .trim() || 'upload'
  )
}

function deriveExtractedText(
  detection: VisionDetectionResult,
  fallbackText?: string | null
): string | null {
  if (typeof fallbackText === 'string' && fallbackText.trim().length > 0) {
    return fallbackText.trim()
  }

  const data = detection.extractedData

  if (typeof data.content_text === 'string' && data.content_text.trim()) {
    return data.content_text.trim()
  }

  if (typeof data.menu_text === 'string' && data.menu_text.trim()) {
    return data.menu_text.trim()
  }

  if (detection.detectedType === 'receipt') {
    const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []
    const itemLines = lineItems
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const description = (entry as { description?: unknown }).description
        return typeof description === 'string' ? description : null
      })
      .filter((entry): entry is string => entry != null)

    return [
      typeof data.storeName === 'string' ? data.storeName : null,
      ...itemLines,
      typeof data.totalCents === 'number' ? `total_cents:${data.totalCents}` : null,
    ]
      .filter((entry): entry is string => !!entry)
      .join('\n')
  }

  if (detection.detectedType === 'client_info') {
    return [
      typeof data.full_name === 'string' ? data.full_name : null,
      typeof data.email === 'string' ? data.email : null,
      typeof data.phone === 'string' ? data.phone : null,
      typeof data.address === 'string' ? data.address : null,
    ]
      .filter((entry): entry is string => !!entry)
      .join('\n')
  }

  if (detection.detectedType === 'recipe') {
    return [
      typeof data.name === 'string' ? data.name : null,
      typeof data.description === 'string' ? data.description : null,
      typeof data.method === 'string' ? data.method : null,
    ]
      .filter((entry): entry is string => !!entry)
      .join('\n')
  }

  return null
}

async function signPreviewUrl(
  supabase: SupabaseClient,
  row: RawDocumentIntelligenceItemRow
): Promise<string | null> {
  if (!row.file_storage_path || !row.file_mime_type?.startsWith('image/')) {
    return null
  }

  const { data } = await supabase.storage
    .from(row.file_storage_bucket || DOCUMENT_INTELLIGENCE_BUCKET)
    .createSignedUrl(row.file_storage_path, SIGNED_URL_EXPIRY_SECONDS)

  return data?.signedUrl ?? null
}

async function mapItemRowsToViews(
  supabase: SupabaseClient,
  rows: RawDocumentIntelligenceItemRow[]
): Promise<DocumentIntelligenceItem[]> {
  const previewUrls = await Promise.all(rows.map((row) => signPreviewUrl(supabase, row)))
  return rows.map((row, index) => mapItemRow(row, previewUrls[index] ?? null))
}

async function getDocumentIntelligenceJobRow(
  supabase: SupabaseClient,
  tenantId: string,
  jobId: string
): Promise<RawDocumentIntelligenceJobRow | null> {
  const { data, error } = await supabase
    .from('document_intelligence_jobs')
    .select('id, source, title, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('id', jobId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load document intelligence job: ${error.message}`)
  }

  return data as RawDocumentIntelligenceJobRow | null
}

export async function ensureActiveArchiveInboxJob(params: {
  supabase: SupabaseClient
  tenantId: string
  userId: string
}): Promise<DocumentIntelligenceJob> {
  const { supabase, tenantId, userId } = params

  const { data: existing, error } = await supabase
    .from('document_intelligence_jobs')
    .select('id, source, title, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('source', 'archive_inbox')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load archive inbox job: ${error.message}`)
  }

  if (existing) {
    return mapJobRow(existing as RawDocumentIntelligenceJobRow)
  }

  const { data: created, error: createError } = await supabase
    .from('document_intelligence_jobs')
    .insert({
      tenant_id: tenantId,
      source: 'archive_inbox',
      title: 'Archive Inbox',
      status: 'active',
      created_by: userId,
    })
    .select('id, source, title, status, created_at, updated_at')
    .single()

  if (createError || !created) {
    throw new Error(`Failed to create archive inbox job: ${createError?.message || 'Unknown error'}`)
  }

  return mapJobRow(created as RawDocumentIntelligenceJobRow)
}

export async function listDocumentIntelligenceItemsForJob(params: {
  supabase: SupabaseClient
  tenantId: string
  jobId: string
}): Promise<DocumentIntelligenceItem[]> {
  const { supabase, tenantId, jobId } = params

  const { data, error } = await supabase
    .from('document_intelligence_items')
    .select(
      'id, job_id, tenant_id, source_filename, file_storage_bucket, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, detected_type, suggested_destination, selected_destination, confidence, warnings, extracted_text, extracted_data, error_message, routed_record_type, routed_record_id, processed_at, created_at, updated_at'
    )
    .eq('tenant_id', tenantId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load document intelligence items: ${error.message}`)
  }

  return mapItemRowsToViews(supabase, (data ?? []) as RawDocumentIntelligenceItemRow[])
}

export async function getArchiveInboxStateForTenant(params: {
  supabase: SupabaseClient
  tenantId: string
  userId: string
}): Promise<DocumentIntelligenceArchiveState> {
  const job = await ensureActiveArchiveInboxJob(params)
  const items = await listDocumentIntelligenceItemsForJob({
    supabase: params.supabase,
    tenantId: params.tenantId,
    jobId: job.id,
  })

  return { job, items }
}

export async function createDocumentIntelligenceItemsFromFiles(params: {
  supabase: SupabaseClient
  tenantId: string
  userId: string
  jobId?: string | null
  files: File[]
}): Promise<CreateFilesResult> {
  const { supabase, tenantId, userId } = params
  const existingJobRow = params.jobId
    ? await getDocumentIntelligenceJobRow(supabase, tenantId, params.jobId)
    : null
  const job = existingJobRow
    ? existingJobRow.status === 'active'
      ? mapJobRow(existingJobRow)
      : await ensureActiveArchiveInboxJob({ supabase, tenantId, userId })
    : await ensureActiveArchiveInboxJob({ supabase, tenantId, userId })

  const rejected: string[] = []
  const insertedRows: RawDocumentIntelligenceItemRow[] = []

  for (const file of params.files) {
    const normalizedFileName = sanitizeFilename(file.name)
    const extension = getFileExtension(normalizedFileName)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      rejected.push(`Unsupported file type: ${normalizedFileName}`)
      continue
    }

    if (file.size === 0) {
      rejected.push(`File is empty: ${normalizedFileName}`)
      continue
    }

    if (file.size > MAX_FILE_SIZE) {
      rejected.push(`File is too large: ${normalizedFileName}`)
      continue
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex')

    const { data: duplicateInJob } = await supabase
      .from('document_intelligence_items')
      .select(
        'id, job_id, tenant_id, source_filename, file_storage_bucket, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, detected_type, suggested_destination, selected_destination, confidence, warnings, extracted_text, extracted_data, error_message, routed_record_type, routed_record_id, processed_at, created_at, updated_at'
      )
      .eq('tenant_id', tenantId)
      .eq('job_id', job.id)
      .eq('file_hash', fileHash)
      .limit(1)
      .maybeSingle()

    if (duplicateInJob) {
      insertedRows.push(duplicateInJob as RawDocumentIntelligenceItemRow)
      continue
    }

    const contentType = inferMimeType(normalizedFileName, file.type || null)

    const { data: inserted, error: insertError } = await supabase
      .from('document_intelligence_items')
      .insert({
        job_id: job.id,
        tenant_id: tenantId,
        source_filename: normalizedFileName,
        file_storage_bucket: DOCUMENT_INTELLIGENCE_BUCKET,
        file_mime_type: contentType,
        file_size_bytes: file.size,
        file_hash: fileHash,
        status: 'uploaded',
      })
      .select(
        'id, job_id, tenant_id, source_filename, file_storage_bucket, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, detected_type, suggested_destination, selected_destination, confidence, warnings, extracted_text, extracted_data, error_message, routed_record_type, routed_record_id, processed_at, created_at, updated_at'
      )
      .single()

    if (insertError || !inserted) {
      rejected.push(`Failed to register upload: ${normalizedFileName}`)
      continue
    }

    const storagePath = `${tenantId}/${job.id}/${inserted.id}/${normalizedFileName}`
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_INTELLIGENCE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      await supabase
        .from('document_intelligence_items')
        .update({
          status: 'failed',
          error_message: uploadError.message,
        })
        .eq('id', inserted.id)
        .eq('tenant_id', tenantId)

      rejected.push(`Upload failed: ${normalizedFileName}`)
      continue
    }

    const { data: updated, error: updateError } = await supabase
      .from('document_intelligence_items')
      .update({ file_storage_path: storagePath })
      .eq('id', inserted.id)
      .eq('tenant_id', tenantId)
      .select(
        'id, job_id, tenant_id, source_filename, file_storage_bucket, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, detected_type, suggested_destination, selected_destination, confidence, warnings, extracted_text, extracted_data, error_message, routed_record_type, routed_record_id, processed_at, created_at, updated_at'
      )
      .single()

    if (updateError || !updated) {
      rejected.push(`Failed to finalize upload: ${normalizedFileName}`)
      continue
    }

    insertedRows.push(updated as RawDocumentIntelligenceItemRow)
  }

  await supabase
    .from('document_intelligence_jobs')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('tenant_id', tenantId)

  return {
    job,
    items: await mapItemRowsToViews(supabase, insertedRows),
    rejected,
  }
}

export async function getDocumentIntelligenceItemRow(params: {
  supabase: SupabaseClient
  tenantId: string
  itemId: string
}): Promise<RawDocumentIntelligenceItemRow> {
  const { data, error } = await params.supabase
    .from('document_intelligence_items')
    .select(
      'id, job_id, tenant_id, source_filename, file_storage_bucket, file_storage_path, file_mime_type, file_size_bytes, file_hash, status, detected_type, suggested_destination, selected_destination, confidence, warnings, extracted_text, extracted_data, error_message, routed_record_type, routed_record_id, processed_at, created_at, updated_at'
    )
    .eq('tenant_id', params.tenantId)
    .eq('id', params.itemId)
    .single()

  if (error || !data) {
    throw new Error(`Document intelligence item not found: ${error?.message || 'Unknown error'}`)
  }

  return data as RawDocumentIntelligenceItemRow
}

export async function getDocumentIntelligenceItemView(params: {
  supabase: SupabaseClient
  tenantId: string
  itemId: string
}): Promise<DocumentIntelligenceItem> {
  const row = await getDocumentIntelligenceItemRow(params)
  return (await mapItemRowsToViews(params.supabase, [row]))[0]
}

export async function downloadDocumentIntelligenceItemBuffer(params: {
  supabase: SupabaseClient
  item: RawDocumentIntelligenceItemRow
}): Promise<Buffer> {
  if (!params.item.file_storage_path) {
    throw new Error('Document intelligence item is missing its storage path.')
  }

  const { data, error } = await params.supabase.storage
    .from(params.item.file_storage_bucket || DOCUMENT_INTELLIGENCE_BUCKET)
    .download(params.item.file_storage_path)

  if (error || !data) {
    throw new Error(`Failed to download stored file: ${error?.message || 'Unknown error'}`)
  }

  return Buffer.from(await data.arrayBuffer())
}

export async function analyzeDocumentIntelligenceItemForTenant(params: {
  supabase: SupabaseClient
  tenantId: string
  itemId: string
}): Promise<DocumentIntelligenceItem> {
  const { supabase, tenantId, itemId } = params
  const row = await getDocumentIntelligenceItemRow({ supabase, tenantId, itemId })

  await supabase
    .from('document_intelligence_items')
    .update({
      status: 'classifying',
      error_message: null,
    })
    .eq('id', row.id)
    .eq('tenant_id', tenantId)

  try {
    const fileBuffer = await downloadDocumentIntelligenceItemBuffer({ supabase, item: row })
    const extension = getFileExtension(row.source_filename)

    let detection: VisionDetectionResult
    let extractedText: string | null = null

    if (TEXT_FIRST_EXTENSIONS.has(extension)) {
      const extracted = await extractTextFromFile(fileBuffer, row.source_filename)
      extractedText = extracted.text
      detection = await parseDocumentIntelligenceText(extracted.text, row.source_filename)
    } else {
      const base64Data = fileBuffer.toString('base64')
      detection = await parseDocumentWithVision(
        base64Data,
        inferMimeType(row.source_filename, row.file_mime_type),
        row.source_filename
      )
    }

    const destination = mapDetectedTypeToDestination(detection.detectedType)
    extractedText = deriveExtractedText(detection, extractedText)

    await supabase
      .from('document_intelligence_items')
      .update({
        status: 'review',
        detected_type: detection.detectedType,
        suggested_destination: destination,
        selected_destination: destination,
        confidence: detection.confidence,
        warnings: detection.warnings,
        extracted_text: extractedText,
        extracted_data: detection.extractedData,
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('tenant_id', tenantId)
  } catch (error) {
    await supabase
      .from('document_intelligence_items')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Analysis failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('tenant_id', tenantId)
  }

  return getDocumentIntelligenceItemView({ supabase, tenantId, itemId })
}

export async function archiveDocumentIntelligenceJobForTenant(params: {
  supabase: SupabaseClient
  tenantId: string
  userId: string
  jobId: string
}): Promise<DocumentIntelligenceArchiveState> {
  await params.supabase
    .from('document_intelligence_jobs')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.jobId)
    .eq('tenant_id', params.tenantId)

  return getArchiveInboxStateForTenant({
    supabase: params.supabase,
    tenantId: params.tenantId,
    userId: params.userId,
  })
}

export async function deleteDocumentIntelligenceItemForTenant(params: {
  supabase: SupabaseClient
  tenantId: string
  itemId: string
}): Promise<void> {
  const row = await getDocumentIntelligenceItemRow({
    supabase: params.supabase,
    tenantId: params.tenantId,
    itemId: params.itemId,
  })

  if (row.file_storage_path) {
    await params.supabase.storage
      .from(row.file_storage_bucket || DOCUMENT_INTELLIGENCE_BUCKET)
      .remove([row.file_storage_path])
  }

  await params.supabase
    .from('document_intelligence_items')
    .delete()
    .eq('id', row.id)
    .eq('tenant_id', params.tenantId)
}
