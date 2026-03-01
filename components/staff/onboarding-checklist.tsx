'use client'

import { useState, useTransition } from 'react'
import { updateOnboardingItem, type OnboardingItem } from '@/lib/staff/onboarding-actions'
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

function StatusIcon({ status }: { status: string }) {
  if (status === 'complete') {
    return <span className="text-green-600 font-bold text-lg">&#10003;</span>
  }
  if (status === 'not_applicable') {
    return <span className="text-stone-500 line-through text-sm">N/A</span>
  }
  return <span className="text-stone-600 text-lg">&#9675;</span>
}

function ItemRow({
  staffMemberId,
  itemKey,
  status,
}: {
  staffMemberId: string
  itemKey: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const label = ONBOARDING_ITEM_LABELS[itemKey] ?? itemKey

  function handleSet(newStatus: 'pending' | 'complete' | 'not_applicable') {
    startTransition(async () => {
      try {
        await updateOnboardingItem(staffMemberId, itemKey, newStatus)
      } catch (err) {
        toast.error('Failed to update checklist item')
      }
    })
  }

  const rowStyle =
    status === 'not_applicable'
      ? 'text-stone-500 line-through'
      : status === 'complete'
        ? 'text-stone-200'
        : 'text-stone-300'

  return (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-stone-800 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon status={status} />
        <span className={`text-sm truncate ${rowStyle}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleSet('complete')}
          disabled={isPending || status === 'complete'}
          className="px-2 py-0.5 text-xs rounded bg-green-900 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          Complete
        </button>
        <button
          onClick={() => handleSet('not_applicable')}
          disabled={isPending || status === 'not_applicable'}
          className="px-2 py-0.5 text-xs rounded bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          N/A
        </button>
        {status !== 'pending' && (
          <button
            onClick={() => handleSet('pending')}
            disabled={isPending}
            className="px-2 py-0.5 text-xs rounded bg-amber-950 text-amber-700 hover:bg-amber-900 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Pending
          </button>
        )}
      </div>
    </li>
  )
}

export function OnboardingChecklist({ staffMemberId, items }: OnboardingChecklistProps) {
  const [open, setOpen] = useState(false)

  const itemMap = new Map(items.map((i) => [i.item_key, i]))
  const completeCount = items.filter((i) => i.status === 'complete').length
  const total = ONBOARDING_ITEM_KEYS.length

  const badgeColor =
    completeCount === total
      ? 'bg-green-900 text-green-800'
      : completeCount > 0
        ? 'bg-amber-900 text-amber-800'
        : 'bg-stone-800 text-stone-400'

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-900 hover:bg-stone-800 transition-colors text-left"
      >
        <span className="font-medium text-stone-100">Onboarding Checklist</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {completeCount}/{total}
          </span>
          <span className="text-stone-500 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="bg-stone-900 border-t border-stone-800 px-4 py-2">
          <ul>
            {ONBOARDING_ITEM_KEYS.map((key) => {
              const item = itemMap.get(key)
              return (
                <ItemRow
                  key={key}
                  staffMemberId={staffMemberId}
                  itemKey={key}
                  status={item?.status ?? 'pending'}
                />
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
