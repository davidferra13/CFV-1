// Cadence Settings Component
// Chef can enable/disable individual cadence points and customize messages.
'use client'

import { useState, useTransition } from 'react'
import {
  updateCadenceDisabledPoints,
  updateCadenceMessage,
} from '@/lib/communication/cadence-settings-actions'
import { CADENCE_POINTS } from '@/lib/communication/cadence-types'
import type { CadencePoint } from '@/lib/communication/cadence-types'

interface CadenceSettingsProps {
  initialDisabledPoints: CadencePoint[]
  initialCustomMessages: Record<string, string>
}

export function CadenceSettings({
  initialDisabledPoints,
  initialCustomMessages,
}: CadenceSettingsProps) {
  const [disabledPoints, setDisabledPoints] = useState<CadencePoint[]>(initialDisabledPoints)
  const [customMessages, setCustomMessages] =
    useState<Record<string, string>>(initialCustomMessages)
  const [editingPoint, setEditingPoint] = useState<CadencePoint | null>(null)
  const [editMessage, setEditMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  function handleToggle(point: CadencePoint) {
    const updated = disabledPoints.includes(point)
      ? disabledPoints.filter((p) => p !== point)
      : [...disabledPoints, point]

    setDisabledPoints(updated)
    startTransition(async () => {
      const result = await updateCadenceDisabledPoints(updated)
      if (!result.success) {
        // Rollback
        setDisabledPoints(disabledPoints)
        setFeedback('Failed to save. Try again.')
      } else {
        setFeedback('Saved')
      }
      if (result.success) setTimeout(() => setFeedback(null), 2000)
    })
  }

  function startEditing(point: CadencePoint) {
    setEditingPoint(point)
    setEditMessage(customMessages[point] || '')
  }

  function saveMessage() {
    if (!editingPoint) return
    const point = editingPoint
    const msg = editMessage.trim()

    setCustomMessages((prev) => {
      const next = { ...prev }
      if (msg) {
        next[point] = msg
      } else {
        delete next[point]
      }
      return next
    })
    setEditingPoint(null)

    startTransition(async () => {
      const result = await updateCadenceMessage(point, msg)
      if (!result.success) {
        setFeedback('Failed to save message.')
      } else {
        setFeedback('Message saved')
      }
      if (result.success) setTimeout(() => setFeedback(null), 2000)
    })
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Pre-Event Cadence</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Automated milestone emails sent to clients between booking and event day.
          </p>
        </div>
        {feedback && (
          <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
            {feedback}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {CADENCE_POINTS.filter((c) => c.point !== 'deposit_confirmed').map((config) => {
          const isDisabled = disabledPoints.includes(config.point)
          const hasCustom = !!customMessages[config.point]
          const isEditing = editingPoint === config.point

          return (
            <div
              key={config.point}
              className={`border rounded-lg p-4 transition-colors ${
                isDisabled
                  ? 'border-stone-800 bg-stone-900/50 opacity-60'
                  : 'border-stone-700 bg-stone-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(config.point)}
                    disabled={isPending}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      isDisabled ? 'bg-stone-700' : 'bg-green-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        isDisabled ? 'translate-x-0' : 'translate-x-4'
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-sm font-medium text-stone-200">{config.label}</span>
                    {hasCustom && <span className="ml-2 text-xs text-amber-400">(customized)</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEditing(config.point)}
                  className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {hasCustom ? 'Edit' : 'Customize'}
                </button>
              </div>

              {/* Default message preview */}
              {!isEditing && (
                <p className="text-xs text-stone-500 mt-2 pl-12">
                  {customMessages[config.point] || config.defaultMessage}
                </p>
              )}

              {/* Editing state */}
              {isEditing && (
                <div className="mt-3 pl-12 space-y-2">
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    placeholder={config.defaultMessage}
                    rows={3}
                    className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-500 resize-none"
                  />
                  <p className="text-xs text-stone-600">
                    Variables: {'{chefName}'}, {'{occasion}'}, {'{guestCount}'}, {'{menuStatus}'},{' '}
                    {'{location}'}, {'{arrivalTime}'}, {'{prepDate}'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveMessage}
                      disabled={isPending}
                      className="px-3 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPoint(null)}
                      className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      Cancel
                    </button>
                    {hasCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditMessage('')
                          saveMessage()
                        }}
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
