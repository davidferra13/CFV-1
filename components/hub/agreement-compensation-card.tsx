'use client'

import { useState } from 'react'
import type { CompensationModel, CompensationDetails, HostSplit } from '@/lib/hub/agreement-types'
import { COMPENSATION_MODEL_LABELS } from '@/lib/hub/agreement-types'

interface AgreementCompensationCardProps {
  model: CompensationModel
  details: CompensationDetails
  hosts: { profileId: string; label: string }[]
  onChange: (model: CompensationModel, details: CompensationDetails) => void
  readOnly?: boolean
}

export function AgreementCompensationCard({
  model,
  details,
  hosts,
  onChange,
  readOnly,
}: AgreementCompensationCardProps) {
  const handleModelChange = (newModel: CompensationModel) => {
    onChange(newModel, details)
  }

  const handleSplitChange = (profileId: string, percentage: number) => {
    const newSplits = details.splits.map((s) =>
      s.hostProfileId === profileId ? { ...s, percentage } : s
    )
    onChange(model, { ...details, splits: newSplits })
  }

  const splitTotal = details.splits.reduce((sum, s) => sum + s.percentage, 0)
  const splitError = Math.abs(splitTotal - 100) > 0.01

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-stone-300">Compensation Model</h3>

      {/* Model selector */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(COMPENSATION_MODEL_LABELS) as [CompensationModel, string][]).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => !readOnly && handleModelChange(key)}
              disabled={readOnly}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                model === key
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-600'
              } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Split inputs (for percentage-based models) */}
      {(model === 'both_sell' || model === 'venue_sells_all' || model === 'chef_sells_all') && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-stone-400">Revenue Split</h4>
          {details.splits.map((split) => (
            <div key={split.hostProfileId} className="flex items-center gap-3">
              <span className="min-w-[100px] text-sm text-stone-300">{split.label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={split.percentage}
                onChange={(e) =>
                  !readOnly && handleSplitChange(split.hostProfileId, Number(e.target.value))
                }
                disabled={readOnly}
                className="w-20 rounded border border-stone-700 bg-stone-800 px-2 py-1 text-right text-sm text-stone-100"
              />
              <span className="text-sm text-stone-400">%</span>
            </div>
          ))}
          {splitError && (
            <p className="text-xs text-red-400">Splits must total 100% (currently {splitTotal}%)</p>
          )}
        </div>
      )}

      {/* Payment method */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-stone-400">Payment Method</h4>
        <select
          value={details.paymentMethod}
          onChange={(e) =>
            !readOnly &&
            onChange(model, {
              ...details,
              paymentMethod: e.target.value as CompensationDetails['paymentMethod'],
            })
          }
          disabled={readOnly}
          className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
        >
          <option value="venmo">Venmo</option>
          <option value="check">Check</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Payment timing */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-stone-400">Payment Timing</h4>
        <select
          value={details.paymentTiming}
          onChange={(e) =>
            !readOnly &&
            onChange(model, {
              ...details,
              paymentTiming: e.target.value as CompensationDetails['paymentTiming'],
            })
          }
          disabled={readOnly}
          className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100"
        >
          <option value="day_of">Day of event</option>
          <option value="within_48h">Within 48 hours</option>
          <option value="within_week">Within one week</option>
          <option value="custom">Custom</option>
        </select>
      </div>
    </div>
  )
}
