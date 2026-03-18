'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import {
  uploadVendorDocument,
  type VendorDocumentStatus,
  type VendorDocumentType,
  type VendorDocumentUploadRow,
} from '@/lib/vendors/document-intake-actions'

interface VendorDocumentIntakeProps {
  vendorId: string
  uploads: VendorDocumentUploadRow[]
}

const DOCUMENT_TYPE_OPTIONS: { value: VendorDocumentType; label: string }[] = [
  { value: 'catalog', label: 'Supplier Catalog / Price Sheet' },
  { value: 'invoice', label: 'Vendor Invoice' },
  { value: 'expense', label: 'Expense Backup' },
  { value: 'supplier_doc', label: 'Supplier Document / Terms' },
  { value: 'other', label: 'Other' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function statusBadgeVariant(status: VendorDocumentStatus): BadgeProps['variant'] {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'processing') return 'warning'
  if (status === 'uploaded') return 'info'
  return 'default'
}

function documentTypeLabel(type: VendorDocumentType): string {
  if (type === 'catalog') return 'Catalog'
  if (type === 'invoice') return 'Invoice'
  if (type === 'expense') return 'Expense'
  if (type === 'supplier_doc') return 'Supplier Doc'
  return 'Other'
}

function summarizeUpload(upload: VendorDocumentUploadRow): string {
  const invoiceDraft = (upload.parse_summary?.draft_invoice ?? null) as {
    line_items_count?: number
    inferred_total_cents?: number
  } | null
  if (invoiceDraft) {
    const count = Number(invoiceDraft.line_items_count || 0)
    const total = Number(invoiceDraft.inferred_total_cents || 0)
    return `Invoice draft: ${count} items, total ${formatCurrency(total)}`
  }

  const expenseDraft = (upload.parse_summary?.draft_expenses ?? null) as {
    expense_rows_count?: number
    inferred_total_cents?: number
  } | null
  if (expenseDraft) {
    const count = Number(expenseDraft.expense_rows_count || 0)
    const total = Number(expenseDraft.inferred_total_cents || 0)
    return `Expense draft: ${count} rows, total ${formatCurrency(total)}`
  }

  const queueResult = upload.parse_summary?.queue_result
  if (
    queueResult &&
    typeof queueResult === 'object' &&
    'queued' in queueResult &&
    'autoApplied' in queueResult &&
    'needsReview' in queueResult
  ) {
    const queued = Number((queueResult as any).queued || 0)
    const autoApplied = Number((queueResult as any).autoApplied || 0)
    const needsReview = Number((queueResult as any).needsReview || 0)
    return `Queued ${queued}, auto-applied ${autoApplied}, review ${needsReview}`
  }

  if (upload.error_message) return upload.error_message
  if (upload.status === 'review') return 'Stored and waiting review'
  if (upload.status === 'completed') return 'Processed successfully'
  if (upload.status === 'processing') return 'Processing'
  if (upload.status === 'uploaded') return 'Uploaded'
  return 'Failed'
}

function summarizeUploadDetails(upload: VendorDocumentUploadRow): string[] {
  const summary = upload.parse_summary ?? {}
  const details: string[] = []

  if (typeof summary.parser_extension === 'string') {
    details.push(`Parsed from .${summary.parser_extension}`)
  }

  if (typeof summary.extraction_method === 'string') {
    details.push(`Extraction: ${summary.extraction_method}`)
  }

  if (typeof summary.extraction_confidence === 'number') {
    details.push(`OCR confidence: ${summary.extraction_confidence.toFixed(1)}%`)
  }

  if (typeof summary.extracted_lines === 'number' && summary.extracted_lines > 0) {
    details.push(`Text lines extracted: ${summary.extracted_lines}`)
  }

  if (typeof summary.duplicate_resolution === 'string') {
    if (summary.duplicate_resolution === 'linked_existing_invoice') {
      details.push('Duplicate invoice detected and linked to existing record')
    } else if (summary.duplicate_resolution === 'skipped_duplicate_rows') {
      details.push('Duplicate expense rows were skipped automatically')
    } else if (summary.duplicate_resolution === 'all_rows_matched_existing') {
      details.push('All expense rows matched existing records')
    } else {
      details.push(`Duplicate handling: ${summary.duplicate_resolution}`)
    }
  }

  if (
    typeof summary.skipped_duplicate_rows_count === 'number' &&
    summary.skipped_duplicate_rows_count > 0
  ) {
    details.push(`Skipped duplicates: ${summary.skipped_duplicate_rows_count}`)
  }

  if (typeof summary.applied_invoice_id === 'string' && summary.applied_invoice_id) {
    details.push(`Invoice saved: ${summary.applied_invoice_id.slice(0, 8)}...`)
  }

  if (Array.isArray(summary.applied_expense_ids)) {
    const count = summary.applied_expense_ids.filter((id) => typeof id === 'string').length
    if (count > 0) details.push(`Expenses saved: ${count}`)
  }

  if (Array.isArray(summary.duplicate_candidates) && summary.duplicate_candidates.length > 0) {
    details.push(`Invoice duplicates detected: ${summary.duplicate_candidates.length}`)
  }

  if (Array.isArray(summary.duplicate_rows) && summary.duplicate_rows.length > 0) {
    details.push(`Expense duplicates detected: ${summary.duplicate_rows.length}`)
  }

  return details.slice(0, 6)
}

export function VendorDocumentIntake({ vendorId, uploads }: VendorDocumentIntakeProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [documentType, setDocumentType] = useState<VendorDocumentType>('catalog')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [itemErrors, setItemErrors] = useState<string[]>([])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Choose at least one file before uploading.')
      return
    }

    setUploading(true)
    setError(null)
    setMessage(null)
    setItemErrors([])

    let uploadedCount = 0
    const failedItems: string[] = []

    for (const file of selectedFiles) {
      const formData = new FormData()
      formData.append('vendor_id', vendorId)
      formData.append('document_type', documentType)
      formData.append('file', file)

      const result = await uploadVendorDocument(formData)
      if (result.success) {
        uploadedCount += 1
      } else {
        failedItems.push(`${file.name}: ${result.error}`)
      }
    }

    if (uploadedCount > 0) {
      setMessage(`Uploaded ${uploadedCount} file(s).`)
      setSelectedFiles([])
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    }

    if (failedItems.length > 0) {
      setError(`${failedItems.length} file(s) could not be uploaded.`)
      setItemErrors(failedItems.slice(0, 8))
    }

    setUploading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Supplier File Inbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-500">
          Upload catalogs, invoices, expenses, and supplier documents in one place. Catalog CSV/XLSX
          files are auto-queued into your comparison workflow. Invoice and expense files are
          processed automatically after upload.
        </p>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {itemErrors.length > 0 && (
          <div className="rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 text-xs text-amber-300">
            <ul className="list-disc pl-4">
              {itemErrors.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Document Type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as VendorDocumentType)}
            options={DOCUMENT_TYPE_OPTIONS}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Files</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-800 file:text-stone-300 hover:file:bg-stone-700"
            />
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2">
            <p className="text-xs text-stone-400">
              Ready: {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
            </p>
            <ul className="mt-1 text-xs text-stone-300">
              {selectedFiles.slice(0, 5).map((file) => (
                <li key={file.name}>
                  {file.name} ({formatBytes(file.size)})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleUpload} loading={uploading} disabled={selectedFiles.length === 0}>
            Upload Files
          </Button>
          <Button
            variant="secondary"
            disabled={uploading}
            onClick={() => {
              setSelectedFiles([])
              setError(null)
              setItemErrors([])
              if (fileRef.current) fileRef.current.value = ''
            }}
          >
            Clear
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-stone-200 mb-2">Recent Uploads</h3>
          {uploads.length === 0 ? (
            <p className="text-sm text-stone-500">No files uploaded for this vendor yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-700 bg-stone-800 text-left text-stone-400">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Summary</th>
                    <th className="px-3 py-2">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload) => (
                    <tr key={upload.id} className="border-b border-stone-800 align-top">
                      <td className="px-3 py-2 text-stone-400">
                        {new Date(upload.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-stone-200">
                        <p>{upload.source_filename}</p>
                        <p className="text-stone-500">{formatBytes(upload.file_size_bytes)}</p>
                      </td>
                      <td className="px-3 py-2 text-stone-400">
                        {documentTypeLabel(upload.document_type)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={statusBadgeVariant(upload.status)}>{upload.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-stone-400 space-y-1">
                        <p>{summarizeUpload(upload)}</p>
                        {summarizeUploadDetails(upload).map((line, idx) => (
                          <p
                            key={`${upload.id}-detail-${idx}`}
                            className="text-xs-tight text-stone-500"
                          >
                            {line}
                          </p>
                        ))}
                      </td>
                      <td className="px-3 py-2">
                        {upload.download_url ? (
                          <a
                            href={upload.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 hover:text-brand-300 hover:underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-stone-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
