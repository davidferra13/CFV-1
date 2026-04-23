'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { dismissFailure, repairSideEffectFailure } from '@/lib/monitoring/failure-actions'
import type { SideEffectFailure } from '@/lib/monitoring/failure-actions'
import { getFailureRepairKind, getFailureRepairLabel } from '@/lib/monitoring/failure-repair'
import { toast } from 'sonner'

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-stone-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function FailureRow({ failure }: { failure: SideEffectFailure }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const repairKind = getFailureRepairKind(failure)

  if (dismissed) return null

  const handleDismiss = () => {
    const previous = dismissed
    setDismissed(true)
    startTransition(async () => {
      try {
        await dismissFailure(failure.id)
        router.refresh()
      } catch {
        setDismissed(previous)
        toast.error('Failed to dismiss failure')
      }
    })
  }

  const handleRepair = () => {
    if (!repairKind) return

    const previous = dismissed
    setDismissed(true)
    startTransition(async () => {
      try {
        const result = await repairSideEffectFailure(failure.id)
        toast.success(result.message)
        router.refresh()
      } catch (err) {
        setDismissed(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to repair failure')
      }
    })
  }

  return (
    <tr className="border-b border-stone-800 hover:bg-stone-800 text-xs">
      <td className="px-3 py-2 whitespace-nowrap text-slate-400">{timeAgo(failure.created_at)}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-xxs font-medium capitalize ${
            severityColors[failure.severity] ?? severityColors.medium
          }`}
        >
          {failure.severity}
        </span>
      </td>
      <td className="px-3 py-2 font-medium text-stone-300">{failure.source}</td>
      <td className="px-3 py-2 text-stone-400">{failure.operation}</td>
      <td
        className="px-3 py-2 text-stone-500 max-w-xs truncate"
        title={failure.error_message ?? ''}
      >
        {failure.error_message ?? '-'}
      </td>
      <td className="px-3 py-2 text-slate-400">
        {failure.entity_type && failure.entity_id
          ? `${failure.entity_type}:${failure.entity_id.slice(0, 8)}`
          : '-'}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          {repairKind && (
            <button
              onClick={handleRepair}
              disabled={isPending}
              className="text-emerald-400 hover:text-emerald-300 text-xxs underline disabled:opacity-50"
            >
              {getFailureRepairLabel(repairKind).toLowerCase()}
            </button>
          )}
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="text-slate-400 hover:text-stone-300 text-xxs underline disabled:opacity-50"
          >
            dismiss
          </button>
        </div>
      </td>
    </tr>
  )
}

export function SilentFailuresClient({
  initialFailures,
}: {
  initialFailures: SideEffectFailure[]
}) {
  if (initialFailures.length === 0) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg py-12 text-center text-slate-400 text-sm">
        No silent failures recorded. This is good.
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-800 border-b border-stone-700 text-xs text-stone-500">
              <th className="px-3 py-2 text-left font-medium">When</th>
              <th className="px-3 py-2 text-left font-medium">Severity</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Operation</th>
              <th className="px-3 py-2 text-left font-medium">Error</th>
              <th className="px-3 py-2 text-left font-medium">Entity</th>
              <th className="px-3 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {initialFailures.map((f) => (
              <FailureRow key={f.id} failure={f} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
