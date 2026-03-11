'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from '@/components/ui/icons'
import { DocumentUploadField } from '@/components/documents/document-upload-field'
import { updateHealthItem, type HealthItemStatus } from '@/lib/protection/business-health-actions'
import {
  HEALTH_ITEM_LABELS,
  HEALTH_ITEM_WHY,
  type HealthItemKey,
} from '@/lib/protection/business-health-constants'
import { toast } from 'sonner'

type HealthItem = {
  item_key: string
  status: HealthItemStatus
  notes: string | null
  document_url: string | null
  completed_at: string | null
}

export function BusinessHealthChecklist({ items }: { items: HealthItem[] }) {
  const [localItems, setLocalItems] = useState(items)
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const completedCount = localItems.filter((item) => item.status === 'complete').length
  const totalCount = localItems.length

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-stone-400">
          <p className="text-sm">No checklist items configured yet.</p>
        </CardContent>
      </Card>
    )
  }

  function patchItem(itemKey: string, patch: Partial<HealthItem>) {
    setLocalItems((prev) =>
      prev.map((item) => (item.item_key === itemKey ? { ...item, ...patch } : item))
    )
  }

  function persistItem(
    item: HealthItem,
    next: { status?: HealthItemStatus; documentUrl?: string | null },
    successMessage: string,
    errorMessage: string
  ) {
    const previous = [...localItems]
    const nextStatus = next.status ?? item.status
    const nextDocumentUrl =
      next.documentUrl === undefined ? item.document_url : (next.documentUrl ?? null)

    patchItem(item.item_key, {
      status: nextStatus,
      document_url: nextDocumentUrl,
      completed_at:
        nextStatus === 'complete' ? new Date().toISOString() : nextStatus === 'incomplete' ? null : item.completed_at,
    })
    setPendingKey(item.item_key)

    startTransition(async () => {
      try {
        await updateHealthItem(
          item.item_key,
          nextStatus,
          item.notes ?? undefined,
          nextDocumentUrl ?? undefined
        )
        toast.success(successMessage)
      } catch {
        setLocalItems(previous)
        toast.error(errorMessage)
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={completedCount === totalCount ? 'success' : 'warning'}>
          {completedCount}/{totalCount} complete
        </Badge>
      </div>

      <Card>
        <CardContent className="py-4 divide-y divide-stone-800">
          {localItems.map((item) => {
            const label = HEALTH_ITEM_LABELS[item.item_key as HealthItemKey] ?? item.item_key
            const why = HEALTH_ITEM_WHY[item.item_key as HealthItemKey]
            const isRowPending = pendingKey === item.item_key

            return (
              <div key={item.item_key} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  {item.status === 'complete' ? (
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 text-green-600 ${isRowPending ? 'opacity-50' : ''}`}
                    />
                  ) : (
                    <Circle
                      className={`mt-0.5 h-5 w-5 shrink-0 text-stone-500 ${isRowPending ? 'opacity-50' : ''}`}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${item.status === 'complete' ? 'text-stone-400 line-through' : 'text-stone-200'}`}
                        >
                          {label}
                        </p>
                        {why && <p className="mt-0.5 text-xs text-stone-500">{why}</p>}
                        {item.document_url && (
                          <a
                            href={item.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-2"
                          >
                            View attached document
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            persistItem(
                              item,
                              { status: 'complete' },
                              `Marked "${label}" complete`,
                              'Failed to update checklist item'
                            )
                          }
                          disabled={isPending || item.status === 'complete'}
                          className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-200 transition-colors hover:bg-green-800 disabled:cursor-default disabled:opacity-40"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            persistItem(
                              item,
                              { status: 'incomplete' },
                              `Marked "${label}" incomplete`,
                              'Failed to update checklist item'
                            )
                          }
                          disabled={isPending || item.status === 'incomplete'}
                          className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-300 transition-colors hover:bg-stone-700 disabled:cursor-default disabled:opacity-40"
                        >
                          Incomplete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <DocumentUploadField
                        label="Attach supporting file"
                        description="Upload proof, contracts, or supporting documentation for this checklist item."
                        documentType="policy"
                        entityType="business_health_item"
                        tags={['business-health', item.item_key]}
                        revalidatePaths={['/documents', '/settings/protection/business-health']}
                        initialUrl={item.document_url}
                        initialName={item.document_url ? `${label} attachment` : null}
                        compact
                        onUploaded={(document) =>
                          persistItem(
                            item,
                            { documentUrl: document.url },
                            `${label} document attached`,
                            'Failed to link uploaded document'
                          )
                        }
                        onCleared={() =>
                          persistItem(
                            item,
                            { documentUrl: null },
                            `${label} document cleared`,
                            'Failed to clear linked document'
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
