'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

interface Props {
  circle: CircleDetail
}

const statCards = [
  {
    label: 'Total Revenue',
    value: '$0.00',
    from: 'from-emerald-500/20',
    to: 'to-emerald-900/10',
    text: 'text-emerald-400',
  },
  {
    label: 'Per Guest',
    value: '$0.00',
    from: 'from-blue-500/20',
    to: 'to-blue-900/10',
    text: 'text-blue-400',
  },
  {
    label: 'Food Cost',
    value: '$0.00',
    from: 'from-amber-500/20',
    to: 'to-amber-900/10',
    text: 'text-amber-400',
  },
  {
    label: 'Net Profit',
    value: '$0.00',
    from: 'from-purple-500/20',
    to: 'to-purple-900/10',
    text: 'text-purple-400',
  },
] as const

const costRows = [
  { label: 'Ingredients', amount: '$0.00' },
  { label: 'Labor', amount: '$0.00' },
  { label: 'Supplies', amount: '$0.00' },
  { label: 'Travel', amount: '$0.00' },
  { label: 'Platform Fee', amount: '$0.00' },
] as const

function getInitial(name: string): string {
  return (name[0] ?? '?').toUpperCase()
}

export function ChefMoneyChannel({ circle }: Props) {
  const [costOpen, setCostOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <h2 className="text-base font-semibold text-stone-100">Money</h2>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          🔒 Chef Only
        </span>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={cn('rounded-xl bg-gradient-to-br p-4', card.from, card.to)}
          >
            <p className={cn('text-2xl font-bold', card.text)}>{card.value}</p>
            <p className="text-xs uppercase tracking-wide text-stone-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Cost Breakdown */}
      <div>
        <button
          type="button"
          onClick={() => setCostOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-medium text-stone-300 transition-colors hover:text-stone-100"
        >
          <span>Cost Breakdown</span>
          <span
            className={cn('text-xs text-stone-500 transition-transform', costOpen && 'rotate-180')}
          >
            ▼
          </span>
        </button>
        {costOpen && (
          <div className="flex flex-col gap-1 rounded-lg bg-stone-800/40 p-3">
            {costRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1 text-sm">
                <span className="text-stone-400">{row.label}</span>
                <span className="text-stone-300">{row.amount}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-stone-700 pt-2 text-sm font-bold">
              <span className="text-stone-200">Total</span>
              <span className="text-stone-100">$0.00</span>
            </div>
          </div>
        )}
      </div>

      {/* PIE Integration */}
      <div className="rounded-xl border border-dashed border-stone-600 p-4 text-center">
        <p className="text-sm text-stone-500">PIE cost analysis will appear here</p>
      </div>

      {/* Payment Status */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-stone-300">Payment Status</h3>
        {circle.members.length === 0 ? (
          <p className="text-sm text-stone-500">No members yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {circle.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg bg-stone-800/40 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-700 text-xs font-medium text-stone-300">
                    {getInitial(member.display_name)}
                  </div>
                  <span className="text-sm text-stone-200">{member.display_name}</span>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-600"
        >
          Send Invoice
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:bg-stone-600"
        >
          Export Summary
        </button>
      </div>
    </div>
  )
}
