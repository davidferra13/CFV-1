'use server'

import { createHash } from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { extractTextFromFile } from '@/lib/menus/extract-text'
import { createServerClient } from '@/lib/db/server'
import { queueVendorCatalogRows } from '@/lib/vendors/catalog-import-actions'
import {
  parseExpenseDraftFromExtractedText,
  parseInvoiceDraftFromExtractedText,
} from '@/lib/vendors/document-intake-parsers'
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, VENDOR_DOCUMENTS_BUCKET } from './constants'
import { parseCatalogCsvRows, parseCatalogSpreadsheetRows } from './catalog'
import { parseExpenseDraftFromTabular } from './expense'
import { parseInvoiceDraftFromTabular } from './invoice'
import { applyVendorDocumentDraft } from './apply-draft'
import {
  VendorDocumentTypeSchema,
  type UploadVendorDocumentResult,
  type VendorDocumentStatus,
} from './types'
import {
  assertVendorAccess,
  inferExtractionMethod,
  isTabularExtension,
  isTextExtractableExtension,
  logVendorDocumentActivity,
  parseCsv,
  parseSpreadsheet,
  revalidateVendorPaths,
  safeFileName,
} from './shared'

async function attemptAutoApplyDraft(
  uploadId: string,
  documentType: 'invoice' | 'expense'
): Promise<{ status: VendorDocumentStatus; message: string }> {
  const result = await applyVendorDocumentDraft({
    upload_id: uploadId,
    force_apply: false,
  })

  if (result.success) {
    return {
      status: 'completed',
      message: result.message,
    }
  }

  if (result.error.toLowerCase().includes('duplicate')) {
    return {
      status: 'review',
      message:
        documentType === 'invoice'
          ? 'Invoice draft extracted. Potential duplicate found, review before saving.'
          : 'Expense draft extracted. Potential duplicate found, review before saving.',
    }
  }

  return {
    status: 'review',
    message:
      documentType === 'invoice'
        ? `Invoice draft extracted. Auto-save not completed: ${result.error}`
        : `Expense draft extracted. Auto-save not completed: ${result.error}`,
  }
}

