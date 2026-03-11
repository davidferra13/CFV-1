'use client'

import { useState, useTransition } from 'react'
import { DocumentUploadField } from '@/components/documents/document-upload-field'
import { updateOnboardingItem } from '@/lib/staff/onboarding-actions'
import { ONBOARDING_ITEM_LABELS, ONBOARDING_ITEM_KEYS } from '@/lib/staff/onboarding-constants'
import { toast } from 'sonner'

interface OnboardingChecklistProps {
  staffMemberId: string
  items: Array<{
    item_key: string
    status: string
    document_url: string | null
  }>
}

type LocalOnboardingItem = {
  item_key: string
  status: 'pending' | 'complete' | 'not_applicable'
  document_url: string | null
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'complete') {
    return <span className="text-lg font-bold text-green-600">&#10003;</span>
  }
  if (status === 'not_applicable') {
    return <span className="text-sm text-stone-500 line-through">N/A</span>
  }
  return <span className="text-lg text-stone-600">&#9675;</span>
}

export function OnboardingChecklist({ staffMemberId, items }: OnboardingChecklistProps) {
  const [open, setOpen] = useState(false)
  const [localItems, setLocalItems] = useState<LocalOnboardingItem[]>(
    ONBOARDING_ITEM_KEYS.map((key) => {
      const existing = items.find((item) => item.item_key === key)
      return {
        item_key: key,
        status: (existing?.status as LocalOnboardingItem['status']) ?? 'pending',
        document_url: existing?.document_url ?? null,
      }
    })
  )
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const completeCount = localItems.filter((item) => item.status === 'complete').length
  const total = ONBOARDING_ITEM_KEYS.length

  const badgeColor =
    completeCount === total
      ? 'bg-green-900 text-green-200'
      : completeCount > 0
        ? 'bg-amber-900 text-amber-200'
        : 'bg-stone-800 text-stone-400'

  function patchItem(itemKey: string, patch: Partial<LocalOnboardingItem>) {
    setLocalItems((prev) =>
      prev.map((item) => (item.item_key === itemKey ? { ...item, ...patch } : item))
    )
  }

  function persistItem(
    item: LocalOnboardingItem,
    next: {
      status?: LocalOnboardingItem['status']
      documentUrl?: string | null
    },
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
    })
    setPendingKey(item.item_key)

    startTransition(async () => {
      try {
        await updateOnboardingItem(
          staffMemberId,
          item.item_key,
          nextStatus,
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
    <div className="overflow-hidden rounded-lg border border-stone-700">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between bg-stone-900 px-4 py-3 text-left transition-colors hover:bg-stone-800"
      >
        <span className="font-medium text-stone-100">Onboarding Checklist</span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
            {completeCount}/{total}
          </span>
          <span className="text-sm text-stone-500">{open ? 'Hide' : 'Show'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-800 bg-stone-900 px-4 py-2">
          <ul>
            {localItems.map((item) => {
              const label = ONBOARDING_ITEM_LABELS[item.item_key] ?? item.item_key
              const rowStyle =
                item.status === 'not_applicable'
                  ? 'text-stone-500 line-through'
                  : item.status === 'complete'
                    ? 'text-stone-200'
                    : 'text-stone-300'
              const isRowPending = pendingKey === item.item_key

              return (
                <li
                  key={item.item_key}
                  className="border-b border-stone-800 py-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <span className={`text-sm truncate ${rowStyle}`}>{label}</span>
                          {item.document_url && (
                            <div>
                              <a
                                href={item.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-2"
                              >
                                View attached document
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              persistItem(
                                item,
                                { status: 'complete' },
                                `${label} marked complete`,
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
                                { status: 'not_applicable' },
                                `${label} marked not applicable`,
                                'Failed to update checklist item'
                              )
                            }
                            disabled={isPending || item.status === 'not_applicable'}
                            className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400 transition-colors hover:bg-stone-700 disabled:cursor-default disabled:opacity-40"
                          >
                            N/A
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              persistItem(
                                item,
                                { status: 'pending' },
                                `${label} marked pending`,
                                'Failed to update checklist item'
                              )
                            }
                            disabled={isPending || item.status === 'pending'}
                            className="rounded bg-amber-950 px-2 py-0.5 text-xs text-amber-200 transition-colors hover:bg-amber-900 disabled:cursor-default disabled:opacity-40"
                          >
                            Pending
                          </button>
                        </div>
                      </div>

                      <div className={`mt-3 ${isRowPending ? 'opacity-70' : ''}`}>
                        <DocumentUploadField
                          label="Attach onboarding document"
                          description="Upload the signed form, training proof, or checklist artifact for this item."
                          documentType="checklist"
                          entityType="staff_member"
                          entityId={staffMemberId}
                          tags={['staff-onboarding', item.item_key]}
                          revalidatePaths={['/documents', '/staff', `/staff/${staffMemberId}`]}
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
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
