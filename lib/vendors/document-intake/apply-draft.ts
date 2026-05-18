'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { expenseRowKey, findPotentialExpenseDuplicates } from './expense'
import { findPotentialInvoiceDuplicates, recordInvoiceLineItemPricePoints } from './invoice'
import {
  ApplyVendorDocumentDraftSchema,
  type ApplyVendorDocumentDraftInput,
  type ApplyVendorDocumentDraftResult,
  type DraftExpenseSummary,
  type DraftInvoiceSummary,
} from './types'
import {
  cleanString,
  normalizeCategory,
  parseDateGuess,
  revalidateVendorPaths,
  logVendorDocumentActivity,
} from './shared'

export async function applyVendorDocumentDraft(
  input: ApplyVendorDocumentDraftInput
): Promise<ApplyVendorDocumentDraftResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = ApplyVendorDocumentDraftSchema.parse(input)

  const { data: uploadRow, error: uploadError } = await db
    .from('vendor_document_uploads')
    .select('id, vendor_id, document_type, source_filename, status, parse_summary')
    .eq('id', data.upload_id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (uploadError || !uploadRow) {
    return { success: false, error: 'Upload record not found' }
  }

  const parseSummary = (uploadRow.parse_summary ?? {}) as Record<string, unknown>
  const nowIso = new Date().toISOString()

  if (uploadRow.document_type === 'invoice') {
    const draft = (parseSummary.draft_invoice ?? null) as DraftInvoiceSummary | null
    if (!draft || !Array.isArray(draft.line_items) || draft.line_items.length === 0) {
      return { success: false, error: 'No invoice draft found on this upload' }
    }

    const alreadyAppliedId =
      typeof parseSummary.applied_invoice_id === 'string' &&
      parseSummary.applied_invoice_id.length > 0
        ? parseSummary.applied_invoice_id
        : null

    const invoiceDate =
      parseDateGuess(String(draft.invoice_date_guess ?? '')) || nowIso.slice(0, 10)
    const invoiceNumber = cleanString(draft.invoice_number_guess) ?? null
    const sanitizedLineItems = draft.line_items
      .map((line) => ({
        description: cleanString(line.description) ?? '',
        quantity: Number(line.quantity || 0),
        unit_price_cents: Number(line.unit_price_cents || 0),
        total_cents: Number(line.total_cents || 0),
      }))
      .filter((line) => line.description && line.total_cents > 0)

    if (sanitizedLineItems.length === 0) {
      return { success: false, error: 'Invoice draft has no valid line items' }
    }

    const inferredTotal = Number(draft.inferred_total_cents || 0)
    const computedTotal = sanitizedLineItems.reduce((sum, line) => sum + line.total_cents, 0)
    const invoiceTotal = inferredTotal > 0 ? inferredTotal : computedTotal

    const duplicateCandidates = await findPotentialInvoiceDuplicates({
      db,
      tenantId: user.tenantId!,
      vendorId: uploadRow.vendor_id,
      invoiceNumber,
      invoiceDate,
      totalCents: invoiceTotal,
    })
    const duplicateWarnings = duplicateCandidates.map(
      (candidate) => `Invoice ${candidate.id}: ${candidate.reason}`
    )

    const draftSummary: Record<string, unknown> = {
      invoice_date: invoiceDate,
      invoice_number: invoiceNumber,
      total_cents: invoiceTotal,
      line_items_count: sanitizedLineItems.length,
      line_items_preview: sanitizedLineItems.slice(0, 12),
      duplicate_candidates: duplicateCandidates,
      already_applied_invoice_id: alreadyAppliedId,
    }

    if (data.preview_only) {
      return {
        success: true,
        documentType: 'invoice',
        previewOnly: true,
        createdInvoiceId: alreadyAppliedId ?? undefined,
        duplicateWarnings,
        draftSummary,
        message: alreadyAppliedId
          ? 'Invoice draft preview generated. This draft was already saved earlier.'
          : 'Invoice draft preview generated.',
      }
    }

    if (alreadyAppliedId) {
      return {
        success: true,
        documentType: 'invoice',
        createdInvoiceId: alreadyAppliedId,
        duplicateWarnings,
        draftSummary,
        message: 'Invoice was already created from this draft.',
      }
    }

    if (duplicateCandidates.length > 0 && !data.force_apply) {
      const existingInvoiceId = duplicateCandidates[0]?.id ?? null
      await db
        .from('vendor_document_uploads')
        .update({
          status: 'completed',
          processed_at: nowIso,
          parse_summary: {
            ...parseSummary,
            applied_invoice_id: existingInvoiceId,
            applied_at: nowIso,
            duplicate_candidates: duplicateCandidates,
            duplicate_resolution: 'linked_existing_invoice',
            duplicate_resolution_invoice_id: existingInvoiceId,
          },
        })
        .eq('id', uploadRow.id)
        .eq('chef_id', user.tenantId!)

      await logVendorDocumentActivity({
        tenantId: user.tenantId!,
        actorId: user.id,
        action: 'document_imported',
        entityId: uploadRow.id,
        summary: `Skipped duplicate invoice from ${uploadRow.source_filename}`,
        context: {
          vendor_id: uploadRow.vendor_id,
          duplicate_candidates_count: duplicateCandidates.length,
          linked_invoice_id: existingInvoiceId,
          duplicate_resolution: 'linked_existing_invoice',
        },
      })

      revalidateVendorPaths(uploadRow.vendor_id)
      return {
        success: true,
        documentType: 'invoice',
        createdInvoiceId: existingInvoiceId ?? undefined,
        duplicateWarnings,
        draftSummary,
        message:
          'Duplicate invoice detected. Linked to existing record and skipped creating a new invoice.',
      }
    }

    const { data: invoice, error: invoiceInsertError } = await db
      .from('vendor_invoices')
      .insert({
        chef_id: user.tenantId!,
        vendor_id: uploadRow.vendor_id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        total_cents: invoiceTotal,
        notes: `Imported from vendor file: ${uploadRow.source_filename}`,
      })
      .select('id')
      .single()

    if (invoiceInsertError || !invoice?.id) {
      return { success: false, error: invoiceInsertError?.message || 'Failed to create invoice' }
    }

    const { error: lineItemsError } = await db.from('vendor_invoice_line_items').insert(
      sanitizedLineItems.map((line) => ({
        invoice_id: invoice.id,
        chef_id: user.tenantId!,
        description: line.description,
        quantity: line.quantity > 0 ? line.quantity : 1,
        unit_price_cents: line.unit_price_cents >= 0 ? line.unit_price_cents : 0,
        total_cents: line.total_cents,
      }))
    )

    if (lineItemsError) {
      return { success: false, error: lineItemsError.message }
    }

    await recordInvoiceLineItemPricePoints({
      db,
      tenantId: user.tenantId!,
      vendorId: uploadRow.vendor_id,
      invoiceNumber,
      lineItems: sanitizedLineItems,
    })

    await db
      .from('vendor_document_uploads')
      .update({
        status: 'completed',
        processed_at: nowIso,
        parse_summary: {
          ...parseSummary,
          applied_invoice_id: invoice.id,
          applied_at: nowIso,
          duplicate_candidates: duplicateCandidates,
        },
      })
      .eq('id', uploadRow.id)
      .eq('chef_id', user.tenantId!)

    await logVendorDocumentActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'document_imported',
      entityId: uploadRow.id,
      summary: `Saved invoice draft from ${uploadRow.source_filename}`,
      context: {
        vendor_id: uploadRow.vendor_id,
        created_invoice_id: invoice.id,
        total_cents: invoiceTotal,
        duplicate_candidates_count: duplicateCandidates.length,
        forced: data.force_apply,
      },
    })

    revalidateVendorPaths(uploadRow.vendor_id)
    revalidatePath('/vendors')
    revalidatePath('/food-cost')
    return {
      success: true,
      documentType: 'invoice',
      createdInvoiceId: invoice.id,
      duplicateWarnings,
      draftSummary,
      message: 'Invoice created from draft.',
    }
  }

  if (uploadRow.document_type === 'expense') {
    const draft = (parseSummary.draft_expenses ?? null) as DraftExpenseSummary | null
    if (!draft || !Array.isArray(draft.rows) || draft.rows.length === 0) {
      return { success: false, error: 'No expense draft found on this upload' }
    }

    const alreadyAppliedIds = Array.isArray(parseSummary.applied_expense_ids)
      ? parseSummary.applied_expense_ids.filter((id): id is string => typeof id === 'string')
      : []

    const { data: vendorRow } = await db
      .from('vendors')
      .select('name')
      .eq('id', uploadRow.vendor_id)
      .eq('chef_id', user.tenantId!)
      .single()
    const vendorName = cleanString(vendorRow?.name ?? '') ?? null

    const today = nowIso.slice(0, 10)
    const expenseRows = draft.rows
      .map((row, index) => ({
        draft_index: index,
        tenant_id: user.tenantId!,
        event_id: null,
        expense_date: parseDateGuess(String(row.expense_date ?? '')) ?? today,
        category: normalizeCategory(String(row.category ?? '')),
        vendor_name: vendorName,
        amount_cents: Number(row.amount_cents || 0),
        description: cleanString(row.description) ?? '',
        notes: `Imported from vendor file: ${uploadRow.source_filename}`,
        payment_method: 'other',
        is_business: true,
        is_reimbursable: false,
        receipt_uploaded: false,
        created_by: user.id,
        updated_by: user.id,
      }))
      .filter((row) => row.amount_cents > 0 && row.description.length > 0)

    if (expenseRows.length === 0) {
      return { success: false, error: 'Expense draft has no valid rows' }
    }

    const duplicateRows = await findPotentialExpenseDuplicates({
      db,
      tenantId: user.tenantId!,
      vendorName,
      rows: expenseRows.map((row) => ({
        expense_date: row.expense_date,
        amount_cents: row.amount_cents,
        description: row.description,
      })),
    })

    const duplicateWarnings = duplicateRows.map(
      (row) => `${row.rowDescription}: ${row.reason} (existing ${row.existingExpenseId})`
    )

    const draftSummary: Record<string, unknown> = {
      rows_count: expenseRows.length,
      total_cents: expenseRows.reduce((sum, row) => sum + row.amount_cents, 0),
      rows_preview: expenseRows.slice(0, 12).map((row) => ({
        expense_date: row.expense_date,
        amount_cents: row.amount_cents,
        description: row.description,
        category: row.category,
      })),
      duplicate_rows: duplicateRows,
      already_applied_expense_ids: alreadyAppliedIds,
    }

    if (data.preview_only) {
      return {
        success: true,
        documentType: 'expense',
        previewOnly: true,
        createdExpenseIds: alreadyAppliedIds.length > 0 ? alreadyAppliedIds : undefined,
        duplicateWarnings,
        draftSummary,
        message:
          alreadyAppliedIds.length > 0
            ? 'Expense draft preview generated. This draft was already saved earlier.'
            : 'Expense draft preview generated.',
      }
    }

    if (alreadyAppliedIds.length > 0) {
      return {
        success: true,
        documentType: 'expense',
        createdExpenseIds: alreadyAppliedIds,
        duplicateWarnings,
        draftSummary,
        message: 'Expenses were already created from this draft.',
      }
    }

    const duplicateKeySet = new Set(
      duplicateRows.map((row) =>
        expenseRowKey({
          expense_date: row.expenseDate,
          amount_cents: row.amountCents,
          description: row.rowDescription,
        })
      )
    )
    const rowsToInsert =
      data.force_apply || duplicateKeySet.size === 0
        ? expenseRows
        : expenseRows.filter((row) => !duplicateKeySet.has(expenseRowKey(row)))

    let insertedExpenses: Array<{ id: string }> = []
    if (rowsToInsert.length > 0) {
      const { data: inserted, error: expenseInsertError } = await db
        .from('expenses')
        .insert(
          rowsToInsert.map((row) => ({
            tenant_id: row.tenant_id,
            event_id: row.event_id,
            expense_date: row.expense_date,
            category: row.category,
            vendor_name: row.vendor_name,
            amount_cents: row.amount_cents,
            description: row.description,
            notes: row.notes,
            payment_method: row.payment_method,
            is_business: row.is_business,
            is_reimbursable: row.is_reimbursable,
            receipt_uploaded: row.receipt_uploaded,
            created_by: row.created_by,
            updated_by: row.updated_by,
          }))
        )
        .select('id')

      if (expenseInsertError) {
        return { success: false, error: expenseInsertError.message }
      }
      insertedExpenses = (inserted ?? []) as Array<{ id: string }>
    }

    const createdExpenseIds = insertedExpenses.map((row) => row.id)
    const skippedDuplicateRowsCount = data.force_apply ? 0 : duplicateRows.length
    const duplicateResolution =
      skippedDuplicateRowsCount > 0
        ? createdExpenseIds.length > 0
          ? 'skipped_duplicate_rows'
          : 'all_rows_matched_existing'
        : null

    await db
      .from('vendor_document_uploads')
      .update({
        status: 'completed',
        processed_at: nowIso,
        parse_summary: {
          ...parseSummary,
          applied_expense_ids: createdExpenseIds,
          applied_at: nowIso,
          duplicate_rows: duplicateRows,
          duplicate_resolution: duplicateResolution,
          skipped_duplicate_rows_count: skippedDuplicateRowsCount,
        },
      })
      .eq('id', uploadRow.id)
      .eq('chef_id', user.tenantId!)

    await logVendorDocumentActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'expense_created',
      entityId: uploadRow.id,
      summary: `Saved expense draft from ${uploadRow.source_filename}`,
      context: {
        vendor_id: uploadRow.vendor_id,
        created_count: createdExpenseIds.length,
        duplicate_rows_count: duplicateRows.length,
        skipped_duplicates_count: skippedDuplicateRowsCount,
        forced: data.force_apply,
      },
    })

    revalidateVendorPaths(uploadRow.vendor_id)
    revalidatePath('/expenses')
    revalidatePath('/finance')
    let expenseMessage = `Created ${createdExpenseIds.length} expense record(s) from draft.`
    if (!data.force_apply && skippedDuplicateRowsCount > 0) {
      expenseMessage =
        createdExpenseIds.length > 0
          ? `Created ${createdExpenseIds.length} expense record(s) and skipped ${skippedDuplicateRowsCount} duplicate row(s).`
          : 'All expense rows matched existing records. No new expenses were created.'
    }

    return {
      success: true,
      documentType: 'expense',
      createdExpenseIds,
      duplicateWarnings,
      draftSummary,
      message: expenseMessage,
    }
  }

  return { success: false, error: 'This upload does not support draft apply' }
}
