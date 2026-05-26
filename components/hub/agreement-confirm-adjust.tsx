'use client'

import { useState, useTransition } from 'react'
import type { AgreementWithItems, ItemCategory } from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'

interface AgreementConfirmAdjustProps {
  previousAgreement: AgreementWithItems
  newGroupId: string
  newEventId?: string
  onConfirm: () => void
  onAdjust: () => void
}

export function AgreementConfirmAdjust({
  previousAgreement,
  newGroupId,
  newEventId,
  onConfirm,
  onAdjust,
}: AgreementConfirmAdjustProps) {
  const categories = [...new Set(previousAgreement.items.map((i) => i.category))] as ItemCategory[]

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-100">Carry Forward Agreement</h2>
        <p className="mt-1 text-sm text-stone-400">
          This event inherits the agreement from your previous collaboration. Review the highlights
          and confirm or adjust.
        </p>
      </div>

      {/* Compensation summary */}
      <div className="rounded-lg border border-stone-700 bg-stone-800/30 p-3">
        <h4 className="text-xs font-medium text-stone-400">Compensation</h4>
        {previousAgreement.compensationDetails.splits.map((s) => (
          <p key={s.hostProfileId} className="text-sm text-stone-200">
            {s.label}: {s.percentage}%
          </p>
        ))}
        <p className="mt-1 text-xs text-stone-500">
          Payment: {previousAgreement.compensationDetails.paymentMethod},{' '}
          {previousAgreement.compensationDetails.paymentTiming}
        </p>
      </div>

      {/* Category summary */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-stone-400">Responsibilities</h4>
        {categories.map((cat) => {
          const catItems = previousAgreement.items.filter((i) => i.category === cat)
          const chefCount = catItems.filter((i) => i.assignment === 'chef').length
          const venueCount = catItems.filter((i) => i.assignment === 'venue').length
          const sharedCount = catItems.filter((i) => i.assignment === 'shared').length
          return (
            <div
              key={cat}
              className="flex items-center justify-between rounded border border-stone-700/50 bg-stone-800/20 px-3 py-1.5"
            >
              <span className="text-xs text-stone-300">{CATEGORY_LABELS[cat]}</span>
              <div className="flex gap-2 text-xs text-stone-500">
                {chefCount > 0 && <span className="text-blue-400">{chefCount} chef</span>}
                {venueCount > 0 && <span className="text-green-400">{venueCount} venue</span>}
                {sharedCount > 0 && <span className="text-purple-400">{sharedCount} shared</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500"
        >
          Looks good, carry forward
        </button>
        <button
          onClick={onAdjust}
          className="flex-1 rounded-lg border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
        >
          Edit before signing
        </button>
      </div>
    </div>
  )
}
