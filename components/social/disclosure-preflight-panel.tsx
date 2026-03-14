'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PreflightResult, PreflightWarning } from '@/lib/social/preflight-check'

interface DisclosurePreflightPanelProps {
  result: PreflightResult
  onConfirm: () => void
  onCancel: () => void
}

export function DisclosurePreflightPanel({
  result,
  onConfirm,
  onCancel,
}: DisclosurePreflightPanelProps) {
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set())

  if (!result.warnings || result.warnings.length === 0) {
    return null
  }

  const hardBlocks = result.warnings.filter((w) => w.type === 'hard_block')
  const confirmationWarnings = result.warnings.filter((w) => w.type === 'requires_confirmation')
  const softWarnings = result.warnings.filter((w) => w.type === 'soft_warning')

  const allConfirmationsAcknowledged =
    confirmationWarnings.length === 0 ||
    confirmationWarnings.every((_, i) => acknowledged.has(hardBlocks.length + i))

  const canProceed = !result.canPost === false ? false : allConfirmationsAcknowledged

  const isBlocked = hardBlocks.length > 0

  function toggleAcknowledge(index: number) {
    setAcknowledged((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-100">
            <span className="text-xl">&#9888;</span>
            Pre-Post Review Required
          </CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            Review these items before publishing your post.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Hard blocks */}
          {hardBlocks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-700">Posting is blocked:</p>
              {hardBlocks.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-red-950 border border-red-200 p-3"
                >
                  <span className="text-red-600 mt-0.5 flex-shrink-0">&#10060;</span>
                  <p className="text-sm text-red-700">{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Requires confirmation */}
          {confirmationWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-700">Confirm before posting:</p>
              {confirmationWarnings.map((warning, i) => {
                const globalIndex = hardBlocks.length + i
                const isChecked = acknowledged.has(globalIndex)
                return (
                  <label
                    key={i}
                    className="flex items-start gap-3 rounded-lg bg-amber-950 border border-amber-200 p-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAcknowledge(globalIndex)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 flex-shrink-0"
                      disabled={isBlocked}
                    />
                    <p className="text-sm text-amber-800">{warning.message}</p>
                  </label>
                )
              })}
            </div>
          )}

          {/* Soft warnings */}
          {softWarnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-stone-400">Heads up:</p>
              {softWarnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-stone-800 border border-stone-700 p-3"
                >
                  <span className="text-stone-400 mt-0.5 flex-shrink-0">&#8505;</span>
                  <p className="text-sm text-stone-400">{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-stone-800">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isBlocked || !allConfirmationsAcknowledged}
            >
              Post Anyway
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
