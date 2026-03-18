// Loyalty Backfill Button
// Retroactively awards loyalty points for completed events that haven't been processed yet.
// Useful after historical imports or when enabling loyalty on an existing account.

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  backfillLoyaltyForHistoricalImports,
  type BackfillLoyaltyResult,
} from '@/lib/loyalty/actions'

export function BackfillLoyaltyButton() {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<BackfillLoyaltyResult | null>(null)
  const [error, setError] = useState('')

  async function handleBackfill() {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await backfillLoyaltyForHistoricalImports()
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => setShowConfirm(true)} disabled={loading}>
        {loading ? 'Processing...' : 'Backfill Unawarded Events'}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title="Backfill Loyalty Points"
        description="This will scan all completed events that haven't had loyalty points awarded yet and retroactively apply points, bonuses, and tier upgrades based on your current program settings. This is safe to run multiple times (idempotent)."
        confirmLabel="Run Backfill"
        variant="primary"
        loading={loading}
        onConfirm={handleBackfill}
        onCancel={() => setShowConfirm(false)}
      />

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      {result && (
        <div className="mt-3 p-3 rounded-lg bg-stone-800 text-sm space-y-1">
          {result.eventsProcessed === 0 ? (
            <p className="text-stone-400">All events are already processed. Nothing to backfill.</p>
          ) : (
            <>
              <p className="text-stone-200">
                Processed {result.eventsProcessed} event{result.eventsProcessed !== 1 ? 's' : ''}{' '}
                across {result.clientsProcessed} client{result.clientsProcessed !== 1 ? 's' : ''}.
              </p>
              {result.totalPointsAwarded > 0 && (
                <p className="text-emerald-400">
                  +{result.totalPointsAwarded.toLocaleString()} points awarded
                </p>
              )}
              {result.tierChanges.length > 0 && (
                <div className="mt-2">
                  <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">
                    Tier Upgrades
                  </p>
                  {result.tierChanges.map((tc, i) => (
                    <p key={i} className="text-stone-300">
                      {tc.clientName}: <span className="capitalize">{tc.oldTier}</span> &rarr;{' '}
                      <span className="capitalize font-medium">{tc.newTier}</span>
                    </p>
                  ))}
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-400 text-xs uppercase tracking-wide mb-1">Errors</p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-red-300 text-xs">
                      {e}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
