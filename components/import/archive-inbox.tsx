'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/constants/expense-categories'
import {
  analyzeDocumentIntelligenceItem,
  clearArchiveInbox,
  deleteDocumentIntelligenceItem,
  saveDocumentIntelligenceItem,
} from '@/lib/document-intelligence/actions'
import type {
  DocumentIntelligenceDestination,
  DocumentIntelligenceItem,
} from '@/lib/document-intelligence/types'
import { MOBILE_CAPTURE_FILE_ACCEPT } from '@/lib/uploads/mobile-capture-types'

type EventOption = {
  id: string
  occasion: string | null
  event_date: string
  client: { full_name: string } | null
}

type ArchiveInboxItemState = DocumentIntelligenceItem & {
  confirmed: boolean
  selectedEventId: string
  receiptCategory: string
  receiptPaymentMethod: string
  resultMessage: string | null
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const DESTINATION_OPTIONS: { value: DocumentIntelligenceDestination; label: string }[] = [
  { value: 'menu', label: 'Menu Review' },
  { value: 'receipt', label: 'Expense / Receipt' },
  { value: 'client', label: 'Client Record' },
  { value: 'recipe', label: 'Recipe' },
  { value: 'document', label: 'Document Vault' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function deriveReceiptPaymentMethod(item: DocumentIntelligenceItem): string {
  const paymentMethod = item.extractedData.paymentMethod
  if (typeof paymentMethod !== 'string') return 'card'
  const normalized = paymentMethod.toLowerCase()
  if (normalized.includes('cash')) return 'cash'
  if (normalized.includes('venmo')) return 'venmo'
  if (normalized.includes('paypal')) return 'paypal'
  if (normalized.includes('zelle')) return 'zelle'
  if (normalized.includes('check')) return 'check'
  return 'card'
}

function inflateItem(
  item: DocumentIntelligenceItem,
  previous?: ArchiveInboxItemState,
  resultMessage?: string | null
): ArchiveInboxItemState {
  return {
    ...item,
    confirmed: previous?.confirmed ?? false,
    selectedEventId: previous?.selectedEventId ?? '',
    receiptCategory: previous?.receiptCategory ?? 'groceries',
    receiptPaymentMethod: previous?.receiptPaymentMethod ?? deriveReceiptPaymentMethod(item),
    resultMessage: resultMessage ?? previous?.resultMessage ?? null,
  }
}

function getStatusBadgeVariant(status: ArchiveInboxItemState['status']) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'review') return 'warning'
  return 'info'
}

function getStatusLabel(status: ArchiveInboxItemState['status']) {
  switch (status) {
    case 'uploaded':
      return 'Uploaded'
    case 'classifying':
      return 'Classifying'
    case 'review':
      return 'Ready for review'
    case 'routing':
      return 'Routing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}

function getSuggestedDestinationLabel(destination: DocumentIntelligenceDestination | null) {
  return DESTINATION_OPTIONS.find((entry) => entry.value === destination)?.label ?? null
}

function getDestination(item: ArchiveInboxItemState): DocumentIntelligenceDestination {
  return item.selectedDestination || item.suggestedDestination || 'document'
}

function getReceiptTotal(item: ArchiveInboxItemState): number | null {
  return typeof item.extractedData.totalCents === 'number' ? item.extractedData.totalCents : null
}

export function ArchiveInbox({
  aiConfigured,
  events = [],
  initialJobId,
  initialItems = [],
  unavailableReason,
}: {
  aiConfigured: boolean
  events?: EventOption[]
  initialJobId?: string
  initialItems?: DocumentIntelligenceItem[]
  unavailableReason?: string | null
}) {
  const [jobId, setJobId] = useState(initialJobId || '')
  const [items, setItems] = useState<ArchiveInboxItemState[]>(
    initialItems.map((item) => inflateItem(item))
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const archiveAvailable = !unavailableReason

  const eventOptions = useMemo(
    () =>
      events.map((event) => ({
        value: event.id,
        label: `${event.occasion || 'Untitled'} - ${event.event_date}${event.client ? ` (${event.client.full_name})` : ''}`,
      })),
    [events]
  )

  const pendingAnalysisCount = items.filter(
    (item) => item.status === 'uploaded' || item.status === 'failed'
  ).length
  const readyToSaveCount = items.filter((item) => item.status === 'review' && item.confirmed).length

  const mergeIncomingItems = (incoming: DocumentIntelligenceItem[], resultMessage?: string | null) => {
    setItems((current) => {
      const currentById = new Map(current.map((item) => [item.id, item]))
      const mergedIncoming = incoming.map((item) =>
        inflateItem(item, currentById.get(item.id), resultMessage)
      )
      const mergedIds = new Set(mergedIncoming.map((item) => item.id))
      const existing = current.filter((item) => !mergedIds.has(item.id))
      return [...mergedIncoming, ...existing]
    })
  }

  const updateItem = (
    itemId: string,
    updater: (item: ArchiveInboxItemState) => ArchiveInboxItemState
  ) => {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)))
  }

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0 || busy || !archiveAvailable) return

    setBusy(true)
    setError(null)

    try {
      const formData = new FormData()
      if (jobId) formData.append('job_id', jobId)
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch('/api/document-intelligence/items', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Upload failed')
      }

      if (payload.job?.id) {
        setJobId(payload.job.id)
      }

      if (Array.isArray(payload.items)) {
        mergeIncomingItems(payload.items as DocumentIntelligenceItem[])
      }

      if (Array.isArray(payload.rejected) && payload.rejected.length > 0) {
        setError(payload.rejected.join(' '))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleAnalyzeItem = async (itemId: string) => {
    if (!aiConfigured || !archiveAvailable) return

    updateItem(itemId, (item) => ({
      ...item,
      status: 'classifying',
      errorMessage: null,
      resultMessage: null,
      confirmed: false,
    }))

    try {
      const nextItem = await analyzeDocumentIntelligenceItem(itemId)
      mergeIncomingItems([nextItem])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      updateItem(itemId, (item) => ({
        ...item,
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Analysis failed',
      }))
    }
  }

  const handleAnalyzeAll = async () => {
    if (!aiConfigured || busy || !archiveAvailable) return
    setBusy(true)
    setError(null)
    try {
      for (const item of items) {
        if (item.status === 'uploaded' || item.status === 'failed') {
          await handleAnalyzeItem(item.id)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handleSaveItem = async (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    if (!item.confirmed) {
      setError('Review each file and confirm it before saving.')
      return
    }

    updateItem(itemId, (current) => ({
      ...current,
      status: 'routing',
      errorMessage: null,
      resultMessage: null,
    }))

    try {
      const result = await saveDocumentIntelligenceItem({
        itemId,
        selectedDestination: getDestination(item),
        selectedEventId: item.selectedEventId || null,
        receiptCategory: item.receiptCategory,
        receiptPaymentMethod: item.receiptPaymentMethod as
          | 'card'
          | 'cash'
          | 'venmo'
          | 'paypal'
          | 'zelle'
          | 'check'
          | 'other',
      })

      mergeIncomingItems([result.item], result.resultMessage)
      updateItem(itemId, (current) => ({ ...current, confirmed: false }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      updateItem(itemId, (current) => ({
        ...current,
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Save failed',
      }))
    }
  }

  const handleSaveAll = async () => {
    if (busy || !archiveAvailable) return
    setBusy(true)
    setError(null)
    try {
      for (const item of items) {
        if (item.status === 'review' && item.confirmed) {
          await handleSaveItem(item.id)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (busy || !archiveAvailable) return
    setBusy(true)
    setError(null)
    try {
      await deleteDocumentIntelligenceItem(itemId)
      setItems((current) => current.filter((item) => item.id !== itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const handleClearQueue = async () => {
    if (!jobId || busy || !archiveAvailable) return
    setBusy(true)
    setError(null)
    try {
      const nextState = await clearArchiveInbox(jobId)
      setJobId(nextState.job.id)
      setItems(nextState.items.map((item) => inflateItem(item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear queue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {!aiConfigured && (
        <Alert variant="warning" title="AI Parsing Not Configured">
          Archive Inbox needs the AI parsers enabled before it can classify menus, receipts, and
          documents.
        </Alert>
      )}

      {unavailableReason && (
        <Alert variant="warning" title="Archive Inbox Unavailable">
          {unavailableReason}
        </Alert>
      )}

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-100">Archive Inbox</h2>
          <p className="text-sm text-stone-400">
            Drop a batch of PDFs, phone photos, or text-based docs. We store every file, classify
            it, suggest where it belongs, and only save after review.
          </p>
        </div>

        <div
          onClick={() => {
            const input = document.getElementById('archive-inbox-upload') as HTMLInputElement | null
            input?.click()
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void handleFiles(event.dataTransfer.files)
          }}
          className="rounded-xl border-2 border-dashed border-stone-700 bg-stone-900/60 p-8 text-center cursor-pointer hover:border-stone-500"
        >
          <input
            id="archive-inbox-upload"
            type="file"
            accept={`${MOBILE_CAPTURE_FILE_ACCEPT},.docx,.txt,.rtf`}
            capture="environment"
            multiple
            className="hidden"
            disabled={!archiveAvailable}
            onChange={(event) => {
              if (event.target.files) {
                void handleFiles(event.target.files)
              }
              event.target.value = ''
            }}
          />
          <p className="text-sm font-medium text-stone-200">
            Drop files here, or click to add phone photos and PDFs
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Supported here: JPEG, PNG, HEIC/HEIF, WebP, PDF, DOCX, TXT, and RTF.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleAnalyzeAll}
            disabled={!archiveAvailable || !aiConfigured || pendingAnalysisCount === 0 || busy}
          >
            {busy ? 'Working...' : `Analyze ${pendingAnalysisCount || ''}`.trim()}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveAll}
            disabled={!archiveAvailable || readyToSaveCount === 0 || busy}
          >
            Save All Ready ({readyToSaveCount})
          </Button>
          <Button
            variant="ghost"
            onClick={handleClearQueue}
            disabled={!archiveAvailable || items.length === 0 || busy}
          >
            Clear Queue
          </Button>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Archive Inbox Error">
          {error}
        </Alert>
      )}

      {items.length === 0 ? (
        <Card className="p-6 text-sm text-stone-500">
          Nothing queued yet. Upload old menus, receipts, archived PDFs, or phone photos here.
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-4 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-stone-100">{item.sourceFilename}</h3>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {getStatusLabel(item.status)}
                    </Badge>
                    {item.confidence && <Badge variant="info">{item.confidence} confidence</Badge>}
                    {item.suggestedDestination && (
                      <Badge variant="warning">
                        Suggested: {getSuggestedDestinationLabel(item.suggestedDestination)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">{formatBytes(item.fileSizeBytes)}</p>
                  {item.resultMessage && <p className="text-sm text-emerald-400">{item.resultMessage}</p>}
                  {item.errorMessage && <p className="text-sm text-red-400">{item.errorMessage}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleAnalyzeItem(item.id)}
                    disabled={
                      !archiveAvailable ||
                      !aiConfigured ||
                      item.status === 'classifying' ||
                      item.status === 'routing' ||
                      busy
                    }
                  >
                    {item.status === 'uploaded' ? 'Analyze' : 'Re-analyze'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSaveItem(item.id)}
                    disabled={!archiveAvailable || item.status !== 'review' || !item.confirmed || busy}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDeleteItem(item.id)}
                    disabled={!archiveAvailable || item.status === 'routing' || busy}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                <div className="rounded-lg border border-stone-700 bg-stone-950 p-3">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.sourceFilename}
                      className="max-h-52 w-full rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded border border-stone-800 text-sm text-stone-500">
                      Stored document
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {item.warnings.length > 0 && (
                    <Alert variant="warning" title="Warnings">
                      <ul className="list-disc list-inside space-y-1">
                        {item.warnings.map((warning, index) => (
                          <li key={`${item.id}-warning-${index}`}>{warning}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  <Select
                    label="Destination"
                    value={getDestination(item)}
                    onChange={(event) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        selectedDestination: event.target.value as DocumentIntelligenceDestination,
                        confirmed: false,
                      }))
                    }
                    options={DESTINATION_OPTIONS}
                    disabled={item.status !== 'review'}
                  />

                  {getDestination(item) === 'receipt' && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Select
                        label="Attach to Event"
                        value={item.selectedEventId}
                        onChange={(event) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            selectedEventId: event.target.value,
                          }))
                        }
                        options={eventOptions}
                      />
                      <Select
                        label="Expense Category"
                        value={item.receiptCategory}
                        onChange={(event) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            receiptCategory: event.target.value,
                          }))
                        }
                        options={EXPENSE_CATEGORY_OPTIONS}
                      />
                      <Select
                        label="Payment Method"
                        value={item.receiptPaymentMethod}
                        onChange={(event) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            receiptPaymentMethod: event.target.value,
                          }))
                        }
                        options={PAYMENT_METHOD_OPTIONS}
                      />
                      <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-300">
                        <p className="font-medium text-stone-200">
                          {typeof item.extractedData.storeName === 'string'
                            ? item.extractedData.storeName
                            : 'Receipt'}
                        </p>
                        <p>
                          {typeof item.extractedData.itemCount === 'number'
                            ? item.extractedData.itemCount
                            : Array.isArray(item.extractedData.lineItems)
                              ? item.extractedData.lineItems.length
                              : 0}{' '}
                          items
                        </p>
                        {getReceiptTotal(item) != null && (
                          <p>${(getReceiptTotal(item)! / 100).toFixed(2)} total</p>
                        )}
                      </div>
                    </div>
                  )}

                  {getDestination(item) === 'client' && (
                    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
                      <p className="font-medium text-stone-100">
                        {typeof item.extractedData.full_name === 'string'
                          ? item.extractedData.full_name
                          : 'Client record'}
                      </p>
                      {typeof item.extractedData.email === 'string' && <p>{item.extractedData.email}</p>}
                      {typeof item.extractedData.phone === 'string' && <p>{item.extractedData.phone}</p>}
                      {typeof item.extractedData.address === 'string' && <p>{item.extractedData.address}</p>}
                    </div>
                  )}

                  {getDestination(item) === 'recipe' && (
                    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
                      <p className="font-medium text-stone-100">
                        {typeof item.extractedData.name === 'string' ? item.extractedData.name : 'Recipe'}
                      </p>
                      {typeof item.extractedData.category === 'string' && (
                        <p className="capitalize">{item.extractedData.category}</p>
                      )}
                      {typeof item.extractedData.description === 'string' && (
                        <p>{item.extractedData.description}</p>
                      )}
                    </div>
                  )}

                  {getDestination(item) === 'document' && (
                    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
                      <p className="font-medium text-stone-100">
                        {typeof item.extractedData.title === 'string'
                          ? item.extractedData.title
                          : item.sourceFilename.replace(/\.[^.]+$/, '')}
                      </p>
                      {typeof item.extractedData.document_type === 'string' && (
                        <p className="capitalize">{item.extractedData.document_type.replace(/_/g, ' ')}</p>
                      )}
                      {typeof item.extractedData.summary === 'string' && <p>{item.extractedData.summary}</p>}
                    </div>
                  )}

                  {getDestination(item) === 'menu' && (
                    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
                      <p className="font-medium text-stone-100">
                        {typeof item.extractedData.menu_title === 'string'
                          ? item.extractedData.menu_title
                          : 'Menu file'}
                      </p>
                      {typeof item.extractedData.summary === 'string' && <p>{item.extractedData.summary}</p>}
                      {typeof item.extractedData.dish_count_estimate === 'number' && (
                        <p>{item.extractedData.dish_count_estimate} dishes estimated</p>
                      )}
                      <p>Saving routes this file into the menu review workflow.</p>
                    </div>
                  )}

                  <label className="flex items-center gap-3 text-sm text-stone-300">
                    <input
                      type="checkbox"
                      checked={item.confirmed}
                      onChange={(event) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          confirmed: event.target.checked,
                        }))
                      }
                      disabled={item.status !== 'review'}
                    />
                    Review complete. Save this file to the selected destination.
                  </label>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
