'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { ParsedClientSchema } from '@/lib/ai/parse-client-schema'
import { ParsedRecipeSchema } from '@/lib/ai/parse-recipe-schema'
import { importClient, importRecipe } from '@/lib/ai/import-actions'
import { importReceiptAsExpense } from '@/lib/ai/import-receipt-action'
import { saveBusinessDocumentFile } from '@/lib/documents/file-actions'
import type { ParsedDocument } from '@/lib/ai/parse-document-text'
import type { ReceiptExtraction } from '@/lib/ai/parse-receipt'
import type { DocumentIntelligenceArchiveState, DocumentIntelligenceDestination } from './types'
import {
  archiveDocumentIntelligenceJobForTenant,
  analyzeDocumentIntelligenceItemForTenant,
  deleteDocumentIntelligenceItemForTenant,
  downloadDocumentIntelligenceItemBuffer,
  getDocumentIntelligenceItemRow,
  getDocumentIntelligenceItemView,
} from './service'
import {
  checkDuplicateUpload,
  createUploadJob,
  processUploadJob,
} from '@/lib/menus/upload-actions'

const MENU_UPLOADS_BUCKET = 'menu-uploads'

const SaveDocumentIntelligenceItemSchema = z.object({
  itemId: z.string().uuid(),
  selectedDestination: z
    .enum(['menu', 'receipt', 'client', 'recipe', 'document'])
    .optional()
    .nullable(),
  selectedEventId: z.string().uuid().optional().nullable(),
  receiptCategory: z.string().optional(),
  receiptPaymentMethod: z
    .enum(['card', 'cash', 'venmo', 'paypal', 'zelle', 'check', 'other'])
    .optional(),
})

function normalizeReceiptExtraction(data: Record<string, unknown>): ReceiptExtraction {
  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : []

  return {
    storeName: typeof data.storeName === 'string' ? data.storeName : null,
    storeLocation: typeof data.storeLocation === 'string' ? data.storeLocation : null,
    purchaseDate: typeof data.purchaseDate === 'string' ? data.purchaseDate : null,
    purchaseTime: typeof data.purchaseTime === 'string' ? data.purchaseTime : null,
    lineItems: lineItems as ReceiptExtraction['lineItems'],
    subtotalCents: typeof data.subtotalCents === 'number' ? data.subtotalCents : null,
    taxCents: typeof data.taxCents === 'number' ? data.taxCents : null,
    totalCents: typeof data.totalCents === 'number' ? data.totalCents : 0,
    paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : null,
    itemCount:
      typeof data.itemCount === 'number'
        ? data.itemCount
        : Array.isArray(data.lineItems)
          ? data.lineItems.length
          : 0,
    confidence:
      data.confidence === 'high' || data.confidence === 'medium' || data.confidence === 'low'
        ? data.confidence
        : 'medium',
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((entry): entry is string => typeof entry === 'string')
      : [],
  }
}

function normalizeDocumentPayload(
  data: Record<string, unknown>,
  fallbackFileName: string
): ParsedDocument {
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((entry): entry is string => typeof entry === 'string')
    : []
  const keyTerms = Array.isArray(data.key_terms)
    ? data.key_terms
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null
          const term = (entry as { term?: unknown }).term
          const value = (entry as { value?: unknown }).value
          if (typeof term !== 'string' || typeof value !== 'string') return null
          return { term, value }
        })
        .filter(
          (entry): entry is {
            term: string
            value: string
          } => entry != null
        )
    : []

  return {
    title:
      typeof data.title === 'string'
        ? data.title
        : fallbackFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded document',
    document_type:
      data.document_type === 'contract' ||
      data.document_type === 'template' ||
      data.document_type === 'policy' ||
      data.document_type === 'checklist' ||
      data.document_type === 'note'
        ? data.document_type
        : 'general',
    content_text: typeof data.content_text === 'string' ? data.content_text : '',
    summary: typeof data.summary === 'string' ? data.summary : '',
    key_terms: keyTerms,
    tags,
    related_client_name: null,
    related_event_date: null,
  }
}

async function routeItemToMenu(params: {
  supabase: any
  tenantId: string
  fileName: string
  fileMimeType: string | null
  fileHash: string | null
  fileBuffer: Buffer
}) {
  const duplicate = params.fileHash ? await checkDuplicateUpload(params.fileHash) : null
  if (duplicate?.id) {
    return {
      routedRecordType: 'menu_upload_job',
      routedRecordId: duplicate.id,
      resultMessage: 'Already in Menu Review.',
    }
  }

  const extension = params.fileName.split('.').pop()?.toLowerCase() || 'bin'
  const job = await createUploadJob({
    file_name: params.fileName,
    file_type: extension,
    file_hash: params.fileHash || undefined,
    notes: 'Created from Document Intelligence',
  })

  const storagePath = `${params.tenantId}/${job.id}/${params.fileName}`
  const { error: storageError } = await params.supabase.storage
    .from(MENU_UPLOADS_BUCKET)
    .upload(storagePath, params.fileBuffer, {
      contentType: params.fileMimeType || 'application/octet-stream',
      upsert: false,
    })

  if (storageError) {
    await params.supabase
      .from('menu_upload_jobs')
      .update({
        status: 'failed',
        error_message: `Original file storage failed: ${storageError.message}`,
      })
      .eq('id', job.id)
      .eq('tenant_id', params.tenantId)

    throw new Error(`Menu file storage failed: ${storageError.message}`)
  }

  await params.supabase
    .from('menu_upload_jobs')
    .update({ file_storage_path: storagePath })
    .eq('id', job.id)
    .eq('tenant_id', params.tenantId)

  await processUploadJob(job.id, params.fileBuffer, params.fileName)

  return {
    routedRecordType: 'menu_upload_job',
    routedRecordId: job.id,
    resultMessage: 'Sent to Menu Review.',
  }
}

