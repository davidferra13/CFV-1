'use client'

import type { GuestCriticalPathResult } from '@/lib/lifecycle/critical-path'

interface CircleClientStatusProps {
  status: GuestCriticalPathResult
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MissingIcon() {
  return (
    <svg className="h-4 w-4 text-stone-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PartialIcon() {
  return (
    <svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function CircleClientStatus({ status }: CircleClientStatusProps) {
  const { confirmed, missing, chefName } = status
  const total = confirmed.length + missing.length
  const allConfirmed = missing.length === 0

  return (
    <div className="mx-4 mt-4 rounded-xl border border-stone-700 bg-stone-800/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-200">Your Dinner Status</h3>
          {allConfirmed ? (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              All set
            </span>
          ) : (
            <span className="text-xs text-stone-500">
              {confirmed.length}/{total} confirmed
            </span>
          )}
        </div>
        {allConfirmed && (
          <p className="text-xs text-stone-400 mt-1">
            {chefName} has everything needed. Get excited!
          </p>
        )}
      </div>

      {/* Confirmed items */}
      {confirmed.length > 0 && (
        <div className="px-4 py-2 space-y-1.5">
          {confirmed.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckIcon />
              <span className="text-sm text-stone-300">{item.label}</span>
              {item.value && (
                <span className="text-xs text-stone-500 ml-auto truncate max-w-[50%]">
                  {item.value}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Missing items */}
      {missing.length > 0 && (
        <div className="px-4 py-2 border-t border-stone-700/50">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-600 mb-1.5">
            Still needed
          </p>
          {missing.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              {item.status === 'partial' ? <PartialIcon /> : <MissingIcon />}
              <span className="text-sm text-stone-400">{item.label}</span>
              {item.value && (
                <span className="text-xs text-amber-500/70 ml-auto">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Discussed dishes */}
      {status.discussedDishes && status.discussedDishes.length > 0 && (
        <div className="px-4 py-2 border-t border-stone-700/50">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-600 mb-1.5">
            Dishes discussed
          </p>
          <div className="flex flex-wrap gap-1.5">
            {status.discussedDishes.map((dish, i) => (
              <span
                key={i}
                className="text-xs bg-stone-700/50 text-stone-300 px-2 py-0.5 rounded-full"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {missing.length > 0 && (
        <div className="px-4 py-2.5 bg-stone-800/40 border-t border-stone-700/50">
          <p className="text-xs text-stone-500">
            Need to update anything? Reply in the chat below or email {chefName} directly.
          </p>
        </div>
      )}
    </div>
  )
}
