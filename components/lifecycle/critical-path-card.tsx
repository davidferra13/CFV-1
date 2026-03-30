'use client'

import { useState, useTransition } from 'react'
import type { CriticalPathResult, CriticalPathItem } from '@/lib/lifecycle/critical-path'

interface CriticalPathCardProps {
  criticalPath: CriticalPathResult
  circleToken?: string | null
}

const stageOrder = ['quote', 'shopping', 'menu_lock', 'service_day'] as const
const stageLabels: Record<string, string> = {
  quote: 'Before quote',
  shopping: 'Before shopping',
  menu_lock: 'Before menu lock',
  service_day: 'Before service day',
}

function StatusIcon({ status }: { status: 'confirmed' | 'missing' | 'partial' }) {
  if (status === 'confirmed') {
    return (
      <svg className="h-5 w-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (status === 'partial') {
    return (
      <svg className="h-5 w-5 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5 text-stone-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function CriticalPathCard({ criticalPath, circleToken }: CriticalPathCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { items, completedCount, complete } = criticalPath

  const progressPercent = Math.round((completedCount / 10) * 100)

  // Group blockers by stage
  const blockers = items.filter((i) => i.status !== 'confirmed')
  const blockersByStage = stageOrder
    .map((stage) => ({
      stage,
      label: stageLabels[stage],
      items: blockers.filter((b) => b.blocking_stage === stage),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/80 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {complete ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-stone-300">
              {completedCount}
            </div>
          )}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-stone-200">
              {complete ? 'Ready to cook!' : 'Critical Path'}
            </h3>
            <p className="text-xs text-stone-500">
              {completedCount}/10 confirmed{' '}
              {!complete && criticalPath.nextBlocker && (
                <span className="text-amber-500">- Next: {criticalPath.nextBlocker}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-stone-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                complete
                  ? 'bg-emerald-500'
                  : progressPercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-stone-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <svg
            className={`h-4 w-4 text-stone-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-stone-800 px-4 py-3 space-y-3">
          {/* All 10 items */}
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.key} className="flex items-start gap-2 py-0.5">
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm ${
                      item.status === 'confirmed'
                        ? 'text-stone-300'
                        : item.status === 'partial'
                          ? 'text-amber-300'
                          : 'text-stone-500'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.value && item.status === 'confirmed' && (
                    <span className="ml-2 text-xs text-stone-500">{item.value}</span>
                  )}
                  {item.status === 'partial' && item.value && (
                    <span className="ml-2 text-xs text-amber-500/70">({item.value})</span>
                  )}
                </div>
                <span className="text-[10px] text-stone-600 shrink-0">
                  {stageLabels[item.blocking_stage]?.replace('Before ', '')}
                </span>
              </div>
            ))}
          </div>

          {/* Blockers by stage */}
          {blockersByStage.length > 0 && (
            <div className="border-t border-stone-800 pt-3">
              <p className="text-xs font-medium text-stone-500 mb-2">Blocking progress:</p>
              {blockersByStage.map((group) => (
                <div key={group.stage} className="mb-2">
                  <p className="text-[10px] font-medium text-stone-600 uppercase tracking-wider mb-0.5">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <p key={item.key} className="text-xs text-amber-400/80 pl-2">
                      {item.label}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Dinner Circle link */}
          {circleToken && (
            <div className="border-t border-stone-800 pt-2">
              <a
                href={`/hub/g/${circleToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#e88f47] hover:text-[#f0a05f] transition-colors"
              >
                View Dinner Circle (client view) &rarr;
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