export async function analyzeDocumentIntelligenceItem(itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  return analyzeDocumentIntelligenceItemForTenant({
    supabase,
    tenantId: user.tenantId!,
    itemId,
  })
}

export async function saveDocumentIntelligenceItem(
  input: z.input<typeof SaveDocumentIntelligenceItemSchema>
) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const parsed = SaveDocumentIntelligenceItemSchema.parse(input)

  const row = await getDocumentIntelligenceItemRow({
    supabase,
    tenantId: user.tenantId!,
    itemId: parsed.itemId,
  })

  const destination =
    parsed.selectedDestination || row.selected_destination || row.suggested_destination

  if (!destination) {
    throw new Error('This file has not been classified yet.')
  }

  await supabase
    .from('document_intelligence_items')
    .update({
      status: 'routing',
      selected_destination: destination,
      error_message: null,
    })
    .eq('id', row.id)
    .eq('tenant_id', user.tenantId!)

  try {
    const extractedData = (row.extracted_data ?? {}) as Record<string, unknown>
    const fileBuffer = await downloadDocumentIntelligenceItemBuffer({ supabase, item: row })

    let routedRecordType: string | null = null
    let routedRecordId: string | null = null
    let resultMessage = 'Saved.'

    if (destination === 'menu') {
      const result = await routeItemToMenu({
        supabase,
        tenantId: user.tenantId!,
        fileName: row.source_filename,
        fileMimeType: row.file_mime_type,
        fileHash: row.file_hash,
        fileBuffer,
      })
      routedRecordType = result.routedRecordType
      routedRecordId = result.routedRecordId
      resultMessage = result.resultMessage
    } else if (destination === 'receipt') {
      const receipt = normalizeReceiptExtraction(extractedData)
      const result = await importReceiptAsExpense(
        receipt,
        parsed.selectedEventId || null,
        parsed.receiptPaymentMethod || 'card',
        parsed.receiptCategory || 'groceries'
      )

      routedRecordType = 'expense'
      routedRecordId = result?.expense?.id ?? null
      resultMessage = 'Saved as an expense.'
    } else if (destination === 'client') {
      const client = ParsedClientSchema.parse({
        parsed: extractedData,
        confidence: 'medium',
        warnings: [],
      }).parsed
      const result = await importClient(client)
      routedRecordType = 'client'
      routedRecordId = result?.client?.id ?? null
      resultMessage = 'Saved to Clients.'
    } else if (destination === 'recipe') {
      const recipe = ParsedRecipeSchema.parse({
        parsed: extractedData,
        confidence: 'medium',
        warnings: [],
      }).parsed
      const result = await importRecipe(recipe)
      routedRecordType = 'recipe'
      routedRecordId = result?.recipe?.id ?? null
      resultMessage = 'Saved to Recipes.'
    } else {
      const document = normalizeDocumentPayload(extractedData, row.source_filename)
      const result = await saveBusinessDocumentFile({
        fileBuffer,
        fileName: row.source_filename,
        mimeType: row.file_mime_type,
        title: document.title,
        documentType: document.document_type,
        summary: document.summary,
        contentText: document.content_text,
        keyTerms: document.key_terms,
        tags: document.tags,
        sourceType: 'document_intelligence',
        revalidatePaths: ['/import', '/documents'],
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      routedRecordType = 'chef_document'
      routedRecordId = result.document.id
      resultMessage = 'Saved to the document vault.'
    }

    await supabase
      .from('document_intelligence_items')
      .update({
        status: 'completed',
        selected_destination: destination,
        routed_record_type: routedRecordType,
        routed_record_id: routedRecordId,
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('tenant_id', user.tenantId!)

    const view = await getDocumentIntelligenceItemView({
      supabase,
      tenantId: user.tenantId!,
      itemId: row.id,
    })

    return {
      item: view,
      resultMessage,
    }
  } catch (error) {
    await supabase
      .from('document_intelligence_items')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Routing failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('tenant_id', user.tenantId!)

    return {
      item: await getDocumentIntelligenceItemView({
        supabase,
        tenantId: user.tenantId!,
        itemId: row.id,
      }),
      resultMessage: null,
    }
  }
}

export async function clearArchiveInbox(jobId: string): Promise<DocumentIntelligenceArchiveState> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  return archiveDocumentIntelligenceJobForTenant({
    supabase,
    tenantId: user.tenantId!,
    userId: user.id,
    jobId,
  })
}

export async function deleteDocumentIntelligenceItem(itemId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await deleteDocumentIntelligenceItemForTenant({
    supabase,
    tenantId: user.tenantId!,
    itemId,
  })

  return { success: true }
}
