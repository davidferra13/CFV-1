'use client'

import Link from 'next/link'
import { AlertTriangle, ChevronRight } from '@/components/ui/icons'
import type { StalledDraft } from '@/lib/dashboard/widget-actions'

interface Props {
  drafts: StalledDraft[]
}

export function StalledDraftsCard({ drafts }: Props) {
  if (drafts.length === 0) return null

  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4 col-span-full">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-sm font-medium text-amber-300">
          {drafts.length === 1
            ? '1 event draft has been sitting untouched'
            : `${drafts.length} event drafts have been sitting untouched`}
        </span>
        <span className="text-xs text-amber-500 ml-1">for 7+ days</span>
      </div>
      <div className="space-y-1.5">
        {drafts.map((draft) => (
          <Link
            key={draft.id}
            href={`/events/${draft.id}`}
            className="flex items-center justify-between px-3 py-2 rounded bg-amber-950/40 hover:bg-amber-950/60 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <span className="text-sm text-amber-100 truncate block">
                  {draft.occasion || 'Untitled event'}
                </span>
                <span className="text-xs text-amber-500">
                  {draft.clientName ? `${draft.clientName} · ` : ''}
                  {draft.daysSinceCreated}d old
                  {draft.eventDate ? ` · ${draft.eventDate}` : ''}
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:text-amber-400 flex-shrink-0" />
          </Link>
        ))}
      </div>
      <p className="text-xs text-amber-600 mt-2">
        Send a quote or cancel these to keep your pipeline clean.
      </p>
    </div>
  )
}
