'use client'

import type { VendorVettingResult } from '@/lib/vendors/vetting-actions'

const STATUS_CONFIG = {
  vetted: { label: 'Vetted', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  partial: {
    label: 'Partially Vetted',
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  unvetted: { label: 'Unvetted', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

function CheckIcon({ met }: { met: boolean }) {
  if (met) {
    return (
      <svg
        className="w-4 h-4 text-emerald-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  return (
    <svg
      className="w-4 h-4 text-stone-600 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function VendorVettingChecklist({ vetting }: { vetting: VendorVettingResult }) {
  const { status, completedCount, totalCount, completionPct, items } = vetting
  const config = STATUS_CONFIG[status]

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Supplier Vetting</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">
            {completedCount}/{totalCount}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            completionPct >= 75
              ? 'bg-emerald-500'
              : completionPct >= 37
                ? 'bg-amber-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-start gap-2.5 py-1.5 px-2 rounded ${
              item.met ? 'bg-stone-800/30' : 'bg-stone-900/30'
            }`}
          >
            <div className="mt-0.5">
              <CheckIcon met={item.met} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${item.met ? 'text-stone-300' : 'text-stone-500'}`}>
                  {item.label}
                </span>
              </div>
              {item.met && item.detail && (
                <p className="text-xs text-stone-500 truncate">{item.detail}</p>
              )}
              {!item.met && <p className="text-xs text-stone-600">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
