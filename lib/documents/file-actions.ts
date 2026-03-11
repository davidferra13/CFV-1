'use server'

import { createHash, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { extractTextFromFile } from '@/lib/menus/extract-text'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  CHEF_DOCUMENTS_BUCKET,
  SUPPORTED_CHEF_DOCUMENT_TYPES,
  canEnhanceBusinessDocumentPreview,
  getBusinessDocumentEnhancedViewUrl,
  getBusinessDocumentViewUrl,
} from '@/lib/documents/file-service'

const MAX_FILE_SIZE = 50 * 1024 * 1024

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'rtf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
])

const TEXT_EXTRACTABLE_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'txt',
  'rtf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
])

const MIME_FALLBACKS: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  rtf: 'text/rtf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

type UploadBusinessDocumentResult =
  | {
      success: true
      document: {
        id: string
        title: string
        documentType: string
        originalFilename: string | null
        mimeType: string | null
        fileSizeBytes: number | null
        viewUrl: string
        enhancedViewUrl: string | null
        canEnhancePreview: boolean
        createdAt: string
        extractionStatus: string
      }
    }
  | { success: false; error: string }

type SaveBusinessDocumentFileInput = {
  fileBuffer: Buffer
  fileName: string
  mimeType?: string | null
  title?: string | null
  documentType?: string | null
  summary?: string | null
  contentText?: string | null
  keyTerms?: Array<{ term: string; value: string }>
  tags?: string[]
  entityType?: string | null
  entityId?: string | null
  sourceUrl?: string | null
  sourceType?: string
  revalidatePaths?: string[]
}

function getFileExtension(fileName: string): string | null {
  const ext = fileName.split('.').pop()?.trim().toLowerCase()
  return ext || null
}

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanTags(raw: string | null): string[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
      .filter(Boolean)
      .slice(0, 20)
  } catch {
    return []
  }
}

function cleanKeyTerms(raw: string | null): Array<{ term: string; value: string }> {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const term = cleanString((entry as { term?: unknown }).term?.toString()) ?? ''
        const value = cleanString((entry as { value?: unknown }).value?.toString()) ?? ''
        if (!term || !value) return null
        return { term, value }
      })
      .filter((entry): entry is { term: string; value: string } => entry != null)
      .slice(0, 50)
  } catch {
    return []
  }
}

function deriveTitle(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const stem = lastDot > 0 ? fileName.slice(0, lastDot) : fileName
  return stem.replace(/[_-]+/g, ' ').trim() || 'Uploaded document'
}

function sanitizeFilename(fileName: string): string {
  return fileName
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

function isSupportedDocumentType(
  value: string | null
): value is (typeof SUPPORTED_CHEF_DOCUMENT_TYPES)[number] {
  return value != null && SUPPORTED_CHEF_DOCUMENT_TYPES.includes(value as any)
}

function cleanEntityId(value: string | null): string | null {
  if (!value) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

function parseRevalidatePaths(raw: string | null): string[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (value): value is string => typeof value === 'string' && value.startsWith('/')
    )
  } catch {
    return []
  }
}

export async function uploadBusinessDocument(
  formData: FormData
): Promise<UploadBusinessDocumentResult> {
  const fileEntry = formData.get('file')
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { success: false, error: 'Select a file to upload.' }
  }

  const fileBuffer = Buffer.from(await fileEntry.arrayBuffer())
  return saveBusinessDocumentFile({
    fileBuffer,
    fileName: fileEntry.name,
    mimeType: fileEntry.type || null,
    title: cleanString(formData.get('title')?.toString()),
    documentType: cleanString(formData.get('document_type')?.toString()),
    summary: cleanString(formData.get('summary')?.toString()),
    contentText: cleanString(formData.get('content_text')?.toString()),
    keyTerms: cleanKeyTerms(cleanString(formData.get('key_terms')?.toString())),
    tags: cleanTags(cleanString(formData.get('tags')?.toString())),
    entityType: cleanString(formData.get('entity_type')?.toString()),
    entityId: cleanEntityId(cleanString(formData.get('entity_id')?.toString())),
    sourceUrl: cleanString(formData.get('source_url')?.toString()),
    sourceType: 'file_upload',
    revalidatePaths: parseRevalidatePaths(cleanString(formData.get('revalidate_paths')?.toString())),
  })
}