export async function uploadVendorDocument(
  formData: FormData
): Promise<UploadVendorDocumentResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const vendorId = String(formData.get('vendor_id') || '')
  const documentTypeRaw = String(formData.get('document_type') || '')
  const filePart = formData.get('file')

  const parsedType = VendorDocumentTypeSchema.safeParse(documentTypeRaw)
  if (!vendorId) return { success: false, error: 'Vendor is required' }
  if (!parsedType.success) return { success: false, error: 'Invalid document type' }
  if (!filePart || typeof filePart === 'string')
    return { success: false, error: 'No file provided' }

  const file = filePart as File
  if (file.size === 0) return { success: false, error: 'File is empty' }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 30 MB.`,
    }
  }

  await assertVendorAccess(db, user.tenantId!, vendorId)

  const normalizedFileName = safeFileName(file.name)
  const ext = normalizedFileName.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      success: false,
      error: `Unsupported file type ".${ext}". Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex')

  const { data: duplicate } = await db
    .from('vendor_document_uploads')
    .select('id, status')
    .eq('chef_id', user.tenantId!)
    .eq('vendor_id', vendorId)
    .eq('file_hash', fileHash)
    .limit(1)
    .maybeSingle()

  if (duplicate?.id) {
    return {
      success: false,
      error: `This file was already uploaded (status: ${duplicate.status}).`,
      existingUploadId: duplicate.id,
    }
  }

  const { data: insertedRow, error: insertError } = await db
    .from('vendor_document_uploads')
    .insert({
      chef_id: user.tenantId!,
      vendor_id: vendorId,
      document_type: parsedType.data,
      source_filename: normalizedFileName,
      file_mime_type: file.type || null,
      file_size_bytes: file.size,
      file_hash: fileHash,
      status: 'uploaded',
    })
    .select('id')
    .single()

  if (insertError || !insertedRow?.id) {
    return { success: false, error: insertError?.message || 'Failed to register upload' }
  }

  const storagePath = `${user.tenantId}/${vendorId}/${insertedRow.id}/${normalizedFileName}`
  const { error: uploadError } = await db.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    await db
      .from('vendor_document_uploads')
      .update({
        status: 'failed',
        error_message: uploadError.message,
      })
      .eq('id', insertedRow.id)
      .eq('chef_id', user.tenantId!)

    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  await db
    .from('vendor_document_uploads')
    .update({ file_storage_path: storagePath, status: 'processing' })
    .eq('id', insertedRow.id)
    .eq('chef_id', user.tenantId!)

  await logVendorDocumentActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'document_uploaded',
    entityId: insertedRow.id,
    summary: `Uploaded ${parsedType.data} document: ${normalizedFileName}`,
    context: {
      vendor_id: vendorId,
      document_type: parsedType.data,
      filename: normalizedFileName,
      extension: ext,
      size_bytes: file.size,
    },
  })

  if (parsedType.data === 'catalog' && isTabularExtension(ext)) {
    try {
      const parsedCatalog =
        ext === 'csv'
          ? parseCatalogCsvRows(fileBuffer.toString('utf8'))
          : await parseCatalogSpreadsheetRows(fileBuffer)

      if (parsedCatalog.rows.length === 0) {
        const lineError = parsedCatalog.lineErrors[0] || 'No valid catalog rows found'
        await db
          .from('vendor_document_uploads')
          .update({
            status: 'failed',
            error_message: lineError,
            parse_summary: {
              total_rows: parsedCatalog.totalRows,
              skipped_rows: parsedCatalog.skippedRows,
              price_format: parsedCatalog.priceFormat,
              parser_extension: ext,
              line_errors: parsedCatalog.lineErrors.slice(0, 20),
            },
            processed_at: new Date().toISOString(),
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        return { success: false, error: lineError, existingUploadId: insertedRow.id }
      }

      const queueResult = await queueVendorCatalogRows({
        vendor_id: vendorId,
        source_type: ext === 'csv' ? 'csv' : 'xlsx',
        source_filename: normalizedFileName,
        auto_apply_high_confidence: true,
        rows: parsedCatalog.rows,
      })

      const nextStatus: VendorDocumentStatus = queueResult.needsReview > 0 ? 'review' : 'completed'
      await db
        .from('vendor_document_uploads')
        .update({
          status: nextStatus,
          parse_summary: {
            total_rows: parsedCatalog.totalRows,
            queued_rows: parsedCatalog.rows.length,
            skipped_rows: parsedCatalog.skippedRows,
            price_format: parsedCatalog.priceFormat,
            parser_extension: ext,
            line_errors: parsedCatalog.lineErrors.slice(0, 20),
            queue_result: queueResult,
          },
          error_message: queueResult.errors[0] || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'vendor_price_recorded',
        entityId: insertedRow.id,
        summary: `Processed catalog file: ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          queued_rows: parsedCatalog.rows.length,
          auto_applied: queueResult.autoApplied,
          needs_review: queueResult.needsReview,
          source_type: ext,
        },
      })
      return {
        success: true,
        uploadId: insertedRow.id,
        status: nextStatus,
        message:
          nextStatus === 'completed'
            ? 'Catalog uploaded and fully applied.'
            : 'Catalog uploaded. Some rows are waiting for review.',
        queueResult,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Catalog parsing failed'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  if ((parsedType.data === 'invoice' || parsedType.data === 'expense') && isTabularExtension(ext)) {
    try {
      const parsedTabular =
        ext === 'csv' ? parseCsv(fileBuffer.toString('utf8')) : await parseSpreadsheet(fileBuffer)

      if (parsedType.data === 'invoice') {
        const draftInvoice = parseInvoiceDraftFromTabular(parsedTabular)
        if (draftInvoice.line_items_count === 0) {
          throw new Error('No invoice line items were detected in this file')
        }

        await db
          .from('vendor_document_uploads')
          .update({
            status: 'review',
            parse_summary: {
              parser_extension: ext,
              draft_invoice: draftInvoice,
            },
            processed_at: new Date().toISOString(),
            error_message: draftInvoice.warnings[0] || null,
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        await logVendorDocumentActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'ai_document_processed',
          entityId: insertedRow.id,
          summary: `Extracted invoice draft from ${normalizedFileName}`,
          context: {
            vendor_id: vendorId,
            line_items_count: draftInvoice.line_items_count,
            inferred_total_cents: draftInvoice.inferred_total_cents,
          },
        })
        const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'invoice')
        return {
          success: true,
          uploadId: insertedRow.id,
          status: autoApply.status,
          message: autoApply.message,
        }
      }

      const draftExpense = parseExpenseDraftFromTabular(parsedTabular)
      if (draftExpense.expense_rows_count === 0) {
        throw new Error('No expense rows were detected in this file')
      }

      await db
        .from('vendor_document_uploads')
        .update({
          status: 'review',
          parse_summary: {
            parser_extension: ext,
            draft_expenses: draftExpense,
          },
          processed_at: new Date().toISOString(),
          error_message: draftExpense.warnings[0] || null,
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'ai_document_processed',
        entityId: insertedRow.id,
        summary: `Extracted expense draft from ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          expense_rows_count: draftExpense.expense_rows_count,
          inferred_total_cents: draftExpense.inferred_total_cents,
        },
      })
      const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'expense')
      return {
        success: true,
        uploadId: insertedRow.id,
        status: autoApply.status,
        message: autoApply.message,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract draft data'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  if (
    (parsedType.data === 'invoice' || parsedType.data === 'expense') &&
    isTextExtractableExtension(ext)
  ) {
    try {
      const extractionResult = await extractTextFromFile(fileBuffer, normalizedFileName)
      const extractedText = extractionResult.text.trim()
      if (!extractedText) {
        throw new Error('Could not extract readable text from this file')
      }

      const extractedLineCount = extractedText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0).length
      const extractionSummary = {
        extraction_method: inferExtractionMethod(ext),
        extraction_confidence:
          typeof extractionResult.confidence === 'number'
            ? Number(extractionResult.confidence.toFixed(2))
            : null,
        extracted_characters: extractedText.length,
        extracted_lines: extractedLineCount,
        extracted_text_preview: extractedText.slice(0, 1200),
      }

      if (parsedType.data === 'invoice') {
        const draftInvoice = parseInvoiceDraftFromExtractedText(extractedText)
        if (draftInvoice.line_items_count === 0) {
          throw new Error('No invoice line items were detected in this file')
        }

        await db
          .from('vendor_document_uploads')
          .update({
            status: 'review',
            parse_summary: {
              parser_extension: ext,
              ...extractionSummary,
              draft_invoice: draftInvoice,
            },
            processed_at: new Date().toISOString(),
            error_message: draftInvoice.warnings[0] || null,
          })
          .eq('id', insertedRow.id)
          .eq('chef_id', user.tenantId!)

        revalidateVendorPaths(vendorId)
        await logVendorDocumentActivity({
          tenantId: user.tenantId!,
          actorId: user.id,
          action: 'ai_document_processed',
          entityId: insertedRow.id,
          summary: `Extracted invoice draft from ${normalizedFileName}`,
          context: {
            vendor_id: vendorId,
            line_items_count: draftInvoice.line_items_count,
            inferred_total_cents: draftInvoice.inferred_total_cents,
            extraction_method: extractionSummary.extraction_method,
          },
        })
        const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'invoice')
        return {
          success: true,
          uploadId: insertedRow.id,
          status: autoApply.status,
          message: autoApply.message,
        }
      }

      const draftExpense = parseExpenseDraftFromExtractedText(extractedText)
      if (draftExpense.expense_rows_count === 0) {
        throw new Error('No expense rows were detected in this file')
      }

      await db
        .from('vendor_document_uploads')
        .update({
          status: 'review',
          parse_summary: {
            parser_extension: ext,
            ...extractionSummary,
            draft_expenses: draftExpense,
          },
          processed_at: new Date().toISOString(),
          error_message: draftExpense.warnings[0] || null,
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'ai_document_processed',
        entityId: insertedRow.id,
        summary: `Extracted expense draft from ${normalizedFileName}`,
        context: {
          vendor_id: vendorId,
          expense_rows_count: draftExpense.expense_rows_count,
          inferred_total_cents: draftExpense.inferred_total_cents,
          extraction_method: extractionSummary.extraction_method,
        },
      })
      const autoApply = await attemptAutoApplyDraft(insertedRow.id, 'expense')
      return {
        success: true,
        uploadId: insertedRow.id,
        status: autoApply.status,
        message: autoApply.message,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract text from document'
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'failed',
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', insertedRow.id)
        .eq('chef_id', user.tenantId!)

      revalidateVendorPaths(vendorId)
      return { success: false, error: message, existingUploadId: insertedRow.id }
    }
  }

  await db
    .from('vendor_document_uploads')
    .update({
      status: 'review',
      parse_summary: {
        note: 'File stored and ready for review.',
        extension: ext,
      },
      processed_at: new Date().toISOString(),
    })
    .eq('id', insertedRow.id)
    .eq('chef_id', user.tenantId!)

  revalidateVendorPaths(vendorId)
  await logVendorDocumentActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'document_uploaded',
    entityId: insertedRow.id,
    summary: `Stored document for review: ${normalizedFileName}`,
    context: {
      vendor_id: vendorId,
      document_type: parsedType.data,
      extension: ext,
    },
  })
  return {
    success: true,
    uploadId: insertedRow.id,
    status: 'review',
    message: 'File uploaded and saved for review.',
  }
}