export async function saveBusinessDocumentFile(
  input: SaveBusinessDocumentFileInput
): Promise<UploadBusinessDocumentResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const extension = getFileExtension(input.fileName)
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return {
      success: false,
      error: 'Unsupported file type. Use PDF, Office docs, spreadsheets, text, or common images.',
    }
  }

  if (input.fileBuffer.byteLength === 0) {
    return { success: false, error: 'Select a file to upload.' }
  }

  if (input.fileBuffer.byteLength > MAX_FILE_SIZE) {
    return { success: false, error: 'File is too large. Maximum size is 50 MB.' }
  }

  const requestedType = cleanString(input.documentType)
  const documentType = isSupportedDocumentType(requestedType) ? requestedType : 'general'
  const title = cleanString(input.title) ?? deriveTitle(input.fileName)
  const summary = cleanString(input.summary)
  const providedContentText = cleanString(input.contentText)
  const keyTerms = (input.keyTerms ?? []).filter(
    (entry) => cleanString(entry.term) && cleanString(entry.value)
  )
  const tags = (input.tags ?? [])
    .map((tag) => cleanString(tag)?.toLowerCase() ?? '')
    .filter(Boolean)
    .slice(0, 20)
  const contentType =
    cleanString(input.mimeType) || MIME_FALLBACKS[extension] || 'application/octet-stream'
  const safeFileName = sanitizeFilename(input.fileName)
  const storagePath = `${user.tenantId}/${new Date().getUTCFullYear()}/${Date.now()}-${randomUUID()}-${safeFileName}`
  const fileHash = createHash('sha256').update(input.fileBuffer).digest('hex')

  const { error: uploadError } = await supabase.storage
    .from(CHEF_DOCUMENTS_BUCKET)
    .upload(storagePath, input.fileBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  let contentText: string | null = providedContentText
  let extractionStatus = 'not_requested'
  let extractionConfidence: number | null = null

  if (TEXT_EXTRACTABLE_EXTENSIONS.has(extension) && !contentText) {
    try {
      const extracted = await extractTextFromFile(input.fileBuffer, input.fileName)
      contentText = cleanString(extracted.text)
      extractionStatus = contentText ? 'completed' : 'not_requested'
      extractionConfidence =
        typeof extracted.confidence === 'number' ? Number(extracted.confidence.toFixed(2)) : null
    } catch (error) {
      extractionStatus = 'failed'
      console.error('[saveBusinessDocumentFile] text extraction failed', error)
    }
  }

  const { data, error: insertError } = await supabase
    .from('chef_documents')
    .insert({
      tenant_id: user.tenantId!,
      title,
      document_type: documentType,
      content_text: contentText,
      summary,
      key_terms: keyTerms,
      tags,
      source_type: input.sourceType || 'file_upload',
      source_filename: input.fileName,
      original_filename: input.fileName,
      storage_bucket: CHEF_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      mime_type: contentType,
      file_size_bytes: input.fileBuffer.byteLength,
      file_hash: fileHash,
      entity_type: cleanString(input.entityType),
      entity_id: cleanEntityId(cleanString(input.entityId)),
      source_url: cleanString(input.sourceUrl),
      extraction_status: extractionStatus,
      extraction_confidence: extractionConfidence,
      created_by: user.id,
      updated_by: user.id,
    })
    .select(
      'id, title, document_type, original_filename, mime_type, file_size_bytes, created_at, extraction_status'
    )
    .single()

  if (insertError || !data) {
    await supabase.storage.from(CHEF_DOCUMENTS_BUCKET).remove([storagePath])
    return {
      success: false,
      error: `Document metadata save failed: ${insertError?.message ?? 'Unknown error'}`,
    }
  }

  revalidatePath('/documents')
  for (const path of input.revalidatePaths ?? []) {
    revalidatePath(path)
  }

  return {
    success: true,
    document: {
      canEnhancePreview: canEnhanceBusinessDocumentPreview(data.mime_type),
      id: data.id,
      title: data.title,
      documentType: data.document_type,
      originalFilename: data.original_filename,
      mimeType: data.mime_type,
      fileSizeBytes: data.file_size_bytes,
      viewUrl: getBusinessDocumentViewUrl(data.id),
      enhancedViewUrl: canEnhanceBusinessDocumentPreview(data.mime_type)
        ? getBusinessDocumentEnhancedViewUrl(data.id)
        : null,
      createdAt: data.created_at,
      extractionStatus: data.extraction_status,
    },
  }
}
